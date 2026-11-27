#!/usr/bin/env node
/* 7장 루프라인(chapters/roofline.html) 시뮬레이터 모델 회귀 검사.
   장 스크립트의 /* model:<이름> *\/ 블록을 잘라 node:vm에서 실행하고,
   본문·GX-1 노트·해볼 것·퀴즈가 인용한 수치와 극단 입력(NaN·음수·무한 없음)을 확인한다. 외부 패키지 없음. */
"use strict";
const fs = require("fs"), vm = require("vm"), path = require("path"), assert = require("assert");
const html = fs.readFileSync(path.join(__dirname, "..", "chapters", "roofline.html"), "utf8");
const names = ["gx1", "kernels", "tile", "fusion", "hier", "prec", "wall", "design"];
let src = "";
for (const n of names) {
  const a = "/* model:" + n + " */", b = "/* /model:" + n + " */", i = html.indexOf(a), j = html.indexOf(b);
  assert(i >= 0 && j > i, "model block " + n);
  src += html.slice(i + a.length, j) + "\n";
}
const ctx = { Math, Object, Array, Number, Int32Array, isFinite, Infinity };
vm.createContext(ctx);
vm.runInContext(src + "\nthis.M = { GX, roof, roofMulti, KERNELS, KSIZE, kernelPoint, tileRC, gemmTile, tileI, fusion, hierGemm, PMODES, linearLayer, wall, MIXES, designPoint, designBest };", ctx);
const M = ctx.M, GX = M.GX;
let n = 0;
const ok = (c, m) => { assert(c, m); n++; };
const near = (x, y, tol, m) => ok(Math.abs(x - y) <= tol, m + ": " + x + " vs " + y);
const fin = (x, m) => ok(typeof x === "number" && isFinite(x) && x >= 0, m + " finite/non-negative: " + x);
const T = 1e12;

/* 1. GX-1 표에서 계산한 피크·대역폭·리지 */
near(GX.peak.bf16 / T, 943.7, 0.05, "BF16 peak");
near(GX.peak.fp32 / T, 59.0, 0.05, "FP32 peak");
near(GX.peak.fp8 / T, 1887.4, 0.1, "FP8 peak");
near(GX.bw.hbm / T, 7.3728, 1e-6, "HBM BW");
near(GX.bw.l2 / T, 13.107, 0.001, "L2 BW");
near(GX.bw.smem / T, 29.49, 0.01, "SMEM BW");
near(GX.peak.bf16 / GX.bw.hbm, 128, 1e-9, "ridge BF16 HBM");
near(GX.peak.fp8 / GX.bw.hbm, 256, 1e-9, "ridge FP8");
near(GX.peak.fp4 / GX.bw.hbm, 512, 1e-9, "ridge FP4");
near(GX.peak.fp32 / GX.bw.hbm, 8, 1e-9, "ridge FP32");
near(GX.peak.bf16 / GX.bw.l2, 72, 1e-9, "ridge BF16 L2");
near(GX.peak.bf16 / GX.bw.smem, 32, 1e-9, "ridge BF16 SMEM");
near(GX.peak.fp32 / GX.bw.l2, 4.5, 1e-9, "ridge FP32 L2");
near(GX.peak.fp8 / GX.bw.l2, 144, 1e-9, "ridge FP8 L2");
near(GX.peak.fp4 / GX.bw.smem, 128, 1e-9, "ridge FP4 SMEM");
near(12.3e12 / 460e9, 27, 0.5, "SC-64 ridge");
near(24 / 0.1, 240, 1e-9, "energy balance 24 pJ/B / 0.1 pJ/FLOP");
// 루프라인 시뮬레이터 해볼 것
{
  const r = M.roof(32, GX.peak.bf16, GX.bw.hbm); near(r.P / T, 235.9, 0.1, "I=32 → 236 TFLOPS"); near(r.frac, 0.25, 1e-9, "25 %"); ok(r.bound === "memory", "I=32 memory");
  near(M.roof(32, GX.peak.bf16, 2 * GX.bw.hbm).P / T, 471.9, 0.1, "BW ×2 → 472");
  const g = M.roof(1000, GX.peak.bf16, 0.25 * GX.bw.hbm); ok(g.bound === "compute" && Math.abs(g.ridge - 512) < 1e-9, "BW ×0.25 ridge 512, compute");
  ok(M.roof(128, GX.peak.fp8, GX.bw.hbm).bound === "memory" && M.roof(128, GX.peak.bf16, GX.bw.hbm).bound === "compute", "I=128 flips under FP8");
}

