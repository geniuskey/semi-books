/* Copyright (c) 2026 geniuskey and DesignBook contributors.
   Executable code: MIT (see ../LICENSE-MIT). */
/* ==========================================================================
   DesignBook 미니 설계 흐름 엔진 — 전역 객체 FLOW (CELL 필요)
   식 → 파싱 → 합성(INV/NAND2/NOR2 매핑 + 최적화) → 한 행 배치 → 채널 배선(좌측 우선)
   → STA(논리적 노력 + 배선 C) → 레이아웃(rects) → GDSII 이진 파일
   ========================================================================== */
(function () {
  "use strict";
  const C = window.CELL;

  /* ------------------------------------------------------------ 파서 */
  // 우선순위: ~ > & > ^ > |   식별자 [A-Za-z_][A-Za-z0-9_]*, 상수 0/1 금지
  function parse(src) {
    const outs = [], errs = [];
    src.split(/\n|;/).forEach((line, li) => {
      line = line.replace(/\/\/.*$/, "").replace(/^\s*assign\s+/, "").trim();
      if (!line) return;
      const m = line.match(/^([A-Za-z_]\w*)\s*=\s*(.+)$/);
      if (!m) { errs.push(`${li + 1}행: "출력 = 식" 형태가 아님`); return; }
      try { outs.push({ name: m[1], ast: expr(tokenize(m[2])) }); } catch (e) { errs.push(`${li + 1}행: ${e.message}`); }
    });
    return { outs, errs };
  }
  function tokenize(s) {
    const t = []; let i = 0;
    while (i < s.length) {
      const c = s[i];
      if (/\s/.test(c)) { i++; continue; }
      if (/[A-Za-z_]/.test(c)) { let j = i; while (j < s.length && /\w/.test(s[j])) j++; t.push({ k: "id", v: s.slice(i, j) }); i = j; continue; }
      if ("~!&|^()'".includes(c)) { t.push({ k: c === "!" ? "~" : c }); i++; continue; }
      if (c === "+") { t.push({ k: "|" }); i++; continue; }
      if (c === "*" || c === "·") { t.push({ k: "&" }); i++; continue; }
      throw new Error(`알 수 없는 문자 '${c}'`);
    }
    t.pos = 0; return t;
  }
  function expr(t) { const e = orE(t); if (t.pos < t.length) throw new Error("식이 끝나지 않음: " + (t[t.pos].v || t[t.pos].k)); return e; }
  function orE(t) { let a = xorE(t); while (t[t.pos] && t[t.pos].k === "|") { t.pos++; a = { op: "or", a, b: xorE(t) }; } return a; }
  function xorE(t) { let a = andE(t); while (t[t.pos] && t[t.pos].k === "^") { t.pos++; a = { op: "xor", a, b: andE(t) }; } return a; }
  function andE(t) { let a = unE(t); while (t[t.pos] && (t[t.pos].k === "&" || t[t.pos].k === "id" || t[t.pos].k === "(" || t[t.pos].k === "~")) { if (t[t.pos].k === "&") t.pos++; a = { op: "and", a, b: unE(t) }; } return a; }
  function unE(t) {
    const x = t[t.pos];
    if (!x) throw new Error("식이 비어 있음");
    if (x.k === "~") { t.pos++; return { op: "not", a: unE(t) }; }
    let e;
    if (x.k === "(") { t.pos++; e = orE(t); if (!t[t.pos] || t[t.pos].k !== ")") throw new Error("괄호가 닫히지 않음"); t.pos++; }
    else if (x.k === "id") { t.pos++; e = { op: "in", name: x.v }; }
    else throw new Error("피연산자가 필요함");
    while (t[t.pos] && t[t.pos].k === "'") { t.pos++; e = { op: "not", a: e }; }
    return e;
  }

  /* ------------------------------------------------------------ 합성 */
  // 노드: {t:'in'|'INV'|'NAND2'|'NOR2', a, b, name}. 구조 해싱으로 공유.
  function synth(parsed, opts = {}) {
    const nodes = [], H = {};
    const mk = (t, a, b, name) => {
      if (t === "INV" && opts.opt !== false) { const n = nodes[a]; if (n.t === "INV") return n.a; }   // ~~x = x
      if (b != null && a > b) { const s = a; a = b; b = s; }
      const k = t + ":" + a + ":" + b + ":" + (name || "");
      if (H[k] != null) return H[k];
      nodes.push({ t, a, b, name }); return (H[k] = nodes.length - 1);
    };
    const ins = {};
    const lower = (e) => {
      if (e.op === "in") { if (ins[e.name] == null) ins[e.name] = mk("in", null, null, e.name); return ins[e.name]; }
      if (e.op === "not") return mk("INV", lower(e.a));
      const a = lower(e.a), b = lower(e.b);
      if (e.op === "and") return mk("INV", nand(a, b));
      if (e.op === "or") return mk("INV", nor(a, b));
      const n = nand(a, b); return nand(nand(a, n), nand(b, n));                 // XOR = NAND 4개
    };
    const isInv = (i) => nodes[i].t === "INV";
    function nand(a, b) { // ~(~x & ~y) = x | y  → INV(NOR(x,y))
      if (opts.opt !== false && isInv(a) && isInv(b)) return mk("INV", mk("NOR2", nodes[a].a, nodes[b].a));
      return mk("NAND2", a, b);
    }
    function nor(a, b) {  // ~(~x | ~y) = x & y → INV(NAND(x,y))
      if (opts.opt !== false && isInv(a) && isInv(b)) return mk("INV", mk("NAND2", nodes[a].a, nodes[b].a));
      return mk("NOR2", a, b);
    }
    const outs = parsed.outs.map((o) => ({ name: o.name, node: lower(o.ast) }));
    // 쓰이는 노드만 남기기
    const used = new Set(), st = outs.map((o) => o.node);
    while (st.length) { const i = st.pop(); if (used.has(i)) continue; used.add(i); const n = nodes[i]; if (n.a != null) st.push(n.a); if (n.b != null) st.push(n.b); }
    // 넷 이름
    const net = {};
    nodes.forEach((n, i) => { if (n.t === "in") net[i] = n.name; });
    outs.forEach((o) => { if (net[o.node] == null) net[o.node] = o.name; });
    let k = 0;
    const gates = [];
    nodes.forEach((n, i) => {
      if (!used.has(i) || n.t === "in") return;
      if (net[i] == null) net[i] = "w" + ++k;
      gates.push({ id: i, cell: n.t === "INV" ? "INV_X1" : n.t + "_X1", t: n.t, ins: [n.a, n.b].filter((v) => v != null), out: i });
    });
    gates.forEach((g) => { g.inNets = g.ins.map((i) => net[i]); g.outNet = net[g.out]; });
    // 별칭 출력도 같은 실제 넷을 가리킨다. 배선·부하·검증은 이 정규 이름을 사용한다.
    outs.forEach((o) => { o.net = net[o.node]; });
    const level = {};
    const lev = (i) => { if (level[i] != null) return level[i]; const n = nodes[i]; return (level[i] = n.t === "in" ? 0 : 1 + Math.max(lev(n.a), n.b != null ? lev(n.b) : 0)); };
    gates.forEach((g) => (g.level = lev(g.out)));
    return { nodes, gates, outs, inputs: Object.keys(ins), net, depth: Math.max(0, ...gates.map((g) => g.level)) };
  }
  /** 진리표로 원래 식과 합성 결과가 같은지 검사(등가성) */
  function evalAst(e, v) { switch (e.op) { case "in": return v[e.name] | 0; case "not": return 1 - evalAst(e.a, v); case "and": return evalAst(e.a, v) & evalAst(e.b, v); case "or": return evalAst(e.a, v) | evalAst(e.b, v); default: return evalAst(e.a, v) ^ evalAst(e.b, v); } }
  function evalNet(S, v) {
    const val = {};
    const f = (i) => { if (val[i] != null) return val[i]; const n = S.nodes[i]; let r; if (n.t === "in") r = v[n.name] | 0; else if (n.t === "INV") r = 1 - f(n.a); else if (n.t === "NAND2") r = 1 - (f(n.a) & f(n.b)); else r = 1 - (f(n.a) | f(n.b)); return (val[i] = r); };
    const o = {}; S.outs.forEach((x) => (o[x.name] = f(x.node))); return o;
  }
  function equiv(parsed, S) {
    const ins = S.inputs, n = ins.length;
    for (let m = 0; m < 1 << n; m++) { const v = {}; ins.forEach((x, i) => (v[x] = (m >> i) & 1)); const o = evalNet(S, v); for (const p of parsed.outs) if (evalAst(p.ast, v) !== o[p.name]) return { ok: false, v }; }
    return { ok: true, rows: 1 << n };
  }

  /* ------------------------------------------------------------ 배치 */
  const AREA = { INV_X1: 2, NAND2_X1: 3, NOR2_X1: 3 };
  function pinPos(cellName, pin, x0) {
    const c = C.CELLS[cellName], p = c.pins.find((q) => q.name === pin);
    const r = c.rects.find((q) => q.l === "m1" && !/VDD|VSS/.test(q.net || "") && q.x0 <= p.x && p.x < q.x1 && q.y0 <= p.y && p.y < q.y1);
    return { x: x0 + (r.x0 + r.x1) / 2, y: PB_clamp(p.y, r.y0 + 30, r.y1 - 30) };
  }
  function PB_clamp(v, a, b) { return Math.min(b, Math.max(a, v)); }
  /** 위상 순서 초기 배치 + 이웃 교환으로 HPWL(x) 개선 */
  function placeRow(S, opts = {}) {
    let order = S.gates.slice().sort((a, b) => a.level - b.level || a.id - b.id).map((g) => g.id);
    if (opts.order) order = opts.order.slice();
    if (opts.shuffle) { let a = opts.shuffle >>> 0; const rnd = () => ((a = (a * 1664525 + 1013904223) >>> 0) / 4294967296); for (let i = order.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); const t = order[i]; order[i] = order[j]; order[j] = t; } }
    const orders = [order.slice()];
    const byId = {}; S.gates.forEach((g) => (byId[g.id] = g));
    const pinsOf = (g) => (g.t === "INV" ? ["A"] : ["A", "B"]);
    function layout(ord) {
      let x = 0; const pos = {};
      ord.forEach((id) => { const g = byId[id]; pos[id] = x; x += C.CELLS[g.cell].w; });
      return { pos, W: x };
    }
    function netPins(ord) {
      const L = layout(ord), np = {};
      const add = (n, p) => (np[n] = np[n] || []).push(p);
      ord.forEach((id) => { const g = byId[id]; const ps = pinsOf(g); g.inNets.forEach((n, k) => add(n, Object.assign(pinPos(g.cell, ps[k], L.pos[id]), { g: id, pin: ps[k] }))); add(g.outNet, Object.assign(pinPos(g.cell, "Y", L.pos[id]), { g: id, pin: "Y" })); });
      S.outs.forEach((o) => { if (!np[o.net]) np[o.net] = []; }); // 입력 직결 출력도 배선 대상
      return { np, L };
    }
    function hpwl(ord) {
      const { np, L } = netPins(ord); let s = 0;
      Object.keys(np).forEach((n) => { const xs = np[n].map((p) => p.x); if (S.inputs.includes(n)) xs.push(-150); if (S.outs.some((o) => o.net === n)) xs.push(L.W + 150); s += Math.max(...xs) - Math.min(...xs); });
      return s;
    }
    const hist = [hpwl(order)];
    if (opts.improve !== false) {
      for (let pass = 0; pass < 30; pass++) {
        let better = false;
        for (let i = 0; i < order.length; i++) for (let j = i + 1; j < order.length; j++) {
          const o2 = order.slice(); const t = o2[i]; o2[i] = o2[j]; o2[j] = t;
          const h = hpwl(o2); if (h < hist[hist.length - 1] - 1e-6) { order = o2; hist.push(h); orders.push(o2.slice()); better = true; }
        }
        if (!better) break;
      }
    }
    const { np, L } = netPins(order);
    return { order, pos: L.pos, W: L.W, netPins: np, hpwl: hist[hist.length - 1], hpwl0: hist[0], hist, orders, layoutOf: (o) => netPins(o) };
  }

  /* ------------------------------------------------------------ 채널 배선 (좌측 우선) */
  const RAIL = 1305, PITCH = 140, T0 = RAIL + 70 + 30;   // 첫 트랙 중심 (VDD 레일 위)
  function route(S, P) {
    const nets = Object.keys(P.netPins).map((n) => {
      const ps = P.netPins[n], xs = ps.map((p) => p.x);
      let x0 = xs.length ? Math.min(...xs) - 30 : -200, x1 = xs.length ? Math.max(...xs) + 30 : P.W + 200;
      const isIn = S.inputs.includes(n), isOut = S.outs.some((o) => o.net === n);
      if (isIn) x0 = Math.min(x0, -200); if (isOut) x1 = Math.max(x1, P.W + 200);
      return { name: n, pins: ps, x0, x1, isIn, isOut };
    });
    nets.sort((a, b) => a.x0 - b.x0);
    const trackEnd = [];
    nets.forEach((n) => {
      let t = trackEnd.findIndex((e) => e + 80 <= n.x0);
      if (t < 0) { t = trackEnd.length; trackEnd.push(-Infinity); }
      trackEnd[t] = n.x1; n.track = t; n.y = T0 + t * PITCH;
    });
    // 기하
    const rects = [], labels = [];
    let wl = {};
    nets.forEach((n) => {
      rects.push({ l: "m1", x0: n.x0, y0: n.y - 30, x1: n.x1, y1: n.y + 30, net: n.name });
      let len = n.x1 - n.x0;
      n.pins.forEach((p) => {
        rects.push({ l: "m2", x0: p.x - 30, y0: p.y - 30, x1: p.x + 30, y1: n.y + 30, net: n.name });
        rects.push({ l: "v1", x0: p.x - 25, y0: p.y - 25, x1: p.x + 25, y1: p.y + 25 });
        rects.push({ l: "v1", x0: p.x - 25, y0: n.y - 25, x1: p.x + 25, y1: n.y + 25 });
        len += n.y - p.y;
      });
      wl[n.name] = len;
      const lx = n.isIn ? n.x0 + 60 : n.isOut ? n.x1 - 60 : (n.x0 + n.x1) / 2;
      labels.push({ name: n.name, x: lx, y: n.y, l: "m1", io: n.isIn ? "in" : n.isOut ? "out" : "" });
      S.outs.filter((o) => o.net === n.name && (o.name !== n.name || n.isIn)).forEach((o) => {
        labels.push({ name: o.name, x: n.x1 - 60, y: n.y, l: "m1", io: "out" });
      });
    });
    return { nets, rects, labels, tracks: trackEnd.length, wl, height: T0 + trackEnd.length * PITCH };
  }

  /* ------------------------------------------------------------ 전체 레이아웃 */
  function build(S, P, R) {
    const rects = [];
    P.order.forEach((id) => {
      const g = S.gates.find((q) => q.id === id), c = C.CELLS[g.cell], x = P.pos[id];
      c.rects.forEach((r) => rects.push({ l: r.l, x0: r.x0 + x, y0: r.y0, x1: r.x1 + x, y1: r.y1, net: r.net, g: id }));
    });
    R.rects.forEach((r) => rects.push(Object.assign({}, r)));
    rects.forEach((r, i) => (r.id = i));
    const labels = R.labels.concat([{ name: "VDD", x: 20, y: 1260 }, { name: "VSS", x: 20, y: 0 }]);
    return { rects, labels };
  }

  /* ------------------------------------------------------------ STA */
  // 논리적 노력: d = τ(p + g·h), τ = 3 ps (FO4 = 15 ps)
  const LE = { INV: { g: 1, p: 1, cin: 1.0 }, NAND2: { g: 4 / 3, p: 2, cin: 4 / 3 }, NOR2: { g: 5 / 3, p: 2, cin: 5 / 3 } };
  function sta(S, R, opts = {}) {
    const tau = opts.tau || 3, cw = opts.cwire == null ? 0.2 : opts.cwire, Cout = opts.cout || 2, T = opts.T || 200, tsu = opts.tsu || 20;
    const loads = {};
    S.gates.forEach((g) => g.inNets.forEach((n) => (loads[n] = (loads[n] || 0) + LE[g.t].cin)));
    S.outs.forEach((o) => (loads[o.net] = (loads[o.net] || 0) + Cout));
    const AT = {}, from = {}, D = {};
    S.inputs.forEach((n) => (AT[n] = 0));
    const order = S.gates.slice().sort((a, b) => a.level - b.level);
    order.forEach((g) => {
      const Cw = R ? (R.wl[g.outNet] || 0) / 1000 * cw : 0, Cl = (loads[g.outNet] || 0) + Cw, h = Cl / LE[g.t].cin;
      const d = tau * (LE[g.t].p + LE[g.t].g * h) * (g.size ? 1 : 1);
      D[g.id] = { d, Cl, Cw, h };
      let best = -1, bn = null; g.inNets.forEach((n) => { if (AT[n] > best) { best = AT[n]; bn = n; } });
      AT[g.outNet] = best + d; from[g.outNet] = { g: g.id, prev: bn };
    });
    const req = T - tsu;
    S.outs.forEach((o) => {
      if (!Number.isFinite(AT[o.net])) throw new Error("출력 도착 시간을 계산할 수 없음: " + o.name);
      AT[o.name] = AT[o.net];
    });
    let worst = null;
    S.outs.forEach((o) => { const s = req - AT[o.name]; if (!worst || s < worst.slack) worst = { out: o.name, slack: s, at: AT[o.name] }; });
    const path = [];
    if (worst) { let n = S.outs.find((o) => o.name === worst.out).net; while (from[n]) { path.unshift(from[n].g); n = from[n].prev; } }
    return { AT, D, worst, path, req, fmax: worst ? 1000 / (worst.at + tsu) : 0 };
  }

  /* ------------------------------------------------------------ LVS (이름 붙은 넷 기준) */
  function lvs(S, L) {
    const aliases = {}; S.outs.forEach((o) => { aliases[o.name] = o.net; });
    const ext = C.extract(L.rects, L.labels, { aliases });
    const portDiff = [];
    S.inputs.forEach((name) => { if (ext.ports[name] !== name) portDiff.push("입력 포트 누락·연결 오류: " + name); });
    S.outs.forEach((o) => { if (ext.ports[o.name] !== o.net) portDiff.push("출력 포트 누락·연결 오류: " + o.name); });
    const exp = [];
    S.gates.forEach((g) => {
      const sch = C.CELLS[g.cell].sch, map = { VDD: "VDD", VSS: "VSS", A: g.inNets[0], B: g.inNets[1], Y: g.outNet };
      sch.forEach((d) => exp.push({ t: d.t, g: map[d.g], s: map[d.s] || "*", d: map[d.d] || "*" }));
    });
    const key = (d) => d.t + "|" + d.g + "|" + [/^n\d+$/.test(d.s) && !S.gates.some((g) => g.outNet === d.s) ? "*" : d.s, /^n\d+$/.test(d.d) && !S.gates.some((g) => g.outNet === d.d) ? "*" : d.d].sort().join(",");
    const cnt = (list) => { const m = {}; list.forEach((d) => { const k = key(d); m[k] = (m[k] || 0) + 1; }); return m; };
    const a = cnt(ext.devices), b = cnt(exp);
    const diff = Object.keys(Object.assign({}, a, b)).filter((k) => (a[k] || 0) !== (b[k] || 0));
    diff.push(...portDiff);
    return { ok: !diff.length && !ext.shorts.length && !ext.opens.length && !ext.errors.length, diff, ext, nE: ext.devices.length, nS: exp.length };
  }

  /* ------------------------------------------------------------ GDSII */
  function gdsReal(v) { // 8바이트 GDS 실수 (excess-64, 밑 16)
    const out = new Uint8Array(8); if (v === 0) return out;
    let s = 0; if (v < 0) { s = 0x80; v = -v; }
    let e = 0; while (v >= 1) { v /= 16; e++; } while (v < 1 / 16) { v *= 16; e--; }
    out[0] = s | (e + 64);
    for (let i = 1; i < 8; i++) { v *= 256; const b = Math.floor(v); out[i] = b; v -= b; }
    return out;
  }
  function gds(name, L) {
    const chunks = [];
    const rec = (type, dt, data) => { const n = 4 + (data ? data.length : 0); const h = new Uint8Array([n >> 8, n & 255, type, dt]); chunks.push(h); if (data) chunks.push(data); };
    const i16 = (...v) => { const a = new Uint8Array(v.length * 2); v.forEach((x, i) => { a[i * 2] = (x >> 8) & 255; a[i * 2 + 1] = x & 255; }); return a; };
    const i32 = (...v) => { const a = new Uint8Array(v.length * 4), dv = new DataView(a.buffer); v.forEach((x, i) => dv.setInt32(i * 4, Math.round(x))); return a; };
    const str = (s) => { const b = new TextEncoder().encode(s); const a = new Uint8Array(b.length + (b.length & 1)); a.set(b); return a; };
    const now = new Date(), t = [now.getFullYear(), now.getMonth() + 1, now.getDate(), now.getHours(), now.getMinutes(), now.getSeconds()];
    rec(0x00, 0x02, i16(600)); rec(0x01, 0x02, i16(...t, ...t)); rec(0x02, 0x06, str("DESIGNBOOK_EDU45"));
    const u = new Uint8Array(16); u.set(gdsReal(1e-3), 0); u.set(gdsReal(1e-9), 8); rec(0x03, 0x05, u);
    rec(0x05, 0x02, i16(...t, ...t)); rec(0x06, 0x06, str(name));
    L.rects.forEach((r) => {
      const g = C.LAYER[r.l].gds.split("/").map(Number);
      rec(0x08, 0x00); rec(0x0d, 0x02, i16(g[0])); rec(0x0e, 0x02, i16(g[1]));
      rec(0x10, 0x03, i32(r.x0, r.y0, r.x1, r.y0, r.x1, r.y1, r.x0, r.y1, r.x0, r.y0)); rec(0x11, 0x00);
    });
    L.labels.forEach((p) => { rec(0x0c, 0x00); rec(0x0d, 0x02, i16(19)); rec(0x16, 0x02, i16(0)); rec(0x10, 0x03, i32(p.x, p.y)); rec(0x19, 0x06, str(p.name)); rec(0x11, 0x00); });
    rec(0x07, 0x00); rec(0x04, 0x00);
    const n = chunks.reduce((s, c) => s + c.length, 0), out = new Uint8Array(n); let o = 0; chunks.forEach((c) => { out.set(c, o); o += c.length; });
    return out;
  }

  /** 한 번에 전부 */
  function run(src, opts = {}) {
    const parsed = parse(src);
    if (parsed.errs.length || !parsed.outs.length) return { parsed, err: parsed.errs.join(" · ") || "식이 없음" };
    const S = synth(parsed, opts), S0 = synth(parsed, { opt: false });
    if (!S.gates.length) return { parsed, err: "게이트가 필요 없는 식이다 (출력 = 입력)" };
    const P = placeRow(S, opts), R = route(S, P), L = build(S, P, R);
    return { parsed, S, S0, P, R, L, eq: equiv(parsed, S) };
  }

  window.FLOW = { parse, synth, equiv, evalNet, evalAst, placeRow, route, build, sta, lvs, gds, run, LE, AREA, T0, PITCH };
})();
