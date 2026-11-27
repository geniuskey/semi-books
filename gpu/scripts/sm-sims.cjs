#!/usr/bin/env node
/* Copyright (c) 2026 geniuskey and GPUBook contributors. MIT.
   3장 SM 해부(chapters/sm.html) 시뮬레이터 회귀 검사.
   장 스크립트의 /* model:<이름> *\/ 블록을 잘라 node:vm에서 돌리고, 본문·해볼 것·GX-1 노트·표·퀴즈가 인용한
   수치와 극단 입력(슬라이더 최소·최대에서 NaN·음수·무한 없음)을 확인한다. 외부 패키지 없음, 1초 안. */
"use strict";
const fs = require("fs"), vm = require("vm"), path = require("path"), assert = require("assert");
const html = fs.readFileSync(path.join(__dirname, "..", "chapters", "sm.html"), "utf8");
const block = (name) => {
  const a = "/* model:" + name + " */", b = "/* /model:" + name + " */", i = html.indexOf(a), j = html.indexOf(b, i);
  assert(i >= 0 && j > i, "model block " + name);
  return html.slice(i + a.length, j);
};
const names = ["util", "sched", "ilp", "issue", "bank", "occ", "div", "area", "energy"];
const ctx = { Math, Object, Array, Number, String, JSON, isFinite, Infinity, NaN };
vm.createContext(ctx);
vm.runInContext(names.map(block).join("\n") +
  "\nthis.M = { schedSim, ilpModel, issueSim, issueBound, bankSim, occCalc, divStats, areaModel, energyOp };", ctx);
const M = ctx.M;
let n = 0;
const ok = (c, m) => { assert(c, m); n++; };
const near = (x, y, tol, m) => ok(Math.abs(x - y) <= tol, m + ": got " + x + ", want " + y + " ± " + tol);

/* 1. 워프 스케줄러 */
{
  const s = (warps, policy, memLat, prog) => M.schedSim({ warps, policy, memLat, prog, iters: 32 });
  near(s(1, "lrr", 30, "mem").ipc, 0.14, 0.01, "sched mem 1 warp");
  near(s(4, "lrr", 30, "mem").ipc, 0.54, 0.03, "sched mem 4 warps");
  near(s(8, "lrr", 30, "mem").ipc, 0.75, 0.03, "sched mem 8 warps LRR (LSU bound 6/8)");
  ok(s(16, "lrr", 30, "mem").ipc <= 0.75 + 1e-9, "LSU upper bound 0.75");
  near(s(8, "gto", 30, "mem").ipc, 0.53, 0.03, "sched mem 8 warps GTO");
  ok(s(8, "gto", 30, "mem").firstFin < s(8, "lrr", 30, "mem").firstFin * 0.85, "GTO finishes first warp earlier");
  near(s(16, "lrr", 800, "mem").ipc, 0.12, 0.015, "HBM latency 16 warps");
  for (const pol of ["lrr", "gto"]) for (const prog of ["mem", "alu"]) for (const N of [1, 16]) for (const L of [10, 800]) {
    const r = s(N, pol, L, prog);
    ok(r.done === r.total && r.ipc > 0 && r.ipc <= 1 && Number.isFinite(r.firstFin) && r.idle >= 0 && r.idle < 1, "sched extremes " + [pol, prog, N, L]);
  }
}

