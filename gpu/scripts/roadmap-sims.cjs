#!/usr/bin/env node
/* 16장 GPU 산업과 다음 세대(chapters/roadmap.html) 시뮬레이터 모델 회귀 검사.
   장의 스크립트에서 /* model:<이름> *\/ 블록을 잘라 node:vm에서 돌리고, 본문·GX-1 노트·해볼 것·퀴즈가 인용한 수치와
   슬라이더 끝값에서 NaN·음수·무한이 없는지 확인한다. 외부 패키지 없음, 1초 이내. */
"use strict";
const fs = require("fs"), vm = require("vm"), path = require("path"), assert = require("assert");
const html = fs.readFileSync(path.join(__dirname, "..", "chapters", "roadmap.html"), "utf8");
const NAMES = ["gx", "trend", "supply", "cost", "tco", "asic", "next", "scale", "wall"];
const block = (n) => { const a = "/* model:" + n + " */", b = "/* /model:" + n + " */", i = html.indexOf(a), j = html.indexOf(b, i); assert(i >= 0 && j > i, "model block " + n); return html.slice(i, j); };
const ctx = { Math, Number, Object, Array, Infinity, isFinite };
vm.createContext(ctx);
vm.runInContext(NAMES.map(block).join("\n") + "\nthis.M = { GX, dpw, gridDies, dieYield, binomAtLeast, trendAt, supply, costBreakdown, COST0, tco, TCO0, asicCost, asicBreakeven, nextTech, chipletCostPerMM2, waferScale, bestChiplet, packagesFor, wallAt };", ctx);
const M = ctx.M;
let n = 0;
const ok = (c, m) => { assert(c, m); n++; };
const near = (x, y, tol, m) => ok(Math.abs(x - y) <= tol, m + ": got " + x + ", want " + y + " ± " + tol);
const fin = (x, m) => ok(Number.isFinite(x) && x >= 0, m + " finite/non-negative: " + x);

/* GX-1 기준값 */
ok(M.dpw(26, 30) === 63, "63 dies per wafer");
near(M.dieYield(0.08), 0.807, 0.002, "die yield with harvesting");
ok(M.gridDies(26, 30) === 70, "10장: 격자 배치 70 dies"); ok(M.dpw(26, 30) === 63, "approx formula 63"); ok(M.gridDies(58, 43) === 20, "11장: 20 interposers per wafer");

/* 1. 추세 */
const TP = { dTr: 2.5, dFl: 2, dBw: 3, gTdp: 0.1 };
near(M.trendAt(TP, 0).ridge, 128, 0.2, "ridge at GX-1");
near(M.trendAt(TP, 6).ridge, 256, 0.5, "ridge doubles in 6 years");
near(M.trendAt(TP, 8).ridge, 323, 1, "fig 16-1 ridge after 8 years");
near(M.trendAt(TP, 8).bw / M.GX.bw, 6.35, 0.01, "BW x6.3 in 8 years");
near(M.trendAt({ ...TP, dBw: 2 }, 9).ridge, 128, 0.2, "equal growth keeps ridge");
near(M.trendAt({ ...TP, gTdp: 0 }, 6).eff / 1e12, 7.55, 0.01, "FLOPS/W x8 with flat TDP");
near(M.trendAt({ ...TP, dFl: 1.5 }, 6).ridge, 512, 1, "faster FLOPS ridge 512");
const g2 = M.trendAt(TP, 2);
near(g2.fl / 1e12, 1887, 1, "GX-2 FLOPS"); near(g2.bw / 1e12, 11.7, 0.01, "GX-2 BW"); near(g2.tdp, 1210, 0.5, "GX-2 TDP");
near(g2.ridge, 161, 0.5, "GX-2 ridge"); near(g2.eff / 1e12, 1.56, 0.005, "GX-2 FLOPS/W"); near(g2.tr / 1e9, 160, 0.5, "GX-2 transistors");
ok(g2.tr > 858 * 118e6, "GX-2 does not fit one reticle at 118 MTr/mm2");
near(g2.bw / M.GX.bw, 1.59, 0.005, "decode speedup 1.59");
for (const d of [1, 1.5, 5, 6]) for (const t of [0, 10]) { const r = M.trendAt({ dTr: d, dFl: d, dBw: d, gTdp: 0.25 }, t); Object.values(r).forEach((v) => fin(v, "trend " + d + "," + t)); }

