/* Copyright (c) 2026 DeviceBook contributors. MIT.
 * Run: node tools/factcheck-regression.cjs
 * Exercises live functions and independent physical limits from DEV-03,07,08,09,11,16,29.
 */
const assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
const root = path.resolve(__dirname, '..');
const read = f => fs.readFileSync(path.join(root, f), 'utf8');
const c = vm.createContext({ window: {} });
vm.runInContext(read('js/semi.js'), c); c.SC = c.window.SC;
const SC = c.SC;
const near = (a, b, tol, label) => assert.ok(Math.abs(a-b) <= tol, `${label}: ${a} != ${b}`);
function block(s, name) {
 const start = s.indexOf(`function ${name}(`), brace = s.indexOf('{', start);assert.ok(start >= 0, name);
 let depth=1, end=brace+1;
 for(;end<s.length && depth;end++){if(s[end]==='{')depth++;if(s[end]==='}')depth--;}
 return s.slice(start,end);
}
for(const file of fs.readdirSync(path.join(root,'chapters')).filter(f=>f.endsWith('.html'))){
 for(const m of read(`chapters/${file}`).matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)){
  if(/type=["']application\/ld\+json["']/i.test(m[0]))JSON.parse(m[1]);else new vm.Script(m[1],{filename:file});
 }
}
const crystal=read('chapters/crystal.html');
vm.runInContext('const EMAX=16.5;const f=(x,P)=>x<1e-9?P+1:P*Math.sin(x)/x+Math.cos(x);'+block(crystal,'solve')+'\nglobalThis.kp=solve;',c);
const free=c.kp(0);
near(free.bands[0].lo,0,1e-14,'free-electron bottom');
for(let i=1;i<free.bands.length;i++)near(free.bands[i].lo-free.bands[i-1].hi,0,1e-12,'free-electron gap');
const point=free.pts.find(p=>p.n===1&&p.ok&&p.e>.022);
near((point.e-free.bands[0].lo)/(Math.acos(point.fv)/Math.PI)**2,1,1e-12,'free-electron mass');
for(const P of [.1,1,5,20])for(const [i,b]of c.kp(P).bands.entries()){
 const x=Math.PI*Math.sqrt(b.lo), val=P*Math.sin(x)/x+Math.cos(x);
 near(val,i%2?-1:1,1e-10,'KP root boundary');assert.ok(b.lo<b.hi);
}
near(SC.ni('SiC',600),3.091176e6,2,'SiC intrinsic density');
near(SC.alphaSi(370),7.37e5,1e-9,'Green 370nm');near(SC.alphaSi(450),2.41e4,1e-9,'Green 450nm');near(SC.alphaSi(1150),.68,1e-12,'Green 1150nm');
// Components of a 3D Maxwell velocity projected onto the display plane.
const transport=read('chapters/transport.html');
let seed=937;const uniform=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return(seed+.5)/4294967296;};
c.PB={randn:()=>Math.sqrt(-2*Math.log(uniform()))*Math.cos(2*Math.PI*uniform())};
vm.runInContext(block(transport,'newVel')+'\nglobalThis.velocity=newVel;',c);
const ms=.26*SC.m0, vt=Math.sqrt(3*SC.kB*300/ms);
let sum=0,squares=0;
for(let i=0;i<200000;i++){const p={};c.velocity(p,{vthS:vt,tauS:1});sum+=p.vx;squares+=p.vx*p.vx;}
const variance=squares/200000-(sum/200000)**2;
near(variance/(SC.kB*300/ms),1,.015,'Maxwell component variance');
// Reflecting-wall kernel preserves particle count and approaches a uniform box.
c.LB=40;c.gD=()=>36;c.x0hist=new Float64Array(200);
vm.runInContext(block(transport,'theory')+'\nglobalThis.diffusion=theory;',c);
for(const initial of [0,100,199]){
 c.x0hist.fill(0);c.x0hist[initial]=900;
 for(const t of [0,.001,.1,1,100,1000,100000]){
  c.t=t;const bins=c.diffusion(120),total=bins.reduce((a,b)=>a+b,0);
  near(total,900,.001,'reflecting mass');assert.ok(bins.every(v=>Number.isFinite(v)&&v>=0));
  if(t===100000)for(const value of bins)near(value,7.5,1e-9,'uniform reflecting equilibrium');
 }
}
// A constant equilibrium Fermi level requires zero electron current even at steep doping.
let equilibriumResidual=0;
for(const kind of ['exponential','step']){
 const L=2e-4,prof=x=>kind==='exponential'?1e18*(1e-3)**Math.max(0,Math.min(1,(x/L-.1)/.8)):Math.exp(Math.log(1e18)*(1-.5*(1+Math.tanh((x-L/2)/1e-6)))+Math.log(1e15)*.5*(1+Math.tanh((x-L/2)/1e-6)));
 const state=new SC.Device1D({L,N:301,doping:prof,mobility:'doping'}).state();
 equilibriumResidual=Math.max(equilibriumResidual,...Array.from(state.Jn,Math.abs));
 assert.ok(equilibriumResidual<1e-6,'SG equilibrium current');
}
// Series-resistance component curves must sum to the same solved terminal current.
const diode=read('chapters/diode.html');
vm.runInContext('const NA=1e18,WP=2e-4,WN=20e-4,AREA=1e-4;'+block(diode,'Jj')+block(diode,'I')+'\nglobalThis.current=I;',c);
for(const Rs of [0,1,10,100])for(const gr of [false,true])for(const hi of [false,true])for(const V of [-.5,0,.6,.8,1]){
 const p={Nd:1e16,tau:1e-6,T:300,Rs,gr,hi}, r=c.current(V,p);
 near((r.c.Jd+r.c.Jg)*1e-4,r.I,1e-14,'diode component sum');near(r.Vj+r.I*Rs,V,1e-11,'terminal voltage');
}
// Independent stationary-point / half-height calculation bounds the mission's
// peak-time approximation error over the new allowed physical parameter range.
const bisect=(lo,hi,fn)=>{for(let i=0;i<80;i++){const m=(lo+hi)/2;if(fn(m)>0)hi=m;else lo=m;}return(lo+hi)/2;};
let maxMuError=0,maxDError=0;
for(const N of [1e14,1e15,1e16])for(const tau of [30e-6,60e-6,150e-6])for(const E of [15,20,40,60]){
 const mu=SC.mobility('Si',N,300,'p'),D=mu*SC.Vt(300),v=mu*E,d=.5;
 const tp=d*d/(D+Math.sqrt(D*D+(v*v+4*D/tau)*d*d));
 const logSignal=t=>-.5*Math.log(t)-(d-v*t)**2/(4*D*t)-t/tau;
 const half=logSignal(tp)-Math.log(2);
 const left=bisect(1e-15,tp,t=>logSignal(t)-half);
 const right=bisect(tp,200e-6,t=>half-logSignal(t));
 const estimateMu=d/(E*tp), estimateD=(estimateMu*E)**2*(right-left)**2/(16*Math.log(2)*tp);
 maxMuError=Math.max(maxMuError,Math.abs(estimateMu/mu-1));maxDError=Math.max(maxDError,Math.abs(estimateD/D-1));
 assert.ok(tp<200e-6&&right<200e-6,'mission signal in window');
}
assert.ok(maxMuError<.08&&maxDError<.2,'Haynes-Shockley bounded approximation');
console.log(JSON.stringify({passed:true,velocityVarianceRatio:variance/(SC.kB*300/ms),reflectingCases:21,diodeCases:80,equilibriumResidual,maxMuError,maxDError},null,2));