/* 2. 지연 × ILP */
{
  const r = M.ilpModel({ ilp: 1, m: 0.1, h1: 0.8, h2: 0.6 });
  near(r.Lavg, 14.8, 1e-9, "Lavg 14.8");
  near(r.needSM, 59.2, 1e-9, "need 59.2 per SM");
  ok(r.regMax === 32, "regMax 32, got " + r.regMax);
  const r2 = M.ilpModel({ ilp: 2, m: 0.1, h1: 0.8, h2: 0.6 });
  near(r2.needSM, 29.6, 1e-9, "ILP 2 need 29.6"); ok(r2.regMax === 64, "ILP 2 regMax 64, got " + r2.regMax);
  const r0 = M.ilpModel({ ilp: 1, m: 0.1, h1: 0, h2: 0.6 });
  near(r0.Lavg, 47.6, 1e-9, "L1 0% Lavg"); ok(r0.needSM > 190 && !r0.fits && r0.regMax === 0, "L1 0% needs >190 warps");
  // 퀴즈 6: L=20, ILP 2 → 40워프, 레지스터 48개
  ok(Math.floor(65536 / (40 * 32) / 8) * 8 === 48, "quiz 6 regs");
  // GX-1 노트: ILP 5 → SM당 약 12워프
  near(M.ilpModel({ ilp: 5, m: 0.1, h1: 0.8, h2: 0.6 }).needSM, 11.84, 1e-9, "GEMM note ILP 5");
  for (const ilp of [1, 8]) for (const m of [0, 0.3]) for (const h of [0, 1]) {
    const x = M.ilpModel({ ilp, m, h1: h, h2: h });
    ok(x.Lavg > 0 && Number.isFinite(x.needSM) && x.regMax >= 0 && x.regMax <= 255 && x.U(1) > 0 && x.U(16) <= 1, "ilp extremes " + [ilp, m, h]);
  }
}

/* 3. 이중 발행 */
{
  const mix = { fp32: 50, int: 20, ldst: 20, sfu: 5, fp64: 5 };
  const a = M.issueSim({ mix, warps: 8, dual: false, dep: 0.5 }), b = M.issueSim({ mix, warps: 8, dual: true, dep: 0.5 });
  near(a.ipc, 1.0, 0.01, "single issue IPC ~1.0");
  near(b.ipc, 1.16, 0.03, "dual issue IPC ~1.16");
  near(b.bound.ipc, 1.25, 1e-9, "bound 1.25"); ok(b.bound.by === "ldst", "bottleneck LD/ST");
  ok(b.ipc <= b.bound.ipc + 1e-9 && a.ipc <= 1 + 1e-9, "sim under bound");
  near(M.issueSim({ mix: { fp32: 100 }, warps: 8, dual: true, dep: 0 }).ipc, 1, 1e-9, "FP32 only dual = 1");
  near(M.issueSim({ mix, warps: 1, dual: false, dep: 0.5 }).ipc, 0.77, 0.03, "single warp single issue");
  const z = M.issueSim({ mix: { fp32: 0, int: 0, ldst: 0, sfu: 0, fp64: 0 }, warps: 1, dual: true, dep: 1 });
  ok(z.ipc === 0 && Number.isFinite(z.bound.ipc), "all-zero mix safe");
  const sfu = M.issueSim({ mix: { sfu: 50 }, warps: 8, dual: true, dep: 1 });
  near(sfu.ipc, 0.125, 0.005, "SFU only = 1/8");
}

/* 4. 뱅크 충돌 */
{
  const b = (banks, collectors, alloc, reuse) => M.bankSim({ banks, collectors, alloc, reuse, reuseP: reuse ? 0.5 : 0 });
  const r = b(4, 1, "random");
  near(r.ipc, 1 / 1.6875, 0.02, "4 banks 1 collector IPC ≈ 0.59"); near(r.conflictRate, 0.625, 0.03, "conflict ≈ 61–62.5 %");
  near(r.energy, 48, 1e-9, "48 pJ per instr");
  near(b(4, 4, "random").ipc, 0.98, 0.02, "4 collectors");
  ok(b(4, 1, "aware").ipc === 1 && b(4, 1, "aware").conflictRate === 0, "bank-aware no conflict");
  const ru = b(4, 1, "random", true);
  near(ru.ipc, 0.69, 0.02, "reuse cache IPC"); near(ru.energy, 40, 1.5, "reuse energy ~40 pJ"); near(ru.saved / 6000, 0.17, 0.02, "saved ~17 %");
  const e8 = b(8, 1, "random"); near(e8.conflictRate, 0.34, 0.02, "8 banks conflict"); near(e8.ipc, 0.74, 0.02, "8 banks IPC");
  for (const K of [1, 2, 4]) for (const al of ["random", "aware"]) ok(b(2, K, al).ipc <= 2 / 3 + 1e-9, "2 banks ≤ 2/3");
  ok(Math.abs(24 / 64 - 0.375) < 1e-12 && Math.abs(1 * 0.375 + 2 * 0.5625 + 3 * 0.0625 - 1.6875) < 1e-12, "formula E[c]");
}

