#!/usr/bin/env node
/* Copyright (c) 2026 geniuskey and GPUBook contributors. MIT.
 * 9장 온칩 네트워크와 L2(chapters/noc.html) 시뮬레이터 회귀 검사.
 * 장 스크립트에서 /* model:<이름> *\/ … /* /model:<이름> *\/ 블록을 잘라 node:vm에서 돌리고,
 * 본문·해볼 것·GX-1 노트·퀴즈가 인용하는 수치와 슬라이더 끝값의 유한성을 확인한다.
 * 실행: node gpu/scripts/noc-sims.cjs (외부 패키지 없음, 1초 안팎)
 */
"use strict";
const fs = require("node:fs"), vm = require("node:vm"), path = require("node:path"), assert = require("node:assert/strict");
const html = fs.readFileSync(path.join(__dirname, "..", "chapters", "noc.html"), "utf8");
const NAMES = ["rng", "topo", "xbar", "hash", "part", "wire", "clock", "cdc", "floor"];
const block = (n) => {
  const a = `/* model:${n} */`, b = `/* /model:${n} */`, i = html.indexOf(a), j = html.indexOf(b, i);
  assert.ok(i >= 0 && j > i, "model block " + n);
  return html.slice(i + a.length, j);
};
const ctx = vm.createContext({ Math });
const M = vm.runInContext("(function(){" + NAMES.map(block).join("\n") +
  "\nreturn { TOPO, topoModel, xbarSim, xbarHotLimit, sliceOf, hashHist, partModel, wireRho, wireR, wireDelay, cyc, clockSim, cdcModel, floorModel, FLOOR };})()", ctx);

let n = 0;
const ok = (c, m) => { assert.ok(c, m); n++; };
const near = (a, b, rel, m) => ok(Math.abs(a / b - 1) <= rel, `${m}: ${a} vs ${b}`);
const fin = (o, m) => { for (const [k, v] of Object.entries(o)) if (typeof v === "number") ok(Number.isFinite(v) && v >= 0, `${m}.${k} = ${v}`); };

/* 0. GX-1 표에서 계산한 값 */
near(128 * 64 * 1.6e9 / 1e12, 13.1, 0.002, "L2 BW 13.1 TB/s");
near(13.107 / 144 * 1e3, 91, 0.005, "SM당 L2 몫 91 GB/s");
near(943.7 / 13.107, 72, 0.005, "L2 리지 72 FLOP/B");

/* 1. 토폴로지 */
{
  const T = (k, N) => M.topoModel(k, N);
  ok(T("xbar", 16).area === 256 && T("mesh", 16).area === 400 && T("xbar", 25).area === T("mesh", 25).area, "xbar = mesh at N = 25");
  near(T("xbar", 144).area / T("mesh", 144).area, 5.76, 0.01, "N=144 area ratio");
  near(T("mesh", 144).hops, 8, 0.01, "mesh 144 hops ≈ 8");
  near(T("mesh", 144).lam, 1 / 3, 0.001, "mesh 144 λ");
  near(T("ring", 144).hops, 36.25, 0.001, "ring 144 hops");
  near(T("ring", 144).lam, 8 / 144, 0.001, "ring 144 λ");
  ok(T("xbar", 144).lam === 1 && T("bus", 64).lam === 1 / 64, "xbar/bus λ");
  for (const k of M.TOPO) for (const N of [4, 256]) fin(T(k, N), `topo ${k} ${N}`);
}

/* 2. 크로스바 경합(장의 기본 난수 seed 3, 3000사이클과 같은 조건) */
{
  const X = (o) => M.xbarSim(Object.assign({ N: 32, cycles: 3000, warm: 400, seed: 3 }, o));
  const a = X({ p: 0.9, mode: "oq" });
  ok(Math.abs(a.thr - 0.9) < 0.02 && a.mean > 3 && a.mean < 8, "VOQ p=0.9: thr 0.90, mean ~5 " + JSON.stringify([a.thr, a.mean]));
  const b = X({ p: 0.9, mode: "iq" });
  ok(b.thr > 0.55 && b.thr < 0.63 && b.mean > 100, "input FIFO saturates ~0.59, mean > 100 " + JSON.stringify([b.thr, b.mean]));
  const c = X({ p: 0.2, hot: 0.1, mode: "oq" }), d = X({ p: 0.3, hot: 0.1, mode: "oq" });
  ok(c.mean < 2.5 && d.p99 === 64 && d.blockFrac > 0, "hotspot h=0.1: p=0.2 fine, p=0.3 queue full " + JSON.stringify([c.mean, d.p99, d.blockFrac]));
  near(M.xbarHotLimit(32, 0.1), 0.2439, 0.001, "hot limit 0.244");
  for (const o of [{ N: 8, p: 0.05, hot: 0, mode: "iq" }, { N: 64, p: 1, hot: 0.3, mode: "iq", cycles: 400 }, { N: 64, p: 1, hot: 0.3, mode: "oq", cycles: 400 }]) {
    const r = X(o); fin({ thr: r.thr, mean: r.mean, p99: r.p99, blockFrac: r.blockFrac }, "xbar " + JSON.stringify(o)); ok(r.thr <= 1, "thr ≤ 1");
  }
}

