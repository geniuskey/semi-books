#!/usr/bin/env node
/* 8장 HBM과 메모리 대역폭(chapters/hbm.html) 시뮬레이터 회귀 검사.
   장 HTML에서 /* model:<이름> *\/ 블록을 잘라 node:vm에서 돌리고, 본문·GX-1 노트·퀴즈가 인용한 수치와
   슬라이더 극단값(NaN·음수·무한 없음)을 확인한다. 외부 패키지 없음, 1초 안. */
"use strict";
const fs = require("fs"), vm = require("vm"), path = require("path"), assert = require("assert");
const html = fs.readFileSync(path.join(__dirname, "..", "chapters", "hbm.html"), "utf8");
const block = (name) => {
  const a = "/* model:" + name + " */", b = "/* /model:" + name + " */";
  const i = html.indexOf(a), j = html.indexOf(b, i);
  assert(i >= 0 && j > i, "model block " + name);
  return html.slice(i + a.length, j);
};
const names = ["bw", "energy", "shore", "dram", "stack", "power", "fit"];
const ctx = { Math, Object, Number, Array, JSON, isFinite };
vm.createContext(ctx);
vm.runInContext(names.map(block).join("\n") +
  "\nthis.M = { HBM_IF, bwCalc, EN_PRESET, EN_K, ioEnergy, pinsFor, phyWidth, shoreline, dramSim, DRAM_T, stackCalc, STACK_DEF, trefi, hbmPower, PWR_DEF, fitCalc };", ctx);
const M = ctx.M;
let n = 0;
const ok = (c, m) => { assert(c, m); n++; };
const near = (x, y, tol, m) => ok(Math.abs(x - y) <= tol, m + ": got " + x + ", want " + y + " ± " + tol);
const finite = (o, m) => { for (const k in o) if (typeof o[k] === "number") ok(isFinite(o[k]), m + "." + k + " finite (" + o[k] + ")"); };

/* 1. 대역폭 계산기: GX-1 7.37 TB/s, GX-G 896 GB/s, HBM4 2,048 GB/s/스택 */
{
  const I = M.HBM_IF, r = (k) => M.bwCalc(I[k].width, I[k].gbps, I[k].count, I[k].pj);
  near(r("hbm3e").per, 1228.8, 1e-9, "HBM3E per stack"); near(r("hbm3e").total, 7372.8, 1e-6, "GX-1 total");
  ok(r("hbm3e").pins === 6144, "GX-1 data pins");
  near(r("hbm3e").watts, 176.9, 0.1, "GX-1 peak power ~177 W");
  near(r("gddr7").total, 896, 1e-9, "GX-G 896 GB/s"); near(r("gddr7").per, 112, 1e-9, "GDDR7 chip 112 GB/s");
  near(M.bwCalc(32, 28, 16, 6).total, 1792, 1e-9, "GDDR7 ×16 = 1.79 TB/s");
  near(r("hbm4").per, 2048, 1e-9, "HBM4 per stack"); near(r("hbm4").total / 1000, 12.288, 1e-9, "HBM4 ×6");
  near(r("hbm4").per / r("hbm3e").per, 1.67, 0.01, "HBM4/HBM3E ~1.7x");
  near(r("lpddr").per, 68.26, 0.01, "LPDDR ~68 GB/s");
  near(1228.8 / 112, 10.97, 0.01, "HBM stack ≈ 11 GDDR chips");
  near(M.bwCalc(2048, 8, 1, 0).per, 2048, 1e-9, "quiz 1");
  for (const w of [16, 2048]) for (const g of [1, 40]) for (const c of [1, 16]) finite(M.bwCalc(w, g, c, 6), "bw extreme");
  ok(M.bwCalc(0, 0, 0, 0).total === 0, "zero input");
}

