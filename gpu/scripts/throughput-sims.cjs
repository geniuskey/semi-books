#!/usr/bin/env node
/* 2장 처리량 기계(chapters/throughput.html) 시뮬레이터 회귀 검사.
   장 스크립트에서 /* model:<이름> *\/ 블록을 잘라 node:vm에서 돌리고,
   본문·GX-1 노트·해볼 것·퀴즈가 인용한 수치와 슬라이더 극단값(NaN·음수·무한 없음)을 확인한다. 외부 패키지 없음. */
"use strict";
const fs = require("fs"), vm = require("vm"), path = require("path"), assert = require("assert");
const html = fs.readFileSync(path.join(__dirname, "..", "chapters", "throughput.html"), "utf8");
const block = (name) => {
  const a = "/* model:" + name + " */", b = "/* /model:" + name + " */", i = html.indexOf(a), j = html.indexOf(b, i);
  assert(i >= 0 && j > i, "model block " + name);
  return html.slice(i + a.length, j);
};
const NAMES = ["little", "warps", "hide", "ctx", "simt", "grid", "amdahl", "pipe"];
const ctx = { Math, Number, Array, Int16Array, Uint8Array, Object, Infinity, isFinite };
vm.createContext(ctx);
vm.runInContext(NAMES.map(block).join("\n") +
  "\nthis.M = { littleModel, warpUtilFormula, warpsNeeded, warpSim, hideModel, ctxModel, simtModel, gridModel, amdahl, gustafson, serialFor, pipeModel, pipeBest };", ctx);
const M = ctx.M;
let n = 0;
const ok = (c, m) => { assert(c, m); n++; };
const near = (a, b, tol, m) => ok(Math.abs(a - b) <= tol * Math.max(1, Math.abs(b)), m + ": " + a + " vs " + b);
const finite = (o, m) => { for (const [k, v] of Object.entries(o)) if (typeof v === "number") { ok(Number.isFinite(v), m + "." + k + " = " + v); ok(v >= 0, m + "." + k + " negative " + v); } };

/* 1. 리틀의 법칙 — GX-1 HBM·L2·SC-64 */
{
  const h = M.littleModel({ bw: 7372.8e9, lat: 500e-9, size: 64, sms: 144, clk: 1.6e9, q: 400 });
  near(h.bytes, 3686400, 1e-9, "HBM in flight 3.69 MB");
  near(h.reqs, 57600, 1e-9, "64 B requests 57,600");
  near(h.perSm, 25600, 1e-9, "per SM 25.6 KB");
  near(h.perSmReq, 400, 1e-9, "per SM 400 requests");
  near(h.latCyc, 800, 1e-9, "500 ns = 800 cycles");
  near(h.bpc, 32, 1e-9, "32 B/clock per SM");
  near(h.util, 1, 1e-9, "q 400 fills the pipe");
  ok(h.perSm / 128 === 200, "200 warp loads of 128 B per SM");
  const half = M.littleModel({ bw: 7372.8e9, lat: 500e-9, size: 64, sms: 144, clk: 1.6e9, q: 200 });
  near(half.achieved, 3.6864e12, 1e-9, "q 200 -> 3.69 TB/s"); near(half.util, 0.5, 1e-9, "q 200 -> 50 %");
  const l2 = M.littleModel({ bw: 13107.2e9, lat: 125e-9, size: 64, sms: 144, clk: 1.6e9, q: 200 });
  near(l2.bytes, 1.6384e6, 1e-9, "L2 1.64 MB"); near(l2.perSm, 11378, 1e-3, "L2 per SM 11.4 KB"); near(13107.2e9 / 1.6e9, 8192, 1e-12, "L2 128 x 64 B/clk");
  const cpu = M.littleModel({ bw: 460e9, lat: 100e-9, size: 64, sms: 64, clk: 1.6e9, q: 12 });
  near(cpu.bytes, 46000, 1e-9, "SC-64 46 KB"); ok(cpu.perSmReq > 11 && cpu.perSmReq < 11.5, "SC-64 ~11 lines per core"); near(cpu.util, 1, 1e-9, "SC-64 q12 full");
  for (const bw of [100e9, 15000e9]) for (const lat of [20e-9, 1000e-9]) for (const size of [32, 128]) for (const q of [1, 1000])
    finite(M.littleModel({ bw, lat, size, sms: 144, clk: 1.6e9, q }), "little");
}