/* 3. 주소 해싱 */
{
  const H = (st, mode, S = 128) => M.hashHist(st, 8192, S, mode, 0);
  ok(H(128, "lin").used === 1 && H(128, "xor").used === 128 && H(128, "xor").balance === 1, "16 KB stride: lin 1 slice, xor 128");
  near(128 * 102.4 * H(128, "lin").balance, 102.4, 1e-9, "effective 102 GB/s");
  const x129 = H(129, "xor");
  ok(H(129, "lin").balance === 1 && x129.used === 101 && x129.balance > 0.04 && x129.balance < 0.05, "stride 129: xor 101 slices, ~0.044 " + JSON.stringify([x129.used, x129.balance]));
  ok(H(2, "lin").used === 64 && H(2, "xor").used === 128, "stride 2");
  for (const st of [1, 2, 64, 128, 129, 512]) for (const m of ["lin", "xor"]) for (const S of [32, 64, 128]) { const r = H(st, m, S); ok(r.h.reduce((s, v) => s + v, 0) === 8192 && r.balance > 0 && r.balance <= 1, "hash sum"); }
}

/* 4. L2 파티션 */
{
  const P = M.partModel;
  near(P(0.5, 0).cap, 8, 1e-9, "r=0.5 cap 8 TB/s");
  near(P(0.5, 1e-6).lat, 200, 0.001, "50/50 no-load 200 cycles");
  const a = P(0.25, 13.1);
  ok(!a.sat && Math.abs(a.rho - 0.82) < 0.01 && a.lat > 185 && a.lat < 195, "r=0.25 full BW " + JSON.stringify(a));
  const b = P(0.5, 10);
  ok(b.sat && b.served === 8 && b.lat > 290 && b.lat < 305, "r=0.5 D=10 saturates near 300 cycles");
  near(P(0.5, 8).pw, 24, 0.001, "remote energy 24 W");
  for (const r of [0, 1]) for (const D of [0, 13.1]) fin(P(r, D), `part ${r} ${D}`);
}

/* 5. 배선 RC */
{
  const W = M.wireDelay;
  near(M.wireRho(80) * 1e8, 2.57, 0.01, "ρ(80 nm)");
  near(M.wireRho(20) * 1e8, 5.18, 0.01, "ρ(20 nm) ≈ 3× bulk");
  near(M.wireR(20) / M.wireR(80), 40, 0.02, "r ratio 20/80 nm ≈ 40");
  const d30 = W(80, 30, 1);
  near(d30.un * 1e9, 147, 0.01, "30 mm unrepeated 147 ns");
  near(M.cyc(d30.un), 235, 0.01, "235 cycles");
  near(d30.opt * 1e9, 1.63, 0.01, "30 mm optimal 1.63 ns");
  near(M.cyc(d30.opt), 2.6, 0.02, "2.6 cycles");
  near(d30.perMm * 1e12, 54.5, 0.01, "54.5 ps/mm");
  near(30 / d30.kOpt * 1000, 71, 0.02, "repeater spacing 71 µm");
  near(625 / (d30.perMm * 1e12), 11.5, 0.01, "11 mm per cycle");
  near(W(20, 30, 1).perMm * 1e12, 344, 0.01, "20 nm 344 ps/mm");
  const d1 = W(80, 1, 1);
  near(d1.un * 1e12, 174, 0.01, "1 mm unrepeated 174 ps"); near(d1.opt * 1e12, 54.5, 0.01, "1 mm optimal 55 ps"); ok(Math.round(d1.kOpt) === 14, "k_opt 14");
  near(W(80, 30, d30.kOpt / 2).rep / d30.opt, 1.11, 0.01, "half the repeaters: +11 %");
  // 교차 길이(리피터 없음 = 최적)가 수백 µm
  let Lx = 0.01; while (W(80, Lx, 1).un < W(80, Lx, 1).opt) Lx += 0.01;
  ok(Lx > 0.1 && Lx < 0.6, "crossover " + Lx);
  ok(W(1000, 30, 1).opt >= 30 * 5.8e-12 - 1e-15, "speed-of-light floor");
  for (const w of [10, 1000]) for (const L of [0.5, 30]) for (const k of [1, 1000]) fin(W(w, L, k), `wire ${w} ${L} ${k}`);
}