/* 2. 비트당 에너지: HBM ≈ 2.9–3, GDDR ≈ 6 pJ/bit */
{
  const h = M.ioEnergy(M.EN_PRESET.hbm), g = M.ioEnergy(M.EN_PRESET.gddr);
  near(h.C, 0.85, 1e-9, "HBM C"); near(h.eCap, 0.068, 1e-9, "HBM cap"); near(h.eCkt, 0.3765, 1e-3, "HBM ckt");
  near(h.io, 0.44, 0.01, "HBM I/O"); near(h.total, 2.94, 0.01, "HBM total ~2.9");
  near(g.C, 3, 1e-9, "GDDR C"); near(g.eCap, 0.90, 1e-9, "GDDR cap"); near(g.eTerm, 0.134, 1e-3, "GDDR term");
  near(g.eCkt, 2.452, 1e-9, "GDDR ckt"); near(g.io, 3.49, 0.01, "GDDR I/O"); near(g.total, 5.99, 0.01, "GDDR total ~6");
  near(g.io / h.io, 7.8, 0.2, "I/O ratio ~8x"); near(g.eCap / h.eCap, 13.2, 0.1, "cap ratio ~13x");
  near(M.ioEnergy(Object.assign({}, M.EN_PRESET.hbm, { gbps: 28 })).eCkt, 2.452, 1e-9, "HBM at 28 Gb/s ckt 2.45");
  near(M.ioEnergy(Object.assign({}, M.EN_PRESET.hbm, { L: 20, cpad: 1, rt: 80 })).io, 0.88, 0.01, "long wire + term ~2x");
  const gh = M.ioEnergy(Object.assign({}, M.EN_PRESET.gddr, { vddq: 0.6 }));
  near(gh.eCap, g.eCap / 2, 1e-9, "VDDQ half → cap half"); near(gh.eTerm, g.eTerm / 2, 1e-9, "VDDQ half → term half");
  ok(M.pinsFor(1228.8, 9.6) === 1024 && M.pinsFor(1228.8, 28) === 352, "pins for 1.23 TB/s");
  ok(M.pinsFor(7372.8, 28) === 2107, "pins for 7.37 TB/s at 28 Gb/s ≈ 2,100");
  near(7372.8e9 * 8 * 6e-12, 353.9, 0.1, "GDDR-style 7.37 TB/s ≈ 350 W");
  for (const L of [0.5, 60]) for (const c of [0.05, 2]) for (const v of [0.1, 1.2]) for (const q of [0.3, 1.5]) for (const r of [1, 40]) for (const rt of [0, 80]) {
    const e = M.ioEnergy({ L, cw: 0.2, cpad: c, vsw: v, vddq: q, gbps: r, rt });
    finite(e, "energy extreme"); ok(e.io > 0, "energy positive");
  }
}

/* 3. 쇼어라인: GX-1 6스택, 네 변 10, GX-G 크기 4, HBM4 PHY 18 → 9 mm */
{
  const base = { dieL: 30, dieS: 26, signals: 1700, pitch: 45, rows: 8, stackW: 10, sides: 2 };
  const r = M.shoreline(base);
  near(r.wPhy, 9.5625, 1e-9, "PHY width 9.6 mm"); ok(r.slot === 10 && r.stacks === 6 && r.perSide === 3, "GX-1 6 stacks");
  near(r.frac, 60 / 112, 1e-9, "shoreline fraction 54%");
  near(943.7 / (r.stacks * 1.2288), 128.0, 0.1, "ridge 128");
  ok(M.shoreline(Object.assign({}, base, { sides: 4 })).stacks === 10, "four sides 10 stacks");
  ok(M.shoreline(Object.assign({}, base, { sides: 1 })).stacks === 3, "one side 3");
  ok(M.shoreline(Object.assign({}, base, { dieL: 33 })).stacks === 6, "reticle 33 mm still 6");
  const gg = M.shoreline(Object.assign({}, base, { dieL: 21, dieS: 18 }));
  ok(gg.stacks === 4, "GX-G size 4 stacks"); near(943.7 * gg.area / 780 / (gg.stacks * 1.2288), 93.0, 0.2, "GX-G size ridge ~93");
  const h4 = M.shoreline(Object.assign({}, base, { signals: 3200 }));
  near(h4.wPhy, 18, 1e-9, "HBM4 PHY 18 mm"); ok(h4.perSide === 1, "HBM4 one per side");
  near(M.shoreline(Object.assign({}, base, { signals: 3200, rows: 16 })).wPhy, 9, 1e-9, "HBM4 16 rows 9 mm");
  near(943.7 / 12.288, 76.8, 0.1, "HBM4 ridge ~77");
  for (const L of [10, 33]) for (const S of [10, 26]) for (const p of [25, 55]) for (const rw of [4, 20]) for (const sd of [1, 2, 4]) for (const sg of [1700, 3200]) {
    const x = M.shoreline({ dieL: L, dieS: S, signals: sg, pitch: p, rows: rw, stackW: 10, sides: sd });
    finite(x, "shore extreme"); ok(x.stacks >= 0 && Number.isInteger(x.stacks), "stacks integer ≥ 0");
  }
}