/* 5. 점유율 */
{
  const o = (regs, threads, smemKB) => M.occCalc({ regs, threads, smem: (smemKB || 0) * 1024 });
  const w = (r, t, s) => o(r, t, s).warps;
  ok(w(32, 256) === 64 && w(40, 256) === 48 && w(64, 256) === 32 && w(128, 256) === 16 && w(255, 256) === 8 && w(80, 256) === 24, "staircase 256");
  ok(o(64, 256).blocks === 4 && o(64, 256).by.join() === "reg", "64 regs: 4 blocks, reg limit");
  const s48 = o(32, 256, 48); ok(s48.blocks === 4 && s48.occ === 0.5 && s48.by.join() === "smem", "48 KB smem");
  ok(o(80, 1024).blocks === 0 && 80 * 32 * 32 === 81920, "1024 x 80 cannot launch");
  ok(w(64, 1024) === 32 && w(65, 1024) === 0, "1024-thread cliff at 64");
  ok(o(16, 32).occ === 0.5 && o(16, 32).by.join() === "block", "32-thread blocks capped at 50 %");
  const g = o(168, 128); ok(g.rw === 5376 && g.blocks === 3 && g.warps === 12 && g.occ === 0.1875, "GEMM note 168 regs");
  for (const r of [16, 255]) for (const t of [32, 1024]) for (const s of [0, 228]) {
    const x = o(r, t, s);
    ok(x.blocks >= 0 && x.warps >= 0 && x.occ >= 0 && x.occ <= 1 && Number.isFinite(x.regsUsed) && x.regsUsed <= 65536 && x.smemUsed <= 228 * 1024, "occ extremes " + [r, t, s]);
  }
  ok(o(32, 100).laneEff < 1, "lane waste for 100 threads");
}

/* 6. 분기 발산 */
{
  const d = (o) => M.divStats(Object.assign({ A: 8, B: 8, pattern: "random", q: 0.5, C: 8 }, o));
  near(d({ p: 0.5 }).eff, 0.5, 0.005, "p 0.5 → 50 %"); near(d({ p: 0.5 }).effRand, 0.5, 1e-6, "formula 50 %");
  near(d({ p: 0.1 }).eff, 0.51, 0.01, "p 0.1 → ~51 %"); near(1 - Math.pow(0.9, 32), 0.97, 0.005, "97 % of warps");
  ok(d({ p: 0.5, pattern: "warp" }).eff === 1, "warp-uniform 100 %");
  near(d({ p: 0.02, A: 20, B: 2 }).effRand, 0.205, 0.005, "rare long path ~20 %"); near(1 - Math.pow(0.98, 32), 0.476, 0.005, "48 % warps");
  near(d({ p: 0.02, A: 32, B: 2 }).eff, 0.14, 0.02, "p 2 % A 32 → ~14 %");
  ok(d({ p: 0.5, nest: true, q: 0.3 }).eff < d({ p: 0.5 }).eff, "nesting lowers efficiency");
  for (const p of [0, 1]) for (const B of [0, 32]) for (const nest of [false, true]) {
    const x = d({ p, A: 1, B, nest, q: 0, C: 32 });
    ok(x.eff > 0 && x.eff <= 1 && Number.isFinite(x.effRand) && x.effRand > 0 && x.effRand <= 1 + 1e-9 && x.first, "div extremes " + [p, B, nest]);
  }
}

