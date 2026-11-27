#!/usr/bin/env node
/* Copyright (c) 2026 geniuskey and ProcessBook contributors. SPDX-License-Identifier: MIT */
// 9장(확산과 열처리) 새 시뮬레이터의 모델 블록(/* model:<id> */ … /* /model:<id> */)을 node:vm으로 실행해
// 교과서 기준값과 본문·해볼 것·퀴즈가 인용하는 숫자를 확인한다. 브라우저 없이 1초 안에 끝난다.
"use strict";
const fs = require("node:fs"), vm = require("node:vm"), path = require("node:path"), assert = require("node:assert/strict");
const root = path.resolve(__dirname, "..");
const read = (f) => fs.readFileSync(path.join(root, f), "utf8");
const html = read("chapters/anneal.html"), common = read("js/common.js");
const VERBOSE = process.argv.includes("-v");

// 장 스크립트의 공용 상수·함수(kB, DIF, reflectedImplant)와 common.js의 PB.erf·PB.rng를 그대로 가져온다.
function grab(src, re, what) { const m = src.match(re); assert(m, `${what} not found`); return m[0]; }
const ctx = { Math, Float64Array, Int32Array, Float32Array, PB: {} };
vm.createContext(ctx);
vm.runInContext(grab(html, /var kB = [^;]+;/, "kB") + "\n" + grab(html, /var DIF = \{[^;]+\};/, "DIF") + "\n" +
  grab(html, /function reflectedImplant\([\s\S]*?\n  \}/, "reflectedImplant"), ctx);
vm.runInContext(grab(common, /PB\.erf = function[\s\S]*?\n  \};/, "PB.erf") + "\n" + grab(common, /PB\.rng = function[^\n]+/, "PB.rng"), ctx);
// 단면 엔진의 주입 거리표(XS.range)
const xs = { window: {} }; vm.createContext(xs); vm.runInContext(read("js/xsec.js"), xs); ctx.XS = xs.window.XS;

function model(id, name) {
  const a = html.indexOf(`/* model:${id} */`), b = html.indexOf(`/* /model:${id} */`);
  assert(a > 0 && b > a, `model block ${id} not found`);
  vm.runInContext(html.slice(a, b) + `\nthis.${name} = ${name};`, ctx);
  return ctx[name];
}
const near = (v, ref, tol, msg) => assert(Math.abs(v / ref - 1) <= tol, `${msg}: ${v} vs ${ref} (±${tol * 100}%)`);
const out = {};

/* ---------------- sim-walk */
{
  const RW = model("sim-walk", "RW");
  const anm = RW.a * 1e7;
  // 1차원: ⟨x²⟩ = n a², D = Γa²/2 (난수 걸음의 평균은 0, 분산은 n)
  const pos1000 = RW.walk(1000, 2000, ctx.PB.rng(9));
  const msd = RW.msd(pos1000) * anm * anm, theory = 1000 * anm * anm;
  near(msd, theory, 0.08, "walk ⟨x²⟩ within statistical noise (2000 atoms)");
  let mean = 0; for (const p of pos1000) mean += p; mean /= pos1000.length;
  assert(Math.abs(mean) < 3 * Math.sqrt(1000 / 2000), "walk mean ≈ 0");
  for (const p of pos1000) assert((p & 1) === 0, "parity after an even number of steps");
  // 시드를 다시 쓰면 같은 상태(되감기용)
  const again = RW.walk(1000, 2000, ctx.PB.rng(9)); assert(again.every((v, i) => v === pos1000[i]), "deterministic replay");
  // 큰 표본: 분산이 n에 정확히 수렴
  const big = RW.walk(400, 20000, ctx.PB.rng(3)); near(RW.msd(big), 400, 0.03, "walk variance → n (20000 walkers)");
  const G = RW.rate(3.5, 1000), D = RW.diff(3.5, 1000);
  near(D, G * RW.a * RW.a / 2, 1e-12, "D = Γa²/2");
  out.walk = {
    sigma250: 0.235 * Math.sqrt(250), sigma1000: 0.235 * Math.sqrt(1000), msd1000: msd, theory1000: theory,
    G1000: G, D1000: D, t1000_h: 1000 / G / 3600, t900_h: 1000 / RW.rate(3.5, 900) / 3600, ratio900: G / RW.rate(3.5, 900),
    fe_t: 1000 / RW.rate(0.7, 25), nu0a2: RW.nu0 * RW.a * RW.a / 2,
    gammaB: 2 * (0.76 * Math.exp(-3.46 / (8.617e-5 * 1273.15))) / (RW.a * RW.a), DB: 0.76 * Math.exp(-3.46 / (8.617e-5 * 1273.15)),
  };
  out.walk.nB10 = out.walk.gammaB * 10; out.walk.LB10 = Math.sqrt(2 * out.walk.DB * 10) * 1e7;
}