/* 2. 워프 수 vs 활용률 — GTO는 식과 일치, LRR은 그보다 낮다 */
{
  for (const [N, k, L] of [[8, 10, 200], [16, 10, 200], [21, 10, 200], [16, 10, 800], [16, 54, 800], [3, 4, 12], [4, 4, 12], [1, 1, 10], [32, 100, 1000], [5, 37, 333]]) {
    const g = M.warpSim(N, k, L, "gto").util, f = M.warpUtilFormula(N, k, L), r = M.warpSim(N, k, L, "lrr").util;
    near(g, f, 2e-3, "GTO = formula N" + N + " k" + k + " L" + L);
    ok(r <= g + 2e-3, "LRR <= GTO N" + N + " k" + k + " L" + L);
    // LRR 정상 상태 해석식: N > L이면 1, 아니면 Nk / (Nk - N + L + 1)
    const lr = N >= L + 1 ? 1 : (N * k) / (N * k - N + L + 1);
    near(r, lr, 1e-2, "LRR closed form N" + N + " k" + k + " L" + L);
  }
  near(M.warpUtilFormula(16, 10, 200), 160 / 210, 1e-12, "L2 16 warps 76 %");
  ok(M.warpsNeeded(10, 200) === 21, "N_min 21 at L 200");
  ok(M.warpsNeeded(10, 800) === 81, "N_min 81 at L 800");
  near(M.warpUtilFormula(16, 10, 800), 0.1975, 1e-3, "HBM k10 ~20 %");
  ok(M.warpUtilFormula(16, 53, 800) < 1 && M.warpUtilFormula(16, 54, 800) === 1, "k >= 54 for 16 warps at L 800");
  ok(Math.ceil(800 / 15) === 54, "GX-1 k readout");
  near(M.warpSim(4, 4, 12, "gto").util, 1, 1e-9, "fig 2-4 100 %"); near(M.warpSim(3, 4, 12, "gto").util, 0.75, 1e-9, "fig 2-4 3 warps 75 %");
  const t = M.warpSim(4, 4, 12, "gto", 32, true);
  ok(Array.from(t.issue).join("") === "00001111222233330000111122223333", "fig 2-4 issue pattern");
  for (const N of [1, 32]) for (const k of [1, 100]) for (const L of [10, 1000]) for (const pol of ["gto", "lrr"]) {
    const u = M.warpSim(N, k, L, pol, 3000).util; ok(u >= 0 && u <= 1 && Number.isFinite(u), "warp extreme " + [N, k, L, pol]);
  }
}

/* 3. 지연 숨기기 저장 비용 */
{
  const d = M.hideModel({ L: 800, m: 0.2, h: 0.95, ilp: 2, R: 32 });
  near(d.amat, 53.3, 1e-9, "AMAT 53.3"); near(d.win, 13.86, 1e-9, "window 13.86");
  ok(d.cpuB > 33000 && d.cpuB < 34500, "CPU ~34 KB per slot " + d.cpuB);
  near(d.thr, 81.6, 1e-9, "GPU 81.6 threads"); ok(d.regB === 82 * 128, "GPU 10.5 KB"); ok(!d.fits, "does not fit 16");
  const r = M.hideModel({ L: 800, m: 0.05, h: 0.95, ilp: 4, R: 32 });
  near(r.thr, 10.95, 1e-9, "reuse 11 threads"); ok(r.fits, "fits GX-1");
  const h99 = M.hideModel({ L: 800, m: 0.2, h: 0.99, ilp: 2, R: 32 });
  near(h99.cacheB / d.cacheB, 25, 1e-9, "h .95 -> .99 cache x25"); near(h99.cacheB, 819200, 1e-9, "0.8 MB per slot");
  ok(128e3 / ((36 + 36 + 64) * 1e6 / 18432) > 17 && 128e3 / ((136e6) / 18432) < 17.5, "per-lane storage ratio ~1/17");
  for (const L of [100, 1000]) for (const m of [0.02, 0.5]) for (const h of [0.5, 0.99]) for (const ilp of [1, 8]) for (const R of [16, 128])
    finite(M.hideModel({ L, m, h, ilp, R }), "hide");
}

