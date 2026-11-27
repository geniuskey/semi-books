#!/usr/bin/env node
/* 4장 연산 유닛과 수 표현(chapters/alu.html) 시뮬레이터 회귀 검사.
   장의 스크립트에서 /* model:<이름> *\/ 블록을 잘라 node:vm에서 실행하고, 비트 단위 반올림(최근접 짝수·비정규수·넘침)의
   대표값, 본문·GX-1 노트·해볼 것·퀴즈가 인용하는 수치, 슬라이더 끝값에서의 유한성을 확인한다. 외부 패키지 없음.
   누산 시뮬레이터가 수십만 번 반올림하므로 vm.runInThisContext로 함수 하나에 감싸 실행한다(새 컨텍스트는 10배 느리다). */
"use strict";
const fs = require("fs"), vm = require("vm"), path = require("path"), assert = require("assert");
const html = fs.readFileSync(path.join(__dirname, "../chapters/alu.html"), "utf8");
const NAMES = ["fp", "fma", "area", "perf", "acc", "sfu", "quant", "parse"];
const src = NAMES.map((n) => {
  const a = `/* model:${n} */`, b = `/* /model:${n} */`, i = html.indexOf(a), j = html.indexOf(b, i);
  assert(i >= 0 && j > i, "model block " + n);
  return html.slice(i, j + b.length);
}).join("\n");
const M = vm.runInThisContext("(function () {\n" + src + "\nreturn { FMT, encode, decodeBits, roundExact, rq, allPositive, relSpacing, fmaTrace, macArea, areaOf, areaRatio, AREA_FMTS, A_FP32, PERF, perfRow, vOf, dotRun, accCurve, sfuErr, qData, qScale, qErr, fp8Err, parseNum };\n})", { filename: "alu-models.js" })();
const F = M.FMT;
let n = 0;
const ok = (c, m) => { assert(c, m); n++; };
const near = (v, t, tol, m) => ok(Math.abs(v - t) <= tol, `${m}: ${v} vs ${t}`);
const fin = (v, m) => ok(Number.isFinite(v) && v >= 0, `${m}: ${v}`);
const enc = (x, k) => M.encode(x, F[k]);

/* 1. 포맷 상수 */
ok(F.fp16.max === 65504 && F.e5m2.max === 57344 && F.e4m3.max === 448 && F.e2m1.max === 6, "max values");
near(F.bf16.max, 3.3895313892515355e38, 1e24, "BF16 max");
near(F.fp32.max, 3.4028234663852886e38, 1e24, "FP32 max");
ok(F.fp16.minSub === Math.pow(2, -24) && F.fp16.minNormal === Math.pow(2, -14), "FP16 min");
ok(F.e4m3.minSub === Math.pow(2, -9) && F.e4m3.minNormal === Math.pow(2, -6) && F.e5m2.minSub === Math.pow(2, -16), "FP8 min");
ok(F.e2m1.minSub === 0.5 && F.e2m1.minNormal === 1, "FP4 min");
ok(F.bf16.eps === Math.pow(2, -7) && F.bf16.u === Math.pow(2, -8) && F.fp32.u === Math.pow(2, -24), "eps/u");
[["fp32", 83.4], ["tf32", 79.5], ["fp16", 12.0], ["bf16", 78.6], ["e5m2", 9.6], ["e4m3", 5.4], ["e2m1", 1.1]].forEach(([k, d]) => near(F[k].decades, d, 0.05, "decades " + k));

