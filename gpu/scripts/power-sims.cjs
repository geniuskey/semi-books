#!/usr/bin/env node
/* 12장 전력 공급과 DVFS(chapters/power.html) 시뮬레이터 모델 회귀 검사.
   장 스크립트에서 /* model:<이름> *\/ 블록을 잘라 node:vm에서 실행하고, 본문·GX-1 노트·해볼 것·퀴즈가 인용한 수치와
   슬라이더 끝값에서의 유한성(NaN·무한·음수 없음)을 확인한다. 외부 패키지 없이 1초 안에 끝난다. */
"use strict";
const fs = require("fs"), vm = require("vm"), path = require("path"), assert = require("assert");
const html = fs.readFileSync(path.join(__dirname, "..", "chapters", "power.html"), "utf8");
const block = (name) => {
  const a = `/* model:${name} */`, b = `/* /model:${name} */`, i = html.indexOf(a), j = html.indexOf(b, i);
  assert(i >= 0 && j > i, "model block " + name); return html.slice(i, j + b.length);
};
const names = ["power", "pi", "pdn", "droop", "ir", "path", "gate"];
// 모델 블록은 DOM·GP를 쓰지 않는 순수 함수다. 함수 하나로 감싸 node:vm으로 컴파일한다(전역을 건드리지 않고, 맥락 객체 조회가 없어 빠르다).
const M = vm.runInThisContext("(function () {\n\"use strict\";\n" + names.map(block).join("\n") +
  "\nreturn { GX, pDyn, pLeak, fOfV, fRaw, vOfF, pDie, pModule, opPoint, piRun, pdnParams, pdnZ, pdnSweep, zTarget, droopRun, irSolve, pathCalc, bestPhases, gateEval, gateBest, gateSweep };\n})", { filename: "power.html#models" })();
let n = 0;
const ok = (c, m) => { assert(c, m); n++; };
const near = (x, y, tol, m) => ok(Math.abs(x - y) <= tol, `${m}: ${x} vs ${y} ± ${tol}`);
const fin = (x, m) => ok(typeof x === "number" && isFinite(x), m + " finite: " + x);
const t0 = Date.now();

/* 1. 동적·누설 전력: GX-1 표 760 W = 640 + 120 */
near(M.pDyn(0.2, 3.556e-6, 0.75, 1.6), 640, 0.5, "P_dyn GX-1");
near(M.pLeak(0.75, 85), 120, 1e-9, "P_leak 85C");
near(M.pLeak(0.75, 25), 22.7, 0.1, "P_leak 25C");
near(M.pLeak(0.75, 105), 209, 0.5, "P_leak 105C");
near(M.pLeak(0.75, 110), 240, 1e-6, "quiz 2: 240 W");
near(M.pLeak(0.85, 85), 184, 0.5, "P_leak 0.85 V");
near(M.pDie(0.2, 0.75, 85) / 0.75, 1013, 1, "core current");
near(M.pModule(0.2, 0.75, 85), 1000, 0.5, "module 1000 W");
near(640 / (0.2 * 0.75 ** 2 * 1.6e9) * 1e6, 3.56, 0.01, "C inverse");
near(M.pDyn(0.2, M.GX.C, 0.85, M.fOfV(0.85)), 925, 1, "0.85 V dynamic");
near(M.pDie(0.2, 0.85, 85), 1110, 2, "0.85 V die");
for (const a of [0.05, 0.4]) for (const V of [0.55, 0.9]) for (const f of [0.4, 2]) for (const T of [25, 110]) {
  const P = M.pDyn(a, 6e-6, V, f) + M.pLeak(V, T); fin(P, "pw extremes"); ok(P > 0, "pw positive");
}

