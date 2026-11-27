#!/usr/bin/env node
/* 13장 발열과 냉각(chapters/thermal.html) 시뮬레이터 회귀 검사.
   장의 스크립트에서 /* model:<이름> *\/ 블록을 잘라 node:vm에서 실행하고,
   본문·GX-1 노트·해볼 것·퀴즈가 인용한 수치와 슬라이더 극단값에서의 유한성(NaN·음수·무한 없음)을 확인한다. */
"use strict";
const fs = require("fs"), vm = require("vm"), path = require("path"), assert = require("assert");
const t0 = Date.now();
const html = fs.readFileSync(path.join(__dirname, "..", "chapters", "thermal.html"), "utf8");
const NAMES = ["base", "chain", "spread", "heatmap", "transient", "throttle", "runaway", "cooling", "rack"];
const src = NAMES.map((n) => {
  const a = "/* model:" + n + " */", b = "/* /model:" + n + " */", i = html.indexOf(a), j = html.indexOf(b);
  assert(i >= 0 && j > i, "model block " + n);
  return html.slice(i + a.length, j);
}).join("\n");
const ctx = { Math, Object, Array, Float64Array, Uint8Array, JSON, Number, isFinite, Infinity, NaN };
vm.createContext(ctx);
vm.runInContext(src + "\nthis.M = { GX, CHAIN0, TIM1, chainModel, spreadLee, spreadBestT, HM, hmSolve, TR, trStep, trPulse, TH, thSteady, thSustained, thSim, rwG, rwSolve, rwCritR, COOL, coolAllow, rackModel };", ctx);
const M = ctx.M;
let n = 0;
const ok = (c, m) => { assert(c, m); n++; };
const near = (x, y, tol, m) => ok(Math.abs(x - y) <= tol, m + ": got " + x + ", want " + y + " ± " + tol);
const fin = (x, m) => ok(typeof x === "number" && isFinite(x), m + " finite: " + x);
const pos = (x, m) => ok(typeof x === "number" && isFinite(x) && x >= 0, m + " >= 0: " + x);
const C = (o) => M.chainModel(Object.assign({}, M.CHAIN0, o));
const has = (s) => ok(html.includes(s), "text cites: " + s);

/* 1. 1D 열저항 사슬 */
{
  const c = C({});
  near(c.Rint, 0.0195, 0.0002, "R_int"); near(c.Rext, 0.0249, 0.0002, "R_ext");
  near(c.Reff, 0.0493, 0.0005, "R_eff ≈ 0.05 (GX-1 표)"); near(c.Tavg, 77.5, 0.15, "T_avg"); near(c.rise, 6.5, 0.1, "coolant rise");
  near(c.flux, 97.4, 0.2, "97 W/cm²");
  const dT = Object.fromEntries(c.L.map((l) => [l.key, l]));
  near(dT.die.R, 0.0080, 0.0001, "die R"); near(dT.tim1.R, 0.0058, 0.0001, "TIM1 R"); near(dT.lid.R, 0.0057, 0.0001, "lid R");
  near(dT.tim2.R, 0.0049, 0.0001, "TIM2 R"); near(dT.plate.R, 0.0045, 0.0001, "plate R"); near(dT.conv.R, 0.0119, 0.0001, "conv R"); near(dT.cal.R, 0.0036, 0.0001, "cal R");
  ok(c.L.every((l) => l.R <= dT.conv.R), "convection is the largest term");
  near(760 * c.Rint, 14.9, 0.1, "14.9 K"); near(910 * c.Rext, 22.7, 0.1, "22.7 K");
  const g = C({ tim1: "grease" }); near(g.Reff, 0.060, 0.0006, "grease R_eff"); near(g.Tavg, 85.8, 0.15, "grease T");
  near(C({ flow: 0.5 }).Tavg, 101.3, 0.2, "0.5 L/min T"); near(C({ flow: 0.5 }).Reff, 0.081, 0.001, "0.5 L/min R_eff");
  near(c.Tavg - C({ dieT: 0.3 }).Tavg, 3.7, 0.1, "die thinning 0.3 mm");
  for (const P of [100, 1200]) for (const dieT of [0.1, 1]) for (const tim1 of ["grease", "indium", "lm"]) for (const lidT of [0, 5]) for (const h0 of [5000, 150000]) for (const flow of [0.3, 6]) {
    const x = C({ P, dieT, tim1, lidT, h0, flow });
    ok(x.L.every((l) => isFinite(l.R) && l.R >= 0 && isFinite(l.dT)), "chain layers finite"); ok(x.Tavg > 40 && isFinite(x.Reff) && x.Reff > 0, "chain extreme");
  }
  has("약 77.5 → 85.8 °C"); has("약 0.049 K/W"); has("약 6.5 K");
}

