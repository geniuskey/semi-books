#!/usr/bin/env node
/* Copyright (c) 2026 geniuskey and GPUBook contributors. MIT.
   15장 워크로드(chapters/workloads.html) 시뮬레이터 모델 회귀 검사.
   장 스크립트의 /* model:<이름> *\/ 블록을 잘라 node:vm에서 실행하고,
   본문·GX-1 노트·해볼 것·퀴즈가 인용한 수치와 극단 입력에서의 유한성을 확인한다. */
"use strict";
const fs = require("fs"), vm = require("vm"), path = require("path"), assert = require("assert");
const html = fs.readFileSync(path.join(__dirname, "..", "chapters", "workloads.html"), "utf8");
const NAMES = ["base", "train", "infer", "batch", "kv", "quant", "moe", "gfx", "area"];
const block = (n) => { const a = "/* model:" + n + " */", b = "/* /model:" + n + " */", i = html.indexOf(a), j = html.indexOf(b, i); assert(i >= 0 && j > i, "model block " + n); return html.slice(i, j); };
const ctx = { Math, Number, Object, Array, isFinite, Infinity };
vm.createContext(ctx);
vm.runInContext(NAMES.map(block).join("\n") + "\nthis.M = { GX, LM, kvPerToken, trainCalc, decodeStep, prefill, serve, decodeI, ridge, crossoverB, iInf, bMax, peakFrac, kvCap, quantRow, moeCalc, MOE, gfxFrame, GXG, areaPerf, areaChip, AREA };", ctx);
const M = ctx.M;
let n = 0;
const near = (x, want, tol, msg) => { assert(Math.abs(x - want) <= tol, msg + ": got " + x + ", want " + want + " ± " + tol); n++; };
const ok = (c, msg) => { assert(c, msg); n++; };
const fin = (o, msg) => { for (const [k, v] of Object.entries(o)) if (typeof v === "number") assert(isFinite(v) && !(v < 0), msg + " " + k + "=" + v); else if (v && typeof v === "object") fin(v, msg + "." + k); n++; };

/* GX-1 표와 맞물린 상수 */
near(M.GX.peak.bf16 / 1e12, 943.7, 0.05, "BF16 peak");
near(M.GX.bw / 1e12, 7.3728, 1e-9, "HBM BW");
near(M.ridge("bf16"), 128, 0.01, "ridge BF16");
near(M.ridge("fp8"), 256, 0.01, "ridge FP8");
ok(M.kvPerToken("bf16") === 327680, "KV 320 KiB / token");
ok(M.kvPerToken("bf16", 64) === 2621440 && M.kvPerToken("bf16", 1) === 40960, "MHA 2.5 MiB, MQA 40 KiB");

/* 1. 학습 */
const T = M.trainCalc({ N: 70e9, D: 15e12, gpus: 4096, mfu: 0.4, prec: "bf16" });
near(T.flop, 6.3e24, 1e18, "6ND");
near(T.days, 47.16, 0.05, "47 days");
near(T.eGpuMWh, 4636, 2, "GPU MWh");
near(T.eNodeMWh, 6954, 3, "node MWh");
near(T.gpuH / 1e6, 4.636, 0.002, "GPU-hours");
near(T.tokPerSec / 1e6, 3.68, 0.01, "tokens/s");
ok(T.minGpus === 8 && T.stateB === 1.12e12, "state 1.12 TB, 8 GPUs");
near(M.trainCalc({ N: 70e9, D: 15e12, gpus: 4096, mfu: 0.4, prec: "fp8" }).days, 23.58, 0.05, "FP8 24 days");
near(T.days - M.trainCalc({ N: 70e9, D: 15e12, gpus: 4096, mfu: 0.5, prec: "bf16" }).days, 9.43, 0.05, "MFU 50 % saves ~9 days");
near(M.trainCalc({ N: 70e9, D: 15e12, gpus: 8, mfu: 0.4, prec: "bf16" }).days / 365, 66.1, 0.1, "8 GPUs ~66 years");
near(M.trainCalc({ N: 14e9, D: 2e12, gpus: 512, mfu: 0.5, prec: "bf16" }).days, 8.05, 0.05, "quiz 1: ~8 days");
for (const N of [1e9, 1e12]) for (const D of [1e11, 1e14]) for (const g of [8, 65536]) for (const m of [0.1, 0.7]) for (const p of ["bf16", "fp8"]) fin(M.trainCalc({ N, D, gpus: g, mfu: m, prec: p }), "train");