/* 2. 공급망 */
const SP = { wafers: 4000, stacks: 1.5e6, ipWafers: 10000, ipYield: 0.9, pkgYield: 0.98 };
let s = M.supply(SP);
near(s.gdpw, 56.49, 0.01, "good dies per wafer 70 x 80.7%");
near(s.st[0].v, 226.0e3, 100, "logic 22.6만"); near(s.st[1].v, 250e3, 1, "HBM 25만"); near(s.st[2].v, 180e3, 1, "interposer 18만");
ok(s.b === 2, "interposer bottleneck"); near(s.ship, 176.4e3, 1, "ship 17.6만");
s = M.supply({ ...SP, ipWafers: 18000 }); ok(s.b === 0, "logic becomes bottleneck"); near(s.ship, 221.4e3, 100, "ship 22.1만");
s = M.supply({ ...SP, ipWafers: 18000, wafers: 6000 }); ok(s.b === 1, "HBM becomes bottleneck"); near(s.ship, 245e3, 1, "ship 24.5만");
ok(M.supply({ ...SP, stacks: 1.95e6 }).ship === M.supply(SP).ship, "quiz 2: HBM +30% does nothing");
for (const w of [1000, 10000]) for (const st of [3e5, 3e6]) for (const iw of [2000, 30000]) for (const iy of [0.7, 0.99]) { const r = M.supply({ wafers: w, stacks: st, ipWafers: iw, ipYield: iy, pkgYield: 0.98 }); fin(r.ship, "ship"); fin(r.gain10, "gain10"); ok(r.gain10 <= 0.1 + 1e-12, "gain <= 10%"); }

/* 3. 원가 */
let c = M.costBreakdown(M.COST0);
near(c.n, 70, 0, "70 dies"); near(c.die, 319, 0.5, "die $319 (10장)"); near(c.hbm, 2160, 0, "HBM $2,160"); near(c.cogs, 5350, 1, "COGS ~$5,350"); near(c.price, 17832, 2, "price ~$17,830");
near(c.margin, 12482, 2, "margin ~$12,480"); near(c.hbm / c.cogs, 0.404, 0.002, "HBM 40% of COGS"); near(c.die / c.cogs, 0.0596, 0.001, "die 6% of COGS"); near((c.die + c.hbm + 1000) / 0.98, 3550, 1, "10장 package $3,550");
near(c.die / c.price, 0.0179, 0.0005, "die ~1.8% of price"); near(c.parts[3].v, 71, 0.5, "package loss ~$71"); near(c.cogs / c.price, 0.30, 0.001, "COGS 30%"); near(18000 / (70 * Math.exp(-7.8 * 0.08)), 480, 0.5, "no harvest $480");
let x = M.costBreakdown({ ...M.COST0, d0: 0.3 }); near(x.y, 0.4475, 0.002, "yield 45%"); near(x.die, 575, 1, "die $575"); near(x.price, 18700, 5, "price $18,700");
near(x.price / c.price - 1, 0.049, 0.002, "price +5%");
x = M.costBreakdown({ ...M.COST0, hbmGB: 25 }); near(x.cogs, 6819, 3, "COGS $6,820"); near(x.price, 22730, 5, "price $22,730"); near(x.price / c.price - 1, 0.275, 0.003, "+27%");
x = M.costBreakdown({ ...M.COST0, margin: 0.5 }); near(x.price, 10699, 3, "price $10,700");
x = M.costBreakdown({ ...M.COST0, wafer: 30000 }); near(x.die, 531, 1, "die $531"); near(x.price / c.price - 1, 0.041, 0.002, "+4%"); near(c.die / 780, 0.409, 0.001, "GX-1 $0.41/mm2"); near(480 / 780, 0.615, 0.001, "no harvest $0.62/mm2");
for (const w of [8000, 30000]) for (const d of [0.02, 0.4]) for (const h of [5, 30]) for (const m of [0, 0.85]) { const r = M.costBreakdown({ ...M.COST0, wafer: w, d0: d, hbmGB: h, margin: m, pkg: 3000 }); fin(r.price, "price"); ok(r.price >= r.cogs, "price >= COGS"); }