/* 2. 퍼짐 저항 */
{
  const sp = { a: 5e-3, b: 0.02, t: 3e-3, k: 390, h: 20000 }, S = (o) => M.spreadLee(Object.assign({}, sp, o));
  near(S({}).R, 0.169, 0.002, "a 5 mm"); near(S({ a: 2e-3 }).R, 0.392, 0.003, "a 2 mm"); near(S({ a: 10e-3 }).R, 0.082, 0.001, "a 10 mm");
  near(S({ k: 120 }).R, 0.395, 0.003, "silicon"); near(S({ k: 120 }).R / S({}).R, 2.3, 0.05, "Si/Cu ratio");
  near(M.spreadBestT(sp).t * 1e3, 6.6, 0.15, "best t at h 20k"); near(M.spreadBestT(Object.assign({}, sp, { h: 65000 })).t * 1e3, 4.6, 0.15, "best t at h 65k");
  ok(S({}).Rmax > S({}).R && S({}).R1d > S({}).R, "max > avg, 1D(no spread) > spread");
  for (const a of [1e-3, 15e-3]) for (const t of [0.2e-3, 12e-3]) for (const k of [120, 390, 1500]) for (const h of [2000, 150000]) {
    const r = S({ a, t, k, h }); ok([r.R, r.Rmax, r.Rsp, r.R1d].every((v) => isFinite(v) && v > 0), "spread extreme"); pos(M.spreadBestT({ a, b: 0.02, k, h }).t, "best t");
  }
}

/* 3. 2D 열 지도 */
{
  const H = (o) => M.hmSolve(Object.assign({ wl: "gemm", lid: "cu", Tf: 40 }, o));
  const g = H({});
  ok(g.iters < 6000, "SOR converged (" + g.iters + ")"); near(g.P, 760, 1e-9, "GEMM 760 W");
  near(g.Tmax, 81.7, 0.15, "hotspot"); near(g.Tavg, 77.5, 0.15, "die average = 1D chain"); near(g.Tavg, C({}).Tavg, 0.1, "2D avg matches chain");
  near(g.Tmax - g.Tavg, 4.2, 0.15, "hotspot excess"); near(g.Thbm, 69.3, 0.3, "HBM 69 °C");
  near(g.dens.tensor, 222, 1, "tensor 222 W/cm²"); near(g.dens.sm, 74, 1, "SM 74"); near(g.dens.l2, 86, 1, "L2 86"); near(g.dens.phy, 69, 1, "PHY 69"); near(g.dens.io, 46, 1, "IO 46");
  near(g.dens.tensor / g.qavg, 2.3, 0.05, "2.3×"); ok(g.fl[g.imax] === 1 || g.fl[g.imax] === 2, "GEMM hotspot in SM array");
  near(M.TR.Rhs, (g.Tmax - g.Tavg) / 760, 0.0003, "R_hs from heat map");
  near(H({ lid: "vc" }).Tmax - H({ lid: "vc" }).Tavg, 3.2, 0.15, "vapor chamber excess"); near(H({ lid: "thin" }).Tmax - H({ lid: "thin" }).Tavg, 4.9, 0.15, "thin lid excess");
  const m = H({ wl: "mem" }); near(m.P, 500, 1e-9, "mem 500 W"); near(m.Tmax - m.Tavg, 9.1, 0.2, "mem excess"); ok(m.fl[m.imax] === 4, "mem hotspot on PHY"); near(m.dens.phy, 153, 1, "PHY 153"); near(m.Thbm, 68.2, 0.3, "mem HBM");
  const h55 = H({ Tf: 55 }); near(h55.Tmax, 96.7, 0.2, "55 °C hotspot"); near(h55.Thbm, 84.3, 0.3, "55 °C HBM");
  for (const wl of ["gemm", "fp32", "mem"]) for (const lid of ["thin", "cu", "vc"]) for (const Tf of [20, 60]) {
    const r = H({ wl, lid, Tf }); ok(r.iters < 6000 && isFinite(r.Tmax) && r.Tmax >= r.Tavg && r.Tavg > Tf && r.hbm.every((x) => isFinite(x.T) && x.T > Tf), "heat map extreme " + wl + lid + Tf);
  }
  has("약 81.7 °C"); has("약 84 °C"); has("약 222 W/cm²");
}

