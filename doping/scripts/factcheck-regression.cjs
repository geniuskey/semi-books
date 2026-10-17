const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const context = { window: {} };
vm.createContext(context);
vm.runInContext(read('js/doping.js'), context);
const DP = context.window.DP;

// Check the actual carrier calculation for charge neutrality and mass action.
const carrierSource = read('chapters/doping.html');
const start = carrierSource.indexOf('      const majority =');
assert(start >= 0);
const end = carrierSource.indexOf('      const ef =', start);
const carriers = new Function('N', 'ni', carrierSource.slice(start, end) + 'return { n, p };');
let carrierCases = 0;
for (let T = -100; T <= 1200; T += 10) {
  for (let exponent = 10; exponent <= 21; exponent += 0.25) {
    for (const sign of [-1, 1]) {
      const N = sign * 10 ** exponent, ni = DP.ni(T);
      const { n, p } = carriers(N, ni);
      assert(Number.isFinite(n) && n > 0 && Number.isFinite(p) && p > 0);
      assert(Math.abs(n - p - N) / Math.max(Math.abs(N), ni) < 1e-12);
      assert(Math.abs(n * p / (ni * ni) - 1) < 1e-12);
      carrierCases++;
    }
  }
  const ni = DP.ni(T);
  const { n, p } = carriers(0, ni);
  assert(Math.abs(n / ni - 1) < 1e-12);
  assert(Math.abs(p / ni - 1) < 1e-12);
}

// A reference ion must follow the central orbit; compare dispersion to geometry.
const analyzer = read('chapters/analyzer.html');
context.DP = DP;
vm.runInContext(analyzer.slice(analyzer.indexOf('  const SRC ='),
  analyzer.indexOf('  /* ---------------------------------------------------------- 1. 분석')) +
  'this.ray = ray; this.dispersion = dispersion;', context);
const R = 0.5, L = 0.5, r = R * Math.sqrt(1.01);
const exitX = Math.sqrt(2 * r * R - R * R);
const expectedDispersion = (exitX + L * (r - R) / exitX - R) / 0.01;
for (const V of [5000, 30000, 80000]) {
  for (const mass of [10, 11, 49, 75]) {
    const B = DP.rigidity(mass, V) / R;
    const ray = context.ray(mass, V, B, 0, 0);
    assert(ray.ok);
    assert(Math.abs(ray.xs) < 1e-12);
    assert(Math.abs(context.dispersion(V, B) - expectedDispersion) < 1e-10);
  }
}

// Turning Fermi enhancement off must pass the intrinsic ratio n/ni = 1.
const originalD = DP.D;
const ratios = [];
DP.D = (dop, T, ratio) => {
  if (ratio !== undefined) ratios.push(ratio);
  return originalD(dop, T, ratio);
};
const xs = DP.grid(300, 300);
const implant = DP.implant(xs, { ion: 'B', E: 10, dose: 1e13 });
const result = DP.anneal(implant.c, DP.history('rta', { peak: 1000, hold: 30 }),
  { xs, dop: 'B', background: 1e17, fermi: false });
assert(ratios.length > 0 && ratios.every(ratio => ratio === 1));
assert(Array.from(result.c).every(value => Number.isFinite(value) && value >= 0));
DP.D = originalD;

// Run the actual readout callback, including the zero-conductance input.
const metrology = read('chapters/metrology.html');
const marker = 'const cv = DB.canvas("#rs-cv", (ctx, w, h) => {';
const callbackStart = metrology.indexOf(marker) + marker.length;
const callbackEnd = metrology.indexOf('}, { aspect: 0.8', callbackStart);
const draw = new Function('DB', 'DP', 'xs', 'BG', 'profile', 'type', 'sup',
  'nm', 'ctx', 'w', 'h', metrology.slice(callbackStart, callbackEnd));
const grid = DP.grid(160, 600), BG = 1e18;
let metrologyCases = 0;
for (const N of [1e18, 1e19, 1e20, 1e21]) {
  for (const W of [3, 10, 40, 80]) {
    for (const tp of ['n', 'p']) {
      const act = Float64Array.from(grid, x => N * 0.5 * DP.erfc((x - W) / (0.12 * W + 1)));
      const stats = {}, charts = [];
      const DB = { palette: () => ({}), color: () => '',
        chart: (ctx, bounds, options) => charts.push(options),
        stat: (id, value) => { stats[id] = value; } };
      draw(DB, DP, grid, BG, () => ({ act }), () => tp, String, String, {}, 640, 480);
      for (const chart of charts) for (const series of chart.series) {
        assert(series.data.every(point => point.every(Number.isFinite)));
      }
      assert(Object.values(stats).every(value => !/NaN|Infinity/.test(value)));
      if (N === BG) {
        assert.equal(stats['rs-o-r'], '유효 도핑층 없음');
        assert.equal(stats['rs-o-m'], '산출 불가');
        assert.equal(stats['rs-o-v'], '산출 불가');
        assert.equal(stats['rs-o-h'], '산출 불가');
      } else {
        const xj = DP.junction(grid, act, BG);
        const cumulative = DP.sheetCumulative(grid, act, BG, tp);
        const G = (cumulative.find(point => point[0] >= xj) || cumulative.at(-1))[1];
        const Rs = 1 / G;
        assert.equal(stats['rs-o-r'], (Rs < 1e4 ? Rs.toFixed(0) : DP.sci(Rs)) + '<small>Ω/□</small>');
      }
      metrologyCases++;
    }
  }
}
console.log(`Passed: ${carrierCases} carrier cases, 12 analyzer cases, intrinsic diffusion, ${metrologyCases} metrology cases.`);