/* 2. V–f 곡선과 동작점 */
near(M.fOfV(0.65), 1.2, 0.002, "f(0.65)"); near(M.fOfV(0.75), 1.6, 1e-9, "f(0.75)");
near(M.GX.VCAP, 0.80, 0.005, "f_max reached ~0.80 V"); near(M.GX.FK, 4.74, 0.01, "K");
const op = (a, T, cap, top) => M.opPoint(a, T, cap, top);
let r = op(0.2, 85, 1000); near(r.V, 0.75, 0.001, "GEMM V"); near(r.f, 1.6, 0.002, "GEMM f"); near(r.tflops, 944, 1, "GEMM TFLOPS"); ok(r.limited === "power", "GEMM power-limited");
r = op(0.08, 85, 1000); near(r.f, 1.8, 1e-9, "decode f"); near(r.Pm, 690, 5, "decode power"); ok(r.limited === "fmax", "decode fmax");
r = op(0.3, 85, 1000); near(r.V, 0.685, 0.004, "virus V"); near(r.f, 1.34, 0.005, "virus f");
r = op(0.28, 85, 1000); near(r.V, 0.695, 0.003, "a 0.28 V"); near(r.f, 1.38, 0.005, "a 0.28 f"); near(r.tflops, 816, 2, "a 0.28 TF");
r = op(0.2, 45, 1000); near(r.f, 1.69, 0.005, "45C f"); near(r.V, 0.77, 0.005, "45C V"); near(r.Pl, 44, 1, "45C leak"); near(r.tflops, 995, 2, "45C TF");
r = op(0.2, 105, 1000); near(r.f, 1.51, 0.005, "105C f"); near(r.Pl, 190, 1, "105C leak"); near(r.tflops, 893, 2, "105C TF");
r = op(0.2, 85, 700); near(r.f, 1.28, 0.005, "700 W f"); near(r.V, 0.67, 0.002, "700 W V"); near(r.tflops, 755, 2, "700 W TF");
r = op(0.2, 85, 1000, 0.65); near(r.f, 1.2, 0.002, "base f"); near(r.Pm, 640, 2, "base module"); near(r.tflops / r.Pm, 1.11, 0.005, "base eff"); near(r.tflops, 707, 1, "base TF");
near(943.7 / 1000, 0.94, 0.005, "module eff"); near(943.7 / 760, 1.24, 0.005, "die eff");
// 퀴즈 1: 0.70 V
near(640 * (0.7 / 0.75) ** 2, 557, 1, "quiz 1 V^2 only");
near(M.fOfV(0.70), 1.40, 0.01, "quiz 1 f(0.70)"); near(M.pDyn(0.2, M.GX.C, 0.7, M.fOfV(0.7)), 489, 3, "quiz 1 with f");
// GX-1 노트(강하): V–f 기울기
const slope = (M.fOfV(0.751) - M.fOfV(0.749)) / 0.002; near(slope, 3.87, 0.03, "df/dV"); near(slope * 0.04 * 1000, 155, 2, "155 MHz");
for (const a of [0.05, 0.35]) for (const T of [45, 105]) for (const cap of [400, 1200]) for (const top of [null, 0.65]) {
  const q = op(a, T, cap, top); for (const k of ["V", "f", "Pm", "tflops"]) { fin(q[k], "vf " + k); ok(q[k] > 0, "vf positive " + k); }
}

/* 3. PI 루프 */
const pi = (o) => M.piRun(Object.assign({ Kp: 0.2, Ki: 0.6, Ts: 1, tauS: 1, aHi: 0.2 }, o));
r = pi({}); near(r.settle, 3, 0.2, "PI settle"); near(r.fAvg, 1600, 3, "PI f"); near(r.Pmax, 1240, 2, "PI peak");
r = pi({ Ki: 0.15 }); near(r.settle, 13, 0.5, "PI slow settle");
r = pi({ Ts: 5 }); ok(r.settle >= 49.9, "Ts 5 oscillates"); near(r.fAvg, 1393, 5, "Ts 5 avg f");
{ const hv = r.out.filter((q) => q[0] > 30 && q[0] < 70).map((q) => q[1]); near(Math.min(...hv), 501, 3, "cycle low"); near(Math.max(...hv), 1240, 2, "cycle high"); }
r = pi({ fast: true }); near(r.Pmax, 1048, 4, "fast protection peak");
for (const o of [{ Kp: 0, Ki: 0 }, { Kp: 1, Ki: 3, Ts: 0.5, tauS: 0.2 }, { Kp: 1, Ki: 3, Ts: 10, tauS: 5, aHi: 0.3 }, { aHi: 0.12, fast: true }]) {
  const q = pi(o); ok(q.out.every((x) => isFinite(x[1]) && x[1] > 0 && x[2] > 0), "PI finite " + JSON.stringify(o));
}