/* 2. 추론 */
near(M.decodeStep("fp8", "bf16", 1, 0).perSeq, 105.3, 0.1, "FP8 B1 105 tok/s");
near(M.decodeStep("fp8", "bf16", 1, 2048).perSeq, 104.3, 0.1, "FP8 B1 S2048 104 tok/s");
near(M.decodeStep("fp8", "bf16", 1, 0).tCmp * 1e3, 0.0742, 0.001, "140 GFLOP / 1887 TFLOPS");
const pf = M.prefill("fp8", "bf16", 2048);
near(pf.t * 1e3, 154.8, 0.2, "TTFT FP8 155 ms"); near(pf.tMem * 1e3, 9.59, 0.02, "prefill mem 9.6 ms"); near(pf.flops / 1e12, 292.2, 0.1, "292 TFLOP");
ok(pf.bound === "compute", "prefill compute bound");
near(M.prefill("bf16", "bf16", 2048).t * 1e3, 309.6, 0.3, "TTFT BF16 310 ms");
const d64 = M.decodeStep("fp8", "bf16", 64, 2048);
near(d64.t * 1e3, 15.32, 0.02, "B64 TPOT 15 ms"); near(d64.total, 4178, 2, "B64 4200 tok/s"); ok(d64.fits && d64.bound === "memory", "B64 fits, memory bound");
near(d64.total / M.decodeStep("fp8", "bf16", 1, 2048).total, 40.0, 0.2, "x40");
ok(!M.decodeStep("fp8", "bf16", 128, 2048).fits, "B128 exceeds 144 GB");
for (const p of ["bf16", "fp8", "fp4"]) for (const B of [1, 512]) for (const S of [0, 8192]) for (const L of [128, 8192]) fin(M.serve(p, B, S, L, 2048), "serve");

/* 3. 배치와 산술 강도 */
ok(M.crossoverB("bf16", "bf16", 2048, false) === 128 && M.crossoverB("fp8", "bf16", 2048, false) === 128, "B* = 128 without KV");
near(M.crossoverB("bf16", "bf16", 2048, true), 301.3, 0.2, "B* BF16 with KV");
ok(M.crossoverB("fp8", "bf16", 2048, true) === Infinity, "FP8 + BF16 KV never compute bound");
near(M.crossoverB("fp8", "fp8", 2048, true), 301.3, 0.2, "B* FP8 + FP8 KV");
near(M.iInf("fp8", "bf16", 2048), 216.6, 0.1, "I_inf 217"); near(M.iInf("fp8", "fp8", 2048), 433.2, 0.2, "I_inf 433");
ok(M.bMax("bf16", "bf16", 2048) === 5, "capacity wall B 5");
near(M.decodeI("bf16", "bf16", 5, 2048, true) / M.ridge("bf16") * 100, 3.96, 0.05, "~4 % utilization");
near(M.decodeI("bf16", "bf16", 1, 2048, false), 1, 1e-12, "I = B (BF16)"); near(M.decodeI("fp8", "bf16", 8, 0, false), 16, 1e-12, "I = 2B (FP8)");
for (const p of ["bf16", "fp8"]) for (const k of ["bf16", "fp8"]) for (const S of [256, 8192]) for (const B of [1, 1024]) for (const kv of [true, false]) ok(isFinite(M.decodeI(p, k, B, S, kv)) && M.decodeI(p, k, B, S, kv) > 0, "I finite");