/* ---------------- sim-cdd */
{
  const CDD = model("sim-cdd", "CDD");
  const base = { Rp: 24e-7, dRp: 9e-7, NB: 1e17, h: true };
  // n_i(1000 °C) ≈ 7.1×10¹⁸ (Morin–Maita), D_i = D⁰ + D⁻
  near(CDD.ni(1000), 7.08e18, 0.01, "n_i(1000 °C)");
  const cf = CDD.coef(1000); near(cf.Di / cf.d0, 1.70, 0.01, "D_i/D⁰ at 1000 °C");
  // 1) 상수 D: 수치해 = 해석해(반사 가우시안) — 접합 깊이 1 % 이내, 도즈 보존
  {
    const o = { ...base, Q: 1e15, Tc: 1000, t: 1800, dfun: () => cf.Di };
    const r = CDD.run(o, 400e-7, 360, 260);
    let q = 0; for (let i = 0; i < r.N; i++) q += r.C[i] * r.dx * (i === 0 || i === r.N - 1 ? 0.5 : 1);
    near(q, 1e15, 2e-3, "dose conservation (zero-flux)");
    near(CDD.depthAt(r, 1e17), CDD.constDepth(o, 1e17), 0.01, "CN solver vs analytic Gaussian");
  }
  // 2) D ∝ C, 표면 농도 고정: 앞쪽 끝 x_f ≈ 1.6√(D_s t) (Fair; Plummer 표 7-?)
  {
    const Ds = 1e-14, t = 3600, o = { ...base, Q: 1, Tc: 1000, t, cs: 1e20, dfun: (c) => Ds * Math.max(c / 1e20, 1e-5) };
    const r = CDD.run(o, 6 * Math.sqrt(Ds * t), 600, 400);
    near(CDD.depthAt(r, 1e17) / Math.sqrt(Ds * t), 1.6, 0.04, "D∝C front 1.6√(D_s t)");
  }
  // 3) 격자 수렴: 화면 해상도(360×260) vs 4배 촘촘한 격자
  const fine = (o) => { const r0 = CDD.solve(o); return CDD.run(o, r0.xmax, 720, 520); };
  const stats = (o) => {
    const r = CDD.solve(o); let cm = 0; for (const c of r.C) cm = Math.max(cm, c);
    const e1 = CDD.depthAt(r, 1e19), e2 = CDD.depthAt(r, 1e18), i1 = CDD.constDepth(o, 1e19), i2 = CDD.constDepth(o, 1e18);
    return { r, xjC: CDD.depthAt(r, o.NB) * 1e7, xjI: CDD.constDepth(o, o.NB) * 1e7, edgeC: e1 && e2 ? (e2 - e1) * 1e7 : null, edgeI: i1 && i2 ? (i2 - i1) * 1e7 : null, ratio: CDD.deff(cm, r.cf, o.NB, o.h) / r.cf.Di, cmax: cm };
  };
  const def = { ...base, Q: 5e15, Tc: 1000, t: 1800 };
  const s = stats(def), rf = fine(def);
  near(s.xjC, CDD.depthAt(rf, 1e17) * 1e7, 0.01, "CDD x_j converged");
  near(s.edgeC, (CDD.depthAt(rf, 1e18) - CDD.depthAt(rf, 1e19)) * 1e7, 0.06, "CDD edge converged");
  const low = stats({ ...def, Q: 1e14 }), noH = stats({ ...def, h: false });
  out.cdd = { def: { xjC: s.xjC, xjI: s.xjI, edgeC: s.edgeC, edgeI: s.edgeI, ratio: s.ratio }, low: { xjC: low.xjC, xjI: low.xjI, ratio: low.ratio, peakOverNi: low.cmax / CDD.ni(1000) }, noH: { xjC: noH.xjC, ratio: noH.ratio }, ni1000: CDD.ni(1000), DiOverD0: cf.Di / cf.d0 };
  // 실행 시간(화면 한 번 계산)
  const t0 = process.hrtime.bigint(); for (const Q of [1e15, 1e16]) stats({ ...base, Q, Tc: 1150, t: 7200 });
  out.cdd.msPerSolve = Number(process.hrtime.bigint() - t0) / 1e6 / 2;
  // 극단값에서도 유한
  for (const [Q, Tc, t, h] of [[1e13, 900, 10, true], [1e16, 1150, 7200, true], [1e16, 900, 10, false], [1e13, 1150, 7200, false]]) {
    const z = stats({ ...base, Q, Tc, t, h }); assert(Number.isFinite(z.ratio) && z.cmax > 0, `CDD finite ${Q}/${Tc}/${t}/${h}`);
  }
}