/* 4. PDN 임피던스 */
near(M.zTarget(0.75, 5, 300) * 1e6, 125, 1e-6, "Zt 125"); near(M.zTarget(0.75, 5, 500) * 1e6, 75, 1e-6, "quiz 4 Zt 75");
const pk = (o) => M.pdnSweep(M.pdnParams(o), 1e3, 1e9, 360).peak;
let p = pk({}); near(p.z * 1e6, 195, 4, "default peak"); near(p.f / 1e6, 200, 15, "default peak f");
p = pk({ Cdie: 10 }); near(p.z * 1e6, 121, 3, "Cdie 10 peak"); ok(p.z < 125e-6, "Cdie 10 meets target");
p = pk({ Cdtc: 0 }); near(p.z * 1e3, 2.08, 0.1, "no DTC peak"); near(p.f / 1e6, 55, 4, "no DTC f");
p = pk({ eslPkg: 10 }); near(p.z * 1e6, 284, 6, "ESL 10 peak"); near(p.f / 1e6, 5.8, 0.4, "ESL 10 f");
{ const s = M.pdnSweep(M.pdnParams({}), 1e3, 1e9, 360); ok(s.data.filter((q) => q[0] < 2e6).every((q) => q[1] < 125e-6), "below Zt up to 2 MHz"); near(s.data[0][1] * 1e6, 23, 0.5, "DC 23 uOhm"); }
for (const Cdie of [1, 30]) for (const Cdtc of [0, 400]) for (const Cpkg of [0, 2000]) for (const eslPkg of [0.2, 10]) for (const esrDie of [5, 100]) {
  const s = M.pdnSweep(M.pdnParams({ Cdie, Cdtc, Cpkg, eslPkg, esrDie }), 1e3, 1e9, 60); ok(s.data.every((q) => isFinite(q[1]) && q[1] > 0), "Z finite");
}

/* 5. 부하 급변 */
const dr = (o, q) => M.droopRun(M.pdnParams(o), Object.assign({ I0: 500, dI: 300, tr: 2e-9, tEnd: 4e-6, dt: 2e-10, pts: 800 }, q));
r = dr({}); near(r.droop * 1e3, 39.8, 0.6, "default droop"); near(r.tmin * 1e9, 2.6, 0.5, "first droop time"); near(r.static * 1e3, 6.9, 0.01, "static IR");
near(dr({ Cdie: 10 }).droop * 1e3, 33.2, 0.6, "Cdie 10 droop");
near(dr({}, { tr: 10e-9 }).droop * 1e3, 32.3, 0.6, "tr 10 ns");
{ const q = dr({}, { tr: 200e-9 }); near(q.droop * 1e3, 29.3, 0.6, "tr 200 ns"); ok(q.tmin > 100e-9, "tr 200: later droop dominates"); }
near(dr({ Cdtc: 0 }).droop * 1e3, 154, 2, "no DTC droop");
near(dr({}, { dI: 500 }).droop * 1e3, 66.4, 1, "dI 500 droop");
for (const o of [{ Cdie: 1, Cdtc: 0 }, { Cdie: 30, Cdtc: 400 }]) for (const q of [{ I0: 100, dI: 600, tr: 0.5e-9 }, { I0: 700, dI: 50, tr: 200e-9 }]) {
  const w = dr(o, Object.assign({ tEnd: 1e-6 }, q)); ok(w.wave.every((x) => isFinite(x[1])) && isFinite(w.droop) && w.droop >= 0, "droop finite");
}
{ const w = M.droopRun(M.pdnParams({}), { I0: 500, dI: 300, tr: 2e-9, tEnd: 350e-9, dt: 1e-10, pts: 900 }); near(w.droop * 1e3, 39.8, 1.2, "short window agrees"); }

/* 6. IR 드롭 격자 */
const ir = (o) => M.irSolve(Object.assign({ pitch: 2, Rs: 10, hot: 3, I: 1000, omega: 1.5 }, o));
r = ir({}); near(r.max * 1e3, 31.5, 0.5, "IR default"); near(r.avg * 1e3, 11.0, 0.3, "IR avg"); ok(r.at[0] === 20 && r.at[1] === 16, "IR max at hotspot"); near(r.it, 44, 3, "SOR 1.5 iters"); ok(r.conv, "IR converged");
near(ir({ pitch: 4 }).max * 1e3, 124.8, 1, "pitch 4"); near(ir({ pitch: 1 }).max * 1e3, 7.2, 0.3, "pitch 1");
near(ir({ mode: "back" }).max * 1e3, 15.9, 0.4, "backside"); ok(ir({ mode: "edge", pitch: 1 }).max > 0.75, "edge-only exceeds VDD");
near(ir({ Rs: 20 }).max * 1e3, 49.5, 0.6, "Rs 20");
near(ir({ omega: 1 }).it, 121, 5, "GS iters"); near(ir({ omega: 1.95 }).it, 274, 12, "SOR 1.95 iters");
ok(Math.abs(ir({ omega: 1 }).max - r.max) < 1e-5, "omega does not change the answer");
// 강하는 전류에 선형이고 핫스팟 배율은 분포만 바꾸므로, 끝값 검사는 방식 × 간격 × 면저항 끝값에 최대 전류·배율로 한다
for (const mode of ["area", "back", "edge"]) for (const pitch of [1, 8]) for (const Rs of [2, 50]) {
  const q = ir({ mode, pitch, Rs, hot: 4, I: 1200, omega: 1.5 }); ok(isFinite(q.max) && q.max > 0 && q.conv && q.d.every((x) => x >= -1e-9), "IR finite");
}

