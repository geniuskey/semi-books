#!/usr/bin/env node
/* 14장 칩 사이의 링크와 스케일업(chapters/scale.html) 시뮬레이터 회귀 검사.
   장의 스크립트에서 /* model:* *\/ 블록을 잘라 node:vm에서 돌리고, 본문·GX-1 노트·해볼 것·퀴즈가 인용한 수치와
   슬라이더 끝값에서 NaN·음수·무한이 나오지 않는지 확인한다. 외부 패키지 없음, 1초 안. */
"use strict";
const fs = require("fs"), vm = require("vm"), path = require("path"), assert = require("assert");
const html = fs.readFileSync(path.join(__dirname, "..", "chapters", "scale.html"), "utf8");
const names = ["gx", "par", "pam", "eye", "fec", "chan", "budget", "allreduce", "topo", "scale"];
const block = (k) => { const a = "/* model:" + k + " */", b = "/* /model:" + k + " */", i = html.indexOf(a), j = html.indexOf(b); assert(i >= 0 && j > i, "model block " + k); return html.slice(i + a.length, j); };
const ctx = { Math, Number, Array, Float64Array, Object, Infinity, isFinite };
vm.createContext(ctx);
vm.runInContext(names.map(block).join("\n") + "\nthis.M = { GX, parComm, pamCompare, eyeSim, qfunc, ctleNoiseGain, rsPostBer, chanLoss, chanReach, lossPerM, linkPower, linkBudget, allreduce, ringCross, ringState, topo, topoTimes, stepTime };", ctx);
const M = ctx.M;
let n = 0; const ok = (c, m) => { assert(c, m); n++; };
const near = (x, y, tol, m) => ok(Math.abs(x - y) <= tol * Math.abs(y), m + ": " + x + " vs " + y);
const fin = (x, m) => ok(Number.isFinite(x) && x >= 0, m + " finite/non-negative: " + x);

/* 0. GX-1 표 */
const G = M.GX;
near(G.links * G.lanes * G.laneEff / 8, 900e9, 1e-9, "GX-Link 900 GB/s");
near(G.links * G.linkBW, G.up, 1e-9, "18 × 50 GB/s");
near(G.hbmBW, 6 * 1024 * 9.6e9 / 8, 1e-9, "HBM 7.37 TB/s");
near(G.peak, 144 * 4 * 512 * 2 * 1.6e9, 1e-3, "BF16 943.7 TFLOPS");

/* 1. 왜: 상태 1,120 GB, 6ND 기간 */
near(16 * G.N, 1120e9, 1e-9, "16 B/param");
const t1 = 6 * G.N * 1e13 / (G.peak * 0.5);
near(t1, 8.9e9, 0.01, "6ND one GPU seconds"); near(t1 / 3.156e7, 282, 0.01, "~280 years");
near(t1 / 4096 / 86400, 25.1, 0.01, "4096 GPUs ~25 days"); near(t1 / 512 / 86400, 201, 0.01, "512 GPUs ~200 days");

/* 2. 병렬화 통신량 (p = 8, 512 시퀀스) */
{
  const Bt = 512 * 8192, dp = M.parComm("dp", 8, Bt, 0.5), tp = M.parComm("tp", 8, Bt, 0.5), pp = M.parComm("pp", 8, Bt, 0.5), ep = M.parComm("ep", 8, Bt, 0.5);
  near(dp.bytes, 245e9, 1e-9, "DP bytes"); near(dp.tUp, 0.272, 0.01, "DP 0.27 s");
  near(dp.rUp, 5.8e-4, 0.02, "DP ~0.06 %"); near(dp.rOut, 5.25e-3, 0.02, "DP NIC ~0.5 %");
  near(tp.rUp, 0.0917, 0.02, "TP ~9 %"); near(tp.rOut, 0.825, 0.02, "TP ~82 %");
  ok(!dp.fit && tp.fit && Math.abs(tp.state - 140e9) < 1e6, "state fit");
  ok(pp.bytes < tp.bytes && ep.bytes < tp.bytes, "PP, EP < TP");
  for (const k of ["dp", "tp", "pp", "ep"]) for (const p of [2, 64]) for (const b of [64, 2048]) for (const u of [0.2, 0.8]) {
    const r = M.parComm(k, p, b * 8192, u); ["bytes", "tComp", "tUp", "tOut", "rUp", "rOut", "state"].forEach((f) => fin(r[f], k + " " + f));
  }
}

