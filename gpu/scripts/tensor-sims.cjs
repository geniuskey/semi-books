#!/usr/bin/env node
/* Copyright (c) 2026 geniuskey and GPUBook contributors. MIT.
 * 5장 텐서 코어(chapters/tensor.html) 시뮬레이터 회귀 검사.
 * 장의 /* model:<이름> *\/ 블록을 잘라 node:vm에서 실행하고, 본문·GX-1 노트·해볼 것·퀴즈가 인용한 수치와
 * 극단 입력(슬라이더 최소·최대)에서 NaN·음수·무한이 없는지 확인한다. 외부 패키지 없음, 1초 안.
 *   node gpu/scripts/tensor-sims.cjs
 */
"use strict";
const assert = require("node:assert/strict"), fs = require("node:fs"), path = require("node:path"), vm = require("node:vm");
const html = fs.readFileSync(path.join(__dirname, "..", "chapters", "tensor.html"), "utf8");
const NAMES = ["gemm", "rf", "systolic", "dot", "tcio", "sparse", "mx", "area", "npu"];
const src = NAMES.map((n) => {
  const a = html.indexOf(`/* model:${n} */`), b = html.indexOf(`/* /model:${n} */`);
  assert.ok(a >= 0 && b > a, "model block " + n);
  return html.slice(a, b);
}).join("\n");
const ctx = vm.createContext({ Math, Array, Uint8Array, Float64Array, Infinity, Number, Object });
vm.runInContext(src + "\nthis.M = { GX, gxPeak, gemmModel, vectorFma, tensorFma, SP, sysRun, sysFormula, dotOuter, tcio, sp24Prune, sp24Storage, sp24Speedup, MXF, mxData, mxQuant, mxElem, areaModel, AR_DENS, FP32_DENS, npuUtil, gpuUtil, NPU_TOTAL };", ctx);
const M = ctx.M;
const near = (a, b, tol, msg) => assert.ok(Math.abs(a - b) <= tol, `${msg}: ${a} vs ${b}`);
const fin = (v, msg) => assert.ok(Number.isFinite(v) && v >= 0, `${msg} finite & ≥0: ${v}`);
const P2 = (e) => Math.pow(2, e);

/* GX-1 표와 맞물림 */
near(M.gxPeak("bf16") / 1e12, 943.7, 0.05, "BF16 peak");
near(M.gxPeak("fp8") / 1e12, 1887.4, 0.05, "FP8 peak");
near(M.gxPeak("fp4") / 1e12, 3774.9, 0.1, "FP4 peak");
near(M.gxPeak("fp32") / 1e12, 59.0, 0.05, "FP32 peak");
near(M.GX.hbm / 1e12, 7.3728, 1e-9, "HBM 7.37 TB/s");
near(M.gemmModel(8, 8, 8, "bf16").ridge, 128, 1e-9, "ridge BF16");
near(M.gemmModel(8, 8, 8, "fp8").ridge, 256, 1e-9, "ridge FP8");
near(M.gemmModel(8, 8, 8, "fp32").ridge, 8, 1e-9, "ridge FP32");

/* 1. GEMM */
{
  const g = M.gemmModel(4096, 4096, 4096, "bf16");
  near(g.I, 1365.3, 0.1, "4096³ I"); near(g.t * 1e6, 145.6, 0.1, "4096³ time"); assert.equal(g.bound, "compute");
  near(M.gemmModel(384, 384, 384, "bf16").I, 128, 1e-9, "n=384 hits ridge");
  const v = M.gemmModel(1, 8192, 8192, "bf16");
  near(v.I, 1.0, 0.01, "GEMV I"); near(v.perf / 1e12, 7.4, 0.05, "GEMV perf"); assert.ok(v.perf / v.peak < 0.01, "GEMV < 1% peak");
  for (const p of ["bf16", "fp8", "fp32"]) for (const m of [0, 14]) for (const n of [0, 14]) for (const k of [0, 14]) {
    const r = M.gemmModel(P2(m), P2(n), P2(k), p); fin(r.I, "gemm I"); fin(r.perf, "gemm perf"); assert.ok(r.perf <= r.peak * (1 + 1e-12));
  }
}

