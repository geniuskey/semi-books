#!/usr/bin/env node
/* Copyright (c) 2026 geniuskey and GPUBook contributors. MIT.
 * 6장 온칩 메모리(chapters/onchip.html) 시뮬레이터 회귀 검사.
 * 장 스크립트에서 /* model:<이름> *\/ 블록을 잘라 node:vm에서 돌리고,
 * 본문·GX-1 노트·해볼 것·퀴즈가 인용하는 수치와 극단 입력을 확인한다.
 * 실행: node gpu/scripts/onchip-sims.cjs */
"use strict";
const fs = require("node:fs"), path = require("node:path"), vm = require("node:vm"), assert = require("node:assert/strict");
const html = fs.readFileSync(path.join(__dirname, "..", "chapters", "onchip.html"), "utf8");

// 인라인 스크립트는 문법 오류가 없어야 한다
for (const m of html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)) if (m[1].trim()) new vm.Script(m[1], { filename: "onchip.html" });

const block = (name) => {
  const a = `/* model:${name} */`, b = `/* /model:${name} */`, i = html.indexOf(a), j = html.indexOf(b, i);
  assert.ok(i >= 0 && j > i, "model block " + name);
  return html.slice(i + a.length, j);
};
const NAMES = ["gx", "sram", "hier", "coalesce", "bank", "cache", "energy", "split", "async"];
const ctx = vm.createContext({ Math, Set, Map, Array, Number, Infinity });
vm.runInContext(NAMES.map(block).join("\n") +
  "\nthis.M = { GX, SRAM_NODES, sramArea, hierRows, warpAddrs, coalesce, gcd, bankWords, bankConflict, cacheTrace, cacheSim, moveEnergy, CARVE, splitEval, asyncSim };", ctx);
const M = ctx.M;
const near = (a, b, tol, msg) => assert.ok(Math.abs(a - b) <= tol, `${msg}: ${a} vs ${b}`);
const fin = (x, msg) => assert.ok(Number.isFinite(x) && x >= 0, `${msg}: ${x}`);

/* GX-1 표와 맞물린 값 */
const G = M.GX;
near(G.hbmBW / 1e12, 7.3728, 1e-9, "HBM 7.37 TB/s");
near(G.l2BW / 1e12, 13.1072, 1e-9, "L2 13.1 TB/s");
near(G.smemBW / 1e12, 29.4912, 1e-9, "shared 29.5 TB/s");

/* 1. SRAM 면적 */
{
  const base = { mb: 64, cell: 0.021, eff: 0.6, ecc: true, tags: true };
  const r = M.sramArea(base);
  near(M.sramArea({ mb: 64, cell: 0.021, eff: 1, ecc: false, tags: false }).cellMm2, 11.27, 0.01, "64 MB cells only ~11.3 mm²");
  near(r.macroMm2, 21.77, 0.01, "64 MB macro ~21.8 mm²");
  near(r.dieFrac, 0.0279, 0.0005, "2.8 % of die");
  near(r.smEquiv, 6.80, 0.01, "~6.8 SM");
  near(M.sramArea(Object.assign({}, base, { cell: 0.0175 })).macroMm2, 18.14, 0.01, "2 nm-class 18.1 mm²");
  near(M.sramArea(Object.assign({}, base, { eff: 0.4 })).macroMm2, 32.66, 0.01, "eta 0.4 -> 32.7 mm²");
  near(M.sramArea(Object.assign({}, base, { mb: 144 })).macroMm2, 48.99, 0.05, "144 MB ~49 mm²");
  const nd = M.SRAM_NODES, i4 = nd.findIndex((n) => n.n === "5·4"), i2 = nd.length - 1;
  near(nd[i2].logic / nd[i4].logic, 1.67, 0.01, "logic 5·4 -> 2: ~1.7x");
  near(nd[i4].cell / nd[i2].cell, 1.2, 0.01, "SRAM 5·4 -> 2: 1.2x");
  for (let k = 1; k < nd.length; k++) assert.ok(nd[k].cell < nd[k - 1].cell && nd[k].logic > nd[k - 1].logic, "monotone trend");
  for (const mb of [4, 256]) for (const eff of [0.3, 0.9]) for (const t of [1, 1.25, 2]) for (const node of nd) {
    const x = M.sramArea({ mb, cell: node.cell * t, eff, ecc: true, tags: true });
    for (const k of ["cellMm2", "macroMm2", "dieFrac", "smEquiv", "mbitPerMm2"]) fin(x[k], "sram " + k);
  }
}

