const fs = require('node:fs'), vm = require('node:vm'), assert = require('node:assert/strict');
const path = require('node:path');
let checks = 0;
function check(v, message) { assert(v, message); checks++; }
function fn(chapter, name) {
  const text = fs.readFileSync(path.join(__dirname, '../chapters', chapter + '.html'), 'utf8');
  const start = text.indexOf('function ' + name + '('), end = text.indexOf('\n    }', start);
  assert(start >= 0 && end > start);
  return vm.runInNewContext('(' + text.slice(start, end + 6) + ')');
}
const fit = fn('characterization', 'linearityFit');
// Independent regression: transform y = c + bx into 1 = c/y + bx/y,
// then solve the two-variable normal system and verify orthogonality.
for (const a of [0, .005, .015, .06]) for (const knee of [4, 20, 40]) {
  const all = Array.from({length: 48}, (_, i) => {
    const x = .02 + 1.28 * i / 47, u = x / (1 + x ** knee) ** (1 / knee);
    return [x, 4000 * u * (1 - a * u)];
  });
  const top = Math.max(...all.map(p => p[1])), points = all.filter(p => p[1] >= .05 * top && p[1] <= .95 * top);
  const r = fit(points);
  let uu = 0, uv = 0, vv = 0, u1 = 0, v1 = 0;
  for (const [x, y] of points) { const u = 1/y, v = x/y; uu += u*u; uv += u*v; vv += v*v; u1 += u; v1 += v; }
  const det = uu*vv-uv*uv, c = (u1*vv-v1*uv)/det, b=(v1*uu-u1*uv)/det;
  const le = points.reduce((s,[x,y]) => s+100*Math.abs(y/(c+b*x)-1),0)/points.length;
  check(Math.abs(r.b-b)<1e-7 && Math.abs(r.c-c)<1e-7, 'weighted regression');
  check(Math.abs(r.le-le)<1e-9, 'mean absolute deviation');
}
const exact = fit([[1,5],[2,8],[3,11],[4,14]]);
check(Math.abs(exact.c-2)<1e-12 && Math.abs(exact.b-3)<1e-12 && exact.le<1e-12, 'exact line');
// Extract function with its own two-space indentation.
const noise = fs.readFileSync(path.join(__dirname,'../chapters/noise.html'),'utf8');
const start = noise.indexOf('function patchTheory('), end = noise.indexOf('\n  }',start);
const patch = vm.runInNewContext('('+noise.slice(start,end+4)+')');
let cases = 0;
for (const FWC of [2450,9800,45000]) for (const G of [1,4,16,64]) for (const dark of [0,10,1000]) for (const ratio of [.001,.5,.99,1,2,100]) {
  const limit = Math.min(FWC,FWC/G), signal = ratio*limit;
  const M = {eW: signal*255/48, FWC,G,dark,K0:FWC/959,sr:2};
  const r=patch(M), saturated=signal+dark>=limit;
  check(Math.abs(r.Sg-signal)<1e-8,'patch reflectance');
  check(r.saturated===saturated,'ADC or well saturation');
  check(saturated?r.snr===null:Math.abs(r.snr-signal/Math.sqrt(signal+dark+4+(M.K0/G)**2/12))<1e-8,'linear SNR'); cases++;
}
const chapterFiles=fs.readdirSync(path.join(__dirname,'../chapters')).filter(f=>f.endsWith('.html'));
const shutter = fs.readFileSync(path.join(__dirname,'../chapters/shutter.html'),'utf8');
const hs = shutter.indexOf('function hdrWeight('), he = shutter.indexOf('\n    }',hs);
const hdrWeight = vm.runInNewContext('('+shutter.slice(hs,he+6)+')', { RN: 3 });
for (const k of [1,10,100]) for (const signal of [0,1,100,10000]) {
  const radianceVariance = (signal+9)/(k*k);
  check(Math.abs(hdrWeight(k,signal)*radianceVariance-1)<1e-12, 'HDR inverse radiance variance');
}
check(hdrWeight(16,0)/hdrWeight(1,0)===256, 'read noise dominated HDR weights scale quadratically');
const nx = .00055*2/(2*.0008), mtf = 2/Math.PI*(Math.acos(nx)-nx*Math.sqrt(1-nx*nx));
check(Math.abs(mtf-.19958271899979174)<1e-12,'quiz diffraction MTF');
const advanced = fs.readFileSync(path.join(__dirname,'../chapters/advanced.html'),'utf8');
check(advanced.includes('\\operatorname{atan2}(Q_{90}-Q_{270},\\ Q_0-Q_{180})\\bmod 2\\pi'), 'full-circle iToF formula');
for (const phase of [.1,1,2,3,4,5,6]) {
  const x=Math.cos(phase), y=Math.sin(phase), wrapped=(Math.atan2(y,x)+2*Math.PI)%(2*Math.PI);
  check(Math.abs(wrapped-phase)<1e-12,'iToF quadrant recovery');
}
check(Math.ceil(4000*3000*12*30/2.5e9)===2,'payload lane minimum');
// TDI: production square-wave profile versus independent geometric overlap integration.
const tdi = fn('space','tdiProfile');
const intervals=[];
for(const [block,period] of [12,8,5,3,2].entries()) {
 const lo=block*36,hi=lo+36;
 for(let k=Math.floor(lo/period);k*period<hi;k++) {
  const a=Math.max(lo,k*period),b=Math.min(hi,k*period+period/2);
  if(b>a)intervals.push([a,b]);
 }
}
function overlapReference(i,blur) {
 let total=0;
 for(const [a,b] of intervals) {
  const overlap=d=>Math.max(0,Math.min(i+1+d,b)-Math.max(i+d,a));
  if(blur===0){total+=overlap(0);continue;}
  const lo=-blur/2,hi=blur/2;
  const cuts=[lo,hi,...[a-i-1,a-i,b-i-1,b-i].filter(x=>x>lo&&x<hi)].sort((a,b)=>a-b);
  for(let k=1;k<cuts.length;k++)total+=(cuts[k]-cuts[k-1])*(overlap(cuts[k])+overlap(cuts[k-1]))/(2*blur);
 }
 return total;
}
for(const blur of [0,.0001,.01,.1,.3,.5,.99,1,1.28,2,2.56,3.5,7.68]) {
 const profile=tdi(intervals,180,blur);
 for(let i=0;i<profile.length;i++)check(Math.abs(profile[i]-overlapReference(i,blur))<4e-8,'production TDI exact aperture × smear');
}
check(Math.abs(tdi([[0,1]],1,1)[0]-.75)<1e-8,'two boxes produce a trapezoidal overlap, not one wider box');
const space=fs.readFileSync(path.join(__dirname,'../chapters/space.html'),'utf8');
const tdiCtx={RN:5};vm.runInNewContext(space.match(/const snr = \(N, s\) =>[^;]+;/)[0]+'this.snr=snr;',tdiCtx);
for(const n of [1,2,16,256])for(const signal of [.001,1,100,1e7]){
 const gain=tdiCtx.snr(n,signal)/tdiCtx.snr(1,signal);
 check(gain>=Math.sqrt(n)-1e-9&&gain<=n+1e-9,'TDI noise-limit gain bounds');
}
// UTR variance from independent Poisson-increment covariance and least-squares weights.
const rampFit=fn('space','fitLine');
for(const N of [2,3,4,8,16,48,64]){
 const t=Array.from({length:N},(_,i)=>i/(N-1)), mean=.5, den=t.reduce((s,x)=>s+(x-mean)**2,0), weights=t.map(x=>(x-mean)/den);
 const readVar=weights.reduce((s,w)=>s+w*w,0);let shotVar=0;
 for(let i=0;i<N;i++)for(let j=0;j<N;j++)shotVar+=weights[i]*weights[j]*Math.min(t[i],t[j]);
 check(Math.abs(readVar-12*(N-1)/(N*(N+1)))<1e-12,'UTR uncorrelated read covariance');
 check(Math.abs(shotVar-6*(N*N+1)/(5*N*(N+1)))<1e-12,'UTR cumulative shot covariance');
 const fit=rampFit(t,t.map(x=>300+7*x),0,N-1);check(Math.abs(fit.slope-7)<1e-9,'UTR slope units');
}
// Execute actual burst SNR expressions and compare independent summed frame variances.
const comp=fs.readFileSync(path.join(__dirname,'../chapters/computational.html'),'utf8');
const burstExpressions=comp.match(/const snrL = \(S\)[^;]+;/)[0];
for(const N of [1,4,8,32])for(const rn of [0,1,3,10])for(const signal of [.1,16,100,4000]){
 const c={q:{N},r2:rn*rn};vm.runInNewContext(burstExpressions+'this.f=[snrL,snrM,snrS];',c);
 const independent=signal/Math.sqrt(N*(signal/N+rn*rn));
 check(Math.abs(c.f[1](signal)-independent)<1e-10,'burst independent frame sum');
 check(Math.abs(c.f[1](signal)/c.f[2](signal)-Math.sqrt(N))<1e-10,'equal short-frame SNR gain');
}
// EMCCD finite read noise: the 1/sqrt(F²) asymptote requires F²S >> sigma_eff².
const emCtx={};vm.runInNewContext(space.match(/const rel = \(S, sig, F2\) =>[^;]+;/)[0]+'this.rel=rel;',emCtx);
check(emCtx.rel(.1,.125,2)<Math.SQRT1_2,'EMCCD low-flux curve below asymptote');
check(Math.abs(emCtx.rel(1000,.125,2)-Math.SQRT1_2)<1e-5,'EMCCD shot-dominated asymptote');
// Thermal radiance/inversion: compare the actual 48-bin band integration with a fine grid.
const invisible=fs.readFileSync(path.join(__dirname,'../chapters/invisible.html'),'utf8');
const thermal={K:{h:6.62607015e-34,c:299792458,k:1.380649e-23}};
const thermalSource=invisible.match(/const planck =[^\n]+\n    const band =[^\n]+\n    const inv =[^\n]+/)[0];
vm.runInNewContext(thermalSource+'this.band=band;this.inv=inv;',thermal);
for(const T of [253.15,293.15,300,353.15,423.15]){
 let integral=0;const step=6e-6/4096;
 for(let i=0;i<4096;i++){
  const lambda=8e-6+(i+.5)*step;
  integral+=2*6.62607015e-34*299792458**2/lambda**5/Math.expm1(6.62607015e-34*299792458/(lambda*1.380649e-23*T))*step;
 }
 check(Math.abs(thermal.band(T)/integral-1)<.00005,'thermal band SI integration');
 check(Math.abs(thermal.inv(thermal.band(T))-T)<1e-6,'thermal inverse radiance');
 for(const e of [.1,.5,1]){
  const Tb=293.15,app=thermal.inv(e*thermal.band(T)+(1-e)*thermal.band(Tb));
  check(app>=Math.min(T,Tb)-1e-6&&app<=Math.max(T,Tb)+1e-6,'emissivity apparent temperature bounds');
 }
}
let scripts=0;
for (const f of chapterFiles) {
  const html=fs.readFileSync(path.join(__dirname,'../chapters',f),'utf8');
  for (const [,attrs,js] of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/g)) if(!/src=|ld\+json/.test(attrs)&&js.trim()) {new vm.Script(js,{filename:f});scripts++;}
}
console.log(JSON.stringify({checks,linearityCases:12,patchCases:cases,chapters:chapterFiles.length,scripts}));