/* 2. 레지스터 대역폭·에너지 */
{
  const v1 = M.vectorFma(1), v4 = M.vectorFma(4), v8 = M.vectorFma(8), t = M.tensorFma(16, 8, 16, 64);
  assert.equal(v1.rfRead, 12); near(v1.eTot, 5.8, 1e-9, "vector r=1"); near(v4.eTot, 3.55, 1e-9, "vector r=4");
  assert.ok(v8.eTot > 3.1 && v8.eTot < 3.2, "vector r=8 ~3.2"); assert.ok(v8.eTot > v8.e.alu + v8.e.rf && v8.e.alu + v8.e.rf === 2.8, "floor 2.8 pJ");
  near(t.rfRead, 0.625, 1e-12, "tensor 0.625 B/FMA"); near(t.eTot, 0.333, 0.001, "tensor pJ");
  near(v4.eTot / t.eTot, 10.67, 0.01, "~1/11");
  assert.equal(M.SP.rfRead, 384); assert.equal(512 * v1.rfRead, 6144); assert.equal(6144 / 384, 16);
  near(512 * t.rfRead, 320, 1e-9, "320 B/clk");
  for (const tile of [[16, 8, 16], [16, 16, 16], [8, 8, 4]]) for (const W of [32, 64, 128]) fin(M.tensorFma(...tile, W).eTot, "tensorFma");
}

/* 3. 내적 vs 외적 */
{
  for (const F of [256, 512, 1024]) for (let L = 1; L <= F; L *= 2) { const d = M.dotOuter(L, F); assert.equal(d.adders, F, "adders constant"); assert.equal(d.r * d.c * L, F); fin(d.inputs, "inputs"); }
  const d1 = M.dotOuter(1), d4 = M.dotOuter(4), d512 = M.dotOuter(512);
  assert.equal(d1.r + "x" + d1.c, "16x32"); assert.equal(d1.inputs, 48); assert.equal(d1.wide, 512); assert.equal(d1.accBits / 8 / 1024, 2);
  assert.equal(d4.r + "x" + d4.c, "8x16"); assert.equal(d4.inputs, 96); assert.equal(d4.wide, 128);
  assert.equal(d512.inputs, 1024); assert.equal(d512.inBytes, 2048);
}

/* 4. 시스톨릭 배열: 사이클 시뮬레이션 = 해석식, 결과 행렬 정확 */
{
  for (const flow of ["ws", "os"]) for (const ov of [false, true]) for (let N = 2; N <= 9; N++) for (const S of [1, 2, 3, 5, 8, 13, 21]) {
    const r = M.sysRun(N, S, flow, ov, N * 101 + S), f = M.sysFormula(N, S, ov);
    assert.ok(r.match, `C correct ${flow} N=${N} S=${S}`);
    assert.equal(r.T, f.T, `cycles ${flow} N=${N} S=${S} ov=${ov}`);
    assert.equal(r.macs, N * N * S); near(r.util, f.U, 1e-12, "util");
    assert.equal(r.runCycles, S + 2 * N - 2);
  }
  const a = M.sysRun(4, 8, "ws", false, 3), b = M.sysRun(4, 8, "ws", true, 3);
  assert.equal(a.T, 18); near(a.util, 0.4444, 1e-4, "N4 S8"); assert.equal(b.T, 14); near(b.util, 0.5714, 1e-4, "N4 S8 overlap");
  near(M.sysFormula(16, 4, false).U, 0.08, 1e-9, "N16 S4"); near(M.sysFormula(16, 4, true).U, 0.1176, 1e-4, "N16 S4 ov");
  near(M.sysFormula(16, 16, false).U, 0.258, 0.001, "quiz 4");
  near(M.sysFormula(128, 128, false).U, 0.251, 0.001, "N128 S128"); near(M.sysFormula(128, 8192, false).U, 0.955, 0.001, "N128 S8192");
  for (const flow of ["ws", "os"]) { const e = M.sysRun(16, 64, flow, false, 9); assert.ok(e.match && e.T === 64 + 46); const e1 = M.sysRun(2, 1, flow, true, 1); assert.ok(e1.match && e1.T === 3); }
}

