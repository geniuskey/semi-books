#!/usr/bin/env node
/* 11장 2.5D·3D 패키징(chapters/package.html) 시뮬레이터 모델 회귀 검사.
   장의 스크립트에서 /* model:<이름> *\/ 블록을 잘라 node:vm에서 돌리고,
   본문·GX-1 노트·해볼 것·퀴즈·표가 인용한 수치와 슬라이더 끝값의 유한성을 확인한다. 외부 패키지 없음. */
"use strict";
const fs = require("fs"), vm = require("vm"), path = require("path"), assert = require("assert");
const html = fs.readFileSync(path.join(__dirname, "..", "chapters", "package.html"), "utf8");
const NAMES = ["density", "shoreline", "interposer", "wire", "warp", "bump", "hybrid", "stack3d"];
const code = NAMES.map((n) => {
  const a = `/* model:${n} */`, b = `/* /model:${n} */`, i = html.indexOf(a), j = html.indexOf(b);
  assert(i >= 0 && j > i, "marker " + n);
  return html.slice(i + a.length, j);
}).join("\n");
const ctx = { Math, Object, Array, Number, JSON, isFinite };
vm.createContext(ctx);
vm.runInContext(code + "\nthis.M = { DN_TECH, dnCalc, SH, SH_TECH, shCalc, IP, ipLayout, ipFormula, ipGrid, ipCost, wrCalc, WP, wpCalc, BP, bpCalc, HB, hbCalc, ST, stLayout };", ctx);
const M = ctx.M;
let n = 0;
const ok = (c, m) => { assert(c, m); n++; };
const near = (x, y, tol, m) => ok(Math.abs(x - y) <= tol, `${m}: ${x} vs ${y}`);
const fin = (o, m) => { for (const [k, v] of Object.entries(o)) if (typeof v === "number") ok(isFinite(v) && v >= 0, `${m}.${k} = ${v}`); };