/* 4. 문맥 전환 */
{
  const a = M.ctxModel({ R: 32, N: 16, k: 20, L: 800, bw: 128 });
  ok(a.ctxB === 4096 && a.maxRes === 16 && a.sw === 84, "R32: 4 KB, 16 warps, 84 cycles");
  near(a.uHw, 320 / 820, 1e-12, "HW 39 %"); near(a.uSw, 20 / 104, 1e-12, "SW 19 %");
  const b = M.ctxModel({ R: 32, N: 16, k: 60, L: 800, bw: 128 });
  ok(b.uHw === 1, "k60 HW 100 %"); near(b.uSw, 60 / 144, 1e-12, "k60 SW 42 %");
  ok(M.ctxModel({ R: 64, N: 16, k: 20, L: 800, bw: 128 }).maxRes === 8, "R64 8 warps");
  ok(M.ctxModel({ R: 128, N: 16, k: 20, L: 800, bw: 128 }).maxRes === 4, "R128 4 warps (quiz 8)");
  near(M.ctxModel({ R: 128, N: 16, k: 20, L: 800, bw: 128 }).uHw, 80 / 820, 1e-12, "quiz 8 ~10 %");
  ok(M.ctxModel({ R: 255, N: 16, k: 20, L: 800, bw: 128 }).maxRes === 2, "R255 2 warps");
  ok(64 * 32 * 32 * 4 === 262144 && 144 * 262144 / 2 ** 20 === 36, "RF 256 KB/SM, 36 MB chip");
  ok(32 * 8 + 32 * 64 === 2304, "CPU context 2.3 KB");
  for (const R of [16, 255]) for (const N of [1, 16]) for (const k of [1, 200]) for (const L of [30, 1000]) for (const bw of [32, 512]) {
    const c = M.ctxModel({ R, N, k, L, bw }); finite(c, "ctx"); ok(c.uHw <= 1 && c.uSw <= 1 && c.maxRes >= 1, "ctx bounds");
  }
}

/* 5. SIMD·SIMT·MIMD */
{
  const z = M.simtModel({ W: 8, n: 256, a: 6, b: 4, p: 0, seed: 7 });
  ok(z.simt.cyc === 224 && z.simd.cyc === 384, "p=0: SIMT 224, SIMD 384");
  near(z.simt.util, 1, 1e-12, "p=0 SIMT 100 %");
  const e = M.simtModel({ W: 8, n: 256, a: 5, b: 5, p: 0.5, seed: 3 });
  near(e.mimd.util, 1, 1e-12, "a=b MIMD 100 %"); ok(e.mimd.ctrl === 8 && e.simt.ctrl === 1, "control units");
  const w32 = M.simtModel({ W: 32, n: 256, a: 6, b: 4, p: 0.25, seed: 7 }), w8 = M.simtModel({ W: 8, n: 256, a: 6, b: 4, p: 0.25, seed: 7 });
  ok(w32.simt.util < w8.simt.util, "wider warp diverges more");
  ok(w32.simt.cyc >= 8 * 11 - 4 * 4, "W32 p.25: almost always both paths " + w32.simt.cyc);
  ok(1 - Math.pow(0.75, 32) > 0.999, "W32 p.25 mixed probability");
  for (const W of [4, 32]) for (const p of [0, 1]) for (const a of [1, 16]) for (const b of [1, 16]) {
    const s = M.simtModel({ W, n: 256, a, b, p, seed: 1 });
    for (const k of ["simd", "simt", "mimd"]) ok(s[k].util > 0 && s[k].util <= 1 + 1e-12 && Number.isFinite(s[k].cyc), "simt extreme " + [W, p, a, b, k]);
  }
}

