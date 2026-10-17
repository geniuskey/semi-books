const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const source = fs.readFileSync(path.join(__dirname, '../chapters/aberration.html'), 'utf8');
const loopStart = source.indexOf('      const infl = [];');
const loopEnd = source.indexOf('      const [pa, pb] = split(w, h);', loopStart);
assert(loopStart >= 0 && loopEnd > loopStart);
const detector = new Function('rm', 'dz', 'kap',
  'const NS = 200, slope = []; let smax = 0;\n' + source.slice(loopStart, loopEnd) + 'return infl;');
const context = {};
vm.createContext(context);
vm.runInContext(source.match(/  function sagConic[^\n]+/)[0], context);
const asphereSource = source.slice(source.indexOf('Sim 8: 짝수차 비구면'));
const presets = new Function('return ' + asphereSource.match(/    const PRE = (\{[\s\S]*?\n    \});/)[1])();
function roots(preset) {
  const [c, k, A4, A6, A8, rm] = preset;
  const z = r => context.sagConic(c, k, r) + A4 * r ** 4 + A6 * r ** 6 + A8 * r ** 8;
  const dz = r => (z(r + 1e-4) - z(r - 1e-4)) / 2e-4;
  const kap = r => (z(r + 1e-3) - 2 * z(r) + z(r - 1e-3)) / 1e-6 / (1 + dz(r) ** 2) ** 1.5;
  return detector(rm, dz, kap);
}
const gull = roots(presets.gull);
assert.equal(gull.length, 2);
assert(Math.abs(gull[0] - 0.86056) < 1e-3);
assert(Math.abs(gull[1] - 2.51230) < 1e-3);
assert.equal(roots(presets.l1).length, 0);
assert.equal(roots(presets.sph).length, 0);
for (const kap of [() => 0, () => 2, r => r * r, r => (r - 1.2) ** 2]) {
  assert.equal(detector(2, () => 0, kap).length, 0);
}
const zeroCrossing = detector(2, () => 0, r => r - 1.2);
assert.equal(zeroCrossing.length, 1);
assert(Math.abs(zeroCrossing[0] - 1.2) < 1e-12);
assert.equal(detector(2, () => 0, r => r < 0.9 ? -1 : r > 1.1 ? 1 : NaN).length, 0);
assert.equal(detector(2, r => r > 0.9 && r < 1.1 ? NaN : 0, r => r - 1).length, 0);
const zeroPlateau = detector(2, () => 0, r => r < 0.9 ? -1 : r > 1.1 ? 1 : 0);
assert.equal(zeroPlateau.length, 1);
assert(Math.abs(zeroPlateau[0] - 1) < 1e-12);
assert.equal(detector(2, () => 0, r => r < 0.9 || r > 1.1 ? 1 : 0).length, 0);
console.log('Passed: actual inflection detector presets, zero crossings/touches/plateaus, invalid intervals.');

// OPT-04/05: disk OTF sign and antialiased square-wave convolution.
{
  const chapter = fs.readFileSync(path.join(__dirname, '../chapters/mtf.html'), 'utf8');
  const sandbox = { window: {} }; vm.createContext(sandbox);
  vm.runInContext(fs.readFileSync(path.join(__dirname, '../js/optics.js'), 'utf8'), sandbox);
  const OPT = sandbox.window.OPT;
  const start = chapter.indexOf('    function buildLSF()');
  const end = chapter.indexOf('    function compute()', start);
  const make = new Function('OPT', 'type', 'gW',
    'const N=4096,dx=.02,TAU=2*Math.PI,mtfD=OPT.mtfDiff,xOf=i=>(i<N/2?i:i-N)*dx;'
    + chapter.slice(start, end) + 'return {S:buildLSF(),otfAt,squareAverage};');
  let overlapCases = 0, diskCases = 0;
  const {squareAverage} = make(OPT, () => 'diff', () => 1.8);
  for(const nu of [.02,.3,.8,1.2]) for(let i=-120;i<=120;i++) {
    const x=i*.0137, lo=x-.01, hi=x+.01;let overlap=0;
    for(let k=Math.floor(nu*lo)-1;k<=Math.ceil(nu*hi)+1;k++)
      overlap+=Math.max(0,Math.min(hi,(k+.25)/nu)-Math.max(lo,(k-.25)/nu));
    assert(Math.abs(squareAverage(x,nu)-overlap/.02)<2e-12); overlapCases++;
  }
  // Continuous uniform disk integration, independent of the library Bessel function.
  function diskOtf(nu,R) {
    const n=10000,step=Math.PI/n;let sum=0;
    for(let j=0;j<=n;j++){const t=-Math.PI/2+j*step;
      sum+=(j===0||j===n?1:j%2?4:2)*Math.cos(t)**2*Math.cos(2*Math.PI*nu*R*Math.sin(t));}
    return sum*step/3*2/Math.PI;
  }
  for(const w of [.5,1.8,4]) {
    const {S,otfAt}=make(OPT,()=> 'defocus',()=>w);
    for(const nu of [.2,.4,.65,.8,1,1.2]) {
      const [real,imag]=otfAt(S,nu),reference=diskOtf(nu,w);
      assert(Math.abs(real-reference)<.004,`${w}/${nu}: ${real} vs ${reference}`);
      assert(Math.abs(imag)<1e-12);diskCases++;
    }
  }
  const defocus=make(OPT,()=> 'defocus',()=>1.8);
  assert(defocus.otfAt(defocus.S,.4)[0]<0);
  assert(defocus.otfAt(defocus.S,.65)[0]>0);
  const diffraction=make(OPT,()=> 'diff',()=>1.8);
  function contrast(nu){let lo=Infinity,hi=-Infinity;
    for(let j=0;j<=360;j++){const x=j/360*2.5/nu;let value=0;
      for(let i=0;i<diffraction.S.xs.length;i++)value+=diffraction.S.ls[i]*squareAverage(x-diffraction.S.xs[i],nu);
      lo=Math.min(lo,value);hi=Math.max(hi,value);}
    return (hi-lo)/(hi+lo);
  }
  assert(contrast(1.2)<.0002,'Stop-band square wave must not show the old ~2% contrast floor');
  for(const nu of [.4,.65,.8])assert(Math.abs(contrast(nu)-4/Math.PI*OPT.mtfDiff(nu,1/(.55*1.8)))<.001);
  console.log({squareOverlapCases:overlapCases,diskOtfCases:diskCases,stopBandCtf:contrast(1.2)});
}
