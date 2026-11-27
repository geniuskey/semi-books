#!/usr/bin/env node
/* 10장 다이 크기·수율·칩렛(chapters/die.html) 시뮬레이터 회귀 검사.
   장의 스크립트에서 /* model:<이름> *\/ 블록을 잘라 node:vm에서 실행하고,
   본문·GX-1 노트·해볼 것·퀴즈가 인용하는 다이 수·수율·원가 값과 극단 입력을 확인한다. 외부 패키지 없음. */
"use strict";
const fs = require("fs"), vm = require("vm"), path = require("path"), assert = require("assert");
const html = fs.readFileSync(path.join(__dirname, "../chapters/die.html"), "utf8");
const NAMES = ["wafer", "yield", "harvest", "mc", "cost", "chiplet", "link", "pkg"];
const src = NAMES.map((n) => {
  const a = `/* model:${n} */`, b = `/* /model:${n} */`, i = html.indexOf(a), j = html.indexOf(b, i);
  assert(i >= 0 && j > i, "model block " + n);
  return html.slice(i, j + b.length);
}).join("\n");
const ctx = { Math, Object, Array, Number, isFinite };
vm.createContext(ctx);
vm.runInContext(src + "\nthis.M = { dieGrid, bestOffset, dpwFormula, yPoisson, yNB, yMurphy, ySeeds, harvest, mkRng, simWafer, gammaSample, poissonSample, GX, goodDieCost, costCurve, chiplet, LINKS, linkCalc, pkgCost };", ctx);
const M = ctx.M, GX = M.GX;
let n = 0;
const ok = (c, m) => { assert(c, m); n++; };
const near = (v, t, tol, m) => ok(Math.abs(v - t) <= tol, `${m}: ${v} vs ${t}`);
const fin = (v, m) => ok(Number.isFinite(v) && v >= 0, `${m}: ${v}`);
const W0 = { D: 300, edge: 3, w: 26, h: 30, s: 0.1 };

/* 1. 웨이퍼 다이 배치 */
{
  const best = M.bestOffset(W0, 16);
  ok(best.full === 70 && best.partial === 42, "GX-1 best 70 full / 42 partial: " + best.full + "/" + best.partial);
  ok(M.dieGrid(W0).full === 67, "centered 67");
  near(M.dpwFormula(294, 26.1 * 30.1), 63.1, 0.05, "formula 63.1");
  ok(M.bestOffset({ ...W0, edge: 0 }, 16).full === 72 && M.bestOffset({ ...W0, edge: 6 }, 16).full === 68, "edge 0→72, 6→68");
  const s10 = M.bestOffset({ ...W0, w: 10, h: 10 }, 16), f10 = M.dpwFormula(294, 10.1 * 10.1);
  ok(s10.full === 612 && Math.abs(s10.full / f10 - 1) < 0.02, "10×10: 612 vs " + f10);
  near(s10.full * 100 / (Math.PI * 22500), 0.866, 0.005, "10×10 utilization");
  near(70 * 780 / (Math.PI * 22500), 0.772, 0.003, "GX-1 utilization 77 %");
  near(18000 / 70, 257, 0.5, "die site $257");
  near(70 * 780 / (Math.PI * 147 * 147), 0.804, 0.005, "70 dies use ~80 % of usable area");
  for (const [w, h, e, s] of [[4, 4, 0, 0.05], [33, 33, 10, 1], [4, 33, 10, 0.05], [33, 4, 0, 1]]) {
    const g = M.bestOffset({ D: 300, edge: e, w, h, s }, 8);
    fin(g.full, "grid extreme"); fin(g.partial, "partial extreme"); fin(M.dpwFormula(300 - 2 * e, (w + s) * (h + s)), "formula extreme");
  }
}