/* 2. 비트 단위 RNE·비정규수·넘침 */
ok(enc(65504, "fp16").value === 65504 && enc(65504, "fp16").bits === 0x7bff, "FP16 65504 = 0x7BFF");
ok(enc(65519, "fp16").value === 65504, "65519 → 65504");
ok(enc(65520, "fp16").value === Infinity && enc(65520, "fp16").bits === 0x7c00, "65520 → +Inf (tie to even overflows)");
ok(enc(1 + Math.pow(2, -7), "bf16").value === 1 + Math.pow(2, -7) && enc(1 + Math.pow(2, -7), "bf16").bits === 0x3f81, "BF16 1+2^-7 = 0x3F81");
ok(enc(1 + Math.pow(2, -8), "bf16").value === 1, "BF16 1+2^-8 tie → 1 (even)");
ok(enc(1 + 3 * Math.pow(2, -8), "bf16").value === 1 + Math.pow(2, -6), "BF16 1+3·2^-8 tie → 1+2^-6 (even)");
ok(enc(1 + Math.pow(2, -8) + Math.pow(2, -30), "bf16").value === 1 + Math.pow(2, -7), "BF16 just above tie → up (sticky)");
ok(enc(0.1, "fp32").bits === 0x3dcccccd && enc(0.1, "bf16").bits === 0x3dcd, "0.1 bits");
near(Math.abs(enc(0.1, "fp32").value - 0.1) / 0.1, 1.49e-8, 0.01e-8, "0.1 FP32 rel err");
near(Math.abs(enc(0.1, "bf16").value - 0.1) / 0.1, 9.77e-4, 0.01e-4, "0.1 BF16 rel err");
ok(enc(1, "fp32").bits === 0x3f800000 && enc(-2, "fp16").bits === 0xc000, "1.0 / -2 bits");
ok(enc(464, "e4m3").value === 448 && !enc(464, "e4m3").over, "E4M3 464 tie → 448 (even)");
ok(enc(465, "e4m3").value === 448 && enc(465, "e4m3").over && enc(1e9, "e4m3").value === 448, "E4M3 saturates");
ok(enc(Infinity, "e4m3").value === 448 && enc(-Infinity, "e2m1").value === -6, "E4M3/E2M1 have no Inf");
ok(enc(5, "e2m1").value === 4 && enc(5.0001, "e2m1").value === 6 && enc(0.25, "e2m1").value === 0 && enc(0.26, "e2m1").value === 0.5, "E2M1 rounding");
ok(enc(Math.pow(2, -25), "fp16").value === 0 && enc(3 * Math.pow(2, -26), "fp16").value === Math.pow(2, -24), "FP16 subnormal ties");
ok(enc(1e-6, "fp16").cls === "subnormal", "1e-6 is FP16 subnormal");
near(Math.abs(enc(1e-6, "fp16").value - 1e-6) / 1e-6, 0.0133, 0.0005, "1e-6 FP16 rel err");
ok(enc(F.fp16.minNormal * (1 - Math.pow(2, -12)), "fp16").cls === "normal", "rounds up into min normal");
ok(enc(57344, "e5m2").value === 57344 && enc(61440, "e5m2").value === Infinity, "E5M2 max / overflow tie");
ok(enc(NaN, "fp16").cls === "nan" && enc(NaN, "e4m3").bits === 0x7f, "NaN encodings");
ok(M.decodeBits(0x7f, F.e4m3).cls === "nan" && M.decodeBits(0x7e, F.e4m3).value === 448 && M.decodeBits(0x78, F.e4m3).value === 256, "E4M3 top exponent is finite");
ok(M.decodeBits(0x7c, F.e5m2).value === Infinity && M.decodeBits(0x7d, F.e5m2).cls === "nan", "E5M2 Inf/NaN");
ok(M.allPositive(F.e2m1).join() === "0.5,1,1.5,2,3,4,6", "E2M1 values");
ok(M.allPositive(F.e4m3).length === 126 && M.allPositive(F.e5m2).length === 123, "FP8 positive counts");
// 모든 코드: 해독 → 다시 반올림하면 같은 코드(유한 값). FP16 65536개 포함
for (const k of ["fp16", "e5m2", "e4m3", "e2m1"]) {
  const f = F[k], N = Math.pow(2, f.bits);
  let bad = 0;
  for (let b = 0; b < N; b++) { const d = M.decodeBits(b, f); if (!isFinite(d.value) || (d.value === 0 && d.s)) continue; if (M.encode(d.value, f).bits !== b) bad++; }
  ok(bad === 0, "roundtrip " + k + " bad " + bad);
}
// 빠른 rq = BigInt roundExact (임의 값 4,000개 × 7포맷, 비정규·넘침 영역 포함)
{
  let s = 12345, bad = 0;
  const R = () => ((s = (s * 1103515245 + 12345) % 2147483648) / 2147483648);
  for (const k of ["fp32", "tf32", "fp16", "bf16", "e5m2", "e4m3", "e2m1"]) for (let i = 0; i < 4000; i++) {
    const x = (R() - 0.5) * Math.pow(2, Math.floor(R() * 300) - 150);
    if (M.encode(x, F[k]).value !== M.rq(x, F[k])) bad++;
  }
  ok(bad === 0, "rq vs roundExact mismatches " + bad);
}
// 수직선 시뮬레이터 해볼 것
near(M.relSpacing(1e-6, F.fp16), 0.0596, 0.0005, "FP16 rel spacing at 1e-6");
near(M.relSpacing(1e-6, F.bf16), 0.00745, 0.0001, "BF16 rel spacing at 1e-6");