/* ---------------- sim-sol */
{
  const SOL = model("sim-sol", "SOL");
  // 본문: 1000 °C에서 B ≈ 2×10²⁰, P ~10²¹, As ~2×10²¹, As 전기적 활성 약 2~3×10²⁰
  near(SOL.sol("B", 1000), 2e20, 0.01, "B solubility 1000 °C"); near(SOL.sol("P", 1000), 1e21, 0.05, "P solubility 1000 °C");
  near(SOL.sol("As", 1000), 2e21, 0.05, "As solubility 1000 °C"); near(SOL.asElec(1000), 2.5e20, 0.01, "As electrical limit 1000 °C");
  // '온도 이력' 실습의 활성화 지표(B)와 같은 식
  for (const T of [900, 1050, 1300]) near(SOL.sol("B", T), 2e20 * Math.exp(-0.75 / 8.617e-5 * (1 / (T + 273.15) - 1 / 1273.15)), 1e-12, "B law = sim-rta");
  // 2장: n형 2×10²⁰ cm⁻³, 30 nm 층 ≈ 140 Ω/□ (같은 이동도 식)
  near(1 / (1.602e-19 * 2e20 * SOL.mob(2e20, "n") * 30e-7), 140, 0.01, "Caughey–Thomas as in ch. 2");
  const r = (sp, E, Q, T, cl) => SOL.calc(sp, E, Q, T, cl, 1e17);
  const d = r("As", 20, 3e15, 1000, true), dEq = r("As", 20, 3e15, 1000, false), d1e16 = r("As", 20, 1e16, 1000, true);
  const b9 = r("B", 5, 3e15, 900, false), b13 = r("B", 5, 3e15, 1300, false);
  near(d.frac + d.inact / 3e15, 1, 1e-3, "active + inactive = dose");
  out.sol = {
    def: { peak: d.peak, frac: d.frac, Rs: d.Rs, RsAll: d.RsAll, inact: d.inact, ratio: d.Rs / d.RsAll }, eq: { frac: dEq.frac, Rs: dEq.Rs },
    as1e16: { Rs: d1e16.Rs, frac: d1e16.frac }, b900: { lim: b9.lim, Rs: b9.Rs }, b1300: { lim: b13.lim, Rs: b13.Rs },
    b3e15: r("B", 5, 3e15, 1000, false), b6e15: r("B", 5, 5e15, 1000, false),
  };
  for (const sp of ["B", "P", "As"]) for (const E of [2, 60]) for (const Q of [1e14, 1e16]) for (const T of [800, 1300]) for (const cl of [true, false]) {
    const z = r(sp, E, Q, T, cl); assert(Number.isFinite(z.Rs) && Number.isFinite(z.RsAll) && z.frac > 0 && z.frac <= 1 + 1e-9, `SOL finite ${sp}/${E}/${Q}/${T}`);
  }
}