/* 7. 면적 예산 */
{
  const a = (rfKB, regs, need, victim) => M.areaModel({ rfKB, regs, need, victim });
  near(a(256, 128, 32, "tensor").total, 3.2, 1e-9, "SM total 3.2 mm²");
  const b0 = a(256, 128, 32, "tensor"); ok(b0.warps === 16 && b0.U === 0.5, "base 16 warps"); near(b0.bf16, 471.85, 0.1, "base 472 TFLOPS");
  const b3 = a(384, 128, 32, "tensor"); ok(b3.warps === 24, "384 KB 24 warps"); near(b3.cap.tensor, 0.7375, 1e-9, "tensor area 74 %"); near(b3.bf16, 522, 0.5, "384 KB ~522");
  near(a(512, 128, 32, "tensor").bf16, 448.3, 0.5, "512 KB ~448");
  near(a(256, 64, 32, "tensor").bf16, 943.7, 1e-9, "64 regs full speed");
  const f = a(384, 128, 32, "fp64"); near(f.bf16, 707.8, 0.5, "fp64 victim 708"); near(f.fp64, 11.8, 0.05, "fp64 11.8");
  ok(!a(512, 128, 32, "fp64").feasible, "512 KB infeasible from FP64");
  // GX-1 노트: 텐서 2048 FMA / 0.8 mm² vs FP32 128 / 0.45 mm², 레지스터 0.42 × 160
  near(2048 / 0.8, 2560, 1e-9, "tensor density"); near(128 / 0.45, 284, 1, "fp32 density ~280"); near(0.42 * 160, 67.2, 1e-9, "RF 67 mm²");
  for (const rf of [64, 512]) for (const r of [16, 255]) for (const need of [8, 64]) for (const v of ["tensor", "fp32", "fp64"]) {
    const x = a(rf, r, need, v);
    ok(x.warps >= 0 && x.warps <= 64 && x.U >= 0 && x.U <= 1 && x.bf16 >= 0 && x.fp64 >= 0 && x.fp32 >= 0 && Number.isFinite(x.bf16), "area extremes " + [rf, r, need, v]);
  }
}

/* 8. 에너지 경로 + GX-1 표에서 계산한 수 */
{
  const f = M.energyOp("fp32"); near(f.total, 97.6, 1e-9, "FP32 FMA 97.6 pJ"); near(f.mathFrac, 0.262, 0.002, "math 26 %"); near(f.perFlop, 1.525, 1e-9, "1.5 pJ/FLOP");
  const t = M.energyOp("mma"); near(t.total, 641.6, 1e-9, "MMA 641.6 pJ"); near(t.mathFrac, 0.638, 0.002, "math 64 %"); near(t.perFlop, 0.157, 0.001, "0.16 pJ/FLOP");
  near(f.perFlop / t.perFlop, 9.7, 0.1, "~10x");
  const h = M.energyOp("hbm"); near(h.total, 3480, 1e-9, "HBM load 3480 pJ"); near(h.total / f.total, 35.7, 0.1, "35 FMA instrs");
  ok(M.energyOp("smem").total === 88, "smem load 88 pJ");
  // 표·노트의 산수
  ok(64 * 32 * 32 * 4 === 256 * 1024 && 256 * 144 === 36864, "RF 256 KB, 36 MB");
  near(1536 * 1.6e9 / 1e12, 2.4576, 1e-9, "RF BW per SM"); near(1536 * 144 * 1.6e9 / 1e12, 353.9, 0.1, "RF BW chip"); near(353.9 / 7.3728, 48, 0.1, "48x HBM");
  near(128 * 64 / 144, 56.9, 0.1, "L2 share B/clk"); near(6 * 1228.8e9 / 1.6e9 / 144, 32, 1e-9, "HBM share B/clk"); near(64 * 1024 / 144, 455, 1, "L2 share KB");
  near(144 * 128 * 2 * 1.6e9 / 1e12, 58.98, 0.01, "FP32 59.0"); near(144 * 4 * 512 * 2 * 1.6e9 / 1e12, 943.7, 0.05, "BF16 943.7");
  near(160 * 3.2 / 780, 0.656, 0.001, "SM 66 % of die");
  near(0.8 + 0.45 + 0.42 + 0.35 + 0.35 + 0.30 + 0.28 + 0.25, 3.2, 1e-9, "area breakdown sums to 3.2");
  near(4 * (0.20 + 0.1125 + 0.0875 + 0.105 + 0.06 + 0.05) + 0.35 + 0.06 + 0.05 + 0.28, 3.2, 1e-9, "3D floorplan areas sum to 3.2");
}

console.log("gpu sm sims ok (" + n + " checks)");