/* 3. NRZ vs PAM4 */
{
  const r = M.pamCompare(224, 0.5);
  ok(r.p4.baud === 112 && r.p4.fN === 56 && r.nrz.fN === 112, "224G PAM4 112 GBd 56 GHz");
  near(r.pen, 9.54, 0.002, "9.5 dB"); near(r.nrz.loss, 56, 1e-9, "NRZ 56 dB"); near(r.p4.eq, 37.5, 0.01, "PAM4 37.5 dB"); ok(r.pam4Wins, "PAM4 wins at 224");
  near(r.cross, 76.3, 0.01, "cross 76 Gb/s");
  const r50 = M.pamCompare(50, 0.5); near(r50.nrz.loss, 12.5, 1e-9, "50G NRZ"); near(r50.p4.eq, 15.8, 0.01, "50G PAM4"); ok(!r50.pam4Wins, "NRZ wins at 50");
  near(M.pamCompare(100, 1.0).cross, 38.2, 0.01, "a=1 cross 38"); near(M.pamCompare(100, 0.7).cross, 54.5, 0.01, "a=0.7 cross ~54");
  for (const a of [0.1, 1.5]) for (const rr of [10, 448]) { const q = M.pamCompare(rr, a); [q.nrz.loss, q.p4.eq, q.cross].forEach((v) => fin(v, "pam")); }
}

/* 4. 눈 다이어그램 */
{
  const base = { mod: "pam4", poles: 2, loss: 20, pre: -0.05, post: -0.15, ctle: 6, dfe: 2, noise: 3 };
  const r0 = M.eyeSim(base);
  ok(r0.open > 10 && r0.open < 15 && r0.ber > 1e-5 && r0.ber < 3e-5, "default eye ~12 mV, BER ~2e-5: " + r0.ber);
  ok(M.rsPostBer(r0.ber) < 1e-29, "default post-FEC 1e-30 range");
  const r4 = M.eyeSim(Object.assign({}, base, { noise: 4 })); ok(r4.ber > 2e-4 && r4.ber < 3e-4, "noise 4 -> 2.5e-4"); near(M.rsPostBer(r4.ber), 3.7e-15, 0.5, "-> ~1e-15");
  ok(M.eyeSim(Object.assign({}, base, { loss: 22 })).open < 0, "22 dB DFE2 closed");
  const r1 = M.eyeSim(Object.assign({}, base, { dfe: 0 }));
  ok(r1.open < 0 && r1.ber > 0.1 && r1.ber < 0.3 && M.rsPostBer(r1.ber) > 0.1, "no DFE closed ~0.2: " + r1.ber);
  const rn = M.eyeSim(Object.assign({}, base, { mod: "nrz" }));
  ok(rn.open / r0.open > 6.4 && rn.open / r0.open < 7.4 && Math.abs(rn.open - 87) < 3, "NRZ ~7x: " + rn.open / r0.open);
  const r25 = M.eyeSim(Object.assign({}, base, { loss: 25, ctle: 0, dfe: 4 }));
  ok(r25.open > 0, "25 dB DFE4 CTLE0 open: " + r25.open);
  const r15 = M.eyeSim(Object.assign({}, base, { ctle: 15 }));
  ok(r15.sigma < r0.sigma && r15.width > r0.width, "CTLE 15 lowers sigma, widens eye");
  ok(Math.abs(M.ctleNoiseGain(0) - 1) < 1e-9, "CTLE 0 noise gain 1");
  const ideal = M.eyeSim({ mod: "nrz", poles: 1, loss: 0, pre: 0, post: 0, ctle: 0, dfe: 0, noise: 0 });
  near(ideal.open, 800, 0.01, "lossless NRZ eye = 800 mV"); ok(ideal.ber === 0, "noise-free BER 0");
  near(M.qfunc(0), 0.5, 1e-6, "Q(0)"); near(M.qfunc(7.034), 1e-12, 0.01, "Q(7.03)");
  for (const mod of ["nrz", "pam4"]) for (const poles of [1, 2]) for (const loss of [0, 30]) for (const ctle of [0, 15]) for (const dfe of [0, 4]) for (const pp of [[0, 0], [-0.25, -0.4]]) for (const noise of [0, 10]) {
    const r = M.eyeSim({ mod, poles, loss, ctle, dfe, pre: pp[0], post: pp[1], noise });
    ok(Number.isFinite(r.open) && r.ber >= 0 && r.ber <= 0.5 && r.width >= 0 && r.width <= 1 && Number.isFinite(r.sigma), "eye extremes " + JSON.stringify({ mod, poles, loss, ctle, dfe, noise }));
  }
}

/* 5. FEC */
{
  const p = M.rsPostBer(2.4e-4); ok(p > 1e-15 && p < 5e-15, "RS 2.4e-4 -> ~2e-15: " + p);
  near(M.rsPostBer(2.4e-3), 7.5e-4, 0.01, "cliff: 2.4e-3 -> 7.5e-4");
  ok(M.rsPostBer(0) === 0 && M.rsPostBer(0.5) <= 0.5 && M.rsPostBer(1e-92) === 0 && M.rsPostBer(1e-300) === 0, "FEC edges");
  for (let e = -300; e <= -0.3; e += 0.7) fin(M.rsPostBer(Math.pow(10, e)), "rs " + e);
  near(30 / 514, 0.058, 0.01, "overhead 5.8 %");
  near(7.2e12 * 1e-12, 7.2, 1e-9, "errors per second at 1e-12");
}

