/* Copyright (c) 2026 geniuskey and PowerBook contributors. MIT.
 * Run: node power/tools/factcheck-regression.cjs
 * Exercises the live breakdown engine of chapter 3 (breakdown.html).
 */
"use strict";
const assert = require("node:assert/strict"), fs = require("node:fs"), path = require("node:path"), vm = require("node:vm");
const root = path.resolve(__dirname, "..");
const read = (f) => fs.readFileSync(path.join(root, f), "utf8");
// Every inline chapter script must at least parse.
for (const file of fs.readdirSync(path.join(root, "chapters")).filter((f) => f.endsWith(".html")))
  for (const m of read(`chapters/${file}`).matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi))
    if (m[1].trim() && !/type=["']application\/ld\+json["']/i.test(m[0])) new vm.Script(m[1], { filename: file });

const s = read("chapters/breakdown.html");
const start = s.indexOf("  const Q = 1.602176634e-19"), end = s.indexOf("  // 멱법칙 닫힌 식 BV(N, W)", start);
assert.ok(start > 0 && end > start, "breakdown engine block");
const c = vm.createContext({});
vm.runInContext(s.slice(start, end) + "\nglobalThis.E = { MAT, BV, bvPL: null };", c);
const { MAT, BV } = c.E;
const W = 1; // 1 cm: non-punch-through
// Lightly doped Si: the electron-injection integral alone falls back below 1 far above breakdown,
// which used to return 17 kV at 1e14 and 300 kV at 1e13. BV must follow ~N^-3/4 (about 1.4 kV at 1e14).
const bv14 = BV(MAT.Si, 1e14, W, "ch");
assert.ok(bv14 > 1200 && bv14 < 1600, `Si 1e14 BV ${bv14}`);
const bv13 = BV(MAT.Si, 1e13, W, "ch");
assert.ok(bv13 > 6000 && bv13 < 11000, `Si 1e13 BV ${bv13}`);
let prev = Infinity;
for (let lg = 13; lg <= 17.01; lg += 0.1) {
  const v = BV(MAT.Si, 10 ** lg, W, "ch");
  assert.ok(v < prev, `Si BV must fall monotonically with doping (N=1e${lg.toFixed(1)})`);
  prev = v;
}
// Values quoted in the chapter.
const near = (a, b, rel, label) => assert.ok(Math.abs(a / b - 1) <= rel, `${label}: ${a} vs ${b}`);
near(BV(MAT.Si, 1e15, W, "ch"), 252, 0.03, "Si 1e15");
near(BV(MAT.SiC, 8e15, 10e-4, "ch"), 1900, 0.03, "PW-800 SiC drift 8e15 / 10 um");
console.log("power factcheck regression ok");
