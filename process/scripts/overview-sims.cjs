#!/usr/bin/env node
/* Copyright (c) 2026 geniuskey and ProcessBook contributors. SPDX-License-Identifier: MIT */
// 1장(overview)의 새 시뮬레이터 모델 블록(/* model:<id> */ … /* /model:<id> */)을 node:vm으로 돌려
// 교과서 기준값과 본문·해볼 것·퀴즈에 적은 숫자를 확인한다. 브라우저 없이 1초 안에 끝난다.
"use strict";
const fs = require("node:fs"), vm = require("node:vm"), assert = require("node:assert/strict"), path = require("node:path");
const html = fs.readFileSync(path.join(__dirname, "..", "chapters", "overview.html"), "utf8");
function model(id, name) {
  const a = html.indexOf(`/* model:${id} */`), b = html.indexOf(`/* /model:${id} */`);
  assert(a > 0 && b > a, `model block ${id} not found`);
  const ctx = {}; vm.createContext(ctx); vm.runInContext(html.slice(a, b), ctx, { filename: id });
  assert(ctx[name], `${id}: ${name} missing`);
  return ctx[name];
}
const near = (v, want, tol, msg) => assert(Math.abs(v - want) <= tol, `${msg}: ${v} (want ${want} ± ${tol})`);
const rel = (v, want, r, msg) => assert(Math.abs(v / want - 1) <= r, `${msg}: ${v} (want ${want} ±${r * 100}%)`);
const quoted = (s) => assert(html.includes(s), `prose no longer quotes: ${s}`);
let checks = 0;
const ok = () => checks++;

/* ---- sim-scale: 웨이퍼에서 원자까지 */
{
  const SC = model("sim-scale", "SC");
  near(SC.fov(0), 0.4, 1e-12, "max field"); rel(SC.fov(SC.ZMAX), 1e-9, 0.01, "min field ≈ 1 nm"); ok();
  rel(0.3 / 5.431e-10, 5.5e8, 0.01, "wafer / lattice ratio"); quoted("약 5.5×10⁸배"); ok();
  rel(SC.count(0.01), 2e10, 1e-9, "transistors in a 10 mm field"); quoted("약 2×10¹⁰개"); ok();
  rel(SC.count(7e-5), 1e6, 0.03, "transistors in a 70 µm field"); rel(SC.count(SC.fov(3.76)), 1e6, 0.04, "slider 3.76"); quoted("약 100만 개"); ok();
  near(1e6 / Math.sqrt(SC.RHO), 70.7, 0.1, "one transistor cell edge (nm)"); quoted("한 변 약 70 nm"); quoted("\\approx 71\\ \\text{nm}"); ok();
  near(6 / 0.5431, 11.05, 0.01, "unit cells in 6 nm"); near(6 / (0.5431 / 4), 44.2, 0.1, "atomic layers in 6 nm"); quoted("단위 격자로 11개, 원자층으로 약 44층"); ok();
  rel(SC.count(0.4), 1.4137e13, 1e-3, "whole wafer"); near(SC.fields(0.4), 0.442, 0.001, "fields at 400 mm"); ok();
  // 정사각형-원 겹침: 경계 사례와 수치 적분 비교
  near(SC.overlap(0.2), 0.04, 1e-12, "square inside disc"); near(SC.overlap(0.31), SC.AW, 1e-12, "disc inside square");
  { const s = 0.25, n = 1500; let hit = 0; for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) { const x = (i + 0.5) / n * s - s / 2, y = (j + 0.5) / n * s - s / 2; if (x * x + y * y <= 0.0225) hit++; } rel(SC.overlap(s), hit / (n * n) * s * s, 2e-3, "partial overlap"); }
  ok();
  near(100 / 48, 2.08, 0.01, "virus spans two gate pitches"); quoted("게이트 두세 줄"); ok();
  assert.equal(SC.nearest(7e-5).short, "머리카락"); assert.equal(SC.nearest(1e-9).short, "Si 격자"); assert.equal(SC.nearest(0.4).short, "웨이퍼"); ok();
}

