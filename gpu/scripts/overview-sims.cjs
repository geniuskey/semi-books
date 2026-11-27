#!/usr/bin/env node
/* Copyright (c) 2026 geniuskey and GPUBook contributors. MIT.
 * 1장 GPU라는 칩의 지도(chapters/overview.html) 시뮬레이터 회귀 검사.
 * 장의 /* model:<이름> *\/ 블록을 잘라 node:vm에서 돌리고, 본문·GX-1 노트·퀴즈가 인용한 수치와
 * 슬라이더 끝값에서 NaN·음수·무한이 없는지 확인한다. 실행: node gpu/scripts/overview-sims.cjs
 */
"use strict";
const fs = require("node:fs"), path = require("node:path"), vm = require("node:vm"), assert = require("node:assert/strict");
const html = fs.readFileSync(path.join(__dirname, "../chapters/overview.html"), "utf8");
const block = (name) => {
  const a = `/* model:${name} */`, b = `/* /model:${name} */`, i = html.indexOf(a), j = html.indexOf(b, i);
  assert.ok(i >= 0 && j > i, "model block " + name);
  return html.slice(i, j + b.length);
};
const names = ["area", "queue", "peak", "hier", "shader", "budget", "pkg", "energy"];
const ctx = vm.createContext({ Math, Number, Object, Array, Infinity, isFinite });
vm.runInContext(names.map(block).join("\n") +
  "\nthis.M = { AREA, areaModel, cpuTime, gpuTime, crossover, peak, SC64, PREC, hierarchy, shaderUtil, BUD, budget, radar, vOf, dpwFormula, PKG, hbmPlacement, pkgStats, explodeY, EN, energyPerOp, chipAtPeak };", ctx);
const M = ctx.M;
let n = 0;
const ok = (c, m) => { assert.ok(c, m); n++; };
const near = (a, b, rel, m) => ok(Math.abs(a / b - 1) <= rel, `${m}: ${a} vs ${b}`);
const fin = (v, m) => ok(Number.isFinite(v) && v >= 0, `${m} finite/non-negative: ${v}`);

/* 1. 면적 배분 */
{
  const gm = M.areaModel(M.AREA.presets.gx1, "matrix"), gv = M.areaModel(M.AREA.presets.gx1, "vector");
  const cpu = M.areaModel(M.AREA.presets.cpu, "vector"), mx = M.areaModel(M.AREA.presets.max, "vector");
  near(gm.lanes, 18432, 1e-9, "GX-1 lanes"); near(gm.tcs, 576, 1e-9, "GX-1 tensor cores");
  near(gm.fp32, 59.0e12, 0.002, "GX-1 FP32"); near(gm.bf16, 943.7e12, 0.0005, "GX-1 BF16");
  near(gm.P, 760, 0.01, "GX-1 matrix power"); near(gv.P, 363, 0.01, "GX-1 vector power");
  near(cpu.fp32, 12.3e12, 0.005, "CPU preset FP32");
  near(cpu.tau, 0.28, 0.02, "CPU tau"); near(gm.tau, 1.89, 0.01, "GX-1 tau"); near(gm.tau / cpu.tau, 6.7, 0.01, "tau ratio");
  near(cpu.P, 660, 0.01, "CPU preset power");
  near(mx.fp32, 198e12, 0.005, "max preset FP32"); near(mx.tau, 4.9, 0.01, "max preset tau");
  // 클럭 3.0 GHz에서 레인 수 약 1/4.8, 피크는 떨어진다
  const g3 = M.areaModel(Object.assign({}, M.AREA.presets.gx1, { f: 3.0 }), "matrix");
  near(gm.lanes / g3.lanes, 4.8, 0.01, "lane shrink at 3 GHz"); ok(g3.fp32 < gm.fp32, "peak falls at 3 GHz");
  for (const c of [1, 50]) for (const s of [1, 60]) for (const k of [0, 80]) for (const t of [0, 60]) for (const f of [1.0, 3.5]) for (const w of ["matrix", "vector"]) {
    const r = M.areaModel({ ctrl: c, sram: s, lane: k, tensor: t, f }, w);
    ["fp32", "bf16", "tau", "P", "io", "lanes"].forEach((q) => fin(r[q], `area ${q} ${c}/${s}/${k}/${t}/${f}`));
    ok(r.io >= 5 - 1e-9, "io >= 5 %");
    ok(Number.isFinite(r.perW), "perW finite");
  }
}