/* 2. 커널 카탈로그 */
{
  const kp = (k, s, p) => M.kernelPoint(k, s, p || "bf16");
  near(kp("vadd", 2 ** 26).I, 1 / 6, 1e-12, "vadd 1/6");
  near(kp("saxpy", 2 ** 26).I, 1 / 3, 1e-12, "saxpy");
  near(kp("reduce", 2 ** 26).I, 0.5, 1e-6, "reduce");
  near(kp("softmax", 2 ** 26).I, 1.25, 1e-12, "softmax");
  near(kp("lnorm", 2 ** 26).I, 2, 1e-12, "layernorm");
  near(kp("gemv", 8192).I, 1, 0.001, "GEMV ≈ 1");
  near(kp("gemm", 8192).I, 8192 / 3, 1e-6, "GEMM n/3");
  near(kp("gemm", 256).I, 85.33, 0.01, "GEMM 256 → 85"); near(kp("gemm", 256).P / T, 629, 1, "GEMM 256 → 629 TFLOPS"); ok(kp("gemm", 256).bound === "memory", "GEMM 256 memory");
  ok(kp("gemm", 512).bound === "compute" && Math.abs(kp("gemm", 512).I - 170.7) < 0.1, "GEMM 512 compute, 171");
  near(kp("conv", 256).I, 1139, 1, "conv C=256 ≈ 1,140");
  near(kp("attn", 8192).I, 4096, 1e-9, "fused attention L/2");
  near(kp("attnU", 8192).I, 8192 * 128 / (2 * (8192 + 128)), 1e-9, "unfused attention Ld/(2(L+d))"); near(kp("attnU", 8192).I, 63, 0.1, "unfused 63");
  near(kp("attnU", 8192).P / T, 464.6, 0.2, "unfused 49 %");
  near(kp("attn", 8192).time * 1e3, 2.33, 0.01, "fused 2.3 ms"); near(kp("attnU", 8192).time * 1e3, 4.73, 0.01, "unfused 4.7 ms");
  near(kp("attnD", 8192).I, 8, 0.02, "decode attention ≈ 8");
  ok(kp("vadd", 2 ** 26, "fp32").time / kp("vadd", 2 ** 26).time > 1.99, "FP32 elementwise twice as slow");
  near(kp("vadd", 2 ** 26).I * GX.bw.hbm / GX.peak.bf16 * 100, 0.13, 0.005, "vadd 0.13 % of BF16 peak");
  // 모든 커널 × 크기 범위 끝 × 정밀도
  for (const k of Object.keys(M.KERNELS)) {
    const z = M.KSIZE[M.KERNELS[k].size];
    for (const p of [z.min, z.max]) for (const pr of ["fp32", "bf16"]) {
      const r = kp(k, z.val(p), pr);
      [r.flop, r.bytes, r.I, r.P, r.time].forEach((v) => fin(v, k + " " + p + " " + pr));
    }
  }
}

