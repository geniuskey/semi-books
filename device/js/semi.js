/* Copyright (c) 2026 geniuskey and DeviceBook contributors.
   Executable code: MIT (see ../LICENSE-MIT).
   Educational content and illustrations: CC-BY-4.0 (see ../LICENSE.md). */
/* ==========================================================================
   DeviceBook 소자 물리 엔진 — 전역 객체 SC
   단위: 길이 cm(따로 적지 않으면), 농도 cm⁻³, 에너지·전위 eV·V, 온도 K.
   - 재료 상수(SC.MAT), 밴드갭·유효 상태 밀도·진성 농도
   - 페르미–디랙 적분, 전하 중성 풀이(불완전 이온화 포함)
   - 이동도(아로라), 속도 포화, 확산 계수
   - pn 접합(공핍 근사), 다이오드 전류, MOS 커패시터(정확한 전하식, C–V)
   - MOSFET 전류(EKV형 연속 모델: 문턱 이하~강반전, 속도 포화, DIBL)
   - 1차원 포아송·드리프트–확산 솔버(샤페터–거멜 이산화, 거멜 반복)
   - 밴드 다이어그램 그리기 헬퍼
   교육용 근사 모델이다. 수치는 Sze·Pierret·Green 등의 대표값.
   ========================================================================== */
