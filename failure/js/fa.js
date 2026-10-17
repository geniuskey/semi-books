/* Copyright (c) 2026 geniuskey and FailureBook contributors.
   Executable code: MIT (see ../LICENSE-MIT).
   Educational content and illustrations: CC-BY-4.0 (see ../LICENSE.md). */
/* ==========================================================================
   FailureBook 불량 분석 엔진 — 전역 객체 FA (js/common.js 다음에 로드)
   여러 장이 같은 "증거물"을 다른 장비로 들여다볼 수 있게 하는 공통 모델과 렌더러.
   - FA.stack / FA.drawStack : 결함을 심은 배선 단면 모델과 컬러·SEM·TEM 렌더
   - FA.wafer / FA.drawWafer : 불량 무늬가 있는 웨이퍼 맵
   - FA.layout / FA.drawLayout : 위에서 본 가상 배선 레이아웃
   - FA.heat, FA.colormap, FA.grain, FA.scaleBar : 현미경 영상 표현용 헬퍼
   구조와 치수는 28 nm급 배선을 단순화한 교육용 모델이다.
   ========================================================================== */
(function () {
  "use strict";
  const FA = (window.FA = {});

  /* ------------------------------------------------------------ 재질 */
  // sem: SEM 이차 전자 영상의 밝기, tem: 명시야 TEM 밝기 (0~255, 무겁고 조밀할수록 TEM에서 어둡다)
  FA.MAT = {
    si:   { name: "실리콘",        en: "Si",      color: "#8f99aa", sem: 105, tem: 150 },
    ox:   { name: "산화막",        en: "SiO₂",    color: "#bcd8f0", sem: 62,  tem: 214 },
    nit:  { name: "질화막·캡",     en: "SiN/SiCN", color: "#e2b05a", sem: 88,  tem: 188 },
    poly: { name: "게이트",        en: "poly-Si", color: "#c0604a", sem: 128, tem: 132 },
    w:    { name: "텅스텐",        en: "W",       color: "#7f8792", sem: 236, tem: 28 },
    cu:   { name: "구리",          en: "Cu",      color: "#cc7a3a", sem: 198, tem: 62 },
    bar:  { name: "배리어",        en: "Ta/TaN",  color: "#c9a227", sem: 246, tem: 14 },
    lowk: { name: "저유전막",      en: "low-k",   color: "#a8e0d0", sem: 46,  tem: 230 },
    void: { name: "보이드",        en: "void",    color: "#10141c", sem: 6,   tem: 250 },
    part: { name: "이물",          en: "particle", color: "#5b4a3a", sem: 150, tem: 105 },
    bd:   { name: "절연 파괴 경로", en: "breakdown", color: "#e0443e", sem: 150, tem: 70 },
  };

  FA.DEFECTS = {
    void:     { name: "비아 보이드",      en: "Via void",        elec: "저항성 단선" },
    open:     { name: "비아 미접속",      en: "Unlanded via",    elec: "단선" },
    bridge:   { name: "배선 브리지",      en: "Metal bridge",    elec: "단락" },
    particle: { name: "매립 이물",        en: "Embedded particle", elec: "단락 또는 단선" },
    gox:      { name: "게이트 산화막 파괴", en: "Gate oxide breakdown", elec: "게이트 누설" },
  };

  /* ------------------------------------------------------------ 단면 모델 */
  /**
   * 배선 단면을 만든다. 좌표: x(nm)는 왼쪽 0, y(nm)는 실리콘 표면 0·위가 +.
   *   const m = FA.stack({ width: 1400, metals: 4, seed: 3, defect: { type: "void", level: 3, at: 0.5 } });
   * 반환: { W, top, bottom, shapes:[{mat,x,y,w,h,kind,lv,round}], levels:[{name,y0,y1,kind,lv}], defect }
   *   - shapes는 그리는 순서(아래 → 위). levels는 위에서부터 한 층씩 걷어 낼 때 쓰는 경계(아래 → 위).
   *   - defect: { type, name, en, elec, x, y, w, h, lv } (결함을 감싸는 상자) 또는 null
   * defect.type: "void" | "open" | "bridge" | "particle" | "gox". level은 금속 층 번호(비아는 그 층 바로 아래 비아).
   */
  FA.stack = function (o) {
    o = o || {};
    const W = o.width || 1400, nM = FB.clamp(o.metals || 4, 1, 5), rnd = FB.rng(o.seed || 1);
    const shapes = [], levels = [];
    const add = (mat, x, y, w, h, kind, lv, extra) => { const s = Object.assign({ mat, x, y, w, h, kind, lv: lv || 0 }, extra); shapes.push(s); return s; };
    const BAR = 5;
    // 금속 사각형: 배리어 테두리 + 구리 속
    const metal = (x, y, w, h, kind, lv) => { add("bar", x, y, w, h, kind + "-bar", lv); return add("cu", x + BAR, y + BAR, w - 2 * BAR, h - BAR, kind, lv); };

    // 기판과 소자
    add("si", 0, -320, W, 320, "sub");
    const GP = 140, PMD = 150;
    add("ox", 0, 0, W, PMD, "pmd");
    const gates = [], contacts = [];
    for (let i = 0, x = 35; x + 34 < W; x += GP, i++) {
      if (i % 5 === 4) { add("ox", x - 20, -180, 74, 180, "sti"); continue; }
      add("nit", x - 8, 0, 50, 56, "spacer");
      add("ox", x, 0, 34, 3, "gox");
      gates.push(add("poly", x, 3, 34, 57, "gate"));
    }
    for (let x = 105 - 15; x + 30 < W; x += GP) contacts.push(add("w", x, 0, 30, PMD, "contact"));
    levels.push({ name: "기판·소자", kind: "feol", lv: 0, y0: -320, y1: 0 }, { name: "콘택", kind: "contact", lv: 0, y0: 0, y1: PMD });

    // 배선: 홀수 층은 지면에 수직(단면에서 작은 사각형), 짝수 층은 단면과 나란한 긴 띠
    const T = [0, 90, 110, 130, 220, 360], P = [0, 140, 140, 280, 560, 1120], CAP = 12;
    let y = PMD;
    const lines = [null];
    for (let k = 1; k <= nM; k++) {
      const t = T[k], p = P[k], vh = k > 1 ? Math.round(t * 0.85) : 0, vw = Math.round(Math.min(p, P[k - 1] || p) * 0.32);
      const vy = y;
      if (k > 1) { add("lowk", 0, y, W, vh, "ild", k); levels.push({ name: "V" + (k - 1), kind: "via", lv: k, y0: y, y1: y + vh }); y += vh; }
      add("lowk", 0, y, W, t, "ild", k);
      const cur = [];
      if (k % 2 === 1) {
        const lw = p / 2;
        for (let cx = 105 + (k > 1 ? p / 2 - 70 : 0); cx + lw / 2 < W; cx += p) cur.push(metal(cx - lw / 2, y, lw, t, "line", k));
      } else {
        const nseg = 2 + Math.floor(rnd() * 2), gap = 110, seg = (W - gap * (nseg + 1)) / nseg;
        for (let i = 0; i < nseg; i++) cur.push(metal(gap + i * (seg + gap), y, seg, t, "line", k));
      }
      lines.push(cur);
      // 비아: 아래층 선과 위층 선이 겹치는 곳에 놓는다
      if (k > 1) {
        const lo = lines[k - 1], small = k % 2 === 1 ? cur : lo, big = k % 2 === 1 ? lo : cur;
        small.forEach((s) => {
          const cx = s.x + s.w / 2;
          const host = big.find((b) => cx - vw / 2 > b.x + 6 && cx + vw / 2 < b.x + b.w - 6);
          if (host && rnd() < 0.62) metal(cx - vw / 2 - BAR, vy - CAP, vw + 2 * BAR, vh + CAP + BAR + 1, "via", k);
        });
      }
      levels.push({ name: "M" + k, kind: "metal", lv: k, y0: y, y1: y + t });
      y += t;
      add("nit", 0, y, W, CAP, "cap", k); y += CAP;
      levels[levels.length - 1].y1 = y;
    }
    add("ox", 0, y, W, 140, "pass"); add("nit", 0, y + 140, W, 90, "pass");
    levels.push({ name: "보호막", kind: "pass", lv: nM + 1, y0: y, y1: y + 230 });
    const top = y + 230;

    // 결함 심기
    let defect = null;
    if (o.defect && o.defect.type) {
      const d = o.defect, at = (d.at == null ? 0.5 : d.at) * W, info = FA.DEFECTS[d.type];
      const near = (arr) => arr.slice().sort((a, b) => Math.abs(a.x + a.w / 2 - at) - Math.abs(b.x + b.w / 2 - at))[0];
      const lv = FB.clamp(d.level || 2, d.type === "bridge" || d.type === "particle" ? 1 : 2, nM);
      let box = null;
      if (d.type === "void" || d.type === "open") {
        let v = near(shapes.filter((s) => s.kind === "via" && s.lv === lv));
        if (!v) v = near(shapes.filter((s) => s.kind === "via"));
        if (v) {
          if (d.type === "void") {
            box = add("void", v.x + 2, v.y + 2, v.w - 4, Math.round(v.h * 0.42), "defect", v.lv, { round: true });
          } else {
            // 비아가 아래 배선에 닿지 못했다: 바닥에 절연막이 남는다
            const gap = 20, bar = shapes[shapes.indexOf(v) - 1];
            add("nit", bar.x - 1, bar.y, bar.w + 2, CAP, "defect-cap", v.lv);
            add("lowk", bar.x - 1, bar.y + CAP, bar.w + 2, gap, "defect-cap", v.lv);
            box = { x: bar.x, y: bar.y, w: bar.w, h: CAP + gap, lv: v.lv };
          }
        }
      } else if (d.type === "bridge") {
        const odd = lv % 2 === 1 ? lv : Math.max(1, lv - 1);
        const ls = lines[odd].slice().sort((a, b) => Math.abs(a.x - at) - Math.abs(b.x - at));
        const a = ls[0], b = lines[odd][lines[odd].indexOf(a) + 1] || lines[odd][lines[odd].indexOf(a) - 1];
        if (a && b) {
          const x0 = Math.min(a.x + a.w, b.x + b.w) - 2, x1 = Math.max(a.x, b.x) + 2, h = Math.round(a.h * 0.22);
          box = add("cu", x0, a.y + a.h - h, x1 - x0, h, "defect", odd);
        }
      } else if (d.type === "particle") {
        const L = levels.find((l) => l.kind === "metal" && l.lv === lv), r = 55;
        box = add("part", at - r, L.y0 + (L.y1 - L.y0) / 2 - r * 0.7, 2 * r, 1.4 * r, "defect", lv, { round: true });
      } else if (d.type === "gox") {
        const g = near(gates);
        box = add("bd", g.x + g.w * 0.6, -6, 7, 12, "defect", 0, { round: true });
      }
      if (box) defect = Object.assign({ type: d.type, x: box.x, y: box.y, w: box.w, h: box.h, lv: box.lv }, info);
    }
    return { W, top, bottom: -320, shapes, levels, defect, metals: nM };
  };

  /**
   * 단면 렌더. opts: { mode:"color"|"sem"|"tem", x0, x1, y0, y1 (보이는 범위 nm), removedAbove (이 높이 위는 제거됨), bg (빈 곳 배경색),
   *   hideDefect, mark (결함 위치에 점선 원), labels (층 이름), grain (0~1 잡음), seed }
   * 반환: { X(nm)->px, Y(nm)->px, s (px/nm) } — 위에 덧그릴 때 쓴다.
   */
  FA.drawStack = function (ctx, m, box, opts) {
    opts = opts || {};
    const mode = opts.mode || "color";
    const x0 = opts.x0 != null ? opts.x0 : 0, x1 = opts.x1 != null ? opts.x1 : m.W;
    const y0 = opts.y0 != null ? opts.y0 : -120, y1 = opts.y1 != null ? opts.y1 : m.top + 30;
    const X = (x) => box.x + ((x - x0) / (x1 - x0)) * box.w, Y = (y) => box.y + ((y1 - y) / (y1 - y0)) * box.h;
    const cut = opts.removedAbove != null ? opts.removedAbove : Infinity;
    const col = (mat) => { const M = FA.MAT[mat]; if (mode === "color") return M.color; const g = mode === "sem" ? M.sem : M.tem; return "rgb(" + g + "," + g + "," + g + ")"; };
    ctx.save();
    ctx.beginPath(); ctx.rect(box.x, box.y, box.w, box.h); ctx.clip();
    ctx.fillStyle = opts.bg || (mode === "color" ? FB.color("canvas-bg") : mode === "sem" ? "#000" : "#f4f4f4");
    ctx.fillRect(box.x, box.y, box.w, box.h);
    m.shapes.forEach((s) => {
      if (opts.hideDefect && (s.kind === "defect" || s.kind === "defect-cap")) return;
      if (s.y >= cut) return;
      const h = Math.min(s.h, cut - s.y);
      const px = X(s.x), py = Y(s.y + h), pw = X(s.x + s.w) - px, ph = Y(s.y) - py;
      if (px > box.x + box.w || px + pw < box.x || py > box.y + box.h || py + ph < box.y) return;
      ctx.fillStyle = col(s.mat);
      if (s.round && h === s.h) { ctx.beginPath(); ctx.ellipse(px + pw / 2, py + ph / 2, pw / 2, ph / 2, 0, 0, Math.PI * 2); ctx.fill(); }
      else ctx.fillRect(px, py, pw + 0.5, ph + 0.5);
    });
    if (opts.grain) FA.grain(ctx, box, opts.grain, opts.seed || 7);
    if (opts.labels) {
      ctx.font = FB.font(11, true); ctx.textAlign = "left"; ctx.textBaseline = "middle";
      m.levels.forEach((l) => {
        if (l.y0 >= cut) return;
        const py = Y((l.y0 + Math.min(l.y1, cut)) / 2);
        if (py < box.y + 6 || py > box.y + box.h - 6) return;
        const tw = ctx.measureText(l.name).width + 8;
        ctx.fillStyle = "rgba(11,13,18,.62)"; ctx.fillRect(box.x + 4, py - 8, tw, 16);
        ctx.fillStyle = "#fff"; ctx.fillText(l.name, box.x + 8, py + 0.5);
      });
    }
    if (opts.mark && m.defect && m.defect.y < cut) {
      const d = m.defect, r = Math.max(14, Math.hypot(X(d.x + d.w) - X(d.x), Y(d.y) - Y(d.y + d.h)) * 0.75);
      ctx.strokeStyle = FB.color("bad"); ctx.lineWidth = 2; ctx.setLineDash([5, 4]);
      ctx.beginPath(); ctx.arc(X(d.x + d.w / 2), Y(d.y + d.h / 2), r, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]);
    }
    ctx.restore();
    return { X, Y, s: box.w / (x1 - x0) };
  };

  /** 재질 범례 HTML: FA.legend(["cu","bar","lowk"]) → .mat-legend 안에 넣을 문자열 */
  FA.legend = function (keys) {
    return keys.map((k) => '<span><i style="background:' + FA.MAT[k].color + '"></i>' + FA.MAT[k].name + " " + FA.MAT[k].en + "</span>").join("");
  };

  /* ------------------------------------------------------------ 웨이퍼 맵 */
  /**
   * 불량 무늬가 있는 웨이퍼 맵.
   *   const w = FA.wafer({ n: 25, pattern: "edge", base: 0.05, strength: 0.8, seed: 2 });
   * pattern: "none" | "edge" | "center" | "donut" | "scratch" | "cluster" | "reticle" | "half"
   * base는 무작위 불량 확률, strength는 무늬 영역에서 더해지는 불량 확률.
   * 반환: { n, dies:[{i, j, x, y, r, fail, cause:"pattern"|"random"|null, p}], total, fails, yield }
   *   x, y는 웨이퍼 중심 기준 −1~1(위가 +y), r은 중심 거리.
   */
  FA.wafer = function (o) {
    o = o || {};
    const n = o.n || 25, rnd = FB.rng((o.seed || 1) * 7919), base = o.base == null ? 0.05 : o.base, st = o.strength == null ? 0.8 : o.strength;
    const pat = o.pattern || "none";
    const ang = rnd() * Math.PI, sx = (rnd() - 0.5) * 0.6, sy = (rnd() - 0.5) * 0.6, len = 0.5 + rnd() * 0.5;
    const blobs = [[(rnd() - 0.5) * 1.1, (rnd() - 0.5) * 1.1], [(rnd() - 0.5) * 1.1, (rnd() - 0.5) * 1.1]];
    const side = rnd() * Math.PI * 2;
    const g = (d, s) => Math.exp(-(d * d) / (s * s));
    const extra = (x, y, r, i, j) => {
      switch (pat) {
        case "edge": return FB.clamp((r - 0.72) / 0.2, 0, 1);
        case "center": return g(r, 0.33);
        case "donut": return g(r - 0.58, 0.11);
        case "scratch": {
          const dx = Math.cos(ang), dy = Math.sin(ang), t = FB.clamp((x - sx) * dx + (y - sy) * dy, -len, len);
          return Math.hypot(x - sx - t * dx, y - sy - t * dy) < 0.06 ? 1 : 0;
        }
        case "cluster": return Math.max(g(Math.hypot(x - blobs[0][0], y - blobs[0][1]), 0.2), g(Math.hypot(x - blobs[1][0], y - blobs[1][1]), 0.13));
        case "reticle": return i % 3 === 1 && j % 2 === 0 ? 1 : 0;
        case "half": return FB.clamp((x * Math.cos(side) + y * Math.sin(side)) / 0.25 + 0.2, 0, 1);
        default: return 0;
      }
    };
    const dies = [], half = 1 / n;
    for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
      const x = ((i + 0.5) / n) * 2 - 1, y = 1 - ((j + 0.5) / n) * 2;
      if (Math.hypot(Math.abs(x) + half, Math.abs(y) + half) > 0.985) continue;
      const r = Math.hypot(x, y), pp = st * extra(x, y, r, i, j);
      const a = rnd() < pp, b = rnd() < base;
      dies.push({ i, j, x, y, r, p: pp, fail: a || b, cause: a ? "pattern" : b ? "random" : null });
    }
    const fails = dies.filter((d) => d.fail).length;
    return { n, dies, total: dies.length, fails, yield: 1 - fails / dies.length };
  };

  /**
   * 웨이퍼 맵 렌더. opts: { fill:(die)=>css색, sel:{i,j}, notch:true }
   * 반환: { cx, cy, R, at(px, py) → die|null }
   */
  FA.drawWafer = function (ctx, w, box, opts) {
    opts = opts || {};
    const P = FB.palette(), R = Math.min(box.w, box.h) / 2 - 4, cx = box.x + box.w / 2, cy = box.y + box.h / 2, s = (2 * R) / w.n;
    const fill = opts.fill || ((d) => (d.fail ? P.bad : P.ok));
    ctx.save();
    ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.fillStyle = P.surface; ctx.fill();
    w.dies.forEach((d) => {
      ctx.fillStyle = fill(d);
      ctx.fillRect(cx - R + d.i * s + 0.6, cy - R + d.j * s + 0.6, s - 1.2, s - 1.2);
    });
    if (opts.sel) { ctx.strokeStyle = P.text; ctx.lineWidth = 2; ctx.strokeRect(cx - R + opts.sel.i * s - 1, cy - R + opts.sel.j * s - 1, s + 2, s + 2); }
    ctx.strokeStyle = P.axis; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.stroke();
    if (opts.notch !== false) { ctx.fillStyle = FB.color("canvas-bg"); ctx.beginPath(); ctx.arc(cx, cy + R, 5, 0, Math.PI * 2); ctx.fill(); }
    ctx.restore();
    return {
      cx, cy, R,
      at(px, py) { const i = Math.floor((px - (cx - R)) / s), j = Math.floor((py - (cy - R)) / s); return w.dies.find((d) => d.i === i && d.j === j) || null; },
    };
  };

  /* ------------------------------------------------------------ 레이아웃 (위에서 본 배선) */
  FA.LAYER_COLORS = ["#4f8fe0", "#e0574a", "#3fb27f", "#d6a02a"];
  /**
   * 가상의 맨해튼 배선. 좌표는 0~1 정사각형.
   *   const lay = FA.layout({ seed: 5, tracks: 22, levels: 3 });
   * 반환: { levels:[{dir:"h"|"v", w, segs:[{t, a, b}]}], vias:[{lv, x, y}] }
   *   t는 트랙 위치(선의 중심), a~b는 선이 뻗은 구간. lv는 0부터(M1 = 0). via.lv는 아래 층 번호.
   */
  FA.layout = function (o) {
    o = o || {};
    const rnd = FB.rng((o.seed || 1) * 104729), nL = o.levels || 3, tr = o.tracks || 22;
    const levels = [], vias = [];
    for (let k = 0; k < nL; k++) {
      const n = Math.max(6, Math.round(tr / (1 + k * 0.45))), pitch = 1 / n, segs = [];
      for (let i = 0; i < n; i++) {
        const t = (i + 0.5) * pitch;
        let a = rnd() * 0.15;
        while (a < 0.98) {
          const b = Math.min(1, a + 0.12 + rnd() * 0.5);
          if (rnd() < 0.82) segs.push({ t, a, b });
          a = b + 0.04 + rnd() * 0.12;
        }
      }
      levels.push({ dir: k % 2 === 0 ? "h" : "v", w: pitch * 0.46, segs });
    }
    for (let k = 0; k + 1 < nL; k++) {
      levels[k].segs.forEach((lo) => levels[k + 1].segs.forEach((up) => {
        if (up.t > lo.a && up.t < lo.b && lo.t > up.a && lo.t < up.b && rnd() < 0.3)
          vias.push({ lv: k, x: levels[k].dir === "h" ? up.t : lo.t, y: levels[k].dir === "h" ? lo.t : up.t });
      }));
    }
    return { levels, vias };
  };

  /**
   * 레이아웃 렌더. opts: { show:[true,true,true], mono:false (회색 광학 영상풍), alpha:1, bg:css색|null, colors:[...] }
   * 반환: { X(u)->px, Y(v)->px }
   */
  FA.drawLayout = function (ctx, lay, box, opts) {
    opts = opts || {};
    const X = (u) => box.x + u * box.w, Y = (v) => box.y + v * box.h;
    const colors = opts.colors || FA.LAYER_COLORS;
    ctx.save();
    ctx.beginPath(); ctx.rect(box.x, box.y, box.w, box.h); ctx.clip();
    if (opts.bg !== null) { ctx.fillStyle = opts.bg || (opts.mono ? "#14171d" : FB.color("canvas-bg")); ctx.fillRect(box.x, box.y, box.w, box.h); }
    lay.levels.forEach((L, k) => {
      if (opts.show && !opts.show[k]) return;
      const g = 70 + k * 45;
      ctx.globalAlpha = (opts.alpha == null ? 1 : opts.alpha) * (opts.mono ? 1 : 0.82);
      ctx.fillStyle = opts.mono ? "rgb(" + g + "," + g + "," + (g + 6) + ")" : colors[k % colors.length];
      L.segs.forEach((s) => {
        if (L.dir === "h") ctx.fillRect(X(s.a), Y(s.t - L.w / 2), (s.b - s.a) * box.w, L.w * box.h);
        else ctx.fillRect(X(s.t - L.w / 2), Y(s.a), L.w * box.w, (s.b - s.a) * box.h);
      });
    });
    ctx.globalAlpha = opts.alpha == null ? 1 : opts.alpha;
    lay.vias.forEach((v) => {
      if (opts.show && !(opts.show[v.lv] && opts.show[v.lv + 1])) return;
      const r = lay.levels[v.lv + 1].w * box.w * 0.34;
      ctx.fillStyle = opts.mono ? "#d9dde6" : FB.color("text");
      ctx.fillRect(X(v.x) - r, Y(v.y) - r, 2 * r, 2 * r);
    });
    ctx.restore();
    return { X, Y };
  };

  /* ------------------------------------------------------------ 영상 헬퍼 */
  const MAPS = {
    gray: [[0, 0, 0], [255, 255, 255]],
    hot: [[0, 0, 0], [150, 10, 10], [240, 90, 10], [255, 220, 60], [255, 255, 255]],
    thermal: [[20, 20, 110], [30, 140, 220], [50, 200, 120], [245, 220, 50], [230, 50, 40]],
    emi: [[40, 200, 90], [240, 230, 50], [240, 60, 40]],
  };
  /** 색 지도: FA.colormap("hot", 0.7) → [r,g,b]. 이름: gray, hot, thermal, emi */
  FA.colormap = function (name, t) {
    const m = MAPS[name] || MAPS.gray; t = FB.clamp(t, 0, 1) * (m.length - 1);
    const i = Math.min(m.length - 2, Math.floor(t)), f = t - i, a = m[i], b = m[i + 1];
    return [Math.round(a[0] + (b[0] - a[0]) * f), Math.round(a[1] + (b[1] - a[1]) * f), Math.round(a[2] + (b[2] - a[2]) * f)];
  };
  /**
   * 스칼라 장을 영상으로 그린다. fn(u, v) → 0~1 (u, v는 상자 안 0~1, v는 위에서 아래로).
   * opts: { nx:96, ny, map:"hot", overlay:false (값을 투명도로 써서 기존 그림 위에 덧씌운다), threshold:0 (이 값 아래는 투명),
   *         noise:0 (가우시안 잡음 σ), seed:1, smooth:true }
   */
  FA.heat = function (ctx, box, fn, opts) {
    opts = opts || {};
    const nx = opts.nx || 96, ny = opts.ny || Math.max(2, Math.round((nx * box.h) / box.w));
    const cv = document.createElement("canvas"); cv.width = nx; cv.height = ny;
    const c2 = cv.getContext("2d"), img = c2.createImageData(nx, ny), d = img.data, rnd = FB.rng(opts.seed || 1);
    const map = opts.map || "hot", th = opts.threshold || 0, ns = opts.noise || 0;
    for (let j = 0, p = 0; j < ny; j++) for (let i = 0; i < nx; i++, p += 4) {
      let v = fn((i + 0.5) / nx, (j + 0.5) / ny);
      if (ns) v += ns * Math.sqrt(-2 * Math.log(rnd() + 1e-9)) * Math.cos(6.2832 * rnd());
      v = FB.clamp(v, 0, 1);
      const c = FA.colormap(map, v);
      d[p] = c[0]; d[p + 1] = c[1]; d[p + 2] = c[2];
      d[p + 3] = v <= th ? 0 : opts.overlay ? Math.round(255 * Math.min(1, (v - th) / (1 - th) * 1.6)) : 255;
    }
    c2.putImageData(img, 0, 0);
    ctx.save();
    ctx.imageSmoothingEnabled = opts.smooth !== false;
    ctx.drawImage(cv, box.x, box.y, box.w, box.h);
    ctx.restore();
  };
  /** 현미경 잡음(샷 노이즈) 덧씌우기. amount 0~1 */
  FA.grain = function (ctx, box, amount, seed) {
    const nx = Math.max(8, Math.round(box.w / 2)), ny = Math.max(8, Math.round(box.h / 2));
    const cv = document.createElement("canvas"); cv.width = nx; cv.height = ny;
    const c2 = cv.getContext("2d"), img = c2.createImageData(nx, ny), d = img.data, rnd = FB.rng(seed || 1);
    for (let p = 0; p < d.length; p += 4) { const v = rnd() < 0.5 ? 0 : 255; d[p] = d[p + 1] = d[p + 2] = v; d[p + 3] = Math.round(255 * amount * rnd()); }
    c2.putImageData(img, 0, 0);
    ctx.save(); ctx.imageSmoothingEnabled = false; ctx.drawImage(cv, box.x, box.y, box.w, box.h); ctx.restore();
  };
  /** 축척 막대. pxPerUnit은 1 m(또는 unit 1)당 픽셀 수: FA.scaleBar(ctx, box, s * 1e9, "m") — s가 px/nm일 때 */
  FA.scaleBar = function (ctx, box, pxPerUnit, unit, color) {
    const target = box.w * 0.22 / pxPerUnit, mag = Math.pow(10, Math.floor(Math.log10(target)));
    const len = [5, 2, 1].map((k) => k * mag).find((v) => v <= target) || mag, px = len * pxPerUnit;
    const x = box.x + 12, y = box.y + box.h - 14;
    ctx.save();
    ctx.fillStyle = "rgba(11,13,18,.62)"; ctx.fillRect(x - 6, y - 20, Math.max(px, 44) + 12, 28);
    ctx.fillStyle = color || "#fff"; ctx.fillRect(x, y, px, 3);
    ctx.font = FB.font(11, true); ctx.textAlign = "left"; ctx.textBaseline = "bottom";
    ctx.fillText(FB.si(len, unit || "m", 2), x, y - 3);
    ctx.restore();
  };
})();