/* 5. 텐서 코어 입출력 */
{
  const base = M.tcio("bf16", 16, 8, 16, 64, 64, 1, false);
  assert.equal(base.cyc, 4); assert.equal(base.rfRead, 320); assert.equal(base.rfWrite, 128); assert.equal(base.smem, 128); assert.equal(base.regs, 128);
  assert.equal(base.frac, 1); near(base.tflops, 943.7, 0.05, "tcio base");
  near(base.rfRead / M.SP.rfRead, 0.833, 0.001, "RF 83%");
  near(M.tcio("bf16", 16, 8, 16, 32, 32, 1, false).tflops, 471.9, 0.05, "32x32 halves");
  assert.equal(M.tcio("bf16", 16, 8, 16, 32, 32, 1, false).smem, 256);
  assert.equal(M.tcio("bf16", 16, 8, 16, 64, 64, 4, false).smem, 80);
  const f16 = M.tcio("fp8", 16, 8, 16, 64, 64, 1, false), f32 = M.tcio("fp8", 16, 8, 32, 64, 64, 1, false);
  assert.equal(f16.rfWrite, 256); assert.equal(f16.frac, 0.5); near(f32.tflops, 1887.4, 0.05, "fp8 k32");
  // 정사각 워프 타일 최소 64 (퀴즈 6)
  assert.ok(M.tcio("bf16", 16, 8, 16, 64, 64, 1, false).smem <= 128 && M.tcio("bf16", 16, 8, 16, 32, 32, 1, false).smem > 128);
  assert.equal(M.tcio("bf16", 16, 8, 16, 256, 256, 1, false).fit, false);
  for (const p of ["bf16", "fp8", "fp4"]) for (const m of [3, 6]) for (const n of [3, 7]) for (const k of [2, 7]) for (const wm of [4, 8]) for (const wn of [4, 8]) for (const g of [1, 4]) for (const acc of [false, true]) {
    const r = M.tcio(p, P2(m), P2(n), P2(k), P2(wm), P2(wn), g, acc);
    [r.cyc, r.rfRead, r.rfWrite, r.smem, r.regs, r.frac, r.tflops].forEach((v) => fin(v, "tcio"));
    assert.ok(r.frac <= 1);
  }
}

/* 6. 2:4 희소성 */
{
  assert.equal(M.sp24Storage(16), 0.5625); assert.equal(M.sp24Storage(8), 0.625); assert.equal(M.sp24Storage(4), 0.75);
  near(M.sp24Speedup(Math.pow(10, 0.6), 0.8, 0.8, 16), 1.667, 0.001, "compute-bound 1.67");
  near(M.sp24Speedup(0.1, 0.8, 0.8, 16), 1.389, 0.001, "memory-bound 1.39");
  near(M.sp24Speedup(4, 1, 0.8, 16), 2, 1e-12, "max 2");
  near(M.sp24Speedup(0.03, 1, 1, 16), 1 / 0.5625, 1e-9, "pure bandwidth 1.78");
  for (const b of [16, 8, 4]) for (const x of [-1.5, 0, 1.5]) for (const f of [0, 1]) for (const w of [0, 1]) { const s = M.sp24Speedup(Math.pow(10, x), f, w, b); fin(s, "speedup"); assert.ok(s >= 1 - 1e-12 && s <= 2 + 1e-12); }
  const pr = M.sp24Prune([0.9, 0.1, -0.2, -1.3, 0.0, 0.7, -0.5, 0.3]);
  assert.deepEqual(Array.from(pr.keep), [0.9, -1.3, 0.7, -0.5]); assert.deepEqual(Array.from(pr.idx), [0, 3, 1, 2]);   // 그림 5-7
  let s = 12345; const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647, w = [];
  for (let i = 0; i < 40000; i++) w.push(Math.sqrt(-2 * Math.log(rnd())) * Math.cos(2 * Math.PI * rnd()));
  near(M.sp24Prune(w).removed, 0.13, 0.01, "Gaussian removed energy ~13%");
}