/* 4. DRAM 뱅크·행 버퍼 */
{
  const T = M.DRAM_T, run = (o) => M.dramSim(Object.assign({ t: T, banks: 16, q: 48, pattern: "stream", sched: "frfcfs", n: 1200, bytes: 32, colsPerRow: 32, seed: 7 }, o));
  near(32 * 9.6 / 8, 38.4, 1e-9, "pseudo-channel 38.4 GB/s"); near(38.4 * 192, 7372.8, 1e-6, "192 PCs");
  near(T.burst, 32 * 8 / 9.6 / 32, 1e-3, "burst 0.83 ns");
  const s1 = run({ q: 1 }); near(s1.eff, 0.054, 0.005, "stream Q1 ~5%");
  const s48 = run({}); near(s48.eff, 0.944, 0.01, "stream Q48 ~94%"); near(s48.bw, s48.eff * 38.4, 0.05, "bw = eff × peak");
  const r16 = run({ pattern: "random", q: 32 }); near(r16.eff, 0.217, 0.01, "random 16 banks ~22%");
  const r48 = run({ pattern: "random", q: 32, banks: 48 }); near(r48.eff, 0.386, 0.01, "random 48 banks ~39%");
  const r64 = run({ pattern: "random", q: 64, banks: 64 }); ok(r64.eff < T.burst / T.rrd + 1e-9 && r64.eff > 0.38, "tRRD cap ~42%: " + r64.eff);
  const ob = run({ pattern: "onebank", q: 32 }); near(ob.eff, T.burst / (T.ras + T.rp), 0.002, "one bank ~1.8%");
  const fc = run({ pattern: "random", q: 32, sched: "fcfs" }); near(fc.eff, 0.077, 0.01, "random FCFS ~8%");
  ok(run({ pattern: "reuse", q: 32 }).hits > 0, "reuse has hits");
  ok(s48.hits + s48.miss + s48.conf === 1200, "all requests served");
  // 퀴즈 3: 충돌 지연 = 3 × 14 ns
  near(T.rp + T.rcd + T.cl, 42, 1e-9, "conflict latency 42 ns");
  // 리틀: DRAM 장치 지연 ~30 ns × 38.4 GB/s ≈ 36 요청
  near(30 * 38.4 / 32, 36, 0.01, "Little per PC");
  near(7372.8e9 * 500e-9 / 1e6, 3.69, 0.01, "Little GX-1 3.7 MB");
  near(7372.8e9 * 500e-9 / 192 / 32, 600, 0.1, "600 requests per PC");
  const t0 = Date.now();
  for (const p of ["stream", "reuse", "random", "onebank"]) for (const b of [1, 64]) for (const q of [1, 64]) for (const tt of [6, 24]) for (const sc of ["fcfs", "frfcfs"]) {
    const x = run({ pattern: p, banks: b, q, sched: sc, n: 300, t: { rcd: tt, rp: tt, cl: tt, ras: T.ras, rrd: T.rrd, burst: T.burst } });
    ok(isFinite(x.eff) && x.eff > 0 && x.eff <= 1 + 1e-9 && x.bw > 0 && isFinite(x.lat), "dram extreme " + [p, b, q, tt, sc] + " " + x.eff);
  }
  ok(Date.now() - t0 < 5000, "dram sweep finishes (no runaway loop)");
}