/* 2. 수율 모델 */
{
  near(M.yPoisson(7.8, 0.08), 0.5358, 1e-4, "Poisson 53.6 %");
  near(M.yNB(7.8, 0.08, 2), 0.5809, 1e-4, "NB α=2 58.1 %");
  near(M.yMurphy(7.8, 0.08), 0.5534, 1e-4, "Murphy 55.3 %");
  near(M.ySeeds(7.8, 0.08), 0.6158, 1e-4, "Seeds 61.6 %");
  near(M.yNB(1, 1, 2), 0.444, 1e-3, "fig 10-4 α=2"); near(M.yNB(1, 1, 0.5), 0.577, 1e-3, "fig 10-4 α=0.5");
  for (const f of [M.yPoisson, M.yMurphy, M.ySeeds, (a, d) => M.yNB(a, d, 2)]) { const y = f(1, 0.08); ok(y > 0.92 && y < 0.93, "100 mm² 92–93 %: " + y); }
  near(M.yNB(7.8, 0.08, 1), M.ySeeds(7.8, 0.08), 1e-12, "Seeds = NB α=1");
  ok(Math.abs(M.yNB(7.8, 0.08, 1e6) - M.yPoisson(7.8, 0.08)) < 1e-5, "NB → Poisson");
  near(M.yPoisson(1, 0.3), 0.741, 1e-3, "MC note 10×10 D0 0.3"); near(M.yPoisson(7.8, 0.3), 0.096, 1e-3, "MC note 26×30 D0 0.3");
  for (const A of [0, 0.5, 10]) for (const D of [0.02, 0.5]) for (const a of [0.5, 10]) [M.yPoisson(A, D), M.yMurphy(A, D), M.ySeeds(A, D), M.yNB(A, D, a)].forEach((y) => ok(y >= 0 && y <= 1, "yield range"));
}

/* 3. 결함 몬테카를로 ≈ 모델 */
{
  for (const [cl, target] of [[true, M.yNB(7.8, 0.08, 2)], [false, M.yPoisson(7.8, 0.08)]]) {
    const rng = M.mkRng(11); let g = 0, N = 0;
    for (let i = 0; i < 300; i++) { const r = M.simWafer(70, 7.8, 0.08, 2, cl, rng); g += r.good; N += 70; }
    near(g / N, target, 0.02, "MC clustered=" + cl);
  }
  const rng = M.mkRng(3); let s = 0; for (let i = 0; i < 4000; i++) s += M.gammaSample(rng, 0.5); near(s / 4000, 0.5, 0.05, "gamma mean");
  ok(M.poissonSample(rng, 0) === 0 && M.simWafer(5, 0, 0.5, 0.5, true, rng).good === 5, "zero area → all good");
  const r = M.simWafer(70, 8.58, 0.5, 0.5, true, rng); ok(r.good >= 0 && r.good <= 70, "MC extreme");
}

/* 4. 하베스팅 */
{
  const h = M.harvest({ D0: 0.08, aSM: 3.2, nSM: 160, need: 144, aOther: 268 });
  near(h.p, 0.002557, 1e-6, "p per SM 0.26 %"); near(h.mean, 0.409, 1e-3, "mean 0.41 bad SMs");
  near(h.y, 0.8070, 1e-4, "sellable 80.7 %"); near(h.yFull, M.yPoisson(7.8, 0.08), 1e-12, "spare 0 = Poisson");
  [[0, 0.5358], [1, 0.7555], [2, 0.8003], [4, 0.8070]].forEach(([sp, y]) => near(M.harvest({ D0: 0.08, aSM: 3.2, nSM: 160, need: 160 - sp, aOther: 268 }).y, y, 1e-4, "spare " + sp));
  const h5 = M.harvest({ D0: 0.5, aSM: 3.2, nSM: 160, need: 144, aOther: 268 }); near(h5.mean, 2.54, 0.01, "D0 0.5 mean"); near(h5.y, 0.262, 1e-3, "D0 0.5 yield");
  near(M.harvest({ D0: 0.08, aSM: 3.2, nSM: 160, need: 144, aOther: 150 }).y, 0.887, 1e-3, "other 150 mm²");
  for (const D0 of [0.02, 0.5]) for (const sp of [0, 32]) for (const ao of [100, 400]) {
    const r = M.harvest({ D0, aSM: 3.2, nSM: 160, need: 160 - sp, aOther: ao });
    ok(r.y >= 0 && r.y <= 1 && r.pmf.every((v) => Number.isFinite(v) && v >= 0) && Math.abs(r.pmf.reduce((a, b) => a + b, 0) - 1) < 1e-9, "harvest extreme");
  }
}