/* 4. TCO */
let t = M.tco(M.TCO0);
near(t.perUseful, 1.47, 0.005, "$1.47/h"); near(t.perMTok, 0.163, 0.001, "$0.16 per 1M tokens"); near(t.opexShare, 0.127, 0.001, "power 13%");
near(t.total, 30936, 2, "GPU TCO ~$30,900"); near(t.gpuHours, 618e3, 1e3, "618k GPU-hours");
near(M.tco({ ...M.TCO0, util: 0.3 }).perUseful, 2.83, 0.005, "util 30% -> $2.83");
near(M.tco({ ...M.TCO0, kwh: 0.24 }).opexShare, 0.304, 0.002, "3x power price -> 30%");
near(M.tco({ ...M.TCO0, price: 9000 }).opexShare, 0.226, 0.002, "half price -> 23%");
for (const pr of [5000, 60000]) for (const k of [0.02, 0.3]) for (const u of [0.1, 1]) for (const y of [2, 7]) for (const tp of [500, 10000]) { const r = M.tco({ ...M.TCO0, price: pr, kwh: k, util: u, years: y, tps: tp, pue: 2 }); [r.perUseful, r.perMTok, r.trainCost, r.opexShare].forEach((v) => fin(v, "tco")); }

/* 5. ASIC */
const AP = { nre: 300e6, r: 0.6, f: 0.8, tg: t.total };
near(M.asicBreakeven(AP), 30.3e3, 100, "break-even 3.0만"); near(M.asicCost(AP, 50e3).gpu - M.asicCost(AP, 50e3).asic, 195e6, 1e6, "ASIC $195M cheaper at 5만");
near(M.asicBreakeven({ ...AP, f: 0.4 }), 60.6e3, 100, "f 40% -> 6.1만"); ok(M.asicCost({ ...AP, f: 0.4 }, 50e3).asic > M.asicCost({ ...AP, f: 0.4 }, 50e3).gpu, "GPU wins at f 40%");
ok(M.asicBreakeven({ ...AP, r: 1 }) === Infinity && M.asicBreakeven({ ...AP, f: 0 }) === Infinity, "no break-even");
near(M.asicBreakeven({ nre: 300e6, r: 0.5, f: 0.5, tg: 30000 }), 40000, 1e-6, "quiz 5");
for (const nre of [20e6, 1000e6]) for (const r of [0.2, 1]) for (const f of [0, 1]) for (const N of [5e3, 200e3]) { const q = M.asicCost({ nre, r, f, tg: t.total }, N); fin(q.gpu, "gpu"); fin(q.asic, "asic"); }

/* 6. 다음 기술 */
const NP = { bspdn: 1, irCut: 0.4, sram: 1, sramMB: 128, hb: 1, d2dTBs: 4, hbPj: 0.05, cpo: 1, cpoPj: 5 }, OFF = { bspdn: 0, sram: 0, hb: 0, cpo: 0 };
let nx = M.nextTech(NP);
near(nx.P0, 1216, 1e-9, "baseline 1,216 W"); near(nx.P1, 960, 0.5, "after ~960 W"); near(nx.gain, 1.267, 0.001, "x1.27");
const top = nx.steps.reduce((a, q) => (a.w >= q.w ? a : q)); ok(top.k === "cpo" && Math.abs(top.w - 144) < 1e-9, "CPO 144 W largest");
near(nx.steps.find((q) => q.k === "hb").w, 14.4, 1e-9, "hybrid 14.4 W (quiz 6)");
near(M.nextTech({ ...NP, ...OFF, cpo: 1 }).gain, 1.134, 0.001, "CPO only x1.13");
near(M.nextTech({ ...NP, ...OFF, bspdn: 1 }).gain, 1.031, 0.001, "BSPDN x1.03");
near(M.nextTech({ ...NP, ...OFF, bspdn: 1, irCut: 0.8 }).gain, 1.064, 0.001, "BSPDN 80% x1.06");
near(M.nextTech({ ...NP, ...OFF, sram: 1, sramMB: 512 }).steps[0].w, 89.8, 0.05, "SRAM 512 MB ~90 W");
near(M.nextTech({ ...NP, ...OFF, hb: 1, hbPj: 0.5 }).steps[0].w, 0, 1e-12, "hb 0.5 pJ -> 0 W");
ok(M.nextTech({ ...NP, ...OFF }).gain === 1, "nothing on -> x1");
for (const ir of [0, 0.8]) for (const mb of [0, 512]) for (const hp of [0.02, 0.5]) for (const cp of [2, 15]) { const r = M.nextTech({ ...NP, irCut: ir, sramMB: mb, hbPj: hp, cpoPj: cp }); fin(r.P1, "P1"); ok(r.P1 > 0 && r.gain >= 1 - 1e-12, "gain >= 1"); }

