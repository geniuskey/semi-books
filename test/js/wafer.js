/* Copyright (c) 2026 geniuskey and TestBook contributors.
   Executable code: MIT (see ../LICENSE-MIT).
   Educational content and illustrations: CC-BY-4.0 (see ../LICENSE.md). */
/* ==========================================================================
   TestBook 웨이퍼 맵 엔진 — 전역 객체 WM (js/common.js 다음에 로드)
   모든 장이 같은 웨이퍼를 같은 방식으로 그리고 같은 무늬를 쓰도록 하는 공통 모델.
   - WM.wafer / WM.draw        : 다이 격자(샷 포함)와 맵 렌더
   - WM.PATTERNS / WM.map      : 공간 패턴을 섞어 불량 맵 생성
   - WM.defects / WM.drawDefects : 인라인 검사 결함 좌표(점) 맵
   - WM.stack, radial, angular, joins, shotStat, components, classify : 맵 통계
   - WM.Y                      : 수율 모델
   - WM.img                    : 검사 영상(명시야·암시야·SEM·전압 대비) 합성
   좌표: 웨이퍼 중심이 원점, x 오른쪽 +, y 위쪽 +, 단위 mm. 노치는 아래(−y).
   ========================================================================== */
(function () {
  "use strict";
  const WM = (window.WM = {});
  const TAU = Math.PI * 2;
  const mod = (a, n) => ((a % n) + n) % n;
  const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
  const gauss = (d, s) => Math.exp(-(d * d) / (2 * s * s));

  /* ------------------------------------------------------------ 다이 격자 */
  /**
   * 웨이퍼와 다이 격자.
   *   const W = WM.wafer({ diam: 300, dieW: 6.5, dieH: 8, edge: 3, shot: [4, 4], ox: 0, oy: 0 });
   * ox, oy: 격자 원점을 다이 크기의 몇 배만큼 옮길지(0이면 다이 모서리가 웨이퍼 중심, 0.5면 다이 중심이 웨이퍼 중심).
   * 네 꼭짓점이 모두 (반지름 − edge) 안에 드는 다이만 남긴다.
   * 반환: { diam, R, edge, dieW, dieH, area(cm²), shot:{cols,rows}, n, dies:[die], at(x,y)→k|-1, pt(x,y)→점 정보, k(i,j)→k|-1 }
   *   die = { k, i, j, x, y, r, th, sx, sy, fx, fy, fpos }
   *   i, j는 격자 번호(j는 위로 갈수록 커진다), x·y는 다이 중심(mm), r·th는 극좌표,
   *   sx·sy는 샷 번호, fx·fy는 샷 안에서의 자리(0부터), fpos = fy·cols + fx.
   */
  WM.wafer = function (o) {
    o = o || {};
    const diam = o.diam || 300, R = diam / 2, edge = o.edge == null ? 3 : o.edge;
    const dw = o.dieW || 10, dh = o.dieH || 10;
    const cols = (o.shot && o.shot[0]) || 1, rows = (o.shot && o.shot[1]) || 1;
    const ox = (o.ox || 0) * dw, oy = (o.oy || 0) * dh, Re = R - edge;
    const dies = [], idx = new Map();
    const loc = (x, y) => {
      const i = Math.floor((x - ox) / dw), j = Math.floor((y - oy) / dh);
      return { x, y, i, j, r: Math.hypot(x, y), th: Math.atan2(y, x), sx: Math.floor(i / cols), sy: Math.floor(j / rows), fx: mod(i, cols), fy: mod(j, rows), fpos: mod(j, rows) * cols + mod(i, cols) };
    };
    const ni = Math.ceil(R / dw) + 1, nj = Math.ceil(R / dh) + 1;
    for (let j = nj; j >= -nj; j--) for (let i = -ni; i <= ni; i++) {
      const x0 = i * dw + ox, y0 = j * dh + oy;
      if (Math.hypot(Math.max(Math.abs(x0), Math.abs(x0 + dw)), Math.max(Math.abs(y0), Math.abs(y0 + dh))) > Re) continue;
      const d = loc(x0 + dw / 2, y0 + dh / 2);
      d.k = dies.length; idx.set(i + "," + j, d.k); dies.push(d);
    }
    const k = (i, j) => { const v = idx.get(i + "," + j); return v == null ? -1 : v; };
    return {
      diam, R, edge, dieW: dw, dieH: dh, ox, oy, area: (dw * dh) / 100, shot: { cols, rows }, n: dies.length, dies, k,
      pt: loc,
      at(x, y) { return k(Math.floor((x - ox) / dw), Math.floor((y - oy) / dh)); },
    };
  };

  /** 웨이퍼당 다이 수 근사식: π(d/2 − e)²/A − π(d − 2e)/√(2A). 길이 mm */
  WM.gdw = function (diam, w, h, edge) {
    const d = diam - 2 * (edge || 0), A = w * h;
    return Math.max(0, (Math.PI * d * d) / (4 * A) - (Math.PI * d) / Math.sqrt(2 * A));
  };

  /* ------------------------------------------------------------ 수율 모델 */
  // 인자 l = A·D₀ (다이당 평균 치명 결함 수). 반환은 0~1
  WM.Y = {
    poisson: (l) => Math.exp(-l),
    murphy: (l) => (l < 1e-9 ? 1 : Math.pow((1 - Math.exp(-l)) / l, 2)),
    seeds: (l) => 1 / (1 + l),
    negbin: (l, a) => Math.pow(1 + l / a, -a),
    moore: (l) => Math.exp(-Math.sqrt(l)),
  };

  /* ------------------------------------------------------------ 색 */
  const parseCache = {};
  function rgb(c) {
    if (parseCache[c]) return parseCache[c];
    let v = [128, 128, 128];
    const s = String(c).trim();
    if (s[0] === "#") {
      const h = s.length === 4 ? s.slice(1).split("").map((x) => x + x).join("") : s.slice(1, 7);
      v = [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
    } else { const m = s.match(/[\d.]+/g); if (m && m.length >= 3) v = [+m[0], +m[1], +m[2]]; }
    return (parseCache[c] = v);
  }
  /** 두 CSS 색(#hex 또는 rgb())을 섞는다. t=0이면 a, 1이면 b */
  WM.mix = function (a, b, t) {
    const A = rgb(a), B = rgb(b); t = clamp(t, 0, 1);
    return "rgb(" + Math.round(A[0] + (B[0] - A[0]) * t) + "," + Math.round(A[1] + (B[1] - A[1]) * t) + "," + Math.round(A[2] + (B[2] - A[2]) * t) + ")";
  };
  /** 합격 다이 색(테마에 맞춘 옅은 녹색) */
  WM.passColor = function () { const P = TB.palette(); return WM.mix(P.ok, P.bg, 0.5); };
  /** 불량률 0~1 → 색(옅은 녹색 → 노랑 → 빨강). 스택 맵용 */
  WM.rate = function (t) {
    const P = TB.palette(); t = clamp(t, 0, 1);
    return t < 0.5 ? WM.mix(WM.passColor(), P.warn, t * 2) : WM.mix(P.warn, P.bad, t * 2 - 2 + 1);
  };

  // 빈 코드. 1이 합격. 색은 테마와 무관한 범주색
  WM.BINS = [
    null,
    { id: 1, name: "합격", en: "Pass", color: "#2da44e" },
    { id: 2, name: "연속성", en: "Open/short", color: "#e0574a" },
    { id: 3, name: "누설", en: "Leakage", color: "#d6a02a" },
    { id: 4, name: "기능·스캔", en: "Functional", color: "#7a5cd6" },
    { id: 5, name: "속도", en: "At-speed", color: "#2f8fe0" },
    { id: 6, name: "메모리", en: "Memory BIST", color: "#d6409f" },
    { id: 7, name: "파라메트릭", en: "Parametric", color: "#12a3a3" },
    { id: 8, name: "전원 단락", en: "Power short", color: "#8a5a2b" },
  ];
  WM.binColor = (id) => (id === 1 ? WM.passColor() : (WM.BINS[id] || WM.BINS[4]).color);
  const RANDOM_BINS = [[2, 0.15], [3, 0.15], [4, 0.4], [5, 0.1], [6, 0.15], [8, 0.05]];
  function pickBin(u) { let a = 0; for (const [b, w] of RANDOM_BINS) { a += w; if (u < a) return b; } return 4; }

  /* ------------------------------------------------------------ 공간 패턴 */
  /**
   * 무늬 도감. f(p, W, q, o) → 그 자리의 무늬 세기 0~1.
   *   p: 다이 또는 W.pt(x,y)가 돌려주는 점({x,y,r,th,sx,sy,fx,fy,fpos}), q: init()이 만든 웨이퍼별 난수 상태, o: 층 옵션
   * kind: "wafer"(장비가 남기는 무늬. 웨이퍼마다 같은 자리), "random"(웨이퍼마다 자리가 다르다), "shot"(노광 샷 기준)
   * 층 옵션(선택): edge{width, soft} center{sigma} donut{r0, width} half{angle(도), start} cluster{n, sigma}
   *   scratch{width} arc{width} repeater{pos} field{side: "r"|"l"|"t"|"b"} swirl{arms, twist} pins{r0, rot(도), sigma}
   */
  WM.PATTERNS = {
    edge: {
      name: "가장자리 고리", en: "Edge ring", kind: "wafer", cause: "식각·증착·세정의 반지름 방향 불균일, 가장자리 막 들뜸, EBR·베벨 문제",
      f: (p, W, q, o) => clamp((p.r - (W.R - (o.width || 22))) / (o.soft || 8), 0, 1),
    },
    center: {
      name: "중심", en: "Center", kind: "wafer", cause: "가스·플라즈마의 중심 편차, CMP 중심 과연마, 스핀 도포·현상의 중심 이상",
      f: (p, W, q, o) => gauss(p.r, o.sigma || 36),
    },
    donut: {
      name: "도넛", en: "Donut", kind: "wafer", cause: "척 온도 구역 경계, CMP 헤드 압력 구역, 회전 세정의 특정 반지름",
      f: (p, W, q, o) => gauss(p.r - (o.r0 || 95), o.width || 11),
    },
    half: {
      name: "한쪽 치우침", en: "Gradient", kind: "wafer", cause: "가스·약액이 한쪽에서 들어오는 장비, 웨이퍼 기울어짐, 온도 구배",
      f: (p, W, q, o) => { const a = ((o.angle == null ? 35 : o.angle) * Math.PI) / 180; return clamp(((p.x * Math.cos(a) + p.y * Math.sin(a)) / W.R - (o.start || 0)) / 0.55, 0, 1); },
    },
    swirl: {
      name: "소용돌이", en: "Swirl", kind: "wafer", cause: "스핀 도포·현상·세정의 약액 흐름, CMP 슬러리 분포",
      f: (p, W, q, o) => { const v = 0.5 + 0.5 * Math.cos(p.th * (o.arms || 3) - (p.r / W.R) * (o.twist || 5)); return Math.pow(v, 5) * clamp(p.r / (0.25 * W.R), 0, 1); },
    },
    pins: {
      name: "세 점", en: "Pin marks", kind: "wafer", cause: "리프트 핀·척 접촉점의 온도 차나 뒷면 오염(초점 불량)",
      f: (p, W, q, o) => {
        const r0 = o.r0 || 100, rot = ((o.rot == null ? 90 : o.rot) * Math.PI) / 180; let v = 0;
        for (let i = 0; i < 3; i++) { const a = rot + (i * TAU) / 3; v = Math.max(v, gauss(Math.hypot(p.x - r0 * Math.cos(a), p.y - r0 * Math.sin(a)), o.sigma || 9)); }
        return v;
      },
    },
    cluster: {
      name: "군집", en: "Cluster", kind: "random", cause: "파티클 낙하, 국소 오염, 액적·얼룩",
      init: (rnd, W, o) => { const b = []; for (let i = 0, n = o.n || 1 + Math.floor(rnd() * 2); i < n; i++) { const r = Math.sqrt(rnd()) * W.R * 0.8, a = rnd() * TAU; b.push([r * Math.cos(a), r * Math.sin(a), (o.sigma || 14) * (0.7 + rnd() * 0.7)]); } return b; },
      f: (p, W, q) => { let v = 0; for (const b of q) v = Math.max(v, gauss(Math.hypot(p.x - b[0], p.y - b[1]), b[2])); return v; },
    },
    scratch: {
      name: "스크래치", en: "Scratch", kind: "random", cause: "웨이퍼 반송·핸들링, CMP 패드의 굵은 입자",
      init: (rnd, W) => { const a = rnd() * Math.PI, r = Math.sqrt(rnd()) * W.R * 0.5, b = rnd() * TAU; return { x: r * Math.cos(b), y: r * Math.sin(b), dx: Math.cos(a), dy: Math.sin(a), len: W.R * (0.35 + rnd() * 0.45) }; },
      f: (p, W, q, o) => { const t = clamp((p.x - q.x) * q.dx + (p.y - q.y) * q.dy, -q.len, q.len); return Math.hypot(p.x - q.x - t * q.dx, p.y - q.y - t * q.dy) < (o.width || Math.max(W.dieW, W.dieH) * 0.55) ? 1 : 0; },
    },
    arc: {
      name: "호 스크래치", en: "Arc scratch", kind: "random", cause: "CMP 연마 궤적, 회전하는 브러시·암이 긁은 자국",
      init: (rnd, W) => { const a = rnd() * TAU, d = W.R * (0.7 + rnd() * 0.5); return { cx: d * Math.cos(a), cy: d * Math.sin(a), rr: W.R * (0.75 + rnd() * 0.45), a0: a + Math.PI - 0.5 - rnd() * 0.3, a1: a + Math.PI + 0.5 + rnd() * 0.3 }; },
      f: (p, W, q, o) => {
        const dx = p.x - q.cx, dy = p.y - q.cy;
        if (Math.abs(Math.hypot(dx, dy) - q.rr) > (o.width || Math.max(W.dieW, W.dieH) * 0.55)) return 0;
        const a = Math.atan2(dy, dx), mid = (q.a0 + q.a1) / 2, da = Math.abs(mod(a - mid + Math.PI, TAU) - Math.PI);
        return da < (q.a1 - q.a0) / 2 ? 1 : 0;
      },
    },
    repeater: {
      name: "반복 결함", en: "Repeater", kind: "shot", cause: "레티클(마스크)의 결함·오염, 펠리클 이물",
      init: (rnd, W, o) => ({ pos: o.pos == null ? Math.floor(rnd() * W.shot.cols * W.shot.rows) : o.pos }),
      f: (p, W, q) => (p.fpos === q.pos ? 1 : 0),
    },
    field: {
      name: "필드 한쪽", en: "Intra-field", kind: "shot", cause: "노광 필드 안의 초점·선폭 기울기, 렌즈 수차, 레티클 휨",
      f: (p, W, q, o) => { const s = o.side || "r"; return (s === "r" ? p.fx === W.shot.cols - 1 : s === "l" ? p.fx === 0 : s === "t" ? p.fy === W.shot.rows - 1 : p.fy === 0) ? 1 : 0; },
    },
    checker: {
      name: "체커보드", en: "Checkerboard", kind: "shot", cause: "스캐너의 스캔 방향(위·아래 교대)에 따른 차이",
      f: (p) => (mod(p.sx + p.sy, 2) === 0 ? 1 : 0),
    },
  };

  function prep(W, layers, rnd) {
    return (layers || []).map((L) => {
      const P = L.f ? { f: L.f } : WM.PATTERNS[L.p];
      if (!P) throw new Error("WM: 알 수 없는 패턴 " + L.p);
      return { L, P, q: P.init ? P.init(rnd, W, L) : null, s: L.s == null ? 0.8 : L.s };
    });
  }

  /**
   * 불량 맵을 만든다.
   *   const m = WM.map(W, { d0: 0.25, layers: [{ p: "donut", s: 0.5, bin: 4, r0: 105 }], seed: 3 });
   * d0: 무작위 치명 결함 밀도(개/cm²). 다이 불량 확률은 1 − exp(−A·d0). alpha를 주면 음이항 모델. base를 주면 d0 대신 그 확률을 직접 쓴다.
   * layers: [{ p: 패턴 키 | f: 사용자 함수, s: 세기(무늬 최대 지점의 불량 확률), bin: 빈 번호, …패턴 옵션 }]
   * 반환: { W, fail:Uint8Array, bin:Uint8Array(1=합격), cause:Int8Array(−1 합격, 0 무작위, n = n번째 층), p:Float32Array(무늬에 의한 불량 확률), n, fails, yield }
   */
  WM.map = function (W, o) {
    o = o || {};
    const rnd = TB.rng((o.seed || 1) * 7919 + 13), n = W.n;
    const fail = new Uint8Array(n), bin = new Uint8Array(n).fill(1), cause = new Int8Array(n).fill(-1), p = new Float32Array(n);
    const lam = (o.d0 || 0) * W.area;
    const pr = o.base != null ? o.base : o.alpha ? 1 - WM.Y.negbin(lam, o.alpha) : 1 - Math.exp(-lam);
    const Ls = prep(W, o.layers, rnd);
    let fails = 0;
    for (let k = 0; k < n; k++) {
      const d = W.dies[k]; let keep = 1;
      for (let a = 0; a < Ls.length; a++) {
        const pp = Ls[a].s * Ls[a].P.f(d, W, Ls[a].q, Ls[a].L);
        keep *= 1 - pp;
        if (!fail[k] && rnd() < pp) { fail[k] = 1; cause[k] = a + 1; bin[k] = Ls[a].L.bin || 4; }
      }
      p[k] = 1 - keep;
      const u = rnd(), v = rnd();
      if (!fail[k] && u < pr) { fail[k] = 1; cause[k] = 0; bin[k] = pickBin(v); }
      fails += fail[k];
    }
    return { W, fail, bin, cause, p, n, fails, yield: n ? 1 - fails / n : 0 };
  };

  /** 여러 장의 맵을 겹쳐 다이 자리마다 불량률(0~1)을 구한다 → Float32Array */
  WM.stack = function (maps) {
    const n = maps[0].n, out = new Float32Array(n);
    maps.forEach((m) => { for (let k = 0; k < n; k++) out[k] += m.fail[k]; });
    for (let k = 0; k < n; k++) out[k] /= maps.length;
    return out;
  };

  /* ------------------------------------------------------------ 맵 통계 */
  const val = (m) => (m.fail ? m.fail : m);   // 맵 또는 다이별 값 배열
  /** 반지름 구간별 불량률: [{r0, r1, rm, n, f, rate}] (f는 불량 수 또는 값의 합) */
  WM.radial = function (W, m, nb) {
    nb = nb || 10; const v = val(m), out = [];
    for (let b = 0; b < nb; b++) out.push({ r0: (b * W.R) / nb, r1: ((b + 1) * W.R) / nb, rm: ((b + 0.5) * W.R) / nb, n: 0, f: 0, rate: 0 });
    W.dies.forEach((d, k) => { const b = out[Math.min(nb - 1, Math.floor((d.r / W.R) * nb))]; b.n++; b.f += v[k]; });
    out.forEach((b) => (b.rate = b.n ? b.f / b.n : 0));
    return out;
  };
  /** 각도 구간별 불량률: [{a0, a1, am(도, 0=오른쪽·반시계), n, f, rate}]. rmin(mm)보다 바깥 다이만 센다 */
  WM.angular = function (W, m, nb, rmin) {
    nb = nb || 12; const v = val(m), out = [];
    for (let b = 0; b < nb; b++) out.push({ a0: (b * 360) / nb, a1: ((b + 1) * 360) / nb, am: ((b + 0.5) * 360) / nb, n: 0, f: 0, rate: 0 });
    W.dies.forEach((d, k) => { if (d.r < (rmin || 0)) return; const b = out[Math.min(nb - 1, Math.floor((mod(d.th, TAU) / TAU) * nb))]; b.n++; b.f += v[k]; });
    out.forEach((b) => (b.rate = b.n ? b.f / b.n : 0));
    return out;
  };
  /**
   * 이웃 쌍 통계(join count). 변을 맞댄 두 다이가 함께 불량인 쌍의 수를 무작위 배치의 기대값과 비교한다.
   * 반환: { joins(이웃 쌍 전체), ff(불량–불량 쌍), expected, sd, z, ratio(ff/expected) }
   */
  WM.joins = function (m) {
    const W = m.W, f = m.fail, n = m.n; let J = 0, ff = 0, S = 0, nB = 0;
    W.dies.forEach((d, k) => {
      nB += f[k];
      const r = W.k(d.i + 1, d.j), u = W.k(d.i, d.j + 1), l = W.k(d.i - 1, d.j), b = W.k(d.i, d.j - 1);
      const deg = (r >= 0) + (u >= 0) + (l >= 0) + (b >= 0);
      S += deg * (deg - 1);
      if (r >= 0) { J++; ff += f[k] & f[r]; }
      if (u >= 0) { J++; ff += f[k] & f[u]; }
    });
    const p2 = (nB * (nB - 1)) / (n * (n - 1)), p3 = (p2 * (nB - 2)) / (n - 2), p4 = (p3 * (nB - 3)) / (n - 3);
    const E = J * p2, V = Math.max(1e-9, J * p2 + S * p3 + (J * (J - 1) - S) * p4 - E * E), sd = Math.sqrt(V);
    return { joins: J, ff, expected: E, sd, z: (ff - E) / sd, ratio: E > 0 ? ff / E : 0 };
  };
  /**
   * 샷 안 자리별 불량률. 반환: { pos:[{fx, fy, n, f, rate, z}], best(가장 z가 큰 자리), cols, rows }
   * z는 그 자리의 불량률이 전체 평균에서 벗어난 정도(이항 근사).
   */
  WM.shotStat = function (m) {
    const W = m.W, c = W.shot.cols, r = W.shot.rows, pos = [];
    for (let fy = 0; fy < r; fy++) for (let fx = 0; fx < c; fx++) pos.push({ fx, fy, n: 0, f: 0, rate: 0, z: 0 });
    W.dies.forEach((d, k) => { pos[d.fpos].n++; pos[d.fpos].f += m.fail[k]; });
    const p0 = m.fails / m.n; let best = pos[0];
    pos.forEach((q) => { q.rate = q.n ? q.f / q.n : 0; q.z = q.n && p0 > 0 && p0 < 1 ? (q.rate - p0) / Math.sqrt((p0 * (1 - p0)) / q.n) : 0; if (q.z > best.z) best = q; });
    return { pos, best, cols: c, rows: r };
  };
  /**
   * 맞닿은(대각선 포함) 불량 다이 덩어리. 큰 것부터: [{ks:[k…], size, cx, cy, len, wid, elong, ang(도)}]
   * len·wid는 주축 방향 표준편차의 4배(mm), elong = len/wid.
   */
  WM.components = function (m) {
    const W = m.W, seen = new Uint8Array(m.n), out = [];
    for (let s = 0; s < m.n; s++) {
      if (!m.fail[s] || seen[s]) continue;
      const ks = [s]; seen[s] = 1;
      for (let h = 0; h < ks.length; h++) {
        const d = W.dies[ks[h]];
        for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) {
          const k = W.k(d.i + di, d.j + dj);
          if (k >= 0 && m.fail[k] && !seen[k]) { seen[k] = 1; ks.push(k); }
        }
      }
      let cx = 0, cy = 0; ks.forEach((k) => { cx += W.dies[k].x; cy += W.dies[k].y; }); cx /= ks.length; cy /= ks.length;
      let xx = W.dieW * W.dieW / 12, yy = W.dieH * W.dieH / 12, xy = 0;
      ks.forEach((k) => { const dx = W.dies[k].x - cx, dy = W.dies[k].y - cy; xx += (dx * dx) / ks.length; yy += (dy * dy) / ks.length; xy += (dx * dy) / ks.length; });
      const tr = xx + yy, det = xx * yy - xy * xy, dd = Math.sqrt(Math.max(0, (tr * tr) / 4 - det)), l1 = tr / 2 + dd, l2 = Math.max(1e-6, tr / 2 - dd);
      out.push({ ks, size: ks.length, cx, cy, len: 4 * Math.sqrt(l1), wid: 4 * Math.sqrt(l2), elong: Math.sqrt(l1 / l2), ang: (Math.atan2(l1 - xx, xy || 1e-9) * 180) / Math.PI });
    }
    return out.sort((a, b) => b.size - a.size);
  };
  /**
   * 국소 무늬 탐색. 길쭉한 띠(스크래치·호)와 둥근 창(군집)을 웨이퍼 전체에 미끄러뜨리며 불량이 가장 몰린 곳을 찾는다.
   * 반환: { line:{z, x, y, ang(도), n, f}, blob:{z, x, y, n, f} }
   *   z는 창 안의 불량 수가 전체 평균에서 벗어난 정도에서, 같은 모양 창 전체의 상위 10% 값을 뺀 것(넓게 퍼진 무늬는 상쇄된다).
   */
  WM.local = function (m) {
    const W = m.W, p0 = m.fails / m.n, dm = Math.max(W.dieW, W.dieH), R = W.R;
    // 분산 안정화(제곱근) 변환: 불량률이 낮을 때 z가 부풀지 않게 한다
    const zOf = (f, n) => (n >= 6 && p0 > 0 && p0 < 1 ? (2 * (Math.sqrt(f + 0.375) - Math.sqrt(n * p0 + 0.375))) / Math.sqrt(1 - p0) : 0);
    const scan = (cells, nu, nv, wu, wv, back) => {   // cells: [n, f] 격자. wu×wv 칸 창을 미끄러뜨린다
      const zs = []; let best = { z: 0 };
      for (let v = 0; v + wv <= nv; v++) for (let u = 0; u + wu <= nu; u++) {
        let nn = 0, ff = 0;
        for (let b = 0; b < wv; b++) for (let a = 0; a < wu; a++) { const c = cells[(v + b) * nu + u + a]; nn += c[0]; ff += c[1]; }
        const z = zOf(ff, nn);
        if (nn >= 6) zs.push(z);
        if (z > best.z) best = Object.assign({ z, n: nn, f: ff }, back(u + wu / 2, v + wv / 2));
      }
      zs.sort((a, b) => a - b);
      best.z = Math.max(0, best.z - Math.max(0, zs[Math.floor(zs.length * 0.9)] || 0));
      return best;
    };
    const grid = (nu, nv) => Array.from({ length: nu * nv }, () => [0, 0]);
    // 띠: 길이 5칸(100 mm) × 폭 2칸(다이 1개)
    const du = 20, dv = dm * 0.5, nu = Math.ceil((2 * R) / du), nv = Math.ceil((2 * R) / dv);
    let line = { z: 0 };
    for (let ang = 0; ang < 180; ang += 10) {
      const c = Math.cos((ang * Math.PI) / 180), s = Math.sin((ang * Math.PI) / 180), cells = grid(nu, nv);
      W.dies.forEach((d, k) => { const cell = cells[clamp(Math.floor((-d.x * s + d.y * c + R) / dv), 0, nv - 1) * nu + clamp(Math.floor((d.x * c + d.y * s + R) / du), 0, nu - 1)]; cell[0]++; cell[1] += m.fail[k]; });
      const b = scan(cells, nu, nv, 5, 2, (u, v) => { const a = u * du - R, t = v * dv - R; return { x: a * c - t * s, y: a * s + t * c, ang }; });
      if (b.z > line.z) line = b;
    }
    // 창: 한 변 4칸(약 36 mm)
    const dc = 9, nc = Math.ceil((2 * R) / dc), cells = grid(nc, nc);
    W.dies.forEach((d, k) => { const cell = cells[clamp(Math.floor((d.y + R) / dc), 0, nc - 1) * nc + clamp(Math.floor((d.x + R) / dc), 0, nc - 1)]; cell[0]++; cell[1] += m.fail[k]; });
    const blob = scan(cells, nc, nc, 4, 4, (u, v) => ({ x: u * dc - R, y: v * dc - R }));
    return { line, blob };
  };
  /**
   * 규칙 기반 패턴 분류. 반환: [{key, name, score}] 점수 큰 순(대략 3 이상이면 유의). 무늬가 없으면 첫 항목이 {key:"none"}.
   * 장비 무늬는 본보기 무늬와의 상관, 반복 결함은 샷 자리 통계, 스크래치(호 포함)·군집은 WM.local의 국소 탐색으로 판정한다.
   */
  WM.classify = function (m) {
    const W = m.W, n = m.n, p0 = m.fails / n, out = [];
    if (m.fails < 3 || p0 > 0.97) return [{ key: "none", name: "무늬 없음", score: 0 }];
    const sdF = Math.sqrt(p0 * (1 - p0));
    const corr = (key, o) => {
      const P = WM.PATTERNS[key]; let mt = 0, st = 0, c = 0; const t = new Float32Array(n);
      for (let k = 0; k < n; k++) { t[k] = P.f(W.dies[k], W, null, o || {}); mt += t[k]; } mt /= n;
      for (let k = 0; k < n; k++) { st += (t[k] - mt) * (t[k] - mt); c += (t[k] - mt) * (m.fail[k] - p0); }
      return st > 0 ? (c / Math.sqrt(st * n) / sdF) * Math.sqrt(n) : 0;   // 상관 계수 × √n ≈ z
    };
    out.push({ key: "edge", score: corr("edge") }, { key: "center", score: corr("center") });
    let dn = 0; for (let r0 = 50; r0 <= 120; r0 += 10) dn = Math.max(dn, corr("donut", { r0 })); out.push({ key: "donut", score: dn });
    let hf = 0; for (let a = 0; a < 360; a += 30) hf = Math.max(hf, corr("half", { angle: a })); out.push({ key: "half", score: hf * 0.9 });
    const ss = WM.shotStat(m);
    if (ss.pos.length > 1) out.push({ key: "repeater", score: ss.best.z * 0.8 });
    const loc = WM.local(m);
    out.push({ key: "scratch", score: 3 + (loc.line.z - 2.4) * 2.5 }, { key: "cluster", score: 3 + (loc.blob.z - 2.1) * 2.5 });
    out.sort((a, b) => b.score - a.score);
    out.forEach((r) => (r.name = WM.PATTERNS[r.key].name));
    if (out[0].score < 3) out.unshift({ key: "none", name: "무늬 없음", score: 0 });
    return out;
  };

  /* ------------------------------------------------------------ 맵 렌더 */
  /**
   * 웨이퍼 맵을 그린다. box = {x, y, w, h}(px).
   * opts: { map (불량 맵: 합격/불합격으로 칠한다), bins:true (빈 색으로), values:Float32Array (다이별 0~1 → WM.rate 색),
   *         fill:(die, k) => css색 | null (직접 지정. null이면 그리지 않는다), sel:k (굵은 테두리), hi:[k…] (강조 테두리),
   *         shots:true (샷 경계선), rings:[mm…] (점선 동심원), edgeLine:true (가장자리 제외 경계), notch:false, pad:px }
   * 반환: { cx, cy, s(px/mm), X(mm)→px, Y(mm)→px, at(px, py) → k|-1 }
   */
  WM.draw = function (ctx, W, box, o) {
    o = o || {};
    const P = TB.palette(), pad = o.pad == null ? 4 : o.pad;
    const s = (Math.min(box.w, box.h) - 2 * pad) / W.diam, cx = box.x + box.w / 2, cy = box.y + box.h / 2, Rp = W.R * s;
    const X = (x) => cx + x * s, Y = (y) => cy - y * s;
    const pass = WM.passColor(), m = o.map;
    const fill = o.fill || (o.values ? (d, k) => WM.rate(o.values[k]) : m ? (o.bins ? (d, k) => (m.fail[k] ? WM.binColor(m.bin[k]) : pass) : (d, k) => (m.fail[k] ? P.bad : pass)) : () => P.surface);
    const g = Math.min(0.8, Math.max(0.25, Math.min(W.dieW, W.dieH) * s * 0.07)), w = W.dieW * s, h = W.dieH * s;
    ctx.save();
    ctx.beginPath(); ctx.arc(cx, cy, Rp, 0, TAU); ctx.fillStyle = TB.color("surface-2"); ctx.fill();
    W.dies.forEach((d, k) => {
      const c = fill(d, k);
      if (!c) return;
      ctx.fillStyle = c;
      ctx.fillRect(X(d.x) - w / 2 + g, Y(d.y) - h / 2 + g, w - 2 * g, h - 2 * g);
    });
    if (o.shots) {
      ctx.save(); ctx.beginPath(); ctx.arc(cx, cy, Rp, 0, TAU); ctx.clip();
      ctx.strokeStyle = P.text; ctx.globalAlpha = 0.32; ctx.lineWidth = 1; ctx.beginPath();
      const sw = W.dieW * W.shot.cols, sh = W.dieH * W.shot.rows;
      for (let x = Math.floor(-W.R / sw) * sw + W.ox; x <= W.R; x += sw) { ctx.moveTo(Math.round(X(x)) + 0.5, cy - Rp); ctx.lineTo(Math.round(X(x)) + 0.5, cy + Rp); }
      for (let y = Math.floor(-W.R / sh) * sh + W.oy; y <= W.R; y += sh) { ctx.moveTo(cx - Rp, Math.round(Y(y)) + 0.5); ctx.lineTo(cx + Rp, Math.round(Y(y)) + 0.5); }
      ctx.stroke(); ctx.restore();
    }
    ctx.strokeStyle = P.axis; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.arc(cx, cy, Rp, 0, TAU); ctx.stroke();
    if (o.edgeLine) { ctx.setLineDash([4, 3]); ctx.strokeStyle = P.faint; ctx.beginPath(); ctx.arc(cx, cy, (W.R - W.edge) * s, 0, TAU); ctx.stroke(); ctx.setLineDash([]); }
    (o.rings || []).forEach((r) => { ctx.setLineDash([5, 4]); ctx.strokeStyle = P.accent; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.arc(cx, cy, r * s, 0, TAU); ctx.stroke(); ctx.setLineDash([]); });
    if (o.notch !== false) { ctx.fillStyle = P.bg; ctx.beginPath(); ctx.arc(cx, cy + Rp + 1, Math.max(3, Rp * 0.028), 0, TAU); ctx.fill(); }
    const outline = (k, color, lw) => { const d = W.dies[k]; if (!d) return; ctx.strokeStyle = color; ctx.lineWidth = lw; ctx.strokeRect(X(d.x) - w / 2, Y(d.y) - h / 2, w, h); };
    (o.hi || []).forEach((k) => outline(k, P.accent2, 1.6));
    if (o.sel != null && o.sel >= 0) outline(o.sel, P.text, 2.2);
    ctx.restore();
    return { cx, cy, s, X, Y, at: (px, py) => W.at((px - cx) / s, (cy - py) / s) };
  };

  /** 캔버스 클릭·이동 이벤트 좌표를 CSS px로: WM.pos(canvas, event) → [x, y] */
  WM.pos = function (canvas, e) {
    const r = canvas.getBoundingClientRect(), t = e.touches && e.touches[0] ? e.touches[0] : e;
    return [t.clientX - r.left, t.clientY - r.top];
  };

  /* ------------------------------------------------------------ 결함 좌표 맵 (인라인 검사) */
  // kill: 대표 치명률(그 결함이 걸친 다이가 불량이 될 확률의 대략값)
  WM.DTYPES = {
    particle: { name: "파티클", en: "Particle", color: "#e0574a", kill: 0.35 },
    scratch: { name: "스크래치", en: "Scratch", color: "#2f8fe0", kill: 0.6 },
    residue: { name: "잔류물", en: "Residue", color: "#d6a02a", kill: 0.25 },
    bridge: { name: "브리지", en: "Bridge", color: "#d6409f", kill: 0.9 },
    open: { name: "단선", en: "Open", color: "#7a5cd6", kill: 0.9 },
    missing: { name: "미개구 콘택", en: "Missing contact", color: "#12a3a3", kill: 0.95 },
    pit: { name: "피트·보이드", en: "Pit / void", color: "#8a5a2b", kill: 0.3 },
    nuisance: { name: "뉴슨스", en: "Nuisance", color: "#8a93a8", kill: 0 },
  };
  const TYPE_MIX = [["particle", 0.5], ["residue", 0.14], ["pit", 0.1], ["bridge", 0.1], ["open", 0.08], ["scratch", 0.08]];
  /**
   * 검사 장비가 내놓는 결함 좌표 목록.
   *   const D = WM.defects(W, { d0: 0.4, nuisance: 0.3, layers: [{ p: "donut", n: 120, type: "missing" }], seed: 2 });
   * d0: 무작위 결함 밀도(개/cm², 웨이퍼 전체 면적 기준), nuisance: 뉴슨스 밀도(개/cm²), layers[].n: 그 무늬가 더하는 결함 수(cluster 층의 덩어리 개수는 blobs).
   * 반환: [{ x, y(mm), r, k(다이 번호 | −1), type, size(µm), killer(boolean), src(0 무작위, n 층, −1 뉴슨스) }]
   *   scratch·arc 층은 선을 따라, repeater 층은 샷마다 같은 자리에 점을 놓는다(다이 안 자리는 ux, uy(0~1)로 고정할 수 있다. s는 인쇄 확률).
   */
  WM.defects = function (W, o) {
    o = o || {};
    const rnd = TB.rng((o.seed || 1) * 104729 + 5), out = [], Re = W.R - 1, areaCm2 = (Math.PI * Re * Re) / 100;
    const add = (x, y, type, src) => {
      if (Math.hypot(x, y) > Re) return;
      const T = WM.DTYPES[type], size = type === "nuisance" ? 0.05 + rnd() * 0.12 : 0.06 * Math.exp(rnd() * rnd() * 3.6);
      out.push({ x, y, r: Math.hypot(x, y), k: W.at(x, y), type, size, killer: rnd() < T.kill * clamp(0.5 + size, 0.5, 1.4), src });
    };
    const uni = () => { const r = Math.sqrt(rnd()) * Re, a = rnd() * TAU; return [r * Math.cos(a), r * Math.sin(a)]; };
    const mixType = () => { let u = rnd(), a = 0; for (const [t, w] of TYPE_MIX) { a += w; if (u < a) return t; } return "particle"; };
    // 시드가 같으면 개수도 같도록 시드 난수로 푸아송 개수를 뽑는다(정규 근사)
    const pois = (l) => (l <= 0 ? 0 : Math.max(0, Math.round(l + Math.sqrt(l) * Math.sqrt(-2 * Math.log(rnd() + 1e-12)) * Math.cos(TAU * rnd()))));
    for (let i = 0, n = pois((o.d0 || 0) * areaCm2); i < n; i++) { const p = uni(); add(p[0], p[1], mixType(), 0); }
    for (let i = 0, n = pois((o.nuisance || 0) * areaCm2); i < n; i++) { const p = uni(); add(p[0], p[1], "nuisance", -1); }
    // 층의 n은 여기서 결함 수다. 군집 개수는 blobs로 받는다(패턴의 n 옵션과 겹치지 않게)
    prep(W, (o.layers || []).map((L) => Object.assign({}, L, { n: L.blobs })), rnd).forEach((A, ai) => {
      const L = A.L, n = o.layers[ai].n == null ? 60 : o.layers[ai].n, src = ai + 1, jit = () => (rnd() - 0.5) * 2;
      if (L.p === "scratch") { for (let i = 0; i < n; i++) { const t = (rnd() * 2 - 1) * A.q.len; add(A.q.x + t * A.q.dx + jit() * 0.8, A.q.y + t * A.q.dy + jit() * 0.8, L.type || "scratch", src); } return; }
      if (L.p === "arc") { for (let i = 0; i < n; i++) { const a = A.q.a0 + rnd() * (A.q.a1 - A.q.a0); add(A.q.cx + A.q.rr * Math.cos(a) + jit() * 0.8, A.q.cy + A.q.rr * Math.sin(a) + jit() * 0.8, L.type || "scratch", src); } return; }
      if (L.p === "repeater") {
        const sw = W.dieW * W.shot.cols, sh = W.dieH * W.shot.rows, fx = A.q.pos % W.shot.cols, fy = Math.floor(A.q.pos / W.shot.cols);
        const r1 = rnd(), r2 = rnd(), ux = (fx + (L.ux == null ? 0.2 + r1 * 0.6 : L.ux)) * W.dieW, uy = (fy + (L.uy == null ? 0.2 + r2 * 0.6 : L.uy)) * W.dieH, hit = L.s == null ? 1 : L.s;
        for (let x = Math.floor(-W.R / sw) * sw + W.ox; x < W.R; x += sw) for (let y = Math.floor(-W.R / sh) * sh + W.oy; y < W.R; y += sh) if (rnd() < hit) add(x + ux + jit() * 0.05, y + uy + jit() * 0.05, L.type || "bridge", src);
        return;
      }
      for (let i = 0, guard = 0; i < n && guard < n * 400; guard++) {
        const p = uni();
        if (rnd() < A.P.f(W.pt(p[0], p[1]), W, A.q, L)) { add(p[0], p[1], L.type || "particle", src); i++; }
      }
    });
    return out;
  };
  /**
   * 결함 점을 맵 위에 찍는다. view는 WM.draw의 반환값.
   * opts: { color:(d) => css색 (기본은 결함 종류 색), r:px, alpha }
   */
  WM.drawDefects = function (ctx, view, defects, o) {
    o = o || {};
    const r = o.r || 1.8, col = o.color || ((d) => WM.DTYPES[d.type].color);
    ctx.save(); ctx.globalAlpha = o.alpha == null ? 0.9 : o.alpha;
    defects.forEach((d) => { const c = col(d); if (!c) return; ctx.fillStyle = c; ctx.beginPath(); ctx.arc(view.X(d.x), view.Y(d.y), r, 0, TAU); ctx.fill(); });
    ctx.restore();
  };

  /* ------------------------------------------------------------ 검사 영상 합성 */
  /* 영상은 n×n Float32Array(0~1, 행 우선·위에서 아래). 한 화소는 대략 수십 nm라고 본다.
     장면(scene)은 패턴의 반사율 m, 산란 세기 scat, 높이 z, 전압 대비 vc 네 장으로 이루어진다. */
  const I = (WM.img = {});
  I.DEFECTS = {
    particle: { name: "파티클", en: "Particle" }, bridge: { name: "브리지", en: "Bridge" }, open: { name: "단선", en: "Open" },
    scratch: { name: "스크래치", en: "Scratch" }, residue: { name: "잔류물", en: "Residue" }, pit: { name: "피트", en: "Pit" },
    missing: { name: "미개구 콘택", en: "Missing contact" }, vcopen: { name: "전기적 단선 콘택", en: "Open contact (VC)" },
  };
  /**
   * 패턴 장면을 만든다.
   *   const S = WM.img.scene({ type: "lines", pitch: 16, n: 128, seed: 1, layout: 1, ler: 0.4, color: 0.02 });
   * type: "lines"(세로 선), "contacts"(콘택 배열), "logic"(비주기 배선), "blank"(무패턴 막)
   * seed: 다이마다 달라지는 것(선 가장자리 거칠기 ler, 막 두께 색 변화 color). layout: 설계(같은 제품이면 같다).
   * 반환: { n, type, pitch, m, base(결함 없는 m), scat, z, vc, defects:[] }
   */
  I.scene = function (o) {
    o = o || {};
    const n = o.n || 128, type = o.type || "lines", pitch = o.pitch || 16, N = n * n;
    const rnd = TB.rng((o.seed || 1) * 9973 + 7), lay = TB.rng((o.layout || 1) * 31337 + 3);
    const ler = o.ler == null ? 0.4 : o.ler, color = o.color == null ? 0.02 : o.color, hi = 0.8, lo = 0.3;
    const m = new Float32Array(N), vc = new Float32Array(N);
    const cov = (a, b, x) => clamp(Math.min(x + 1, b) - Math.max(x, a), 0, 1);
    if (type === "blank") m.fill(0.6);
    else if (type === "lines") {
      for (let l = -1; l * pitch < n; l++) {
        let eL = 0, eR = 0;
        for (let y = 0; y < n; y++) {
          eL = eL * 0.85 + (rnd() - 0.5) * ler; eR = eR * 0.85 + (rnd() - 0.5) * ler;
          const a = l * pitch + pitch * 0.25 + eL, b = a + pitch * 0.5 + eR - eL;
          for (let x = Math.max(0, Math.floor(a)); x < Math.min(n, Math.ceil(b)); x++) m[y * n + x] = cov(a, b, x);
        }
      }
      for (let i = 0; i < N; i++) m[i] = lo + (hi - lo) * m[i];
    } else if (type === "contacts") {
      m.fill(0.62);
      const rr = pitch * 0.27;
      for (let cy = pitch / 2; cy < n; cy += pitch) for (let cx = pitch / 2; cx < n; cx += pitch) {
        const r = rr + (rnd() - 0.5) * ler;
        for (let y = Math.max(0, Math.floor(cy - r - 1)); y <= Math.min(n - 1, cy + r + 1); y++) for (let x = Math.max(0, Math.floor(cx - r - 1)); x <= Math.min(n - 1, cx + r + 1); x++) {
          const c = clamp(r - Math.hypot(x + 0.5 - cx, y + 0.5 - cy) + 0.5, 0, 1);
          if (c > 0) { m[y * n + x] = 0.62 - 0.42 * c; vc[y * n + x] = c; }
        }
      }
    } else {
      const w = pitch * 0.5;
      for (let t = 0; t * pitch < n; t++) {
        const horiz = t % 3 !== 2; let a = lay() * pitch;
        while (a < n) {
          const b = a + pitch * (1 + lay() * 4), c = t * pitch + pitch * 0.25, e = (rnd() - 0.5) * ler;
          if (lay() < 0.8) for (let u = Math.max(0, Math.floor(a)); u < Math.min(n, b); u++) for (let v = Math.max(0, Math.floor(c + e)); v < Math.min(n, Math.ceil(c + w + e)); v++) {
            const i = horiz ? v * n + u : u * n + v; m[i] = Math.max(m[i], cov(c + e, c + w + e, v));
          }
          a = b + pitch * (0.6 + lay() * 1.2);
        }
      }
      for (let i = 0; i < N; i++) m[i] = lo + (hi - lo) * m[i];
    }
    const ca = (rnd() - 0.5) * 2 * color, cb = (rnd() - 0.5) * 2 * color, cc = (rnd() - 0.5) * color, ph = rnd() * TAU;
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) m[y * n + x] += cc + ca * (x / n - 0.5) + cb * (y / n - 0.5) + color * 0.5 * Math.sin((x + y) / n * 4 + ph);
    return { n, type, pitch, m, base: Float32Array.from(m), scat: new Float32Array(N), z: new Float32Array(N), vc, defects: [], hi, lo };
  };
  /**
   * 장면에 결함을 심은 복사본을 돌려준다(원본은 그대로).
   *   const S2 = WM.img.defect(S, { type: "bridge", x: 0.5, y: 0.5, size: 6, ang: 0.6, seed: 1 });
   * type: particle | bridge | open | scratch | residue | pit | missing | vcopen. x, y는 0~1, size는 화소.
   * bridge·open은 가장 가까운 선 사이·선 위로, missing·vcopen은 가장 가까운 콘택으로 자리를 맞춘다.
   * vcopen은 겉모양이 정상이라 광학·SEM 형상 영상에서는 보이지 않고 vc 모드에서만 어둡게 보인다.
   */
  I.defect = function (S, d) {
    const n = S.n, p = S.pitch, rnd = TB.rng((d.seed || 1) * 613 + 11);
    const T = { n, type: S.type, pitch: p, hi: S.hi, lo: S.lo, base: S.base, m: Float32Array.from(S.m), scat: Float32Array.from(S.scat), z: Float32Array.from(S.z), vc: Float32Array.from(S.vc), defects: S.defects.slice() };
    let cx = d.x * n, cy = d.y * n; const size = d.size || 6;
    const disk = (x0, y0, r, fn) => { for (let y = Math.max(0, Math.floor(y0 - r - 1)); y <= Math.min(n - 1, y0 + r + 1); y++) for (let x = Math.max(0, Math.floor(x0 - r - 1)); x <= Math.min(n - 1, x0 + r + 1); x++) { const c = clamp(r - Math.hypot(x + 0.5 - x0, y + 0.5 - y0) + 0.5, 0, 1); if (c > 0) fn(y * n + x, c); } };
    const sc = Math.min(1.6, 0.3 * Math.pow(size / 4, 3));
    if (d.type === "bridge" || d.type === "open") {
      const to = d.type === "bridge" ? S.hi : S.lo;
      if (S.type === "lines") {
        cx = (Math.round(cx / p - (d.type === "bridge" ? 0 : 0.5)) + (d.type === "bridge" ? 0 : 0.5)) * p;
        const h = Math.max(2, size * 0.6), x0 = Math.floor(cx - p * 0.3), x1 = Math.ceil(cx + p * 0.3);
        for (let y = Math.max(0, Math.round(cy - h / 2)); y < Math.min(n, cy + h / 2); y++) for (let x = Math.max(0, x0); x < Math.min(n, x1); x++) T.m[y * n + x] = to;
      } else {
        if (d.type === "open") {   // 가장 가까운 배선 위로 옮긴다
          const mid = (S.hi + S.lo) / 2; let bd = 1e9, bx = cx, by = cy;
          for (let y = Math.max(0, Math.floor(cy - p)); y < Math.min(n, cy + p); y++) for (let x = Math.max(0, Math.floor(cx - p)); x < Math.min(n, cx + p); x++) {
            const dd = Math.hypot(x - cx, y - cy); if (S.base[y * n + x] > mid && dd < bd) { bd = dd; bx = x; by = y; }
          }
          cx = bx; cy = by;
        }
        disk(cx, cy, Math.max(p * 0.36, size / 2), (i, c) => (T.m[i] = T.m[i] * (1 - c) + to * c));
      }
    } else if (d.type === "missing" || d.type === "vcopen") {
      cx = (Math.floor(cx / p) + 0.5) * p; cy = (Math.floor(cy / p) + 0.5) * p;
      disk(cx, cy, p * 0.34, d.type === "missing" ? (i) => { T.m[i] = 0.62; T.vc[i] = 0; } : (i) => { T.vc[i] *= 0.12; });
    } else if (d.type === "particle") {
      disk(cx, cy, size / 2, (i, c) => { T.m[i] = T.m[i] * (1 - c) + 0.12 * c; T.scat[i] = Math.max(T.scat[i], sc * c); T.z[i] += c; });
    } else if (d.type === "pit") {
      disk(cx, cy, size / 2, (i, c) => { T.m[i] = T.m[i] * (1 - c) + 0.15 * c; T.scat[i] = Math.max(T.scat[i], sc * 0.3 * c); T.z[i] -= c; });
    } else if (d.type === "residue") {
      for (let b = 0; b < 4; b++) { const bx = cx + (rnd() - 0.5) * size, by = cy + (rnd() - 0.5) * size, r = size * (0.35 + rnd() * 0.35); disk(bx, by, r, (i, c) => { T.m[i] += 0.1 * c; T.scat[i] = Math.max(T.scat[i], sc * 0.25 * c); T.z[i] += 0.3 * c; }); }
    } else if (d.type === "scratch") {
      const a = d.ang == null ? 0.7 : d.ang, len = size * 5, wd = Math.max(0.8, size / 6);
      for (let t = -len; t <= len; t += 0.5) disk(cx + t * Math.cos(a), cy + t * Math.sin(a), wd, (i, c) => { T.m[i] = T.m[i] * (1 - 0.6 * c) + 0.45 * 0.6 * c; T.scat[i] = Math.max(T.scat[i], Math.min(1.2, 0.5 + sc) * c); T.z[i] = Math.min(T.z[i], -0.6 * c); });
    }
    T.defects.push({ type: d.type, x: cx / n, y: cy / n, size });
    return T;
  };
  /** 가우시안 블러(분리형). sigma 화소 */
  I.blur = function (a, n, sigma) {
    if (!(sigma > 0.05)) return Float32Array.from(a);
    const rad = Math.max(1, Math.ceil(sigma * 2.6)), ker = []; let sum = 0;
    for (let i = -rad; i <= rad; i++) { const v = gauss(i, sigma); ker.push(v); sum += v; }
    const tmp = new Float32Array(a.length), out = new Float32Array(a.length);
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) { let s = 0; for (let i = -rad; i <= rad; i++) s += a[y * n + clamp(x + i, 0, n - 1)] * ker[i + rad]; tmp[y * n + x] = s / sum; }
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) { let s = 0; for (let i = -rad; i <= rad; i++) s += tmp[clamp(y + i, 0, n - 1) * n + x] * ker[i + rad]; out[y * n + x] = s / sum; }
    return out;
  };
  function grad(a, n) {
    const gx = new Float32Array(a.length), gy = new Float32Array(a.length);
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
      gx[y * n + x] = (a[y * n + Math.min(n - 1, x + 1)] - a[y * n + Math.max(0, x - 1)]) / 2;
      gy[y * n + x] = (a[Math.min(n - 1, y + 1) * n + x] - a[Math.max(0, y - 1) * n + x]) / 2;
    }
    return [gx, gy];
  }
  /**
   * 장면을 검사 영상으로 바꾼다 → Float32Array(0~1).
   *   const img = WM.img.render(S, { mode: "bf", res: 1.5, noise: 0.02, seed: 1 });
   * mode: "bf"(명시야: 반사율을 본다), "df"(암시야: 가장자리와 결함의 산란광만 본다),
   *       "sem"(이차 전자: 가장자리가 밝고 분해능이 높다), "vc"(전압 대비: 접지된 콘택은 밝고 끊긴 콘택은 어둡다)
   * res: 광학 번짐(화소, 클수록 흐리다. 기본 bf 1.6 · df 1.8 · sem 0.5 · vc 0.7), noise: 잡음 표준편차, gain: 밝기 배율,
   * filter: 0~1 (df 전용. 주기 패턴의 회절광을 걸러 내는 공간 필터. logic 장면은 비주기라 잘 걸러지지 않는다)
   */
  I.render = function (S, o) {
    o = o || {};
    const n = S.n, N = n * n, mode = o.mode || "bf", rnd = TB.rng((o.seed || 1) * 4099 + 1), gain = o.gain == null ? 1 : o.gain;
    const out = new Float32Array(N);
    let noise = o.noise;
    if (mode === "bf") {
      const g = I.blur(S.m, n, o.res == null ? 1.6 : o.res), sb = I.blur(S.scat, n, o.res == null ? 1.6 : o.res);
      for (let i = 0; i < N; i++) out[i] = (g[i] - 0.25 * Math.min(1, sb[i])) * gain;
      if (noise == null) noise = 0.015;
    } else if (mode === "df") {
      const res = o.res == null ? 1.8 : o.res, f = clamp(o.filter || 0, 0, 1) * (S.type === "logic" ? 0.35 : 1);
      const [ax, ay] = grad(I.blur(S.m, n, res), n), [bx, by] = grad(I.blur(S.base, n, res), n), sb = I.blur(S.scat, n, res);
      for (let i = 0; i < N; i++) out[i] = (0.02 + Math.hypot(bx[i], by[i]) * 3.2 * (1 - f) + Math.hypot(ax[i] - bx[i], ay[i] - by[i]) * 3.2 + sb[i]) * gain;
      if (noise == null) noise = 0.012;
    } else if (mode === "sem") {
      const res = o.res == null ? 0.5 : o.res, g = I.blur(S.m, n, res), [gx, gy] = grad(g, n), [zx] = grad(I.blur(S.z, n, res + 0.4), n);
      for (let i = 0; i < N; i++) out[i] = (0.16 + 0.48 * g[i] + 1.5 * Math.hypot(gx[i], gy[i]) - 0.9 * zx[i]) * gain;
      if (noise == null) noise = 0.05;
    } else {
      const res = o.res == null ? 0.7 : o.res, g = I.blur(S.m, n, res), v = I.blur(S.vc, n, res);
      for (let i = 0; i < N; i++) out[i] = (0.1 + 0.16 * g[i] + 0.74 * v[i]) * gain;
      if (noise == null) noise = 0.04;
    }
    if (noise > 0) for (let i = 0; i < N; i++) out[i] += noise * Math.sqrt(-2 * Math.log(rnd() + 1e-9)) * Math.cos(TAU * rnd());
    for (let i = 0; i < N; i++) out[i] = clamp(out[i], 0, 1);
    return out;
  };
  /** 두 영상의 화소별 차의 절댓값. 다이 대 다이 비교의 핵심 */
  I.diff = function (a, b) { const o = new Float32Array(a.length); for (let i = 0; i < a.length; i++) o[i] = Math.abs(a[i] - b[i]); return o; };
  /**
   * 문턱값을 넘는 화소 덩어리를 찾는다. 반환: [{x, y(0~1 중심), area(화소 수), max}] 큰 것부터
   * minArea보다 작은 덩어리는 버린다(기본 1).
   */
  I.detect = function (d, n, thr, minArea) {
    const seen = new Uint8Array(d.length), out = [];
    for (let s = 0; s < d.length; s++) {
      if (seen[s] || d[s] < thr) continue;
      const st = [s]; seen[s] = 1; let sx = 0, sy = 0, mx = 0;
      for (let h = 0; h < st.length; h++) {
        const i = st[h], x = i % n, y = (i - x) / n; sx += x; sy += y; if (d[i] > mx) mx = d[i];
        for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
          const xx = x + dx, yy = y + dy; if (xx < 0 || yy < 0 || xx >= n || yy >= n) continue;
          const j = yy * n + xx; if (!seen[j] && d[j] >= thr) { seen[j] = 1; st.push(j); }
        }
      }
      if (st.length >= (minArea || 1)) out.push({ x: (sx / st.length + 0.5) / n, y: (sy / st.length + 0.5) / n, area: st.length, max: mx });
    }
    return out.sort((a, b) => b.area - a.area);
  };
  const IMAPS = { gray: [[0, 0, 0], [255, 255, 255]], hot: [[0, 0, 0], [150, 10, 10], [240, 90, 10], [255, 220, 60], [255, 255, 255]], cool: [[6, 10, 24], [30, 70, 160], [90, 190, 230], [255, 255, 255]] };
  /**
   * 영상을 캔버스의 box에 그린다.
   * opts: { map: "gray"|"hot"|"cool", smooth:false (화소가 보이게), gain:1, mask:Float32Array + thr (문턱을 넘는 화소를 빨갛게 덧칠) }
   */
  I.put = function (ctx, box, a, n, o) {
    o = o || {};
    const cv = document.createElement("canvas"); cv.width = n; cv.height = n;
    const c2 = cv.getContext("2d"), im = c2.createImageData(n, n), d = im.data, mp = IMAPS[o.map || "gray"], g = o.gain == null ? 1 : o.gain;
    for (let i = 0, p = 0; i < a.length; i++, p += 4) {
      const t = clamp(a[i] * g, 0, 1) * (mp.length - 1), k = Math.min(mp.length - 2, Math.floor(t)), f = t - k, A = mp[k], B = mp[k + 1];
      d[p] = A[0] + (B[0] - A[0]) * f; d[p + 1] = A[1] + (B[1] - A[1]) * f; d[p + 2] = A[2] + (B[2] - A[2]) * f; d[p + 3] = 255;
      if (o.mask && o.mask[i] >= o.thr) { d[p] = 255; d[p + 1] = 60; d[p + 2] = 60; }
    }
    c2.putImageData(im, 0, 0);
    ctx.save(); ctx.imageSmoothingEnabled = !!o.smooth; ctx.drawImage(cv, box.x, box.y, box.w, box.h); ctx.restore();
  };
})();
