/* Copyright (c) 2026 MemoryBook contributors. MIT.
 * Run: node memory/tools/factcheck-regression.cjs
 * design.html sim-pg: preset targets set from code must not be quantized by the log sliders
 *   (16 GB read 16.03 GB, so the 8x GDDR7 2 GB design failed the GPU preset's capacity check).
 * interface.html sim-eye: with a nearly lossless channel the eye width must not shrink.
 * (Bug: the offset search was limited to ±0.5 UI around a sample point that landed at the
 *  end of a flat-topped UI, so width read 58% UI at 0 dB/GHz and grew with loss.)
 */
const assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
const file = process.env.MB_INTERFACE || path.resolve(__dirname, '..', 'chapters', 'interface.html');
const html = fs.readFileSync(file, 'utf8');
const src = html.slice(html.lastIndexOf('<script>') + 8, html.lastIndexOf('</script>'));
const vals = {}, cbs = {}, stats = {};
function el(id) { return { addEventListener(e, f) { cbs[id] = f; }, checked: id === 'pw-odt' || id === 'wv-guide', textContent: '' }; }
Object.assign(vals, { 'ey-rate': 8, 'ey-loss': 1.2, 'ey-noise': 5, 'ey-jit': 2, 'ey-eq': 'off', 'pm-mode': 'pam3', 'pm-snr': 26, 'pm-loss': 0,
  'bw-rate': 6.4, 'bw-width': 64, 'bw-ch': 2, 'bw-eff': 80, 'bw-pre': 'ddr5', 'rf-zs': 20, 'rf-z0': 40, 'rf-zl': 100, 'rf-tr': 80,
  'pw-c': 2, 'pw-v': 1.1, 'pw-rate': 6.4, 'pw-bw': '1000', 'wv-gen': 'ddr5', 'wv-win': '32' });
let seed = 12345; const rnd = () => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648; };
const ctl = (id, cb) => { cbs[id] = cb; const g = () => vals[id]; g.set = v => { vals[id] = v; cb && cb(v); }; return g; };
const MB = { range: (id, fmt, cb) => ctl(id, cb), seg: ctl, canvas() { return { redraw() {} }; }, stat(id, v) { stats[id] = v; },
  fmt: (v, n) => Number(v.toPrecision(n)).toString(), clamp: (v, a, b) => Math.max(a, Math.min(b, v)),
  randn() { const u = rnd() || 1e-9, v = rnd(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); },
  loop() {}, approach: (a, b) => b, alpha: () => 'rgba(0,0,0,1)' };
const M = Object.getOwnPropertyNames(Math).reduce((o, k) => (o[k] = Math[k], o), {}); M.random = rnd;
const ctx = vm.createContext({ MB, Math: M, console, window: {}, requestAnimationFrame: () => 1, getComputedStyle: () => ({ getPropertyValue: () => '' }),
  document: { getElementById: el, body: {}, createElement: () => ({ getContext: () => ({}) }) } });
vm.runInContext(src, ctx);
const set = (id, v) => { vals[id] = v; cbs[id] && cbs[id](v); };
const pct = () => +(/(\d+)% UI/.exec(stats['ey-o-w']) || [0, 0])[1];
set('ey-noise', 0); set('ey-jit', 0);
const w = [0, 0.4, 1.2].map(L => { set('ey-loss', L); return pct(); });
assert.ok(w[0] >= 95, 'lossless eye width ' + w[0]);
assert.ok(w[0] >= w[1] && w[1] >= w[2], 'eye width must not grow with loss: ' + w);

const design = fs.readFileSync(path.resolve(__dirname, '..', 'chapters', 'design.html'), 'utf8');
assert.ok(/exactS = v >= lo && v <= hi \? s : -1/.test(design), 'logRange keeps exact programmatic values');
const a = design.indexOf('var PGM = (function () {'), b = design.indexOf('var TECH = PGM.TECH;');
assert.ok(a > 0 && b > a, 'PGM engine block');
const dctx = vm.createContext({ MB: { fmt: x => String(+x.toPrecision(3)) }, Math });
vm.runInContext(design.slice(a, b) + ';this.PGM=PGM;', dctx);
let S = dctx.PGM.search({ bw: 900, cap: 16, pw: 80, cost: 60, area: 40 }, 0.5);
assert.ok(S.best.ok && S.best.cfg.a.key === 'gddr7' && S.best.cfg.a.n === 8 && S.best.cost === 40, 'GPU preset picks GDDR7 x8 at cost 40');
S = dctx.PGM.search({ bw: 500, cap: 768, pw: 150, cost: 1000, area: 250 }, 0.25);
assert.ok(S.best.cfg.a.n === 10 && S.best.cfg.b.key === 'cxl' && Math.abs(S.best.bw - 536) < 1, 'server preset picks DDR5 x10 + CXL at ~536 GB/s');
console.log('memory factcheck regressions ok', w.join('/'));
