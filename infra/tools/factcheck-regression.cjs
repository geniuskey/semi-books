/* Copyright (c) 2026 geniuskey and InfraBook contributors. MIT (see ../LICENSE-MIT).
 * Run: node infra/tools/factcheck-regression.cjs
 * Regressions for InfraBook simulator fixes found in the 2026-11 content review.
 */
"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const root = path.resolve(__dirname, "..");
const read = (f) => fs.readFileSync(path.join(root, f), "utf8");

// Every chapter's inline scripts must at least compile.
for (const file of fs.readdirSync(path.join(root, "chapters")).filter((f) => f.endsWith(".html"))) {
  const src = read(`chapters/${file}`);
  for (const m of src.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)) {
    if (/\bsrc=/.test(m[1])) continue;
    if (/application\/ld\+json/i.test(m[1])) { JSON.parse(m[2]); continue; }
    new vm.Script(m[2], { filename: file });
  }
}

// UPW dead leg: exchange time at the branch end is the transit time ∫dx/v with
// v(x) = vs·e^{-x/1.5D}, divided by a 5 % vortex-exchange efficiency. The old code divided
// the branch length by the space-averaged velocity, which made L/D = 20 look like 0.26 h.
{
  const src = read("chapters/upw.html");
  const line = src.match(/var tTr = ([^;]+);/);
  assert.ok(line, "upw: dead-leg transit-time expression missing");
  const tTr = (D, vs, ld) => vm.runInNewContext(line[1], { D, vs, ld, Math });
  const D = 0.025, vs = 1.5;
  const exch = (ld) => tTr(D, vs, ld) / 0.05;
  const exact = (ld) => (1.5 * D / vs) * (Math.exp(ld / 1.5) - 1) / 0.05;
  for (const ld of [2, 6, 10, 15]) assert.ok(Math.abs(exch(ld) / exact(ld) - 1) < 1e-9, `upw: transit time at L/D=${ld}`);
  assert.ok(exch(10) > 10 * exch(6), "upw: exchange time must grow exponentially with L/D");
  assert.ok(!/var vavg = /.test(src), "upw: space-averaged velocity must not be used for the dead-leg time");
}

// Vibration Fig. 12-7(a): dB-addition curve must follow 10·log10(1 + 10^(-Δ/10)).
{
  const src = read("chapters/vibration.html");
  assert.ok(/M60 70 L80 98 L100 123/.test(src), "vibration: dB-addition curve path changed; recheck against 10log(1+10^(-Δ/10))");
}

console.log("infra factcheck regressions ok");