/* 5. 스택 높이·용량·열 */
{
  const S = (o) => M.stackCalc(Object.assign({}, M.STACK_DEF, o));
  const s8 = S({}); ok(s8.gb === 24 && s8.h === 580 && s8.fits, "8-high 24 GB 580 µm"); near(s8.tmax, 67.5, 1e-9, "8-high tmax");
  near(s8.tBase, 82.4, 0.1, "8-high base ~82 °C"); ok(s8.tsv === 32000, "TSV 8 × 4000");
  near(s8.gb * 6, 144, 1e-9, "GX-1 144 GB");
  const s12 = S({ layers: 12 }); ok(s12.h === 840 && !s12.fits && s12.gb === 36, "12-high 50 µm 840 over");
  const s12b = S({ layers: 12, tdie: 40 }); ok(s12b.h === 720 && s12b.fits, "12-high 40 µm = 720"); near(s12b.tBase, 88.9, 0.1, "12-high ~89 °C");
  near(S({ layers: 12 }).tmax, 40, 1e-9, "quiz 4: 40 µm");
  const s16 = S({ layers: 16, tdie: 26 }); near(s16.tmax, 26.25, 1e-9, "16-high µbump 26 µm"); near(s16.tBase, 95.2, 0.1, "16-high ~95 °C"); ok(s16.h === 716 && s16.gb === 48, "16-high 716");
  const s16h = S({ layers: 16, tdie: 26, tbond: 1 }); near(s16h.tBase, 72.1, 0.1, "hybrid ~72 °C");
  near(S({ layers: 16, tbond: 1 }).tmax, 40.25, 1e-9, "16-high HB 40 µm"); ok(S({ layers: 16, tdie: 40, tbond: 1 }).h === 716, "16 HB 716");
  near(S({ layers: 16, limit: 775 }).tmax, 29.69, 0.01, "16-high @775");
  ok(s8.prof.length === 9 && Math.abs(s8.prof[0] - s8.tBase) < 1e-9 && s8.prof[8] === 70, "profile ends");
  for (let i = 1; i < s8.prof.length; i++) ok(s8.prof[i] <= s8.prof[i - 1], "profile decreasing");
  for (const L of [4, 16]) for (const g of [16, 32]) for (const d of [20, 80]) for (const b of [1, 25]) for (const lim of [720, 775]) for (const p of [5, 40]) {
    const x = S({ layers: L, gbit: g, tdie: d, tbond: b, limit: lim, pstack: p });
    finite(x, "stack extreme"); ok(x.h > 0 && x.dT >= 0 && x.prof.every(isFinite), "stack sane");
  }
}

