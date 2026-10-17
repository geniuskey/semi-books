/* Copyright (c) 2026 geniuskey and TCADBook contributors.
   Executable code: MIT (see ../LICENSE-MIT).
   Educational content and illustrations: CC-BY-4.0 (see ../LICENSE.md). */
/* ==========================================================================
   TCADBook 엔진 코어 — 전역 객체 TC
   물성(실리콘·절연막), 통계, 이동도·재결합·충돌 이온화 모델, 수치 기본 도구,
   필드 시각화(컬러맵·등고선·구조 단면). 공정(process.js)·1D 소자(device1d.js)·
   2D 소자(device2d.js)가 이 위에 붙는다.
   단위: 길이 nm(API) / cm(모델 내부), 농도 cm⁻³, 전압 V, 온도 K, 에너지 eV,
   이동도 cm²/V·s, 전계 V/cm, 전류 밀도 A/cm², 시간 s.
   ========================================================================== */
(function () {
  "use strict";
  const TC = (window.TC = window.TC || {});

  /* ------------------------------------------------------------ 상수 */
  TC.q = 1.602176634e-19;     // C
  TC.kB = 8.617333262e-5;     // eV/K
  TC.eps0 = 8.8541878128e-14; // F/cm
  TC.h = 6.62607015e-34; TC.hbar = 1.054571817e-34; TC.m0 = 9.1093837015e-31;
  TC.NM = 1e-7;               // 1 nm = 1e-7 cm
  TC.vt = (T = 300) => TC.kB * T; // 열전압 V (300 K에서 0.02585)

  /* ------------------------------------------------------------ 재질 */
  // eps: 비유전율, Eg: 밴드갭(eV, 300 K), chi: 전자 친화도(eV)
  TC.MAT = {
    si:   { name: "실리콘",        en: "Silicon",        eps: 11.7, Eg: 1.12, chi: 4.05, semi: true },
    ge:   { name: "저마늄",        en: "Germanium",      eps: 16.0, Eg: 0.66, chi: 4.0,  semi: true },
    sige: { name: "실리콘저마늄",  en: "SiGe (30%)",     eps: 12.9, Eg: 0.95, chi: 4.05, semi: true },
    gaas: { name: "갈륨비소",      en: "GaAs",           eps: 12.9, Eg: 1.42, chi: 4.07, semi: true },
    sic:  { name: "탄화규소",      en: "4H-SiC",         eps: 9.7,  Eg: 3.26, chi: 3.6,  semi: true },
    ox:   { name: "실리콘 산화막", en: "SiO₂",           eps: 3.9,  Eg: 9.0,  chi: 0.95 },
    nit:  { name: "실리콘 질화막", en: "Si₃N₄",          eps: 7.5,  Eg: 5.0,  chi: 2.1 },
    hk:   { name: "고유전막",      en: "HfO₂",           eps: 22,   Eg: 5.8,  chi: 2.0 },
    poly: { name: "다결정 실리콘", en: "Poly-Si",        eps: 11.7, Eg: 1.12, chi: 4.05, semi: true },
    tin:  { name: "질화티타늄",    en: "TiN",            metal: true, wf: 4.6 },
    al:   { name: "알루미늄",      en: "Al",             metal: true, wf: 4.1 },
    w:    { name: "텅스텐",        en: "W",              metal: true, wf: 4.55 },
    cu:   { name: "구리",          en: "Cu",             metal: true, wf: 4.65 },
  };

  /* ------------------------------------------------------------ 실리콘 밴드·통계 */
  /** 밴드갭(eV), Varshni: Eg(T) = Eg0 − aT²/(T+b) */
  TC.Eg = (T = 300) => 1.1696 - (4.73e-4 * T * T) / (T + 636);
  /** 유효 상태 밀도(cm⁻³) */
  TC.Nc = (T = 300) => 2.86e19 * Math.pow(T / 300, 1.5);
  TC.Nv = (T = 300) => 3.10e19 * Math.pow(T / 300, 1.5);
  /** 진성 캐리어 농도(cm⁻³). 300 K에서 1.0e10이 되도록 맞춘 TCAD 관례값 */
  TC.ni = function (T = 300) {
    const kt = TC.kB * T, k3 = TC.kB * 300;
    return 1.0e10 * Math.pow(T / 300, 1.5) * Math.exp(-(TC.Eg(T) / (2 * kt) - TC.Eg(300) / (2 * k3)));
  };
  /** 밴드갭 좁아짐 ΔEg(eV), Slotboom: 고농도 도핑에서 실효 ni가 커진다 */
  TC.bgn = function (N) {
    N = Math.abs(N);
    if (N < 1e15) return 0;
    const l = Math.log(N / 1.3e17);
    return 6.92e-3 * (l + Math.sqrt(l * l + 0.5));
  };
  TC.niEff = (N, T = 300) => TC.ni(T) * Math.exp(TC.bgn(N) / (2 * TC.kB * T));
  /** 진성 준위가 밴드갭 중앙에서 벗어난 양(eV, + 이면 위쪽): Ei − midgap */
  TC.EiOffset = (T = 300) => 0.5 * TC.kB * T * Math.log(TC.Nv(T) / TC.Nc(T));

  /** 페르미-디랙 적분 F_{1/2}(η)를 Nc로 정규화한 값 (η ≪ 0 에서 e^η). Bednarczyk 근사, 오차 < 0.4% */
  TC.fd12 = function (eta) {
    if (eta < -40) return Math.exp(eta);
    const nu = Math.pow(eta, 4) + 50 + 33.6 * eta * (1 - 0.68 * Math.exp(-0.17 * (eta + 1) * (eta + 1)));
    return 1 / (Math.exp(-eta) + (0.75 * Math.sqrt(Math.PI)) / Math.pow(nu, 3 / 8));
  };
  /** 페르미 준위(η = (Ef−Ec)/kT)에서의 전자 농도. 볼츠만이면 Nc·e^η */
  TC.nFD = (eta, T = 300) => TC.Nc(T) * TC.fd12(eta);
  TC.nMB = (eta, T = 300) => TC.Nc(T) * Math.exp(eta);
  /** 페르미-디랙 점유 확률 */
  TC.fermi = (E, Ef, T = 300) => 1 / (1 + Math.exp((E - Ef) / (TC.kB * T)));
  /** 불완전 이온화: 이온화된 비율. dE(eV)는 도너 Ec−Ed(인 0.045, 비소 0.054) 또는 억셉터 Ea−Ev(붕소 0.045) */
  TC.ionFrac = function (N, T = 300, dE = 0.045, g = 2, Nband) {
    // 전하 중성에서 N+ = N/(1+g·n/Nc·e^{dE/kT}), n ≈ N+ 를 반복으로 푼다
    Nband = Nband || TC.Nc(T);
    const kt = TC.kB * T, c = (g / Nband) * Math.exp(dE / kt);
    // N+ = N/(1 + c·N+)  → c·N+² + N+ − N = 0
    const Np = (-1 + Math.sqrt(1 + 4 * c * N)) / (2 * c);
    return Np / N;
  };
  /** 중성 영역의 평형 캐리어(볼츠만): net = Nd − Na (cm⁻³) → {n, p, psi(V, Ei 기준 전위)} */
  TC.equil = function (net, T = 300, ni) {
    ni = ni || TC.ni(T);
    const h = net / 2, n = h + Math.sqrt(h * h + ni * ni);
    const nn = net >= 0 ? n : (ni * ni) / (-h + Math.sqrt(h * h + ni * ni));
    const p = (ni * ni) / nn;
    return { n: nn, p, psi: TC.vt(T) * Math.log(nn / ni) };
  };
  /** 내부 전위(V): pn 접합 Vbi = kT/q · ln(NaNd/ni²) */
  TC.vbi = (Na, Nd, T = 300) => TC.vt(T) * Math.log((Na * Nd) / Math.pow(TC.ni(T), 2));

  /* ------------------------------------------------------------ 이동도 모델 */
  const MOB = {
    // Caughey-Thomas (Arora 형식 계수, 300 K): μ = μmin + (μmax − μmin)/(1 + (N/Nref)^α)
    ct: { n: { min: 68.5, max: 1414, Nref: 9.2e16, a: 0.711, tmax: -2.5 }, p: { min: 44.9, max: 470.5, Nref: 2.23e17, a: 0.719, tmax: -2.2 } },
    // Masetti (인·비소 / 붕소)
    ma: { n: { min1: 52.2, min2: 52.2, mu1: 43.4, max: 1417, Pc: 0, Cr: 9.68e16, Cs: 3.43e20, a: 0.68, b: 2.0, tmax: -2.5 },
          p: { min1: 44.9, min2: 0, mu1: 29.0, max: 470.5, Pc: 9.23e16, Cr: 2.23e17, Cs: 6.1e20, a: 0.719, b: 2.0, tmax: -2.2 } },
    // Lombardi 표면 이동도 (Sentaurus 기본값 계열)
    lo: { n: { B: 4.75e7, C: 5.8e2, lam: 0.125, k: 1, delta: 5.82e14 }, p: { B: 9.925e6, C: 2.947e3, lam: 0.0317, k: 1, delta: 2.0546e14 } },
    // 속도 포화 (Canali)
    vs: { n: { vsat: 1.07e7, ve: 0.87, beta: 1.109, be: 0.66 }, p: { vsat: 8.37e6, ve: 0.52, beta: 1.213, be: 0.17 } },
  };
  TC.MOB = MOB;
  /** 도핑 의존 이동도(Caughey-Thomas). N = 총 도핑(Na+Nd), carrier "n"|"p" */
  TC.mobCT = function (N, carrier = "n", T = 300) {
    const c = MOB.ct[carrier], max = c.max * Math.pow(T / 300, c.tmax);
    return c.min + (max - c.min) / (1 + Math.pow(Math.abs(N) / c.Nref, c.a));
  };
  /** 도핑 의존 이동도(Masetti). 고농도에서 한 번 더 떨어진다 */
  TC.mobMasetti = function (N, carrier = "n", T = 300) {
    const c = MOB.ma[carrier], max = c.max * Math.pow(T / 300, c.tmax);
    N = Math.max(Math.abs(N), 1);
    return c.min1 * Math.exp(-c.Pc / N) + (max - c.min2) / (1 + Math.pow(N / c.Cr, c.a)) - c.mu1 / (1 + Math.pow(c.Cs / N, c.b));
  };
  /** 수직 전계 Eperp(V/cm)에 의한 표면 이동도 감소(Lombardi). mu0: 벌크 이동도. Matthiessen 합 */
  TC.mobSurface = function (mu0, Eperp, N = 1e17, carrier = "n", T = 300) {
    const c = MOB.lo[carrier], F = Math.max(Math.abs(Eperp), 1e2);
    const muAc = c.B / F + (c.C * Math.pow(Math.abs(N) || 1, c.lam)) / (Math.pow(F, 1 / 3) * Math.pow(T / 300, c.k));
    const muSr = c.delta / (F * F);
    return 1 / (1 / mu0 + 1 / muAc + 1 / muSr);
  };
  /** 포화 속도(cm/s) */
  TC.vsat = (carrier = "n", T = 300) => MOB.vs[carrier].vsat * Math.pow(300 / T, MOB.vs[carrier].ve);
  /** 평행 전계 E(V/cm)에 의한 속도 포화(Canali): μ(E) = μ0 / (1 + (μ0E/vsat)^β)^{1/β} */
  TC.mobField = function (mu0, E, carrier = "n", T = 300) {
    const c = MOB.vs[carrier], beta = c.beta * Math.pow(T / 300, c.be), vs = TC.vsat(carrier, T);
    return mu0 / Math.pow(1 + Math.pow((mu0 * Math.abs(E)) / vs, beta), 1 / beta);
  };
  /** 확산 계수(아인슈타인 관계) D = μ·kT/q */
  TC.einstein = (mu, T = 300) => mu * TC.vt(T);

  /* ------------------------------------------------------------ 재결합·생성 */
  /** 도핑 의존 SRH 수명(Scharfetter): τ = τmax / (1 + N/Nref) */
  TC.tauSRH = (N, tauMax = 1e-5, Nref = 5e16) => tauMax / (1 + Math.abs(N) / Nref);
  /** SRH 재결합률(cm⁻³s⁻¹). Et: 트랩 준위 − Ei (eV) */
  TC.srh = function (n, p, ni, taun = 1e-7, taup = 1e-7, Et = 0, T = 300) {
    const e = Math.exp(Et / TC.vt(T)), n1 = ni * e, p1 = ni / e;
    return (n * p - ni * ni) / (taup * (n + n1) + taun * (p + p1));
  };
  /** 오제 재결합률 */
  TC.auger = (n, p, ni, Cn = 2.8e-31, Cp = 9.9e-32) => (Cn * n + Cp * p) * (n * p - ni * ni);
  /** 복사 재결합률(실리콘은 간접 천이라 매우 작다) */
  TC.radiative = (n, p, ni, B = 1.1e-14) => B * (n * p - ni * ni);
  /** 충돌 이온화 계수 α(E)(1/cm), van Overstraeten–de Man */
  TC.alphaII = function (E, carrier = "n", T = 300) {
    E = Math.abs(E);
    if (E < 1e4) return 0;
    const hw = 0.063, g = Math.tanh(hw / (2 * TC.kB * 300)) / Math.tanh(hw / (2 * TC.kB * T));
    let a, b;
    if (carrier === "n") { a = 7.03e5; b = 1.231e6; }
    else if (E < 4e5) { a = 1.582e6; b = 2.036e6; }
    else { a = 6.71e5; b = 1.693e6; }
    return g * a * Math.exp((-g * b) / E);
  };
  /** 밴드 간 터널링(Kane 형식) 생성률 근사: G = A·E²/√Eg · exp(−B·Eg^{1.5}/E) */
  TC.bbt = (E, A = 3.5e21, B = 2.25e7, Eg = 1.12) => { E = Math.abs(E); return E < 1e4 ? 0 : (A * E * E) / Math.sqrt(Eg) * Math.exp((-B * Math.pow(Eg, 1.5)) / E); };

  /* ------------------------------------------------------------ 수치 도구 */
  /** 베르누이 함수 B(x) = x/(eˣ−1). 샤페터-거멜 이산화의 핵심 */
  TC.bern = function (x) {
    const ax = Math.abs(x);
    if (ax < 1e-4) return 1 - x / 2 + (x * x) / 12;
    if (x > 700) return x * Math.exp(-x);
    if (x < -700) return -x;
    return x / Math.expm1(x);
  };
  /** 삼중 대각 행렬 풀이(Thomas). a: 아래(a[0] 무시), b: 대각, c: 위(c[n−1] 무시), d: 우변 */
  TC.tridiag = function (a, b, c, d) {
    const n = b.length, cp = new Float64Array(n), dp = new Float64Array(n), x = new Float64Array(n);
    cp[0] = c[0] / b[0]; dp[0] = d[0] / b[0];
    for (let i = 1; i < n; i++) {
      const m = b[i] - a[i] * cp[i - 1];
      cp[i] = c[i] / m; dp[i] = (d[i] - a[i] * dp[i - 1]) / m;
    }
    x[n - 1] = dp[n - 1];
    for (let i = n - 2; i >= 0; i--) x[i] = dp[i] - cp[i] * x[i + 1];
    return x;
  };
  /** 띠 행렬 LU 풀이(피벗 없음, 대각 우세 가정). A: 행 우선 dense가 아니라 band 저장 [i][kl+j−i], kl=ku=bw */
  TC.bandSolve = function (n, bw, band, rhs) {
    // band: Float64Array(n·(2bw+1)), 원소 A[i][j] = band[i·W + (j−i+bw)]
    const W = 2 * bw + 1, A = band, x = Float64Array.from(rhs);
    for (let k = 0; k < n; k++) {
      const piv = A[k * W + bw];
      const iEnd = Math.min(n - 1, k + bw);
      for (let i = k + 1; i <= iEnd; i++) {
        const f = A[i * W + (k - i + bw)] / piv;
        if (f === 0) continue;
        const jEnd = Math.min(n - 1, k + bw);
        for (let j = k; j <= jEnd; j++) A[i * W + (j - i + bw)] -= f * A[k * W + (j - k + bw)];
        x[i] -= f * x[k];
      }
    }
    for (let i = n - 1; i >= 0; i--) {
      let s = x[i];
      const jEnd = Math.min(n - 1, i + bw);
      for (let j = i + 1; j <= jEnd; j++) s -= A[i * W + (j - i + bw)] * x[j];
      x[i] = s / A[i * W + bw];
    }
    return x;
  };
  TC.linspace = (a, b, n) => Array.from({ length: n }, (_, i) => a + ((b - a) * i) / (n - 1));
  TC.logspace = (a, b, n) => Array.from({ length: n }, (_, i) => Math.pow(10, a + ((b - a) * i) / (n - 1)));
  /** 단조 증가 xs에서 선형 보간 */
  TC.interp = function (xs, ys, x) {
    const n = xs.length;
    if (x <= xs[0]) return ys[0];
    if (x >= xs[n - 1]) return ys[n - 1];
    let lo = 0, hi = n - 1;
    while (hi - lo > 1) { const m = (lo + hi) >> 1; if (xs[m] > x) hi = m; else lo = m; }
    const t = (x - xs[lo]) / (xs[hi] - xs[lo]);
    return ys[lo] + t * (ys[hi] - ys[lo]);
  };
  /** 사다리꼴 적분 */
  TC.trapz = function (x, y) { let s = 0; for (let i = 1; i < x.length; i++) s += 0.5 * (y[i] + y[i - 1]) * (x[i] - x[i - 1]); return s; };
  /** 이분법 근 찾기 */
  TC.bisect = function (f, a, b, tol = 1e-10, it = 200) {
    let fa = f(a);
    for (let i = 0; i < it; i++) {
      const m = 0.5 * (a + b), fm = f(m);
      if (Math.abs(b - a) < tol || fm === 0) return m;
      if (Math.sign(fm) === Math.sign(fa)) { a = m; fa = fm; } else b = m;
    }
    return 0.5 * (a + b);
  };
  /** 1D 격자: 구간마다 간격을 지정한 비균일 격자. TC.mesh1d([[0, 1], [100, 1], [1000, 20]]) → 점 배열(nm). 간격은 구간 안에서 기하급수로 변한다 */
  TC.mesh1d = function (spec) {
    const out = [spec[0][0]];
    for (let s = 1; s < spec.length; s++) {
      const [x0, h0] = spec[s - 1], [x1, h1] = spec[s];
      let x = x0, h = h0;
      const L = x1 - x0;
      const r = h1 / h0;
      while (x < x1 - 1e-9) {
        const t = (x - x0) / L;
        h = h0 * Math.pow(r, t);
        if (x + h > x1 - 0.3 * h) { x = x1; } else x += h;
        out.push(x);
      }
    }
    return out;
  };
  /** 숫자 배열 요약 */
  TC.minmax = function (a) { let lo = Infinity, hi = -Infinity; for (let i = 0; i < a.length; i++) { const v = a[i]; if (v < lo) lo = v; if (v > hi) hi = v; } return [lo, hi]; };
  /** 부호 있는 로그(도핑 표시용): sign(x)·log10(max(|x|, floor)/floor) */
  TC.slog = (x, floor = 1e14) => Math.sign(x) * Math.log10(Math.max(Math.abs(x), floor) / floor);

  /* ------------------------------------------------------------ 컬러맵 */
  const CMAPS = {
    viridis: [[68, 1, 84], [72, 40, 120], [62, 74, 137], [49, 104, 142], [38, 130, 142], [31, 158, 137], [53, 183, 121], [109, 205, 89], [180, 222, 44], [253, 231, 37]],
    inferno: [[0, 0, 4], [31, 12, 72], [85, 15, 109], [136, 34, 106], [186, 54, 85], [227, 89, 51], [249, 140, 10], [249, 201, 50], [252, 255, 164]],
    turbo: [[48, 18, 59], [70, 107, 227], [41, 187, 236], [49, 242, 153], [162, 252, 60], [237, 208, 58], [251, 128, 34], [208, 47, 5], [122, 4, 3]],
    // 발산: 파랑(−) – 흰색 – 빨강(+)
    div: [[33, 102, 172], [103, 169, 207], [209, 229, 240], [247, 247, 247], [253, 219, 199], [239, 138, 98], [178, 24, 43]],
    // 도핑: p형(빨강) – 진성(연회색) – n형(파랑). 0.5가 진성
    doping: [[165, 15, 21], [222, 45, 38], [251, 106, 74], [252, 174, 145], [236, 236, 236], [158, 202, 225], [107, 174, 214], [33, 113, 181], [8, 48, 107]],
    gray: [[10, 10, 12], [245, 245, 245]],
  };
  TC.CMAPS = CMAPS;
  /** 컬러맵 표본: t∈[0,1] → [r,g,b] */
  TC.cmap = function (name, t) {
    const c = CMAPS[name] || CMAPS.viridis;
    t = Math.min(1, Math.max(0, isFinite(t) ? t : 0)) * (c.length - 1);
    const i = Math.min(c.length - 2, Math.floor(t)), f = t - i, a = c[i], b = c[i + 1];
    return [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f, a[2] + (b[2] - a[2]) * f];
  };
  TC.cmapCss = (name, t, alpha = 1) => { const [r, g, b] = TC.cmap(name, t); return `rgba(${r | 0},${g | 0},${b | 0},${alpha})`; };
  /** 도핑(net, cm⁻³) → 색. 1e14~1e21을 부호 있는 로그로 */
  TC.dopingColor = (net, alpha = 1) => TC.cmapCss("doping", 0.5 + TC.slog(net, 1e14) / 14, alpha);

  /* ------------------------------------------------------------ 필드 그리기 */
  function locate(xs, v) {
    // xs 단조 증가. v가 들어가는 칸 i와 칸 안 비율 t
    const n = xs.length;
    if (v <= xs[0]) return [0, 0];
    if (v >= xs[n - 1]) return [n - 2, 1];
    let lo = 0, hi = n - 1;
    while (hi - lo > 1) { const m = (lo + hi) >> 1; if (xs[m] > v) hi = m; else lo = m; }
    return [lo, (v - xs[lo]) / (xs[hi] - xs[lo])];
  }
  /**
   * 격자 위 스칼라 필드를 캔버스에 칠한다(겹선형 보간).
   *   data: 길이 nx·ny 배열, data[j·nx + i] (i: x, j: y)
   *   opt: { xs, ys (비균일 좌표, 생략 시 균일), view: {x0, x1, y0, y1}(그릴 범위, 좌표 단위),
   *          map, lo, hi, log (log10 후 lo~hi), fn (값 → t∈[0,1] 직접 지정), mask (data → false면 투명),
   *          alpha, res (픽셀 해상도 배수, 기본 0.5) }
   */
  TC.putField = function (ctx, box, data, nx, ny, opt = {}) {
    const xs = opt.xs || Array.from({ length: nx }, (_, i) => i);
    const ys = opt.ys || Array.from({ length: ny }, (_, j) => j);
    const v = opt.view || { x0: xs[0], x1: xs[nx - 1], y0: ys[0], y1: ys[ny - 1] };
    const res = opt.res || 0.5;
    const W = Math.max(2, Math.round(box.w * res)), H = Math.max(2, Math.round(box.h * res));
    const img = ctx.createImageData(W, H), px = img.data;
    const lo = opt.lo != null ? opt.lo : TC.minmax(data)[0], hi = opt.hi != null ? opt.hi : TC.minmax(data)[1];
    const map = opt.map || "viridis", alpha = Math.round(255 * (opt.alpha != null ? opt.alpha : 1));
    const cols = Array.from({ length: W }, (_, a) => locate(xs, v.x0 + ((a + 0.5) / W) * (v.x1 - v.x0)));
    for (let b = 0; b < H; b++) {
      const [j, ty] = locate(ys, v.y0 + ((b + 0.5) / H) * (v.y1 - v.y0));
      for (let a = 0; a < W; a++) {
        const [i, tx] = cols[a];
        const k = j * nx + i;
        const d00 = data[k], d10 = data[k + 1], d01 = data[k + nx], d11 = data[k + nx + 1];
        const val = (d00 * (1 - tx) + d10 * tx) * (1 - ty) + (d01 * (1 - tx) + d11 * tx) * ty;
        const o = (b * W + a) * 4;
        if (opt.mask && !opt.mask(val, i, j)) { px[o + 3] = 0; continue; }
        let t;
        if (opt.fn) t = opt.fn(val);
        else if (opt.log) t = (Math.log10(Math.max(val, 1e-300)) - lo) / (hi - lo);
        else t = (val - lo) / (hi - lo || 1);
        const [r, g, bb] = TC.cmap(map, t);
        px[o] = r; px[o + 1] = g; px[o + 2] = bb; px[o + 3] = alpha;
      }
    }
    const off = document.createElement("canvas");
    off.width = W; off.height = H;
    off.getContext("2d").putImageData(img, 0, 0);
    ctx.save();
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(off, box.x, box.y, box.w, box.h);
    ctx.restore();
  };
  /** 컬러바: box에 세로(기본) 또는 가로(horizontal: true) 막대와 눈금 */
  TC.colorbar = function (ctx, box, opt = {}) {
    const map = opt.map || "viridis", horiz = !!opt.horizontal, n = 64;
    for (let i = 0; i < n; i++) {
      ctx.fillStyle = TC.cmapCss(map, horiz ? i / (n - 1) : 1 - i / (n - 1));
      if (horiz) ctx.fillRect(box.x + (i * box.w) / n, box.y, box.w / n + 1, box.h);
      else ctx.fillRect(box.x, box.y + (i * box.h) / n, box.w, box.h / n + 1);
    }
    const P = window.TB ? TB.palette() : { dim: "#888", border: "#888" };
    ctx.strokeStyle = P.border; ctx.strokeRect(box.x + 0.5, box.y + 0.5, box.w - 1, box.h - 1);
    ctx.fillStyle = P.dim;
    ctx.font = window.TB ? TB.font(10.5, true) : "10px monospace";
    const ticks = opt.ticks || [[0, opt.loLabel != null ? opt.loLabel : String(opt.lo ?? "")], [1, opt.hiLabel != null ? opt.hiLabel : String(opt.hi ?? "")]];
    ticks.forEach(([t, s]) => {
      if (horiz) { ctx.textAlign = "center"; ctx.textBaseline = "top"; ctx.fillText(s, box.x + t * box.w, box.y + box.h + 3); }
      else { ctx.textAlign = "left"; ctx.textBaseline = "middle"; ctx.fillText(s, box.x + box.w + 4, box.y + (1 - t) * box.h); }
    });
    if (opt.label) {
      ctx.font = window.TB ? TB.font(11) : "11px sans-serif";
      if (horiz) { ctx.textAlign = "left"; ctx.textBaseline = "bottom"; ctx.fillText(opt.label, box.x, box.y - 3); }
      else { ctx.textAlign = "center"; ctx.textBaseline = "bottom"; ctx.fillText(opt.label, box.x + box.w / 2, box.y - 4); }
    }
  };
  /** 마칭 스퀘어 등고선: 격자 좌표계 선분 [[x0,y0,x1,y1],...] (xs, ys를 주면 실제 좌표) */
  TC.contour = function (data, nx, ny, level, xs, ys) {
    const segs = [];
    const X = (i, t) => (xs ? xs[i] + t * (xs[i + 1] - xs[i]) : i + t);
    const Y = (j, t) => (ys ? ys[j] + t * (ys[j + 1] - ys[j]) : j + t);
    for (let j = 0; j < ny - 1; j++) {
      for (let i = 0; i < nx - 1; i++) {
        const a = data[j * nx + i] - level, b = data[j * nx + i + 1] - level, c = data[(j + 1) * nx + i + 1] - level, d = data[(j + 1) * nx + i] - level;
        const pts = [];
        if ((a > 0) !== (b > 0)) pts.push([X(i, a / (a - b)), Y(j, 0)]);
        if ((b > 0) !== (c > 0)) pts.push([X(i + 1, 0), Y(j, b / (b - c))]);
        if ((d > 0) !== (c > 0)) pts.push([X(i, d / (d - c)), Y(j + 1, 0)]);
        if ((a > 0) !== (d > 0)) pts.push([X(i, 0), Y(j, a / (a - d))]);
        if (pts.length === 2) segs.push([pts[0][0], pts[0][1], pts[1][0], pts[1][1]]);
        else if (pts.length === 4) { segs.push([pts[0][0], pts[0][1], pts[1][0], pts[1][1]]); segs.push([pts[2][0], pts[2][1], pts[3][0], pts[3][1]]); }
      }
    }
    return segs;
  };
  /** 등고선 그리기. view는 putField와 같다. levels: 숫자 배열 */
  TC.drawContours = function (ctx, box, data, nx, ny, levels, opt = {}) {
    const xs = opt.xs || Array.from({ length: nx }, (_, i) => i);
    const ys = opt.ys || Array.from({ length: ny }, (_, j) => j);
    const v = opt.view || { x0: xs[0], x1: xs[nx - 1], y0: ys[0], y1: ys[ny - 1] };
    const PX = (x) => box.x + ((x - v.x0) / (v.x1 - v.x0)) * box.w, PY = (y) => box.y + ((y - v.y0) / (v.y1 - v.y0)) * box.h;
    ctx.save();
    ctx.beginPath(); ctx.rect(box.x, box.y, box.w, box.h); ctx.clip();
    ctx.strokeStyle = opt.color || "rgba(255,255,255,.7)"; ctx.lineWidth = opt.width || 1; ctx.setLineDash(opt.dash || []);
    levels.forEach((lv) => {
      const segs = TC.contour(data, nx, ny, lv, xs, ys);
      ctx.beginPath();
      segs.forEach((s) => { ctx.moveTo(PX(s[0]), PY(s[1])); ctx.lineTo(PX(s[2]), PY(s[3])); });
      ctx.stroke();
    });
    ctx.restore();
  };
  /** 재질 색(CSS 변수 --m-<key>) */
  TC.matColor = function (key) {
    const v = getComputedStyle(document.documentElement).getPropertyValue("--m-" + key).trim();
    return v || "#999";
  };
  /**
   * 구조 단면 그리기. regions: [{m: 재질 키, x0, x1, y0, y1} | {m, poly: [[x,y],...]}] (nm, y 아래로 +)
   * view: {x0, x1, y0, y1}. opt: {outline, alpha, labels: true}. 반환: {X, Y} (nm → px)
   */
  TC.drawStruct = function (ctx, box, regions, view, opt = {}) {
    const X = (x) => box.x + ((x - view.x0) / (view.x1 - view.x0)) * box.w;
    const Y = (y) => box.y + ((y - view.y0) / (view.y1 - view.y0)) * box.h;
    ctx.save();
    ctx.beginPath(); ctx.rect(box.x, box.y, box.w, box.h); ctx.clip();
    ctx.globalAlpha = opt.alpha != null ? opt.alpha : 1;
    regions.forEach((r) => {
      ctx.fillStyle = r.color || TC.matColor(r.m);
      ctx.beginPath();
      if (r.poly) r.poly.forEach(([x, y], i) => (i ? ctx.lineTo(X(x), Y(y)) : ctx.moveTo(X(x), Y(y))));
      else ctx.rect(X(r.x0), Y(r.y0), X(r.x1) - X(r.x0), Y(r.y1) - Y(r.y0));
      ctx.closePath(); ctx.fill();
      if (opt.outline) { ctx.strokeStyle = opt.outline; ctx.lineWidth = 1; ctx.stroke(); }
    });
    ctx.restore();
    return { X, Y };
  };
})();
