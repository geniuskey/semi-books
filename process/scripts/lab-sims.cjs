#!/usr/bin/env node
/* 15장 공정 실험실(chapters/lab.html) 조건 스윕·공정 창 회귀 검사.
   장의 스크립트에서 공정 정의(OPS·PRESETS·DOM)와 /* model:sim-sweep *\/·/* model:sim-window *\/ 블록을 잘라
   js/xsec.js와 함께 node:vm에서 돌린다. 기본 실행은 1초 안팎(합성 격자 + 값싼 엔진 기준점),
   --report는 본문·해볼 것·퀴즈가 인용하는 모든 수치를 다시 계산해 출력한다(몇 초 걸림, npm test에서는 돌지 않음). */
"use strict";
const fs = require("fs"), vm = require("vm"), path = require("path"), assert = require("assert");
const ROOT = path.join(__dirname, "..");
const html = fs.readFileSync(path.join(ROOT, "chapters/lab.html"), "utf8");
const slice = (a, b) => { const i = html.indexOf(a), j = html.indexOf(b, i); assert(i >= 0 && j > i, "marker " + a); return html.slice(i, j); };
const ctx = { console, performance, Math, Object, Array, Float32Array, Uint8Array, Int32Array, Uint32Array, Set, Map, WeakMap, JSON, Number, String, isFinite, NaN };
ctx.window = ctx; ctx.PB = { fmt: (x, d = 3) => String(Number(x.toPrecision(d))), onTheme() {} };
vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(ROOT, "js/xsec.js"), "utf8"), ctx);
vm.runInContext(slice("var MATK", "/* -------------------------------------------------- UI 조립 */") +
  "\nvar dom = 'std';\n" + slice("/* model:sim-sweep */", "/* /model:sim-sweep */") + slice("/* model:sim-window */", "/* /model:sim-window */") +
  "\nthis.LAB = { OPS, PRESETS, DOM, make, setDom: function (k) { dom = k; }, gapRun, trenchDepth, fillState, junctionDepth, WN, wnPrefix, wnRun, wnMetrics, wnOpening, wnVerdict, wnEtch };", ctx);
const XS = ctx.XS, L = ctx.LAB;
const steps = (k) => { L.setDom(L.PRESETS[k].dom); const s = L.PRESETS[k].steps(); L.setDom("std"); return s; };
const simOf = (k, f = 1) => { const d = L.DOM[k]; return new XS.Sim({ W: Math.round(d.W / f), H: Math.round(d.H / f), dx: d.dx * f, surf: Math.round(d.surf / f), bgType: "p", bgConc: 1e15 }); };
let n = 0; const ok = (c, m) => { assert(c, m); n++; };

/* 1. 합성 격자: 측정 함수 */
{
  const s = new XS.Sim({ W: 20, H: 20, dx: 4, surf: 5 });
  for (let y = 5; y < 13; y++) for (let x = 8; x < 12; x++) s.mat[y * 20 + x] = 0;   // 폭 4셀·깊이 8셀 트렌치
  ok(L.gapRun(s, 6, 10) === 4 && L.gapRun(s, 14, 10) === 0, "gapRun");
  ok(L.trenchDepth(s) === 32, "trenchDepth 32 nm, got " + L.trenchDepth(s));
  // 산화막(행 5~12) 속 폭 4셀 홀(실리콘 표면 행 13 위): 열림 → 뚜껑 → 보이드 → 한 셀 폭만 남김 → 이음매
  const h = new XS.Sim({ W: 20, H: 20, dx: 4, surf: 13 });
  for (let y = 5; y < 13; y++) for (let x = 0; x < 20; x++) if (x < 8 || x >= 12) h.mat[y * 20 + x] = XS.ID.ox;
  ok(L.fillState(h, 5, 10, 2).cat === "open", "open hole");
  for (let y = 0; y < 5; y++) for (let x = 0; x < 20; x++) h.mat[y * 20 + x] = XS.ID.w;
  const v = L.fillState(h, 0, 10, 2); ok(v.cat === "void" && v.h === 32 && v.w === 16, "void " + JSON.stringify(v));
  for (let y = 5; y < 13; y++) for (let x = 8; x < 11; x++) h.mat[y * 20 + x] = XS.ID.w;
  ok(L.fillState(h, 0, 10, 2).cat === "seam", "seam");
  for (let y = 5; y < 13; y++) h.mat[y * 20 + 11] = XS.ID.w;
  ok(L.fillState(h, 0, 10, 2).cat === "fill", "fill");
  const j = new XS.Sim({ W: 4, H: 20, dx: 4, surf: 2, bgType: "p", bgConc: 1e15 });
  for (let y = 2; y < 20; y++) for (let x = 0; x < 4; x++) j.nd[y * 4 + x] = y < 7 ? 1e18 : y === 7 ? 0.25e15 : 0;
  // 행 7(6번째 실리콘 행, 깊이 20 nm)의 순 도핑 −0.75e15: 행 6(16 nm, +1e18)과의 사이에서 0이 되는 곳
  const xj = L.junctionDepth(j, 0); ok(Math.abs(xj - (16 + 1e18 / (1e18 + 0.75e15) * 4)) < 1e-3, "junction " + xj);
  ok(L.wnVerdict({ d: 300, bias: 24, mask: 20 }, { d: 300, c: 24, m: 20 }).length === 0, "verdict pass on the limits");
  ok(L.wnVerdict({ d: 249, bias: -32, mask: 10 }, { d: 300, c: 24, m: 20 }).join() === "shallow,mask,cd", "verdict reasons");
}