/* 3. FMA 추적 */
{
  const p = M.parseNum;
  ok(p("1+2^-10") === 1 + Math.pow(2, -10) && p("-(1+2^-9)") === -(1 + Math.pow(2, -9)) && p("1/512") === Math.pow(2, -9) && p("-2^2") === -4 && p("1e-6") === 1e-6 && p("3.14159265") === 3.14159265, "parseNum");
  ok(p("inf") === Infinity && Number.isNaN(p("nan")), "parse inf/nan");
  assert.throws(() => p("1+"), "parse error");
  const t = M.fmaTrace(p("1+2^-10"), p("1+2^-10"), p("-(1+2^-9)"), F.fp16);
  ok(t.R.value === Math.pow(2, -20) && t.R.cls === "subnormal" && t.U.value === 0, "FP16 cancellation: fused 2^-20, unfused 0");
  const c = M.fmaTrace(3, 5, 1 / 512, F.fp16);
  ok(c.R.value === 15 && c.shift === 12 && c.R.rb.g === 0 && c.R.rb.r === 1 && c.R.rb.st === 0 && !c.R.rb.up, "small c: shift 12, GRS 010 → 15");
  ok(M.fmaTrace(300, 300, 0, F.fp16).R.value === Infinity && M.fmaTrace(300, 300, 0, F.bf16).R.value === 90112, "300² overflow / BF16 90112");
  const cy = M.fmaTrace(1.5, 1.5, 1.75, F.fp16);
  ok(cy.R.value === 4 && cy.lzc === 0, "carry example 4, right shift");
  ok(M.fmaTrace(Infinity, 0, 1, F.fp32).special && Number.isNaN(M.fmaTrace(Infinity, 0, 1, F.fp32).R.value), "Inf×0 → NaN");
  // FMA는 정확값의 한 번 반올림: 무작위 FP32 삼중항을 double 정확값과 비교(곱이 48비트라 double FMA가 정확할 때만)
  let s = 7, bad = 0;
  const R = () => ((s = (s * 1103515245 + 12345) % 2147483648) / 2147483648);
  for (let i = 0; i < 300; i++) {
    const a = M.rq((R() - 0.5) * 8, F.fp16), b = M.rq((R() - 0.5) * 8, F.fp16), cc = M.rq((R() - 0.5) * 8, F.fp16);
    if (M.fmaTrace(a, b, cc, F.fp16).R.value !== M.rq(a * b + cc, F.fp16)) bad++;   // FP16 곱+덧셈은 double에서 정확
  }
  ok(bad === 0, "FP16 FMA = rq(exact) mismatches " + bad);
}

/* 4. 곱셈기 면적 모델 */
{
  const A = (k, acc, L) => M.areaRatio(M.AREA_FMTS.find((x) => x.k === k), acc, L);
  near(M.A_FP32, 1011.8, 0.2, "FP32 FMA area");
  near(A("bf16", "wide", 16).lanes, 5.87, 0.02, "BF16 L16");
  near(A("bf16", "wide", 1).lanes, 3.57, 0.02, "BF16 L1");
  near(A("e4m3", "wide", 16).lanes, 10.51, 0.03, "E4M3 L16 ≈ 1/10.5");
  near(A("e2m1", "wide", 16).lanes, 14.39, 0.03, "E2M1 L16 ≈ 1/14");
  near(A("e2m1", "same", 16).lanes, 38.4, 0.1, "E2M1 same-acc ≈ 1/38");
  near(A("fp64", "wide", 1).rel, 3.77, 0.01, "FP64 ≈ 3.8× FP32");
  near(A("int8", "wide", 16).lanes, 12.05, 0.03, "INT8 L16");
  near(A("e4m3", "wide", 16).lanes / A("bf16", "wide", 16).lanes, 1.79, 0.01, "BF16→E4M3 1/1.8");
  near(A("e2m1", "wide", 16).lanes / A("e4m3", "wide", 16).lanes, 1.37, 0.01, "E4M3→E2M1 1/1.4");
  near(A("bf16", "wide", 16).pJ, 0.136, 0.001, "BF16 energy est");
  near(A("e4m3", "wide", 16).pJ, 0.076, 0.001, "E4M3 energy est");
  near(A("int8", "wide", 16).pJ, 0.066, 0.001, "INT8 energy est");
  near(16 * A("fp64", "wide", 1).rel / 32, 1.88, 0.01, "FP64 lanes 1.9× FP32 lanes area");
  near(2 * A("fp64", "wide", 1).rel / 128, 0.059, 0.001, "1/64 FP64 ≈ 6 %");
  near(A("fp64", "wide", 1).a.total / A("bf16", "wide", 16).a.total, 22.1, 0.1, "FP64 = 22 BF16 MACs");
  ok(576 / 64 === 9 && 576 / 16 === 36 && 2809 / 576 > 4.87 && 2809 / 576 < 4.88, "multiplier ratios");
  for (const F2 of M.AREA_FMTS) for (const acc of ["wide", "same"]) for (const L of [1, 4, 16, 64]) { const r = M.areaRatio(F2, acc, L); fin(r.a.total, "area " + F2.k); fin(r.lanes, "lanes " + F2.k); }
}

