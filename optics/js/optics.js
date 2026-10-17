/* ==========================================================================
   OpticsBook 광학 수치 라이브러리 — 전역 객체 OPT
   - 복소수, 보간, FFT(1D/2D), 베셀 J1·에어리·회절 한계 MTF, 제르니케
   - 재료 굴절률 n(λ)+ik(λ): Si, SiO2, Si3N4, HfO2, Ta2O5, TiO2, Al2O3, BK7, 폴리머, 컬러 필터, Al, W
   - 전달 행렬법(TMM): R/T/A, 층별 흡수, 깊이별 흡수·전계 분포 (s/p, 비스듬한 입사)
   - 필터 모델(컬러 필터, IR 컷 각도 이동), 컬러맵
   common.js 다음에 classic script로 로드한다: <script src="../js/optics.js"></script>
   모든 파장 단위는 nm, 각도는 라디안(입력 편의 함수 deg 제공). 수치는 교육용 근사이다.
   ========================================================================== */
(function () {
  "use strict";
  const OPT = (window.OPT = {});
  const PI = Math.PI;

  /* ------------------------------------------------------------ complex */
  // 복소수는 {re, im} 객체. 실수만 넘겨도 되는 곳은 OPT.cx()로 변환.
  const C = (OPT.C = {
    of: (re, im = 0) => ({ re, im }),
    add: (a, b) => ({ re: a.re + b.re, im: a.im + b.im }),
    sub: (a, b) => ({ re: a.re - b.re, im: a.im - b.im }),
    mul: (a, b) => ({ re: a.re * b.re - a.im * b.im, im: a.re * b.im + a.im * b.re }),
    div: (a, b) => { const d = b.re * b.re + b.im * b.im; return { re: (a.re * b.re + a.im * b.im) / d, im: (a.im * b.re - a.re * b.im) / d }; },
    scale: (a, s) => ({ re: a.re * s, im: a.im * s }),
    conj: (a) => ({ re: a.re, im: -a.im }),
    neg: (a) => ({ re: -a.re, im: -a.im }),
    abs: (a) => Math.hypot(a.re, a.im),
    abs2: (a) => a.re * a.re + a.im * a.im,
    arg: (a) => Math.atan2(a.im, a.re),
    exp: (a) => { const e = Math.exp(a.re); return { re: e * Math.cos(a.im), im: e * Math.sin(a.im) }; },
    cis: (phi) => ({ re: Math.cos(phi), im: Math.sin(phi) }),
    sqrt: (a) => {
      const r = Math.hypot(a.re, a.im);
      let re = Math.sqrt((r + a.re) / 2), im = Math.sqrt(Math.max(0, (r - a.re) / 2));
      if (a.im < 0) im = -im;
      return { re, im };
    },
    inv: (a) => C.div({ re: 1, im: 0 }, a),
  });
  OPT.cx = (v) => (typeof v === "number" ? { re: v, im: 0 } : v);

  /* ------------------------------------------------------------ utils */
  OPT.deg = (d) => (d * PI) / 180;
  OPT.rad2deg = (r) => (r * 180) / PI;
  OPT.linspace = (a, b, n) => Array.from({ length: n }, (_, i) => (n === 1 ? a : a + ((b - a) * i) / (n - 1)));
  /** 정렬된 표 [[x, y], ...]에서 선형 보간 (범위 밖은 끝값) */
  OPT.interp = function (table, x, col = 1) {
    if (x <= table[0][0]) return table[0][col];
    const last = table[table.length - 1];
    if (x >= last[0]) return last[col];
    let lo = 0, hi = table.length - 1;
    while (hi - lo > 1) { const m = (lo + hi) >> 1; if (table[m][0] <= x) lo = m; else hi = m; }
    const a = table[lo], b = table[hi], t = (x - a[0]) / (b[0] - a[0]);
    return a[col] + (b[col] - a[col]) * t;
  };
  OPT.sinc = (x) => (Math.abs(x) < 1e-9 ? 1 : Math.sin(PI * x) / (PI * x)); // 정규화 sinc

  /* ------------------------------------------------------------ special functions */
  /** 1종 베셀 함수 J0, J1 (Numerical Recipes 다항 근사, 오차 ~1e-8) */
  OPT.besselJ0 = function (x) {
    const ax = Math.abs(x);
    if (ax < 8) {
      const y = x * x;
      const a = 57568490574.0 + y * (-13362590354.0 + y * (651619640.7 + y * (-11214424.18 + y * (77392.33017 + y * -184.9052456))));
      const b = 57568490411.0 + y * (1029532985.0 + y * (9494680.718 + y * (59272.64853 + y * (267.8532712 + y))));
      return a / b;
    }
    const z = 8 / ax, y = z * z, xx = ax - 0.785398164;
    const a = 1 + y * (-0.1098628627e-2 + y * (0.2734510407e-4 + y * (-0.2073370639e-5 + y * 0.2093887211e-6)));
    const b = -0.1562499995e-1 + y * (0.1430488765e-3 + y * (-0.6911147651e-5 + y * (0.7621095161e-6 - y * 0.934935152e-7)));
    return Math.sqrt(0.636619772 / ax) * (Math.cos(xx) * a - z * Math.sin(xx) * b);
  };
  OPT.besselJ1 = function (x) {
    const ax = Math.abs(x);
    if (ax < 8) {
      const y = x * x;
      const a = x * (72362614232.0 + y * (-7895059235.0 + y * (242396853.1 + y * (-2972611.439 + y * (15704.4826 + y * -30.16036606)))));
      const b = 144725228442.0 + y * (2300535178.0 + y * (18583304.74 + y * (99447.43394 + y * (376.9991397 + y))));
      return a / b;
    }
    const z = 8 / ax, y = z * z, xx = ax - 2.356194491;
    const a = 1 + y * (0.183105e-2 + y * (-0.3516396496e-4 + y * (0.2457520174e-5 + y * -0.240337019e-6)));
    const b = 0.04687499995 + y * (-0.2002690873e-3 + y * (0.8449199096e-5 + y * (-0.88228987e-6 + y * 0.105787412e-6)));
    const ans = Math.sqrt(0.636619772 / ax) * (Math.cos(xx) * a - z * Math.sin(xx) * b);
    return x < 0 ? -ans : ans;
  };
  /** 에어리 강도 (정규화, 중심=1). v = π D r / (λ f) = π r / (λ N) */
  OPT.airy = (v) => (Math.abs(v) < 1e-9 ? 1 : Math.pow((2 * OPT.besselJ1(v)) / v, 2));
  /** 원형 개구 회절 한계 MTF. nu: 공간주파수, nuc = 1/(λN) 차단 주파수 */
  OPT.mtfDiff = function (nu, nuc) {
    const x = Math.abs(nu) / nuc;
    if (x >= 1) return 0;
    return (2 / PI) * (Math.acos(x) - x * Math.sqrt(1 - x * x));
  };
  /** 픽셀 개구 MTF: |sinc(ν·a)|, a = 개구 폭(같은 길이 단위) */
  OPT.mtfPixel = (nu, a) => Math.abs(OPT.sinc(nu * a));
  /** 에어리 디스크 첫 영점 반지름 1.22 λ N (λ, 결과 단위 동일) */
  OPT.airyRadius = (lambda, N) => 1.22 * lambda * N;

  /** 제르니케 다항식 (Noll 인덱스 j=1..11, RMS 정규화). rho∈[0,1], theta 라디안 */
  OPT.ZERNIKE_NAMES = { 1: "피스톤", 2: "기울기 X", 3: "기울기 Y", 4: "디포커스", 5: "비점수차 45°", 6: "비점수차 0°", 7: "코마 Y", 8: "코마 X", 9: "트레포일 Y", 10: "트레포일 X", 11: "구면수차" };
  OPT.zernike = function (j, rho, theta) {
    const r2 = rho * rho, s3 = Math.sqrt(3), s6 = Math.sqrt(6), s8 = Math.sqrt(8), s5 = Math.sqrt(5);
    switch (j) {
      case 1: return 1;
      case 2: return 2 * rho * Math.cos(theta);
      case 3: return 2 * rho * Math.sin(theta);
      case 4: return s3 * (2 * r2 - 1);
      case 5: return s6 * r2 * Math.sin(2 * theta);
      case 6: return s6 * r2 * Math.cos(2 * theta);
      case 7: return s8 * (3 * r2 * rho - 2 * rho) * Math.sin(theta);
      case 8: return s8 * (3 * r2 * rho - 2 * rho) * Math.cos(theta);
      case 9: return s8 * r2 * rho * Math.sin(3 * theta);
      case 10: return s8 * r2 * rho * Math.cos(3 * theta);
      case 11: return s5 * (6 * r2 * r2 - 6 * r2 + 1);
      default: return 0;
    }
  };

  /* ------------------------------------------------------------ FFT */
  /** 제자리 radix-2 복소 FFT. re, im: Float64Array (길이 2의 거듭제곱). inverse=true면 1/N 포함 */
  OPT.fft = function (re, im, inverse = false) {
    const n = re.length;
    for (let i = 1, j = 0; i < n; i++) {
      let bit = n >> 1;
      for (; j & bit; bit >>= 1) j ^= bit;
      j ^= bit;
      if (i < j) { let t = re[i]; re[i] = re[j]; re[j] = t; t = im[i]; im[i] = im[j]; im[j] = t; }
    }
    for (let len = 2; len <= n; len <<= 1) {
      const ang = ((inverse ? 2 : -2) * PI) / len, wr = Math.cos(ang), wi = Math.sin(ang);
      for (let i = 0; i < n; i += len) {
        let cr = 1, ci = 0;
        for (let k = 0; k < len / 2; k++) {
          const a = i + k, b = a + len / 2;
          const xr = re[b] * cr - im[b] * ci, xi = re[b] * ci + im[b] * cr;
          re[b] = re[a] - xr; im[b] = im[a] - xi; re[a] += xr; im[a] += xi;
          const t = cr * wr - ci * wi; ci = cr * wi + ci * wr; cr = t;
        }
      }
    }
    if (inverse) for (let i = 0; i < n; i++) { re[i] /= n; im[i] /= n; }
  };
  /** 2D FFT (행 우선 n×n 배열). */
  OPT.fft2 = function (re, im, n, inverse = false) {
    const r = new Float64Array(n), i2 = new Float64Array(n);
    for (let y = 0; y < n; y++) {
      for (let x = 0; x < n; x++) { r[x] = re[y * n + x]; i2[x] = im[y * n + x]; }
      OPT.fft(r, i2, inverse);
      for (let x = 0; x < n; x++) { re[y * n + x] = r[x]; im[y * n + x] = i2[x]; }
    }
    for (let x = 0; x < n; x++) {
      for (let y = 0; y < n; y++) { r[y] = re[y * n + x]; i2[y] = im[y * n + x]; }
      OPT.fft(r, i2, inverse);
      for (let y = 0; y < n; y++) { re[y * n + x] = r[y]; im[y * n + x] = i2[y]; }
    }
  };
  /** 0 주파수를 가운데로 (n×n, 또는 1D면 n2=1) */
  OPT.fftshift = function (a, n, twoD = true) {
    const out = new a.constructor(a.length), h = n >> 1;
    if (!twoD) { for (let i = 0; i < n; i++) out[(i + h) % n] = a[i]; return out; }
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) out[((y + h) % n) * n + ((x + h) % n)] = a[y * n + x];
    return out;
  };

  /* ------------------------------------------------------------ materials */
  const um = (nm) => nm / 1000;
  const sellmeier = (B, Cc) => (nm) => {
    const l2 = um(nm) ** 2;
    let s = 1;
    for (let i = 0; i < B.length; i++) s += (B[i] * l2) / (l2 - Cc[i]);
    return Math.sqrt(s);
  };
  const cauchy = (A, B, Cc = 0) => (nm) => { const l = um(nm); return A + B / (l * l) + Cc / (l ** 4); };

  // 결정질 실리콘: n 표와 흡수 계수 α(cm⁻¹) 표 (Green 2008 등 문헌값 근사)
  const SI_N = [[300, 5.0], [320, 5.04], [340, 5.29], [350, 5.48], [360, 6.0], [370, 6.7], [380, 6.3], [390, 5.9], [400, 5.57], [410, 5.29], [420, 5.08], [430, 4.92], [440, 4.79], [450, 4.67], [460, 4.58], [480, 4.45], [500, 4.30], [520, 4.21], [550, 4.08], [600, 3.94], [650, 3.85], [700, 3.78], [750, 3.73], [800, 3.69], [850, 3.66], [900, 3.63], [950, 3.61], [1000, 3.58], [1050, 3.56], [1100, 3.55], [1150, 3.54], [1200, 3.52]];
  const SI_K_UV = [[300, 4.2], [320, 3.4], [340, 3.0], [350, 2.93], [360, 2.7], [370, 1.65], [380, 0.8], [390, 0.55], [400, 0.303]];
  const SI_ALPHA = [[400, 9.52e4], [410, 6.74e4], [420, 5.0e4], [430, 3.73e4], [440, 2.95e4], [450, 2.55e4], [460, 2.13e4], [480, 1.6e4], [500, 1.11e4], [520, 8.8e3], [550, 6.39e3], [600, 4.14e3], [650, 2.81e3], [700, 1.9e3], [750, 1.3e3], [800, 850], [850, 535], [900, 306], [950, 157], [1000, 64], [1050, 16.3], [1100, 3.5], [1150, 0.32], [1200, 0.022]];
  const SI_LOGA = SI_ALPHA.map(([l, a]) => [l, Math.log(a)]);
  /** 실리콘 흡수 계수 α (1/cm) */
  OPT.siAlpha = function (nm) {
    if (nm < 400) { const k = OPT.interp(SI_K_UV, nm); return (4 * PI * k) / (nm * 1e-7); }
    return Math.exp(OPT.interp(SI_LOGA, nm));
  };
  /** 실리콘 흡수 깊이 1/α (µm) */
  OPT.siDepth = (nm) => 1e4 / OPT.siAlpha(nm);

  const tableNK = (tab) => (nm) => ({ re: OPT.interp(tab, nm, 1), im: OPT.interp(tab, nm, 2) });
  const real = (f) => (nm) => ({ re: f(nm), im: 0 });

  /** 컬러 필터(안료형) 투과율 근사 — 두께 ~0.6 µm 기준. NIR(>~780 nm)에서는 모두 다시 투과한다. */
  const logistic = (x, x0, w) => 1 / (1 + Math.exp(-(x - x0) / w));
  OPT.cfT = function (color, nm) {
    const nir = logistic(nm, 790, 18);
    let v;
    if (color === "R") v = 0.02 + 0.92 * logistic(nm, 588, 11);
    else if (color === "G") v = 0.03 + 0.86 * Math.exp(-Math.pow((nm - 535) / 52, 2)) + 0.85 * logistic(nm, 760, 16);
    else if (color === "B") v = 0.03 + 0.86 * Math.exp(-Math.pow((nm - 455) / 45, 2)) + 0.85 * logistic(nm, 800, 18);
    else if (color === "W" || color === "C") v = 0.95;
    else v = 1;
    if (color === "R") v = Math.max(v, 0.94 * nir);
    return Math.min(0.97, v);
  };
  const CF_D = 600; // nm, 기준 두께
  const cfIndex = (color) => (nm) => {
    const T = Math.max(1e-4, OPT.cfT(color, nm));
    const alpha = -Math.log(T) / CF_D; // 1/nm
    return { re: 1.58 + 0.012 / um(nm) ** 2, im: (alpha * nm) / (4 * PI) };
  };

  OPT.MATERIALS = {
    air: { name: "공기", n: () => ({ re: 1, im: 0 }) },
    Si: { name: "실리콘 (c-Si)", n: (nm) => ({ re: OPT.interp(SI_N, nm), im: (OPT.siAlpha(nm) * nm * 1e-7) / (4 * PI) }) },
    SiO2: { name: "SiO₂", n: real(sellmeier([0.6961663, 0.4079426, 0.8974794], [0.0684043 ** 2, 0.1162414 ** 2, 9.896161 ** 2])) },
    Si3N4: { name: "Si₃N₄", n: real((nm) => { const l2 = um(nm) ** 2; return Math.sqrt(1 + (3.0249 * l2) / (l2 - 0.1353406 ** 2) + (40314 * l2) / (l2 - 1239.842 ** 2)); }) },
    HfO2: { name: "HfO₂", n: real(cauchy(1.88, 0.0185)) },
    Ta2O5: { name: "Ta₂O₅", n: real(cauchy(2.06, 0.025)) },
    TiO2: { name: "TiO₂", n: real(cauchy(2.25, 0.06)) },
    Al2O3: { name: "Al₂O₃", n: real(cauchy(1.62, 0.007)) },
    MgF2: { name: "MgF₂", n: real(cauchy(1.37, 0.0035)) },
    BK7: { name: "BK7 유리", n: real(sellmeier([1.03961212, 0.231792344, 1.01046945], [0.00600069867, 0.0200179144, 103.560653])) },
    polymer: { name: "마이크로렌즈 수지", n: real(cauchy(1.58, 0.008)) },
    lowN: { name: "저굴절 산화막(n≈1.25)", n: real(cauchy(1.24, 0.002)) },
    CF_R: { name: "R 컬러 필터", n: cfIndex("R") },
    CF_G: { name: "G 컬러 필터", n: cfIndex("G") },
    CF_B: { name: "B 컬러 필터", n: cfIndex("B") },
    Al: { name: "알루미늄", n: tableNK([[300, 0.28, 3.61], [400, 0.49, 4.86], [500, 0.77, 6.08], [600, 1.2, 7.26], [700, 1.83, 8.31], [800, 2.8, 8.45], [900, 2.06, 8.3], [1000, 1.35, 9.58], [1200, 1.2, 11.5]]) },
    W: { name: "텅스텐", n: tableNK([[300, 3.3, 2.5], [400, 3.4, 2.7], [500, 3.5, 2.8], [600, 3.6, 2.9], [700, 3.7, 2.9], [800, 3.7, 3.0], [1000, 3.3, 3.2], [1200, 2.9, 3.6]]) },
  };
  /** 굴절률 조회: 재료 이름(문자열) | 실수 | {re,im} → {re, im} */
  OPT.n = function (mat, nm) {
    if (typeof mat === "number") return { re: mat, im: 0 };
    if (typeof mat === "string") {
      const m = OPT.MATERIALS[mat];
      if (!m) throw new Error("unknown material " + mat);
      return m.n(nm);
    }
    if (typeof mat === "function") return OPT.cx(mat(nm));
    return mat;
  };

  /* ------------------------------------------------------------ Fresnel (single interface) */
  /** 단일 경계면 프레넬 계수. n1,n2: 복소 또는 실수, theta1: 입사각(rad). → {rs,rp,ts,tp,Rs,Rp,Ts,Tp,cos2} */
  OPT.fresnel = function (n1, n2, theta1) {
    n1 = OPT.cx(n1); n2 = OPT.cx(n2);
    const beta = C.mul(n1, { re: Math.sin(theta1), im: 0 });
    const cos1 = OPT.forwardCos(n1, beta), cos2 = OPT.forwardCos(n2, beta);
    const a = C.mul(n1, cos1), b = C.mul(n2, cos2);
    const rs = C.div(C.sub(a, b), C.add(a, b)), ts = C.div(C.scale(a, 2), C.add(a, b));
    const pa = C.mul(n2, cos1), pb = C.mul(n1, cos2);
    const rp = C.div(C.sub(pa, pb), C.add(pa, pb)), tp = C.div(C.scale(a, 2), C.add(pa, pb));
    const Rs = C.abs2(rs), Rp = C.abs2(rp);
    const Ts = (C.abs2(ts) * b.re) / a.re;
    const Tp = (C.abs2(tp) * C.mul(n2, C.conj(cos2)).re) / C.mul(n1, C.conj(cos1)).re;
    return { rs, rp, ts, tp, Rs, Rp, Ts, Tp, R: (Rs + Rp) / 2, T: (Ts + Tp) / 2, cos2 };
  };
  /** 매질 n에서 접선 성분 β = n0 sinθ0 가 보존될 때 순방향 cosθ (감쇠 또는 +z 진행 가지) */
  OPT.forwardCos = function (n, beta) {
    n = OPT.cx(n);
    const s = C.div(beta, n);
    let c = C.sqrt(C.sub({ re: 1, im: 0 }, C.mul(s, s)));
    const nc = C.mul(n, c);
    const forward = Math.abs(nc.im) > 1e-12 * (Math.abs(nc.re) + 1e-30) ? nc.im > 0 : nc.re > 0;
    if (!forward) c = C.neg(c);
    return c;
  };

  /* ------------------------------------------------------------ TMM */
  /**
   * 다층 박막 전달 행렬법 (Byrnes 'tmm' 패키지와 같은 규약, n+ik, e^{i(kz−ωt)}).
   * stack: [{m: 재료|n, d: 두께 nm}, ...] — 첫/마지막은 반무한(d 무시).
   * opts: {theta: 입사각 rad (첫 매질 기준), pol: 's'|'p'|'u'(비편광 평균)}
   * 반환: {R, T, A, layerA[], r, t, ...내부 정보} — layerA[i]: i번째 층 흡수율(양 끝은 0)
   */
  OPT.tmm = function (stack, nm, opts = {}) {
    const pol = opts.pol || "s";
    if (pol === "u") {
      const s = OPT.tmm(stack, nm, Object.assign({}, opts, { pol: "s" }));
      const p = OPT.tmm(stack, nm, Object.assign({}, opts, { pol: "p" }));
      return { R: (s.R + p.R) / 2, T: (s.T + p.T) / 2, A: (s.A + p.A) / 2, layerA: s.layerA.map((v, i) => (v + p.layerA[i]) / 2), s, p };
    }
    const th0 = opts.theta || 0;
    const N = stack.length;
    const n = stack.map((L) => OPT.n(L.m, nm));
    const d = stack.map((L, i) => (i === 0 || i === N - 1 ? 0 : L.d));
    const beta = C.mul(n[0], { re: Math.sin(th0), im: 0 });
    const cos = n.map((ni) => OPT.forwardCos(ni, beta));
    const k0 = (2 * PI) / nm;
    const kz = n.map((ni, i) => C.scale(C.mul(ni, cos[i]), k0));
    const delta = kz.map((k, i) => C.scale(k, d[i]));
    // 두꺼운 흡수층에서 overflow 방지
    for (let i = 1; i < N - 1; i++) if (delta[i].im > 35) delta[i] = { re: delta[i].re, im: 35 };
    const iface = (i, j) => {
      if (pol === "s") {
        const a = C.mul(n[i], cos[i]), b = C.mul(n[j], cos[j]);
        return { r: C.div(C.sub(a, b), C.add(a, b)), t: C.div(C.scale(a, 2), C.add(a, b)) };
      }
      const a = C.mul(n[j], cos[i]), b = C.mul(n[i], cos[j]);
      return { r: C.div(C.sub(a, b), C.add(a, b)), t: C.div(C.scale(C.mul(n[i], cos[i]), 2), C.add(a, b)) };
    };
    const mm = (A, B) => [
      [C.add(C.mul(A[0][0], B[0][0]), C.mul(A[0][1], B[1][0])), C.add(C.mul(A[0][0], B[0][1]), C.mul(A[0][1], B[1][1]))],
      [C.add(C.mul(A[1][0], B[0][0]), C.mul(A[1][1], B[1][0])), C.add(C.mul(A[1][0], B[0][1]), C.mul(A[1][1], B[1][1]))],
    ];
    const ifs = [];
    for (let i = 0; i < N - 1; i++) ifs.push(iface(i, i + 1));
    const Ms = [null];
    for (let i = 1; i < N - 1; i++) {
      const em = C.exp(C.mul({ re: 0, im: -1 }, delta[i])), ep = C.exp(C.mul({ re: 0, im: 1 }, delta[i]));
      const it = C.inv(ifs[i].t);
      const P = [[em, { re: 0, im: 0 }], [{ re: 0, im: 0 }, ep]];
      const Q = [[C.mul(it, { re: 1, im: 0 }), C.mul(it, ifs[i].r)], [C.mul(it, ifs[i].r), C.mul(it, { re: 1, im: 0 })]];
      Ms.push(mm(P, Q));
    }
    const it0 = C.inv(ifs[0].t);
    let Mt = [[it0, C.mul(it0, ifs[0].r)], [C.mul(it0, ifs[0].r), it0]];
    for (let i = 1; i < N - 1; i++) Mt = mm(Mt, Ms[i]);
    const r = C.div(Mt[1][0], Mt[0][0]);
    const t = C.inv(Mt[0][0]);
    // 각 층 시작점의 정방향/역방향 진폭 (v, w)
    const vw = new Array(N);
    vw[N - 1] = [t, { re: 0, im: 0 }];
    for (let i = N - 2; i >= 1; i--) {
      const M = Ms[i], v = vw[i + 1];
      vw[i] = [C.add(C.mul(M[0][0], v[0]), C.mul(M[0][1], v[1])), C.add(C.mul(M[1][0], v[0]), C.mul(M[1][1], v[1]))];
    }
    vw[0] = [{ re: 1, im: 0 }, r];
    const den = pol === "s" ? C.mul(n[0], cos[0]).re : C.mul(n[0], C.conj(cos[0])).re;
    const poyn = (i, v, w) => {
      if (pol === "s") return C.mul(C.mul(C.mul(n[i], cos[i]), C.conj(C.add(v, w))), C.sub(v, w)).re / den;
      return C.mul(C.mul(C.mul(n[i], C.conj(cos[i])), C.add(v, w)), C.conj(C.sub(v, w))).re / den;
    };
    const R = C.abs2(r);
    const T = pol === "s" ? (C.abs2(t) * C.mul(n[N - 1], cos[N - 1]).re) / den : (C.abs2(t) * C.mul(n[N - 1], C.conj(cos[N - 1])).re) / den;
    const P = [];
    for (let i = 1; i < N - 1; i++) P[i] = poyn(i, vw[i][0], vw[i][1]);
    P[N - 1] = T;
    const layerA = new Array(N).fill(0);
    for (let i = 1; i < N - 1; i++) layerA[i] = Math.max(0, P[i] - P[i + 1]);
    const A = Math.max(0, 1 - R - T);
    return { R, T, A, layerA, r, t, n, cos, kz, d, vw, pol, nm, den, beta };
  };
  /**
   * TMM 결과에서 위치별 값. layer i(1..N-2, 또는 마지막 반무한 층 N-1) 안의 깊이 z(nm, 층 시작 기준).
   * → {absor: 단위 nm당 흡수(입사 파워 정규화), E2: |E|² (입사 |E|=1 기준)}
   */
  OPT.tmmAt = function (res, i, z) {
    const { n, cos, kz, vw, pol, den, beta } = res;
    const ph = C.mul({ re: 0, im: 1 }, C.scale(kz[i], z));
    const Ef = C.mul(vw[i][0], C.exp(ph)), Eb = C.mul(vw[i][1], C.exp(C.neg(ph)));
    if (pol === "s") {
      const E2 = C.abs2(C.add(Ef, Eb));
      const absor = C.mul(C.mul(n[i], cos[i]), C.scale(kz[i], E2)).im / den;
      return { absor, E2 };
    }
    const sin = C.div(beta, n[i]);
    const Ex = C.mul(cos[i], C.sub(Ef, Eb)), Ez = C.mul(C.neg(C.add(Ef, Eb)), sin);
    const term = C.sub(C.scale(kz[i], C.abs2(C.sub(Ef, Eb))), C.scale(C.conj(kz[i]), C.abs2(C.add(Ef, Eb))));
    const absor = C.mul(C.mul(n[i], C.conj(cos[i])), term).im / den;
    return { absor, E2: C.abs2(Ex) + C.abs2(Ez) };
  };
  /** 스택 전체의 깊이 프로파일 샘플링. → [{z(전체 누적 nm), layer, absor, E2}] (첫 매질 제외, 마지막 매질은 tail nm까지) */
  OPT.tmmProfile = function (res, step = 2, tail = 0) {
    const out = [];
    let z0 = 0;
    const N = res.n.length;
    for (let i = 1; i < N; i++) {
      const D = i === N - 1 ? tail : res.d[i];
      for (let z = 0; z <= D; z += step) out.push(Object.assign({ z: z0 + z, layer: i }, OPT.tmmAt(res, i, z)));
      z0 += D;
    }
    return out;
  };

  /* ------------------------------------------------------------ filters */
  /** 간섭형 IR 컷 필터: 컷오프 파장의 각도 이동 λ(θ) = λ0·sqrt(1 − (sinθ/n_eff)²) */
  OPT.irCutEdge = (lambda0, theta, neff = 1.8) => lambda0 * Math.sqrt(1 - Math.pow(Math.sin(theta) / neff, 2));
  OPT.irCutT = function (nm, theta = 0, lambda0 = 650, width = 9, neff = 1.8) {
    const e = OPT.irCutEdge(lambda0, theta, neff);
    const uv = logistic(nm, 400, 6);
    return 0.96 * uv * (1 - logistic(nm, e, width));
  };
  /** 흡수형(블루 글라스) IR 필터: 각도 무관, 경로 길이만 1/cosθ */
  OPT.blueGlassT = function (nm, theta = 0) {
    const a = Math.max(0, (nm - 560) / 90);
    return 0.95 * Math.exp(-(a * a * 1.2) / Math.cos(theta));
  };
  /** 사람 눈 명소시 비시감도 V(λ) 근사 (CIE 1924 가우시안 합 근사) */
  OPT.Vlambda = (nm) => 1.019 * Math.exp(-285.4 * Math.pow(nm / 1000 - 0.559, 2));
  /** 흑체 복사 상대 스펙트럼 (T 켈빈), 560 nm에서 1로 정규화 */
  OPT.planck = function (nm, T) {
    const h = 6.62607015e-34, c = 2.99792458e8, k = 1.380649e-23;
    const f = (l) => 1 / (Math.pow(l, 5) * (Math.exp((h * c) / (l * k * T)) - 1));
    return f(nm * 1e-9) / f(560e-9);
  };

  /* ------------------------------------------------------------ colormaps */
  const CMAPS = {
    viridis: [[68, 1, 84], [72, 40, 120], [62, 74, 137], [49, 104, 142], [38, 130, 142], [31, 158, 137], [53, 183, 121], [109, 205, 89], [180, 222, 44], [253, 231, 37]],
    inferno: [[0, 0, 4], [31, 12, 72], [85, 15, 109], [136, 34, 106], [186, 54, 85], [227, 89, 51], [249, 140, 10], [249, 201, 50], [252, 255, 164]],
    rdbu: [[33, 102, 172], [67, 147, 195], [146, 197, 222], [209, 229, 240], [247, 247, 247], [253, 219, 199], [244, 165, 130], [214, 96, 77], [178, 24, 43]],
    gray: [[0, 0, 0], [255, 255, 255]],
  };
  /** 컬러맵: OPT.cmap('inferno', t∈[0,1]) → [r,g,b]. 'rdbu'는 발산형(0.5=흰색, 전기장 부호 표시용) */
  OPT.cmap = function (name, t) {
    const m = CMAPS[name] || CMAPS.viridis;
    t = Math.min(1, Math.max(0, isFinite(t) ? t : 0)) * (m.length - 1);
    const i = Math.min(m.length - 2, Math.floor(t)), f = t - i;
    return [0, 1, 2].map((k) => Math.round(m[i][k] + (m[i + 1][k] - m[i][k]) * f));
  };
  /** 2D 스칼라 배열을 캔버스에 그리기 (nx×ny, 행 우선). box={x,y,w,h}, map: 값→t 함수 */
  OPT.drawField = function (ctx, data, nx, ny, box, map, cmapName = "inferno") {
    const off = document.createElement("canvas");
    off.width = nx; off.height = ny;
    const octx = off.getContext("2d");
    const img = octx.createImageData(nx, ny);
    for (let i = 0; i < nx * ny; i++) {
      const [r, g, b] = OPT.cmap(cmapName, map(data[i]));
      img.data[4 * i] = r; img.data[4 * i + 1] = g; img.data[4 * i + 2] = b; img.data[4 * i + 3] = 255;
    }
    octx.putImageData(img, 0, 0);
    ctx.save();
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(off, box.x, box.y, box.w, box.h);
    ctx.restore();
  };
})();
