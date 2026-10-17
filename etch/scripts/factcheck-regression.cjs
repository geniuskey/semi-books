const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const context = { window: {} };
vm.createContext(context);
vm.runInContext(fs.readFileSync(path.join(__dirname, '../js/etch.js'), 'utf8'), context);
const E = context.window.ET;

// A slow cap must be removed before wet etchant reaches the buried film.
for (const h of [1, 2, 3]) {
  const s = E.sim({ width: 20, height: 40, dx: 1, seed: 1 });
  s.layer('ox', 20).layer('nit', h);
  const firstOx = s.mat.findIndex(m => m === E.MI.ox);
  const wet = E.wet(s, { rates: { ox: 1, nit: 0.01 } });
  assert(Math.abs(wet.T[firstOx] - (100 * h + 0.5)) < 0.0001);
  wet.apply(10); assert.equal(s.phi[firstOx], 1);
  wet.apply(100 * h + 1); assert.equal(s.phi[firstOx], 0);
}
{
  const s = E.sim({ width: 20, height: 40, dx: 1, seed: 1 });
  s.layer('ox', 20).layer('nit', 1);
  const firstOx = s.mat.findIndex(m => m === E.MI.ox);
  const wet = E.wet(s, { rates: { ox: 1, nit: 0 } });
  wet.apply(1000); assert.equal(wet.T[firstOx], Infinity);
  assert.equal(s.phi[firstOx], 1);
}
// Opening a cavity exposes the lower film, with zero liquid transit delay.
{
  const s = E.sim({ width: 20, height: 40, dx: 1, seed: 1 });
  s.layer('ox', 20);
  for (let y = 25; y <= 30; y++) for (let x = 0; x < s.W; x++) {
    const j = y * s.W + x; s.mat[j] = 0; s.phi[j] = 0;
  }
  const wet = E.wet(s, { rates: { ox: 1 } });
  assert.equal(wet.T[25 * s.W], 5);
  assert.equal(wet.T[31 * s.W], 5.5);
  wet.apply(10); assert.equal(s.phi[31 * s.W], 0);
}
// Verify the physical thickness, independent of grid size, and rewind.
for (const dx of [0.5, 1, 2]) {
  const s = E.sim({ width: 20, height: 40, dx, seed: 1 });
  s.layer('ox', 20);
  const initial = s.phi.reduce((a, b) => a + b, 0);
  const wet = E.wet(s, { rates: { ox: 1 } });
  wet.apply(7.25);
  const removed = (initial - s.phi.reduce((a, b) => a + b, 0)) * dx / s.W;
  assert(Math.abs(removed - 7.25) < 1e-6);
  wet.apply(0); assert.equal(s.phi.reduce((a, b) => a + b, 0), initial);
}
for (const periodic of [false, true]) {
  const s = E.sim({ width: 8, height: 8, dx: 1, periodic, seed: 1 });
  s.mat.fill(E.MI.nit); s.phi.fill(1);
  for (const j of [0, s.W + 1]) { s.mat[j] = 0; s.phi[j] = 0; }
  assert.equal(E.wet(s, { rates: { nit: 0 } }).T[s.W + 1], Infinity);
}

// Separate surface undercut, internal bowing, merged openings, and wall tilt.
function trench(width = 80) {
  const s = E.sim({ width, height: 100, dx: 1 });
  s.layer('si', 10).layer('ox', 60).layer('ac', 10);
  s.open('ac', [[30, 50]]); return s;
}
{
  const s = trench();
  for (let d = 0; d < 40; d++) {
    for (let x = (d >= 10 && d < 30 ? 20 : 30); x < (d >= 10 && d < 30 ? 60 : 50); x++) {
      const j = (s.marks.oxTop + d) * s.W + x; s.mat[j] = 0; s.phi[j] = 0;
    }
  }
  const m = E.measure(s, { x: 40 });
  assert.equal(m.undercut, 0); assert.equal(m.bow, 20);
}
{
  const s = E.sim({ width: 40, height: 80, dx: 1 });
  s.layer('si', 20).layer('ox', 40).layer('ac', 10);
  s.open('ac', [[10, 30]]);
  for (let y = s.marks.oxTop; y < s.marks.oxTop + 10; y++) for (let x = 0; x < s.W; x++) {
    s.mat[y * s.W + x] = 0; s.phi[y * s.W + x] = 0;
  }
  const m = E.measure(s);
  assert.equal(m.top, 40); assert.equal(m.max, 40);
  assert(m.widthMerged && !m.angleValid && m.undercutMerged);
  assert.equal(m.undercut, 10);
}
{
  const s = trench(100);
  for (let d = 0; d < 40; d++) for (let x = 30 + Math.floor(d / 10); x < 50 + Math.floor(d / 10); x++) {
    const j = (s.marks.oxTop + d) * s.W + x; s.mat[j] = 0; s.phi[j] = 0;
  }
  const m = E.measure(s, { x: 40 }), tilt = Math.atan(3 / 31) * 180 / Math.PI;
  assert(Math.abs(m.angleLeft - (90 - tilt)) < 1e-10);
  assert(Math.abs(m.angleRight - (90 + tilt)) < 1e-10);
}
// Independent parallel-disk view-factor formula; this is direct arrival only.
for (const A of [0, 0.1, 1, 8, 100]) {
  const separationRatio = 2 + 4 * A * A;
  const diskView = 2 / (separationRatio + Math.sqrt(separationRatio ** 2 - 4));
  assert(Math.abs(E.holeView(A) - diskView) < 1e-12);
  assert(E.holeView(A) > 0 && E.holeView(A) <= E.slotView(A));
}
console.log('Passed: wet barriers/cavities/grid/rewind, profile geometry, direct hole view factors.');