/* 2. 작업 큐 */
{
  near(M.cpuTime(1000, 1000), 1.333e-6, 0.005, "CPU N=1000"); near(M.gpuTime(1000, 1000), 7.5e-6, 1e-6, "GPU N=1000");
  near(M.cpuTime(1e6, 1000), 163e-6, 0.005, "CPU N=1e6"); near(M.gpuTime(1e6, 1000), 39e-6, 0.005, "GPU N=1e6");
  const x = M.crossover(1000); ok(x > 4.5e4 && x < 4.7e4, "crossover K=1000 ~4.6만: " + x);
  const x100 = M.crossover(100); ok(x100 > 3.8e5 && x100 < 4.0e5, "crossover K=100 ~39만: " + x100);
  near(M.cpuTime(3e7, 1000) / M.gpuTime(3e7, 1000), 4.8, 0.01, "asymptotic ratio");
  near(59.0 / 12.3, 4.8, 0.01, "FP32 ratio");
  const wave = 144 * 2048; ok(wave === 294912, "wave size");
  near(M.gpuTime(2 * wave, 1000) - M.gpuTime(wave, 1000), 10e-6, 1e-9, "one full wave = 10 µs");
  for (const N of [100, Math.round(10 ** 7.3)]) for (const K of [100, 10000]) { fin(M.cpuTime(N, K), "cpuTime"); fin(M.gpuTime(N, K), "gpuTime"); }
  ok(M.crossover(10000) < M.crossover(1000), "longer tasks cross earlier");
}

/* 3. 피크 계산기 */
{
  near(M.peak(144, 1.6, "fp32"), 59.0e12, 0.002, "FP32"); near(M.peak(144, 1.6, "fp64"), 29.5e12, 0.002, "FP64");
  near(M.peak(144, 1.6, "bf16"), 943.7e12, 0.0005, "BF16"); near(M.peak(144, 1.6, "fp8"), 1887e12, 0.001, "FP8");
  near(M.peak(144, 1.6, "fp4"), 3775e12, 0.001, "FP4"); near(M.peak(144, 1.6, "int8"), 1887e12, 0.001, "INT8");
  near(M.peak(160, 1.6, "bf16"), 1049e12, 0.001, "SM 160");
  near(M.SC64.fp32, 12.3e12, 0.002, "SC-64"); near(M.SC64.fp32 / 350 / 1e9, 35, 0.01, "SC-64 GFLOPS/W");
  near(M.peak(144, 1.6, "bf16") / 1000 / 1e9, 944, 0.001, "GX-1 BF16 GFLOPS/W");
  near(M.peak(144, 1.6, "bf16") / 1000 / (M.SC64.fp32 / 350), 27, 0.01, "27x per watt");
  near(M.peak(144, 1.6, "fp32") / 1000 / (M.SC64.fp32 / 350), 1.7, 0.02, "1.7x per watt");
  near(M.peak(144, 1.6, "bf16") / 7.3728e12, 128, 0.001, "BF16 ridge");
  near(M.peak(144, 1.6, "fp32") / 7.3728e12, 8, 0.001, "FP32 ridge");
  for (const sm of [1, 160]) for (const f of [1.0, 1.8]) for (const p of Object.keys(M.PREC)) fin(M.peak(sm, f, p), "peak");
}