/* 6. 채널 도달 거리와 전력 */
{
  near(M.lossPerM("cable", 56), 12.5, 0.01, "cable 12.5 dB/m @56"); near(M.lossPerM("pcb", 56), 80.3, 0.01, "pcb ~80 dB/m @56");
  near(M.chanReach("cable", 56, 30), 1.73, 0.01, "224G cable 1.7 m"); near(M.chanReach("pcb", 56, 30), 0.269, 0.02, "224G pcb 27 cm");
  near(M.chanReach("cable", 28, 30), 3.30, 0.01, "112G cable 3.3 m"); near(M.chanReach("cable", 112, 30), 0.64, 0.02, "448G cable 0.6 m");
  near(M.linkPower(36, 224, 5), 40.3, 0.01, "36 lanes copper 40 W"); near(M.linkPower(36, 224, 15), 121, 0.01, "plug optics 121 W");
  near(M.linkPower(36, 224, 15) - M.linkPower(36, 224, 5), 80.6, 0.01, "optics +80 W");
  for (const f of [14, 112]) for (const b of [20, 40]) for (const L of [0.05, 5]) { fin(M.chanReach("cable", f, b), "reach"); fin(M.chanLoss("pcb", f, L), "loss"); }
}

/* 7. 링크 예산 */
{
  const b = M.linkBudget(18, 2, 224, 5);
  near(b.bw, 900e9, 1e-9, "900 GB/s"); near(b.power, 40.3, 0.01, "40 W"); near(b.edge, 28.8, 1e-9, "29 mm"); near(b.edgeFrac, 0.55, 0.01, "55 %");
  near(b.area, 18, 1e-9, "18 mm2"); near(b.areaFrac, 0.023, 0.02, "2.3 %"); near(b.pJeff, 5.6, 0.01, "5.6 pJ/bit eff"); near(1 / b.hbmRatio, 8.19, 0.01, "1/8 of HBM");
  near(b.power / 760, 0.053, 0.03, "~5 % of 760 W");
  const b112 = M.linkBudget(36, 2, 112, 5); near(b112.bw, 900e9, 1e-9, "112G 72 lanes 900"); near(b112.edge, 57.6, 1e-9, "58 mm"); ok(!b112.fits, "112G overflows");
  const b36 = M.linkBudget(36, 2, 224, 5); near(b36.bw, 1.8e12, 1e-9, "1.8 TB/s"); near(b36.power, 80.6, 0.01, "81 W"); ok(!b36.fits, "36 links overflow");
  for (const L of [1, 36]) for (const l of [1, 4]) for (const r of [56, 224]) for (const e of [1, 10]) { const q = M.linkBudget(L, l, r, e); ["bw", "power", "edge", "area"].forEach((f) => fin(q[f], "budget " + f)); }
}

/* 8. 토폴로지 */
{
  const T = (k, p) => { const t = M.topo(k, p); return Object.assign(t, M.topoTimes(t, 1e9, 1e9)); };
  const s8 = T("switch", 8), r8 = T("ring", 8), t8 = T("torus", 8), m8 = T("mesh", 8);
  ok(s8.switches === 4 && s8.bis === 3.6e12 && s8.hops === 2, "GX-8 4 switches 3.6 TB/s");
  near(s8.ar, 1.944e-3, 0.01, "switch AR 1 GB ~1.94 ms (bandwidth term)"); near(r8.ar, s8.ar, 1e-9, "ring AR same"); near(t8.ar, s8.ar, 1e-9, "torus AR same");
  near(m8.ar, 2.5e-3, 0.01, "mesh AR 2.5 ms"); ok(m8.nbr === 100e9, "mesh pair 100 GB/s");
  near(s8.a2a, 0.972e-3, 0.01, "switch a2a 0.97 ms"); near(r8.a2a, 2.22e-3, 0.01, "ring a2a 2.2 ms");
  const r64 = T("ring", 64), t64 = T("torus", 64), s64 = T("switch", 64);
  near(r64.a2a, 17.8e-3, 0.01, "ring 64 a2a 18 ms"); near(t64.a2a, 4.44e-3, 0.01, "torus 64 a2a 4.4 ms"); near(s64.a2a, 1.09e-3, 0.01, "switch 64 a2a 1.1 ms");
  ok(s64.tiers === 2 && s64.switches === 96, "2-tier");
  ok(!M.topo("mesh", 32).ok && M.topo("mesh", 16).ok, "mesh limit");
  for (const k of ["switch", "ring", "torus", "mesh"]) for (const p of [8, 16, 32, 64]) { const t = T(k, p); if (t.ok) { fin(t.ar, k + p + " ar"); fin(t.a2a, k + p + " a2a"); fin(t.hops, "hops"); } }
}