/* 6. 그리드 배분 */
{
  const g = M.gridModel({ B: 1153, bs: 256, R: 32 });
  ok(g.bps === 8 && g.slots === 1152 && g.waves === 2, "1153 blocks: 8/SM, 2 waves");
  near(g.eff, 1153 / 2304, 1e-12, "eff 50.0 %");
  ok(M.gridModel({ B: 1152, bs: 256, R: 32 }).eff === 1, "1152 -> 100 %");
  near(M.gridModel({ B: 2000, bs: 256, R: 32 }).eff, 2000 / 2304, 1e-12, "2000 -> 86.8 %");
  near(M.gridModel({ B: 100, bs: 48, R: 32 }).laneEff, 0.75, 1e-12, "48 threads -> 75 %");
  const r = M.gridModel({ B: 1153, bs: 256, R: 128 });
  ok(r.bps === 2 && r.limiter === "regs" && r.waves === 5, "R128: 2 blocks/SM, 5 waves"); near(r.eff, 1153 / 1440, 1e-12, "R128 eff 80 %");
  ok(!M.gridModel({ B: 10, bs: 1024, R: 255 }).ok, "R255 x 1024 cannot launch");
  ok(144 * 2048 === 294912 && 144 * 64 === 9216 && 144 * 128 === 18432 && 294912 / 18432 === 16, "resident threads, warps, lanes");
  for (const B of [1, 5000]) for (const bs of [16, 1024]) for (const R of [16, 255]) {
    const x = M.gridModel({ B, bs, R }); ok(x.eff >= 0 && x.eff <= 1 && Number.isFinite(x.waves), "grid extreme " + [B, bs, R]);
  }
}

/* 7. 암달·구스타프손 */
{
  near(M.amdahl(0.01, 144), 59.26, 1e-3, "Amdahl 59x"); near(M.amdahl(0.01, 144) / 144, 0.4115, 1e-3, "eff 41 %");
  near(M.gustafson(0.01, 144), 142.57, 1e-9, "Gustafson 143x");
  near(M.serialFor(0.9, 144) * 100, 0.0777, 1e-2, "s <= 0.078 %"); near(M.serialFor(0.9, 18432) * 100, 0.000603, 1e-2, "s <= 0.0006 %");
  ok(M.amdahl(0, 144) === 144 && M.gustafson(0, 144) === 144, "s=0 ideal");
  for (const s of [0, 0.05]) for (const N of [1, 64, 144, 18432, 1e5]) { const a = M.amdahl(s, N), b = M.gustafson(s, N); ok(a >= 1 - 1e-12 && b >= 1 - 1e-12 && isFinite(a) && isFinite(b), "amdahl extreme"); }
}

/* 8. 파이프라인 */
{
  const d = M.pipeModel({ T: 2300, tov: 50, n: 4, W: 4 });
  near(d.f, 1.6, 1e-12, "1.6 GHz"); near(d.lat, 2500, 1e-12, "2.5 ns"); near(d.thr, 1.6, 1e-12, "1.6 instr/ns");
  ok(M.pipeBest(2300, 50, 4, 20).n === 4, "best depth 4 at W 4");
  const e = M.pipeModel({ T: 2300, tov: 50, n: 8, W: 4 });
  near(e.f, 2.963, 1e-3, "8 stages 2.96 GHz"); near(e.thr, 1.481, 1e-3, "8 stages 1.48"); near(e.lat, 2700, 1e-12, "2.7 ns");
  near(M.pipeModel({ T: 2300, tov: 50, n: 1, W: 1 }).period, 2350, 1e-12, "1 stage 2.35 ns");
  near(M.pipeModel({ T: 2300, tov: 50, n: 4, W: 1 }).thr, 0.4, 1e-12, "W1 0.4/ns");
  for (const T of [1000, 5000]) for (const tov of [10, 150]) for (const nn of [1, 20]) for (const W of [1, 32]) finite(M.pipeModel({ T, tov, n: nn, W }), "pipe");
}

/* 본문 수치가 정적 HTML에 그대로 있는지(모델을 바꾸면 본문도 바꾸라는 경고) */
for (const s of ["3.69 MB", "57,600", "25.6 KB", "k \\ge 54", "50.0 %", "약 59배", "1.48", "84사이클", "0.078 %"]) ok(html.includes(s), "text cites " + s);

console.log(n + " checks");
console.log("gpu throughput sims ok");
