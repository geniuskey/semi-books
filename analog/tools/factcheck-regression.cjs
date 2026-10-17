/* Copyright (c) 2026 AnalogBook contributors. MIT (see ../LICENSE-MIT).
 * Run: node tools/factcheck-regression.cjs
 * Numerical regressions for ANA-03, 04, 05, 08, 11, 12, 13, 14.
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
vm.runInContext(pll.match(/    const FS = AN.logspace\(1e3, 1e8, 400\);[\s\S]*?(?=    let cur = null)/)[0] + '\nglobalThis.pn = { Lv, Li, out, integ };', context);
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
console.log(JSON.stringify({ passed: true, sfdrConditions: 24, pipelineSamples: 50005, ftGHz: ft.map(v => v / 1e9), bandgapTC: tc, pll185kJitterPs: jitter(185e3) * 1e12, pll10kJitterPs: jitter(1e4) * 1e12 }, null, 2));
