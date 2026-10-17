/* Copyright (c) 2026 geniuskey and PackagingBook contributors.
   Executable code: MIT (see ../LICENSE-MIT).
   Educational content and illustrations: CC-BY-4.0 (see ../LICENSE.md). */
/* ==========================================================================
   PackagingBook 단면 그리기 엔진 — 전역 객체 PKG
   패키지 단면을 "도형 목록"으로 기술하고 캔버스에 그린다. common.js(PB) 뒤에 로드한다.
   좌표: 월드 좌표 x는 오른쪽 +, y는 위쪽 +. 단위는 자유(보통 µm). view = {x0, x1, y0, y1, stretch}
   - stretch가 없으면 가로·세로 같은 배율로 맞추고, true면 상자를 꽉 채운다(세로 과장).
   도형: {t:"rect"|"circle"|"ball"|"poly"|"wire"|"line"|"text"|"label"|"dim"|"arrow", ...}
   - m: 재질 키(PKG.MATS) 또는 fill: 색 문자열. a: 불투명도 0..1.
   - PKG.stepper(el, {steps:[{k, label, desc, shapes}]}) — 단계별 단면 위젯.
   ========================================================================== */
(function () {
  "use strict";

  const MATS = {
    si:     { name: "실리콘",        en: "Si",          color: "#8f99aa" },
    beol:   { name: "회로층",        en: "BEOL",        color: "#6f7f9c" },
    ox:     { name: "산화막",        en: "SiO₂",        color: "#bcd8f0" },
    nit:    { name: "패시베이션",    en: "SiN",         color: "#e2b05a" },
    pi:     { name: "폴리이미드",    en: "PI/PBO",      color: "#e0a03c" },
    pr:     { name: "감광막",        en: "PR",          color: "#cf7aa6" },
    cu:     { name: "구리",          en: "Cu",          color: "#cc7a3a" },
    al:     { name: "알루미늄 패드", en: "Al",          color: "#b7bec8" },
    au:     { name: "금",            en: "Au",          color: "#e6c229" },
    ni:     { name: "니켈",          en: "Ni",          color: "#9aa3ad" },
    ubm:    { name: "UBM·씨드",      en: "Ti/Cu",       color: "#7a6a8f" },
    solder: { name: "솔더",          en: "SnAg",        color: "#c3ccd6" },
    imc:    { name: "금속간 화합물", en: "IMC",         color: "#8a6d4f" },
    emc:    { name: "몰딩 컴파운드", en: "EMC",         color: "#3a3f48" },
    uf:     { name: "언더필",        en: "Underfill",   color: "#7fb6d9" },
    ncf:    { name: "비전도성 필름", en: "NCF",         color: "#9fd0c0" },
    daf:    { name: "다이 접착 필름", en: "DAF",        color: "#d9c27a" },
    ag:     { name: "은 에폭시",     en: "Ag epoxy",    color: "#b8b29a" },
    sub:    { name: "기판 코어",     en: "BT/FR-4",     color: "#3f8f5f" },
    abf:    { name: "빌드업 절연층", en: "ABF",         color: "#9fcf9f" },
    sr:     { name: "솔더 레지스트", en: "SR",          color: "#2f7a4f" },
    lf:     { name: "리드프레임",    en: "Cu alloy",    color: "#b98a5a" },
    tape:   { name: "테이프",        en: "Tape",        color: "#7aa2e0" },
    glass:  { name: "유리·캐리어",   en: "Glass",       color: "#cfe6ee" },
    tim:    { name: "열 계면 재료",  en: "TIM",         color: "#d88a9a" },
    lid:    { name: "히트 스프레더", en: "Lid",         color: "#a7afb9" },
    pcb:    { name: "메인보드",      en: "PCB",         color: "#2f6f4a" },
    tool:   { name: "장비·툴",       en: "Tool",        color: "#59657a" },
  };
  Object.keys(MATS).forEach((k) => (MATS[k].key = k));

  const PKG = (window.PKG = {});
  PKG.MATS = MATS;
  PKG.mat = (k) => (MATS[k] ? MATS[k].color : k);

  /* ------------------------------------------------------------ 보조 함수 */
  PKG.ease = (t) => { t = Math.min(1, Math.max(0, t)); return t * t * (3 - 2 * t); };
  /** 전체 진행 t(0..1) 중 구간 [a,b]의 진행도 0..1 */
  PKG.seq = (t, a, b) => Math.min(1, Math.max(0, (t - a) / (b - a)));
  /** n개 반복: PKG.rep(8, x0, pitch, (x, i) => 도형 | 도형 배열) → 평탄화한 배열 */
  PKG.rep = function (n, x0, pitch, fn) {
    const out = [];
    for (let i = 0; i < n; i++) { const r = fn(x0 + i * pitch, i); if (Array.isArray(r)) out.push.apply(out, r); else if (r) out.push(r); }
    return out;
  };
  /** n개를 [x0, x1] 사이에 가운데 정렬로 균등 배치했을 때의 x 목록 */
  PKG.spread = function (n, x0, x1) { const p = (x1 - x0) / n, out = []; for (let i = 0; i < n; i++) out.push(x0 + (i + 0.5) * p); return out; };

  /* ------------------------------------------------------------ 그리기 */
  function transform(box, view) {
    const vw = view.x1 - view.x0, vh = view.y1 - view.y0;
    let sx = box.w / vw, sy = box.h / vh, ox = 0, oy = 0;
    if (!view.stretch) { const s = Math.min(sx, sy); ox = (box.w - vw * s) / 2; oy = (box.h - vh * s) / 2; sx = sy = s; }
    return { sx, sy, X: (x) => box.x + ox + (x - view.x0) * sx, Y: (y) => box.y + box.h - oy - (y - view.y0) * sy };
  }
  PKG.transform = transform;

  function smoothPath(ctx, P) {
    ctx.moveTo(P[0][0], P[0][1]);
    if (P.length < 3) { for (let i = 1; i < P.length; i++) ctx.lineTo(P[i][0], P[i][1]); return; }
    for (let i = 0; i < P.length - 1; i++) {
      const p0 = P[Math.max(0, i - 1)], p1 = P[i], p2 = P[i + 1], p3 = P[Math.min(P.length - 1, i + 2)];
      ctx.bezierCurveTo(p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6, p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6, p2[0], p2[1]);
    }
  }
  function arrowHead(ctx, x0, y0, x1, y1, s) {
    const a = Math.atan2(y1 - y0, x1 - x0);
    ctx.beginPath(); ctx.moveTo(x1, y1);
    ctx.lineTo(x1 - s * Math.cos(a - 0.4), y1 - s * Math.sin(a - 0.4));
    ctx.lineTo(x1 - s * Math.cos(a + 0.4), y1 - s * Math.sin(a + 0.4));
    ctx.closePath(); ctx.fill();
  }

  /**
   * PKG.draw(ctx, shapes, box, view, opts) → {X, Y, sx, sy}
   * box = {x, y, w, h}(px), view = {x0, x1, y0, y1, stretch}
   * 도형 공통: m(재질 키) | fill(색), a(불투명도), stroke(색 | false), lw(px)
   *   rect   {x, y, w, h, r}            x,y는 왼쪽 아래. r은 모서리 반지름(px)
   *   circle {x, y, r}                  r은 x 방향 월드 단위
   *   ball   {x, y, w, h, k}            y~y+h 사이의 솔더 접합. 가운데 폭 w, 위아래 접촉 폭 w·k(기본 0.62)
   *   poly   {pts:[[x,y],...]}
   *   wire   {pts, m|color, lw, smooth} 본딩 와이어 등 곡선(기본 smooth)
   *   line   {pts, color, lw, dash}
   *   text   {x, y, text, color, size, align, base, bold, mono}
   *   label  {x, y, tx, ty, text, color, align}   (tx,ty)에 글자, (x,y)까지 지시선
   *   dim    {x0, y0, x1, y1, text, color, off}   치수선(양쪽 화살표)
   *   arrow  {x0, y0, x1, y1, text, color, lw}
   */
  PKG.draw = function (ctx, shapes, box, view, opts) {
    opts = opts || {};
    const T = transform(box, view), X = T.X, Y = T.Y, P = PB.palette();
    const edge = opts.edge === false ? null : PB.isDark() ? "rgba(255,255,255,.2)" : "rgba(0,0,0,.28)";
    ctx.save();
    ctx.beginPath(); ctx.rect(box.x, box.y, box.w, box.h); ctx.clip();
    ctx.lineJoin = "round"; ctx.lineCap = "round";
    const fin = (s) => {
      ctx.fillStyle = s.fill || PKG.mat(s.m || "si"); ctx.fill();
      const st = s.stroke === undefined ? edge : s.stroke;
      if (st) { ctx.strokeStyle = st; ctx.lineWidth = s.lw || 0.7; ctx.stroke(); }
    };
    (shapes || []).forEach((s) => {
      if (!s || s.a === 0) return;
      ctx.globalAlpha = s.a == null ? 1 : Math.max(0, Math.min(1, s.a));
      switch (s.t) {
        case "rect": {
          if (s.w <= 0 || s.h <= 0) break;
          const x = X(s.x), y = Y(s.y + s.h), w = s.w * T.sx, h = s.h * T.sy, r = Math.min(s.r || 0, w / 2, h / 2);
          ctx.beginPath();
          if (r > 0.5 && ctx.roundRect) ctx.roundRect(x, y, w, h, r); else ctx.rect(x, y, w, h);
          fin(s); break;
        }
        case "circle":
          if (s.r <= 0) break;
          ctx.beginPath(); ctx.ellipse(X(s.x), Y(s.y), s.r * T.sx, s.r * T.sy, 0, 0, Math.PI * 2); fin(s); break;
        case "ball": {
          if (s.h <= 0 || s.w <= 0) break;
          const k = s.k == null ? 0.62 : s.k, cx = X(s.x), yb = Y(s.y), yt = Y(s.y + s.h), hw = (s.w / 2) * T.sx, hc = hw * k, ym = (yb + yt) / 2, b = (hw - hc) * 1.34 + hc;
          ctx.beginPath(); ctx.moveTo(cx - hc, yb);
          ctx.bezierCurveTo(cx - b, yb - (yb - ym) * 0.35, cx - b, yt + (ym - yt) * 0.35, cx - hc, yt);
          ctx.lineTo(cx + hc, yt);
          ctx.bezierCurveTo(cx + b, yt + (ym - yt) * 0.35, cx + b, yb - (yb - ym) * 0.35, cx + hc, yb);
          ctx.closePath(); fin(s); break;
        }
        case "poly":
          if (!s.pts || s.pts.length < 2) break;
          ctx.beginPath(); s.pts.forEach((p, i) => (i ? ctx.lineTo(X(p[0]), Y(p[1])) : ctx.moveTo(X(p[0]), Y(p[1])))); ctx.closePath(); fin(s); break;
        case "wire":
        case "line": {
          if (!s.pts || s.pts.length < 2) break;
          const pp = s.pts.map((p) => [X(p[0]), Y(p[1])]);
          ctx.beginPath();
          if (s.t === "wire" && s.smooth !== false) smoothPath(ctx, pp); else pp.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])));
          ctx.strokeStyle = s.color || (s.t === "wire" ? PKG.mat(s.m || "au") : P.dim);
          ctx.lineWidth = s.lw || (s.t === "wire" ? 2 : 1.2); ctx.setLineDash(s.dash || []); ctx.stroke(); ctx.setLineDash([]); break;
        }
        case "text":
          ctx.font = PB.font(s.size || 12, s.mono, s.bold ? 700 : 0); ctx.fillStyle = s.color || P.text;
          ctx.textAlign = s.align || "center"; ctx.textBaseline = s.base || "middle"; ctx.fillText(s.text, X(s.x), Y(s.y)); break;
        case "label": {
          const c = s.color || P.dim, x0 = X(s.x), y0 = Y(s.y), x1 = X(s.tx), y1 = Y(s.ty);
          ctx.strokeStyle = c; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
          ctx.fillStyle = c; ctx.beginPath(); ctx.arc(x0, y0, 2.2, 0, Math.PI * 2); ctx.fill();
          const al = s.align || (x1 >= x0 ? "left" : "right");
          ctx.font = PB.font(s.size || 12, false, s.bold ? 700 : 0); ctx.fillStyle = s.tcolor || P.text; ctx.textAlign = al; ctx.textBaseline = "middle";
          ctx.fillText(s.text, x1 + (al === "left" ? 4 : al === "right" ? -4 : 0), y1 + (al === "center" ? (y1 < y0 ? -9 : 9) : 0)); break;
        }
        case "dim":
        case "arrow": {
          const c = s.color || (s.t === "dim" ? P.dim : P.accent), x0 = X(s.x0), y0 = Y(s.y0), x1 = X(s.x1), y1 = Y(s.y1);
          ctx.strokeStyle = c; ctx.fillStyle = c; ctx.lineWidth = s.lw || (s.t === "dim" ? 1 : 1.8);
          ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
          arrowHead(ctx, x0, y0, x1, y1, s.t === "dim" ? 6 : 8);
          if (s.t === "dim") arrowHead(ctx, x1, y1, x0, y0, 6);
          if (s.text) {
            const vert = Math.abs(x1 - x0) < Math.abs(y1 - y0), off = s.off == null ? 6 : s.off;
            ctx.font = PB.font(s.size || 12, s.t === "dim"); ctx.fillStyle = s.tcolor || (s.t === "dim" ? P.text : c);
            if (vert) { ctx.textAlign = off >= 0 ? "left" : "right"; ctx.textBaseline = "middle"; ctx.fillText(s.text, (x0 + x1) / 2 + off, (y0 + y1) / 2); }
            else { ctx.textAlign = "center"; ctx.textBaseline = off >= 0 ? "bottom" : "top"; ctx.fillText(s.text, (x0 + x1) / 2, (y0 + y1) / 2 - off); }
          }
          break;
        }
      }
    });
    ctx.restore();
    return T;
  };

  /** 재질 범례 채우기: PKG.legend(el, ["si","cu","solder"]) (el은 .mat-legend) */
  PKG.legend = function (el, keys) {
    if (typeof el === "string") el = document.querySelector(el);
    el.innerHTML = keys.filter((k) => MATS[k]).map((k) => `<span><i style="background:${MATS[k].color}"></i>${MATS[k].name}</span>`).join("");
  };
  function usedMats(shapes, set) { (shapes || []).forEach((s) => { if (s && s.m && MATS[s.m] && s.a !== 0) set.add(s.m); }); }

  /**
   * 단계별 단면 위젯. el은 빈 <div class="sim" id="..."></div>.
   *   PKG.stepper(el, {
   *     title, tag("PROCESS FLOW"), view:{x0,x1,y0,y1,stretch}, aspect, minHeight, maxHeight, duration(ms),
   *     steps: [{ k:"도금", label:"구리 필러 도금", desc:"설명(HTML)", shapes: 배열 | (t) => 배열, view }],
   *     legend: ["si", ...](생략 시 자동), note:"해볼 것 …", overlay(ctx, T, k, t)
   *   }) → { goto(k), cur, redraw() }
   * shapes가 함수면 그 단계로 넘어올 때 t가 0→1로 움직인다(뒤로 갈 때는 t=1). 단계는 누적이 아니라
   * 각 단계가 그 시점의 전체 단면을 돌려준다. 공통 부분은 함수로 묶어 재사용한다.
   */
  PKG.stepper = function (el, o) {
    if (typeof el === "string") el = document.querySelector(el);
    const steps = o.steps, id = el.id || "stp" + Math.random().toString(36).slice(2, 7);
    el.classList.add("sim");
    el.innerHTML = `
      <div class="sim-head"><span class="sim-tag">${o.tag || "PROCESS FLOW"}</span><h3>${o.title || ""}</h3></div>
      <div class="sim-body side">
        <div class="sim-view"><canvas id="${id}-cv"></canvas></div>
        <div class="sim-controls">
          <div class="btn-row">
            <button class="btn sm" data-a="first">처음</button><button class="btn sm" data-a="prev">← 이전</button>
            <button class="btn sm primary" data-a="next">다음 →</button><button class="btn sm" data-a="play">재생</button>
          </div>
          <div class="step-desc"></div>
          <ol class="steps-list"></ol>
        </div>
      </div>
      <div class="mat-legend"></div>` + (o.note ? `<div class="sim-note">${o.note}</div>` : "");
    const desc = el.querySelector(".step-desc"), list = el.querySelector(".steps-list"), btn = (a) => el.querySelector(`[data-a="${a}"]`);
    list.innerHTML = steps.map((s) => `<li>${s.k ? `<span class="k">${s.k}</span>` : ""}<span class="d">${s.label}</span></li>`).join("");
    const items = [...list.children];
    let cur = 0, t = 1, raf = 0, playing = false, timer = 0;
    const get = (k, tt) => { const sh = steps[k].shapes; return typeof sh === "function" ? sh(tt) : sh; };
    if (o.legend !== false) {
      let keys = o.legend;
      if (!keys) { const set = new Set(); steps.forEach((s, k) => usedMats(get(k, 1), set)); keys = Object.keys(MATS).filter((k) => set.has(k) && k !== "tool"); }
      PKG.legend(el.querySelector(".mat-legend"), keys);
    } else el.querySelector(".mat-legend").remove();
    const cv = PB.canvas(el.querySelector("canvas"), (ctx, w, h) => {
      const pad = 14, box = { x: pad, y: pad, w: w - pad * 2, h: h - pad * 2 };
      const T = PKG.draw(ctx, get(cur, t), box, steps[cur].view || o.view);
      if (o.overlay) o.overlay(ctx, T, cur, t);
    }, { aspect: o.aspect || 0.6, minHeight: o.minHeight || 280, maxHeight: o.maxHeight || 460 });
    function ui() {
      items.forEach((li, i) => { li.classList.toggle("cur", i === cur); li.classList.toggle("future", i > cur); });
      desc.innerHTML = `<b>${cur + 1} / ${steps.length} · ${steps[cur].label}</b><br>${steps[cur].desc || ""}`;
      btn("prev").disabled = btn("first").disabled = cur === 0;
      btn("next").disabled = cur === steps.length - 1;
      btn("play").textContent = playing ? "정지" : "재생";
      const li = items[cur], top = li.offsetTop - list.offsetTop;
      if (top < list.scrollTop || top + li.offsetHeight > list.scrollTop + list.clientHeight) list.scrollTop = top - list.clientHeight / 2 + li.offsetHeight / 2;
    }
    function go(k, animate) {
      k = Math.max(0, Math.min(steps.length - 1, k));
      cancelAnimationFrame(raf); cur = k; ui();
      if (!animate || typeof steps[k].shapes !== "function") { t = 1; cv.redraw(); return; }
      const dur = steps[k].duration || o.duration || 900, t0 = performance.now();
      const frame = (now) => { t = Math.min(1, (now - t0) / dur); cv.redraw(); if (t < 1) raf = requestAnimationFrame(frame); };
      t = 0; raf = requestAnimationFrame(frame);
    }
    function stop() { playing = false; clearTimeout(timer); ui(); }
    function tick() {
      if (!playing) return;
      if (cur >= steps.length - 1) { stop(); return; }
      go(cur + 1, true);
      timer = setTimeout(tick, (steps[cur].duration || o.duration || 900) + 900);
    }
    btn("first").addEventListener("click", () => { stop(); go(0, false); });
    btn("prev").addEventListener("click", () => { stop(); go(cur - 1, false); });
    btn("next").addEventListener("click", () => { stop(); go(cur + 1, true); });
    btn("play").addEventListener("click", () => { if (playing) { stop(); return; } playing = true; if (cur >= steps.length - 1) go(0, false); ui(); timer = setTimeout(tick, 300); });
    items.forEach((li, i) => li.addEventListener("click", () => { stop(); go(i, i === cur + 1); }));
    go(o.start || 0, false);
    return { goto: (k) => go(k, false), get cur() { return cur; }, redraw: () => cv.redraw() };
  };
})();