/* 4. 과도 응답 */
{
  const s = M.trStep({ Tf: 40, Plo: 100, Phi: 760 });
  near(s.T0, 45.5, 0.1, "step T0"); near(s.T10ms, 54.9, 0.15, "10 ms"); near(s.T1s, 69.1, 0.2, "1 s"); near(s.Tfin, 81.7, 0.1, "final"); near(s.t63, 0.9, 0.06, "t63");
  near((s.T10ms - s.T0) / (s.Tfin - s.T0), 0.26, 0.03, "quarter at 10 ms");
  const P = (period) => M.trPulse({ Tf: 40, Plo: 200, Phi: 760, period, duty: 0.7 });
  near(P(0.01).ripple, 3.3, 0.15, "ripple 10 ms"); near(P(1).ripple, 15.6, 0.3, "ripple 1 s"); near(P(10).ripple, 25.8, 0.4, "ripple 10 s"); near(P(1).Tavg, 72.4, 0.1, "avg-power T");
  ok(P(0.01).Tpk < P(1).Tpk && P(1).Tpk < P(10).Tpk, "peak grows with period");
  for (const Phi of [200, 1200]) for (const Plo of [0, 600]) for (const period of [0.01, 100]) for (const duty of [0.1, 0.9]) {
    const lo = Math.min(Plo, Phi), p = M.trPulse({ Tf: 40, Plo: lo, Phi, period, duty }), q = M.trStep({ Tf: 40, Plo: lo, Phi });
    ok(isFinite(p.Tpk) && isFinite(p.Tmin) && p.ripple >= -1e-9 && p.Tmin >= 40 - 1e-9 && p.data.length > 0, "pulse extreme"); ok(q.data.every((d) => isFinite(d[1])) && q.Tfin >= q.T0, "step extreme");
  }
}

/* 5. 스로틀 루프 */
{
  const o = (Tf, flow, x) => Object.assign({ Tf, flow, act: 1, fb: true }, x || {});
  const b = M.thSteady(o(40, 2), 1.6); near(b.Thot, 80.4, 0.15, "base T_hot"); near(b.P, 734, 1.5, "base P");
  ok(M.thSustained(o(40, 2)) === 1.6, "40 °C keeps boost");
  const s50 = M.thSteady(o(50, 2), 1.6); near(s50.Thot, 92.2, 0.15, "50 °C T_hot"); near(s50.P, 770, 1.5, "50 °C P"); ok(M.thSustained(o(50, 2)) === 1.6, "50 °C keeps boost");
  near(M.thSustained(o(55, 2)), 1.542, 0.004, "55 °C clock"); near(M.thSustained(o(60, 2)), 1.426, 0.004, "60 °C clock"); near(M.thSustained(o(40, 0.5)), 1.421, 0.004, "0.5 L/min clock");
  near(M.thSustained(o(40, 0.5, { fb: false })) - M.thSustained(o(40, 0.5)), 0.024, 0.006, "feedback share");
  near(M.thSteady(o(55, 2), 1.6).Thot, 98.3, 0.2, "55 °C at boost would be ~98 °C");
  const sim = M.thSim(Object.assign({ tEnd: 40 }, o(55, 2)));
  near(sim.tFirst, 5.5, 0.15, "first throttle"); near(sim.fEnd, M.thSustained(o(55, 2)), 0.012, "sim settles at sustained"); ok(sim.Tpk < 95.6, "overshoot small");
  near(M.thSim(Object.assign({ tEnd: 40 }, o(40, 2))).TEnd, 80.4, 0.15, "sim base T");
  near((M.thSustained(o(55, 2)) - M.thSustained(o(60, 2))) / 5 / 1.6 * 0.76, 0.011, 0.002, "~1 % per 0.8 K in throttle region");
  for (const Tf of [20, 65]) for (const flow of [0.3, 6]) for (const act of [0.5, 1.1]) for (const fb of [true, false]) {
    const x = o(Tf, flow, { act, fb }), r = M.thSim(Object.assign({ tEnd: 40 }, x)), f = M.thSustained(x);
    ok(r.T.every(isFinite) && r.P.every((p) => isFinite(p) && p > 0) && r.f.every((v) => v >= 0.8 - 1e-9 && v <= 1.6 + 1e-9), "throttle sim extreme");
    ok(f >= 0.8 && f <= 1.6 && Math.max.apply(null, r.T) < 140, "throttle extreme bounded " + Tf + "/" + flow + "/" + act);
  }
  has("1.54 GHz"); has("1.43 GHz"); has("1.42 GHz"); has("734 W");
}