/* 3. GEMM 타일링 */
{
  const base = { M: 8192, N: 8192, K: 8192, bK: 64, stages: 3, e: 2, prec: "bf16" };
  const t = (o) => M.gemmTile(Object.assign({}, base, o));
  near(M.tileI(128, 128, 2), 64, 1e-9, "tile 128 → 64"); near(M.tileI(128, 256, 2), 85.33, 0.01, "tile 128×256 → 85"); near(M.tileI(144, 144, 2), 72, 1e-9, "b = 144 → L2 ridge");
  const d = t({ bM: 128, bN: 256, order: "group" });
  ok(d.smem === 144 * 1024 && d.regs === 128 * 1024 && d.ok, "default fits: smem 144 KB, regs 128 KB");
  ok(d.T === 2048 && d.waves === 15, "2048 tiles, 15 waves"); near(d.waveEff, 0.948, 0.001, "wave eff 94.8 %");
  near(d.IL2, 84.5, 0.1, "default L2 intensity ≈ 85"); near(d.IHBM, 794, 1, "group HBM ≈ 790"); near(d.P / T, 895, 1, "≈ 895 TFLOPS"); ok(d.lim === "compute", "default compute");
  const s128 = t({ bM: 128, bN: 128, order: "group" }); ok(s128.lim === "l2" && Math.abs(s128.P / T - 832) < 1, "128×128 L2-bound ≈ 832");
  ok(!t({ bM: 256, bN: 256, order: "group" }).okReg, "256×256 regs fail");
  ok(4 * 192 * 192 <= 0.75 * GX.regFile && 4 * 192 * 192 === 144 * 1024, "192 square fits, 144 KB");
  const r16 = M.gemmTile(Object.assign({}, base, { M: 16384, N: 16384, K: 16384, bM: 128, bN: 128, order: "row" }));
  const g16 = M.gemmTile(Object.assign({}, base, { M: 16384, N: 16384, K: 16384, bM: 128, bN: 128, order: "group" }));
  near(r16.IHBM, 141, 1, "row order 16384 HBM ≈ 141"); near(g16.IHBM, 710, 1, "group order 16384 HBM ≈ 710"); near(r16.IL2, g16.IL2, 1e-9, "order leaves L2 unchanged");
  // tileRC는 모든 타일을 한 번씩 덮는다
  for (const order of ["row", "group"]) for (const [TM, TN] of [[7, 5], [30, 12], [13, 40]]) {
    const seen = new Set(); for (let i = 0; i < TM * TN; i++) { const [r, c] = M.tileRC(i, TM, TN, order, 12); ok(r >= 0 && r < TM && c >= 0 && c < TN, "tileRC range"); seen.add(r * TN + c); }
    ok(seen.size === TM * TN, "tileRC bijection " + order + " " + TM + "x" + TN);
  }
  // 극단
  const t0 = Date.now();
  for (const nn of [1024, 16384]) for (const bm of [16, 256]) for (const bn of [16, 256]) for (const order of ["row", "group"]) {
    const r = M.gemmTile(Object.assign({}, base, { M: nn, N: nn, K: nn, bM: bm, bN: bn, bK: 128, stages: 4, order }));
    [r.P, r.IL2, r.IHBM, r.waveEff, r.l2Bytes, r.hbmBytes, r.time].forEach((v) => fin(v, "tile " + [nn, bm, bn, order]));
    ok(r.hbmBytes >= r.comp - 1 && r.l2Bytes >= r.hbmBytes - 1, "traffic ordering");
  }
  ok(Date.now() - t0 < 5000, "tile sweep finishes (no runaway loop)");
}

/* 4. 계층별 루프라인 */
{
  const h = (w, b, hh) => M.hierGemm({ n: 8192, w, b, h: hh, e: 2 });
  const f = h(64, 128, 0.9); near(f.levels[0].I, 32, 1e-9, "warp 64 → 32"); near(f.levels[1].I, 63.5, 0.1, "block 128 → 64"); near(f.levels[2].I, 525, 1, "h 0.9 → 525"); ok(f.lim === "l2" && Math.abs(f.P / T - 832) < 1, "fig 7-5 L2-limited 832");
  const w32 = h(32, 128, 0.9); ok(w32.lim === "smem" && Math.abs(w32.P / T - 472) < 1, "warp 32 → smem 472");
  const h0 = h(64, 128, 0); ok(h0.lim === "hbm" && Math.abs(h0.P / T - 468) < 1, "h 0 → HBM 468");
  near(h(64, 128, 0.5).levels[2].I, 124, 0.5, "h 0.5 → 124");
  const b256 = h(64, 256, 0.9); near(b256.levels[1].I, 126, 0.1, "block 256 → 126"); ok(b256.lim === "compute", "block 256 compute");
  for (const w of [16, 128]) for (const b of [128, 256]) for (const hh of [0, 0.99]) { const r = h(w, b, hh); fin(r.P, "hier"); r.levels.forEach((l) => fin(l.I, "hier I")); }
}