/* 5. 정밀도별 처리량·전력 (GX-1 표) */
{
  const row = (k, sm = 144, f = 1.6, rf = false) => M.perfRow(M.PERF.find((x) => x.k === k), sm, f, rf);
  near(row("bf16").tflops, 943.7, 0.05, "BF16 943.7");
  near(row("fp8").tflops, 1887.4, 0.05, "FP8 1887");
  near(row("int8").tflops, 1887.4, 0.05, "INT8 1887");
  near(row("fp4").tflops, 3774.9, 0.05, "FP4 3775");
  near(row("fp32").tflops, 58.98, 0.01, "FP32 59.0");
  near(row("fp64").tflops, 29.49, 0.01, "FP64 29.5");
  near(row("tf32").tflops, 471.9, 0.05, "TF32 472 (assumed half of BF16)");
  near(row("bf16").W, 94.4, 0.1, "BF16 FMA power 94 W");
  near(row("bf16", 144, 1.6, true).W, 123.9, 0.1, "BF16 + RF 124 W");
  near(row("bf16", 144, 1.6, true).rf, 0.0625, 1e-9, "TC RF 0.0625 pJ/FMA");
  near(row("fp8", 144, 1.6, true).rf, 0.03125, 1e-9, "TC RF FP8");
  near(row("fp32").W, 23.6, 0.05, "FP32 FMA 23.6 W");
  near(row("fp32", 144, 1.6, true).W, 82.6, 0.1, "FP32 + RF 83 W");
  near(row("bf16", 144, 1.6, true).eff, 7.62, 0.01, "BF16 7.6 TFLOPS/W");
  near(row("fp32", 144, 1.6, true).eff, 0.714, 0.002, "FP32 0.71 TFLOPS/W");
  ok(row("bf16", 144, 1.6, true).eff / row("fp32", 144, 1.6, true).eff > 10, "BF16/FP32 > 10×");
  near(row("fp32").eff, 2.5, 0.01, "FP32 eff without RF 2.5");
  near(row("bf16", 144, 1.8, true).W, 179.2, 0.3, "1.8 GHz BF16 179 W");
  near(M.vOf(1.2), 0.65, 1e-9, "V(1.2)"); near(M.vOf(1.6), 0.75, 1e-9, "V(1.6)"); near(M.vOf(1.8), 0.85, 1e-9, "V(1.8)");
  for (const P of M.PERF) for (const sm of [96, 160]) for (const f of [1.2, 1.8]) for (const rf of [false, true]) { const r = M.perfRow(P, sm, f, rf); fin(r.tflops, "tflops"); fin(r.W, "W"); fin(r.eff, "eff"); }
  // SFU GX-1 노트
  const sfuRate = 144 * 16 * 1.6e9, exps = 80 * 64 * 8192 * 8192 / 2, mm = 140e9 * 8192 / (row("bf16").tflops * 1e12);
  near(sfuRate, 3.69e12, 0.01e12, "SFU rate"); near(exps, 1.718e11, 0.001e11, "softmax exps");
  near(exps / sfuRate, 0.0466, 0.0005, "SFU time 47 ms"); near(mm, 1.215, 0.002, "GEMM 1.2 s");
  near(exps / sfuRate / mm, 0.038, 0.002, "≈4 %"); near(exps / sfuRate / (mm / 2), 0.077, 0.003, "≈8 % with FP8");
}