/* 9. 올리듀스 */
{
  const ring = M.allreduce("ring", 8, 1e9, 900e9, 3e-6), sw = M.allreduce("switch", 8, 1e9, 900e9, 3e-6);
  near(ring, 1.986e-3, 0.005, "ring 1 GB ~1.99 ms"); near(sw, 1.117e-3, 0.005, "switch 1.12 ms");
  const r1m = M.allreduce("ring", 8, 1e6, 900e9, 3e-6), t1m = M.allreduce("tree", 8, 1e6, 900e9, 3e-6);
  near(r1m, 43.9e-6, 0.01, "ring 1 MB 44 us"); ok(42e-6 / r1m > 0.94, "latency ~95 %"); near(t1m, 20.2e-6, 0.01, "tree 1 MB 20 us");
  near(M.allreduce("ring", 8, 1e9, 100e9, 3e-6), 17.5e-3, 0.01, "ring 100 GB/s 17.5 ms");
  near(M.allreduce("ring", 8, 36e9, 900e9, 0), 0.07, 1e-9, "quiz 4: 70 ms");
  near(M.allreduce("ring", 8, 140e9, 900e9, 0), 0.272, 0.01, "GX-8 140 GB 0.27 s"); near(M.allreduce("switch", 8, 140e9, 900e9, 0), 0.156, 0.01, "switch 0.16 s");
  near(M.allreduce("ring", 8, 140e9, 100e9, 0), 2.45, 0.01, "NIC 2.45 s");
  ok(M.ringCross(8, 900e9, 3e-6) > 1e6, "ring/tree crossover above 1 MB");
  // 링 상태: RS p-1단계 뒤 GPU i가 조각 (i+1) mod p 완성, 2(p-1)단계 뒤 모두 완성, 단계마다 p개 전송
  for (const p of [2, 4, 8, 16]) {
    const rs = M.ringState(p, p - 1); for (let i = 0; i < p; i++) ok(rs.cnt[i][(i + 1) % p] === p, "RS complete chunk p=" + p);
    const ag = M.ringState(p, 2 * (p - 1)); ok(ag.cnt.every((r) => r.every((v) => v === p)) && ag.phase === "done" && ag.sends.length === 0, "AG all complete p=" + p);
    ok(M.ringState(p, 0).sends.length === p, "p sends per step");
  }
  for (const alg of ["ring", "tree", "switch"]) for (const p of [2, 16]) for (const nn of [1e3, 1e11]) for (const bw of [25e9, 900e9]) for (const a of [0.5e-6, 20e-6]) fin(M.allreduce(alg, p, nn, bw, a), "allreduce");
}

/* 10. 스케일업 vs 스케일아웃 */
{
  const S = (d, seq, ov, tpOut) => M.stepTime({ nodes: d, Bt: seq * 8192, overlap: ov, tpOut });
  const a = S(64, 512, 0.8, false);
  near(a.tComp, 7.30, 0.01, "64 nodes compute 7.3 s"); near(a.tTP, 0.668, 0.01, "TP 0.67 s"); near(a.tDP, 0.345, 0.02, "DP 0.34 s"); near(a.eff, 0.91, 0.02, "eff ~91 %");
  const b = S(1024, 512, 0.8, false); near(b.tComp, 0.456, 0.01, "1024 nodes compute 0.46 s"); near(b.eff, 0.80, 0.02, "eff ~80 %"); near(b.tDP, 0.36, 0.01, "DP 0.36 s"); near(S(1024, 512, 0, false).eff, 0.53, 0.02, "phi 0 ~53 %");
  const c = S(1024, 4096, 0.8, false); near(c.eff, 0.90, 0.02, "batch 4096 eff ~90 %");
  const d = S(64, 512, 0.8, true); near(d.tTP, 6.01, 0.01, "TP over NIC 6 s"); near(d.eff, 0.55, 0.02, "eff ~55 %");
  near(d.step, 13.4, 0.01, "step 13.4 s"); near(a.step, 8.03, 0.02, "step ~8 s"); near(d.step / a.step, 1.7, 0.03, "1.7x");
  near(17.5e9 * 2 / 100e9, 0.35, 1e-9, "DP shard 0.35 s");
  for (const nd of [1, 1024]) for (const sq of [256, 4096]) for (const ov of [0, 1]) for (const t of [false, true]) { const r = S(nd, sq, ov, t); ["tComp", "tTP", "tDP", "step", "eff", "tok"].forEach((f) => fin(r[f], "scale " + f)); ok(r.eff <= 1, "eff <= 1"); }
}

console.log(n + " checks");
console.log("gpu scale sims ok");