/* 7. 마이크로스케일링 */
{
  const F = M.MXF;
  assert.deepEqual([0.24, 0.6, 1.2, 2.6, 5.1, 7, -100].map((x) => M.mxElem(x, F.fp4)), [0, 0.5, 1, 3, 6, 6, -6]);
  assert.equal(M.mxElem(500, F.fp8), 448); assert.equal(M.mxElem(1 / 512, F.fp8), 1 / 512);   // E4M3 최소 비정규수 2^-9
  const out = M.mxData("outlier", 4096, 7), q = (d, B, f) => M.mxQuant(d, B, F[f]);
  near(q(out, 32, "fp4").snr, 15.6, 0.1, "FP4 B32 outlier"); near(q(out, 4096, "fp4").snr, 7.2, 0.1, "FP4 per-tensor");
  near(q(out, 32, "int8").snr, 35.1, 0.1, "INT8 B32"); near(q(out, 4096, "int8").snr, 23.7, 0.1, "INT8 per-tensor");
  assert.ok(q(out, 32, "fp8").snr < q(out, 4096, "fp8").snr && q(out, 32, "fp8").clip > 0, "FP8 block saturates a little");
  const gainF4 = q(out, 32, "fp4").snr - q(out, 4096, "fp4").snr, gainI8 = q(out, 32, "int8").snr - q(out, 4096, "int8").snr;
  assert.ok(gainF4 > 8 && gainI8 < 11.5 && gainI8 > 11, "table 8–11 dB");
  near(q(out, 32, "fp4").bits, 4.25, 1e-12, "4.25 bits");
  for (const d of ["gauss", "outlier", "rows"]) { const x = M.mxData(d, 4096, 7); for (const f of Object.keys(F)) for (const e of [3, 12]) { const r = q(x, P2(e), f); fin(r.snr, "snr"); fin(r.bits, "bits"); } }
}

/* 8. 면적·전력 */
{
  const a = M.areaModel(0.2, "bf16"), f8 = M.areaModel(0.2, "fp8");
  near(a.tflops, 943.7, 0.05, "area 20%"); near(a.densRatio, 9.6, 1e-9, "9.6x"); near(a.dieShare, 0.131, 0.001, "die 13%");
  near(M.FP32_DENS, 333.3, 0.1, "FP32 333/mm2"); near(M.AR_DENS, 3200, 1e-6, "BF16 3200/mm2");
  near(a.pTensor, 94.4, 0.05, "94 W"); near(a.ePerFlopV, 1.775, 1e-9, "FP32 1.78 pJ/FLOP");
  near(f8.tflops, 1887.4, 0.05, "FP8 area"); near(f8.ePerFlopT, 0.0832, 0.0001, "FP8 pJ"); near(f8.eRatio, 21.3, 0.05, "1/21");
  for (const p of ["bf16", "fp8", "int8"]) for (const fr of [0.05, 0.5]) { const r = M.areaModel(fr, p); [r.tflops, r.densRatio, r.ePerFlopT, r.dieShare, r.pTensor].forEach((v) => fin(v, "area")); }
}

/* 9. NPU vs GPU */
{
  assert.equal(M.NPU_TOTAL, 294912); assert.equal(M.NPU_TOTAL / (128 * 128), 18);
  const U = (m, n, k, b, R) => [M.npuUtil(m, n, k, b, R, true).util, M.gpuUtil(m, n, k, b, true).util];
  let [n, g] = U(64, 64, 64, 4096, 128); near(n, 0.124, 0.001, "att NPU"); near(g, 0.972, 0.001, "att GPU");
  [n, g] = U(8192, 8192, 8192, 1, 128); assert.ok(n > 0.997 && g > 0.997, "big both ≥99.7%");
  [n, g] = U(512, 512, 512, 1, 128); near(n, 0.594, 0.001, "mid NPU"); near(g, 0.837, 0.001, "mid GPU");
  near(M.npuUtil(512, 512, 512, 1, 32, true).util, 0.793, 0.001, "mid NPU R32"); assert.equal(M.npuUtil(8, 8, 8, 1, 32, true).E, 288);
  [n, g] = U(8, 8192, 8192, 1, 128); near(n, 0.062, 0.001, "dec NPU"); near(g, 0.189, 0.001, "dec GPU");
  for (const R of [32, 64, 128]) for (const m of [3, 14]) for (const nn of [3, 14]) for (const k of [3, 14]) for (const b of [0, 12]) {
    const [x, y] = U(P2(m), P2(nn), P2(k), P2(b), R); fin(x, "npu"); fin(y, "gpu"); assert.ok(x <= 1 && y <= 1, `util ≤ 1 (${m},${nn},${k},${b},${R})`);
  }
}

console.log("gpu tensor sims ok");