/* 5. 연산 융합 */
{
  const fu = (o) => M.fusion(Object.assign({ n: 2 ** 26, k: 3, f: 1, e: 2, launch: 3e-6 }, o));
  const d = fu({}); near(d.speed, 3, 1e-9, "fuse 3 → ×3"); near(d.unf.time * 1e6, 118.2, 0.1, "unfused 118 µs"); near(d.fus.time * 1e6, 39.4, 0.1, "fused 39 µs");
  near(d.unf.I, 0.25, 1e-12, "unfused I 0.25"); near(d.fus.I, 0.75, 1e-12, "fused I 0.75");
  near(fu({ f: 16 }).fus.I, 12, 1e-12, "f16 I 12"); near(fu({ f: 16 }).speed, 2.05, 0.01, "f16 ×2.05"); near(fu({ f: 32 }).speed, 1.05, 0.01, "f32 ×1.05");
  near(fu({ n: 2 ** 16 }).speed, 3, 0.01, "small n ×3");
  for (const k of [1, 8]) for (const f of [1, 64]) for (const nn of [2 ** 16, 2 ** 30]) for (const L of [0, 10e-6]) for (const e of [2, 4]) {
    const r = fu({ k, f, n: nn, launch: L, e }); [r.speed, r.unf.time, r.fus.time, r.fus.I].forEach((v) => fin(v, "fusion")); ok(r.speed >= 1 - 1e-12, "fusion never slower");
  }
}

/* 6. 정밀도 하향 */
{
  const L = (B, m) => M.linearLayer(B, m);
  near(L(32, "w16a16").time * 1e6, 18.35, 0.01, "B32 BF16 18.4 µs"); near(L(32, "w8a16").time * 1e6, 9.24, 0.01, "B32 W8A16 9.2");
  near(L(32, "w8a8").time * 1e6, 9.17, 0.01, "B32 FP8 9.2"); near(L(32, "w4a4").time * 1e6, 4.59, 0.01, "B32 FP4 4.6");
  near(L(32, "w16a16").I, 31.8, 0.05, "fig 7-8 BF16 I 32"); near(L(32, "w8a8").I, 63.5, 0.05, "FP8 I 64"); near(L(32, "w4a4").I, 127, 0.05, "FP4 I 127");
  near(L(32, "w16a16").P / T, 234, 0.5, "234 TFLOPS"); near(L(32, "w8a8").P / T, 468, 0.5, "468"); near(L(32, "w4a4").P / T, 936, 0.5, "936");
  const b = L(1024, "w16a16").time;
  near(b / L(1024, "w8a16").time, 1, 1e-9, "B1024 weight-only ×1"); near(b / L(1024, "w8a8").time, 2, 1e-9, "B1024 FP8 ×2"); near(b / L(1024, "w4a4").time, 4, 1e-9, "B1024 FP4 ×4");
  near(L(1, "w16a16").Bstar, 132.1, 0.1, "B* BF16 132"); near(L(1, "w8a16").Bstar, 66.1, 0.1, "B* W8A16 66"); near(L(1, "w8a8").Bstar, 132.1, 0.1, "B* FP8 132"); near(L(1, "w4a4").Bstar, 132.1, 0.1, "B* FP4 132");
  ok(L(128, "w16a16").bound === "memory" && L(1024, "w8a16").bound === "compute", "bounds");
  // GX-1 노트: GX-LM-70B 배치 1 디코드
  near(2 * GX.bw.hbm / T, 14.7, 0.05, "decode 14.7 TFLOPS"); near(2 * GX.bw.hbm / GX.peak.fp8 * 100, 0.78, 0.01, "0.8 % of FP8"); near(70e9 / GX.bw.hbm * 1e3, 9.5, 0.05, "9.5 ms/token"); near(GX.bw.hbm / 70e9, 105, 0.5, "105 tok/s");
  for (const m of Object.keys(M.PMODES)) for (const B of [1, 4096]) { const r = L(B, m); [r.I, r.P, r.time, r.Bstar].forEach((v) => fin(v, "prec " + m + " " + B)); }
}