/* 5. 양품 다이 원가 */
{
  const base = { W: GX.W, D0: GX.D0, edge: GX.edge, s: GX.s, w: 26, h: 30, aSM: 3.2, nSM: 160, need: 144, aOther: 268 };
  const a = M.goodDieCost({ ...base, harvest: false }), b = M.goodDieCost({ ...base, harvest: true });
  ok(a.dpw === 70, "dpw 70"); near(a.good, 37.5, 0.05, "37.5 good"); near(b.good, 56.5, 0.05, "56.5 good");
  near(a.cost, 480, 0.5, "die $480"); near(b.cost, 319, 0.5, "die $319");
  const c = (A, D0 = 0.08, m = "poisson") => M.costCurve(A, D0, 18000, 3, 0.1, m, 2);
  near(c(780).cost, 532, 1, "curve $532"); near(c(780).dpw, 63.1, 0.05, "curve dpw 63.1");
  near(c(780).cost / (2 * c(390).cost), 1.51, 0.01, "half-die ×1.5");
  near(c(390).dpw / c(780).dpw, 2.2, 0.05, "390 mm² dpw ×2.2"); near(c(390).y, 0.732, 1e-3, "390 yield 73 %");
  const ex = (A) => (Math.log(c(A * 1.01).cost) - Math.log(c(A / 1.01).cost)) / (2 * Math.log(1.01));
  near(ex(780), 1.80, 0.01, "elasticity 1.8"); near(ex(100), 1.12, 0.01, "elasticity 1.1 at 100");
  const eps = Math.sqrt(2 * 785.61) / 294; near(1 + eps / (1 - 2 * eps) + 0.624, 1.81, 0.01, "elasticity formula");
  near(c(780, 0.25).cost / c(780).cost, 3.77, 0.01, "D0 0.25 ×3.8"); near(c(780, 0.25).cost, 2004, 5, "D0 0.25 ≈ $2,000");
  near(M.yPoisson(7.8, 0.25), 0.142, 1e-3, "D0 0.25 yield 14 %");
  near(1 + eps / (1 - 2 * eps) + 2.68 * 0.08, 1.40, 0.01, "harvest elasticity 1.4");
  for (const A of [50, 858]) for (const D0 of [0.02, 0.5]) for (const W of [3000, 30000]) for (const m of ["poisson", "nb", "murphy"]) fin(M.costCurve(A, D0, W, 3, 0.1, m, 2).cost, "cost extreme");
}

/* 6. 칩렛 */
{
  const b = { aIf: 15, W: 18000, cov: 1, test: 0, yAsm: 0.98, yAttach: 0.99, other: 3160 };
  const run = (o) => [1, 2, 4].map((k) => M.chiplet({ ...b, ...o, n: k }));
  const h = run({ D0: 0.08, harvest: true }), nh = run({ D0: 0.08, harvest: false });
  near(h[0].total, 3550, 1, "mono $3,550"); near(h[1].total, 3551, 1, "2-die $3,551"); near(h[2].total, 3634, 1, "4-die");
  near(nh[0].total, 3714, 1, "mono no-harvest $3,714"); near(nh[1].total, 3618, 1, "2-die no-harvest $3,618");
  near(h[1].A, 405, 0.5, "2-die 405 mm²"); near(h[2].A, 225, 0.5, "4-die 225 mm²"); ok(h[1].dpw === 142 && h[2].dpw === 263, "dpw 142 / 263");
  near(h[1].y, 0.888, 1e-3, "2-die yield 88.8 %"); near(h[2].y, 0.925, 1e-3, "4-die yield 92.5 %");
  near(h[1].si, 286, 1, "2-die silicon $286"); near(h[1].yPkg, 0.9702, 1e-4, "asm 0.98×0.99");
  const e = run({ D0: 0.25, harvest: true }); near(e[0].total, 3737, 1, "D0 .25 mono"); near(e[1].total, 3636, 1, "D0 .25 2-die"); near(e[2].total, 3690, 1, "D0 .25 4-die");
  const k0 = run({ D0: 0.08, harvest: true, cov: 0 }); near(k0[0].total, 4321, 1, "no KGD 1"); near(k0[1].total, 4466, 1, "no KGD 2"); near(k0[2].total, 4925, 1, "no KGD 4");
  for (const o of [{ D0: 0.02, aIf: 0, cov: 0, test: 0, yAttach: 1, harvest: true }, { D0: 0.5, aIf: 60, cov: 0, test: 100, yAttach: 0.95, harvest: false },
    { D0: 0.5, aIf: 0, cov: 1, test: 100, yAttach: 0.95, harvest: true }, { D0: 0.02, aIf: 60, cov: 1, test: 0, yAttach: 1, harvest: false }])
    run(o).forEach((r) => { fin(r.total, "chiplet extreme"); fin(r.loss + 1e-9, "loss ≥ 0"); });
}

