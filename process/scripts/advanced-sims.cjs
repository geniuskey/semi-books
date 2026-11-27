#!/usr/bin/env node
/* Copyright (c) 2026 geniuskey and ProcessBook contributors. SPDX-License-Identifier: MIT */
// 13장(첨단 소자 공정) 새 시뮬레이터 모델 회귀: 교과서 기준값과 본문·해볼 것·퀴즈가 인용하는 수치.
"use strict";
const fs = require("node:fs"), vm = require("node:vm"), assert = require("node:assert/strict"), path = require("node:path");
const html = fs.readFileSync(path.join(__dirname, "..", "chapters", "advanced.html"), "utf8");
const ctx = { Math };
vm.createContext(ctx);
for (const id of ["sim-eot", "sim-wf", "sim-lambda", "sim-ir"]) {
  const a = html.indexOf(`/* model:${id} */`), b = html.indexOf(`/* /model:${id} */`);
  assert(a > 0 && b > a, `model block ${id} not found`);
  vm.runInContext(html.slice(a, b), ctx, { filename: id });
}
const { EOTM, WFM, LAMM, IRM } = ctx;
const near = (v, want, tol, msg) => assert(Math.abs(v - want) <= tol, `${msg}: ${v} vs ${want}±${tol}`);
const rel = (v, want, r, msg) => assert(Math.abs(v / want - 1) <= r, `${msg}: ${v} vs ${want}`);
const has = (s) => assert(html.includes(s), `text missing: ${s}`);

/* ---- sim-eot */
// SiO₂ 보정점과 약 1 decade/0.2 nm 기울기(공개 자료 경향)
rel(EOTM.sio2(1.2, 1).J, 30, 1e-9, "SiO2 calibration");
for (const t of [1.0, 1.2, 1.4, 1.6]) { const d = Math.log10(EOTM.sio2(t, 1).J / EOTM.sio2(t + 0.2, 1).J); assert(d > 0.9 && d < 1.3, `slope at ${t}: ${d}`); }
assert(EOTM.sion(1.2, 1).J < EOTM.sio2(1.2, 1).J / 10, "SiON about 10x below SiO2");
// 스택이 EOT = IL에서 SiO₂로 이어진다(연속성)
rel(EOTM.stack(0.6 + 1e-5, 0.6, 20, 1).J, EOTM.sio2(0.6, 1).J, 2e-3, "stack continuity at IL");
assert(EOTM.stack(0.5, 0.6, 20, 1) === null, "EOT below IL impossible");
const st = EOTM.stack(1.2, 0.6, 20, 1), ox = EOTM.sio2(1.2, 1);
near(st.thk, 3.08, 0.005, "HfO2 thickness"); near(st.J, 0.164, 0.001, "stack J");
near(ox.J / st.J, 180, 5, "default ratio"); near(ox.S, 13.3, 0.05, "SiO2 exponent"); near(st.S, 18.5, 0.05, "stack exponent");
near(st.t / ox.t, 3.07, 0.05, "barrier width ratio ~3");
const cross = (f, lim) => { let lo = 0.5, hi = 2.5; for (let i = 0; i < 60; i++) { const m = (lo + hi) / 2; f(m) > lim ? (lo = m) : (hi = m); } return lo; };
const stJ = (t) => { const s = EOTM.stack(t, 0.6, 20, 1); return s ? s.J : 1e9; };
near(cross((t) => EOTM.sio2(t, 1).J, 1), 1.47, 0.005, "SiO2 HP EOT");
near(cross((t) => EOTM.sio2(t, 1).J, 1e-2), 1.85, 0.005, "SiO2 LP EOT");
near(cross(stJ, 1), 1.12, 0.005, "stack HP EOT"); near(cross(stJ, 1e-2), 1.32, 0.005, "stack LP EOT");
near(EOTM.sio2(1.2, 1).J / EOTM.stack(1.2, 1.0, 20, 1).J, 4, 0.2, "IL 1.0 ratio");
near(EOTM.sio2(1.2, 1).J / EOTM.stack(1.2, 0.5, 20, 1).J, 580, 10, "IL 0.5 ratio");
near(EOTM.sio2(1.2, 0.5).J / EOTM.stack(1.2, 0.6, 20, 0.5).J, 1600, 30, "0.5 V ratio");
near(EOTM.sio2(1.2, 1.5).J / EOTM.stack(1.2, 0.6, 20, 1.5).J, 7, 0.2, "1.5 V ratio");
// 모든 조작 범위에서 유한
for (const E of [0.6, 1.2, 2]) for (const k of [10, 30]) for (const til of [0.3, 1]) for (const V of [0.5, 1.5]) {
  const s = EOTM.stack(E, til, k, V); for (const r of [EOTM.sio2(E, V), EOTM.sion(E, V), s].filter(Boolean)) assert(Number.isFinite(r.J) && r.J > 0, `eot finite ${E}/${k}/${til}/${V}`);
}