/* 7. 메모리 장벽 */
{
  const w = M.wall({ gP: 3, gB: 1.6, years: 10, R0: 16, I: Math.pow(10, 1.8) });
  near(w.dbl, 2.2, 0.01, "ridge doubles every 2.2 y"); near(w.end.P, 243, 1e-9, "×243"); near(w.end.B, 10.49, 0.01, "×10.5"); near(w.end.R, 370.8, 0.1, "ridge 371");
  near(w.end.frac, 0.170, 0.001, "I 63 kernel 17 %"); ok(w.pts[0].frac === 1, "starts at peak");
  ok(M.wall({ gP: 3, gB: 3, years: 10, R0: 16, I: 10 }).end.R === 16 && !isFinite(M.wall({ gP: 3, gB: 3, years: 10, R0: 16, I: 10 }).dbl), "equal growth → no wall");
  near(M.wall({ gP: 2, gB: 1.6, years: 10, R0: 8, I: 10 }).end.R, 24.4, 0.1, "R0 8, 2.0/1.6 → 24");
  for (const gP of [1.2, 4]) for (const gB of [1.1, 3]) for (const y of [4, 20]) for (const R0 of [2, 64]) for (const I of [1, 1000]) {
    const r = M.wall({ gP, gB, years: y, R0, I }); r.pts.forEach((p) => [p.P, p.B, p.R, p.frac].forEach((v) => fin(v, "wall"))); ok(r.dbl > 0, "dbl positive");
  }
}

/* 8. 설계자 관점 */
{
  const d6 = M.designPoint(6, "train");
  near(d6.peak / T, 943.7, 0.05, "s=6 reproduces GX-1 peak"); near(d6.bw / T, 7.3728, 1e-9, "s=6 BW"); near(d6.ridge, 128, 1e-9, "s=6 ridge");
  const bt = M.designBest("train", 1, 8); ok(bt.s === 7 && Math.abs(bt.P / T - 724) < 1, "train best 7 → 724"); near(d6.P / T, 718, 1, "GX-1 train 718"); ok(bt.P / d6.P < 1.01, "within 1 %");
  near(d6.parts[2].share, 0.24, 0.005, "elementwise 24 % of time");
  const bd = M.designBest("decode", 1, 8); ok(bd.s === 8, "decode best at shoreline 8"); near(M.designPoint(6, "decode").P / T, 117, 1, "decode 117"); near(bd.P / T, 157, 1, "decode 157");
  near(bd.P / M.designPoint(6, "decode").P, 4 / 3, 1e-9, "decode +33 % (8/6)");
  ok(M.designBest("gemm", 1, 8).s === 1, "GEMM-only best 1 stack");
  near(M.designPoint(8, "gemm").P / M.designPoint(6, "gemm").P, 0.934, 0.001, "GEMM −7 %"); near(M.designPoint(8, "gemm").ridge, 89.7, 0.1, "s=8 ridge ≈ 90");
  for (const m of Object.keys(M.MIXES)) for (const s of [1, 12]) { const r = M.designPoint(s, m); [r.P, r.peak, r.bw, r.ridge].forEach((v) => fin(v, "design " + m + " " + s)); r.parts.forEach((p) => fin(p.share, "share")); }
}

console.log("gpu roofline sims ok");