/* 4. 계층 */
{
  const H = M.hierarchy(), by = (k) => H.find((l) => l.k === k);
  near(by("lane").fp32, 3.2e9, 1e-9, "lane"); near(by("lane").P, 1.28e-3, 1e-9, "lane power");
  near(by("sub").bf16, 1.638e12, 0.001, "sub BF16"); near(by("sm").fp32, 409.6e9, 1e-9, "SM FP32"); near(by("sm").bf16, 6.55e12, 0.001, "SM BF16");
  near(by("sm").bf16 / by("sm").fp32, 16, 1e-9, "tensor/FP32 = 16");
  near(by("gpc").bf16, 118e12, 0.001, "GPC"); near(by("die").bf16, 943.7e12, 0.0005, "die");
  near(by("node").bf16, 7.55e15, 0.001, "node"); near(by("rack").bf16, 30.2e15, 0.001, "rack BF16"); near(by("rack").fp32, 1.887e15, 0.001, "rack FP32");
  near(by("rack").lanes, 589824, 1e-9, "rack lanes"); ok(by("rack").P === 50000 && by("node").P === 12000, "rack/node power");
  near(by("sm").P, 5.28, 0.001, "SM power"); near(by("gpc").P, 95, 1e-9, "GPC power");
  ok(32 * 144 === 4608, "rack HBM"); near(32 * 7.3728, 236, 0.001, "rack HBM BW");
  H.forEach((l) => { fin(l.fp32, "hier fp32 " + l.k); fin(l.bf16, "hier bf16 " + l.k); fin(l.P, "hier P " + l.k); });
}

/* 5. 통합 셰이더 */
{
  near(M.shaderUtil(0.25, 8, 32).uSep, 1, 1e-9, "φ 0.25"); near(M.shaderUtil(0.05, 8, 32).uSep, 0.79, 0.005, "φ 0.05");
  const r6 = M.shaderUtil(0.6, 8, 32); near(r6.uSep, 0.42, 0.01, "φ 0.6"); near(r6.speedup, 2.4, 1e-9, "speedup 2.4"); near(1 - r6.busyP, 0.78, 0.01, "pixel idle 78 %");
  for (const p of [0, 1]) for (const v of [2, 24]) { const r = M.shaderUtil(p, v, 32); ["tSep", "uSep", "speedup", "busyV", "busyP"].forEach((q) => fin(r[q], "shader " + q)); ok(r.uSep <= 1 + 1e-12, "util ≤ 1"); }
}

/* 6. 예산 (원가는 10장 die.html의 dieGrid·bestOffset·harvest·chiplet과 같은 값) */
{
  const R = (k) => M.radar(M.BUD.presets[k]);
  const g = R("gx1");
  near(g.b.P, 1000, 1e-6, "GX-1 package power"); near(g.b.ridge, 128, 0.001, "GX-1 ridge"); near(g.bw, 1, 1e-9, "bw axis 1"); near(g.shore, 1, 1e-9, "GX-1 shoreline 60/60");
  ok(g.b.dpw === 70, "GX-1 grid dies 70: " + g.b.dpw); near(M.dpwFormula(294, 26.1 * 30.1), 63.1, 0.005, "formula 63.1");
  near(g.b.Y, 0.807, 0.002, "sellable yield 80.7 %"); near(Math.exp(-7.8 * 0.08), 0.536, 0.002, "Poisson 53.6 %");
  near(18000 / (70 * Math.exp(-7.8 * 0.08)), 480, 0.005, "no-harvest die $480");
  near(g.b.die, 319, 0.005, "GX-1 die $319"); near(g.b.cost, 3550, 0.002, "GX-1 package $3,550");
  const h8 = R("hbm8"); near(h8.b.ridge, 96, 0.001, "hbm8 ridge"); near(h8.shore, 4 / 3, 1e-9, "hbm8 shoreline 133 %"); near(h8.b.cost, 4284, 0.002, "hbm8 cost"); near(h8.b.bw, 9.83e12, 0.001, "hbm8 BW"); near(h8.power, 1.05, 0.01, "hbm8 power +5 %");
  const h4 = R("hbm4"); near(h4.cost, 0.79, 0.01, "hbm4 cost index"); near(h4.b.cost, 2815, 0.002, "hbm4 cost"); near(h4.b.ridge, 192, 0.001, "hbm4 ridge");
  near(R("fp8").b.ridge, 256, 0.001, "fp8 ridge");
  const ck = R("clk"); near(ck.b.P, 1350, 0.005, "1.8 GHz power"); near(ck.b.V, 0.85, 1e-9, "V at 1.8"); near(M.vOf(1.2), 0.65, 1e-9, "V at 1.2");
  near(ck.b.flops / g.b.flops, 1.125, 1e-9, "+12.5 % FLOPS");
  const cp = R("chiplet"); near(cp.b.cost, 3551, 0.001, "chiplet package $3,551"); near(cp.b.si, 286, 0.005, "chiplet silicon $286"); near(cp.b.Y, 0.888, 0.002, "chiplet yield"); near(cp.b.Pd2d, 16, 1e-9, "d2d 16 W");
  ok(Math.abs(cp.b.cost - g.b.cost) < 5, "chiplet ≈ monolithic"); ok(cp.shore <= 1, "chiplet keeps shoreline");
  near(R("big").area, 1, 1e-9, "reticle full");
  for (const k of Object.keys(M.BUD.presets)) for (const s of [2, 10]) for (const f of [1.2, 1.8]) {
    const r = M.radar(Object.assign({}, M.BUD.presets[k], { stacks: s, f }));
    ["area", "bw", "power", "cost", "shore"].forEach((q) => fin(r[q], `radar ${k} ${q}`));
  }
}