/* 6. HBM 전력·리프레시 */
{
  const P = (o) => M.hbmPower(Object.assign({}, M.PWR_DEF, o));
  const d = P({}); near(d.total, 148.7, 0.1, "default ~149 W (~150)"); near(d.dyn, 139.7, 0.1, "dyn ~140"); near(d.stat, 7.2, 1e-9, "static 7.2"); near(d.ref, 1.8, 1e-9, "ref 1.8");
  const f = P({ util: 1 }); near(f.total, 183.6, 0.1, "100% ~184 W"); near(f.dyn, 174.6, 0.1, "dyn ~175");
  ok(M.trefi(85) === 3.9 && M.trefi(86) === 1.95 && M.trefi(96) === 0.975, "tREFI steps");
  near(P({ perBank: false }).block, 350 / 3900, 1e-9, "all-bank 9%"); near(P({ perBank: false, temp: 90 }).block, 0.1795, 1e-3, "all-bank 90 °C 18%");
  near(P({ perBank: false, temp: 100 }).block, 0.359, 1e-3, "all-bank >95 36%");
  near(P({}).block, 0.0135, 1e-3, "per-bank 1.3%"); near(P({ temp: 100 }).block, 0.0538, 1e-3, "per-bank >95 5.4%");
  near(P({ perBank: false, temp: 90 }).bwAvail, 6049.5, 0.5, "90 °C all-bank avail 6.05 TB/s");
  for (const s of [1, 8]) for (const u of [0, 1]) for (const e of [1.5, 6]) for (const t of [40, 105]) for (const pb of [true, false]) {
    const x = P({ stacks: s, util: u, pj: e, temp: t, perBank: pb }); finite(x, "power extreme"); ok(x.total > 0 && x.block < 1, "power sane");
  }
}

/* 7. GX-LM-70B 용량·대역폭·원가 */
{
  const F = (o) => M.fitCalc(Object.assign({ params: 70e9, bytesPerParam: 1, context: 8192, batch: 1, stacks: 6, stackGB: 24, perStack: 1228.8, costGB: 15 }, o));
  const d = F({}); near(d.need / 1e9, 72.68, 0.01, "FP8 need 72.7 GB"); near(d.kvSeq / 1e9, 2.684, 0.001, "KV 2.68 GB");
  ok(d.fits && d.stacksNeeded === 4, "4 stacks needed"); near(d.tokS, 101.4, 0.1, "6 stacks ~101 tok/s"); ok(d.cost === 2160, "HBM $2,160");
  near(7372.8 / 70, 105.3, 0.1, "weights-only 105");
  ok(!F({ stacks: 3 }).fits, "3 stacks short"); near(72 - d.need / 1e9, -0.68, 0.01, "short by 0.7 GB");
  near(F({ stacks: 4 }).tokS, 67.6, 0.1, "4 stacks ~68"); near(F({ stacks: 4 }).bw / 1e12, 4.915, 0.001, "4 stacks 4.9 TB/s");
  const bf = F({ bytesPerParam: 2 }); near(bf.need / 1e9, 142.68, 0.01, "BF16 142.7"); ok(bf.fits && bf.stacksNeeded === 6, "BF16 6 stacks"); near(bf.tokS, 51.7, 0.1, "BF16 ~52");
  const b32 = F({ batch: 32 }); ok(!b32.fits, "batch 32 over"); near(b32.need / 1e9, 155.9, 0.1, "batch 32 156 GB"); near(32 * b32.kvSeq / 1e9, 85.9, 0.1, "KV 86 GB");
  near(b32.tokS, 1513, 1, "batch 32 ~1500 tok/s"); ok(F({ batch: 32, stackGB: 36 }).fits, "36 GB stacks fit");
  near(2160 / 7.3728, 293, 1, "$/TB/s HBM ~290"); near(1000 / 112 * 2 * 4, 71.4, 0.1, "$/TB/s GDDR ~70");
  near(144 / 2 * 2 * 4, 576, 1e-9, "GDDR 144 GB $576"); near(144 * 3, 432, 1e-9, "LPDDR $432");
  for (const bp of [0.5, 1, 2]) for (const b of [1, 64]) for (const c of [2048, 32768]) for (const s of [1, 8]) for (const g of [16, 48]) for (const $ of [5, 30]) {
    const x = F({ bytesPerParam: bp, batch: b, context: c, stacks: s, stackGB: g, costGB: $ }); finite(x, "fit extreme"); ok(x.tokS > 0 && x.cost > 0, "fit sane");
  }
}

console.log("gpu hbm sims ok (" + n + " checks)");
