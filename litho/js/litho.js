/* Copyright (c) 2026 geniuskey and LithoBook contributors.
   Executable code: MIT (see ../LICENSE-MIT). */
/* ==========================================================================
   LithoBook 노광 엔진 — 전역 객체 LT
   - 결상: 아베(Abbe) 광원 적분 스칼라 모델. 주기 경계의 1D/2D 마스크 → 공간상(aerial image)
   - 레지스트: 가우시안 번짐 + 문턱값, CD·NILS·윤곽선
   - 공정 윈도: 초점-노광량 행렬(FEM), ED 윈도
   - OPC: 규칙 기반 보정, 조각(fragment) 기반 모델 OPC, SRAF
   - 확률론: 광자 산탄 잡음
   - 박막 광학: 전달 행렬(TMM), 다층막 거울, 정상파
   - 단면: 기둥(column) 모델의 증착·식각·트림
   단위: 길이 nm, 초점 nm, 수차는 파장 단위(waves). y축은 캔버스와 같이 아래로 +.
   ========================================================================== */
(function (root) {
  "use strict";
  const LT = (root.LT = {});
  const TAU = Math.PI * 2;

  LT.rng = function (seed) { let a = seed >>> 0; return function () { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };

  /* 노광기 세대 (대표값) */
  LT.SCANNERS = {
    g:    { name: "g-line",       wl: 436,  na: 0.45, nMedium: 1,    k1min: 0.6,  year: 1980 },
    i:    { name: "i-line",       wl: 365,  na: 0.6,  nMedium: 1,    k1min: 0.5,  year: 1990 },
    krf:  { name: "KrF",          wl: 248,  na: 0.8,  nMedium: 1,    k1min: 0.35, year: 1997 },
    arf:  { name: "ArF dry",      wl: 193,  na: 0.93, nMedium: 1,    k1min: 0.3,  year: 2003 },
    arfi: { name: "ArF 액침",      wl: 193,  na: 1.35, nMedium: 1.44, k1min: 0.28, year: 2007 },
    euv:  { name: "EUV 0.33",     wl: 13.5, na: 0.33, nMedium: 1,    k1min: 0.3,  year: 2019 },
    hna:  { name: "EUV High-NA",  wl: 13.5, na: 0.55, nMedium: 1,    k1min: 0.3,  year: 2025, obscuration: 0.2 },
  };

  /* ------------------------------------------------------------ FFT */
  const TW = {};
  function tw(n) {
    if (TW[n]) return TW[n];
    if (n & (n - 1)) throw new Error("LT.fft: n은 2의 거듭제곱이어야 한다 (" + n + ")");
    const c = new Float64Array(n / 2), s = new Float64Array(n / 2), rev = new Uint32Array(n);
    for (let i = 0; i < n / 2; i++) { c[i] = Math.cos((TAU * i) / n); s[i] = Math.sin((TAU * i) / n); }
    let bits = 0; while (1 << bits < n) bits++;
    for (let i = 0; i < n; i++) { let r = 0; for (let b = 0; b < bits; b++) if (i & (1 << b)) r |= 1 << (bits - 1 - b); rev[i] = r; }
    return (TW[n] = { c, s, rev });
  }
  /** 제자리 FFT. 정변환 F[k] = Σ f[x] e^{-2πikx/n}, 역변환은 1/n 포함. */
  LT.fft = function (re, im, inv) {
    const n = re.length, T = tw(n), c = T.c, s = T.s, rev = T.rev;
    for (let i = 0; i < n; i++) { const j = rev[i]; if (j > i) { let t = re[i]; re[i] = re[j]; re[j] = t; t = im[i]; im[i] = im[j]; im[j] = t; } }
    for (let len = 2; len <= n; len <<= 1) {
      const half = len >> 1, step = n / len;
      for (let i = 0; i < n; i += len) {
        for (let j = 0, k = 0; j < half; j++, k += step) {
          const wr = c[k], wi = inv ? s[k] : -s[k];
          const a = i + j, b = a + half;
          const xr = re[b] * wr - im[b] * wi, xi = re[b] * wi + im[b] * wr;
          re[b] = re[a] - xr; im[b] = im[a] - xi; re[a] += xr; im[a] += xi;
        }
      }
    }
    if (inv) for (let i = 0; i < n; i++) { re[i] /= n; im[i] /= n; }
  };
  /** n×n 2D FFT (행 우선 배열). rows를 주면 그 행만 행 변환한다(나머지는 0이라고 가정). */
  LT.fft2 = function (re, im, n, inv, rows) {
    const tr = new Float64Array(n), ti = new Float64Array(n);
    const doRow = (y) => {
      const o = y * n;
      for (let x = 0; x < n; x++) { tr[x] = re[o + x]; ti[x] = im[o + x]; }
      LT.fft(tr, ti, inv);
      for (let x = 0; x < n; x++) { re[o + x] = tr[x]; im[o + x] = ti[x]; }
    };
    if (rows) rows.forEach(doRow); else for (let y = 0; y < n; y++) doRow(y);
    for (let x = 0; x < n; x++) {
      for (let y = 0; y < n; y++) { tr[y] = re[y * n + x]; ti[y] = im[y * n + x]; }
      LT.fft(tr, ti, inv);
      for (let y = 0; y < n; y++) { re[y * n + x] = tr[y]; im[y * n + x] = ti[y]; }
    }
  };
  const freq = (k, n, L) => (k < n / 2 ? k : k - n) / L;

  /* ------------------------------------------------------------ 광원 */
  /**
   * 조명 모양 → 광원점 목록 [{sx, sy, w}] (σ 좌표, 가중치 합 1).
   * shape: "conv"(원형) | "annular" | "dipole" | "quasar"(대각 4극) | "cquad"(축 4극) | "point"
   * sigma(conv), sigmaIn/sigmaOut, open(극의 벌림각 °), orient "x"|"y"(dipole의 극 방향), n(격자 수)
   */
  LT.source = function (o = {}) {
    const shape = o.shape || "conv";
    if (shape === "point") return [{ sx: o.sx || 0, sy: o.sy || 0, w: 1 }];
    const sOut = shape === "conv" ? (o.sigma != null ? o.sigma : 0.5) : (o.sigmaOut != null ? o.sigmaOut : 0.9);
    const sIn = shape === "conv" ? 0 : (o.sigmaIn != null ? o.sigmaIn : 0.6);
    const open = ((o.open != null ? o.open : shape === "dipole" ? 60 : 40) * Math.PI) / 180 / 2;
    const n = o.n || 13, pts = [];
    if (sOut <= 1e-6) return [{ sx: 0, sy: 0, w: 1 }];
    const inPole = (a, c) => { let d = Math.abs(a - c) % TAU; if (d > Math.PI) d = TAU - d; return d <= open; };
    for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
      const sx = ((i + 0.5) / n * 2 - 1) * sOut, sy = ((j + 0.5) / n * 2 - 1) * sOut;
      const r = Math.hypot(sx, sy);
      if (r > sOut || r < sIn) continue;
      const a = Math.atan2(sy, sx);
      let ok = true;
      if (shape === "dipole") ok = o.orient === "y" ? inPole(a, Math.PI / 2) || inPole(a, -Math.PI / 2) : inPole(a, 0) || inPole(a, Math.PI);
      else if (shape === "quasar") ok = [1, 3, -1, -3].some((k) => inPole(a, (k * Math.PI) / 4));
      else if (shape === "cquad") ok = [0, 1, 2, -1].some((k) => inPole(a, (k * Math.PI) / 2));
      if (ok) pts.push({ sx, sy, w: 1 });
    }
    if (!pts.length) pts.push({ sx: 0, sy: 0, w: 1 });
    pts.forEach((p) => (p.w = 1 / pts.length));
    return pts;
  };

  /* ------------------------------------------------------------ 마스크 */
  function amps(o) {
    const type = o.type || "binary", att = o.att != null ? o.att : 0.06;
    const dark = type === "att" ? -Math.sqrt(att) : 0;
    // tone "line": 도형이 차광부(레지스트 선으로 남는다), "space": 도형이 투광부(트렌치·홀)
    return o.tone === "space" ? { fg: 1, bg: dark } : { fg: dark, bg: 1 };
  }
  /**
   * 1D 마스크. feats: [{c: 중심, w: 폭}] (nm). 주기 L.
   * type "binary" | "att"(감쇠 PSM, att=투과율) | "alt"(교번 PSM: 투광부 위상이 번갈아 0/180°)
   * → {n, L, re: Float64Array, im: null, feats}
   */
  LT.mask1d = function (o) {
    const n = o.n || 128, L = o.L, p = L / n, re = new Float64Array(n);
    const A = amps(o), feats = (o.feats || []).slice().sort((a, b) => a.c - b.c);
    const cov = new Float64Array(n);
    feats.forEach((f) => {
      const x0 = f.c - f.w / 2, x1 = f.c + f.w / 2;
      for (let i = Math.floor(x0 / p); i <= Math.floor(x1 / p); i++) {
        const ov = Math.min(x1, (i + 1) * p) - Math.max(x0, i * p);
        if (ov > 0) cov[((i % n) + n) % n] += ov / p;
      }
    });
    for (let i = 0; i < n; i++) {
      const c = Math.min(1, cov[i]);
      let fg = A.fg, bg = A.bg;
      if (o.type === "alt") {
        const x = (i + 0.5) * p; let k = 0;
        feats.forEach((f) => { if (f.c < x) k++; });
        const sgn = k % 2 ? -1 : 1;
        if (o.tone === "space") { // 투광 도형마다 위상 교번
          let idx = 0, best = 1e9; feats.forEach((f, j) => { const d = Math.abs(f.c - x); if (d < best) { best = d; idx = j; } });
          fg = idx % 2 ? -1 : 1; bg = 0;
        } else { fg = 0; bg = sgn; }
      }
      re[i] = bg + c * (fg - bg);
    }
    return { n, L, re, im: null, feats, d: 1 };
  };
  /** 선/간격 격자 한 주기(또는 periods 주기). → mask1d */
  LT.grating = function (pitch, cd, o = {}) {
    const k = o.periods || (o.type === "alt" ? 2 : 1), feats = [];
    for (let i = 0; i < k; i++) feats.push({ c: (i + 0.5) * pitch, w: cd });
    return LT.mask1d(Object.assign({}, o, { L: pitch * k, n: o.n || 64, feats }));
  };
  /**
   * 2D 마스크. rects: [{x, y, w, h, sub?}] (nm, 왼쪽 위 기준, y 아래로 +). 면적 비율로 안티에일리어싱, 주기 경계.
   * sub: true인 사각형은 덮인 면적을 깎는다(OPC의 안쪽 이동).
   * → {n, L, re, im: null, cov}
   */
  LT.raster = function (rects, o) {
    const n = o.n || 128, L = o.L, p = L / n, cov = new Float32Array(n * n);
    const span = (a, b) => { const out = []; for (let i = Math.floor(a / p); i <= Math.floor((b - 1e-9) / p); i++) { const ov = Math.min(b, (i + 1) * p) - Math.max(a, i * p); if (ov > 1e-9) out.push([((i % n) + n) % n, ov / p]); } return out; };
    const paint = (r, sgn) => {
      if (r.w <= 0 || r.h <= 0) return;
      const xs = span(r.x, r.x + r.w), ys = span(r.y, r.y + r.h);
      for (const [j, cy] of ys) for (const [i, cx] of xs) cov[j * n + i] += sgn * cx * cy;
    };
    rects.forEach((r) => { if (!r.sub) paint(r, 1); });
    for (let i = 0; i < cov.length; i++) if (cov[i] > 1) cov[i] = 1;
    rects.forEach((r) => { if (r.sub) paint(r, -1); });
    const A = amps(o), re = new Float64Array(n * n);
    for (let i = 0; i < cov.length; i++) { const c = cov[i] < 0 ? 0 : cov[i] > 1 ? 1 : cov[i]; cov[i] = c; re[i] = A.bg + c * (A.fg - A.bg); }
    return { n, L, re, im: null, cov, d: 2 };
  };

  /* ------------------------------------------------------------ 결상 */
  const ZERN = {
    z2: (r, c, s) => r * c, z3: (r, c, s) => r * s,
    z4: (r) => 2 * r * r - 1,
    z5: (r, c, s) => r * r * (c * c - s * s), z6: (r, c, s) => r * r * 2 * s * c,
    z7: (r, c) => (3 * r * r * r - 2 * r) * c, z8: (r, c, s) => (3 * r * r * r - 2 * r) * s,
    z9: (r) => 6 * r ** 4 - 6 * r * r + 1,
    z10: (r, c, s) => r ** 3 * (4 * c * c * c - 3 * c), z11: (r, c, s) => r ** 3 * (3 * s - 4 * s * s * s),
  };
  LT.ZERNIKE = { z2: "기울기 x", z3: "기울기 y", z4: "초점", z5: "비점수차 0°", z6: "비점수차 45°", z7: "코마 x", z8: "코마 y", z9: "구면수차", z10: "트레포일 x", z11: "트레포일 y" };
  function pupilPhase(rx, ry, o) {
    let ph = 0;
    const z = o.defocus || 0;
    if (z) { const nm = o.nMedium || 1, s2 = ((o.na / nm) ** 2) * (rx * rx + ry * ry); ph += ((TAU * nm * z) / o.wl) * (Math.sqrt(Math.max(0, 1 - s2)) - 1); }
    if (o.zern) {
      const r = Math.hypot(rx, ry), c = r ? rx / r : 1, s = r ? ry / r : 0;
      for (const k in o.zern) if (o.zern[k] && ZERN[k]) ph += TAU * o.zern[k] * ZERN[k](r, c, s);
    }
    return ph;
  }
  /** 동공 위상(rad). 수차 지도를 그릴 때 쓴다. rx, ry는 동공 좌표(−1~1). */
  LT.pupilPhase = pupilPhase;

  function spectrum(mask) {
    if (mask._F) return mask._F;
    const re = Float64Array.from(mask.re), im = mask.im ? Float64Array.from(mask.im) : new Float64Array(re.length);
    if (mask.d === 2) LT.fft2(re, im, mask.n, false); else LT.fft(re, im, false);
    const N = re.length; for (let i = 0; i < N; i++) { re[i] /= N; im[i] /= N; }
    return (mask._F = { re, im });
  }
  /**
   * 1D 마스크의 회절 차수. → [{m, f(1/nm), re, im, amp, phase, rho}] (rho = f·λ/NA, o가 있을 때)
   * 격자(L = 피치)면 m이 곧 회절 차수다.
   */
  LT.orders = function (mask, o, mMax = 8) {
    const F = spectrum(mask), n = mask.n, out = [];
    for (let m = -mMax; m <= mMax; m++) {
      if (Math.abs(m) >= n / 2) continue;
      const k = (m + n) % n, re = F.re[k], im = F.im[k], f = m / mask.L;
      out.push({ m, f, re, im, amp: Math.hypot(re, im), phase: Math.atan2(im, re), rho: o ? (f * o.wl) / o.na : null });
    }
    return out;
  };
  /**
   * 공간상(aerial image). 맑은 마스크(전부 1)에서 세기 1로 정규화.
   * o: {wl, na, source(LT.source 결과 또는 그 옵션 객체), defocus(nm), zern{z5..z11: waves}, nMedium, obscuration(동공 중심 차폐 반지름 0~1), flare(0~1)}
   * 1D 마스크 → Float32Array(n), 2D 마스크 → Float32Array(n·n)
   */
  LT.aerial = function (mask, o) {
    const n = mask.n, L = mask.L, F = spectrum(mask), two = mask.d === 2;
    const src = Array.isArray(o.source) ? o.source : LT.source(o.source || { shape: "conv", sigma: 0.5 });
    const kc = o.na / o.wl, obs2 = (o.obscuration || 0) ** 2;
    let smax = 0; src.forEach((p) => { smax = Math.max(smax, Math.hypot(p.sx, p.sy)); });
    const lim = 1 + smax + 1e-9, cand = [];
    const ny = two ? n : 1;
    for (let ky = 0; ky < ny; ky++) {
      const ry0 = two ? freq(ky, n, L) / kc : 0;
      if (Math.abs(ry0) > lim) continue;
      for (let kx = 0; kx < n; kx++) {
        const rx0 = freq(kx, n, L) / kc;
        if (Math.abs(rx0) > lim) continue;
        const idx = ky * n + kx, a = F.re[idx], b = F.im[idx];
        if (a * a + b * b < 1e-16) continue;
        cand.push(idx, ky, rx0, ry0, a, b);
      }
    }
    const N = two ? n * n : n, wr = new Float64Array(N), wi = new Float64Array(N), I = new Float32Array(N);
    const aberr = !!(o.defocus || o.zern);
    for (const s of src) {
      wr.fill(0); wi.fill(0);
      const rows = new Set();
      for (let c = 0; c < cand.length; c += 6) {
        const rx = cand[c + 2] + s.sx, ry = cand[c + 3] + s.sy, r2 = rx * rx + ry * ry;
        if (r2 > 1 || r2 < obs2) continue;
        let a = cand[c + 4], b = cand[c + 5];
        if (aberr) { const ph = pupilPhase(rx, ry, o), cs = Math.cos(ph), sn = Math.sin(ph); const t = a * cs - b * sn; b = a * sn + b * cs; a = t; }
        wr[cand[c]] = a; wi[cand[c]] = b; rows.add(cand[c + 1]);
      }
      if (!rows.size) continue;
      if (two) LT.fft2(wr, wi, n, true, rows); else LT.fft(wr, wi, true);
      // 역변환의 1/N을 되돌린다 (스펙트럼을 이미 1/N로 정규화했으므로)
      const g = s.w * N * N;
      for (let i = 0; i < N; i++) I[i] += g * (wr[i] * wr[i] + wi[i] * wi[i]);
    }
    if (o.flare) for (let i = 0; i < N; i++) I[i] = I[i] * (1 - o.flare) + o.flare;
    return I;
  };

  /** 가우시안 번짐(산 확산·레지스트 번짐). sigma는 nm. 1D/2D 모두 주기 경계. */
  LT.blur = function (I, mask, sigma) {
    if (!sigma) return I;
    const n = mask.n, L = mask.L, two = I.length === n * n && n > 1 && mask.d === 2;
    const re = Float64Array.from(I), im = new Float64Array(I.length);
    if (two) LT.fft2(re, im, n, false); else LT.fft(re, im, false);
    const k = -2 * Math.PI * Math.PI * sigma * sigma, g = new Float64Array(n);
    for (let i = 0; i < n; i++) { const f = freq(i, n, L); g[i] = Math.exp(k * f * f); }
    if (two) for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) { const m = g[x] * g[y]; re[y * n + x] *= m; im[y * n + x] *= m; }
    else for (let x = 0; x < n; x++) { re[x] *= g[x]; im[x] *= g[x]; }
    if (two) LT.fft2(re, im, n, true); else LT.fft(re, im, true);
    return Float32Array.from(re);
  };

  LT.contrast = function (I) { let a = Infinity, b = -Infinity; for (let i = 0; i < I.length; i++) { if (I[i] < a) a = I[i]; if (I[i] > b) b = I[i]; } return { min: a, max: b, contrast: b + a > 0 ? (b - a) / (b + a) : 0 }; };

  /**
   * 1D 세기 분포에서 x0를 포함하는 도형의 CD. tone "line": I < thr인 구간(레지스트 선), "space": I > thr.
   * → {cd, xl, xr, nils, ils(1/nm)}. 도형이 없으면 cd 0, 주기 전체가 이어지면 cd = L (merged: true).
   */
  LT.cd1d = function (I, L, thr, x0, tone) {
    const n = I.length, p = L / n, line = tone !== "space";
    const inside = (i) => { const v = I[((i % n) + n) % n]; return line ? v < thr : v > thr; };
    let i0 = Math.round(x0 / p - 0.5);
    if (!inside(i0)) { let f = false; for (let d = 1; d <= 3 && !f; d++) for (const s of [-d, d]) if (inside(i0 + s)) { i0 += s; f = true; break; } if (!f) return { cd: 0, xl: x0, xr: x0, nils: 0, ils: 0 }; }
    const edge = (dir) => {
      let i = i0, k = 0;
      while (inside(i + dir) && k < n) { i += dir; k++; }
      if (k >= n) return null;
      const a = I[((i % n) + n) % n], b = I[(((i + dir) % n) + n) % n], t = (thr - a) / (b - a);
      return { x: (i + 0.5 + dir * t) * p, slope: Math.abs(b - a) / p };
    };
    const l = edge(-1), r = edge(1);
    if (!l || !r) return { cd: L, xl: 0, xr: L, nils: 0, ils: 0, merged: true };
    const cd = r.x - l.x, ils = (l.slope + r.slope) / 2 / thr;
    return { cd, xl: l.x, xr: r.x, ils, nils: ils * cd };
  };

  /** 2D 세기에서 겹선형 보간 표본 (x, y는 nm, 주기 경계). */
  LT.sample = function (I, n, L, x, y) {
    const p = L / n, u = x / p - 0.5, v = y / p - 0.5, i = Math.floor(u), j = Math.floor(v), a = u - i, b = v - j;
    const g = (ii, jj) => I[(((jj % n) + n) % n) * n + (((ii % n) + n) % n)];
    return (g(i, j) * (1 - a) + g(i + 1, j) * a) * (1 - b) + (g(i, j + 1) * (1 - a) + g(i + 1, j + 1) * a) * b;
  };

  /** 등고선(마칭 스퀘어). → [x1, y1, x2, y2, …] (nm 좌표) */
  LT.contours = function (I, n, L, thr) {
    const p = L / n, out = [];
    const X = (i) => (i + 0.5) * p;
    for (let j = 0; j < n - 1; j++) for (let i = 0; i < n - 1; i++) {
      const a = I[j * n + i], b = I[j * n + i + 1], c = I[(j + 1) * n + i + 1], d = I[(j + 1) * n + i];
      const code = (a > thr ? 1 : 0) | (b > thr ? 2 : 0) | (c > thr ? 4 : 0) | (d > thr ? 8 : 0);
      if (code === 0 || code === 15) continue;
      const T = [X(i) + ((thr - a) / (b - a)) * p, X(j)], R = [X(i + 1), X(j) + ((thr - b) / (c - b)) * p];
      const B = [X(i) + ((thr - d) / (c - d)) * p, X(j + 1)], Lf = [X(i), X(j) + ((thr - a) / (d - a)) * p];
      const seg = (P, Q) => out.push(P[0], P[1], Q[0], Q[1]);
      switch (code) {
        case 1: case 14: seg(Lf, T); break;
        case 2: case 13: seg(T, R); break;
        case 3: case 12: seg(Lf, R); break;
        case 4: case 11: seg(R, B); break;
        case 6: case 9: seg(T, B); break;
        case 7: case 8: seg(Lf, B); break;
        case 5: seg(Lf, T); seg(R, B); break;
        case 10: seg(T, R); seg(Lf, B); break;
      }
    }
    return out;
  };

  /* ------------------------------------------------------------ 공정 윈도 */
  /**
   * 초점-노광량 행렬. 노광량은 상대값(1 = 기준). 문턱 모델: 선은 dose·I < thr 인 곳에 남는다.
   * q: {focus: [nm…], dose: [상대…], thr, blur(nm), x0, tone}
   * → {focus, dose, cd[fi][di], nils[fi]}
   */
  LT.fem1d = function (mask, o, q) {
    const cd = [], nils = [];
    q.focus.forEach((z) => {
      const I = LT.blur(LT.aerial(mask, Object.assign({}, o, { defocus: z })), mask, q.blur || 0);
      cd.push(q.dose.map((d) => { const r = LT.cd1d(I, mask.L, q.thr / d, q.x0, q.tone); return r.merged ? NaN : r.cd; }));
      nils.push(LT.cd1d(I, mask.L, q.thr, q.x0, q.tone).nils);
    });
    return { focus: q.focus, dose: q.dose, cd, nils };
  };
  /**
   * ED 윈도. CD가 target·(1 ± tol) 안에 드는 노광량 구간을 초점마다 구하고, 그 안에 들어가는 직사각형을 찾는다.
   * → {lo[], hi[], ctr[], rects: [{dof, el(%), f0, f1, d0, d1}] (DOF별 최대 EL), dofAt(el%) → nm}
   */
  LT.window = function (fem, target, tol = 0.1) {
    const D = fem.dose, nf = fem.focus.length;
    const doseAt = (row, v) => { for (let i = 0; i < D.length - 1; i++) { const a = row[i], b = row[i + 1]; if (isFinite(a) && isFinite(b) && a > 0 && b > 0 && (a - v) * (b - v) <= 0 && a !== b) return D[i] + ((v - a) / (b - a)) * (D[i + 1] - D[i]); } return NaN; };
    const lo = [], hi = [], ctr = [];
    for (let f = 0; f < nf; f++) {
      const a = doseAt(fem.cd[f], target * (1 + tol)), b = doseAt(fem.cd[f], target * (1 - tol));
      lo.push(Math.min(a, b)); hi.push(Math.max(a, b)); ctr.push(doseAt(fem.cd[f], target));
    }
    const best = new Map();
    for (let i = 0; i < nf; i++) {
      let l = -Infinity, h = Infinity;
      for (let j = i; j < nf; j++) {
        if (!isFinite(lo[j]) || !isFinite(hi[j])) break;
        l = Math.max(l, lo[j]); h = Math.min(h, hi[j]);
        if (h <= l) break;
        const dof = fem.focus[j] - fem.focus[i], el = ((h - l) / ((h + l) / 2)) * 100;
        const cur = best.get(dof);
        if (!cur || el > cur.el) best.set(dof, { dof, el, f0: fem.focus[i], f1: fem.focus[j], d0: l, d1: h });
      }
    }
    const rects = [...best.values()].sort((a, b) => a.dof - b.dof);
    const dofAt = (el) => { let d = 0; rects.forEach((r) => { if (r.el >= el && r.dof > d) d = r.dof; }); return d; };
    return { lo, hi, ctr, rects, dofAt };
  };

  /* ------------------------------------------------------------ OPC */
  const inRect = (r, x, y) => x > r.x && x < r.x + r.w && y > r.y && y < r.y + r.h;
  /** 사각형들의 가장자리를 frag(nm) 길이 조각으로 나눈다. 다른 사각형과 맞닿아 묻힌 조각은 뺀다. L을 주면 주기 경계 너머로 이어지는 변도 뺀다. */
  LT.fragments = function (rects, frag = 20, L) {
    const out = [], wr = (v) => (L ? ((v % L) + L) % L : v);
    rects.forEach((r, ri) => {
      const add = (x0, y0, x1, y1, nx, ny) => {
        const len = Math.hypot(x1 - x0, y1 - y0), k = Math.max(1, Math.round(len / frag));
        for (let i = 0; i < k; i++) {
          const ax = x0 + ((x1 - x0) * i) / k, ay = y0 + ((y1 - y0) * i) / k, bx = x0 + ((x1 - x0) * (i + 1)) / k, by = y0 + ((y1 - y0) * (i + 1)) / k;
          const cx = (ax + bx) / 2, cy = (ay + by) / 2;
          if (rects.some((q, qi) => (qi !== ri || L) && inRect(q, wr(cx + nx * 0.5), wr(cy + ny * 0.5)))) continue;
          out.push({ x0: ax, y0: ay, x1: bx, y1: by, nx, ny, cx, cy, d: 0, epe: 0, rect: ri, end: len <= frag * 1.5 });
        }
      };
      add(r.x, r.y, r.x + r.w, r.y, 0, -1); add(r.x + r.w, r.y, r.x + r.w, r.y + r.h, 1, 0);
      add(r.x, r.y + r.h, r.x + r.w, r.y + r.h, 0, 1); add(r.x, r.y, r.x, r.y + r.h, -1, 0);
    });
    return out;
  };
  /** 조각의 이동량 d를 사각형으로 바꿔 원래 도형에 더한다(바깥은 덧붙이고 안쪽은 sub로 깎는다). */
  LT.applyFragments = function (rects, frags) {
    const out = rects.map((r) => Object.assign({}, r));
    frags.forEach((f) => {
      if (Math.abs(f.d) < 1e-6) return;
      const a = Math.abs(f.d), s = f.d > 0 ? 1 : -1;
      const x0 = Math.min(f.x0, f.x1), y0 = Math.min(f.y0, f.y1), w = Math.abs(f.x1 - f.x0), h = Math.abs(f.y1 - f.y0);
      let r;
      if (f.nx) r = { x: f.nx * s > 0 ? x0 : x0 - a, y: y0, w: a, h };
      else r = { x: x0, y: f.ny * s > 0 ? y0 : y0 - a, w, h: a };
      if (s < 0) r.sub = true;
      out.push(r);
    });
    return out;
  };
  /**
   * 각 조각의 가장자리 배치 오차(EPE, nm). 양수면 찍힌 도형이 목표보다 바깥으로 나갔다.
   * I는 (번진) 세기, T는 문턱(thr/dose). frags[].epe를 채우고 {rms, max}를 돌려준다.
   */
  LT.measureEPE = function (frags, I, n, L, T, tone, range = 12) {
    const sg = tone === "space" ? -1 : 1, st = Math.max(0.5, L / n / 2);
    let s2 = 0, mx = 0;
    frags.forEach((f) => {
      const g = (t) => sg * (LT.sample(I, n, L, f.cx + f.nx * t, f.cy + f.ny * t) - T);
      let best = null, prev = g(-range);
      for (let t = -range + st; t <= range + 1e-9; t += st) {
        const cur = g(t);
        if (prev < 0 && cur >= 0) { const tc = t - st + (st * -prev) / (cur - prev); if (best === null || Math.abs(tc) < Math.abs(best)) best = tc; }
        prev = cur;
      }
      if (best === null) best = g(0) < 0 ? range : -range;
      f.epe = best; s2 += best * best; mx = Math.max(mx, Math.abs(best));
    });
    return { rms: Math.sqrt(s2 / Math.max(1, frags.length)), max: mx };
  };
  /**
   * 모델 기반 OPC. 목표 rects의 가장자리 조각을 EPE 반대 방향으로 반복해 옮긴다.
   * q: {L, n, type, tone, att, thr, dose, blur, frag, iters, gain, maxMove, range(EPE 탐색 범위 nm, 이웃 도형까지 거리의 절반보다 작게), extra(SRAF 등 고정 도형), frags(이어서 돌릴 때), onIter}
   * → {frags, rects(마스크 도형), mask, image(번진 세기), epe: {rms, max}, history: [rms…]}
   */
  LT.opc = function (rects, o, q) {
    const frags = q.frags || LT.fragments(rects, q.frag || 20, q.L);
    const T = q.thr / (q.dose || 1), iters = q.iters != null ? q.iters : 8, gain = q.gain != null ? q.gain : 0.6, mm = q.maxMove || 12;
    const history = [];
    let mrects, mask, image, epe;
    const sim = () => {
      mrects = LT.applyFragments(rects, frags).concat(q.extra || []);
      mask = LT.raster(mrects, q);
      image = LT.blur(LT.aerial(mask, o), mask, q.blur || 0);
      epe = LT.measureEPE(frags, image, q.n, q.L, T, q.tone, q.range);
      history.push(epe.rms);
    };
    sim();
    for (let k = 0; k < iters; k++) {
      frags.forEach((f) => { f.d = Math.max(-mm, Math.min(mm, f.d - gain * f.epe)); });
      sim();
      if (q.onIter) q.onIter(k, epe);
    }
    return { frags, rects: mrects, mask, image, epe, history };
  };
  /**
   * 규칙 기반 OPC. q: {bias(전체 굵기 보정), serif(모서리 세리프 한 변), hammer(선 끝 해머헤드 폭 늘림), ext(선 끝 연장)}
   * 긴 변이 짧은 변의 2배가 넘는 사각형을 선으로 보고 양 끝에 해머헤드를 단다.
   */
  LT.opcRule = function (rects, q = {}) {
    const b = q.bias || 0, s = q.serif || 0, hm = q.hammer || 0, ext = q.ext || 0, out = [];
    rects.forEach((r0) => {
      const r = { x: r0.x - b, y: r0.y - b, w: r0.w + 2 * b, h: r0.h + 2 * b };
      out.push(r);
      const isLineV = r.h > 2 * r.w, isLineH = r.w > 2 * r.h;
      if ((hm || ext) && (isLineV || isLineH)) {
        const t = Math.max(s, Math.min(r.w, r.h) * 0.6);
        if (isLineV) { out.push({ x: r.x - hm, y: r.y - ext, w: r.w + 2 * hm, h: t + ext }, { x: r.x - hm, y: r.y + r.h - t, w: r.w + 2 * hm, h: t + ext }); }
        else { out.push({ x: r.x - ext, y: r.y - hm, w: t + ext, h: r.h + 2 * hm }, { x: r.x + r.w - t, y: r.y - hm, w: t + ext, h: r.h + 2 * hm }); }
      } else if (s) {
        [[r.x, r.y], [r.x + r.w, r.y], [r.x, r.y + r.h], [r.x + r.w, r.y + r.h]].forEach(([cx, cy]) => {
          if (rects.some((q2) => q2 !== r0 && inRect(q2, cx, cy))) return;
          out.push({ x: cx - s / 2, y: cy - s / 2, w: s, h: s });
        });
      }
    });
    return out;
  };
  /**
   * SRAF(해상 한계 미만 보조 패턴). 선의 긴 변에서 dist만큼 떨어진 곳에 폭 width의 막대를 놓는다.
   * 다른 도형과 dist·0.8보다 가까워지는 막대는 놓지 않는다. → 추가할 사각형 목록
   */
  LT.sraf = function (rects, q = {}) {
    const dist = q.dist || 60, w = q.width || 12, out = [];
    const clash = (b) => rects.concat(out).some((r) => b.x < r.x + r.w + dist * 0.8 && b.x + b.w > r.x - dist * 0.8 && b.y < r.y + r.h + dist * 0.8 && b.y + b.h > r.y - dist * 0.8);
    rects.forEach((r) => {
      const c = r.h >= r.w
        ? [{ x: r.x - dist - w, y: r.y, w, h: r.h }, { x: r.x + r.w + dist, y: r.y, w, h: r.h }]
        : [{ x: r.x, y: r.y - dist - w, w: r.w, h: w }, { x: r.x, y: r.y + r.h + dist, w: r.w, h: w }];
      c.forEach((b) => { if (!clash(b)) out.push(b); });
    });
    return out;
  };

  /* ------------------------------------------------------------ 확률론 */
  /** 노광량(mJ/cm²) → 입사 광자 수/nm². EUV 30 mJ/cm² ≈ 20개/nm², ArF는 같은 노광량에서 약 14배. */
  LT.photons = (dose, wl) => (dose * 1e-3 / 1e14) / ((6.62607015e-34 * 2.99792458e8) / (wl * 1e-9));
  /**
   * 광자 산탄 잡음. 세기 I(맑은 곳 1)에 화소마다 잡음을 넣는다.
   * 평균 흡수 광자 수 ≤30: 푸아송 표본. >30: 같은 평균·분산의 정규 표본을 반올림하고 0 절단.
   * 큰 평균에서의 표본은 푸아송 꼬리를 정확히 재현하지 않으므로 희귀 결함 검증용이 아니다.
   * q: {dose(mJ/cm², 맑은 곳 기준), wl, absorb(흡수율, 기본 EUV 0.25), seed} → 같은 단위의 잡음 낀 세기
   */
  LT.shot = function (I, mask, q) {
    const p = mask.L / mask.n, area = mask.d === 2 ? p * p : p * (q.height || p);
    const mean = LT.photons(q.dose, q.wl) * (q.absorb != null ? q.absorb : 0.25) * area;
    const rnd = LT.rng(q.seed || 1), out = new Float32Array(I.length);
    const gauss = () => Math.sqrt(-2 * Math.log(rnd() || 1e-12)) * Math.cos(TAU * rnd());
    for (let i = 0; i < I.length; i++) {
      const lam = I[i] * mean; let k;
      if (lam > 30) k = Math.max(0, Math.round(lam + Math.sqrt(lam) * gauss()));
      else { const E = Math.exp(-lam); let pr = 1; k = -1; do { k++; pr *= rnd(); } while (pr > E); }
      out[i] = k / mean;
    }
    return out;
  };

  /* ------------------------------------------------------------ 박막 광학 (전달 행렬) */
  const C = {
    add: (a, b) => [a[0] + b[0], a[1] + b[1]], sub: (a, b) => [a[0] - b[0], a[1] - b[1]],
    mul: (a, b) => [a[0] * b[0] - a[1] * b[1], a[0] * b[1] + a[1] * b[0]],
    div: (a, b) => { const d = b[0] * b[0] + b[1] * b[1]; return [(a[0] * b[0] + a[1] * b[1]) / d, (a[1] * b[0] - a[0] * b[1]) / d]; },
    sqrt: (a) => { const r = Math.hypot(a[0], a[1]); let re = Math.sqrt((r + a[0]) / 2), im = Math.sqrt(Math.max(0, (r - a[0]) / 2)); if (a[1] < 0) im = -im; if (im < 0) { re = -re; im = -im; } return [re, im]; },
    exp: (a) => { const e = Math.exp(a[0]); return [e * Math.cos(a[1]), e * Math.sin(a[1])]; },
    cos: (a) => [Math.cos(a[0]) * Math.cosh(a[1]), -Math.sin(a[0]) * Math.sinh(a[1])],
    sin: (a) => [Math.sin(a[0]) * Math.cosh(a[1]), Math.cos(a[0]) * Math.sinh(a[1])],
    abs2: (a) => a[0] * a[0] + a[1] * a[1],
  };
  LT.C = C;
  /** 굴절률(n, k) 대표값. 파장별. */
  LT.NK = {
    193:  { air: [1, 0], water: [1.437, 0], resist: [1.70, 0.025], barc: [1.80, 0.40], si: [0.883, 2.778], sio2: [1.563, 0], sin: [2.65, 0.18], cr: [0.84, 1.65], mosi: [2.34, 0.59] },
    248:  { air: [1, 0], resist: [1.76, 0.012], barc: [1.55, 0.45], si: [1.57, 3.565], sio2: [1.508, 0], sin: [2.28, 0.01] },
    365:  { air: [1, 0], resist: [1.70, 0.03], si: [6.52, 2.71], sio2: [1.475, 0] },
    13.5: { vac: [1, 0], si: [0.99900, 0.00183], mo: [0.92352, 0.00644], ru: [0.88636, 0.01706], tabn: [0.95, 0.031], ta: [0.9429, 0.0408], ni: [0.9483, 0.0727], sio2: [0.9780, 0.0108], resist: [0.975, 0.0045], sn: [0.9416, 0.0721] },
  };
  /**
   * 다층 박막의 반사·투과. layers: [{n, k, d}] 위에서 아래로. q: {wl, angle(°, 입사 매질 안), pol "s"|"p"|"u", n0: [n,k], ns: [n,k]}
   * → {R, T, A}
   */
  LT.tmm = function (layers, q) {
    const one = (pol) => {
      const N0 = q.n0 || [1, 0], Ns = q.ns || [1, 0], th = ((q.angle || 0) * Math.PI) / 180;
      const s0 = C.mul(N0, [Math.sin(th), 0]);
      const cosOf = (N) => C.sqrt(C.sub([1, 0], C.mul(C.div(s0, N), C.div(s0, N))));
      const eta = (N) => (pol === "p" ? C.div(N, cosOf(N)) : C.mul(N, cosOf(N)));
      let m11 = [1, 0], m12 = [0, 0], m21 = [0, 0], m22 = [1, 0];
      layers.forEach((l) => {
        const N = [l.n, l.k || 0], cs = cosOf(N), beta = C.mul([(TAU * l.d) / q.wl, 0], C.mul(N, cs)), e = eta(N);
        const cb = C.cos(beta), sb = C.sin(beta);
        const a12 = C.div(C.mul([0, -1], sb), e), a21 = C.mul(C.mul([0, -1], e), sb);
        const n11 = C.add(C.mul(m11, cb), C.mul(m12, a21)), n12 = C.add(C.mul(m11, a12), C.mul(m12, cb));
        const n21 = C.add(C.mul(m21, cb), C.mul(m22, a21)), n22 = C.add(C.mul(m21, a12), C.mul(m22, cb));
        m11 = n11; m12 = n12; m21 = n21; m22 = n22;
      });
      const e0 = eta(N0), es = eta(Ns);
      const B = C.add(m11, C.mul(m12, es)), Cc = C.add(m21, C.mul(m22, es));
      const den = C.add(C.mul(e0, B), Cc), r = C.div(C.sub(C.mul(e0, B), Cc), den);
      const R = C.abs2(r), T = (4 * e0[0] * es[0]) / C.abs2(den);
      return { R, T, r };
    };
    if (q.pol === "s" || q.pol === "p") { const o = one(q.pol); return { R: o.R, T: o.T, A: 1 - o.R - o.T, r: o.r }; }
    const a = one("s"), b = one("p"), R = (a.R + b.R) / 2, T = (a.T + b.T) / 2;
    return { R, T, A: 1 - R - T, r: a.r };
  };
  /**
   * EUV Mo/Si 다층막 거울 반사율. q: {wl=13.5, angle(°, 수직에서), pairs=40, period=6.95(nm), gamma=0.4(Mo 두께 비율), cap(Ru 두께 nm, 기본 2.5), pol}
   * 광학 상수는 13.5 nm 값을 고정해 쓴다(12.6~14.4 nm 근사).
   */
  LT.multilayer = function (q = {}) {
    const K = LT.NK[13.5], pairs = q.pairs != null ? q.pairs : 40, per = q.period || 6.95, g = q.gamma != null ? q.gamma : 0.4, layers = [];
    const cap = q.cap != null ? q.cap : 2.5;
    if (cap > 0) layers.push({ n: K.ru[0], k: K.ru[1], d: cap });
    for (let i = 0; i < pairs; i++) { layers.push({ n: K.si[0], k: K.si[1], d: per * (1 - g) }); layers.push({ n: K.mo[0], k: K.mo[1], d: per * g }); }
    return LT.tmm(layers, { wl: q.wl || 13.5, angle: q.angle || 0, pol: q.pol || "u", n0: [1, 0], ns: K.sio2 });
  };
  /**
   * 레지스트 안 정상파(수직 입사). q: {wl, resist: {n, k, d}, under: [{n, k, d}](BARC 등, 위→아래), substrate: [n, k], samples}
   * → {I: Float32Array(깊이 0=표면 → d=바닥, 입사 세기 1 기준), R(전체 반사율), Rsub(레지스트 바닥면 반사율), absorbed(레지스트 흡수 비율)}
   */
  LT.standing = function (q) {
    const N = [q.resist.n, q.resist.k || 0], d = q.resist.d, m = q.samples || 200, k0 = TAU / q.wl;
    const rb = LT.tmm(q.under || [], { wl: q.wl, n0: N, ns: q.substrate || [1, 0], pol: "s" }).r;
    const rt = C.div(C.sub([1, 0], N), C.add([1, 0], N)), tt = C.div([2, 0], C.add([1, 0], N));
    const ph = (z) => C.exp(C.mul([0, k0 * z], N));
    const den = C.add([1, 0], C.mul(C.mul(rt, rb), ph(2 * d)));
    const I = new Float32Array(m + 1);
    let abs = 0;
    for (let i = 0; i <= m; i++) {
      const z = (d * i) / m, E = C.div(C.mul(tt, C.add(ph(z), C.mul(rb, ph(2 * d - z)))), den);
      I[i] = C.abs2(E) * N[0];
      abs += I[i] * (i === 0 || i === m ? 0.5 : 1);
    }
    const all = LT.tmm([{ n: N[0], k: N[1], d }].concat(q.under || []), { wl: q.wl, n0: [1, 0], ns: q.substrate || [1, 0], pol: "s" });
    return { I, R: all.R, Rsub: C.abs2(rb), absorbed: (abs * (d / m)) * 2 * k0 * N[1] };
  };

  /* ------------------------------------------------------------ 단면 (기둥 모델) */
  LT.MAT = {
    si: "실리콘", ox: "산화막", nit: "질화막", poly: "폴리실리콘", ac: "탄소 하드마스크(SOC)", sion: "SiON/SiARC", barc: "반사 방지막",
    pr: "레지스트", tin: "TiN 하드마스크", lowk: "저유전막", cu: "구리", w: "텅스텐", sp: "스페이서", sp2: "2차 스페이서",
  };
  LT.matColor = function (m) {
    const v = typeof getComputedStyle === "function" ? getComputedStyle(document.documentElement).getPropertyValue("--m-" + m).trim() : "";
    return v || "#888";
  };
  /**
   * 단면 모델. 가로 width(nm)를 n개 기둥으로 나누고, 기둥마다 아래에서 위로 [{m, h}]를 쌓는다. 가로는 주기 경계.
   *   const xs = LT.xs({ width: 224, n: 224, stack: [{ m: "si", h: 30 }, { m: "ox", h: 40 }] });
   * 메서드(모두 this 반환): fill(m, t) 평탄 도포 · deposit(m, t) 등각 증착 · pattern(m, [[x0, x1]…]) 구간만 남기고 맨 위 m 제거
   *   etch(rates, depth) 수직 식각. rates는 재질 이름 또는 {재질: 상대 속도}. 속도 0(없는 재질)에서 멈춘다
   *   trim(m, a) 등방 축소 · strip(m) 맨 위에 드러난 m 제거 · cmp(y) 높이 y까지 평탄화
   * 조회: top() 높이 배열 · topOf(m) · lines(m) → [{x0, x1, w}] · clone() · draw(ctx, box, {yMax, outline})
   */
  LT.xs = function (o) {
    const n = o.n || 240, width = o.width, dx = width / n;
    const X = { n, width, dx, cols: [] };
    for (let i = 0; i < n; i++) X.cols.push((o.stack || []).map((s) => ({ m: s.m, h: s.h })));
    const H = (c) => { let s = 0; for (const g of c) s += g.h; return s; };
    const push = (c, m, h) => { if (h <= 1e-6) return; const t = c[c.length - 1]; if (t && t.m === m) t.h += h; else c.push({ m, h }); };
    const wrap = (i) => ((i % n) + n) % n;
    X.top = () => Float64Array.from(X.cols, H);
    X.fill = (m, t) => { const T = X.top(); let mx = 0; T.forEach((v) => (mx = Math.max(mx, v))); X.cols.forEach((c, i) => push(c, m, mx + t - T[i])); return X; };
    X.deposit = (m, t) => {
      const T = X.top(), R = Math.ceil(t / dx);
      X.cols.forEach((c, i) => {
        let best = T[i] + t;
        for (let j = -R; j <= R; j++) { const d2 = t * t - j * dx * (j * dx); if (d2 < 0) continue; const v = T[wrap(i + j)] + Math.sqrt(d2); if (v > best) best = v; }
        push(c, m, best - T[i]);
      });
      return X;
    };
    X.pattern = (m, keep, opt = {}) => {
      X.cols.forEach((c, i) => {
        const x = (i + 0.5) * dx; let k = keep.some(([a, b]) => x >= a && x < b);
        if (opt.invert) k = !k;
        if (!k) while (c.length && c[c.length - 1].m === m) c.pop();
      });
      return X;
    };
    X.etch = (rates, depth) => {
      if (typeof rates === "string") rates = { [rates]: 1 };
      X.cols.forEach((c) => {
        let b = depth;
        while (b > 1e-9 && c.length) {
          const t = c[c.length - 1], r = rates[t.m] || 0;
          if (r <= 0) break;
          const rem = Math.min(t.h, b * r);
          t.h -= rem; b -= rem / r;
          if (t.h <= 1e-6) c.pop();
        }
      });
      return X;
    };
    X.trim = (m, a) => {
      const T = X.top(), R = Math.ceil(a / dx), nt = new Float64Array(n);
      for (let i = 0; i < n; i++) {
        let best = Infinity;
        for (let j = -R; j <= R; j++) { const d2 = a * a - j * dx * (j * dx); if (d2 < 0) continue; const v = T[wrap(i + j)] - Math.sqrt(d2); if (v < best) best = v; }
        nt[i] = best;
      }
      X.cols.forEach((c, i) => {
        const t = c[c.length - 1];
        if (!t || t.m !== m) return;
        const base = T[i] - t.h;
        t.h = Math.max(0, Math.min(t.h, nt[i] - base));
        if (t.h <= 1e-6) c.pop();
      });
      return X;
    };
    X.strip = (m) => { X.cols.forEach((c) => { while (c.length && c[c.length - 1].m === m) c.pop(); }); return X; };
    X.cmp = (y) => {
      X.cols.forEach((c) => { let ex = H(c) - y; while (ex > 1e-9 && c.length) { const t = c[c.length - 1], r = Math.min(t.h, ex); t.h -= r; ex -= r; if (t.h <= 1e-6) c.pop(); } });
      return X;
    };
    X.topOf = (m) => { let mx = 0; X.cols.forEach((c) => { let y = 0; c.forEach((g) => { y += g.h; if (g.m === m && y > mx) mx = y; }); }); return mx; };
    X.lines = (m, minH = 0.5) => {
      const has = X.cols.map((c) => c.some((g) => g.m === m && g.h > minH)), out = [];
      let s = -1;
      for (let i = 0; i <= n; i++) { const v = i < n && has[i]; if (v && s < 0) s = i; if (!v && s >= 0) { out.push({ x0: s * dx, x1: i * dx, w: (i - s) * dx }); s = -1; } }
      return out;
    };
    X.clone = () => { const Y = LT.xs({ width, n, stack: [] }); Y.cols = X.cols.map((c) => c.map((g) => ({ m: g.m, h: g.h }))); return Y; };
    X.draw = (ctx, box, opt = {}) => {
      let yMax = opt.yMax; if (!yMax) { yMax = 0; X.top().forEach((v) => (yMax = Math.max(yMax, v))); yMax *= 1.12; }
      const sx = box.w / width, sy = box.h / yMax, col = {};
      for (let i = 0; i < n; i++) {
        let y = 0; const px = box.x + i * dx * sx, pw = Math.ceil(dx * sx) + 0.6;
        for (const g of X.cols[i]) {
          ctx.fillStyle = col[g.m] || (col[g.m] = LT.matColor(g.m));
          const y1 = box.y + box.h - (y + g.h) * sy;
          ctx.fillRect(px, y1, pw, g.h * sy + 0.6);
          y += g.h;
        }
      }
      if (opt.outline) {
        const T = X.top(); ctx.strokeStyle = opt.outline; ctx.lineWidth = 1; ctx.beginPath();
        for (let i = 0; i < n; i++) { const px = box.x + i * dx * sx, py = box.y + box.h - T[i] * sy; i ? ctx.lineTo(px, py) : ctx.moveTo(px, py); ctx.lineTo(px + dx * sx, py); }
        ctx.stroke();
      }
      return { X: (x) => box.x + x * sx, Y: (y) => box.y + box.h - y * sy, sx, sy };
    };
    return X;
  };

  /* ------------------------------------------------------------ 그리기 */
  const MAPS = {
    gray: [[0, 0, 0, 0], [1, 255, 255, 255]],
    aerial: [[0, 11, 13, 18], [0.3, 62, 28, 128], [0.6, 150, 92, 235], [0.85, 222, 196, 255], [1, 255, 255, 255]],
    heat: [[0, 10, 12, 30], [0.35, 150, 30, 90], [0.7, 240, 120, 40], [1, 255, 245, 200]],
    div: [[0, 47, 111, 224], [0.5, 245, 245, 245], [1, 214, 69, 69]],
  };
  function lut(name) {
    const st = MAPS[name] || MAPS.aerial, out = new Uint8ClampedArray(256 * 3);
    for (let i = 0; i < 256; i++) {
      const t = i / 255; let k = 0; while (k < st.length - 2 && t > st[k + 1][0]) k++;
      const a = st[k], b = st[k + 1], u = Math.min(1, Math.max(0, (t - a[0]) / (b[0] - a[0])));
      for (let c = 0; c < 3; c++) out[i * 3 + c] = a[c + 1] + (b[c + 1] - a[c + 1]) * u;
    }
    return out;
  }
  const LUT = {};
  let off = null;
  function blit(ctx, box, n, fillPx, smooth) {
    if (!off) off = document.createElement("canvas");
    if (off.width !== n || off.height !== n) { off.width = n; off.height = n; }
    const o = off.getContext("2d"), img = o.createImageData(n, n);
    fillPx(img.data);
    o.putImageData(img, 0, 0);
    ctx.save(); ctx.imageSmoothingEnabled = smooth !== false; ctx.imageSmoothingQuality = "high";
    ctx.drawImage(off, box.x, box.y, box.w, box.h); ctx.restore();
  }
  /** 2D 세기 영상을 box에 그린다. q: {map "aerial"|"gray"|"heat"|"div", lo=0, hi=자동(최댓값과 1 중 큰 값), smooth} */
  LT.put = function (ctx, box, I, n, q = {}) {
    const L = LUT[q.map || "aerial"] || (LUT[q.map || "aerial"] = lut(q.map || "aerial"));
    const lo = q.lo || 0; let hi = q.hi; if (hi == null) { hi = 1; for (let i = 0; i < I.length; i++) if (I[i] > hi) hi = I[i]; }
    blit(ctx, box, n, (d) => { for (let i = 0; i < n * n; i++) { const v = Math.max(0, Math.min(255, Math.round(((I[i] - lo) / (hi - lo)) * 255))) * 3; d[i * 4] = L[v]; d[i * 4 + 1] = L[v + 1]; d[i * 4 + 2] = L[v + 2]; d[i * 4 + 3] = 255; } }, q.smooth);
  };
  /** 문턱 모델로 남는 레지스트를 색으로 칠한다. tone "line": I < T인 곳, "space": I > T인 곳이 뚫린다(나머지가 레지스트). q: {color "#rrggbb", alpha, soft} */
  LT.putResist = function (ctx, box, I, n, T, q = {}) {
    const hex = (q.color || LT.matColor("pr")).replace("#", ""), r = parseInt(hex.slice(0, 2), 16) || 226, g = parseInt(hex.slice(2, 4), 16) || 100, b = parseInt(hex.slice(4, 6), 16) || 138;
    const soft = q.soft || 0.03, al = (q.alpha != null ? q.alpha : 1) * 255;
    blit(ctx, box, n, (d) => { for (let i = 0; i < n * n; i++) { const a = Math.max(0, Math.min(1, (T - I[i]) / soft + 0.5)); d[i * 4] = r; d[i * 4 + 1] = g; d[i * 4 + 2] = b; d[i * 4 + 3] = a * al; } });
  };
  /** 등고선을 box에 그린다. q: {color, width, dash} */
  LT.drawContour = function (ctx, box, I, n, L, thr, q = {}) {
    const s = LT.contours(I, n, L, thr), kx = box.w / L, ky = box.h / L;
    ctx.save(); ctx.beginPath(); ctx.rect(box.x, box.y, box.w, box.h); ctx.clip();
    ctx.strokeStyle = q.color || "#fff"; ctx.lineWidth = q.width || 1.6; ctx.setLineDash(q.dash || []); ctx.lineCap = "round";
    ctx.beginPath();
    for (let i = 0; i < s.length; i += 4) { ctx.moveTo(box.x + s[i] * kx, box.y + s[i + 1] * ky); ctx.lineTo(box.x + s[i + 2] * kx, box.y + s[i + 3] * ky); }
    ctx.stroke(); ctx.restore();
  };
  /** 사각형 도형(레이아웃·마스크)을 box에 그린다. q: {fill, stroke, width, dash, subFill} */
  LT.drawRects = function (ctx, box, rects, L, q = {}) {
    const k = box.w / L, ky = box.h / L;
    ctx.save(); ctx.beginPath(); ctx.rect(box.x, box.y, box.w, box.h); ctx.clip();
    ctx.lineWidth = q.width || 1.2; ctx.setLineDash(q.dash || []);
    rects.forEach((r) => {
      const x = box.x + r.x * k, y = box.y + r.y * ky, w = r.w * k, h = r.h * ky;
      const f = r.sub ? q.subFill : q.fill;
      if (f) { ctx.fillStyle = f; ctx.fillRect(x, y, w, h); }
      if (q.stroke && !r.sub) { ctx.strokeStyle = q.stroke; ctx.strokeRect(x, y, w, h); }
    });
    ctx.restore();
  };
  /** 조명 모양(광원점)을 동공 원 안에 그린다. (cx, cy) 중심, R은 σ = 1의 반지름. q: {color, ring} */
  LT.drawSource = function (ctx, cx, cy, R, pts, q = {}) {
    ctx.save();
    ctx.strokeStyle = q.ring || "rgba(128,128,128,.6)"; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(cx, cy, R, 0, TAU); ctx.stroke();
    ctx.fillStyle = q.color || "#b9a2ff";
    const r = Math.max(1.2, q.r || (R / Math.sqrt(Math.max(8, pts.length))) * 0.55);
    pts.forEach((p) => { ctx.beginPath(); ctx.arc(cx + p.sx * R, cy - p.sy * R, r, 0, TAU); ctx.fill(); });
    ctx.restore();
  };

  /* ------------------------------------------------------------ 이어지는 타깃 LB-28 */
  /** 책 전체가 따라가는 가상의 패턴. 피치 28 nm, 선폭 14 nm 금속 배선 클립(224 × 224 nm, 주기 경계). */
  LT.LB28 = (function () {
    const L = 224, pitch = 28, cd = 14, rects = [];
    const gaps = { 1: [[70, 94]], 3: [[130, 154]], 4: [[40, 64]], 6: [[100, 124], [180, 204]] }; // 선 번호 → 끊긴 구간(끝-끝 24 nm)
    for (let i = 0; i < 8; i++) {
      const x = i * pitch + (pitch - cd) / 2, g = gaps[i] || [];
      let y = 0;
      g.forEach(([a, b]) => { rects.push({ x, y, w: cd, h: a - y }); y = b; });
      rects.push({ x, y, w: cd, h: L - y });
    }
    return {
      L, n: 128, pitch, cd, t2t: 24, rects, tone: "line", type: "binary",
      euv: { wl: 13.5, na: 0.33, nMedium: 1, source: { shape: "dipole", sigmaIn: 0.55, sigmaOut: 0.9, open: 70, orient: "x", n: 11 } },
      arfi: { wl: 193, na: 1.35, nMedium: 1.44, source: { shape: "dipole", sigmaIn: 0.75, sigmaOut: 0.95, open: 40, orient: "x", n: 11 } },
      thr: 0.335, blur: 3, dose: 60, range: 6, frag: 14,
    };
  })();
  /** OPC 연습용 DUV 클립. ArF 건식(193 nm, NA 0.93), 선폭 90 nm. 밀집선·고립선·ㄴ자·선 끝이 한 장에 있다(1024 × 1024 nm). */
  LT.DUV = {
    L: 1024, n: 128, cd: 90, tone: "line", type: "binary",
    rects: [
      { x: 64, y: 96, w: 90, h: 504 }, { x: 244, y: 96, w: 90, h: 504 }, { x: 424, y: 96, w: 90, h: 504 },
      { x: 744, y: 96, w: 90, h: 832 },
      { x: 64, y: 720, w: 450, h: 90 }, { x: 424, y: 810, w: 90, h: 150 },
    ],
    opt: { wl: 193, na: 0.93, nMedium: 1, source: { shape: "annular", sigmaIn: 0.55, sigmaOut: 0.85, n: 11 } },
    thr: 0.3, blur: 15, range: 40, frag: 60,
  };
})(typeof window !== "undefined" ? window : globalThis);