/* 7. 패키지 */
{
  const s = M.pkgStats();
  ok(s.fits, "HBM inside interposer"); ok(s.interpA === 2500, "interposer 2,500 mm²"); near(s.util, 0.54, 0.01, "util 54 %");
  near(s.shoreFrac, 0.95, 1e-9, "shoreline 95 %"); near(s.bw, 7.3728e12, 1e-9, "HBM 7.37 TB/s"); near(s.bwStack, 1228.8e9, 1e-9, "stack BW"); ok(s.cap === 144, "144 GB");
  const h = M.hbmPlacement(); ok(h.length === 6, "6 stacks");
  for (let i = 0; i < h.length; i++) for (let j = i + 1; j < h.length; j++) ok(Math.abs(h[i].x - h[j].x) >= h[i].w || Math.abs(h[i].z - h[j].z) >= h[i].d, "stacks do not overlap");
  h.forEach((b) => ok(Math.abs(b.z) - b.d / 2 >= M.PKG.die.d / 2, "stack clear of die"));
  fin(M.explodeY(5, 1), "explode max"); ok(M.explodeY(3, -1) === 0 && M.explodeY(3, 2) === M.explodeY(3, 1), "explode clamps");
}

/* 8. 에너지 */
{
  const h1 = M.energyPerOp("bf16", "hbm", 1, 0); near(h1.total, 96.2, 1e-9, "BF16 HBM R1"); near(h1.ratio, 480, 1e-9, "480x");
  const c1 = M.chipAtPeak("bf16", "hbm", 1, 0); near(c1.P, 45.4e3, 0.005, "45 kW"); near(c1.bw, 1.887e15, 0.001, "1.9 PB/s");
  const c256 = M.chipAtPeak("bf16", "hbm", 256, 0); near(c256.bw, 7.37e12, 0.001, "R=256 → 7.37 TB/s"); near(c256.Pmove, 177, 0.005, "HBM move ~177 W");
  near(M.chipAtPeak("bf16", "rf", 1, 0).P, 330, 0.005, "RF R1 ~330 W");
  near(M.energyPerOp("bf16", "wire", 1, 10).move, 16, 1e-9, "wire 10 mm = 16 pJ");
  ok(M.EN.move32.hbm === 96, "HBM 32-bit 96 pJ");
  for (const p of ["int8", "fp8", "bf16", "fp32"]) for (const l of ["rf", "l1", "l2", "hbm", "link", "wire"]) for (const r of [1, 1024]) for (const mm of [1, 30]) {
    const e = M.energyPerOp(p, l, r, mm), c = M.chipAtPeak(p, l, r, mm);
    fin(e.total, "E"); fin(e.ratio, "ratio"); fin(c.P, "chip P"); fin(c.bw, "chip bw");
  }
}
console.log("gpu overview sims ok");