/* 6. 누산 정밀도 */
{
  const Ks = [8, 64, 512, 4096];
  const cur = (d, m, k) => M.accCurve(d, m, F[k], Ks, 4);
  const bp = cur("pos", "bf16", "bf16"), fp = cur("pos", "fp32", "bf16"), blk = cur("pos", "bf16blk", "bf16"), hp = cur("pos", "fp16", "bf16"), bg = cur("gauss", "bf16", "bf16");
  ok(bp[3][1] > 0.5, "BF16 acc K=4096 > 50 %: " + bp[3][1]);
  ok(fp[3][1] < 3e-6 && fp[3][1] > 1e-8, "FP32 acc ~1e-6: " + fp[3][1]);
  ok(blk[3][1] < 1e-3, "BF16 blocks + FP32 < 1e-3: " + blk[3][1]);
  ok(bg[3][1] < 5e-3, "BF16 acc gauss ~1e-3: " + bg[3][1]);
  ok(hp[3][1] > fp[3][1] && hp[3][1] < bp[3][1], "FP16 between");
  ok(bp[0][1] < 0.01, "short sums fine");
  const sub = M.dotRun(4096, "pos", "bf16", F.bf16, 1000);
  ok(sub.ref > 900 && sub.ref < 1150 && sub.acc < 600, "BF16 stagnates: ref " + sub.ref + " acc " + sub.acc);
  for (const k of ["bf16", "e4m3"]) for (const d of ["pos", "gauss"]) for (const m of ["bf16", "fp16", "fp32", "bf16blk"]) M.accCurve(d, m, F[k], [8, 16384], 1).forEach((q) => fin(q[1], "acc " + k + d + m));
}

/* 7. SFU 근사 */
{
  const b = (k, t, d, nr) => M.sfuErr(k, t, d, nr).bits;
  near(b("rcp", 6, 2, false), 22.8, 0.3, "rcp t6 d2"); ok(b("rcp", 7, 2, false) > 23.5, "rcp t7 d2 hits FP32 floor");
  near(b("rcp", 6, 1, false), 15.0, 0.3, "rcp t6 d1"); near(b("rcp", 4, 1, false), 11.1, 0.3, "rcp t4 d1");
  near(b("rcp", 4, 1, true), 22.0, 0.4, "rcp t4 d1 + NR");
  const dr = b("rcp", 6, 2, false) - b("rsqrt", 6, 2, false); ok(dr > 1.5 && dr < 3.5, "rsqrt 2–3 bits less: " + dr);
  near(b("exp2", 6, 2, false), 23.9, 0.3, "exp2 t6 d2");
  ok(b("rcp", 5, 2, false) - b("rcp", 4, 2, false) > 2.5, "t+1 → ~3 bits (quadratic)");
  ok(M.sfuErr("rcp", 6, 2, false).romBits === 4608, "ROM 64×3×24");
  for (const k of ["rcp", "rsqrt", "exp2"]) for (const t of [1, 8]) for (const d of [1, 2]) for (const nr of [false, true]) { const r = M.sfuErr(k, t, d, nr, 256); fin(r.maxE, "sfu " + k); fin(r.bits, "bits"); }
}

/* 8. INT8 양자화 */
{
  const X0 = M.qData(4096, 0, 20, 7), X1 = M.qData(4096, 0.001, 20, 7);
  const sq = (X, m, b) => M.qErr(X, M.qScale(m, X, b), b).sqnr;
  near(sq(X0, "max", 8), 41.9, 0.6, "INT8 no outliers ≈ 42 dB"); near(M.fp8Err(X0), 31.4, 0.6, "FP8 ≈ 31 dB");
  near(sq(X1, "max", 8), 28.6, 0.8, "INT8 outliers max ≈ 29 dB"); near(sq(X1, "pct", 8), 15.6, 1.0, "INT8 pct ≈ 16 dB");
  near(M.fp8Err(X1), 32.5, 0.6, "FP8 with outliers ≈ 32 dB");
  ok(M.fp8Err(X1) > sq(X1, "max", 8) && sq(X0, "max", 8) > M.fp8Err(X0), "INT8 vs FP8 ordering");
  for (const X of [X0, X1]) { const g = sq(X, "mse", 4) - sq(X, "max", 4); ok(g > 1.8 && g < 4.6, "INT4 MSE gain 2–4 dB: " + g); }
  ok(sq(X1, "mse", 8) >= sq(X1, "max", 8) - 0.05, "MSE ≥ max");
  for (const of of [0, 0.02]) for (const om of [5, 50]) { const X = M.qData(4096, of, om, 7); for (const m of ["max", "pct", "mse"]) for (const bb of [4, 8]) { const s = M.qScale(m, X, bb), e = M.qErr(X, s, bb); fin(s, "scale"); ok(Number.isFinite(e.sqnr), "sqnr"); } fin(M.fp8Err(X), "fp8"); }
}

console.log("gpu alu sims ok");