/* ---------------- sim-heat */
{
  const HT = model("sim-heat", "HT");
  // erfc 정확도, ierfc(0) = 1/√π
  near(HT.erfc(1), 0.157299207, 1e-6, "erfc(1)"); near(HT.erfc(3), 2.209049699858544e-5, 1e-6, "erfc(3)");
  near(HT.ierfc(0), 1 / Math.sqrt(Math.PI), 1e-7, "ierfc(0)");
  // 반무한 극한(L ≪ d): 표면 상승 = (2E/k)√(α/(πτ))
  for (const [tau, E] of [[1e-7, 0.3], [1e-3, 10]]) near(HT.temp(0, tau, E, 0), 2 * E / HT.k * Math.sqrt(HT.alpha / (Math.PI * tau)), 1e-6, "semi-infinite surface rise");
  // 긴 펄스(L ≫ d): 웨이퍼 평균 상승 E/(ρc d)로 수렴(뒷면 단열)
  { const tau = 10, E = 50, avg = HT.avgRise(E); let s = 0; const n = 400; for (let i = 0; i < n; i++) s += HT.temp((i + 0.5) / n * HT.d, tau, E, 0); near(s / n, avg, 0.01, "slab energy balance"); }
  // 기준: L(1 s) ~ mm, L(1 ms) 100~300 µm, L(100 ns) ~ µm
  const L1 = HT.L(1) * 1e4, L2 = HT.L(1e-3) * 1e4, L3 = HT.L(1e-7) * 1e4;
  assert(L1 > 1000 && L2 > 100 && L2 < 300 && L3 > 1 && L3 < 5, "diffusion-length anchors");
  const P = { rta: [1, 90, 500], flash: [1e-3, 12, 750], laser: [1e-7, 0.35, 25] }, res = {};
  for (const [k, [tau, E, T0]] of Object.entries(P)) res[k] = { L_um: HT.L(tau) * 1e4, Ts: HT.temp(0, tau, E, T0), Tback: HT.temp(HT.d, tau, E, T0), z1000_um: HT.depthAbove(tau, E, T0, 1000) * 1e4, zm_nm: HT.depthAbove(tau, E, T0, 1414) * 1e7, avg: HT.avgRise(E), F: E / tau };
  res.flash01 = { Ts: HT.temp(0, 1e-4, 12, 750), riseRatio: (HT.temp(0, 1e-4, 12, 750) - 750) / (res.flash.Ts - 750) };
  out.heat = res;
  for (const tau of [1e-8, 10]) for (const E of [0.01, 1000]) for (const T0 of [25, 1000]) { const v = HT.temp(0, tau, E, T0); assert(Number.isFinite(v) && Number.isFinite(HT.depthAbove(tau, E, T0, 1414)), "heat finite"); }
}