/* 4. KV 캐시 */
const kv0 = { wPrec: "fp8", kvPrec: "bf16", kvHeads: 8, S: 8192, gpus: 1, reserve: 0 };
const K = M.kvCap(kv0);
ok(K.nSeq === 27 && K.free === 74e9, "27 sequences"); near(K.perSeq / 1e9, 2.684, 0.001, "2.68 GB / seq");
ok(M.kvCap(Object.assign({}, kv0, { kvPrec: "fp8" })).nSeq === 55, "KV FP8 55");
ok(M.kvCap(Object.assign({}, kv0, { kvHeads: 64 })).nSeq === 3, "MHA 3");
ok(M.kvCap(Object.assign({}, kv0, { S: 32768 })).nSeq === 6, "S 32768 -> 6");
ok(M.kvCap(Object.assign({}, kv0, { wPrec: "bf16", gpus: 2 })).nSeq === 55, "BF16 2 GPUs 55");
ok(M.kvCap(Object.assign({}, kv0, { wPrec: "bf16" })).nSeq === 1 && M.kvCap(Object.assign({}, kv0, { wPrec: "fp4" })).nSeq === 40, "fig 15-6: 1 / 27 / 40");
const d27 = M.decodeStep("fp8", "bf16", 27, 8192);
near(d27.bytes / 1e9, 142.5, 0.05, "27 seq step bytes"); near(d27.t * 1e3, 19.32, 0.02, "19 ms"); near(d27.total, 1397, 2, "1400 tok/s"); ok(d27.bound === "memory", "27 seq memory bound");
for (const w of ["bf16", "fp8", "fp4"]) for (const k of ["bf16", "fp4"]) for (const h of [1, 64]) for (const S of [512, 32768]) for (const g of [1, 8]) for (const r of [0, 40e9]) fin(M.kvCap({ wPrec: w, kvPrec: k, kvHeads: h, S, gpus: g, reserve: r }), "kv");

/* 5. 양자화 */
const q = (w, k, S) => M.quantRow(w, k, S);
ok(q("bf16", "bf16", 4096).bmax === 2 && q("fp8", "bf16", 4096).bmax === 55 && q("fp4", "bf16", 4096).bmax === 81, "bmax 2/55/81");
near(q("bf16", "bf16", 4096).tokMax, 103, 1, "BF16 ~100"); near(q("fp8", "bf16", 4096).tokMax, 2820, 2, "FP8 ~2800"); near(q("fp4", "bf16", 4096).tokMax, 4155, 2, "FP4 ~4200");
near(q("bf16", "bf16", 4096).tok1, 52.2, 0.1, "B1 52"); near(q("fp8", "bf16", 4096).tok1, 103.3, 0.1, "B1 103"); near(q("fp4", "bf16", 4096).tok1, 202.9, 0.1, "B1 203");
ok(q("fp8", "fp8", 4096).bmax === 110 && Math.abs(q("fp8", "fp8", 4096).tokMax / q("fp8", "bf16", 4096).tokMax - 2) < 0.01, "KV FP8 doubles");
near(M.GX.bw / 35e9, 210.7, 0.1, "quiz FP4 ~210");
for (const w of ["bf16", "fp8", "fp4"]) for (const k of ["bf16", "fp8", "fp4"]) for (const S of [512, 8192]) fin(q(w, k, S), "quant");

/* 6. MoE */
near(M.MOE.attn / 1e9, 12.08, 0.01, "attn params"); near(M.MOE.ffnDense / 1e9, 56.37, 0.01, "FFN params"); ok(M.MOE.other > 0, "other params > 0");
const m0 = { E: 16, k: 2, fe: 14336, B: 64, G: 8 };
const R = M.moeCalc(m0);
near(R.active / 1e9, 70.0, 0.01, "active 70 B"); near(R.total / 1e9, 464.6, 0.1, "total 465 B"); near(R.ratioMem, 6.64, 0.01, "x6.6"); ok(R.minG === 4, "min 4 GPUs");
near(R.U, 16.0, 0.01, "U ~16 at B64");
ok(M.moeCalc(Object.assign({}, m0, { B: 1 })).U === 2, "U 2 at B1");
near(M.moeCalc(Object.assign({}, m0, { B: 1 })).t, M.moeCalc({ E: 1, k: 1, fe: 28672, B: 1, G: 8 }).t, 1e-5, "B1 ~ dense");
const R8 = M.moeCalc(Object.assign({}, m0, { k: 8, fe: 3584 }));
near(R8.active / 1e9, 70.0, 0.01, "k8 same active"); near(R8.commTok / R.commTok, 4, 1e-9, "comm x4");
ok(!M.moeCalc(Object.assign({}, m0, { G: 1 })).fits, "G1 overflows");
for (const E of [1, 256]) for (const k of [1, 8]) for (const fe of [1024, 28672]) for (const B of [1, 512]) for (const G of [1, 64]) fin(M.moeCalc({ E, k: Math.min(k, E), fe, B, G }), "moe");