/* 2. 계층 */
{
  const r = M.hierRows(), by = Object.fromEntries(r.map((x) => [x.k, x]));
  near(by.rf.bw / 1e12, 353.89, 0.01, "RF 354 TB/s");
  near(by.rf.bw / by.hbm.bw, 48, 0.01, "RF/HBM 48x");
  near(by.hbm.pjBit / by.rf.pjBit, 192, 1e-9, "HBM/RF energy 192x");
  near(by.hbm.watt, 176.9, 0.1, "HBM ~177 W");
  near(by.rf.watt + by.l1.watt + by.l2.watt, 74.96, 0.05, "on-chip sum ~75 W");
  near(by.l2.watt, 19.66, 0.01, "L2 ~20 W"); near(by.l1.watt, 11.06, 0.01, "L1 ~11 W"); near(by.rf.watt, 44.24, 0.01, "RF ~44 W");
  near(by.l2.latNs, 125, 1e-9, "L2 125 ns"); near(by.l1.latNs, 18.75, 1e-9, "L1 19 ns");
  const PEAK = G.sm * 4 * 512 * 2 * G.clk;
  near(PEAK / 1e12, 943.7, 0.05, "BF16 peak");
  near(PEAK / by.l2.bw, 72, 0.01, "L2 ridge 72"); near(PEAK / by.l1.bw, 32, 1e-9, "shared ridge 32"); near(PEAK / by.hbm.bw, 128, 1e-9, "HBM ridge 128");
  near(PEAK / 2 * G.e.bf16 * 1e-12, 94.4, 0.1, "BF16 compute ~94 W");
}

/* 3. 병합 */
{
  const co = (o) => M.coalesce(M.warpAddrs(Object.assign({ offset: 0, stride: 1, seed: 11 }, o)), o.elem);
  let r = co({ pattern: "seq", elem: 4 }); assert.ok(r.nSec === 4 && r.nLine === 1 && r.eff === 1, "seq 4 sectors");
  r = co({ pattern: "seq", elem: 4, offset: 4 }); assert.ok(r.nSec === 5 && r.nLine === 2 && Math.abs(r.eff - 0.8) < 1e-12, "misaligned 5 sectors 80 %");
  r = co({ pattern: "stride", elem: 4, stride: 2 }); assert.ok(r.nSec === 8 && r.nLine === 2 && r.eff === 0.5, "stride 2: 8 sectors 50 %");
  for (const s of [8, 16, 32, 64]) { r = co({ pattern: "stride", elem: 4, stride: s }); assert.ok(r.nSec === 32 && r.eff === 0.125, "stride " + s + " 12.5 %"); }
  near(co({ pattern: "stride", elem: 4, stride: 8 }).effBW / 1e12, 0.9216, 1e-9, "0.92 TB/s");
  assert.ok(co({ pattern: "stride", elem: 4, stride: 8 }).nLine === 8, "stride 8: 8 lines");
  r = co({ pattern: "rand", elem: 4 }); assert.ok(r.nSec >= 31 && r.eff <= 0.13, "random ~12.5 %");
  r = co({ pattern: "seq", elem: 16 }); assert.ok(r.nSec === 16 && r.eff === 1, "16 B seq: 16 sectors 100 %");
  for (const p of ["seq", "stride", "rand"]) for (const e of [4, 8, 16]) for (const s of [1, 64]) for (const off of [0, 124]) {
    const x = co({ pattern: p, elem: e, stride: s, offset: off });
    assert.ok(x.nSec >= 1 && x.nSec <= 64 && x.eff > 0 && x.eff <= 1, `coalesce bounds ${p} ${e} ${s} ${off}`);
  }
}

