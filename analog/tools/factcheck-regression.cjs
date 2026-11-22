/* Copyright (c) 2026 AnalogBook contributors. MIT (see ../LICENSE-MIT).
 * Run: node tools/factcheck-regression.cjs
 * Numerical regressions for AnalogBook engines and chapter simulations.
 * Extract live simulator functions so checks exercise the shipped calculations.
 */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const context = vm.createContext({ window: {} });
vm.runInContext(read('js/analog.js'), context);
context.AN = context.window.AN;
const AN = context.AN;
const near = (actual, expected, tolerance, label) => assert.ok(Math.abs(actual - expected) <= tolerance, `${label}: ${actual} vs ${expected}`);
function block(source, name) {
  const start = source.indexOf(`function ${name}(`);
  assert.ok(start >= 0, `missing function ${name}`);
  const brace = source.indexOf('{', start);
  let depth = 1, end = brace + 1;
  for (; end < source.length && depth; end++) {
    if (source[end] === '{') depth++;
    if (source[end] === '}') depth--;
  }
  return source.slice(start, end);
}
// Compile every chapter's inline scripts, including the new OSR control.
for (const file of fs.readdirSync(path.join(root, 'chapters')).filter(f => f.endsWith('.html'))) {
  const source = read(`chapters/${file}`);
  for (const match of source.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)) {
    if (/type=["']application\/ld\+json["']/i.test(match[0])) JSON.parse(match[1]);
    else new vm.Script(match[1], { filename: file });
  }
}
// ANA-08: known 40 dB harmonic and non-harmonic spurs, including aliased harmonics.
for (const window of ['rect', 'hann', 'bh']) {
  for (const bin of [13, 53, 911, 1501]) {
    for (const spurBin of [2 * bin, 707]) {
      const n = 4096;
      const signal = Float64Array.from({ length: n }, (_, i) => Math.sin(2 * Math.PI * bin * i / n) + .01 * Math.sin(2 * Math.PI * spurBin * i / n));
      const result = AN.sinad(signal, { window });
      near(result.sfdr, 40, .002, `${window} SFDR @ ${bin}/${spurBin}`);
      near(result.sndr, 40, .002, `${window} SNDR @ ${bin}/${spurBin}`);
      if (spurBin === 2 * bin) near(result.thd, -40, .002, `${window} THD`);
    }
  }
}
// ANA-03: comparator offset headroom is the next stage's full ±VREF range.
const adc = read('chapters/adc.html');
context.clamp = (x, a, b) => Math.max(a, Math.min(b, x));
let offset = 0, mode = '1.5';
context.mm = () => mode;
context.oo = () => offset;
context.gg = () => 2;
vm.runInContext(block(adc, 'stage') + '\nglobalThis.testStage = stage;', context);
for (offset of [-.2499, -.1, 0, .1, .2499]) {
  for (let i = 0; i <= 10000; i++) {
    const v = -1 + 2 * i / 10000;
    assert.ok(Math.abs(context.testStage(v, 0).raw) <= 1 + 1e-12);
  }
}
offset = 0;
near(context.testStage(.9, 0).raw, .8, 1e-12, 'full residual range');
offset = .1;
near(context.testStage(.35, 0).raw, .7, 1e-12, 'offset residual');
mode = '1';
assert.ok(context.testStage(.01, 0).raw > 1, 'one-bit stage must expose over-range counterexample');
// ANA-04,05: increasing overdrive increases fT; AB-1 offset target is 5 mV.
const dev = { type: 'n', W: 10e-6, L: 1e-6 };
const vth = AN.mos(dev, .6, .9).vth;
const ft = [.1, .2, .3].map(overdrive => AN.mos(dev, vth + overdrive, .9).ft);
assert.ok(ft[0] < ft[1] && ft[1] < ft[2]);
near(AN.AB1.spec.ota.offset3s, .005, 1e-12, 'offset spec');
near(AN.AB1.spec.pll.jitter, 17e-12, 1e-20, 'rounded AB-1 jitter estimate');
// ANA-11: real bandgap circuit TC for both resistor ratios.
const bandgap = read('chapters/bandgap.html');
const bgSource = bandgap.slice(bandgap.indexOf('  const K0 ='), bandgap.indexOf('  /* 수직 PNP 기호'));
context.AB = {};
vm.runInContext(bgSource + '\nglobalThis.bg = { bgCkt, bgSweep, boxTC };', context);
const tc = [9.47, 9.52].map(K => {
  const o = { K, N: 8 };
  return context.bg.boxTC(context.bg.bgSweep(context.bg.bgCkt(o), o, AN.linspace(-40, 125, 34))).tc;
});
near(tc[1] / tc[0], 1.28621, .001, 'TC ratio');
// ANA-12: fc is now exactly the unity-loop-gain crossing, with ~60° PM.
const pll = read('chapters/pll.html');
vm.runInContext(block(pll, 'plH') + '\nglobalThis.testH = plH;', context);
for (const fc of [1e4, 185e3, 4e5, 5e6]) {
  const H = context.testH(fc, fc);
  const L = AN.cx.div(H, [1 - H[0], -H[1]]);
  near(AN.cx.abs(L), 1, 1e-12, 'PLL unity gain');
  near(180 + Math.atan2(L[1], L[0]) * 180 / Math.PI, 60, .02, 'PLL phase margin');
  for (const f of [1e3, fc, 16e6]) assert.ok(context.testH(f, fc).every(Number.isFinite));
}
// ANA-13: the displayed @1 MHz reference includes its flicker contribution.
context.gVn = () => -126;
context.gRn = () => -126;
context.lg = x => 10 ** x;
context.TAU = 2 * Math.PI;
context.F0 = 32e6;
vm.runInContext(pll.match(/    const FS = AN.logspace\(1e3, 1e8, 400\)[^\n]*;[\s\S]*?(?=    let cur = null)/)[0] + '\nglobalThis.pn = { Lv, Li, out, integ };', context);
near(context.pn.Lv(1e6), -126, 1e-12, 'VCO reference noise');
const jitter = fc => context.pn.integ(context.pn.out(fc)) / (2 * Math.PI * 32e6);
for (const fc of [1e4, 185e3, 4e5, 5e6]) assert.ok(Number.isFinite(jitter(fc)) && jitter(fc) > 0);
// ANA-14: exercise the actual map callback. Nyquist results stay unchanged;
// the AB-1 ΔΣ example loses 10log10(128) dB compared with raw fs/2.
let osrLog2 = 0;
const stats = {};
context.AB = { stat: (id, val) => { stats[id] = val; } };
context.si = (val, unit) => `${val} ${unit}`;
context.pp = () => -4;
context.oo = () => osrLog2;
context.pt = { lf: 6, e: 10.5 };
context.REG = [];
context.inside = () => false;
context.cv = { redraw() {} };
const map = adc.slice(adc.indexOf('(function simMap()'), adc.indexOf('/* ---------------------------------------------------------- 9. SAR ADC'));
vm.runInContext(block(map, 'upd') + '\nglobalThis.mapUpdate = upd;', context);
context.mapUpdate();
const nyquist = parseFloat(stats['map-fs']);
const walden = stats['map-fw'];
near(nyquist, 162.0, .06, 'Nyquist Schreier');
osrLog2 = 7;
context.mapUpdate();
near(nyquist - parseFloat(stats['map-fs']), 10 * Math.log10(128), .1, 'oversampling FoM');
assert.equal(stats['map-fw'], walden, 'raw-rate Walden preserved');
context.pt = { lf: Math.log10(2.048e6), e: 16 };
context.mapUpdate();
near(Number(stats['map-fs'].match(/BW ([^ ]+) Hz/)[1]), 8000, 1e-8, 'AB-1 ΔΣ effective bandwidth');
// Overview: exercise the displayed Gaussian tail through near-zero BER and
// the sampler through negative times, where it must still use floor indexing.
const overviewSource = read('chapters/overview.html');
for (const name of ['gaussianTail', 'sampleAndHold', 'adcCode']) {
 vm.runInContext(block(overviewSource, name), context);
}
const gaussianReferences = [
 [1.426, 7.693417102830502e-2],
 [1.8, 3.593031911292581e-2],
 [3, 1.3498980316300957e-3],
 [9, 1.1285884059538425e-19],
 [12, 1.7764821120777016e-33],
];
for (const [x, expected] of gaussianReferences) {
 near(context.gaussianTail(x) / expected, 1, 3e-8, 'stable Gaussian bit error probability');
}
const heldOverview = context.sampleAndHold(-.375, .5, .25, t => t);
assert.deepEqual(Array.from(heldOverview.t), [-.375, -.25, -.25, 0, 0, .25, .25, .5, .5, .5]);
assert.deepEqual(Array.from(heldOverview.v), [-.5, -.5, -.25, -.25, 0, 0, .25, .25, .5, .5]);
for (const bits of [3, 6, 12]) {
 const levels = 2 ** bits, ref = 1.2;
 for (let i = 0; i < levels; i++) assert.equal(context.adcCode((i + .5) * ref / levels, ref, bits), i);
 assert.equal(context.adcCode(-.01, ref, bits), 0);
 assert.equal(context.adcCode(ref, ref, bits), levels - 1);
 assert.equal(context.adcCode(ref + .05, ref, bits), levels - 1);
}
const overviewLsb = AN.AB1.spec.adc.vref / 2 ** AN.AB1.spec.adc.bits;
near(overviewLsb / AN.AB1.spec.pga.gain * 1e6, 7.32421875, 1e-10, 'input-referred AB-1 LSB');
near(20 * Math.log10((.4 / Math.SQRT2) / (overviewLsb / Math.sqrt(12))), 70.486, .001, 'AB-1 ideal quantization SNR with sensor signal');
const samplerC = swing => 12 * AN.kT(300) / (swing / 4096) ** 2;
near(samplerC(1.2) * 1e12, .57908616, 1e-8, '300 K sampling-capacitance floor at 1.2 V');
near(samplerC(.6) / samplerC(1.2), 4, 1e-12, 'sampling-capacitance headroom cost');
// MOSFET chapter: the ideal channel charge and the temperature crossings
// displayed by the chapter, plus both polarities of the circuit tracer.
const mosChapter = read('chapters/mosfet.html');
for (const name of ['gradualChannel', 'transferCrossing', 'sweep']) {
 vm.runInContext(block(mosChapter, name), context);
}
let channelPoints = 0;
for (const ov of [-.15, 0, .08, .2, .45]) for (const vd of [0, .03, .08, .2, .45, 1.8]) {
 const q = x => context.gradualChannel(ov, vd, x);
 near(q(0), Math.max(0, ov), 1e-14, 'source-end charge');
 near(q(1), Math.max(0, ov - vd), 1e-14, 'drain-end charge');
 for (let j = 0; j <= 20; j++) {
  const x = j / 20;
  near(q(x) ** 2, q(0) ** 2 + x * (q(1) ** 2 - q(0) ** 2), 1e-14, 'square of charge is linear along the channel');
  channelPoints++;
 }
}
const overviewMos = { type: 'n', W: 10e-6, L: 1e-6 };
const transferId = (v, T) => AN.mos(overviewMos, v, .9, 0, T).id;
const tempDifference = T => v => T === 300 ? transferId(v, 300.1) - transferId(v, 299.9) : transferId(v, T) - transferId(v, 300);
let prevCross = 0;
for (const T of [230, 250, 300, 350, 400, 420]) {
 const cross = context.transferCrossing(tempDifference(T));
 assert.ok(cross > .83 && cross < .88 && cross > prevCross);
 near(tempDifference(T)(cross), 0, 1e-15, 'transfer curve intersection');
 prevCross = cross;
}
assert.equal(context.transferCrossing(() => 1), null);
let mosTracerPoints = 0;
for (const type of ['n','p']) for (const T of [230,300,420]) for (const md of ['out','tr']) {
 const dev = { ...overviewMos, type };
 const { curves, ok } = context.sweep(dev, T, md, .25);
 assert.ok(ok);
 for (const line of curves) for (let j = 0; j < line.x.length; j++) {
  const gate = md === 'out' ? line.s : line.x[j];
  const drain = md === 'out' ? line.x[j] : line.s;
  const r = AN.mos(dev, gate, drain, 0, T);
  near(line.i[j], r.id, 1e-13, 'tracer magnitude under its terminal polarity convention');
  assert.equal(line.d[j].region, r.region);
  mosTracerPoints++;
 }
}
// Small-signal chapter: coherent harmonic extraction, square-law identities,
// and the complete chart domain at high efficiency for both polarities.
const smallSignalSource = read('chapters/smallsignal.html');
for (const name of ['drainHarmonics','saturationEstimates','includeLogValues']) {
 vm.runInContext(block(smallSignalSource, name), context);
}
let smallSignalHarmonicCases = 0;
for (const vov of [.15,.2,.35,.45]) for (const amplitude of [.002,.008,.04,.12]) {
 const hd = context.drainHarmonics(v => v * v, vov, amplitude, 256, 4);
 near(hd[1], 20 * Math.log10(amplitude / (4 * vov)), 1e-10, 'square-law HD2');
 assert.ok(hd.slice(2).every(v => v < -140));
 smallSignalHarmonicCases++;
}
for (const [bias, expected] of [[.65,-39.33005097],[.30,-25.18790428]]) {
 const h = context.drainHarmonics(v => AN.mos(overviewMos,v,.9).id, bias,.008,256,4);
 near(h[1], expected, 1e-7, 'AB180 distortion example');
}
let smallSignalBiasCases = 0;
for (const type of ['n','p']) {
 const p = AN.PROC[type], W = 10e-6, L = 1e-6, lambda = p.lam / L;
 for (const vov of [.05,.2,.4]) for (const vds of [.1,.5,.9]) for (const body of [0,.5,1]) {
  const m = context.saturationEstimates(p,W,L,vov,vds,body);
  const r = AN.mos({type,W,L},p.vth0+p.gamma*(Math.sqrt(p.phi+body)-Math.sqrt(p.phi))+vov,vds,-body);
  near(m.eta,r.gmb/r.gm,1e-8,'body factor is independent of the saturation comparison');
  if (vov < .15 || vds < vov) assert.equal(m.id,undefined);
  else {
   near(m.gm,2*m.id/vov,1e-12,'consistent square-law gm');
   near(m.ro,(1+lambda*vds)/(lambda*m.id),1e-8,'consistent square-law output resistance');
   near(m.gro,m.gm*m.ro,1e-12,'consistent intrinsic gain');
  }
  smallSignalBiasCases++;
 }
 const jd = [3,4,17,20,26,28].flatMap(g => [.18,1,2].map(L => AN.gmidLookup(type,L*1e-6,g).jd));
 const [lo,hi] = context.includeLogValues([.01,1000],jd);
 assert.ok(jd.every(v=>v>=lo && v<=hi));
 if (type==='p') assert.ok(lo<.001);
}
// Single-stage chapter: equal DC current in the actual browser comparison,
// matching measured output fundamentals, and analytical port-resistance checks.
const stageSource = read('chapters/singlestage.html');
const stageComparison = stageSource.slice(stageSource.indexOf('    function build(kind, I, Rsig)'), stageSource.indexOf('    function run()',stageSource.indexOf('    function measure(kind, I, Rsig)')));
const stageDegeneration = stageSource.slice(stageSource.indexOf('    function build(rs)'), stageSource.indexOf('    const get = (rs)'));
vm.runInContext(`(() => {
 const VDD=1.8, nmos=W=>({type:'n', W:W*1e-6, L:1e-6}), dB=x=>20*Math.log10(Math.abs(x));
 const isSat=r=>r==='sat'||r==='sub';
 ${['stageSpectrum','matchFundamental','sourceGateBias','cascodeResistance'].map(name=>block(stageSource,name)).join('\n')}
 globalThis.stageCompare=(()=>{const RD=1e4,RSD=2e3,CL=.5e-12,FR=AN.logspace(1e3,1e10,80); ${stageComparison} return measure;})();
 globalThis.stageDegenerate=(()=>{const RD=15e3, ID0=AN.mos(nmos(10),.65,.9).id,XS=AN.linspace(.3,1.6,131),f=1e3,N=256,cyc=7;
  ${stageDegeneration}
  return (rs,target)=>{const b=build(rs); return {dc:b.op.dev.M1.ids, result: matchFundamental(target,Math.min(b.vb,VDD-b.vb),amp=>thd(b,amp))};};
 })();
 globalThis.stageCascodeResistance=cascodeResistance;
 globalThis.stageMatch=matchFundamental;
})()`,context);
let stageBiasCases=0, stageDistortionCases=0;
for (const current of [20e-6,50e-6,100e-6]) for (const sourceR of [10,1000,1e5]) {
 for (const kind of ['cs','rs','sf','cg','cc']) {
  const q=context.stageCompare(kind,current,sourceR);
  assert.ok(q.op.ok);
  near(q.op.dev.M1.ids,current,1e-10,'topology comparison DC current');
  assert.ok(q.lo>=0&&q.hi<=1.8&&q.lo<=q.op.v.out+1e-8&&q.hi>=q.op.v.out-1e-8);
  if (kind==='cg') assert.ok(sourceR===1e5 ? q.A<.11 : q.A>1);
  stageBiasCases++;
 }
}
for (const rs of [0,1000,2000,3000,4000,5000]) for (const target of [.3,.5]) {
 const d=context.stageDegenerate(rs,target);
 near(d.dc,AN.mos(overviewMos,.65,.9).id,1e-10,'equal DC current in degeneration comparison');
 near(d.result.fundamental,target,2.1e-5,'equal measured output fundamental');
 stageDistortionCases++;
}
assert.equal(context.stageMatch(.5,1,amp=>({fundamental:.1*amp})),null);
const cas=AN.circuit();
cas.V('g',0,.65); cas.V('b',0,1.1); cas.V('d',0,{dc:1.2,ac:1},{name:'Vout'});
cas.M('x','g',0,0,overviewMos,{name:'M1'}); cas.M('d','b','x',0,overviewMos,{name:'M2'});
const casOp=cas.op(), casTest=cas.ac({f:[10],op:casOp}).ibr('Vout');
near(context.stageCascodeResistance(casOp.dev.M1,casOp.dev.M2)*Math.hypot(casTest.re[0],casTest.im[0]),1,5e-5,'cascode output resistance includes body transconductance');
// Current mirrors: the comparison must use a shared saturated operating point,
// and every plotted DC intersection must satisfy the original closed circuit.
const mirrorSource = read('chapters/mirror.html');
vm.runInContext(`(() => {
 const VDD=1.8;
 const nmos=(W,L=1)=>({type:'n',W:W*1e-6,L:L*1e-6});
 const pmos=(W,L=1)=>({type:'p',W:W*1e-6,L:L*1e-6});
 const OUTDEV={simple:['M2'],casc:['M2','M4'],wide:['M2','M4']};
 ${['buildMirror','mirrorResponse','buildBeta','betaReturnCurve'].map(name=>block(mirrorSource,name)).join('\n')}
 Object.assign(globalThis,{buildMirror,mirrorResponse,buildBeta,betaReturnCurve});
})()`,context);
let mirrorCases=0, betaCases=0;
for (const current of [10e-6,20e-6,40e-6,60e-6]) {
 const data=['simple','casc','wide'].map(kind=>context.mirrorResponse(kind,current));
 assert.ok(data[0].comp<data[2].comp && data[2].comp<data[1].comp && data[1].comp<1.7);
 assert.ok(data[1].rout>data[2].rout && data[2].rout>data[0].rout);
 ['simple','casc','wide'].forEach((kind,i)=>{
  const c=context.buildMirror(kind,current);
  const opAt=v=>{c.set('Vo','dc',v);return c.op();};
  const d=data[i], check=opAt(d.comp);
  assert.ok(check.ok);
  assert.ok((kind==='simple'?['M2']:['M2','M4']).every(n=>check.dev[n].region==='sat'));
  assert.ok((kind==='simple'?['M2']:['M2','M4']).some(n=>opAt(d.comp-1e-5).dev[n].region==='triode'));
  near(d.rout*(-opAt(1.701).i.Vo+opAt(1.699).i.Vo)/.002,1,2e-5,'local output resistance at 1.7 V');
  mirrorCases++;
 });
}
for (const rs of [2000,4000,6700,10000,16000]) for (const startup of [false,true]) {
 const curve=context.betaReturnCurve(rs,startup);
 assert.equal(curve.cross.length,startup?1:3);
 const c=context.buildBeta(rs,startup);
 c.V('a',0,0,{name:'Probe'});
 for (const {v,x} of curve.cross) {
  c.set('Probe','dc',v);
  const o=c.op();
  assert.ok(o.ok && Math.abs(o.i.Probe)/x<1e-5);
  betaCases++;
 }
 for (const guess of [{a:0,b:1.8,s:0,st:0},{a:.7,b:.95,s:.11,st:0}]) {
  const o=context.buildBeta(rs,startup).op({guess});
  assert.ok(o.ok && curve.cross.some(({v})=>Math.abs(v-o.v.a)<1e-5));
 }
}
// Differential pair: one volt of differential input and one volt of common-mode input.
const diffSource = read('chapters/diffpair.html');
vm.runInContext(`(() => {
 const VDD=1.8;
 const nmos=(W,L=1)=>({type:'n',W:W*1e-6,L:L*1e-6});
 const pmos=(W,L=1)=>({type:'p',W:W*1e-6,L:L*1e-6});
 const cdiff=(ac,n)=>Math.hypot(ac.re(n)[0],ac.im(n)[0]);
 const OTA_INPUT_DEVICES=["M1","M2","M3","M4","M5"];
 const setVid=(c,vcm,vid)=>{c.set('V1','dc',vcm+vid/2);c.set('V2','dc',vcm-vid/2);};
 ${['build5T','pairAC','measure5T','refineCommonModeEdge'].map(name=>block(diffSource,name)).join('\n')}
 Object.assign(globalThis,{build5T,pairAC,measure5T,refineCommonModeEdge});
})()`,context);
let differentialCases=0;
const pair=context.build5T({vcm:.9});
for (const v of [.6,.76,.9,1.17,1.68,1.75]) {
 const m=context.measure5T(pair,v);
 assert.ok(m.op.ok);
 const h=1e-5;
 const out=(cm,dm)=>{
  pair.set('V1','dc',cm+dm/2); pair.set('V2','dc',cm-dm/2);
  return pair.op().v.y;
 };
 near(m.ad,Math.abs(out(v,h)-out(v,-h))/(2*h),.01,'unit differential gain');
 near(m.acm,Math.abs(out(v+h,0)-out(v-h,0))/(2*h),3e-6,'unit common-mode gain');
 differentialCases++;
}
const saturated=v=>context.measure5T(pair,v).allSat;
for (const [low,high,rising] of [[.76,.78,true],[1.68,1.70,false]]) {
 const edge=context.refineCommonModeEdge(low,high,saturated);
 assert.equal(saturated(edge-1e-5),!rising);
 assert.equal(saturated(edge+1e-5),rising);
}
const mixed=AN.circuit();
mixed.V('g1',0,{dc:0, ac:.5},{name:'V1'});mixed.V('g2',0,{dc:0,ac:-.5},{name:'V2'});
mixed.E('a',0,'g1',0,2);mixed.E('b',0,'g2',0,1);
const mixedOp=mixed.op();
for (const [mode,gain] of [['dm',1.5],['cm',1]]) {
 const ac=context.pairAC(mixed,[10,1e6],mixedOp,mode);
 for (let j=0;j<2;j++) near(ac.re('a')[j]-ac.re('b')[j],gain,1e-12,'balanced AC input convention');
}
// Frequency response: compare equal low-frequency gains and resolve a fast step.
const frequencySource = read('chapters/frequency.html');
vm.runInContext(`(() => {
 const TAU=2*Math.PI;
 ${['cascodeLoadForGain','measureFollowerStep','sPlaneModel'].map(name=>block(frequencySource,name)).join('\n')}
 Object.assign(globalThis,{cascodeLoadForGain,measureFollowerStep,sPlaneModel});
})()`,context);
let frequencyCases=0;
for (const gain of [10,30,100,200,300,10**2.5]) {
 const c=AN.circuit(), gm=1e-3, ro=200e3;
 c.V('g',0,{dc:0,ac:1});
 c.G('x',0,'g',0,gm); c.R('x',0,ro);
 c.G('out','x',0,'x',gm); c.R('out','x',ro);
 c.R('out',0,context.cascodeLoadForGain(gain,gm,ro));
 const ac=c.ac({f:[0]});
 near(ac.re('out')[0],-gain,.001,'same loaded DC gain across the slider range');
 frequencyCases++;
}
const follower=AN.circuit();
follower.V('vdd',0,1.8);
follower.V('in',0,{dc:1.2,wave:AN.wave.step(1.2,1.21,20e-9,1e-10)});
follower.R('in','g',100,{name:'Rs'});
follower.M('vdd','g','s','s',{type:'n', W:40e-6,L:.5e-6},{name:'M1'});
follower.I('s',0,100e-6);
follower.C('s',0,.05e-12,{name:'CL'});
const fastStep=context.measureFollowerStep(follower);
assert.ok(fastStep && fastStep.os<.001,'a coarse integration step manufactured an overshoot');
follower.set('Rs','r',31622.78);
follower.set('CL','c',.5e-12);
const peakedStep=context.measureFollowerStep(follower);
assert.ok(peakedStep && peakedStep.os>.26 && peakedStep.os<.27,'resolved physical overshoot remains');
frequencyCases+=2;
for (const [state,status] of [
 [{s:-1,w:0},'stable'],[{s:0,w:1},'marginal'],[{s:.08,w:1},'unstable'],
 [{s:-1,w:0,p3on:true,p3:.2},'unstable'],[{s:-1,w:0,p3on:true,p3:.2,zon:true,z:.2},'stable'],
]) {
 const m=context.sPlaneModel(state);
 assert.equal(m.status,status);
 near(AN.polyEval(m.den,m.real*2*Math.PI*1e6,m.imag*2*Math.PI*1e6)[0],0,1e-12,'shown pole satisfies denominator');
 frequencyCases++;
}
// Feedback examples: normalize output amplitude, include both port currents,
// and derive the hysteresis boundaries from the finite-gain comparator model.
const feedbackSource = read('chapters/feedback.html');
vm.runInContext(`(() => {
 const TAU=2*Math.PI;
 ${['matchedUnfedDrive','loopReturnRatio','schmittThresholds'].map(name=>block(feedbackSource,name)).join('\n')}
 Object.assign(globalThis,{matchedUnfedDrive,loopReturnRatio,schmittThresholds});
})()`,context);
let feedbackCases=0;
const sine=Array.from({length:1024},(_,i)=>Math.sin(2*Math.PI*i*3/1024));
for (const negativeRail of [.7,1]) for (const target of [.05,.2,.6,.95]) {
 const clip=x=>{const limit=x>=0?1:negativeRail;return limit*Math.tanh(x/limit);};
 const x=context.matchedUnfedDrive(sine,clip,target);
 const amplitude=sine.reduce((sum,v)=>sum+clip(x*v)*v,0)*2/sine.length;
 near(amplitude,target,1e-9,'same fundamental at the open-loop output');
 feedbackCases++;
}
const network=AN.circuit();
network.V('inn',0,{dc:0},{name:'VinTest'});network.V('fb',0,{dc:0},{name:'VfbTest'});
network.R('inn',0,1000);network.R('fb',0,1000);
network.G('fb',0,'inn',0,.004);network.G('inn',0,'fb',0,.002);
network.C('inn',0,1e-9);network.C('fb',0,2e-9);
const f=[10,1e4,1e5,1e6], loop=context.loopReturnRatio(network,f,network.op());
for (let i=0;i<f.length;i++){
 const expected=AN.cx.div([.006,0],[.002,2*Math.PI*f[i]*3e-9]);
 near(loop[i][0],expected[0],1e-8,'bilateral return ratio real');
 near(loop[i][1],expected[1],1e-8,'bilateral return ratio imaginary');
 feedbackCases++;
}
const schmitt=context.schmittThresholds(.05,.9,.9,100,1000,10000);
const loadedSwing=.9/(1+1000*.05/10000);
const upper=Math.max(...AN.linspace(0,.9999,10000).map(x=>.9+.05*loadedSwing*x-Math.atanh(x)/100));
near(schmitt.upper,upper,1e-8,'upper transition is the turning point of the static characteristic');
near(schmitt.upper+schmitt.lower,1.8,1e-12,'threshold symmetry');
assert.equal(context.schmittThresholds(.005,.9,.9,100,1000,10000).width,0);
feedbackCases+=2;
// OTA timing uses a separately solved final level and rejects an unfinished response.
const opampSource=read('chapters/opamp.html');
vm.runInContext(`(() => {
 ${['settlingTime','commonModeOutputs','commonModeStep','requiredGm6'].map(name=>block(opampSource,name)).join('\n')}
 Object.assign(globalThis,{settlingTime,commonModeOutputs,commonModeStep,requiredGm6});
})()`,context);
near(context.settlingTime([0,1,2,3,4],[0,.9,1.03,1.009,1],1,.01,0,4.1),2.95238095238,1e-10,'interpolated last entry after overshoot');
assert.equal(context.settlingTime([0,1,2,3,4],[0,.6,.94,1.005,1.04],1,.01,0,4.1),null);
near(context.settlingTime([0,1,2,3,4],[0,.6,.94,1.005,1.04],1,.01,0,4),2.76923076923,1e-10,'next falling edge excluded');
assert.equal(context.settlingTime([0,1,2],[0,.5,.6],1,.01,0,2.1),null);
for (const dc of [.03,.15,.3,.9,1.55,1.65,1.8]) for (const halfSignal of [-.3,0,.3]) {
 const q=context.commonModeOutputs(dc,halfSignal,.15,1.65);
 near(q.mean,(q.plus+q.minus)/2,1e-14,'observed common mode is the mean of the limited outputs');
}
const smallDisturbance=.04e-6, resistance=2e6, cap=2e-12, gain=30;
let state=.9;
const h=1e-9;
for (let i=0;i<3000;i++) state=context.commonModeStep(state,0,smallDisturbance,gain,h,.9,resistance,cap,.15,1.65);
near(state,.9+smallDisturbance*resistance/(1+gain),1e-10,'dimensionless CMFB gain gives intended DC error');
for (const ratio of [.1,.5,1.5]) for (const pm of [45,60,70]) {
 const f=20e6, cl=2e-12, cc=ratio*cl, gm=context.requiredGm6(f,cl,cc,pm);
 near(90-(Math.atan(2*Math.PI*f*cl/gm)+Math.atan(2*Math.PI*f*cc/gm))*180/Math.PI,pm,1e-12,'hand design budgets both pole and RHP zero');
}
const otaCases=35;
// OTA compensation: physical DC limits, cubic Nyquist boundary, and bias correction.
const stabilitySource=read('chapters/stability.html');
context.TD=50e-9; context.V0=.85; context.V1=.95;
for (const name of ['stepMetrics','nyquistBoundary','measureTrimmedOpen']) {
 vm.runInContext(block(stabilitySource,name),context);
}
vm.runInContext(block(stabilitySource,'follower')+'\nglobalThis.compensationFollower = follower;',context);
const baseStep=context.compensationFollower({});
near(baseStep.final, .95004855, 1e-8, 'final DC output is solved independently of the transient');
near(baseStep.info.overshoot, .0218, .0004, 'overshoot relative to actual DC step');
assert.equal(context.compensationFollower({cc:.2e-12,rz:0,cl:20e-12}).info.ts,null);
near(context.stepMetrics([0,1,2,3],[0,.9,1.03,1],0,1).ts, 8/3, 1e-12,'last entry through upper boundary');
assert.equal(context.stepMetrics([0,1,2,3],[0,.9,1,1.02],0,1).ts,null);
const poles=[1e6,4e6,16e6], critical=26.5625;
for(const [k,status] of [[critical-.01,'stable'],[critical,'marginal'],[critical+.01,'unstable']]) {
 const r=context.nyquistBoundary(poles,k);
 assert.equal(r.status,status);
 near(r.f180,Math.sqrt(84)*1e6,1e-8,'exact cubic phase crossing');
 const l=AN.pz({k,poles})(r.f180);
 near(l[0],r.crossing,1e-12,'exact real-axis crossing');
 near(l[1],0,1e-12,'phase crossing has zero imaginary part');
}
assert.equal(context.nyquistBoundary(poles.slice(0,2),1e5).status,'stable');
for(const vos of [-.003,0,.003]) {
 const r=context.measureTrimmedOpen(vos);
 near(r.vout,.9,1e-7,'biased open-loop output');
 near(r.op.v.inp,.9+vos+r.trim,1e-10,'displayed correction is the correction applied to the positive input');
}
const stabilityCases=12;
// Noise integration uses actual limits, including limits inside one sample interval.
const noiseCircuit=AN.circuit();
noiseCircuit.R('out',0,1000);
const noiseProfile=noiseCircuit.noise('out',{f:[1,10,100]});
for(const [lo,hi,expected] of [[1,10,9],[10,100,90],[2,7,5],[4,50,46],[10,10,0],[100,110,0]]) {
 near(noiseProfile.total([1,1,1],lo,hi)**2,expected,1e-12,'band-limited noise integral');
}
near(noiseProfile.total([1,10,100],2,7)**2,(49-4)/2,1e-12,'interpolate the sampled PSD at both boundaries');
const noiseSource=read('chapters/noise.html');
vm.runInContext(block(noiseSource,'circularAverage')+'\nglobalThis.noiseCircularAverage=circularAverage;',context);
const ave=context.noiseCircularAverage([1,2,3,4],2);
assert.deepEqual(Array.from(ave),[2.5,1.5,2.5,3.5]);
const noiseCases=8;
console.log(JSON.stringify({ passed: true, overviewTailCases: gaussianReferences.length, overviewAdcBins: 4168, channelPoints, mosTracerPoints, smallSignalHarmonicCases, smallSignalBiasCases, stageBiasCases, stageDistortionCases, mirrorCases, betaCases, differentialCases, frequencyCases, feedbackCases, otaCases, stabilityCases, noiseCases, sfdrConditions: 24, pipelineSamples: 50005, ftGHz: ft.map(v => v / 1e9), bandgapTC: tc, pll185kJitterPs: jitter(185e3) * 1e12, pll10kJitterPs: jitter(1e4) * 1e12 }, null, 2));