/* 6. 클럭 분배(장의 기본 seed 7) */
{
  const a = M.clockSim(5, 1, 3, 7, false), b = M.clockSim(5, 0.1, 3, 7, true), c = M.clockSim(5, 2, 3, 7, true);
  ok(a.skew > 58 && a.skew < 68, "tree skew ~63 ps " + a.skew);
  ok(b.skew > 22 && b.skew < 28, "mesh 0.1 mm ~25 ps " + b.skew);
  ok(c.skew > 45 && c.skew < 56, "mesh 2 mm ~50 ps " + c.skew);
  near(a.P, 0.44, 0.03, "tree power 0.44 W"); near(b.P, 3.97, 0.02, "mesh power ~4 W");
  ok(b.skewTree === a.skew, "same seed, same tree");
  for (const m of [3, 5]) for (const p of [0.05, 2]) for (const s of [1, 6]) { const r = M.clockSim(m, p, s, 7, true); fin({ skew: r.skew, skewTree: r.skewTree, C: r.C, P: r.P }, "clock"); ok(r.skew <= r.skewTree + 1e-9, "mesh never worse"); }
}

/* 7. 클럭 도메인 교차 */
{
  const c1 = M.cdcModel(1.6, 1.6, 1, 0.25), c2 = M.cdcModel(1.6, 1.6, 2, 0.25);
  near(c1.mtbf, 1.72e-3, 0.01, "1 FF MTBF 1.7 ms");
  near(c2.mtbf, 2.69e17, 0.01, "2 FF MTBF 2.7e17 s");
  near(c2.mtbf / 3.156e7, 8.5e9, 0.01, "≈ 85억 년");
  near(c2.mtbf / c1.mtbf, 1e20, 0.6, "1→2단 ≈ 10^20배");
  near(c2.latS * 1e9, 2.5, 1e-9, "FIFO 2.5 ns"); ok(c2.latCyc === 4 && c2.depth === 6, "4 cycles, depth 6");
  ok(M.cdcModel(1.6, 2, 2, 0.25).mtbf < c2.mtbf / 1e3, "faster read clock lowers MTBF");
  near(Math.exp(625 / 10), 1.4e27, 0.01, "e^{T/τ} at 1.6 GHz ≈ 10^27");
  for (const fa of [0.5, 2]) for (const fb of [0.5, 2]) for (const k of [1, 2, 3]) for (const x of [0.05, 1]) { const r = M.cdcModel(fa, fb, k, x); ok(r.mtbf > 0 && !Number.isNaN(r.mtbf) && Number.isFinite(r.latS) && r.depth >= 2, "cdc extremes"); }
}

/* 8. 다이 평면 배치 */
{
  const F = (l, h, loc, bh = 7.37) => M.floorModel(l, h, 13.1, bh, loc);
  const c = F("center", "long"), e = F("edge", "long"), s = F("side", "long"), cl = F("center", "long", true);
  near(c.dSL, 16.2, 0.005, "center dSL 16.2 mm"); near(c.pSL, 84.8, 0.005, "center P_SL 85 W"); near(c.pLH, 40.5, 0.005, "center P_LH 41 W"); near(c.pTot, 125.3, 0.005, "center total 125 W");
  near(c.maxSL, 40, 0.01, "longest SM-slice ≈ 40 mm");
  near(e.pLH, 12.7, 0.01, "edge P_LH 13 W"); near(e.pSL, 104.4, 0.005, "edge P_SL 104 W"); near(e.pTot, 117.1, 0.005, "edge total 117 W");
  ok(s.pTot > c.pTot && s.pTot > e.pTot, "side worst");
  near(cl.dSL, 11.3, 0.005, "local dSL 11.3 mm"); near(cl.pSL, 59.3, 0.005, "local P_SL 59 W"); near(cl.pTot, 99.7, 0.005, "local total ~100 W");
  // 교차점: HBM 대역폭이 약 5.2 TB/s보다 낮으면 가운데 띠가 유리
  ok(F("center", "long", false, 5.0).pTot < F("edge", "long", false, 5.0).pTot && F("center", "long", false, 5.4).pTot > F("edge", "long", false, 5.4).pTot, "crossover 5.2 TB/s");
  near(125.3 / 640, 0.2, 0.03, "≈ 20 % of dynamic power");
  near(10e12 * 8 * 10 * 0.05e-12, 40, 1e-9, "quiz: 40 W");
  near(13.1e12 * 8 * 10 * 0.05e-12, 52, 0.01, "formula: 52 W");
  near(32 * 16 * 0.05, 25.6, 1e-9, "32 bit over 16 mm 26 pJ");
  for (const l of ["center", "edge", "side"]) for (const h of ["long", "short"]) for (const loc of [false, true]) {
    const r = M.floorModel(l, h, 0, 0, loc); ok(r.sms.length === 160 && r.sls.length === 128 && r.pTot === 0, "floor counts");
    fin({ dSL: r.dSL, dLH: r.dLH, maxSL: r.maxSL }, `floor ${l} ${h}`);
    for (const p of [...r.sms, ...r.sls]) ok(p.x >= 0 && p.x <= M.FLOOR.W && p.y >= 0 && p.y <= M.FLOOR.H, "inside die");
  }
}

console.log("gpu noc sims ok");