/* 7. 칩렛·웨이퍼 스케일 */
let b = M.bestChiplet(0.08, 18000); ok(b.a === 210, "best chiplet 210 mm2, got " + b.a); near(b.c, 0.454, 0.001, "$0.45/mm2");
b = M.bestChiplet(0.2, 18000); ok(b.a === 140, "best chiplet 140 at D0 0.2, got " + b.a);
let ws = M.waferScale(0.08, 18000); near(ws.A, 43218, 1, "WS area ~43,200"); near(ws.costMM2, 0.654, 0.001, "WS $0.65");
ws = M.waferScale(0.2, 18000); near(ws.y, 0.421, 0.001, "WS yield 42%"); near(ws.costMM2, 1.098, 0.002, "WS $1.10");
near(M.chipletCostPerMM2(20, 0.08, 18000), 1.49, 0.005, "20 mm2 $1.49"); near(M.chipletCostPerMM2(780, 0.08, 18000), 0.708, 0.001, "780 mm2 $0.71");
ok(M.bestChiplet(0.02, 18000).a > 210, "lower D0 -> bigger optimum");
const pk = M.packagesFor(3200); ok(pk.interposer === 2 && pk.panel === 1 && pk.wafer === 1, "packages for 3,200 mm2");
for (const d of [0.02, 0.4]) for (const w of [8000, 30000]) for (const a of [20, 858]) { fin(M.chipletCostPerMM2(a, d, w), "chiplet"); fin(M.waferScale(d, w).costMM2, "ws"); fin(M.bestChiplet(d, w).c, "best"); }
ok(M.packagesFor(40000).interposer === 24 && M.packagesFor(40000).wafer === 2, "40,000 mm2 packages");

/* 8. 전력 벽 */
const WP = { mw: 100, gP: 0.1, gE: 0.286, gD: 2, pue: 1.3 };
let w0 = M.wallAt(WP, 0), w5 = M.wallAt(WP, 5);
near(w0.gpus0, 51282, 1, "51,300 GPUs"); near(w0.deliver / 1e18, 48.4, 0.05, "48 EFLOPS"); near(w0.gpus0 / 32, 1603, 1, "~1,600 racks");
near(8.4e23 / (w0.deliver * 0.4) / 3600, 12.05, 0.05, "70B training ~12 h");
near(w5.deliver / w5.demand, 0.177, 0.001, "supply 18% of demand"); near(w5.needMW, 910, 1, "910 MW");
near(M.wallAt({ ...WP, gP: 0 }, 1).deliver / M.wallAt({ ...WP, gP: 0 }, 0).deliver, 1.286, 1e-9, "growth = efficiency");
near(M.wallAt({ ...WP, gE: 0.5 }, 5).needMW, 421, 1, "50%/yr -> 420 MW");
near(M.wallAt({ ...WP, gD: 1.414 }, 5).deliver / M.wallAt({ ...WP, gD: 1.414 }, 5).demand, 1.0, 0.01, "demand x1.414 matches");
near(Math.sqrt(2) / 1.1, 1.286, 0.001, "g_eta 28.6% from trend"); near(2 / 1.21, 1.65, 0.005, "facility x1.65");
for (const mw of [10, 1000]) for (const gP of [0, 0.3]) for (const gE of [0, 0.6]) for (const gD of [1, 4]) for (const pue of [1.05, 2]) for (const tt of [0, 8]) { const r = M.wallAt({ mw, gP, gE, gD, pue }, tt); [r.deliver, r.demand, r.needMW].forEach((v) => fin(v, "wall")); }

console.log("gpu roadmap sims ok");