/* 7. 다이 간 링크 */
{
  const r = M.LINKS.map((L) => M.linkCalc(L, 4, 45, 16));
  near(r[0].dens, 3.95, 0.01, "Si 3.95 Tb/s/mm"); near(r[0].shore, 8.1, 0.05, "Si 8.1 mm"); near(r[0].power, 16.2, 0.1, "Si 16 W"); near(r[0].e, 0.506, 1e-3, "0.51 pJ/b");
  near(r[1].shore, 67.6, 0.1, "organic 68 mm"); near(r[2].shore, 64, 1e-9, "SerDes 64 mm"); near(r[2].power, 64, 1e-9, "SerDes 64 W");
  const p25 = M.linkCalc(M.LINKS[0], 4, 25, 16); near(p25.dens, 12.8, 0.01, "25 µm 12.8"); near(p25.shore, 2.5, 0.01, "25 µm 2.5 mm"); near(p25.dens / r[0].dens, 3.24, 0.01, "×3.2");
  near(M.linkCalc(M.LINKS[0], 4, 45, 32).e, 0.762, 1e-3, "32 Gb/s 0.76 pJ/b");
  for (const L of M.LINKS) for (const bw of [0.5, 10]) for (const p of [20, 55]) for (const rt of [4, 32]) { const x = M.linkCalc(L, bw, p, rt); fin(x.shore, "link shore"); fin(x.power, "link power"); }
}

/* 8. 패키지 원가 */
{
  const die = M.goodDieCost({ W: GX.W, D0: GX.D0, edge: GX.edge, s: GX.s, w: 26, h: 30, harvest: true, aSM: 3.2, nSM: 160, need: 144, aOther: 268 }).cost;
  const p = (o) => M.pkgCost({ die, nHBM: 6, gbStack: 24, perGB: 15, other: 1000, yAsm: 0.98, ...o });
  const g = p({});
  near(g.hbm, 2160, 1e-9, "HBM $2,160"); near(g.total, 3550, 1, "package $3,550"); near(g.hbmShare, 0.61, 0.005, "HBM 61 %");
  near(g.dieShare, 0.09, 0.005, "die 9 %"); near(g.other / g.total, 0.28, 0.005, "other 28 %"); near(g.loss / g.total, 0.02, 0.001, "loss 2 %");
  near(p({ yAsm: 0.92 }).total, 3782, 1, "asm 92 % → $3,780"); near(p({ yAsm: 0.97 }).total - g.total, 36.6, 0.5, "1 %p ≈ $36");
  near(p({ nHBM: 8 }).total - g.total, 735, 1, "8 stacks +$735"); near(p({ nHBM: 8 }).hbmShare, 0.672, 0.002, "8 stacks 67 %");
  const big = p({ nHBM: 8, gbStack: 36 }); near(big.hbm, 4320, 1e-9, "8×36 GB $4,320"); near(big.hbmShare, 0.751, 0.002, "75 %");
  const nh = M.goodDieCost({ W: GX.W, D0: GX.D0, edge: GX.edge, s: GX.s, w: 26, h: 30, harvest: false, aSM: 3.2, nSM: 160, need: 144, aOther: 268 }).cost;
  near(M.pkgCost({ die: nh, nHBM: 6, gbStack: 24, perGB: 15, other: 1000, yAsm: 0.98 }).total, 3714, 1, "no-harvest package $3,714");
  for (const A of [560, 858]) for (const D0 of [0.02, 0.5]) for (const hv of [true, false]) {
    const wd = Math.sqrt(A * 26 / 30), d = M.goodDieCost({ W: GX.W, D0, edge: 3, s: 0.1, w: wd, h: A / wd, harvest: hv, aSM: 3.2, nSM: 160, need: 144, aOther: Math.max(0, A - 512) });
    for (const yA of [0.9, 1]) for (const n of [4, 8]) { const r = M.pkgCost({ die: d.cost, nHBM: n, gbStack: 36, perGB: 30, other: 3000, yAsm: yA }); fin(r.total, "pkg extreme"); fin(r.loss + 1e-9, "pkg loss"); }
  }
}
console.log(`gpu die sims ok (${n} checks)`);