/* 7. 그래픽 */
const ffAll = { raster: true, tex: true, rop: true, rt: true };
const g0 = { res: "4k", tris: Math.pow(10, 6.7), vInstr: 300, pInstr: 10000, hitInstr: 500, rpp: 1, od: 1.5, texPx: 32, ropPx: 6, ff: ffAll };
const G0 = M.gfxFrame(g0), Gn = M.gfxFrame(Object.assign({}, g0, { ff: {} }));
near(G0.frame * 1e3, 4.5, 0.05, "4.5 ms"); near(G0.fps, 222, 2, "~220 fps"); ok(G0.bott === "shader", "shader bound");
near(G0.times.rt * 1e3, 2.4, 0.03, "RT 2.4 ms"); near(G0.visits, 44.5, 0.1, "~45 visits");
near(Gn.frame * 1e3, 9.9, 0.05, "all off 9.9 ms"); near(Gn.fps, 101, 1, "~100 fps"); near(Gn.frame / G0.frame, 2.2, 0.03, "x2.2");
const off = (k) => { const f = Object.assign({}, ffAll); f[k] = false; return M.gfxFrame(Object.assign({}, g0, { ff: f })); };
near((off("rt").frame - G0.frame) * 1e3, 4.5, 0.05, "RT emu +4.5 ms"); near((off("tex").frame - G0.frame) * 1e3, 0.81, 0.02, "tex emu +0.8 ms");
ok((off("raster").frame - G0.frame) * 1e3 < 0.05, "raster off ~ no change");
const G1e8 = M.gfxFrame(Object.assign({}, g0, { tris: 1e8 }));
ok(G1e8.bott === "raster" && Math.abs(G1e8.frame * 1e3 - 10.4) < 0.1, "1e8 tris raster ~10 ms");
for (const res of ["1080p", "4k"]) for (const t of [1e5, 1e8]) for (const p of [1000, 30000]) for (const x of [4, 128]) for (const r of [0, 4]) for (const ff of [ffAll, {}]) fin(M.gfxFrame(Object.assign({}, g0, { res, tris: t, pInstr: p, texPx: x, rpp: r, ff })), "gfx");

/* 8. 면적 배분 */
const A1 = M.areaPerf(M.AREA.gx1), AG = M.areaPerf(M.AREA.gxg);
for (const k of ["train", "dec", "gfx", "sci"]) near(A1[k], 1, 1e-9, "GX-1 = 1 " + k);
near(M.areaChip(M.AREA.gx1).ten / 1e12, 943.7, 0.05, "GX-1 tensor"); near(M.areaChip(M.AREA.gx1).p32 / 1e12, 58.98, 0.01, "GX-1 FP32"); near(M.areaChip(M.AREA.gx1).sramMB, 136, 1e-6, "GX-1 SRAM 136 MB");
near(AG.gfx, 6.18, 0.01, "GX-G gfx 6.2"); near(AG.train, 0.368, 0.002, "GX-G train 0.37"); near(AG.sci, 0.068, 0.001, "GX-G sci 0.07"); near(AG.dec, 1.057, 0.002, "GX-G dec 1.06");
const AT = M.areaPerf({ vec: 10, ten: 70, sram: 20, ff: 0, fp64: "half" });
near(AT.train, 1.065, 0.002, "ten70 train 1.07"); near(AT.gfx, 0.294, 0.002, "ten70 gfx 0.29"); near(AT.chip.ten / M.GX.peak.bf16, 2.06, 0.01, "ten70 peak x2.1");
const AS = M.areaPerf({ vec: 34, ten: 56, sram: 10, ff: 0, fp64: "half" });
near(AS.train, 0.879, 0.002, "SRAM 10 % train 0.9"); near(AS.chip.ten / M.GX.peak.bf16, 1.647, 0.002, "x1.6 tensor");
for (const v of [0, 100]) for (const t of [0, 100]) for (const s of [0, 100]) for (const f of [0, 100]) for (const d of ["half", "low"]) fin(M.areaPerf({ vec: v, ten: t, sram: s, ff: f, fp64: d }), "area");

console.log("gpu workloads sims ok");
