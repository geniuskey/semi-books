/* Copyright (c) 2026 geniuskey and SoCBook contributors.
   Executable code: MIT (see ../LICENSE-MIT).
   Educational content and illustrations: CC-BY-4.0 (see ../LICENSE.md). */
/* ==========================================================================
   SoCBook SoC 공통 라이브러리 — 전역 객체 SOC (common.js 다음에 로드)
   - SOC.TYPES   : IP 블록 종류(색·이름). 모든 장에서 같은 색 = 같은 뜻
   - SOC.FLOOR   : 이 책의 기준 칩 "SB-1"의 평면도(mm). 장마다 같은 칩을 다른 각도에서 본다
   - SOC.drawDie : 다이 평면도 그리기 (강조, 활동 열지도, 라벨)
   - SOC.die     : 마우스로 짚어 보는 다이 위젯
   - SOC.locator : 장 머리말의 "이 장은 칩의 어디인가" 미니 지도
   - SOC.wave    : 디지털 타이밍 파형 (clk·bit·bus)
   - SOC.pointer : 캔버스 위 끌기/짚기 (마우스·터치 공통, CSS px 좌표)
   - SOC.heat    : 0..1 → 열지도 색
   ========================================================================== */
(function () {
  "use strict";
  const SOC = (window.SOC = {});

  /* ------------------------------------------------------------ block types */
  SOC.TYPES = {
    big:    { label: "큰 CPU 코어",      en: "Big core",          css: "b-big" },
    little: { label: "작은 CPU 코어",    en: "Little core",       css: "b-little" },
    cpu:    { label: "CPU",              en: "CPU",               css: "b-cpu" },
    cache:  { label: "캐시 · SRAM",      en: "Cache",             css: "b-cache" },
    gpu:    { label: "GPU",              en: "GPU",               css: "b-gpu" },
    npu:    { label: "NPU",              en: "NPU",               css: "b-npu" },
    isp:    { label: "ISP",              en: "Image signal processor", css: "b-isp" },
    dsp:    { label: "DSP",              en: "DSP",               css: "b-dsp" },
    video:  { label: "비디오 · 디스플레이", en: "Video / Display",  css: "b-video" },
    modem:  { label: "모뎀",             en: "Modem",             css: "b-modem" },
    noc:    { label: "인터커넥트",       en: "Interconnect / NoC", css: "b-noc" },
    mem:    { label: "메모리 컨트롤러 · PHY", en: "Memory controller / PHY", css: "b-mem" },
    io:     { label: "I/O",              en: "I/O",               css: "b-io" },
    sec:    { label: "보안",             en: "Security",          css: "b-sec" },
    pmu:    { label: "전력 · 클럭 관리", en: "Power / Clock",     css: "b-pmu" },
  };
  /** 블록 종류 색 (CSS 변수에서 읽음) */
  SOC.color = (type) => getComputedStyle(document.documentElement).getPropertyValue("--" + (SOC.TYPES[type] ? SOC.TYPES[type].css : "b-noc")).trim() || "#888";

  /* ------------------------------------------------------------ reference die "SB-1" */
  /* 가상의 3 nm급 스마트폰 SoC. 크기·비율은 2023~2025년 공개 다이 사진 분석의 대략값을 참고한 교육용 모델. */
  SOC.DIE = { name: "SB-1", w: 11.0, h: 9.6, node: "3 nm급", transistors: 19e9 };
  SOC.FLOOR = [
    { id: "big0",  type: "big",    name: "프라임 코어",        x: 0.3, y: 0.3, w: 1.6, h: 1.6, ch: "ooo",       desc: "가장 크고 빠른 코어 하나. 넓은 디코더와 큰 ROB로 한 스레드를 최대한 빨리 돌린다. 최고 클럭 ~4 GHz." },
    { id: "big1",  type: "big",    name: "성능 코어 1",        x: 2.0, y: 0.3, w: 1.4, h: 1.6, ch: "ooo",       desc: "비순차 실행 코어. 프라임 코어보다 캐시가 작고 클럭이 조금 낮다." },
    { id: "big2",  type: "big",    name: "성능 코어 2",        x: 3.5, y: 0.3, w: 1.4, h: 1.6, ch: "ooo",       desc: "비순차 실행 코어. 앱 실행·웹 렌더링처럼 무거운 일을 나눠 맡는다." },
    { id: "lit0",  type: "little", name: "효율 코어 1",        x: 0.3, y: 2.0, w: 0.8, h: 0.8, ch: "cpu",       desc: "순차 실행 코어. 면적은 큰 코어의 1/4 남짓, 같은 일을 훨씬 적은 에너지로 한다." },
    { id: "lit1",  type: "little", name: "효율 코어 2",        x: 1.15, y: 2.0, w: 0.8, h: 0.8, ch: "cpu",      desc: "배경 동기화·알림·음악 재생 같은 가벼운 일을 맡는다." },
    { id: "lit2",  type: "little", name: "효율 코어 3",        x: 0.3, y: 2.85, w: 0.8, h: 0.8, ch: "cpu",      desc: "효율 코어. 화면이 꺼진 동안에도 깨어 있는 일이 많다." },
    { id: "lit3",  type: "little", name: "효율 코어 4",        x: 1.15, y: 2.85, w: 0.8, h: 0.8, ch: "cpu",     desc: "효율 코어. 네 개가 L2를 공유한다." },
    { id: "l3",    type: "cache",  name: "L3 캐시 (CPU 공유)", x: 2.0, y: 2.0, w: 2.9, h: 1.65, ch: "cache",    desc: "CPU 코어들이 함께 쓰는 수 MB의 SRAM. 같은 면적의 로직보다 트랜지스터가 빽빽하다." },
    { id: "gpu",   type: "gpu",    name: "GPU",                x: 5.1, y: 0.3, w: 3.4, h: 3.35, ch: "gpu",      desc: "셰이더 코어 수백~수천 개. 게임 그래픽과 일부 AI 연산을 맡는다. 다이에서 가장 큰 블록 중 하나." },
    { id: "modem", type: "modem",  name: "5G 모뎀",            x: 8.7, y: 0.3, w: 2.0, h: 3.35, ch: "overview", desc: "디지털 기저대역 처리. 무선 신호를 비트로 바꾼다. RF 송수신기는 별도 칩이다." },
    { id: "slc",   type: "cache",  name: "시스템 캐시 (SLC)",  x: 0.3, y: 3.85, w: 2.6, h: 2.05, ch: "cache",    desc: "CPU·GPU·NPU가 모두 공유하는 마지막 캐시. DRAM 접근을 줄여 전력을 아낀다." },
    { id: "noc",   type: "noc",    name: "NoC (온칩 네트워크)", x: 3.1, y: 3.85, w: 5.4, h: 0.65, ch: "noc",     desc: "블록 사이를 잇는 고속도로. 실제로는 칩 전체에 퍼져 있지만 여기서는 띠로 그렸다." },
    { id: "npu",   type: "npu",    name: "NPU",                x: 3.1, y: 4.7, w: 2.8, h: 2.6, ch: "npu",       desc: "곱셈-누산기(MAC) 수천 개를 배열로 엮은 AI 가속기. 와트당 연산이 CPU의 수십 배." },
    { id: "isp",   type: "isp",    name: "ISP (카메라)",        x: 6.1, y: 4.7, w: 2.4, h: 1.4, ch: "media",     desc: "이미지 센서의 원시 데이터를 사진으로. 노이즈 제거·디모자이크·색 보정을 고정 회로로 한다." },
    { id: "disp",  type: "video",  name: "디스플레이 엔진",     x: 6.1, y: 6.3, w: 2.4, h: 1.0, ch: "media",     desc: "여러 화면 층을 합성해 초당 120번 패널로 내보낸다." },
    { id: "dsp",   type: "dsp",    name: "DSP (오디오·센서)",   x: 8.7, y: 3.85, w: 2.0, h: 1.25, ch: "media",   desc: "신호 처리 전용 프로세서. '헤이 OO' 같은 항상 켜진 음성 감지를 아주 적은 전력으로." },
    { id: "video", type: "video",  name: "비디오 코덱",         x: 8.7, y: 5.3, w: 2.0, h: 1.2, ch: "media",     desc: "H.265·AV1 영상 인코딩·디코딩 전용 회로. 4K 영상 재생을 수백 mW로." },
    { id: "lsio",  type: "io",     name: "저속 주변장치",       x: 8.7, y: 6.7, w: 2.0, h: 0.6, ch: "io",        desc: "I²C·SPI·UART·GPIO. 센서·터치·충전 IC와 대화한다." },
    { id: "sec",   type: "sec",    name: "보안 엔클레이브",     x: 0.3, y: 6.1, w: 1.2, h: 1.2, ch: "security",  desc: "부트 ROM, 암호 엔진, 키 저장소. 지문·결제 정보가 여기서 나가지 않는다." },
    { id: "pmu",   type: "pmu",    name: "전력·클럭 관리",      x: 1.7, y: 6.1, w: 1.2, h: 1.2, ch: "power",     desc: "PLL과 클럭 분배, 전원 도메인 스위치, 온도 센서와 DVFS 제어." },
    { id: "mc",    type: "mem",    name: "메모리 컨트롤러",     x: 0.3, y: 7.5, w: 5.2, h: 0.8, ch: "dram",      desc: "요청을 모아 DRAM 명령(ACT·RD·WR·PRE)으로 바꾸고 순서를 정한다." },
    { id: "hsio",  type: "io",     name: "고속 I/O (UFS·PCIe·USB)", x: 5.7, y: 7.5, w: 5.0, h: 0.8, ch: "io",    desc: "저장장치·외부 장치와 수 Gb/s로 주고받는 SerDes 회로." },
    { id: "phy0",  type: "mem",    name: "LPDDR5X PHY 0",       x: 0.3, y: 8.5, w: 2.5, h: 0.8, ch: "dram",      desc: "DRAM 칩과 신호를 주고받는 아날로그 회로. 핀당 8.5 Gb/s 안팎." },
    { id: "phy1",  type: "mem",    name: "LPDDR5X PHY 1",       x: 3.0, y: 8.5, w: 2.5, h: 0.8, ch: "dram",      desc: "LPDDR 채널 하나를 맡는 PHY." },
    { id: "phy2",  type: "mem",    name: "LPDDR5X PHY 2",       x: 5.7, y: 8.5, w: 2.5, h: 0.8, ch: "dram",      desc: "LPDDR 채널 하나를 맡는 PHY." },
    { id: "phy3",  type: "mem",    name: "LPDDR5X PHY 3",       x: 8.4, y: 8.5, w: 2.3, h: 0.8, ch: "dram",      desc: "LPDDR 채널 하나를 맡는 PHY. 네 채널 × 16비트 = 64비트 폭." },
  ];
  SOC.FLOOR.forEach((b) => (b.area = b.w * b.h));
  SOC.dieArea = () => SOC.DIE.w * SOC.DIE.h;
  SOC.block = (id) => SOC.FLOOR.find((b) => b.id === id);
  /** 종류별 면적 합 (mm²) */
  SOC.areaByType = function (floor = SOC.FLOOR) {
    const out = {};
    floor.forEach((b) => (out[b.type] = (out[b.type] || 0) + b.w * b.h));
    return out;
  };

  /* ------------------------------------------------------------ colors */
  function hex2rgb(h) {
    h = h.trim();
    if (h.startsWith("rgb")) { const m = h.match(/[\d.]+/g); return [+m[0], +m[1], +m[2]]; }
    h = h.replace("#", ""); if (h.length === 3) h = h.split("").map((c) => c + c).join("");
    const n = parseInt(h, 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
  SOC.rgb = hex2rgb;
  SOC.mix = function (a, b, t) { const A = hex2rgb(a), B = hex2rgb(b); return `rgb(${A.map((v, i) => Math.round(v + (B[i] - v) * t)).join(",")})`; };
  SOC.alpha = function (c, a) { const A = hex2rgb(c); return `rgba(${A[0]},${A[1]},${A[2]},${a})`; };
  /** 0..1 → 열지도 색 (남색 → 청록 → 노랑 → 주황 → 빨강) */
  SOC.heat = function (t) {
    t = Math.max(0, Math.min(1, t));
    const st = [[0, [40, 52, 120]], [0.3, [32, 150, 170]], [0.55, [240, 200, 60]], [0.78, [240, 120, 40]], [1, [210, 40, 40]]];
    for (let i = 1; i < st.length; i++) if (t <= st[i][0]) {
      const [t0, c0] = st[i - 1], [t1, c1] = st[i], u = (t - t0) / (t1 - t0);
      return `rgb(${c0.map((v, k) => Math.round(v + (c1[k] - v) * u)).join(",")})`;
    }
    return "rgb(210,40,40)";
  };

  /* ------------------------------------------------------------ draw die */
  /**
   * 다이 평면도를 box 안에 맞춰 그린다.
   * opts: { floor, die:{w,h}, highlight:[type|id...], heat:{id:0..1}, hover:id, selected:id,
   *         labels:true|false|"auto", dimOthers:true, pad, grid:false, title }
   * 반환: { X(mm)->px, Y(mm)->px, s(px/mm), hit(px,py)->block|null, box }
   */
  SOC.drawDie = function (ctx, box, opts = {}) {
    const floor = opts.floor || SOC.FLOOR, die = opts.die || SOC.DIE;
    const pad = opts.pad != null ? opts.pad : 8;
    const s = Math.min((box.w - 2 * pad) / die.w, (box.h - 2 * pad) / die.h);
    const ox = box.x + (box.w - die.w * s) / 2, oy = box.y + (box.h - die.h * s) / 2;
    const X = (v) => ox + v * s, Y = (v) => oy + v * s;
    const hl = opts.highlight && opts.highlight.length ? new Set(opts.highlight) : null;
    const isHl = (b) => !hl || hl.has(b.type) || hl.has(b.id);
    ctx.save();
    // die substrate + seal ring
    ctx.fillStyle = SB.isDark() ? "#1a2030" : "#2a3142";
    roundRect(ctx, X(0), Y(0), die.w * s, die.h * s, Math.max(2, s * 0.15)); ctx.fill();
    ctx.strokeStyle = SB.isDark() ? "#3a4560" : "#6b7487"; ctx.lineWidth = Math.max(1, s * 0.06);
    roundRect(ctx, X(0.08), Y(0.08), (die.w - 0.16) * s, (die.h - 0.16) * s, Math.max(2, s * 0.1)); ctx.stroke();
    // bond pads along edge
    if (s > 18) {
      ctx.fillStyle = SB.isDark() ? "#55607a" : "#8a93a6";
      const n = Math.floor(die.w / 0.35);
      for (let i = 0; i < n; i++) { const px = X(0.25 + i * 0.35); ctx.fillRect(px, Y(0.02), s * 0.12, s * 0.05); ctx.fillRect(px, Y(die.h - 0.07), s * 0.12, s * 0.05); }
    }
    floor.forEach((b) => {
      const on = isHl(b);
      let col = SOC.color(b.type);
      if (opts.heat && opts.heat[b.id] != null) col = SOC.heat(opts.heat[b.id]);
      const x = X(b.x), y = Y(b.y), w = b.w * s, h = b.h * s;
      ctx.globalAlpha = on ? 1 : (opts.dimOthers === false ? 1 : 0.22);
      ctx.fillStyle = col;
      roundRect(ctx, x, y, w, h, Math.max(1.5, s * 0.06)); ctx.fill();
      // texture: SRAM arrays get fine grid, logic gets noise-like stripes
      if (s > 14 && on) {
        ctx.save(); roundRect(ctx, x, y, w, h, Math.max(1.5, s * 0.06)); ctx.clip();
        ctx.globalAlpha *= 0.18; ctx.strokeStyle = "#000"; ctx.lineWidth = 1;
        const step = b.type === "cache" ? Math.max(3, s * 0.12) : Math.max(5, s * 0.28);
        ctx.beginPath();
        if (b.type === "cache") { for (let gx = x; gx < x + w; gx += step) { ctx.moveTo(gx, y); ctx.lineTo(gx, y + h); } for (let gy = y; gy < y + h; gy += step) { ctx.moveTo(x, gy); ctx.lineTo(x + w, gy); } }
        else if (b.type === "gpu" || b.type === "npu") { const nx = Math.max(2, Math.round(b.w / 0.55)), ny = Math.max(2, Math.round(b.h / 0.55)); for (let i = 1; i < nx; i++) { ctx.moveTo(x + (w * i) / nx, y); ctx.lineTo(x + (w * i) / nx, y + h); } for (let j = 1; j < ny; j++) { ctx.moveTo(x, y + (h * j) / ny); ctx.lineTo(x + w, y + (h * j) / ny); } }
        else { for (let gy = y + step / 2; gy < y + h; gy += step) { ctx.moveTo(x, gy); ctx.lineTo(x + w, gy); } }
        ctx.stroke(); ctx.restore();
      }
      ctx.globalAlpha = 1;
      if (opts.selected === b.id || opts.hover === b.id) {
        ctx.strokeStyle = opts.selected === b.id ? "#fff" : "rgba(255,255,255,.75)"; ctx.lineWidth = opts.selected === b.id ? 2.5 : 1.6;
        roundRect(ctx, x + 1, y + 1, w - 2, h - 2, Math.max(1.5, s * 0.06)); ctx.stroke();
      }
    });
    // labels
    const lab = opts.labels == null ? "auto" : opts.labels;
    if (lab) {
      ctx.textAlign = "center"; ctx.textBaseline = "middle";
      floor.forEach((b) => {
        if (!isHl(b) && opts.dimOthers !== false) return;
        const w = b.w * s, h = b.h * s;
        const fs = Math.min(13, Math.max(8, s * 0.32));
        ctx.font = SB.font(fs, false, 700);
        const txt = opts.short ? (opts.short[b.id] || b.name) : b.name;
        const tw = ctx.measureText(txt).width;
        if (lab === "auto" && (tw > w - 4 || fs + 2 > h)) {
          // 짧은 이름 시도
          const short = txt.split(" ")[0];
          if (ctx.measureText(short).width > w - 4 || fs + 2 > h) return;
          drawLabel(short, b, fs); return;
        }
        drawLabel(txt, b, fs);
      });
    }
    function drawLabel(t, b, fs) {
      ctx.fillStyle = "rgba(255,255,255,0.95)";
      ctx.shadowColor = "rgba(0,0,0,.45)"; ctx.shadowBlur = 3;
      ctx.fillText(t, X(b.x + b.w / 2), Y(b.y + b.h / 2));
      ctx.shadowBlur = 0;
    }
    ctx.restore();
    const hit = (px, py) => {
      const mx = (px - ox) / s, my = (py - oy) / s;
      for (let i = floor.length - 1; i >= 0; i--) { const b = floor[i]; if (mx >= b.x && mx <= b.x + b.w && my >= b.y && my <= b.y + b.h) return b; }
      return null;
    };
    return { X, Y, s, hit, box, ox, oy };
  };

  function roundRect(ctx, x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
  }
  SOC.roundRect = roundRect;

  /* ------------------------------------------------------------ pointer helper */
  /**
   * 캔버스(또는 요소) 위 포인터 이벤트를 CSS px 좌표로. 터치 스크롤을 막지 않으려면 opts.drag만 켠다.
   *   SOC.pointer(canvas, { down(x,y,e), move(x,y,down,e), up(x,y,e), leave() }, { drag:true })
   * drag:true면 누른 채 움직이는 동안 페이지 스크롤을 막는다(touch-action:none).
   */
  SOC.pointer = function (el, h, opts = {}) {
    let isDown = false;
    if (opts.drag) el.style.touchAction = "none";
    const pos = (e) => { const r = el.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
    el.addEventListener("pointerdown", (e) => { isDown = true; try { el.setPointerCapture(e.pointerId); } catch (_) {} const [x, y] = pos(e); h.down && h.down(x, y, e); });
    el.addEventListener("pointermove", (e) => { const [x, y] = pos(e); h.move && h.move(x, y, isDown, e); });
    const end = (e) => { if (!isDown) return; isDown = false; const [x, y] = pos(e); h.up && h.up(x, y, e); };
    el.addEventListener("pointerup", end);
    el.addEventListener("pointercancel", end);
    el.addEventListener("pointerleave", () => { if (!isDown) h.leave && h.leave(); });
  };

  /* ------------------------------------------------------------ die widget */
  /**
   * 짚어 보는 다이. 마우스를 올리면 이름, 누르면 info 콜백.
   *   const D = SOC.die(canvasEl, { aspect:0.87, highlight, heat, onPick(b), onHover(b), labels, floor, overlay(ctx,g) });
   *   D.set({heat:{...}, highlight:[...], selected:id}); D.redraw();
   */
  SOC.die = function (canvas, opts = {}) {
    if (typeof canvas === "string") canvas = document.querySelector(canvas);
    const st = Object.assign({ hover: null, selected: null }, opts);
    let geo = null;
    const cv = SB.canvas(canvas, (ctx, w, h) => {
      geo = SOC.drawDie(ctx, { x: 0, y: 0, w, h }, st);
      if (st.overlay) st.overlay(ctx, geo, w, h);
      if (st.hover && st.tooltip !== false) {
        const b = SOC.block(st.hover) || (st.floor || []).find((q) => q.id === st.hover);
        if (b) tooltip(ctx, geo, b, w);
      }
    }, { aspect: opts.aspect || (SOC.DIE.h / SOC.DIE.w), minHeight: opts.minHeight || 220, maxHeight: opts.maxHeight || 560 });
    function tooltip(ctx, g, b, w) {
      const area = b.w * b.h, pct = (area / ((st.die || SOC.DIE).w * (st.die || SOC.DIE).h)) * 100;
      const l1 = b.name, l2 = `${area.toFixed(1)} mm² · 다이의 ${pct.toFixed(1)}%`;
      ctx.font = SB.font(13, false, 700); const w1 = ctx.measureText(l1).width;
      ctx.font = SB.font(11.5, true); const w2 = ctx.measureText(l2).width;
      const tw = Math.max(w1, w2) + 20, th = 44;
      let tx = g.X(b.x + b.w / 2) - tw / 2, ty = g.Y(b.y) - th - 6;
      if (ty < 2) ty = g.Y(b.y + b.h) + 6;
      tx = Math.max(4, Math.min(w - tw - 4, tx));
      ctx.fillStyle = SB.isDark() ? "rgba(18,24,38,.95)" : "rgba(255,255,255,.96)";
      ctx.strokeStyle = SB.color("border"); ctx.lineWidth = 1;
      roundRect(ctx, tx, ty, tw, th, 8); ctx.fill(); ctx.stroke();
      ctx.textAlign = "left"; ctx.textBaseline = "alphabetic";
      ctx.fillStyle = SB.color("text"); ctx.font = SB.font(13, false, 700); ctx.fillText(l1, tx + 10, ty + 18);
      ctx.fillStyle = SB.color("text-dim"); ctx.font = SB.font(11.5, true); ctx.fillText(l2, tx + 10, ty + 35);
    }
    SOC.pointer(canvas, {
      move(x, y) { const b = geo && geo.hit(x, y); const id = b ? b.id : null; if (id !== st.hover) { st.hover = id; canvas.style.cursor = b ? "pointer" : "default"; cv.redraw(); st.onHover && st.onHover(b); } },
      down(x, y) { const b = geo && geo.hit(x, y); st.selected = b ? b.id : null; cv.redraw(); st.onPick && st.onPick(b); },
      leave() { if (st.hover) { st.hover = null; cv.redraw(); st.onHover && st.onHover(null); } },
    });
    return {
      cv, get geo() { return geo; }, state: st,
      set(o) { Object.assign(st, o); cv.redraw(); },
      redraw: () => cv.redraw(),
    };
  };

  /* ------------------------------------------------------------ chapter locator */
  /**
   * 장 머리말 아래에 "이 장에서 다루는 블록"을 표시한 작은 다이 지도를 넣는다.
   *   <div class="soc-locator" data-blocks="gpu"></div>  (types 또는 id, 공백 구분)
   * common.js의 build() 이후 자동 실행.
   */
  SOC.locator = function (el) {
    const keys = (el.dataset.blocks || "").split(/\s+/).filter(Boolean);
    el.innerHTML = `<div class="loc-cv"><canvas></canvas></div><div class="loc-txt"><b>칩의 어디쯤?</b><span>${el.dataset.caption || "이 장에서 다루는 블록을 기준 칩 SB-1 위에 밝게 표시했다. 블록을 눌러 보자."}</span><span class="loc-pick"></span></div>`;
    const pick = el.querySelector(".loc-pick");
    SOC.die(el.querySelector("canvas"), {
      highlight: keys, labels: false, minHeight: 120, maxHeight: 190, pad: 4, tooltip: false,
      onHover(b) { pick.innerHTML = b ? `<b style="color:var(--text)">${b.name}</b> · ${(b.w * b.h).toFixed(1)} mm²` : ""; },
      onPick(b) { if (b && b.ch && b.ch !== document.body.dataset.chapter) location.href = b.ch + ".html"; },
    });
  };
  const locCss = document.createElement("style");
  locCss.textContent = `.soc-locator{display:grid;grid-template-columns:minmax(150px,220px) 1fr;gap:16px;align-items:center;margin:22px 0 0;padding:12px 16px 12px 12px;border:1px solid var(--border);border-radius:var(--radius);background:var(--bg-elev)}
.soc-locator .loc-cv{border-radius:8px;overflow:hidden;background:var(--canvas-bg)}.soc-locator canvas{display:block;width:100%}
.soc-locator .loc-txt{display:grid;gap:4px;font-size:14px;color:var(--text-dim);line-height:1.55}.soc-locator .loc-txt b{color:var(--text)}
.soc-locator .loc-pick{font-size:13px;min-height:1.4em}
@media (max-width:520px){.soc-locator{grid-template-columns:1fr}}`;
  document.head.appendChild(locCss);
  const initLoc = () => document.querySelectorAll(".soc-locator").forEach(SOC.locator);
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", () => setTimeout(initLoc, 0));
  else setTimeout(initLoc, 0);

  /* ------------------------------------------------------------ timing waveforms */
  /**
   * 디지털 타이밍 파형.
   *   SOC.wave(ctx, box, {
   *     cycles: 12,                 // 가로 칸 수 (클럭 주기)
   *     signals: [
   *       { name:"clk", type:"clk" },
   *       { name:"valid", type:"bit", v:[0,1,1,0,...], color },     // 칸마다 0/1 (null=X)
   *       { name:"data", type:"bus", v:["", "A", "A", "B", null], color }, // ""=유휴, null=X
   *     ],
   *     marks: [{c:3.5, color, label}],   // 세로선 (칸 단위)
   *     shade: [{c0:2, c1:4, color}],     // 구간 칠하기
   *     cursor: c,                         // 현재 칸 강조
   *     nameW: 70, skew: 0.12             // 이름 열 폭(px), 천이 기울기(칸 비율)
   *   })
   * 반환: { X(c)->px, rowY(i)->[top,bottom], colAt(px)->c }
   */
  SOC.wave = function (ctx, box, o) {
    const P = SB.palette();
    const n = o.signals.length, nameW = o.nameW != null ? o.nameW : 70;
    const rowH = box.h / n, cw = (box.w - nameW) / o.cycles, sk = Math.min(6, cw * (o.skew != null ? o.skew : 0.12));
    const X = (c) => box.x + nameW + c * cw;
    ctx.save();
    // shade + cursor
    (o.shade || []).forEach((s) => { ctx.fillStyle = s.color || SB.color("accent-soft"); ctx.fillRect(X(s.c0), box.y, (s.c1 - s.c0) * cw, box.h); });
    if (o.cursor != null) { ctx.fillStyle = SB.color("accent-soft"); ctx.fillRect(X(Math.floor(o.cursor)), box.y, cw, box.h); }
    // grid
    ctx.strokeStyle = P.grid; ctx.lineWidth = 1;
    for (let c = 0; c <= o.cycles; c++) { ctx.beginPath(); ctx.moveTo(X(c) + 0.5, box.y); ctx.lineTo(X(c) + 0.5, box.y + box.h); ctx.stroke(); }
    o.signals.forEach((sg, i) => {
      const top = box.y + i * rowH + rowH * 0.2, bot = box.y + (i + 1) * rowH - rowH * 0.2, mid = (top + bot) / 2;
      ctx.fillStyle = P.dim; ctx.font = SB.font(12, true); ctx.textAlign = "left"; ctx.textBaseline = "middle";
      ctx.fillText(sg.name, box.x + 2, mid);
      const col = sg.color || (sg.type === "clk" ? P.dim : P.accent2);
      ctx.strokeStyle = col; ctx.lineWidth = 1.8; ctx.lineJoin = "round";
      if (sg.type === "clk") {
        ctx.beginPath();
        for (let c = 0; c < o.cycles; c++) { const x0 = X(c), xm = X(c + 0.5), x1 = X(c + 1); ctx.moveTo(x0, bot); ctx.lineTo(x0 + 1, top); ctx.lineTo(xm, top); ctx.lineTo(xm + 1, bot); ctx.lineTo(x1, bot); }
        ctx.stroke();
      } else if (sg.type === "bit") {
        const v = sg.v; ctx.beginPath();
        let prev = v[0];
        for (let c = 0; c < o.cycles; c++) {
          const cur = v[c] == null ? null : v[c];
          if (cur == null) { hatch(ctx, X(c), top, cw, bot - top, P.bad); prev = null; continue; }
          const y = cur ? top : bot;
          if (c === 0 || prev == null) ctx.moveTo(X(c), y);
          else if (prev !== cur) { ctx.lineTo(X(c), prev ? top : bot); ctx.lineTo(X(c) + sk, y); }
          ctx.lineTo(X(c + 1), y);
          prev = cur;
        }
        ctx.stroke();
        if (sg.fill) { for (let c = 0; c < o.cycles; c++) if (v[c]) { ctx.fillStyle = SOC.alpha(col, 0.12); ctx.fillRect(X(c), top, cw, bot - top); } }
      } else if (sg.type === "bus") {
        const v = sg.v;
        let c = 0;
        while (c < o.cycles) {
          let e = c + 1; while (e < o.cycles && v[e] === v[c]) e++;
          const x0 = X(c), x1 = X(e), val = v[c];
          if (val == null) hatch(ctx, x0, top, x1 - x0, bot - top, P.bad);
          else if (val === "") { ctx.beginPath(); ctx.moveTo(x0 + sk / 2, mid); ctx.lineTo(x1 - sk / 2, mid); ctx.strokeStyle = P.faint; ctx.stroke(); ctx.strokeStyle = col; }
          else {
            ctx.beginPath(); ctx.moveTo(x0, mid); ctx.lineTo(x0 + sk, top); ctx.lineTo(x1 - sk, top); ctx.lineTo(x1, mid); ctx.lineTo(x1 - sk, bot); ctx.lineTo(x0 + sk, bot); ctx.closePath();
            ctx.fillStyle = SOC.alpha(col, 0.14); ctx.fill(); ctx.stroke();
            ctx.fillStyle = P.text; ctx.font = SB.font(11.5, true, 600); ctx.textAlign = "center";
            const label = String(val); if (ctx.measureText(label).width < x1 - x0 - 2 * sk) ctx.fillText(label, (x0 + x1) / 2, mid + 0.5);
          }
          c = e;
        }
      }
    });
    (o.marks || []).forEach((m) => {
      ctx.strokeStyle = m.color || P.accent; ctx.setLineDash(m.dash || [4, 3]); ctx.lineWidth = 1.4;
      ctx.beginPath(); ctx.moveTo(X(m.c), box.y); ctx.lineTo(X(m.c), box.y + box.h); ctx.stroke(); ctx.setLineDash([]);
      if (m.label) { ctx.fillStyle = m.color || P.accent; ctx.font = SB.font(11, false, 700); ctx.textAlign = "left"; ctx.textBaseline = "top"; ctx.fillText(m.label, X(m.c) + 3, box.y + 1); }
    });
    ctx.restore();
    return { X, cw, rowY: (i) => [box.y + i * rowH, box.y + (i + 1) * rowH], colAt: (px) => (px - box.x - nameW) / cw };
  };
  function hatch(ctx, x, y, w, h, col) {
    ctx.save(); ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
    ctx.strokeStyle = SOC.alpha(col, 0.55); ctx.lineWidth = 1;
    ctx.beginPath(); for (let k = -h; k < w; k += 5) { ctx.moveTo(x + k, y + h); ctx.lineTo(x + k + h, y); } ctx.stroke();
    ctx.restore();
  }
  SOC.hatch = hatch;

  /* ------------------------------------------------------------ small helpers */
  /** 화살표 */
  SOC.arrow = function (ctx, x0, y0, x1, y1, color, width = 1.6, head = 7) {
    const a = Math.atan2(y1 - y0, x1 - x0);
    ctx.save(); ctx.strokeStyle = color; ctx.fillStyle = color; ctx.lineWidth = width;
    ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1 - Math.cos(a) * head * 0.6, y1 - Math.sin(a) * head * 0.6); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x1 - head * Math.cos(a - 0.4), y1 - head * Math.sin(a - 0.4)); ctx.lineTo(x1 - head * Math.cos(a + 0.4), y1 - head * Math.sin(a + 0.4)); ctx.closePath(); ctx.fill();
    ctx.restore();
  };
  /** 둥근 상자 + 가운데 글자 */
  SOC.box = function (ctx, x, y, w, h, fill, text, opts = {}) {
    ctx.save();
    roundRect(ctx, x, y, w, h, opts.r != null ? opts.r : 6);
    if (fill) { ctx.fillStyle = fill; ctx.fill(); }
    if (opts.stroke) { ctx.strokeStyle = opts.stroke; ctx.lineWidth = opts.lw || 1.2; ctx.stroke(); }
    if (text != null) {
      ctx.fillStyle = opts.color || "#fff"; ctx.font = SB.font(opts.size || 12, opts.mono, opts.weight || 700);
      ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText(text, x + w / 2, y + h / 2 + 0.5);
    }
    ctx.restore();
  };
})();