/* 2. 공정 창: 시간별 떼어 낸 단면 = 따로 식각한 단면 (값싼 감광막 90 nm, 이방성 1 한 줄) */
{
  const pre = L.wnPrefix(90), m0 = L.wnOpening(pre), got = [];
  const g = L.wnRun(pre, 1, (k, s) => { got[k] = s; }); for (let r = g.next(); !r.done; r = g.next());
  for (const k of [1, 4]) {
    const s = pre.clone(); s.run(L.wnEtch(L.WN.TIMES[k], 1));
    ok(Buffer.compare(Buffer.from(s.mat), Buffer.from(got[k].mat)) === 0, "snapshot t=" + L.WN.TIMES[k] + " equals separate run");
  }
  ok(got.length === 6 && L.wnMetrics(got[5], m0).d > L.wnMetrics(got[0], m0).d, "depth grows with time");
  // 본문: 감광막 90 nm는 50 s에 16 nm 이하, 60 s에 다 사라지고 CD 편차가 +128 nm를 넘는다(이방성 1 줄)
  const m50 = L.wnMetrics(got[3], m0), m60 = L.wnMetrics(got[4], m0);
  ok(m50.d >= 250 && m50.mask <= 16 && m60.mask === 0 && m60.bias > 128, "PR 90 row: " + JSON.stringify([m50, m60]));
}

/* 3. 수치 보고(--report): 본문이 인용하는 값 */
if (process.argv.includes("--report")) {
  const t0 = performance.now();
  const lin = (a, b, k, snap) => Array.from({ length: k }, (_, i) => +(Math.round((a + (b - a) * i / (k - 1)) / snap) * snap).toFixed(4));
  // 콘택 채움
  { const st = steps("void"), pre = simOf("std"); for (let i = 0; i < 4; i++) pre.run(st[i]); const rTop = pre.surfRow(5);
    const out = []; for (const v of [...lin(0.05, 0.9, 5, 0.01), 0.4, 0.5, 0.6, 0.7, 0.8]) { const s = pre.clone(); s.run(Object.assign({}, st[4], { stick: v })); out.push(v + ":" + JSON.stringify(L.fillState(s, rTop, s.W >> 1, 8))); }
    console.log("void", out.join("  ")); }
  // STI
  { const st = steps("sti"), pre = simOf("std"); for (let i = 0; i < 5; i++) pre.run(st[i]);
    console.log("sti", lin(0, 0.95, 5, 0.01).map((v) => { const s = pre.clone(); s.run(Object.assign({}, st[5], { ion: v })); s.run(st[6]); return v + ":" + L.trenchDepth(s); }).join(" ")); }
  // S/D
  { const st = steps("sd"), pre = simOf("std"); for (let i = 0; i < 9; i++) pre.run(st[i]);
    console.log("sd", [850, 900, 950, 1000, 1050, 1100, 1150].map((T) => { const s = pre.clone(); s.run(Object.assign({}, st[9], { T })); return T + ":" + L.junctionDepth(s, 80).toFixed(1); }).join(" ")); }
  // 공정 창
  for (const prT of [90, 120, 160]) {
    const pre = L.wnPrefix(prT), m0 = L.wnOpening(pre), cells = [];
    L.WN.IONS.forEach((ion, r) => { cells[r] = []; const g = L.wnRun(pre, ion, (k, s) => { cells[r][k] = L.wnMetrics(s, m0); }); for (let x = g.next(); !x.done; x = g.next()); });
    for (const sp of [{ d: 300, c: 24, m: 20 }, { d: 350, c: 24, m: 20 }, { d: 300, c: 8, m: 20 }]) {
      const map = cells.map((row) => row.map((m) => { const f = L.wnVerdict(m, sp); return f.length ? f[0][0] : "+"; }).join(""));
      console.log(`window PR ${prT} m0 ${m0} spec ${JSON.stringify(sp)} pass ${map.join("").split("+").length - 1}: ${map.join(" ")}`);
    }
    if (prT === 120) console.log("  0.5/70:", JSON.stringify(cells[5][5]), " 0.9/50:", JSON.stringify(cells[1][3]));
  }
  console.log("report", ((performance.now() - t0) / 1000).toFixed(1), "s");
}
console.log(`ok   lab-sims: ${n} checks`);