/* ---- sim-wf */
near(WFM.D, 0.45, 0.005, "Delta"); near(WFM.PHI_MG + WFM.D - WFM.PHI_MG, 0.45, 0.005, "midgap Vt");
let r = WFM.calc("tial", "tin", 2, "none");
near(r.vn, 0.12, 0.005, "default Vtn"); near(r.vp, -0.25, 0.005, "default Vtp"); assert.equal(r.fn.name, "uLVT"); assert.equal(r.fp.name, "LVT");
near(WFM.tin(0.5), 4.65, 0.005, "TiN 0.5"); near(WFM.tin(5), 4.89, 0.005, "TiN 5");
assert.equal(WFM.calc("tial", "tin", 0.5, "none").fp.name, "HVT"); assert.equal(WFM.calc("tial", "tin", 5, "none").fp.name, "uLVT");
r = WFM.calc("tin", "tin", 1, "none"); near(r.en, 4.72, 0.005, "TiN 1 nm eWF"); near(r.vn, 0.56, 0.005, "TiN NMOS Vt");
r = WFM.calc("tin", "tin", 1, "la"); near(r.en, 4.42, 0.005, "La eWF"); near(r.vn, 0.26, 0.005, "La Vtn"); assert.equal(r.fn.name, "LVT");
near(WFM.calc("tial", "tial", 2, "none").vp, -0.78, 0.005, "TiAl PMOS");

/* ---- sim-lambda */
const L = (k, t = 6, e = 1) => LAMM.lam(LAMM.ARCH.find((a) => a.k === k).n, t, e);
near(L("planar"), 4.24, 0.01, "lam1"); near(L("dg"), 3.0, 0.01, "lam2"); near(L("fin"), 2.45, 0.01, "lam3"); near(L("gaa"), 2.12, 0.01, "lam4");
near(LAMM.lmin(L("planar")), 25.5, 0.05, "Lmin1"); near(LAMM.lmin(L("dg")), 18.0, 0.05, "Lmin2"); near(LAMM.lmin(L("fin")), 14.7, 0.05, "Lmin3"); near(LAMM.lmin(L("gaa")), 12.7, 0.05, "Lmin4");
near(LAMM.dibl(12, L("planar")), 243, 1, "dibl planar"); near(LAMM.dibl(12, L("fin")), 86, 0.5, "dibl fin"); near(LAMM.dibl(12, L("gaa")), 59, 0.5, "dibl gaa");
near(LAMM.dibl(6, 1), 50, 0.5, "DIBL at L/lam=6");
assert(12 / L("gaa", 5) > 6 && 12 / L("gaa") < 6, "5 nm sheet passes");
near(LAMM.lmin(L("gaa", 12)), 18, 0.05, "12 nm body"); near(L("gaa", 6, 2) / L("gaa"), Math.SQRT2, 1e-9, "EOT x2");
near(LAMM.lmin(L("gaa")) / LAMM.lmin(L("planar")), 0.5, 1e-9, "quiz 1/2");

/* ---- sim-ir */
const base = { J: 1.5, l: 8, N: 12, Rv: 50, w: 16 };
let q = IRM.calc(base);
near(q.F * 1e3, 18.4, 0.05, "FS default"); near(q.F / 0.7 * 100, 2.6, 0.05, "FS %"); near(q.B * 1e3, 2.47, 0.01, "BS default");
near(q.B / 0.7 * 100, 0.35, 0.01, "BS %"); near(q.F / q.B, 7.5, 0.05, "ratio"); near(q.fs[1].v * 1e3, 14.4, 0.05, "via stack share");
near(IRM.calc({ ...base, N: 16 }).F * 1e3, 23.2, 0.05, "16 layers"); assert.equal(IRM.calc({ ...base, N: 16 }).B, q.B, "BS independent of N");
near(IRM.calc({ ...base, l: 4 }).F * 1e3, 6.1, 0.05, "tap 4 um"); assert(IRM.calc({ ...base, l: 4 }).free > q.free, "denser taps use more tracks");
near(IRM.rail(10), 417, 1, "10 nm rail"); near(q.m0, 0.187, 0.001, "M0 share");
for (const J of [0.2, 3]) for (const l of [2, 12]) for (const N of [8, 16]) for (const Rv of [10, 100]) for (const w of [10, 40]) {
  const z = IRM.calc({ J, l, N, Rv, w }); assert(Number.isFinite(z.F) && Number.isFinite(z.B) && z.F > z.B, "ir finite and FS > BS");
}

/* ---- 본문에 인용한 수치 */
["약 180배 작다", "약 30 A/cm²", "약 0.16 A/cm²", "약 1.47 nm", "약 1.85 nm", "약 1.12 nm, 1.32 nm", "약 4배로", "약 580배", "약 1,600배에서 약 7배",
 "+0.12 V(uLVT)", "−0.25 V(LVT)", "4.65 → 4.89 eV", "약 0.56 V", "약 0.26 V(LVT)", "약 0.78 V",
 "25.5 → 18.0 → 14.7 → 12.7 nm", "평면 약 240, FinFET 약 86, GAA 약 59 mV/V", "약 18 nm로",
 "약 18 mV(V<sub>DD</sub>의 약 2.6%)", "약 2.5 mV(약 0.35%)", "약 7.5배", "약 23 mV", "약 6 mV", "약 420 Ω/µm", "약 13.3에서 18.5"].forEach(has);
console.log("advanced-sims: ok (eot, wf, lambda, ir)");