/* 7. 전류 경로 */
r = M.pathCalc({ arr: "lateral" }); near(r.I, 1013, 1, "core I"); near(r.loss, 78.8, 0.3, "lateral loss"); near(r.Pbuck, 45.7, 0.2, "buck"); near(r.Pdist, 15.4, 0.1, "dist"); near(r.Pibc, 16.8, 0.2, "IBC");
near(r.eta, 0.906, 0.001, "eta"); near(r.I12, 68, 1, "12 V current"); near(r.I48, 17.5, 0.2, "48 V current"); ok(r.ubump > 10000 && r.ubump < 10200, "ubumps ~10,000"); near(r.c4, 2534, 1, "C4");
near(2 * r.balls, 2028, 1, "BGA VDD+VSS"); near(r.ballShare, 0.45, 0.005, "ball share");
near(M.bestPhases({ arr: "lateral" }).n, 23, 0, "best phases");
r = M.pathCalc({ arr: "vertical" }); near(r.Pdist, 4.1, 0.1, "vertical dist"); near(r.loss, 67.2, 0.3, "vertical loss"); near(r.eta, 0.919, 0.001, "vertical eta");
r = M.pathCalc({ arr: "onpkg" }); near(r.loss, 65.1, 0.3, "onpkg loss"); near(2 * r.balls, 136, 1, "onpkg balls");
r = M.pathCalc({ V: 0.6 }); near(r.I, 1267, 1, "0.6 V current"); near(r.Pdist, 24.1, 0.2, "0.6 V dist");
r = M.pathCalc({ phases: 8 }); near(r.Iph, 126.7, 0.1, "8 phase current"); near(r.Pbuck, 72.2, 0.3, "8 phase loss");
for (const arr of ["lateral", "vertical", "onpkg"]) for (const phases of [4, 48]) for (const P of [300, 1000]) for (const V of [0.6, 1]) {
  const q = M.pathCalc({ arr, phases, P, V }); ok(isFinite(q.P48) && q.loss > 0 && q.eta > 0 && q.eta < 1, "path finite");
}

/* 8. 전력 게이팅 */
let s = M.gateSweep({}); ok(s.best.n === 144, "760 W best 144"); near(s.best.V, 0.75, 0.001, "760 W V"); near(s.best.tflops, 944, 1, "760 W TF");
near(M.gateBest(72, {}).tflops, 531, 1, "72 SM boosted"); near(M.gateBest(72, {}).f, 1.8, 1e-9, "72 SM at fmax");
s = M.gateSweep({ par: 64 }); ok(s.best.n === 64, "par 64 best 64"); near(s.best.tflops, 472, 1, "par 64 TF"); near(M.gateBest(144, { par: 64 }).tflops, 419, 1, "par 64 all on");
near(M.gateEval(144, 0.6, {}).P, 314, 1, "144 at Vmin");
s = M.gateSweep({ cap: 300 }); ok(s.best.n === 132, "300 W best 132: " + s.best.n);
s = M.gateSweep({ cap: 250 }); ok(s.best.n === 100, "250 W best 100: " + s.best.n);
near(M.gateEval(144, 0.75, {}).eff, 1.24, 0.005, "eff 0.75"); near(M.gateEval(144, 0.6, {}).eff, 1.85, 0.01, "eff 0.6");
for (const cap of [200, 900]) for (const par of [16, 144]) for (const res of [0, 0.5]) for (const T of [45, 105]) {
  const q = M.gateSweep({ cap, par, res, T }); ok(q.out.every((x) => isFinite(x.P) && x.P > 0 && isFinite(x.tflops) && x.tflops >= 0), "gate finite");
}

const ms = Date.now() - t0; ok(ms < 1000, "runtime " + ms + " ms");
console.log(`ok   power-sims: ${n} checks, ${ms} ms`);
console.log("gpu power sims ok");
