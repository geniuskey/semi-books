/* Copyright (c) 2026 geniuskey and SemiBooks contributors. MIT. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const context = { window: {} };
vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../tcad/js/tcad.js'), 'utf8'), context);
const TC = context.window.TC;

test('incomplete ionization stays finite in the dilute limit and satisfies charge neutrality', () => {
  assert.equal(TC.ionFrac(0), 1);
  assert.equal(TC.ionFrac(1e-4), 1);
  for (const T of [50, 300, 1000]) {
    for (const N of [1, 1e10, 1e17, 1e19]) {
      const fraction = TC.ionFrac(N, T);
      assert(fraction > 0 && fraction <= 1, `N=${N}, T=${T}: ${fraction}`);
      const ionized = N * fraction;
      const fromOccupancy = N / (1 + 2 * ionized / TC.Nc(T) * Math.exp(0.045 / (TC.kB * T)));
      assert(Math.abs(ionized - fromOccupancy) / N < 1e-12);
    }
  }
});