/* ---------------- 본문이 인용하는 숫자 */
const txt = html.replace(/<script[\s\S]*?<\/script>/g, "");
const has = (s, why) => assert(txt.includes(s), `prose should quote "${s}" (${why})`);
const f = (v, d = 3) => Number(v.toPrecision(d)).toString();
const W = out.walk, C = out.cdd, S = out.sol, H = out.heat, r0 = (v) => Math.round(v);
// 무작위 걸음
assert(f(W.sigma250) === "3.72" && f(W.sigma1000) === "7.43"); has("3.72 nm에서 7.43 nm로 2배", "walk σ");
assert(f(W.msd1000) === "55.4" && f(W.theory1000) === "55.2"); has("측정 55.4 nm², 이론 55.2 nm²", "walk msd");
assert(r0(W.ratio900) === 15 && f(W.t1000_h, 2) === "2" && r0(W.t900_h) === 30); has("약 15배(2.0시간 → 30시간)", "walk 900 °C");
assert(r0(W.fe_t) === 68); has("약 68초", "walk Fe");
assert(f(W.nu0a2, 2) === "0.0028"); has("ν<sub>0</sub>a²/2 ≈ 2.8×10⁻³ cm²/s", "walk prefactor");
assert(r0(W.gammaB) === 55 && Math.abs(W.nB10 - 550) < 10 && f(W.LB10, 2) === "5.5"); has("1초에 약 55번", "B jump rate"); has("약 550번", "B jumps in 10 s"); has("√(2Dt) ≈ 5.5 nm", "B length");
// 농도 의존 확산
assert(C.ni1000.toPrecision(2) === "7.1e+18" && f(C.DiOverD0, 2) === "1.7"); has("1000 °C에서 7.1×10¹⁸", "n_i"); has("1.7배 크다", "D_i/D0");
assert(r0(C.def.xjC) === 326 && r0(C.def.xjI) === 160 && r0(C.def.edgeC) === 15 && r0(C.def.edgeI) === 23);
has("접합은 326 nm로 상수 D<sub>i</sub>일 때(160 nm)의 2배", "cdd x_j"); has("15 nm(상수 D<sub>i</sub>는 23 nm)", "cdd edge");
assert(C.def.ratio > 10 && C.def.ratio < 100); has("수십 배", "cdd D_eff/D_i");
assert(r0(C.low.peakOverNi) === 2 && r0(C.low.xjC) === 138 && r0(C.low.xjI) === 125); has("n<sub>i</sub>의 2배쯤에 그쳐 두 접합이 138 nm와 125 nm", "cdd low dose");
assert(r0(C.noH.xjC) === 267); has("326 nm에서 267 nm로", "cdd h off");
// 고체 용해도
assert(S.def.peak.toPrecision(2) === "1.8e+21" && r0(S.def.frac * 100) === 26 && r0(S.def.Rs) === 107 && r0(S.def.RsAll) === 30 && f(S.def.ratio, 2) === "3.6");
has("피크가 1.8×10²¹ cm⁻³라 활성 비율이 26 %", "sol default"); has("107 Ω/□로, 모두 활성일 때(30 Ω/□)의 3.6배", "sol Rs");
assert(S.eq.frac > 0.999); has("거의 전부가 활성", "sol equilibrium");
assert(S.b900.lim.toPrecision(2) === "1.1e+20" && S.b1300.lim.toPrecision(2) === "7.4e+20" && r0(S.b900.Rs) === 237 && r0(S.b1300.Rs) === 53);
has("1.1×10²⁰ → 7.4×10²⁰", "sol B limits"); has("237 → 53 Ω/□", "sol B Rs");
assert(r0(S.as1e16.Rs) === 95 && r0((1 - S.as1e16.Rs / S.def.Rs) * 100) === 12); has("107 → 95 Ω/□로 12 %", "sol dose x3.3");
// 표면 가열
assert(f(H.rta.L_um / 1000, 3) === "7.48" && r0(H.flash.L_um) === 237 && f(H.laser.L_um, 3) === "2.37"); has("7.48 mm → 237 µm → 2.37 µm", "heat L");
assert(r0(H.rta.Ts) === 1050 && r0(H.rta.Tback) === 1038 && H.rta.z1000_um >= 775); has("앞면 1050 °C, 뒷면 1038 °C", "heat RTA");
assert(r0(H.flash.Ts) === 1284 && r0(H.flash.z1000_um) === 90); has("표면이 1284 °C", "heat flash"); has("약 90 µm", "heat flash depth");
assert(f(H.flash01.riseRatio, 3) === "3.16" && H.flash01.Ts > 1414); has("√10배", "heat 0.1 ms");
assert(r0(H.laser.zm_nm) === 150 && f(H.laser.avg, 2) === "2.1"); has("약 150 nm", "heat melt"); has("2.1 °C", "heat avg");
if (VERBOSE) console.log(JSON.stringify(out, (k, v) => (typeof v === "number" ? Number(v.toPrecision(4)) : v), 1));
module.exports = { out, has, f };
if (require.main === module && !VERBOSE) console.log("anneal-sims: models ok");