/* 1. 연결 밀도 */
{
  const si = M.dnCalc(0.4, 2, 45), sub = M.dnCalc(10, 2, 150), hb = M.dnCalc(0.4, 2, 9), pcb = M.dnCalc(75, 2, 1000);
  near(si.wires, 2500, 1e-9, "Si wires/mm"); near(si.io, 493.8, 0.1, "Si io/mm²"); near(si.hbmEdge, 0.41, 0.005, "Si 1024 edge");
  near(sub.wires, 100, 1e-9, "sub wires"); near(sub.io, 44.4, 0.1, "sub io"); near(sub.hbmEdge, 10.24, 0.01, "sub edge");
  near(hb.io, 12346, 1, "hybrid 9 µm io"); near(hb.io / si.io, 25, 1e-9, "45→9 µm ×25");
  near(M.dnCalc(0.4, 2, 25).io / si.io, 3.24, 1e-9, "45→25 µm ×3.24");
  near(pcb.io, 1, 1e-12, "PCB 1/mm²");
  for (const ls of [0.2, 100]) for (const ly of [1, 6]) for (const p of [1, 1000]) fin(M.dnCalc(ls, ly, p), "dn");
}
/* 2. 쇼어라인 */
{
  const si = M.shCalc(M.SH_TECH.si, 1, 9.6), sub = M.shCalc(M.SH_TECH.sub, 1, 9.6), rdl = M.shCalc(M.SH_TECH.rdl, 1, 9.6);
  near(si.s, 246.9, 0.1, "Si s"); ok(!si.wireLimited, "Si bump-limited"); near(si.edgeStack, 5.39, 0.01, "Si edge/stack");
  near(si.totalTB, 13.68, 0.01, "Si total TB/s"); ok(si.totalTB > M.SH.need, "Si covers 7.37");
  near(si.stackTB, 1.2288, 1e-9, "per stack 1228.8 GB/s"); near(6 * si.stackTB, 7.3728, 1e-9, "GX-1 7.37 TB/s");
  near(sub.s, 22.2, 0.05, "sub s"); near(sub.edgeStack, 60, 0.1, "sub edge/stack 60 mm"); near(sub.totalTB, 1.23, 0.005, "sub total");
  near(rdl.s, si.s, 1e-9, "RDL = Si at D=1");
  const rdl3 = M.shCalc(M.SH_TECH.rdl, 3, 9.6), si3 = M.shCalc(M.SH_TECH.si, 3, 9.6);
  ok(rdl3.wireLimited && rdl3.s === 500, "RDL D=3 wire-limited 500"); near(si3.s, 740.7, 0.1, "Si D=3 741");
  near(3 * si.sigStack / 30, 133.1, 0.1, "GX-1 need 133/mm"); near(3 * si.sigStack, 3994, 1, "3990 signals per edge"); near(133.12 / si.s, 0.54, 0.005, "54 %");
  for (const k of ["sub", "rdl", "si"]) for (const D of [0.2, 3]) for (const r of [2, 32]) fin(M.shCalc(M.SH_TECH[k], D, r), "sh");
}
/* 3. 인터포저 */
{
  const L = M.ipLayout(1, 3, 1, 4), g = M.ipGrid(L.X, L.Y);
  ok(L.X === 58 && L.Y === 43 && L.A === 2494 && L.hbm === 6, "GX-1 58×43");
  near(L.mult, 2.907, 0.001, "reticle ×2.9"); ok(L.fields === 4, "4 fields");
  ok(g.n === 20, "20 per wafer, got " + g.n); near(M.ipFormula(L.X, L.Y), 14, 0.5, "formula ≈14");
  near(M.ipCost(5000, g.n), 277.8, 0.1, "≈$280"); near(5000 / (g.n * 2494) / 1, 0.10, 0.005, "≈$0.11/mm² (before yield)");
  near(M.ipCost(5000, g.n) / 2494, 0.111, 0.002, "$0.11/mm² good");
  near(2494 / 780, 3.2, 0.01, "3.2× logic area");
  // 4 nm 로직 웨이퍼 mm²당(가장자리 손실 전): 18000 / (π·150²) ≈ 0.25
  near(18000 / (Math.PI * 150 * 150), 0.255, 0.005, "logic $/mm²");
  const L8 = M.ipLayout(1, 4, 1, 4), g8 = M.ipGrid(L8.X, L8.Y);
  ok(L8.X === 58 && L8.Y === 55 && L8.A === 3190, "8 HBM 58×55"); ok(g8.n === 12, "8 HBM 12/wafer got " + g8.n); near(M.ipCost(5000, g8.n), 463, 1, "≈$460");
  const L12 = M.ipLayout(2, 6, 1, 4), g12 = M.ipGrid(L12.X, L12.Y);
  ok(L12.X === 58 && L12.Y === 79, "2 dies 58×79"); near(L12.mult, 5.34, 0.01, "×5.3"); ok(g12.n === 8, "8/wafer got " + g12.n);
  for (const nl of [1, 2]) for (const k of [1, 6]) for (const gap of [0.5, 3]) for (const m of [1, 8]) {
    const Q = M.ipLayout(nl, k, gap, m), G = M.ipGrid(Q.X, Q.Y); fin(Q, "ip"); ok(G.n > 0 && isFinite(M.ipCost(2000, G.n)) && isFinite(M.ipCost(10000, G.n)), "ip cost finite");
    ok(M.ipFormula(Q.X, Q.Y) >= 0, "formula ≥ 0");
  }
}
/* 4. 배선 RC */
{
  const a = M.wrCalc(3, 2), b = M.wrCalc(3, 0.4), c = M.wrCalc(10, 2);
  near(a.Rw, 33, 1e-6, "R 33 Ω"); near(a.Cw * 1e12, 0.6, 1e-9, "C 0.6 pF"); near(a.tr * 1e12, 89.1, 0.1, "tr 89 ps"); near(a.maxGbps, 11.2, 0.05, "11 Gb/s");
  ok(a.maxGbps > 9.6 && 1 / 9.6e9 * 1e12 > a.tr * 1e12, "9.6 Gb/s ok (UI 104 ps)"); near(1e12 / 9.6e9, 104.2, 0.1, "UI 104 ps");
  near(a.Ebit * 1e12, 0.032, 0.001, "0.03 pJ/bit"); near(a.flight * 1e12, 20, 0.1, "flight 20 ps");
  near(b.Rw, 165, 1e-6, "R 165"); near(b.maxGbps, 4.27, 0.02, "4.3 Gb/s"); near(c.tr * 1e12, 435.6, 0.5, "tr 436 ps"); near(c.maxGbps, 2.3, 0.02, "2.3 Gb/s");
  for (const L of [0.5, 20]) for (const w of [0.4, 5]) fin(M.wrCalc(L, w), "wr");
}
/* 5. 휨 */
{
  const a = M.wpCalc("sub", 195, 0.8, 1.6, 50);
  near(a.bowUm, 470, 5, "bow ≈0.47 mm"); near(a.dispUm, 85.5, 0.5, "disp ≈86 µm"); near(a.gamma, 1.07, 0.01, "γ ≈1.1");
  near(M.wpCalc("sub", 195, 0.8, 1.6, 70).bowUm / a.bowUm, 1.96, 1e-9, "L² ×2");
  const gl = M.wpCalc("glass", 195, 0.8, 1.6, 50); ok(gl.bowUm / a.bowUm < 1 / 3, "glass < 1/3: " + gl.bowUm / a.bowUm);
  near(gl.da * 1e6, 2.4, 1e-9, "glass Δα 2.4"); near(a.da * 1e6, 12.4, 1e-9, "sub Δα 12.4");
  const z = M.wpCalc("sub", 0, 0.8, 1.6, 50); ok(z.R === null && z.bowUm === 0, "ΔT 0 flat");
  for (const k of ["sub", "mold", "glass"]) for (const dT of [0, 250]) for (const h1 of [0.1, 1.5]) for (const h2 of [0.4, 3]) for (const L of [10, 80]) fin(M.wpCalc(k, dT, h1, h2, L), "wp");
}
/* 6. 범프 전류 */
{
  const L = M.bpCalc(1000, 0.3, 150, 45);
  near(L[0].nv, 1350, 1e-9, "BGA VDD 1350"); near(L[0].i, 0.741, 0.001, "0.74 A"); near(L[0].use, 0.741, 0.001, "74 %"); near(L[0].need, 1000, 1e-9, "1000 balls");
  near(L[1].n, 34667, 1, "C4 3.5만"); near(L[1].i * 1e3, 96.2, 0.1, "C4 96 mA"); near(L[1].lim, 0.265, 0.001, "C4 limit");
  near(L[2].n, 385185, 1, "µbump 38만"); near(L[2].i * 1e3, 8.65, 0.01, "µbump 8.7 mA"); near(L[2].use, 0.218, 0.002, "22 %");
  const L20 = M.bpCalc(1000, 0.3, 150, 20);
  near(L20[2].n, 1.95e6, 1e3, "20 µm 195만"); near(L20[2].use, L[2].use, 1e-12, "use pitch-independent");
  near(M.bpCalc(1500, 0.3, 150, 45)[0].use, 1.111, 0.001, "1500 A → 111 %");
  near(M.bpCalc(1500, 0.3, 150, 45)[0].i, 1.11, 0.005, "1.11 A");
  for (const I of [100, 1500]) for (const f of [0.1, 0.5]) for (const c4 of [100, 250]) for (const ub of [10, 60]) M.bpCalc(I, f, c4, ub).forEach((x) => fin(x, "bp"));
}
/* 7. 하이브리드 */
{
  const a = M.hbCalc(9, 100, 2, 5);
  const edgeSig = M.shCalc(M.SH_TECH.si, 1, 9.6).s; near(M.HB.edgeSig, edgeSig, 0.1, "HB edgeSig = shoreline Si");
  near(a.dens, 12346, 1, "12,346/mm²"); near(a.bwTB, 154.3, 0.1, "154 TB/s"); near(a.edgeMm, 520.8, 0.5, "≈520 mm"); near(a.dT, 2.35, 0.01, "+2.4 K");
  near(M.hbCalc(9, 100, 2, 97).dT, 38.2, 0.1, "+38 K"); near(M.hbCalc(45, 100, 2, 5).bwTB, 6.17, 0.01, "45 µm ≈6 TB/s");
  near(144 * 0 + 128 * 64 * 1.6 / 1000, 13.1, 0.01, "L2 13.1 TB/s"); ok(a.bwTB / M.HB.l2TB > 10, ">10× L2");
  near(2 * (26 + 30), 112, 0, "perimeter 112 mm"); near(760 / 7.8, 97.4, 0.1, "97 W/cm²"); near(0.05 * 7.8, 0.39, 1e-9, "R'' 0.39");
  for (const p of [1, 50]) for (const A of [10, 400]) for (const r of [0.5, 8]) for (const q of [0, 100]) fin(M.hbCalc(p, A, r, q), "hb");
}
/* 8. 3D 층 배치 */
{
  for (const ex of [0, 9]) {
    const L = M.stLayout(ex);
    for (let i = 1; i < M.ST.length; i++) { const a = L[M.ST[i - 1].k], b = L[M.ST[i].k]; ok(b.y0 >= a.y0 + a.th - 1e-9, "no overlap " + M.ST[i].k); }
    fin(L.total ? { total: L.total } : {}, "st");
  }
  near(M.stLayout(0).total, 4.34, 1e-9, "total 4.34 mm (약 4.3)");
}
/* 9. 본문 GX-1 노트 */
{
  near(7.3728e12 * 8 * 3e-12, 177, 0.5, "HBM 177 W"); near(7.3728e12 * 8 * 6e-12, 354, 0.5, "GDDR 354 W");
  near(7372.8 / 112, 65.8, 0.1, "66 GDDR7"); near(66 * 32, 2112, 0, "2,110 pins"); near(760 / 0.75, 1013, 1, "≈1,000 A");
}
console.log(`gpu package sims ok (${n} checks)`);