/* 6. 열 폭주 */
{
  const o = { R: 0.05, Tf: 40, Pdyn: 640, Pl: 120, Td: 25 }, r = M.rwSolve(o);
  near(r.stable, 76.8, 0.15, "stable"); near(r.unstable, 193.5, 0.5, "unstable"); near(r.gain, 0.132, 0.003, "loop gain");
  near(M.rwCritR(o), 0.085, 0.001, "critical R"); near(M.rwCritR(Object.assign({}, o, { Pl: 300 })), 0.0565, 0.001, "critical R at 300 W leakage");
  ok(M.rwSolve(Object.assign({}, o, { R: 0.1 })).runaway, "R 0.1 runs away");
  for (const R of [0.02, 0.2]) for (const Tf of [20, 70]) for (const Pdyn of [100, 800]) for (const Pl of [20, 400]) for (const Td of [10, 40]) {
    const x = { R, Tf, Pdyn, Pl, Td }, y = M.rwSolve(x), c = M.rwCritR(x);
    ok(y.runaway || (isFinite(y.stable) && y.stable > Tf && y.gain > 0 && y.gain < 1 + 1e-6), "runaway extreme"); ok(isFinite(c) && c > 0, "crit finite");
    ok(y.cob.length > 0 && y.cob.every((p) => isFinite(p[0]) && isFinite(p[1])), "cobweb finite");
  }
}

/* 7. 냉각 방식 */
{
  const A = (tim1, Tlim) => M.COOL.map((m) => M.coolAllow(m, { tim1, Tlim }));
  const d = A("indium", 95);
  near(d[0].P, 700, 15, "air ~700 W"); near(d[1].P, 1320, 10, "cold plate"); near(d[2].P, 1860, 10, "two-phase plate"); near(d[3].P, 990, 5, "immersion"); ok(d[3].by === "chf", "immersion CHF-limited");
  near(d[1].Thot(1000), 81.7, 0.1, "1,000 W cold plate T_hot = transient final"); near(d[1].Thot(1000), M.trStep({ Tf: 40, Plo: 0, Phi: 760 }).Tfin, 0.05, "cooling ↔ transient consistent");
  ok(M.COOL[1].Rext === M.chainModel(M.CHAIN0).Rext || Math.abs(M.COOL[1].Rext - M.chainModel(M.CHAIN0).Rext) < 2e-4, "cold plate R_ext = chain");
  const g = A("grease", 95); ok(g.every((x, i) => x.P <= d[i].P + 1e-9), "grease lowers all");
  for (const tim1 of ["grease", "indium", "lm"]) for (const Tlim of [80, 105]) A(tim1, Tlim).forEach((x) => { pos(x.P, "allow P"); fin(x.Thot(2000), "T at 2 kW"); });
  has("약 1,320 W"); has("약 700 W");
}

/* 8. 랙 */
{
  const R = (o) => M.rackModel(Object.assign({ n: 32, Pgpu: 1000, liq: 0.85, dT: 10, Ts: 40 }, o));
  const r = R({});
  near(r.IT, 50000, 1e-6, "GX-Rack 50 kW"); near(r.Lpm, 61, 0.5, "61 L/min"); near(r.pue, 1.14, 0.005, "PUE"); near(r.gpus100, 56115, 300, "GPUs per 100 MW"); near(r.cfm, 883, 10, "air CFM"); near(r.perGpuLpm, 1.31, 0.02, "per GPU flow");
  near(R({ liq: 0 }).pue, 1.37, 0.005, "all-air PUE"); near(R({ liq: 0 }).gpus100, 46715, 300, "all-air GPUs"); near(R({ Ts: 15 }).pue, 1.31, 0.005, "15 °C supply PUE");
  near(R({}).gpus100 / R({ Ts: 15 }).gpus100, 1.15, 0.01, "~15 % more GPUs at 40 °C");
  near(910 / (4.18e6 * 2 / 60000), 6.5, 0.05, "2 L/min → 6.5 K");
  for (const n of [8, 144]) for (const Pgpu of [300, 2000]) for (const liq of [0, 0.95]) for (const dT of [4, 20]) for (const Ts of [10, 45]) {
    const x = R({ n, Pgpu, liq, dT, Ts }); ok([x.IT, x.Lpm, x.cfm, x.pue, x.gpus100].every((v) => isFinite(v) && v >= 0) && x.pue >= 1, "rack extreme");
  }
  has("약 61 L/min"); has("약 1.14");
}

const ms = Date.now() - t0;
assert(ms < 1000, "regression took " + ms + " ms");
console.log(n + " checks, " + ms + " ms");
console.log("gpu thermal sims ok");