/* 4. 뱅크 충돌 */
{
  const k = (o) => M.bankConflict(M.bankWords(Object.assign({ stride: 1, pad: 0, seed: 7 }, o))).degree;
  const exp = { 0: 1, 1: 1, 2: 2, 6: 2, 16: 16, 32: 32, 33: 1 };
  for (const s in exp) assert.equal(k({ pattern: "stride", stride: +s }), exp[s], "stride " + s);
  for (let s = 1; s <= 40; s++) assert.equal(k({ pattern: "stride", stride: s }), M.gcd(s, 32), "gcd rule " + s);
  assert.equal(k({ pattern: "col", pad: 0 }), 32, "transpose no pad 32-way");
  assert.equal(k({ pattern: "col", pad: 1 }), 1, "pad 1 -> 1-way");
  assert.equal(k({ pattern: "col", pad: 2 }), 2, "pad 2 -> 2-way (quiz)");
  assert.equal(k({ pattern: "col", pad: 4 }), 4, "pad 4 -> 4-way");
  for (let p = 0; p <= 4; p++) assert.equal(k({ pattern: "row", pad: p }), 1, "row read");
  assert.equal(k({ pattern: "bcast" }), 1, "broadcast");
  const rr = k({ pattern: "rand" }); assert.ok(rr >= 1 && rr <= 32, "random degree");
  near(M.bankConflict(M.bankWords({ pattern: "col", pad: 0 })).bw / 1e12, 0.9216, 1e-9, "32-way GPU-wide BW");
}

/* 5. 캐시 LRU (UI와 같은 요청 수 규칙) */
{
  const N = (ws) => Math.max(30000, Math.round(3 * ws / 32) + 20000);
  const run = (kind, wsKB, capKB, ways, line) => { const ws = wsKB * 1024; return M.cacheSim({ capKB, ways, line, trace: M.cacheTrace(kind, N(ws), ws, 3) }).rate; };
  near(run("reuse", 192, 256, 4, 128), 0.96, 0.005, "reuse 192/256 ~96 %");
  near(run("reuse", 192, 128, 4, 128), 0.75, 1e-9, "LRU cliff 75 %");
  near(run("reuse", 256, 128, 4, 128), 0.75, 1e-9, "quiz 5: 256 KB window on 128 KB");
  assert.equal(run("alias", 96, 128, 1, 128), 0, "alias direct-mapped 0 %");
  near(run("alias", 96, 128, 2, 128), 0.97, 0.01, "alias 2-way ~97 %");
  near(run("mix", 96, 128, 4, 128), 0.75, 0.005, "mix 128 KB 75 %");
  near(run("mix", 96, 256, 4, 128), 0.85, 0.01, "mix 256 KB ~85 %");
  for (const line of [32, 64, 128]) for (const cap of [16, 2048]) near(run("stream", 16, cap, 4, line), 1 - 32 / line, 1e-9, "stream 1-32/L");
  for (const kind of ["stream", "reuse", "rand", "alias", "mix"]) for (const ws of [16, 1024]) for (const [cap, w] of [[16, 1], [2048, 16]]) {
    const h = run(kind, ws, cap, w, 128); assert.ok(h >= 0 && h <= 1, `cache bounds ${kind}`);
  }
}

/* 6. 이동 에너지 */
{
  let r = M.moveEnergy({ bits: 32, d: 30, reuse: 1, op: "fma32" }); near(r.eMove, 48, 1e-9, "30 mm 48 pJ"); near(r.ratio, 60, 1e-9, "60x FP32 FMA");
  near(M.moveEnergy({ bits: 32, d: 30, reuse: 1, op: "bf16" }).ratio, 240, 1e-9, "240x BF16");
  r = M.moveEnergy({ bits: 32, d: 1, reuse: 1, op: "fma32" }); near(r.eMove, 1.6, 1e-9, "1 mm 1.6 pJ"); near(r.ratio, 2, 1e-9, "2x");
  r = M.moveEnergy({ bits: 16, d: 10, reuse: 64, op: "bf16" }); near(r.eMove, 8, 1e-9, "8 pJ"); near(r.frac, 0.385, 0.001, "38 %"); near(r.power, 153.4, 0.1, "~153 W"); near(r.powerOp, 94.4, 0.1, "~94 W");
  r = M.moveEnergy({ bits: 16, d: 10, reuse: 1, op: "bf16" }); near(r.frac, 0.976, 0.001, "98 %"); near(r.power, 3869, 2, "~3.9 kW");
  for (const bits of [16, 64]) for (const d of [0, 30]) for (const reuse of [1, 256]) for (const op of ["fma32", "bf16", "fp8"]) {
    const x = M.moveEnergy({ bits, d, reuse, op }); for (const k of ["eMove", "ratio", "frac", "power"]) fin(x[k], "energy " + k);
  }
}