/* ---- sim-pdep: 침강과 확산 */
{
  const PD = model("sim-pdep", "PD");
  // 교과서 기준(Hinds, Aerosol Technology, 20 °C·1 atm·단위 밀도): C_c(1 µm) ≈ 1.17, v_s(1 µm) ≈ 3.5×10⁻³ cm/s, D(0.1 µm) ≈ 6.8×10⁻⁶ cm²/s
  near(PD.cc(1e-6), 1.166, 0.005, "Cunningham 1 µm"); near(PD.cc(1e-7), 2.89, 0.03, "Cunningham 0.1 µm"); ok();
  rel(PD.vel(1e-6, 0.4).vs * 100, 3.5e-3, 0.03, "settling 1 µm (cm/s)"); rel(PD.vel(1e-7, 0.4).D * 1e4, 6.8e-6, 0.03, "D 0.1 µm (cm²/s)"); ok();
  // 정체점 흐름 상수: δ_c / (√(νR/U) Sc^{−1/3}) = √(π/2)/0.850 = 1.47
  { const r = PD.vel(2e-7, 0.4), Sc = 1.5e-5 / r.D; near(r.dl / (Math.sqrt(1.5e-5 * 0.15 / 0.4) * Math.pow(Sc, -1 / 3)), 1.4745, 0.001, "δ_c prefactor"); quoted("\\delta_c \\approx 1.47\\sqrt"); }
  ok();
  // 최소 침착 속도: Liu & Ahn(1987) 약 2–7×10⁻⁴ cm/s, 0.2 µm 부근
  const m4 = PD.minimum(0.4, false);
  near(m4[0], 0.184, 0.01, "minimum size at 0.4 m/s (µm)"); rel(m4[1] * 100, 4.8e-4, 0.02, "minimum v_d at 0.4 m/s");
  for (const U of [0.2, 0.3, 0.5, 0.6]) { const m = PD.minimum(U, false); assert(m[0] > 0.1 && m[0] < 0.3 && m[1] * 100 > 2e-4 && m[1] * 100 < 7e-4, `Liu–Ahn range at U=${U}: ${m}`); }
  quoted("약 0.18 µm, 침착 속도 약 4.8×10⁻⁴ cm/s"); quoted("약 4.8×10⁻⁴ cm/s"); quoted("약 2~7×10⁻⁴ cm/s"); ok();
  rel(0.4 / m4[1], 8.25e4, 0.03, "downflow / v_min"); quoted("약 8만분의 1"); ok();
  rel(PD.vel(1e-7, 0.4).v * 100, 6.4e-4, 0.01, "v_d 0.1 µm"); rel(PD.vel(1e-8, 0.4).v * 100, 1.0e-2, 0.01, "v_d 10 nm"); quoted("1.0×10⁻² cm/s로 빨라지고"); ok();
  { const r = PD.vel(1e-7, 0.4); near(r.vdf / r.v, 0.86, 0.006, "diffusion share at 0.1 µm"); }
  { const r = PD.vel(1e-6, 0.4); assert(r.vs > r.vdf, "settling dominates at 1 µm"); }
  ok();
  const c5 = PD.count(5, 0.1, 0.4, false, 3600);
  rel(c5, 170, 0.02, "ISO 5, ≥0.1 µm, 1 h"); quoted("100 nm 이상 입자가 약 170개"); ok();
  const c1 = PD.count(1, 0.1, 0.4, false, 3600);
  near(c1, 0.017, 0.0005, "ISO 1, ≥0.1 µm, 1 h"); near(1 / c1, 58, 2, "hours per particle in ISO 1"); quoted("0.017개, 곧 약 60시간에 한 개"); ok();
  rel(PD.count(5, 0.01, 0.4, false, 3600), 1.9e5, 0.02, "ISO 5, ≥10 nm, 1 h"); quoted("약 1.9×10⁵개"); ok();
  { const a = PD.vel(1e-7, 0.4, true), b = PD.vel(1e-7, 0.4, false); near(a.v / b.v, 430, 5, "charging boost at 0.1 µm"); near(a.v * 100, 0.27, 0.005, "charged v_d"); quoted("약 430배(0.27 cm/s)"); }
  ok();
  // 수치 적분 정확도: 구간 수를 늘려도 같은 값
  { const N = 5, Dk = 0.1; let s = 0; const n = 4000, l0 = Math.log(Dk), l1 = Math.log(5); for (let i = 0; i < n; i++) { const D = Math.exp(l0 + (i + 0.5) * (l1 - l0) / n); s += 2.08 * PD.Cn(N, D) * PD.vel(D * 1e-6, 0.4).v * (l1 - l0) / n; } rel(c5, s * PD.AW * 3600, 1e-4, "integral convergence"); }
  ok();
}