(function () {
  "use strict";
  const SC = (window.SC = {});

  /* ------------------------------------------------------------ 상수 */
  const q = 1.602176634e-19, kB = 1.380649e-23, kBeV = 8.617333262e-5, eps0 = 8.8541878128e-14; // F/cm
  const h = 6.62607015e-34, hbar = 1.054571817e-34, m0 = 9.1093837015e-31;
  SC.q = q; SC.kB = kB; SC.kBeV = kBeV; SC.eps0 = eps0; SC.h = h; SC.hbar = hbar; SC.m0 = m0;
  /** 열전압 kT/q (V) */
  SC.Vt = (T = 300) => kBeV * T;
  SC.kT = SC.Vt;

  /* ------------------------------------------------------------ 재료 */
  /**
   * Eg: 바시니 식 Eg(T) = Eg0 − αT²/(T+β).  Nc, Nv: 300 K 값(T^1.5 비례).
   * chi: 전자 친화도(eV), eps: 비유전율, me/mh: 전도도 유효 질량(m0 단위),
   * mun/mup: 저도핑 300 K 이동도(cm²/Vs), vsn/vsp: 포화 속도(cm/s), direct: 직접 밴드갭 여부
   */
  SC.MAT = {
    Si:   { name: "Si",    Eg0: 1.170, a: 4.73e-4, b: 636, Nc: 2.86e19, Nv: 3.10e19, chi: 4.05, eps: 11.7, me: 0.26, mh: 0.39, medos: 1.09, mhdos: 1.15, mun: 1417, mup: 470, vsn: 1.07e7, vsp: 8.37e6, direct: false, color: "#8f99aa" },
    Ge:   { name: "Ge",    Eg0: 0.7437, a: 4.774e-4, b: 235, Nc: 1.04e19, Nv: 6.0e18, chi: 4.0, eps: 16.0, me: 0.12, mh: 0.21, medos: 0.55, mhdos: 0.37, mun: 3900, mup: 1900, vsn: 6e6, vsp: 6e6, direct: false, color: "#a39e88" },
    GaAs: { name: "GaAs",  Eg0: 1.519, a: 5.405e-4, b: 204, Nc: 4.7e17, Nv: 9.0e18, chi: 4.07, eps: 12.9, me: 0.067, mh: 0.34, medos: 0.067, mhdos: 0.48, mun: 8500, mup: 400, vsn: 7e6, vsp: 9e6, direct: true, color: "#b98d6a" },
    SiC:  { name: "4H-SiC", Eg0: 3.359, a: 3.3e-4, b: 0, Nc: 1.7e19, Nv: 2.5e19, chi: 3.6, eps: 9.7, me: 0.37, mh: 1.0, medos: 0.77, mhdos: 1.0, mun: 950, mup: 120, vsn: 2.2e7, vsp: 1e7, direct: false, color: "#6c8f7a" },
    GaN:  { name: "GaN",   Eg0: 3.507, a: 9.09e-4, b: 830, Nc: 2.3e18, Nv: 4.6e19, chi: 4.1, eps: 8.9, me: 0.2, mh: 1.0, medos: 0.2, mhdos: 1.5, mun: 1200, mup: 30, vsn: 2.5e7, vsp: 1e7, direct: true, color: "#7d84b8" },
  };
  const M = (m) => (typeof m === "string" ? SC.MAT[m] : m) || SC.MAT.Si;
  SC.mat = M;
  /** 밴드갭 (eV) */
  SC.Eg = function (mat, T = 300) { const m = M(mat); return T + m.b > 0 ? m.Eg0 - (m.a * T * T) / (T + m.b) : m.Eg0; };
  SC.Nc = (mat, T = 300) => M(mat).Nc * Math.pow(T / 300, 1.5);
  SC.Nv = (mat, T = 300) => M(mat).Nv * Math.pow(T / 300, 1.5);
  /** 진성 캐리어 농도 n_i = √(NcNv)·exp(−Eg/2kT) — Si 300 K ≈ 1.07×10¹⁰ */
  SC.ni = function (mat, T = 300) { return Math.sqrt(SC.Nc(mat, T) * SC.Nv(mat, T)) * Math.exp(-SC.Eg(mat, T) / (2 * kBeV * T)); };
  /** 진성 페르미 준위의 중간갭에서의 위치 Ei − (Ec+Ev)/2 (eV) */
  SC.EiOffset = (mat, T = 300) => 0.5 * kBeV * T * Math.log(SC.Nv(mat, T) / SC.Nc(mat, T));
  /** 디바이 길이 (cm) */
  SC.debye = (N, mat = "Si", T = 300) => Math.sqrt((M(mat).eps * eps0 * kBeV * T) / (q * N));

  /* ------------------------------------------------------------ 통계 */
  /** 페르미–디랙 점유 확률 */
  SC.fd = (E, Ef, T = 300) => 1 / (1 + Math.exp((E - Ef) / (kBeV * T)));
  /**
   * 정규화된 페르미–디랙 적분 𝓕½(η) (Nc·𝓕½ = n). η ≪ 0 이면 e^η.
   * Bednarczyk & Bednarczyk (1978) 근사, 상대 오차 < 0.4%.
   */
  SC.F12 = function (eta) {
    if (eta < -30) return Math.exp(eta);
    const nu = Math.pow(eta, 4) + 50 + 33.6 * eta * (1 - 0.68 * Math.exp(-0.17 * (eta + 1) * (eta + 1)));
    return 1 / (Math.exp(-eta) + (3 * Math.sqrt(Math.PI) / 4) * Math.pow(nu, -3 / 8));
  };
  /** 상태 밀도 g(E) ∝ √(E−Ec) 의 전도대 값 (cm⁻³eV⁻¹), E는 Ec 기준 eV */
  SC.dosC = function (mat, dE, T = 300) { if (dE <= 0) return 0; const Nc = SC.Nc(mat, T), kT = kBeV * T; return (2 * Nc) / (Math.sqrt(Math.PI) * Math.pow(kT, 1.5)) * Math.sqrt(dE); };

  /**
   * 전하 중성 조건으로 페르미 준위를 푼다.
   *   opts: { Nd, Na, Ed: 도너 이온화 에너지(eV, 기본 0.045), Ea: 0.045, incomplete: true, fd: true, gD: 2, gA: 4 }
   *   반환: { Ef (Ev 기준 eV), EfMid(중간갭 기준), EfEi(Ei 기준), n, p, NdIon, NaIon, Eg, ni, Ec, Ev }
   */
  SC.equilibrium = function (mat, T, opts = {}) {
    const Nd = opts.Nd || 0, Na = opts.Na || 0;
    const Ed = opts.Ed != null ? opts.Ed : 0.045, Ea = opts.Ea != null ? opts.Ea : 0.045;
    const inc = opts.incomplete !== false, useFD = opts.fd !== false;
    const gD = opts.gD || 2, gA = opts.gA || 4;
    const Eg = SC.Eg(mat, T), Nc = SC.Nc(mat, T), Nv = SC.Nv(mat, T), kT = kBeV * T;
    const nOf = (Ef) => Nc * (useFD ? SC.F12((Ef - Eg) / kT) : Math.exp((Ef - Eg) / kT));
    const pOf = (Ef) => Nv * (useFD ? SC.F12((0 - Ef) / kT) : Math.exp(-Ef / kT));
    const NdI = (Ef) => (inc ? Nd / (1 + gD * Math.exp((Ef - (Eg - Ed)) / kT)) : Nd);
    const NaI = (Ef) => (inc ? Na / (1 + gA * Math.exp((Ea - Ef) / kT)) : Na);
    const f = (Ef) => pOf(Ef) + NdI(Ef) - nOf(Ef) - NaI(Ef);
    let lo = -3.0, hi = Eg + 3.0;
    for (let i = 0; i < 200; i++) { const mid = 0.5 * (lo + hi); if (f(mid) > 0) lo = mid; else hi = mid; }
    const Ef = 0.5 * (lo + hi), ni = SC.ni(mat, T), Ei = Eg / 2 + SC.EiOffset(mat, T);
    return { Ef, EfMid: Ef - Eg / 2, EfEi: Ef - Ei, n: nOf(Ef), p: pOf(Ef), NdIon: NdI(Ef), NaIon: NaI(Ef), Eg, ni, Ei, Ec: Eg, Ev: 0, Nc, Nv, kT };
  };
  /** 완전 이온화·볼츠만 근사의 다수/소수 캐리어 */
  SC.np = function (Nd, Na, mat = "Si", T = 300) {
    const ni = SC.ni(mat, T), N = Nd - Na;
    const maj = N / 2 + Math.sqrt((N * N) / 4 + ni * ni);
    if (N >= 0) return { n: maj, p: (ni * ni) / maj, ni };
    const pm = -N / 2 + Math.sqrt((N * N) / 4 + ni * ni);
    return { n: (ni * ni) / pm, p: pm, ni };
  };

  /* ------------------------------------------------------------ 이동도 */
  /**
   * 이동도 (cm²/Vs). Si는 아로라(Arora 1982) 모델: 도핑 총량 N과 온도 의존.
   * 다른 재료는 Caughey–Thomas(저도핑 값 × 같은 모양).
   *   SC.mobility('Si', 1e17, 300, 'n')
   */
  SC.mobility = function (mat, N, T = 300, type = "n") {
    const m = M(mat), Tn = T / 300;
    if (m === SC.MAT.Si) {
      const e = type === "n";
      const mumin = (e ? 88 : 54.3) * Math.pow(Tn, -0.57);
      const mu0 = (e ? 1252 : 407) * Math.pow(Tn, -2.33);
      const Nref = (e ? 1.26e17 : 2.35e17) * Math.pow(Tn, 2.4);
      const al = 0.88 * Math.pow(Tn, -0.146);
      return mumin + mu0 / (1 + Math.pow(Math.max(N, 1) / Nref, al));
    }
    const mu = type === "n" ? m.mun : m.mup;
    const mumin = mu * 0.06, Nref = 1e17;
    return (mumin + (mu - mumin) / (1 + Math.pow(Math.max(N, 1) / Nref, 0.7))) * Math.pow(Tn, -1.8);
  };
  /** 전기장 E(V/cm)에서의 드리프트 속도 — Caughey–Thomas 속도 포화 (β: 전자 2, 정공 1) */
  SC.vdrift = function (mu, E, vsat, beta = 2) { const v0 = mu * Math.abs(E); return (Math.sign(E) * v0) / Math.pow(1 + Math.pow(v0 / vsat, beta), 1 / beta); };
  /** 아인슈타인 관계 D = μkT/q (cm²/s) */
  SC.diff = (mu, T = 300) => mu * kBeV * T;
  /** 비저항 (Ω·cm) */
  SC.resistivity = function (Nd, Na, mat = "Si", T = 300) {
    const c = SC.np(Nd, Na, mat, T), Nt = Nd + Na;
    return 1 / (q * (c.n * SC.mobility(mat, Nt, T, "n") + c.p * SC.mobility(mat, Nt, T, "p")));
  };

  /* ------------------------------------------------------------ 재결합 */
  /** SRH 순 재결합률 U (cm⁻³s⁻¹). Et: 트랩의 Ei 기준 위치(eV) */
  SC.srh = function (n, p, ni, taun, taup, Et = 0, T = 300) {
    const kT = kBeV * T, n1 = ni * Math.exp(Et / kT), p1 = ni * Math.exp(-Et / kT);
    return (n * p - ni * ni) / (taup * (n + n1) + taun * (p + p1));
  };
  /** 도핑 의존 SRH 수명 (Scharfetter): τ = τ0/(1+N/Nref) */
  SC.tauSRH = (N, tau0 = 1e-5, Nref = 5e16) => tau0 / (1 + N / Nref);

  /* ------------------------------------------------------------ pn 접합 (공핍 근사) */
  /**
   * 계단 접합. V: 순방향 바이어스(+). 반환 SI 혼합 단위(길이 cm, 전기장 V/cm).
   *   { Vbi, W, xn, xp, Emax, Cj (F/cm²), ni, Vt }
   */
  SC.pn = function (Na, Nd, V = 0, mat = "Si", T = 300) {
    const m = M(mat), ni = SC.ni(mat, T), Vt = kBeV * T, es = m.eps * eps0;
    const Vbi = Vt * Math.log((Na * Nd) / (ni * ni));
    const Vj = Math.max(Vbi - V, 1e-3);
    const W = Math.sqrt(((2 * es * Vj) / q) * (1 / Na + 1 / Nd));
    const xn = (W * Na) / (Na + Nd), xp = (W * Nd) / (Na + Nd);
    const Emax = (q * Nd * xn) / es;
    return { Vbi, Vj, W, xn, xp, Emax, Cj: es / W, ni, Vt, es };
  };
  /**
   * 이상 다이오드 + 공핍층 재결합 전류 밀도 (A/cm²).
   * opts: { Na, Nd, V, T, mat, taun, taup, Wn, Wp (중성 영역 폭, cm; 짧은 다이오드 처리), tauG }
   */
  SC.diodeJ = function (o) {
    const mat = o.mat || "Si", T = o.T || 300, ni = SC.ni(mat, T), Vt = kBeV * T, V = o.V || 0;
    const Dn = SC.diff(SC.mobility(mat, o.Na, T, "n"), T), Dp = SC.diff(SC.mobility(mat, o.Nd, T, "p"), T);
    const taun = o.taun || SC.tauSRH(o.Na), taup = o.taup || SC.tauSRH(o.Nd);
    const Ln = Math.sqrt(Dn * taun), Lp = Math.sqrt(Dp * taup);
    const effL = (L, W) => (W ? L * Math.tanh(W / L) : L); // 짧은 다이오드: coth 보정
    const J0 = q * ni * ni * (Dn / (effL(Ln, o.Wp) * o.Na) + Dp / (effL(Lp, o.Wn) * o.Nd));
    const pn = SC.pn(o.Na, o.Nd, Math.min(V, 0.95 * SC.pn(o.Na, o.Nd, 0, mat, T).Vbi), mat, T);
    const tg = o.tauG || Math.sqrt(taun * taup);
    const Jgr0 = (q * ni * pn.W) / (2 * tg);
    const Jdiff = J0 * (Math.exp(V / Vt) - 1);
    const Jgr = Jgr0 * (Math.exp(V / (2 * Vt)) - 1);
    return { J: Jdiff + Jgr, Jdiff, Jgr, J0, Jgr0, Ln, Lp, Dn, Dp, W: pn.W, Vbi: pn.Vbi };
  };

  /* ------------------------------------------------------------ MOS 커패시터 */
  /**
   * 기판 도핑 Nsub(양수), type 'p'|'n', tox(cm), 게이트 일함수 차 phims(V, null이면 n⁺ 폴리 가정), Qox(C/cm²).
   * SC.mosSetup(o) → 계산용 객체 M:
   *   M.Vg(psis, mode) : 표면 전위 → 게이트 전압
   *   M.psis(Vg, mode): 게이트 전압 → 표면 전위 (mode 'lf' 평형, 'dd' 깊은 공핍(소수 캐리어 없음))
   *   M.Qs(psis, mode), M.C(Vg, 'lf'|'hf'|'dd') (F/cm²), M.Vfb, M.Vth, M.phiF, M.Cox, M.Wmax
   */
  SC.mosSetup = function (o) {
    const mat = o.mat || "Si", T = o.T || 300, m = M(mat);
    const es = m.eps * eps0, eox = (o.epsOx || 3.9) * eps0, Cox = eox / o.tox;
    const Vt = kBeV * T, ni = SC.ni(mat, T), N = o.Nsub, sgn = o.type === "n" ? -1 : 1;
    const phiF = Vt * Math.log(N / ni); // 크기
    const Eg = SC.Eg(mat, T);
    // n⁺ 폴리 게이트(p 기판) 기본: φms = −(Eg/2 + φF) ; p 기판에 n⁺: −0.56−φF
    let phims = o.phims;
    if (phims == null) phims = o.type === "n" ? -(Eg / 2) + phiF : -(Eg / 2) - phiF;
    const Vfb = phims - (o.Qox || 0) / Cox;
    const LD = Math.sqrt((es * Vt) / (q * N));
    const r = (ni * ni) / (N * N);
    // p형 기준으로 계산하고 n형이면 부호 반전. u = ψs/Vt (p형: 반전은 u>0)
    const Fm = (u) => Math.sqrt(Math.max(0, Math.exp(-u) + u - 1));
    const Fmin = (u) => Math.max(0, Math.exp(u) - u - 1);
    function Qs(psis, mode) { // 반도체 전하 (C/cm²), p형 기준 부호: 반전·공핍에서 음
      const u = psis / Vt;
      const F2 = Math.max(0, Math.exp(-u) + u - 1) + (mode === "dd" ? 0 : r * Fmin(u));
      const F = Math.sqrt(F2);
      return -Math.sign(u) * Math.SQRT2 * (es * Vt / LD) * F;
    }
    function VgOf(psis, mode) { return Vfb + psis - Qs(psis, mode) / Cox; }
    function psisOf(Vg, mode) { // p형 기준 Vg' = sgn*(Vg−Vfb)+Vfb
      const target = sgn * (Vg - Vfb) + Vfb;
      let lo = -40 * Vt, hi = mode === "dd" ? 400 : 2 * phiF + 40 * Vt;
      if (mode === "dd") hi = Math.max(hi, 50);
      for (let i = 0; i < 120; i++) { const mid = 0.5 * (lo + hi); if (VgOf(mid, mode) < target) lo = mid; else hi = mid; }
      return 0.5 * (lo + hi);
    }
    const Wmax = Math.sqrt((2 * es * 2 * phiF) / (q * N));
    const Qdmax = q * N * Wmax;
    const Vth = Vfb + sgn * (2 * phiF + Qdmax / Cox);
    function Cap(Vg, mode) {
      const dV = 1e-3;
      if (mode === "lf" || mode === "dd") {
        const md = mode === "dd" ? "dd" : "lf";
        const p = psisOf(Vg, md), dQ = Qs(p + dV, md) - Qs(p - dV, md);
        const Cs = Math.abs(dQ / (2 * dV));
        return 1 / (1 / Cox + 1 / Math.max(Cs, 1e-30));
      }
      // 고주파: 표면 전위는 평형값, 소수 캐리어는 응답하지 않음
      const p = psisOf(Vg, "lf");
      const dQ = Qs(p + dV, "dd") - Qs(p - dV, "dd");
      let Cs = Math.abs(dQ / (2 * dV));
      if (p > 2 * phiF) Cs = es / Wmax; // 강반전 이후 공핍폭 고정
      return 1 / (1 / Cox + 1 / Math.max(Cs, 1e-30));
    }
    return {
      Cox, Vfb, Vth, phiF, phims, Wmax, Qdmax, LD, ni, Vt, es, eox, sgn, N, T, mat,
      gamma: Math.sqrt(2 * q * es * N) / Cox,
      Qs: (ps, mode) => sgn * Qs(sgn * ps, mode),
      Vg: (ps, mode) => Vfb + sgn * (VgOf(sgn * ps, mode) - Vfb),
      psis: (Vg, mode) => sgn * psisOf(Vg, mode || "lf"),
      C: Cap,
      /** 반전 전하 (C/cm², 크기) */
      Qinv(Vg) { const p = psisOf(Vg, "lf"); return Math.abs(Qs(p, "lf") - Qs(p, "dd")); },
      /** 공핍 근사 표면 전위에서의 전위 분포 ψ(x) (x cm, 반도체 안 0≤x) */
      W(psis) { const ps = Math.abs(psis); return Math.sqrt((2 * es * Math.min(ps, 2 * phiF + 6 * Vt)) / (q * N)); },
    };
  };

  /* ------------------------------------------------------------ MOSFET */
  /**
   * EKV형 연속 모델. 문턱 이하(지수)부터 강반전(제곱)까지 매끄럽다.
   * p: { W, L (cm), tox (cm), mu0, Vth0, n(기울기 계수, 생략 시 바디 계수로 계산), Nsub, Vsb,
   *      theta(이동도 열화 1/V), vsat(cm/s), lambda(CLM 1/V), dibl(V/V), type:'n'|'p', T }
   * SC.mosfet(p, Vgs, Vds) → { Id (A), Vth, n, gm?, regime }
   */
  SC.mosfet = function (p, Vgs, Vds) {
    const T = p.T || 300, Vt = kBeV * T, eox = 3.9 * eps0, Cox = eox / p.tox;
    const sg = p.type === "p" ? -1 : 1;
    Vgs *= sg; Vds *= sg;
    let Vs = 0; if (Vds < 0) { Vgs -= Vds; Vds = -Vds; Vs = 1; } // 대칭: 소스·드레인 교환
    const N = p.Nsub || 3e17, es = 11.7 * eps0;
    const phiF = Vt * Math.log(N / SC.ni("Si", T));
    const gamma = p.gamma != null ? p.gamma : Math.sqrt(2 * q * es * N) / Cox;
    const Vsb = p.Vsb || 0;
    const body = gamma * (Math.sqrt(2 * phiF + Vsb) - Math.sqrt(2 * phiF));
    const Vth = (p.Vth0 != null ? p.Vth0 : 0.4) + body - (p.dibl || 0) * Vds;
    const n = p.n || 1 + gamma / (2 * Math.sqrt(2 * phiF + Vsb));
    const Vov = Vgs - Vth;
    const mu = (p.mu0 || 400) / (1 + (p.theta || 0) * Math.max(0, Vov));
    const beta = mu * Cox * (p.W / p.L);
    const Fi = (x) => { const l = x > 40 ? x / 2 : Math.log(1 + Math.exp(x / 2)); return l * l; };
    const If = Fi(Vov / (n * Vt)), Ir = Fi((Vov - n * Vds) / (n * Vt));
    const Ispec = 2 * n * beta * Vt * Vt;
    let Id = Ispec * (If - Ir);
    // 속도 포화: 유효 Vds 감소 (간단 보정)
    if (p.vsat) {
      const Ec = (2 * p.vsat) / mu;
      const VdsatLong = Math.max(Vt, Vov / n);
      const Vdsat = (VdsatLong * Ec * p.L) / (VdsatLong + Ec * p.L);
      const Vdeff = Vds / Math.pow(1 + Math.pow(Vds / Vdsat, 4), 0.25);
      Id = (Ispec * (If - Fi((Vov - n * Vdeff) / (n * Vt)))) / (1 + Vdeff / (Ec * p.L));
    }
    Id *= 1 + (p.lambda || 0) * Vds;
    const regime = Vov < -2 * n * Vt ? "문턱 이하" : Vds < Vov / n ? "선형" : "포화";
    return { Id: sg * (Vs ? -Id : Id), Vth: sg * Vth, n, regime, Cox, beta, phiF, gamma };
  };
  /** 문턱 이하 기울기 SS (mV/dec) = n·(kT/q)·ln10 */
  SC.SS = (n, T = 300) => n * kBeV * T * Math.LN10 * 1000;

  /* ------------------------------------------------------------ 쇼트키 */
  /** 열전자 방출 J = A** T² exp(−φB/kT)(exp(V/nkT)−1), A** 기본 Si n형 112 A/cm²K² */
  SC.schottkyJ = function (phiB, V, T = 300, Astar = 112, nIdeal = 1) {
    const kT = kBeV * T, Js = Astar * T * T * Math.exp(-phiB / kT);
    return { J: Js * (Math.exp(V / (nIdeal * kT)) - 1), Js };
  };
  /** 영상력 장벽 저하 Δφ = √(qE/4πεs) (V), E: V/cm */
  SC.imageLowering = (E, mat = "Si") => Math.sqrt((q * Math.abs(E)) / (4 * Math.PI * M(mat).eps * eps0));

  /* ------------------------------------------------------------ 광 */
  /** Si 흡수 계수 α(λ) (cm⁻¹), λ: nm. Green(2008) 표 값의 로그 보간 */
  const ALPHA_SI = [[300, 1.73e6], [350, 1.04e6], [370, 7.37e5], [400, 9.52e4], [450, 2.41e4], [500, 1.11e4], [550, 6.39e3], [600, 4.14e3], [650, 2.81e3], [700, 1.9e3], [750, 1.3e3], [800, 8.5e2], [850, 5.35e2], [900, 3.06e2], [950, 1.57e2], [1000, 64], [1050, 16.3], [1100, 3.5], [1150, 0.68], [1200, 0.022]];
  SC.alphaSi = function (nm) {
    const t = ALPHA_SI;
    if (nm <= t[0][0]) return t[0][1];
    if (nm >= t[t.length - 1][0]) return t[t.length - 1][1] * Math.exp(-(nm - 1200) / 20);
    for (let i = 1; i < t.length; i++) if (nm <= t[i][0]) { const f = (nm - t[i - 1][0]) / (t[i][0] - t[i - 1][0]); return Math.exp(Math.log(t[i - 1][1]) * (1 - f) + Math.log(t[i][1]) * f); }
    return 0;
  };
  /** 직접 밴드갭 흡수 α ≈ A√(hν−Eg) (cm⁻¹), GaAs 근사 */
  SC.alphaDirect = (Eph, Eg, A = 5.6e4) => (Eph > Eg ? A * Math.sqrt(Eph - Eg) : 0);
  /** 광자 에너지 (eV) ↔ 파장 (nm) */
  SC.eV2nm = (E) => 1239.84 / E;
  SC.nm2eV = (nm) => 1239.84 / nm;

  /* ------------------------------------------------------------ 1D 드리프트–확산 솔버 */
  const bern = (x) => { const a = Math.abs(x); if (a < 1e-6) return 1 - x / 2; if (x > 700) return x * Math.exp(-x); return x / Math.expm1(x); };
  SC.bernoulli = bern;
  /** 삼중 대각 행렬 풀이 (Thomas). a: 하부, b: 대각, c: 상부, d: 우변 — 모두 길이 N, 결과 반환 */
  function tridiag(a, b, c, d) {
    const N = b.length, cp = new Float64Array(N), dp = new Float64Array(N), x = new Float64Array(N);
    cp[0] = c[0] / b[0]; dp[0] = d[0] / b[0];
    for (let i = 1; i < N; i++) { const m = b[i] - a[i] * cp[i - 1]; cp[i] = c[i] / m; dp[i] = (d[i] - a[i] * dp[i - 1]) / m; }
    x[N - 1] = dp[N - 1];
    for (let i = N - 2; i >= 0; i--) x[i] = dp[i] - cp[i] * x[i + 1];
    return x;
  }
  SC.tridiag = tridiag;

  /**
   * 1차원 소자. 두 끝은 오믹 접촉(오른쪽 접지, 왼쪽 접촉에 바이어스 Va).
   *   const dev = new SC.Device1D({ L: 2e-4 (cm), N: 401, doping: x => Nd−Na (cm⁻³), mat:'Si', T:300,
   *                                 taun:1e-7, taup:1e-7, Et:0, G: x => 광생성률(cm⁻³s⁻¹), mobility:'doping'|'const' });
   *   dev.equilibrium();            // 평형 포아송
   *   dev.solve(Va)                 // 바이어스 (내부에서 계단 증가)
   *   dev.sweep([v0, v1, ...], cb)  // I–V
   *   dev.state() → { x(cm), psi(V), n, p, Ec, Ev, Ei, Efn, Efp (eV, 오른쪽 접촉 Ef=0 기준), E(V/cm), rho, Jn, Jp, J (A/cm², +x 방향 양), R }
   *   바이어스 Va는 '왼쪽 접촉 전위 − 오른쪽'. p(왼쪽)/n(오른쪽) 다이오드라면 순방향은 Va > 0, 전류 J > 0.
   */
  SC.Device1D = function (o) {
    const self = this;
    const mat = o.mat || "Si", T = o.T || 300, m = M(mat);
    const Np = o.N || 401, L = o.L || 2e-4, hx = L / (Np - 1);
    const Vt = kBeV * T, ni = SC.ni(mat, T), es = m.eps * eps0;
    const x = new Float64Array(Np), C = new Float64Array(Np), Ntot = new Float64Array(Np), G = new Float64Array(Np);
    for (let i = 0; i < Np; i++) {
      x[i] = i * hx;
      const d = o.doping(x[i]);
      C[i] = d; Ntot[i] = o.Ntot ? o.Ntot(x[i]) : Math.abs(d);
      G[i] = o.G ? o.G(x[i]) : 0;
    }
    const mun = new Float64Array(Np), mup = new Float64Array(Np), taun = new Float64Array(Np), taup = new Float64Array(Np);
    for (let i = 0; i < Np; i++) {
      mun[i] = o.mobility === "const" ? m.mun : SC.mobility(mat, Ntot[i], T, "n");
      mup[i] = o.mobility === "const" ? m.mup : SC.mobility(mat, Ntot[i], T, "p");
      taun[i] = o.taun != null ? o.taun : SC.tauSRH(Ntot[i], 1e-6);
      taup[i] = o.taup != null ? o.taup : SC.tauSRH(Ntot[i], 1e-6);
    }
    const n1 = ni * Math.exp((o.Et || 0) / Vt), p1 = ni * Math.exp(-(o.Et || 0) / Vt);
    // 상태: psi(V 단위 정규화: u = ψ/Vt), n, p (cm⁻³)
    const u = new Float64Array(Np), n = new Float64Array(Np), p = new Float64Array(Np);
    const ueq0 = (c) => Math.asinh(c / (2 * ni));
    for (let i = 0; i < Np; i++) { u[i] = ueq0(C[i]); n[i] = ni * Math.exp(u[i]); p[i] = ni * Math.exp(-u[i]); }
    // 관례: ψ의 기준은 평형 페르미 준위(=0)에서 n = ni·e^{ψ/Vt}
    const K = (q * hx * hx) / (es * Vt); // 포아송 계수: u'' = −K(p − n + C)
    let Va = 0;
    self.Va = 0;
    self.converged = true;
    self.iters = 0;

    // 비선형 포아송 (준페르미 전위 고정) — 뉴턴
    function poisson(phin, phip, uL, uR) {
      const a = new Float64Array(Np), b = new Float64Array(Np), c = new Float64Array(Np), f = new Float64Array(Np);
      let maxd = 0;
      for (let it = 0; it < 60; it++) {
        a[0] = 0; b[0] = 1; c[0] = 0; f[0] = -(u[0] - uL);
        a[Np - 1] = 0; b[Np - 1] = 1; c[Np - 1] = 0; f[Np - 1] = -(u[Np - 1] - uR);
        for (let i = 1; i < Np - 1; i++) {
          const ne = Math.exp(u[i] - phin[i]), pe = Math.exp(phip[i] - u[i]); // ni 단위
          a[i] = 1; c[i] = 1;
          b[i] = -2 - K * ni * (ne + pe);
          f[i] = -(u[i + 1] - 2 * u[i] + u[i - 1] + K * (ni * pe - ni * ne + C[i]));
        }
        const d = tridiag(a, b, c, f);
        maxd = 0;
        for (let i = 0; i < Np; i++) { let di = d[i]; if (di > 1) di = 1; else if (di < -1) di = -1; u[i] += di; maxd = Math.max(maxd, Math.abs(di)); }
        if (maxd < 1e-9) break;
      }
      return maxd;
    }
    function bc() {
      // 오믹 접촉: 전하 중성 + 평형, 왼쪽은 Va만큼 전위 상승
      return { uL: ueq0(C[0]) + Va / Vt, uR: ueq0(C[Np - 1]), phiL: Va / Vt, phiR: 0 };
    }
    function continuity() {
      const B = bc();
      // 전자
      let a = new Float64Array(Np), b = new Float64Array(Np), c = new Float64Array(Np), f = new Float64Array(Np);
      a[0] = 0; b[0] = 1; c[0] = 0; f[0] = ni * Math.exp(B.uL - B.phiL);
      a[Np - 1] = 0; b[Np - 1] = 1; c[Np - 1] = 0; f[Np - 1] = ni * Math.exp(B.uR - B.phiR);
      for (let i = 1; i < Np - 1; i++) {
        const Dp_ = 0.5 * (mun[i] + mun[i + 1]) * Vt, Dm_ = 0.5 * (mun[i] + mun[i - 1]) * Vt;
        const dP = u[i + 1] - u[i], dM = u[i] - u[i - 1];
        const den = taup[i] * (n[i] + n1) + taun[i] * (p[i] + p1);
        // R = (n p − ni²)/den → n·(p/den) − ni²/den  (n에 대해 선형화)
        a[i] = (Dm_ * bern(-dM)) / (hx * hx);
        c[i] = (Dp_ * bern(dP)) / (hx * hx);
        b[i] = -((Dp_ * bern(-dP)) + (Dm_ * bern(dM))) / (hx * hx) - p[i] / den;
        f[i] = -(ni * ni) / den - G[i];
      }
      const nn = tridiag(a, b, c, f);
      // 정공
      a = new Float64Array(Np); b = new Float64Array(Np); c = new Float64Array(Np); f = new Float64Array(Np);
      a[0] = 0; b[0] = 1; c[0] = 0; f[0] = ni * Math.exp(B.phiL - B.uL);
      a[Np - 1] = 0; b[Np - 1] = 1; c[Np - 1] = 0; f[Np - 1] = ni * Math.exp(B.phiR - B.uR);
      for (let i = 1; i < Np - 1; i++) {
        const Dp_ = 0.5 * (mup[i] + mup[i + 1]) * Vt, Dm_ = 0.5 * (mup[i] + mup[i - 1]) * Vt;
        const dP = u[i + 1] - u[i], dM = u[i] - u[i - 1];
        const den = taup[i] * (nn[i] + n1) + taun[i] * (p[i] + p1);
        a[i] = (Dm_ * bern(dM)) / (hx * hx);
        c[i] = (Dp_ * bern(-dP)) / (hx * hx);
        b[i] = -((Dp_ * bern(dP)) + (Dm_ * bern(-dM))) / (hx * hx) - nn[i] / den;
        f[i] = -(ni * ni) / den - G[i];
      }
      const pp = tridiag(a, b, c, f);
      for (let i = 0; i < Np; i++) { n[i] = Math.max(nn[i], 1e-30); p[i] = Math.max(pp[i], 1e-30); }
    }
    function gummel(maxIt = 300, tol = 1e-6) {
      const phin = new Float64Array(Np), phip = new Float64Array(Np);
      let it = 0, d = 1;
      for (; it < maxIt; it++) {
        for (let i = 0; i < Np; i++) { phin[i] = u[i] - Math.log(n[i] / ni); phip[i] = u[i] + Math.log(p[i] / ni); }
        const B = bc();
        const uOld = Float64Array.from(u);
        poisson(phin, phip, B.uL, B.uR);
        d = 0; for (let i = 0; i < Np; i++) d = Math.max(d, Math.abs(u[i] - uOld[i]));
        continuity();
        if (d < tol && it > 1) break;
      }
      self.iters = it; self.converged = d < 1e-3;
      return d;
    }
    self.equilibrium = function () {
      Va = 0; self.Va = 0;
      const z = new Float64Array(Np);
      const B = bc();
      poisson(z, z, B.uL, B.uR);
      for (let i = 0; i < Np; i++) { n[i] = ni * Math.exp(u[i]); p[i] = ni * Math.exp(-u[i]); }
      if (G.some((g) => g)) gummel();
      return self;
    };
    /** 바이어스 Va(V)로 계단 이동 (step V) */
    self.solve = function (V, step = 0.05) {
      const dir = Math.sign(V - Va);
      while (Math.abs(V - Va) > 1e-9) {
        Va = Math.abs(V - Va) <= step ? V : Va + dir * step;
        self.Va = Va;
        gummel();
      }
      return self;
    };
    self.sweep = function (vs, cb) {
      const out = [];
      vs.forEach((v) => { self.solve(v); const s = self.state(); out.push([v, s.J]); cb && cb(v, s); });
      return out;
    };
    self.setG = function (g) { for (let i = 0; i < Np; i++) G[i] = g ? g(x[i]) : 0; gummel(); return self; };
    self.state = function () {
      const psi = new Float64Array(Np), Ec = new Float64Array(Np), Ev = new Float64Array(Np), Ei = new Float64Array(Np), Efn = new Float64Array(Np), Efp = new Float64Array(Np);
      const E = new Float64Array(Np), rho = new Float64Array(Np), R = new Float64Array(Np);
      const Eg = SC.Eg(mat, T), off = SC.EiOffset(mat, T);
      for (let i = 0; i < Np; i++) {
        psi[i] = u[i] * Vt;
        Ei[i] = -psi[i];
        Ec[i] = Ei[i] + Eg / 2 - off; Ev[i] = Ei[i] - Eg / 2 - off;
        Efn[i] = Ei[i] + Vt * Math.log(n[i] / ni);
        Efp[i] = Ei[i] - Vt * Math.log(p[i] / ni);
        rho[i] = q * (p[i] - n[i] + C[i]);
        R[i] = (n[i] * p[i] - ni * ni) / (taup[i] * (n[i] + n1) + taun[i] * (p[i] + p1));
      }
      for (let i = 0; i < Np; i++) { const i0 = Math.max(0, i - 1), i1 = Math.min(Np - 1, i + 1); E[i] = -(psi[i1] - psi[i0]) / (x[i1] - x[i0]); }
      const Jn = new Float64Array(Np - 1), Jp = new Float64Array(Np - 1);
      for (let i = 0; i < Np - 1; i++) {
        const dP = u[i + 1] - u[i];
        const Dn = 0.5 * (mun[i] + mun[i + 1]) * Vt, Dp = 0.5 * (mup[i] + mup[i + 1]) * Vt;
        Jn[i] = ((q * Dn) / hx) * (n[i + 1] * bern(dP) - n[i] * bern(-dP));
        Jp[i] = ((q * Dp) / hx) * (p[i] * bern(dP) - p[i + 1] * bern(-dP));
      }
      // 총 전류: 다수 캐리어 영역의 Jn·Jp는 큰 드리프트·확산 플럭스의 차라 반올림 잡음이 크다.
      // 그래서 Jn은 n이 가장 작은 변에서, Jp는 p가 가장 작은 변에서 읽고, 연속 방정식
      // dJp/dx = −q(R−G) 로 Jp를 같은 변으로 옮겨 더한다.
      let iN = 0, iP = 0;
      for (let i = 0; i < Np - 1; i++) { if (n[i] + n[i + 1] < n[iN] + n[iN + 1]) iN = i; if (p[i] + p[i + 1] < p[iP] + p[iP + 1]) iP = i; }
      let integ = 0; // ∫(R−G)dx from edge iP to edge iN (edge k at node k+½)
      const a0 = Math.min(iN, iP), a1 = Math.max(iN, iP);
      for (let k = a0 + 1; k <= a1; k++) integ += (R[k] - G[k]) * hx;
      const JpAtN = Jp[iP] - q * (iN >= iP ? integ : -integ);
      const J = Jn[iN] + JpAtN;
      return { x, psi, n: Float64Array.from(n), p: Float64Array.from(p), C, Ec, Ev, Ei, Efn, Efp, E, rho, R, Jn, Jp, J, Va, ni, Vt, Eg, iters: self.iters, converged: self.converged };
    };
    self.x = x; self.C = C; self.Np = Np; self.L = L; self.ni = ni; self.Vt = Vt;
    self.equilibrium();
  };

  /* ------------------------------------------------------------ 그리기 헬퍼 */
  /**
   * 밴드 다이어그램. d = { x:[...], Ec, Ev, Ei?, Ef?|Efn?, Efp?, labels:true, fill:true }
   * opts = { x:[min,max], y:[min,max], xLabel, yLabel, xFmt, box, carriers:{n,p,scale} }
   * 내부적으로 PB.chart 축을 쓰고 { X, Y, box } 반환.
   */
  SC.drawBands = function (ctx, box, d, opts = {}) {
    const P = PB.palette();
    const xs = d.x, N = xs.length;
    const pts = (arr) => { const o = []; for (let i = 0; i < N; i++) o.push([xs[i], arr[i]]); return o; };
    let ymin = Infinity, ymax = -Infinity;
    [d.Ec, d.Ev, d.Efn, d.Efp, d.Ef].forEach((a) => { if (!a) return; for (let i = 0; i < N; i++) { const v = typeof a === "number" ? a : a[i]; ymin = Math.min(ymin, v); ymax = Math.max(ymax, v); } });
    const pad = (ymax - ymin) * 0.12 + 0.05;
    const series = [];
    series.push({ data: pts(d.Ec), color: P.ec, width: 2.6 });
    series.push({ data: pts(d.Ev), color: P.ev, width: 2.6 });
    if (d.Ei) series.push({ data: pts(d.Ei), color: P.faint, width: 1.2, dash: [2, 4] });
    const flat = (v) => xs.map((xx) => [xx, v]);
    if (d.Ef != null) series.push({ data: typeof d.Ef === "number" ? flat(d.Ef) : pts(d.Ef), color: P.ef, width: 2, dash: [7, 5] });
    if (d.Efn) series.push({ data: pts(d.Efn), color: P.e, width: 1.8, dash: [7, 4] });
    if (d.Efp) series.push({ data: pts(d.Efp), color: P.h, width: 1.8, dash: [7, 4] });
    const ch = PB.chart(ctx, box, Object.assign({ x: [xs[0], xs[N - 1]], y: [ymin - pad, ymax + pad], xLabel: "위치", yLabel: "에너지 (eV)", series }, opts));
    if (d.fill !== false) {
      // 밴드갭 바깥을 은은하게 칠한다
      ctx.save(); ctx.beginPath(); ctx.rect(ch.box.x, ch.box.y, ch.box.w, ch.box.h); ctx.clip();
      ctx.globalAlpha = 0.07;
      ctx.fillStyle = P.ec; ctx.beginPath(); ctx.moveTo(ch.X(xs[0]), ch.box.y);
      for (let i = 0; i < N; i++) ctx.lineTo(ch.X(xs[i]), ch.Y(d.Ec[i]));
      ctx.lineTo(ch.X(xs[N - 1]), ch.box.y); ctx.closePath(); ctx.fill();
      ctx.fillStyle = P.ev; ctx.beginPath(); ctx.moveTo(ch.X(xs[0]), ch.box.y + ch.box.h);
      for (let i = 0; i < N; i++) ctx.lineTo(ch.X(xs[i]), ch.Y(d.Ev[i]));
      ctx.lineTo(ch.X(xs[N - 1]), ch.box.y + ch.box.h); ctx.closePath(); ctx.fill();
      ctx.restore();
    }
    if (d.labels !== false) {
      ctx.save(); ctx.font = PB.font(12, false, 700); ctx.textAlign = "left"; ctx.textBaseline = "bottom";
      const lx = ch.box.x + ch.box.w - 4;
      ctx.textAlign = "right";
      ctx.fillStyle = P.ec; ctx.fillText("E꜀", lx, ch.Y(d.Ec[N - 1]) - 3);
      ctx.fillStyle = P.ev; ctx.textBaseline = "top"; ctx.fillText("Eᵥ", lx, ch.Y(d.Ev[N - 1]) + 3);
      ctx.textBaseline = "bottom";
      if (d.Ef != null) { ctx.fillStyle = P.ef; ctx.fillText("E_F", lx, ch.Y(typeof d.Ef === "number" ? d.Ef : d.Ef[N - 1]) - 3); }
      if (d.Efn) { ctx.fillStyle = P.e; ctx.fillText("E_Fn", lx - 40, ch.Y(d.Efn[N - 1]) - 3); }
      if (d.Efp) { ctx.fillStyle = P.h; ctx.textBaseline = "top"; ctx.fillText("E_Fp", ch.box.x + 44, ch.Y(d.Efp[0]) + 3); }
      ctx.restore();
    }
    return ch;
  };
  /** 전자(채운 원)·정공(빈 원) 하나 그리기 */
  SC.dot = function (ctx, x, y, kind, r = 4) {
    const P = PB.palette();
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2);
    if (kind === "e") { ctx.fillStyle = P.e; ctx.fill(); }
    else { ctx.fillStyle = P.bg; ctx.fill(); ctx.lineWidth = 1.6; ctx.strokeStyle = P.h; ctx.stroke(); }
  };
  /** 10의 거듭제곱 표시: SC.sci(3.2e17) → "3.2×10¹⁷" (HTML 아닌 유니코드) */
  const SUP = { "-": "⁻", 0: "⁰", 1: "¹", 2: "²", 3: "³", 4: "⁴", 5: "⁵", 6: "⁶", 7: "⁷", 8: "⁸", 9: "⁹" };
  SC.sci = function (v, d = 2) {
    if (!isFinite(v)) return "—";
    if (v === 0) return "0";
    let e = Math.floor(Math.log10(Math.abs(v))), mnt = v / Math.pow(10, e);
    if (Math.abs(Number(mnt.toPrecision(d))) >= 10) { mnt /= 10; e++; }
    const es = String(e).split("").map((ch) => SUP[ch]).join("");
    const ms = Number(mnt.toPrecision(d));
    return (ms === 1 ? "" : ms + "×") + "10" + es;
  };
  /** HTML 위첨자 버전: SC.sciH(3.2e17) → "3.2×10<sup>17</sup>" */
  SC.sciH = function (v, d = 2) {
    if (!isFinite(v)) return "—";
    if (v === 0) return "0";
    let e = Math.floor(Math.log10(Math.abs(v))), mnt = v / Math.pow(10, e);
    if (Math.abs(Number(mnt.toPrecision(d))) >= 10) { mnt /= 10; e++; }
    const ms = Number(mnt.toPrecision(d));
    return (ms === 1 ? "" : ms + "×") + "10<sup>" + e + "</sup>";
  };
})();