/* 7. L1/공유 분할 */
{
  const ev = (c, o) => M.splitEval(Object.assign({ carve: c, smem: 32, threads: 256, foot: 4, C: 8 }, o));
  let r = ev(228); assert.equal(r.blocks, 7); near(r.occ, 0.875, 1e-9, "87.5 %"); near(r.hit, 0.1125, 1e-9, "hit ~11 %"); near(r.util, 0.593, 0.001, "U ~59 %"); assert.equal(r.limit, "smem");
  r = ev(132); assert.equal(r.blocks, 4); near(r.occ, 0.5, 1e-9, "50 %"); near(r.hit, 0.872, 0.001, "hit ~87 %"); near(r.util, 1, 1e-9, "U 100 %");
  r = ev(64); assert.equal(r.blocks, 2); near(r.util, 0.582, 0.001, "U ~58 %");
  const best = M.CARVE.reduce((b, c) => (ev(c).util > ev(b).util + 1e-9 ? c : b), 0); assert.equal(best, 132, "best carve 132");
  const best0 = M.CARVE.reduce((b, c) => (ev(c, { foot: 0 }).util >= ev(b, { foot: 0 }).util - 1e-12 ? c : b), 0); assert.equal(best0, 228, "no reuse -> max shared");
  for (const c of M.CARVE) for (const smem of [0, 100]) for (const threads of [128, 512]) for (const foot of [0, 16]) {
    const x = ev(c, { smem, threads, foot }); for (const k of ["blocks", "warps", "occ", "hit", "lat", "util"]) fin(x[k], "split " + k);
    assert.ok(x.occ <= 1 && x.util <= 1 && x.hit <= 0.9, "split bounds");
  }
}

/* 8. 비동기 복사 */
{
  const as = (mode, stages, src, o) => M.asyncSim(Object.assign({ mode, stages, Tc: 1024, bytes: 48 * 1024, src, N: 12 }, o));
  let r = as("sync", 1, "l2"); near(r.util, 0.474, 0.001, "sync ~47 %"); near(r.X, 864, 1e-9, "X 864"); assert.equal(r.L, 200);
  near(as("sync", 4, "l2").util, r.util, 1e-12, "sync ignores stages");
  near(as("async", 2, "l2").util, 0.888, 0.001, "async 2 ~89 %");
  near(as("tma", 4, "l2").util, 0.920, 0.001, "tma 4 ~92 %");
  r = as("tma", 4, "hbm"); near(r.X, 1536, 1e-9, "HBM X 1536"); near(r.util, 0.606, 0.01, "HBM ~60 %");
  near(as("tma", 4, "hbm", { N: 400 }).util, 1024 / 1536, 0.01, "HBM -> Tc/X 67 %");
  near(as("async", 3, "l2", { N: 400 }).util, 1, 0.01, "L2 3-stage steady state compute-bound");
  // 2단은 한 타일 복사(O + L + X = 1,112)가 계산 1,024보다 길어 간격이 (O + L + X + Tc)/2 = 1,068
  let ev = as("async", 2, "l2", { N: 40 }).ev; near((ev[32].cs - ev[30].cs) / 2, 1068, 1e-9, "2-stage period 1068");
  // 퀴즈 7: 3단이면 정상 상태 타일 간격 = max(Tc, X, (O+L+X+Tc)/3) = 1,024
  ev = as("async", 3, "l2", { N: 40 }).ev; near(ev[30].cs - ev[29].cs, 1024, 1e-9, "3-stage period 1024");
  assert.ok(as("tma", 4, "l2").fits && as("tma", 4, "l2").smemKB === 192, "4 x 48 KB fits");
  assert.ok(!as("tma", 4, "l2", { bytes: 64 * 1024 }).fits, "4 x 64 KB = 256 KB > 228");
  for (const m of ["sync", "async", "tma"]) for (const s of [1, 4]) for (const src of ["l2", "hbm"]) for (const Tc of [256, 4096]) for (const kb of [8, 96]) {
    const x = as(m, s, src, { Tc, bytes: kb * 1024 }); fin(x.total, "async total"); assert.ok(x.util > 0 && x.util <= 1, "async util bounds");
  }
}

console.log("gpu onchip sims ok");