/* ---- sim-cpt: 세대별 트랜지스터당 원가 */
{
  const CP = model("sim-cpt", "CP");
  near(CP.dpw(100), 640.7, 0.5, "DPW formula, 100 mm²"); ok();
  const s = CP.series(0.5, 0.2, 0.1, 400, 8);
  near(s[1].rel, 0.46, 0.005, "first-generation factor"); near(s[0].Y, 0.670, 0.001, "yield 400 mm²"); near(s[1].Y, 0.819, 0.001, "yield 200 mm²");
  near(1 / s[8].rel, 108, 1, "g8"); assert.equal(CP.bottom(s), 8);
  quoted("단순 배율은 0.60이지만 첫 세대의 실제 배율은 0.46"); quoted("67 %에서 82 %로"); quoted("약 1/108"); ok();
  const t = CP.series(0.7, 0.5, 0.1, 400, 8);
  near(1.5 * 0.7, 1.05, 1e-12, "simple factor"); assert.equal(CP.bottom(t), 4); near(t[4].rel, 0.80, 0.005, "bottom value");
  assert(t[8].rel > t[4].rel, "rises after the bottom"); quoted("4세대에서 바닥(0세대의 약 0.80배)"); ok();
  const u = CP.series(0.5, 1, 0.1, 400, 8); assert.equal(CP.bottom(u), 8); assert(u[8].rel < u[7].rel); quoted("r* = 100 %"); ok();
  const v = CP.series(0.5, 0.2, 0.1, 100, 8); assert(v[1].rel > s[1].rel && v[1].rel < 0.6, "smaller die: closer to the simple factor"); ok();
  near(1 / 0.7 - 1, 0.43, 0.005, "break-even at a = 0.7"); quoted("약 43 %"); ok();
  // 수율·가장자리 효과가 사라지면(아주 작은 다이) 배율은 (1+r)a로 수렴
  { const w = CP.series(0.6, 0.3, 0.1, 0.5, 8); near(w[8].rel / w[7].rel, 0.78, 0.01, "asymptotic factor"); }
  ok();
}

/* ---- sim-cycle: 팹 사이클 타임 */
{
  const CY = model("sim-cycle", "CY");
  // Factory Physics 근사의 기준: m = 1이면 Kingman(VUT) 식 CT_q = ((c_a²+c_e²)/2)·u/(1−u)·t_e
  near(CY.hs(0.8, 1, 1, 1).q, 4, 1e-12, "Kingman limit"); near(CY.hs(0.5, 1, 1, 2).q, 2, 1e-12, "M/M/1 queue"); ok();
  const F = CY.fab(0.85, 1, 4, 80, 1);
  near(F.X, 2.17, 0.005, "anchor X"); near(F.total, 87, 0.5, "anchor total days"); near(F.perMask, 1.09, 0.005, "per mask");
  near(F.raw, 40, 1e-9, "raw days"); near(F.total - F.raw, 47, 0.5, "queue days"); assert.equal(F.steps, 960);
  quoted("X ≈ 2.17"); quoted("가공 40일에 대기 약 47일"); quoted("사이클 타임은 약 87일, 마스크 층당 약 1.09일"); ok();
  { const G = CY.fab(0.95, 1, 4, 80, 1); near(G.X, 5.5, 0.03, "u = 0.95"); near(G.total, 219, 0.5, "u = 0.95 days"); quoted("X ≈ 5.5, 사이클 타임이 약 219일"); }
  { const G = CY.fab(0.7, 1, 4, 80, 1); near(G.total, 55, 0.5, "u = 0.70 days"); quoted("약 55일"); }
  near(CY.hs(0.95, 1, 4, 1).q, 4.5, 0.03, "quiz CT_q/t_e"); ok();
  near(CY.hs(0.85, 1, 1, 1).X, 6.7, 0.05, "m = 1"); near(CY.hs(0.85, 1, 8, 1).X, 1.5, 0.01, "m = 8"); near(CY.hs(0.85, 1.5, 4, 1).X, 3.6, 0.04, "c = 1.5");
  quoted("X ≈ 6.7"); quoted("X ≈ 1.5"); quoted("X ≈ 3.6"); ok();
  near(5e4 / 30 * F.total, 1.45e5, 1e3, "Little's law WIP"); quoted("약 14만 장"); ok();
  const E = CY.fab(0.97, 2, 1, 100, 3); assert(Number.isFinite(E.total) && E.X > 130 && E.X < 131, "extreme settings stay finite"); ok();
}
console.log({ overviewSimChecks: checks });
