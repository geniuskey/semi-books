/* Copyright (c) 2026 geniuskey and TCADBook contributors.
   Executable code: MIT (see ../LICENSE-MIT).
   Educational content and illustrations: CC-BY-4.0 (see ../LICENSE.md). */
/* ==========================================================================
   TCADBook 공정 엔진 — TC에 붙는다(tcad.js 다음에 로드)
   이온 주입(LSS·피어슨 표, 이중 피어슨, 2D 측면 퍼짐·그림자, 이진 충돌 몬테카를로, 손상),
   확산·열처리(Fair 공공 모델, 페르미 준위 의존 D, TED, 클러스터 활성화, 음해법 1D/2D),
   산화(Deal-Grove + Massoud), 편석, LOCOS, 형상(셀 모델 증착·식각), TN-45 공정 흐름.
   단위: 길이 nm, 농도 cm⁻³, 도즈 cm⁻², 이온 에너지 keV, 공정 온도 °C, 시간 s, 확산 계수 cm²/s.
   ========================================================================== */
(function () {
  "use strict";
  const TC = window.TC;
  const kB = TC.kB, PI = Math.PI, SQ2 = Math.SQRT2;

  /** 상보 오차 함수(상대 오차 < 1.2e-7, 꼬리까지 정확) */
  function erfc(x) {
    const z = Math.abs(x), t = 1 / (1 + 0.5 * z);
    const r = t * Math.exp(-z * z - 1.26551223 + t * (1.00002368 + t * (0.37409196 + t * (0.09678418 + t * (-0.18628806 + t * (0.27886807 + t * (-1.13520398 + t * (1.48851587 + t * (-0.82215223 + t * 0.17087277)))))))));
    return x >= 0 ? r : 2 - r;
  }
  const erf = (x) => 1 - erfc(x);
  TC.erfc = TC.erfc || erfc;
  TC.erf = TC.erf || erf;
  function rng(seed) { let a = seed >>> 0; return function () { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  const vec = (x, f) => (typeof x === "number" ? f(x) : Float64Array.from(x, f));
  TC.MIN = 60; TC.HR = 3600;

  /* ------------------------------------------------------------ 이온 주입: 표 */
  // 비정질 Si 기준 LSS/TRIM 계열 대표값(Gibbons 표, Plummer 그림 8-x의 경향). Rp, dRp: nm, g: 왜도 γ, lat: 측면 산포/dRp
  const EGRID = [1, 2, 5, 10, 20, 30, 50, 100, 200, 500];
  const IMPLANT = {
    B:   { Z: 5,  M: 11.01, sp: "B",  Rp: [5.5, 10, 20, 35, 68, 99, 160, 300, 530, 1000], dRp: [4, 6.8, 12, 18, 28, 37, 51, 71, 93, 120], g: [0.2, 0.1, -0.1, -0.3, -0.45, -0.5, -0.65, -0.8, -1, -1.2], lat: 1.1, surv: 0.05 },
    P:   { Z: 15, M: 30.97, sp: "P",  Rp: [3, 4.5, 8.5, 14, 26, 38, 61, 124, 254, 620], dRp: [1.8, 2.7, 4.7, 7.5, 12.5, 17, 26, 46, 78, 145], g: [0.5, 0.45, 0.4, 0.35, 0.25, 0.2, 0.1, -0.1, -0.3, -0.55], lat: 0.9, surv: 0.4 },
    As:  { Z: 33, M: 74.92, sp: "As", Rp: [2.6, 3.8, 6.2, 9.9, 15.9, 21.5, 32.2, 58.2, 112, 275], dRp: [1.1, 1.6, 2.4, 3.6, 5.9, 7.9, 11.8, 20.7, 37, 80], g: [0.6, 0.6, 0.55, 0.5, 0.45, 0.4, 0.35, 0.25, 0.1, 0], lat: 0.75, surv: 1 },
    Sb:  { Z: 51, M: 121.76, sp: "Sb", Rp: [2.3, 3.3, 5.4, 8.2, 12.6, 16.6, 24.4, 43, 80, 190], dRp: [0.9, 1.2, 1.9, 2.8, 4.3, 5.6, 8.1, 13.5, 23.5, 50], g: [0.7, 0.7, 0.65, 0.6, 0.55, 0.5, 0.45, 0.4, 0.3, 0.2], lat: 0.7, surv: 1 },
    In:  { Z: 49, M: 114.82, sp: "In", Rp: [2.4, 3.4, 5.6, 8.5, 13.1, 17.3, 25.4, 44.7, 83, 198], dRp: [0.95, 1.25, 2, 2.9, 4.5, 5.8, 8.4, 14, 24.4, 52], g: [0.7, 0.7, 0.65, 0.6, 0.55, 0.5, 0.45, 0.4, 0.3, 0.2], lat: 0.7, surv: 1 },
    BF2: { via: "B", r: 11.01 / 49.0, sp: "B", surv: 0.3 },
  };
  IMPLANT.E = EGRID;
  TC.IMPLANT = IMPLANT;
  const SCREEN_K = 1.2; // 산화막 1 nm ≈ Si 1.2 nm 저지 능력

  function logInterp(arr, E, lin) {
    const lE = Math.log(E), n = EGRID.length;
    let i = 0; while (i < n - 2 && E > EGRID[i + 1]) i++;
    const l0 = Math.log(EGRID[i]), l1 = Math.log(EGRID[i + 1]), t = (lE - l0) / (l1 - l0);
    if (lin) return arr[i] + Math.max(-0.5, Math.min(1.5, t)) * (arr[i + 1] - arr[i]);
    return Math.exp(Math.log(arr[i]) + t * (Math.log(arr[i + 1]) - Math.log(arr[i])));
  }
  /** 피어슨 IV가 되도록 첨도 β를 올린다 */
  function fixBeta(g, b) {
    for (let k = 0; k < 600; k++) {
      const A = 10 * b - 12 * g * g - 18, b2 = -(2 * b - 3 * g * g - 6) / A, a = (-g * (b + 3)) / A, b0 = -(4 * b - 3 * g * g) / A;
      if (A > 0 && b2 < 0 && 4 * b0 * b2 - a * a > 0) return b;
      b += 0.05;
    }
    return b;
  }
  /** 주입 모멘트 {Rp, dRp, gamma, beta, lat}(nm). 에너지 keV, 표를 log-log 보간. BF2는 B 원자 몫 에너지(11/49)로 */
  TC.implantMoments = function (ion, E) {
    const t = IMPLANT[ion];
    if (!t) throw new Error("TC.implantMoments: 모르는 이온 " + ion);
    if (t.via) return TC.implantMoments(t.via, E * t.r);
    const Rp = logInterp(t.Rp, E), dRp = logInterp(t.dRp, E), g = logInterp(t.g, E, true);
    return { Rp, dRp, gamma: g, beta: fixBeta(g, 3.2 + 2.4 * g * g), lat: t.lat * dRp };
  };

  /* ------------------------------------------------------------ 피어슨 분포 */
  const PCACHE = new Map();
  /** 정규화된 분포 객체 {pdf(x), cdf(x)}. 가우시안(γ=0, β=3) 또는 피어슨 IV */
  function dist(Rp, dRp, g, b) {
    const key = Rp.toPrecision(7) + "|" + dRp.toPrecision(7) + "|" + g.toPrecision(5) + "|" + b.toPrecision(5);
    let P = PCACHE.get(key);
    if (P) return P;
    if (Math.abs(g) < 1e-9 && Math.abs(b - 3) < 1e-9) {
      const s = SQ2 * dRp;
      P = { pdf: (x) => Math.exp(-((x - Rp) * (x - Rp)) / (s * s)) / (Math.sqrt(PI) * s), cdf: (x) => 0.5 * erfc((Rp - x) / s) };
    } else {
      b = fixBeta(g, b);
      const A = 10 * b - 12 * g * g - 18, a = (-g * dRp * (b + 3)) / A, b0 = (-dRp * dRp * (4 * b - 3 * g * g)) / A, b2 = -(2 * b - 3 * g * g - 6) / A;
      const sq = Math.sqrt(4 * b0 * b2 - a * a), kA = (a * (1 + 2 * b2)) / (b2 * sq);
      const lnf = (s) => Math.log(-(b0 + a * s + b2 * s * s)) / (2 * b2) - kA * Math.atan((2 * b2 * s + a) / sq);
      const l0 = lnf(a), lo = Rp - 20 * dRp, hi = Rp + 20 * dRp, n = 2400, h = (hi - lo) / n;
      const cum = new Float64Array(n + 1), f = (x) => Math.exp(lnf(x - Rp) - l0);
      let prev = f(lo);
      for (let i = 1; i <= n; i++) { const v = f(lo + i * h); cum[i] = cum[i - 1] + 0.5 * h * (prev + v); prev = v; }
      const Z = cum[n];
      P = {
        pdf: (x) => f(x) / Z,
        cdf: (x) => { if (x <= lo) return 0; if (x >= hi) return 1; const u = (x - lo) / h, i = Math.floor(u); return (cum[i] + (u - i) * (cum[Math.min(n, i + 1)] - cum[i])) / Z; },
      };
    }
    if (PCACHE.size > 400) PCACHE.clear();
    PCACHE.set(key, P);
    return P;
  }
  /** 피어슨 IV 정규화 밀도(1/nm). γ=0, β=3이면 가우시안. 비정상 β는 피어슨 IV 영역까지 올린다 */
  TC.pearson4 = (x, Rp, dRp, gamma = 0, beta = 3) => dist(Rp, dRp, gamma, beta).pdf(x);

  /** 주입 깊이 분포 함수. o: {ion, E, dose, model, tilt(°), screen(nm 산화막), channel(이중 피어슨 채널링 몫)} */
  function implantProfile(o) {
    const m = TC.implantMoments(o.ion, o.E), th = ((o.tilt || 0) * PI) / 180, c = Math.cos(th), s = Math.sin(th);
    const Rp = m.Rp * c, dRp = Math.sqrt(m.dRp * m.dRp * c * c + m.lat * m.lat * s * s), lat = Math.sqrt(m.lat * m.lat * c * c + m.dRp * m.dRp * s * s);
    const model = o.model || "pearson", sEq = (o.screen || 0) * SCREEN_K;
    const comps = [];
    if (model === "gauss") comps.push([1, dist(Rp, dRp, 0, 3)]);
    else comps.push([1, dist(Rp, dRp, m.gamma, m.beta)]);
    if (model === "dual") {
      const r = o.channel != null ? o.channel : 0.1;
      comps[0][0] = 1 - r;
      comps.push([r, dist(Rp + 2 * dRp, 1.6 * dRp, 0.8, 5)]);
    }
    const pdf = (x) => { let v = 0; for (const [w, P] of comps) v += w * P.pdf(x); return v; };
    const cdf = (x) => { let v = 0; for (const [w, P] of comps) v += w * P.cdf(x); return v; };
    const frac = 1 - cdf(sEq), dose = o.dose || 1;
    const k = sEq > 0 ? dose * 1e7 : (dose * 1e7) / frac; // 1/nm → 1/cm
    return { C: (x) => (x < 0 ? 0 : k * pdf(x + sEq)), Rp: Rp - sEq, dRp, gamma: m.gamma, beta: m.beta, lat, dose: sEq > 0 ? dose * frac : dose };
  }
  /**
   * 1D 주입 프로파일. o: {ion: "B"|"BF2"|"P"|"As"|"Sb"|"In", E(keV), dose(cm⁻²), model: "gauss"|"pearson"|"dual",
   *   tilt(°), screen(산화막 nm, 그 안에 멈춘 몫은 잃는다), channel(이중 피어슨 채널링 몫, 기본 0.1), x(nm 배열)}
   * → {x, C(cm⁻³), Rp, dRp, gamma, beta, lat, peak, dose(실리콘에 남은 도즈)}. 화면 산화막이 없으면 ∫C dx = dose
   */
  TC.implant1d = function (o) {
    const P = implantProfile(o);
    const x = o.x || TC.linspace(0, P.Rp + 7 * P.dRp + 5, 400);
    const C = Float64Array.from(x, P.C);
    return { x, C, Rp: P.Rp, dRp: P.dRp, gamma: P.gamma, beta: P.beta, lat: P.lat, peak: TC.minmax(C)[1], dose: P.dose };
  };
  /** 열린 구간에서 블록 그림자를 뺀다. tan: 기울기 탄젠트(+이면 빔이 +x로 진행) */
  function openIntervals(mask, blocks, tan) {
    let iv = mask && mask.length ? mask.map((r) => [Math.min(r[0], r[1]), Math.max(r[0], r[1])]) : [[-Infinity, Infinity]];
    (blocks || []).forEach((b) => {
      const h = b.h != null ? b.h : 1e9, c0 = b.x0 + Math.min(0, h * tan), c1 = b.x1 + Math.max(0, h * tan), out = [];
      iv.forEach(([a, e]) => { if (e <= c0 || a >= c1) out.push([a, e]); else { if (a < c0) out.push([a, c0]); if (e > c1) out.push([c1, e]); } });
      iv = out;
    });
    return iv;
  }
  /**
   * 2D 주입. o: implant1d 옵션 + {grid: {xs, ys}, mask: [[x0, x1], …] 열린 창(생략 시 전체),
   *   blocks: [{x0, x1, h}] 표면 위 차단물(게이트·스페이서·레지스트, 높이 h nm로 기울인 빔의 그림자를 만든다),
   *   rot: 2면 +tilt/−tilt로 도즈를 반씩(2D에서의 4방향 할로)}
   * 세로 분포 × 측면 가우시안(열린 구간을 erf로 적분), 깊이 y에서 y·tanθ만큼 옆으로 밀린다. → Float64Array(nx·ny), [j·nx + i]
   */
  TC.implant2d = function (o) {
    const xs = o.grid.xs, ys = o.grid.ys, nx = xs.length, ny = ys.length, out = new Float64Array(nx * ny);
    const tl = o.tilt || 0, tilts = o.rot === 2 || o.rot === "both" ? [tl, -tl] : [tl];
    tilts.forEach((t) => {
      const P = implantProfile(Object.assign({}, o, { tilt: Math.abs(t), dose: (o.dose || 1) / tilts.length }));
      const tan = Math.tan((t * PI) / 180), iv = openIntervals(o.mask, o.blocks, tan), s = SQ2 * P.lat;
      for (let j = 0; j < ny; j++) {
        const cv = P.C(ys[j]);
        if (cv <= 0) continue;
        const sh = ys[j] * tan;
        for (let i = 0; i < nx; i++) {
          const u = xs[i] - sh;
          let f = 0;
          for (const [a, b] of iv) f += 0.5 * (erfc((a - u) / s) - erfc((b - u) / s));
          out[j * nx + i] += cv * f;
        }
      }
    });
    return out;
  };

  /* ------------------------------------------------------------ 몬테카를로 이온 궤적 */
  const ZBL = (x) => 0.1818 * Math.exp(-3.2 * x) + 0.5099 * Math.exp(-0.9423 * x) + 0.2802 * Math.exp(-0.4029 * x) + 0.02817 * Math.exp(-0.2016 * x);
  const dZBL = (x) => -0.58176 * Math.exp(-3.2 * x) - 0.48048 * Math.exp(-0.9423 * x) - 0.11289 * Math.exp(-0.4029 * x) - 0.005679 * Math.exp(-0.2016 * x);
  const GLX = [0.0198550717512319, 0.1016667612931866, 0.2372337950418355, 0.4082826787521751, 0.5917173212478249, 0.7627662049581645, 0.8983332387068134, 0.9801449282487681];
  const GLW = [0.0506142681451881, 0.1111905172266872, 0.1568533229389436, 0.1813418916891810, 0.1813418916891810, 0.1568533229389436, 0.1111905172266872, 0.0506142681451881];
  /** 무게중심계 산란각(rad): ZBL 만능 퍼텐셜, 환산 에너지 ε, 환산 충돌 변수 b. 가우스-르장드르 8점 */
  function scatterCM(eps, b) {
    let x = 1 / (2 * eps) + Math.sqrt(1 / (4 * eps * eps) + b * b);
    for (let k = 0; k < 40; k++) {
      const p = ZBL(x), f = x * x - (x * p) / eps - b * b, df = 2 * x - (p + x * dZBL(x)) / eps;
      let nx = x - f / (df > 1e-12 ? df : 1e-12);
      if (nx <= 0) nx = 0.5 * x;
      if (Math.abs(nx - x) < 1e-9 * x) { x = nx; break; }
      x = nx;
    }
    let s = 0;
    for (let k = 0; k < 8; k++) {
      const t = GLX[k], r = x / (1 - t * t), g = 1 - ZBL(r) / (r * eps) - (b * b) / (r * r);
      s += (GLW[k] * 2 * t) / Math.sqrt(Math.max(g, 1e-12));
    }
    return PI - ((2 * b) / x) * s;
  }
  /** Lindhard 손상 에너지(eV): 이온(Z1, M1)이 Si에 남기는 원자 변위용 에너지 */
  function damageEnergy(Z1, M1, E) {
    const Z2 = 14, M2 = 28.086, z23 = Math.pow(Z1, 2 / 3) + Math.pow(Z2, 2 / 3);
    const eps = E / ((30.724 * Z1 * Z2 * Math.sqrt(z23) * (M1 + M2)) / M2);
    const k = (0.0793 * Math.pow(Z1, 2 / 3) * Math.sqrt(Z2) * Math.pow(M1 + M2, 1.5)) / (Math.pow(z23, 0.75) * Math.pow(M1, 1.5) * Math.sqrt(M2));
    return E / (1 + k * (3.4008 * Math.pow(eps, 1 / 6) + 0.40244 * Math.pow(eps, 0.75) + eps));
  }
  const ED = 15; // Si 변위 문턱 에너지 eV
  const kpN = (nu) => (nu < ED ? 0 : nu < 2.5 * ED ? 1 : (0.8 * nu) / (2 * ED));
  /**
   * 장난감 이진 충돌(BCA) 몬테카를로: 비정질 Si, ZBL 만능 퍼텐셜(산란 적분), 전자 저지 Se = k√E(k는 Lindhard 값과 Plummer의 0.2e-15 eV^½cm² 중 큰 것), 고정 자유 비행 N^(−1/3).
   * o: {n(이온 수, 기본 300), seed, tilt(°), crystal(장난감 <100> 채널링), ntraj(궤적 저장 수, 기본 40), Ef(멈춤 에너지 eV, 기본 10)}
   * → {z, x(멈춘 위치 nm, Float32Array), traj: [[[x, z], …]](nm, z 깊이), Rp, dRp, gamma, lat, back(후방 산란 비율),
   *    vac(깊이 1 nm 칸당 이온 하나의 Kinchin-Pease 변위 수), nd(이온당 변위 수), hist(bin) → {x, C(도즈 1 cm⁻²당 cm⁻³)}}
   */
  TC.mcIon = function (ion, E, o = {}) {
    let t = IMPLANT[ion], E0 = E * 1000;
    if (t.via) { E0 *= t.r; t = IMPLANT[t.via]; }
    const n = o.n || 300, rnd = rng(o.seed || 1), th = ((o.tilt || 0) * PI) / 180, ntr = o.ntraj != null ? o.ntraj : 40, Ef = o.Ef || 10;
    const Z1 = t.Z, M1 = t.M, Z2 = 14, M2 = 28.086, Nat = 49.94, L = Math.pow(Nat, -1 / 3), pmax = 1 / Math.sqrt(PI * Nat * L);
    const a = (0.8854 * 0.05292) / (Math.pow(Z1, 0.23) + Math.pow(Z2, 0.23));
    const epsK = (a * 10 * M2) / (Z1 * Z2 * 14.4 * (M1 + M2));
    const kSe = Math.max(1, ((1.212 * Math.pow(Z1, 7 / 6) * Z2) / (Math.pow(Math.pow(Z1, 2 / 3) + Math.pow(Z2, 2 / 3), 1.5) * Math.sqrt(M1))) * 0.5);
    const gm = (4 * M1 * M2) / ((M1 + M2) * (M1 + M2)), mr = M1 / M2;
    const zs = [], xs = [], traj = [], vacBins = [];
    let back = 0, ndTot = 0;
    for (let k = 0; k < n; k++) {
      let x = 0, y = 0, z = 0, u = Math.sin(th), v = 0, w = Math.cos(th), En = E0, first = true;
      let chan = !!o.crystal && rnd() > 0.3;
      const tr = k < ntr ? [[0, 0]] : null;
      let lx = 0, lz = 0;
      while (En > Ef) {
        const fl = first ? L * rnd() : L; first = false;
        x += u * fl; y += v * fl; z += w * fl;
        if (z < 0) { back++; break; }
        if (chan) {
          const psi = 0.5 * Math.sqrt((2 * Z1 * Z2 * 1.44) / (En * 0.543));
          if (w < Math.cos(psi) || rnd() < fl / 25) chan = false;
        }
        En -= kSe * Math.sqrt(En) * fl * (chan ? 0.5 : 1);
        if (En <= Ef) break;
        const p = pmax * Math.sqrt(chan ? 0.5 + 0.5 * rnd() : rnd());
        const tcm = scatterCM(epsK * En, p / a), sh = Math.sin(tcm / 2), T = gm * En * sh * sh;
        En -= T;
        if (T > ED) {
          const nd = kpN(damageEnergy(14, M2, T)), b = Math.floor(z);
          vacBins[b] = (vacBins[b] || 0) + nd; ndTot += nd;
        }
        const psiL = Math.atan2(Math.sin(tcm), Math.cos(tcm) + mr), cp = Math.cos(psiL), spp = Math.sin(psiL), ph = 2 * PI * rnd(), cf = Math.cos(ph), sf = Math.sin(ph);
        if (Math.abs(w) > 0.99999) { u = spp * cf; v = spp * sf; w = (w > 0 ? 1 : -1) * cp; }
        else {
          const sq = Math.sqrt(1 - w * w), nu = u * cp + (spp * (u * w * cf - v * sf)) / sq, nv = v * cp + (spp * (v * w * cf + u * sf)) / sq;
          w = w * cp - sq * spp * cf; u = nu; v = nv;
        }
        if (tr && (x - lx) * (x - lx) + (z - lz) * (z - lz) > 0.25) { tr.push([x, z]); lx = x; lz = z; }
      }
      if (tr) { tr.push([x, Math.max(z, 0)]); traj.push(tr); }
      if (z >= 0) { zs.push(z); xs.push(x); }
    }
    const m = zs.length;
    let mu = 0, mx = 0; zs.forEach((q) => (mu += q)); mu /= m || 1;
    let s2 = 0, s3 = 0; zs.forEach((q) => { const d = q - mu; s2 += d * d; s3 += d * d * d; });
    xs.forEach((q) => (mx += q * q));
    const sd = Math.sqrt(s2 / (m || 1)), Z = Float32Array.from(zs), X = Float32Array.from(xs);
    const vac = Float64Array.from({ length: vacBins.length }, (_, i) => (vacBins[i] || 0) / n);
    return {
      z: Z, x: X, traj, Rp: mu, dRp: sd, gamma: s3 / (m || 1) / (sd * sd * sd || 1), lat: Math.sqrt(mx / (m || 1)), back: back / n, vac, nd: ndTot / n,
      hist(bin = 1) {
        const nb = Math.ceil((TC.minmax(Z)[1] + bin) / bin), c = new Float64Array(nb);
        Z.forEach((q) => c[Math.floor(q / bin)]++);
        return { x: Array.from({ length: nb }, (_, i) => (i + 0.5) * bin), C: c.map((q) => (q / n / (bin * 1e-7))) };
      },
    };
  };
  /**
   * 해석적 손상(Kinchin-Pease + Lindhard 분배): 변위 원자 밀도(cm⁻³). 손상 중심 0.75·Rp, 폭 dRp.
   * surv: 동적 어닐 뒤 살아남는 몫(장난감, 기본 B 0.05·BF2 0.3·P 0.4·As/Sb/In 1). crit: 비정질화 임계 밀도(기본 1.15e22)
   * → {x, N, nd(이온당 변위), amorph: [x0, x1] | null, critDose(cm⁻²)}
   */
  TC.damage = function (ion, E, dose, x, o = {}) {
    const t = IMPLANT[ion], m = TC.implantMoments(ion, E), surv = o.surv != null ? o.surv : t.surv, crit = o.crit || 1.15e22;
    let nd;
    if (ion === "BF2") nd = kpN(damageEnergy(5, 11.01, E * 1000 * (11.01 / 49))) + 2 * kpN(damageEnergy(9, 19, E * 1000 * (19 / 49)));
    else nd = kpN(damageEnergy(t.Z, t.M, E * 1000));
    x = x || TC.linspace(0, m.Rp + 5 * m.dRp, 300);
    const P = dist(0.75 * m.Rp, m.dRp, 0, 3), norm = 1 - P.cdf(0), k = (surv * nd * 1e7) / norm;
    const N = Float64Array.from(x, (q) => dose * k * P.pdf(q));
    let a = null, b = null;
    for (let i = 0; i < x.length; i++) if (N[i] >= crit) { if (a === null) a = x[i]; b = x[i]; }
    const gmax = P.pdf(Math.max(0, 0.75 * m.Rp));
    return { x, N, nd, amorph: a === null ? null : [a, b], critDose: crit / (k * gmax) };
  };

  /* ------------------------------------------------------------ 확산 계수 */
  // Fair 공공 모델(Plummer 표 7-5). [D0(cm²/s), Ea(eV)]. 0: 중성, p: 양(+) 공공, m: 음(−), mm: 이중 음(=). fI: 격자간 매개 몫
  // Cs: 전기적 활성 한계 [C0, Ea] → Cs(T) = C0·exp(−Ea/kT)
  TC.DIFF = {
    B:  { name: "붕소", type: -1, D0: [0.037, 3.46], Dp: [0.72, 3.46], fI: 1, Cs: [9.2e22, 0.73] },
    P:  { name: "인", type: 1, D0: [3.85, 3.66], Dm: [4.44, 4.0], Dmm: [44.2, 4.37], fI: 1, Cs: [2.45e23, 0.62] },
    As: { name: "비소", type: 1, D0: [0.066, 3.44], Dm: [12.0, 4.05], fI: 0.4, Cs: [2.2e22, 0.47] },
    Sb: { name: "안티몬", type: 1, D0: [0.214, 3.65], Dm: [15.0, 4.08], fI: 0.02, Cs: [4.5e21, 0.5] },
    In: { name: "인듐", type: -1, D0: [16.5, 3.9], fI: 1, Cs: [1.5e20, 0.6] },
  };
  /** 분리(편석) 계수 m = C_Si / C_SiO2 */
  TC.SEG = { B: 0.3, P: 10, As: 10, Sb: 10, In: 0.1 };
  TC.SI_CONSUME = 0.44;
  const arr = (p, kt) => (p ? p[0] * Math.exp(-p[1] / kt) : 0);
  /** 공정 온도의 진성 농도(cm⁻³), Plummer: 3.9e16·T^1.5·exp(−0.605/kT). 1000 °C에서 약 7e18 */
  TC.niT = (Tc) => { const T = Tc + 273.15; return 3.9e16 * Math.pow(T, 1.5) * Math.exp(-0.605 / (kB * T)); };
  /** 성분별 확산 계수 {d0, d1, d2}(cm²/s): 도너는 D0 + D⁻(n/ni) + D=(n/ni)², 억셉터는 D0 + D⁺(p/ni) */
  function dParts(sp, Tc) {
    const p = TC.DIFF[sp], kt = kB * (Tc + 273.15);
    return { d0: arr(p.D0, kt), d1: p.type > 0 ? arr(p.Dm, kt) : arr(p.Dp, kt), d2: arr(p.Dmm, kt), type: p.type };
  }
  /** 확산 계수(cm²/s). r = n/ni(생략 시 1, 진성). 붕소 1000 °C 진성 약 1.5e-14 */
  TC.diffCoef = function (sp, Tc, r = 1) {
    const d = dParts(sp, Tc);
    return d.type > 0 ? d.d0 + d.d1 * r + d.d2 * r * r : d.d0 + d.d1 / r;
  };
  /** 전기적 활성 한계(cm⁻³) */
  TC.solubility = (sp, Tc) => arr(TC.DIFF[sp].Cs, kB * (Tc + 273.15));
  const actv = (c, cs) => { const q = c / cs, q4 = q * q * q * q; return c / Math.pow(1 + q4, 0.25); };
  /** 활성 농도: 고용 한계 Cs(T)에서 부드럽게 포화(C/(1+(C/Cs)⁴)^¼). C: 숫자 또는 배열 */
  TC.activate = (C, sp, Tc) => { const cs = TC.solubility(sp, Tc); return vec(C, (c) => actv(c, cs)); };

  /* ------------------------------------------------------------ 온도 이력 */
  /** 스파이크 어닐 온도 이력 [[t(s), T(°C)], …]. o: {peak, up(°C/s), down(°C/s), start(°C), hold(s)} */
  TC.spike = function (o = {}) {
    const pk = o.peak || 1050, T0 = o.start || 700, up = o.up || 150, dn = o.down || 75, hold = o.hold || 0;
    const t1 = (pk - T0) / up, t2 = t1 + hold;
    return [[0, T0], [t1, pk], [t2, pk], [t2 + (pk - T0) / dn, T0]];
  };
  function tempFn(T) {
    if (typeof T === "function") return T;
    if (Array.isArray(T)) return (t) => { if (t <= T[0][0]) return T[0][1]; for (let i = 1; i < T.length; i++) if (t <= T[i][0]) { const a = T[i - 1], b = T[i]; return a[1] + ((b[1] - a[1]) * (t - a[0])) / (b[0] - a[0] || 1); } return T[T.length - 1][1]; };
    return () => T;
  }
  /** 열 예산 ∫D dt(cm²). T: 온도(°C) 숫자·함수·이력 배열, t: 시간(s, 이력이면 생략 가능). r = n/ni */
  TC.Dt = function (sp, T, t, r = 1) {
    const f = tempFn(T), tEnd = t != null ? t : Array.isArray(T) ? T[T.length - 1][0] : 0, n = 400;
    let s = 0;
    for (let i = 0; i < n; i++) s += TC.diffCoef(sp, f(((i + 0.5) * tEnd) / n), r) * (tEnd / n);
    return s;
  };
  /** 일정 표면 농도 선확산: Cs·erfc(x/2√Dt). x nm, D cm²/s, t s */
  TC.predep = (x, Cs, D, t) => vec(x, (q) => Cs * erfc((q * 1e-7) / (2 * Math.sqrt(D * t))));
  /** 일정 도즈 드라이브인(가우시안): Q/√(πDt)·exp(−x²/4Dt). Q cm⁻² */
  TC.drivein = (x, Q, D, t) => vec(x, (q) => (Q / Math.sqrt(PI * D * t)) * Math.exp(-((q * 1e-7) ** 2) / (4 * D * t)));

  /* ------------------------------------------------------------ 확산 풀이(1D·2D 공통) */
  const SIGN = { B: -1, In: -1, P: 1, As: 1, Sb: 1 };
  function cvol(z) {
    const n = z.length, v = new Float64Array(n);
    if (n === 1) { v[0] = 1; return v; }
    for (let i = 0; i < n; i++) v[i] = 0.5 * ((i < n - 1 ? z[i + 1] - z[i] : 0) + (i > 0 ? z[i] - z[i - 1] : 0));
    return v;
  }
  /** 같은 열 예산으로 나눈 시간 격자(스파이크 꼭대기에 촘촘) */
  function timeGrid(Tf, t0, t1, n) {
    const m = 300, c = new Float64Array(m + 1), ts = new Float64Array(m + 1);
    for (let i = 0; i <= m; i++) ts[i] = t0 + ((t1 - t0) * i) / m;
    const w = ts.map((t) => Math.exp(-3.5 / (kB * (Tf(t) + 273.15))));
    let tot = 0; for (let i = 1; i <= m; i++) tot += 0.5 * (w[i] + w[i - 1]);
    for (let i = 1; i <= m; i++) c[i] = c[i - 1] + 0.3 / m + (0.7 * 0.5 * (w[i] + w[i - 1])) / (tot || 1);
    const out = [t0];
    let i = 0;
    for (let k = 1; k < n; k++) { const q = (k / n) * c[m]; while (c[i + 1] < q) i++; out.push(ts[i] + ((ts[i + 1] - ts[i]) * (q - c[i])) / (c[i + 1] - c[i])); }
    out.push(t1);
    return out;
  }
  function thomas(n, a, b, c, d) {
    for (let i = 1; i < n; i++) { const m = a[i] / b[i - 1]; b[i] -= m * c[i - 1]; d[i] -= m * d[i - 1]; }
    d[n - 1] /= b[n - 1];
    for (let i = n - 2; i >= 0; i--) d[i] = (d[i] - c[i] * d[i + 1]) / b[i];
  }
  /**
   * 확산 풀이 코어. xs(가로, 1D면 [0]), ys(깊이, 표면 j=0), fields: {종: 농도 배열}. 반음해 LOD(뒤쪽 오일러), D는 단계 시작에서 고정.
   * o: {T(°C | 함수 | 이력), model: "const"|"fermi"|"ted", ted: {factor, tau(1000 °C 기준 s), Ea(eV, 기본 4)}, cluster(활성 한계 위 원자는 안 움직임),
   *     background(고정 순 도핑 Nd−Na), surface: "reflect"|"outdiffuse"(h nm/s)|"sink"|"fixed"(Cs)|"segregation"(vox nm/s 산화 속도)}
   */
  function makeAnneal(xs, ys, fields, o = {}) {
    const nx = xs.length, ny = ys.length, N = nx * ny, sps = Object.keys(fields), C = {}, D = {};
    sps.forEach((s) => { C[s] = Float64Array.from(fields[s]); D[s] = new Float64Array(N); });
    const vx = cvol(xs), vy = cvol(ys), net = new Float64Array(N), Tf = tempFn(o.T != null ? o.T : 1000), model = o.model || "fermi";
    const ted = o.ted || (model === "ted" ? { factor: 100, tau: 5 } : null), bg = o.background, surf = o.surface || "reflect";
    const M = Math.max(nx, ny), A = new Float64Array(M), B = new Float64Array(M), Cc = new Float64Array(M), R = new Float64Array(M);
    const S = { C, xs, ys, t: 0, clock: 0, T: Tf(0) };
    S.step = function (dt) {
      const Tc = Tf(S.t + dt / 2), ni = TC.niT(Tc), kt = kB * (Tc + 273.15);
      for (let k = 0; k < N; k++) net[k] = bg ? bg[k] : 0;
      const cs = {};
      sps.forEach((s) => { const c = C[s], g = SIGN[s], q = (cs[s] = TC.solubility(s, Tc)); for (let k = 0; k < N; k++) net[k] += g * actv(c[k], q); });
      sps.forEach((s) => {
        const p = dParts(s, Tc), c = C[s], d = D[s], q = cs[s], ni2 = ni * ni;
        let mul = 1e14;
        if (ted) mul *= 1 + (TC.DIFF[s].fI || 0) * ted.factor * Math.exp(-S.clock);
        for (let k = 0; k < N; k++) {
          let v;
          if (model === "const") v = p.type > 0 ? p.d0 + p.d1 + p.d2 : p.d0 + p.d1;
          else {
            const h = 0.5 * net[k], n = h + Math.sqrt(h * h + ni2), r = n / ni, ca = actv(c[k], q);
            v = (p.type > 0 ? p.d0 + p.d1 * r + p.d2 * r * r : p.d0 + p.d1 / r) * (1 + ca / Math.sqrt(net[k] * net[k] + 4 * ni2));
          }
          if (o.cluster) { const z = c[k] / q, z4 = z * z * z * z; v *= Math.pow(1 + z4, -1.25); }
          d[k] = v * mul;
        }
        if (nx > 1) for (let j = 0; j < ny; j++) {
          const o0 = j * nx;
          for (let i = 0; i < nx; i++) {
            const k = o0 + i, gw = i > 0 ? (0.5 * (d[k - 1] + d[k])) / (xs[i] - xs[i - 1]) : 0, ge = i < nx - 1 ? (0.5 * (d[k] + d[k + 1])) / (xs[i + 1] - xs[i]) : 0, f = dt / vx[i];
            A[i] = -f * gw; Cc[i] = -f * ge; B[i] = 1 + f * (gw + ge); R[i] = c[k];
          }
          thomas(nx, A, B, Cc, R);
          for (let i = 0; i < nx; i++) c[o0 + i] = R[i];
        }
        for (let i = 0; i < nx; i++) {
          for (let j = 0; j < ny; j++) {
            const k = j * nx + i, gn = j > 0 ? (0.5 * (d[k - nx] + d[k])) / (ys[j] - ys[j - 1]) : 0, gs = j < ny - 1 ? (0.5 * (d[k] + d[k + nx])) / (ys[j + 1] - ys[j]) : 0, f = dt / vy[j];
            A[j] = -f * gn; Cc[j] = -f * gs; B[j] = 1 + f * (gn + gs); R[j] = c[k];
          }
          if (surf === "outdiffuse") B[0] += (dt * (o.h || 0)) / vy[0];
          else if (surf === "segregation") B[0] += (dt * (o.vox || 0) * (1 / (TC.SEG[s] || 1) - TC.SI_CONSUME)) / vy[0];
          else if (surf === "sink" || surf === "fixed") { B[0] = 1; Cc[0] = 0; R[0] = surf === "fixed" ? o.Cs || 0 : 0; }
          thomas(ny, A, B, Cc, R);
          for (let j = 0; j < ny; j++) c[j * nx + i] = R[j];
        }
      });
      if (ted) S.clock += dt / ((ted.tau || 5) * Math.exp((ted.Ea || 4) * (1 / kt - 1 / (kB * 1273.15))));
      S.t += dt; S.T = Tc;
      return S;
    };
    /** tEnd(s)까지 n단계(열 예산 균등 분할) */
    S.run = function (tEnd, n = 60) {
      const g = timeGrid(Tf, S.t, tEnd, n);
      for (let k = 1; k < g.length; k++) if (g[k] > g[k - 1]) S.step(g[k] - g[k - 1]);
      return S;
    };
    return S;
  }
  const tEndOf = (o) => (o.t != null ? o.t : Array.isArray(o.T) ? o.T[o.T.length - 1][0] : 0);
  /** 단계 실행형 1D 확산(애니메이션용). → {c(농도, 제자리 갱신), t, T, step(dt), run(tEnd, n)}. 옵션은 diffuse1d와 같다 */
  TC.diffuser1d = function (x, C, o = {}) {
    const sp = o.species || "B", S = makeAnneal([0], x, { [sp]: C }, o);
    S.x = x; S.c = S.C[sp];
    return S;
  };
  /**
   * 1D 확산(x nm, C cm⁻³) → 새 농도 Float64Array. o: {species: "B"|"P"|"As"|"Sb"|"In", T(°C 숫자·함수·[[t,T]] 이력), t(s),
   *   model: "const"(진성 D)|"fermi"(기본, n/ni 의존 + 전계 증강)|"ted", ted: {factor, tau, Ea}, background(다른 도펀트 순 도핑 배열),
   *   cluster, surface, h, vox, Cs, steps(기본 60)}
   */
  TC.diffuse1d = (x, C, o = {}) => TC.diffuser1d(x, C, o).run(tEndOf(o), o.steps || 60).c;
  /** 여러 종을 함께 어닐(서로의 n/ni에 영향). grid {xs, ys}, fields {B, As, …} → 단계 실행형 */
  TC.annealer2d = (grid, fields, o = {}) => makeAnneal(grid.xs, grid.ys, fields, o);
  /** 2D 동시 어닐 → 새 fields 객체 */
  TC.anneal2d = (grid, fields, o = {}) => makeAnneal(grid.xs, grid.ys, fields, o).run(tEndOf(o), o.steps || 60).C;
  /** 2D 단일 종 확산(LOD 음해법) → Float64Array */
  TC.diffuse2d = (grid, C, o = {}) => { const sp = o.species || "B"; return TC.anneal2d(grid, { [sp]: C }, o)[sp]; };
  /** 1D 다종 동시 어닐: fields {종: 배열} → 새 fields */
  TC.anneal1d = (x, fields, o = {}) => makeAnneal([0], x, fields, o).run(tEndOf(o), o.steps || 60).C;

  /** 접합 깊이(nm): (x, net)이면 표면 부호가 처음 바뀌는 곳, (x, C, Nb)이면 C가 배경 Nb(숫자·배열)와 같아지는 곳. 없으면 NaN */
  TC.junctionDepth = function (x, a, b) {
    const f = b == null ? (i) => a[i] : (i) => a[i] - (typeof b === "number" ? b : b[i]);
    const s0 = Math.sign(f(0));
    for (let i = 1; i < x.length; i++) { const v = f(i); if (Math.sign(v) !== s0 && v !== 0) { const u = f(i - 1); return x[i - 1] + ((x[i] - x[i - 1]) * u) / (u - v); } }
    return NaN;
  };
  /** 면저항(Ω/□): 표면 층(접합까지)의 q·μ(N)·|net| 적분. 이동도 TC.mobCT, T(K) */
  TC.sheetRes = function (x, net, T = 300) {
    const s0 = Math.sign(net[0]), c = s0 > 0 ? "n" : "p", g = (i) => (Math.sign(net[i]) === s0 ? Math.abs(net[i]) * TC.mobCT(Math.abs(net[i]), c, T) : 0);
    let s = 0;
    for (let i = 1; i < x.length; i++) { if (Math.sign(net[i - 1]) !== s0) break; s += 0.5 * (g(i) + g(i - 1)) * (x[i] - x[i - 1]) * 1e-7; }
    return 1 / (TC.q * s);
  };

  /* ------------------------------------------------------------ 산화 */
  // Deal-Grove (Plummer 표 6-2, (111)): B = C1·exp(−E1/kT) µm²/h, B/A = C2·exp(−E2/kT) µm/h. (100)은 B/A ÷ 1.68
  // Massoud 얇은 건식 산화 보정(100): dx/dt += C·exp(−x/L), C = 3.6e8·exp(−2.28/kT) µm/h, L = 7 nm
  TC.DG = { dry: { B: [772, 1.23], BA: [6.23e6, 2.0] }, wet: { B: [386, 0.78], BA: [1.63e8, 2.05] }, massoud: { C: [3.6e8, 2.28], L: 7 } };
  function dgPar(o) {
    const T = o.T + 273.15, kt = kB * T, P = o.P || 1, wet = !!o.wet, k = wet ? TC.DG.wet : TC.DG.dry;
    let B = arr(k.B, kt) * P, BA = arr(k.BA, kt) * Math.pow(P, wet ? 1 : 0.75);
    if ((o.orient || "100") !== "111") BA /= 1.68;
    B *= 1e6 / 3600; BA *= 1e3 / 3600;
    const model = o.model || (wet ? "dg" : "massoud");
    return { B, BA, A: B / BA, model, Cm: model === "massoud" ? (arr(TC.DG.massoud.C, kt) * 1e3) / 3600 : 0, L: TC.DG.massoud.L };
  }
  /**
   * 산화막 두께(nm). o: {T(°C), t(s, 분이면 TC.MIN을 곱한다), wet, orient: "100"|"111", x0(초기 두께 nm), P(atm),
   *   model: "massoud"(건식 기본)|"tau"(건식 25 nm τ 관례)|"dg"(습식 기본)}
   * → {x, A(nm), B(nm²/s), BA(nm/s), tau(s), rate(nm/s, 끝), curve(n) → [[t, x]]}. 건식 1000 °C 1 h (100) 약 47 nm, 습식 약 390 nm
   */
  TC.dealGrove = function (o) {
    const p = dgPar(o), x0 = o.x0 || 0, t = o.t || 0;
    const xi = p.model === "tau" && !o.wet ? Math.max(x0, 25) : x0, tau = (xi * xi + p.A * xi) / p.B;
    const rate = (x) => p.B / (2 * x + p.A) + p.Cm * Math.exp(-x / p.L);
    const at = (tt) => {
      if (p.model !== "massoud") return (p.A / 2) * (Math.sqrt(1 + (4 * p.B * (tt + tau)) / (p.A * p.A)) - 1);
      let x = x0, prev = 0;
      const n = 200;
      for (let i = 1; i <= n; i++) {
        const ti = tt * (Math.pow(1 + 1e4, i / n) - 1) / 1e4, h = ti - prev;
        const k1 = rate(x), k2 = rate(x + 0.5 * h * k1), k3 = rate(x + 0.5 * h * k2), k4 = rate(x + h * k3);
        x += (h * (k1 + 2 * k2 + 2 * k3 + k4)) / 6; prev = ti;
      }
      return x;
    };
    const x = at(t);
    return { x, A: p.A, B: p.B, BA: p.BA, tau, rate: rate(x), at, curve: (n = 60, tMax = t) => Array.from({ length: n + 1 }, (_, i) => [(tMax * i) / n, at((tMax * i) / n)]) };
  };
  /** 두께 x(nm)에 이르는 시간(s) */
  TC.oxTime = function (x, o) {
    const p = dgPar(o), x0 = o.x0 || 0;
    if (p.model !== "massoud") { const xi = p.model === "tau" && !o.wet ? Math.max(x0, 25) : x0; return (x * x + p.A * x) / p.B - (xi * xi + p.A * xi) / p.B; }
    const g = TC.dealGrove(Object.assign({}, o, { t: 0 }));
    let hi = 1; while (g.at(hi) < x && hi < 1e8) hi *= 2;
    return TC.bisect((t) => g.at(t) - x, 0, hi, 1e-3);
  };
  /**
   * LOCOS 단면(장난감 해석식). o: {tox(필드 산화막 nm, 기본 500), pad(패드 산화막, 20), nit(질화막, 150), open: [[x0, x1]] 열린 창,
   *   x0, x1(그림 범위), Lbb(새부리 길이, 생략 시 tox·0.5·(pad/10)^0.3·(150/nit)^0.3), n}
   * 산화로 늘어난 두께의 44%는 실리콘을 먹고 56%는 위로 솟는다. → {regions: [{m, poly}], Lbb, t(x) 두께 함수}
   */
  TC.locos = function (o = {}) {
    const tox = o.tox || 500, pad = o.pad || 20, nit = o.nit || 150, open = o.open || [[-400, 400]], x0 = o.x0 != null ? o.x0 : -1200, x1 = o.x1 != null ? o.x1 : 1200, n = o.n || 240;
    const Lbb = o.Lbb || tox * 0.5 * Math.pow(pad / 10, 0.3) * Math.pow(150 / nit, 0.3);
    const dIn = (x) => { let d = Infinity; open.forEach(([a, b]) => { const v = x < a ? a - x : x > b ? x - b : -Math.min(x - a, b - x); d = Math.min(d, v); }); return d; };
    const th = (x) => pad + (tox - pad) * 0.5 * erfc((dIn(x) - 0.15 * Lbb) / (0.35 * Lbb));
    const xsP = TC.linspace(x0, x1, n), yb = 1.5 * tox;
    const siTop = xsP.map((x) => [x, TC.SI_CONSUME * (th(x) - pad)]), oxTop = xsP.map((x) => [x, TC.SI_CONSUME * (th(x) - pad) - th(x)]);
    const regions = [{ m: "si", poly: siTop.concat([[x1, yb], [x0, yb]]) }, { m: "ox", poly: oxTop.concat(siTop.slice().reverse()) }];
    let run = null;
    const flush = () => { if (run && run.length > 1) regions.push({ m: "nit", poly: run.concat(run.map(([x, y]) => [x, y - nit]).reverse()) }); run = null; };
    oxTop.forEach(([x, y]) => { if (dIn(x) > 0) (run = run || []).push([x, y]); else flush(); });
    flush();
    return { regions, Lbb, t: th };
  };

  /* ------------------------------------------------------------ 형상: 셀 모델 증착·식각 */
  const NB = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1], [1, 2], [1, -2], [-1, 2], [-1, -2], [2, 1], [2, -1], [-2, 1], [-2, -1]];
  /**
   * 2D 셀 모델 단면(y 아래로 +, 실리콘 표면 0). 셀마다 재질 하나. o: {x0, x1, y0(위), y1(아래), dx(셀 크기 nm, 기본 1)}
   * 만들기: rect(m, x0, x1, y0, y1), poly(m, [[x, y]…]), m = null이면 비운다.
   * 공정: deposit(m, t, {mode: "conformal"(등각, 기본)|"directional"(수직 빔, 옆벽 없음)|"isotropic"(등방 빔, 시야 가중 → 오버행·보이드), sc: 등각 몫})
   *       etch(d, {mode: "anisotropic"(기본)|"isotropic", rates: {재질: 상대 속도}(기본 맨 위 재질 1, 나머지 0), ratio: 이방성 식각의 옆 식각 비})
   *       strip(m), cmp(y)
   * 조회: regions() → [{m, poly}](TC.drawStruct), runs(m, y) → [[xa, xb]], top() 열마다 맨 위 고체 y, voids() → {n, area(nm²)}, clone()
   */
  TC.topo = function (o) {
    const dx = o.dx || 1, x0 = o.x0, y0 = o.y0, nx = Math.round((o.x1 - x0) / dx), ny = Math.round((o.y1 - y0) / dx);
    const T = { nx, ny, dx, x0, y0, x1: x0 + nx * dx, y1: y0 + ny * dx, g: new Uint8Array(nx * ny), mats: [null] };
    const g = T.g, id = (m) => { if (m == null) return 0; let k = T.mats.indexOf(m); if (k < 0) { T.mats.push(m); k = T.mats.length - 1; } return k; };
    const cx = (i) => x0 + (i + 0.5) * dx, cy = (j) => y0 + (j + 0.5) * dx;
    T.rect = (m, a, b, c, d) => { const k = id(m); for (let j = 0; j < ny; j++) { const y = cy(j); if (y < Math.min(c, d) || y > Math.max(c, d)) continue; for (let i = 0; i < nx; i++) { const x = cx(i); if (x >= Math.min(a, b) && x <= Math.max(a, b)) g[j * nx + i] = k; } } return T; };
    T.poly = (m, P) => {
      const k = id(m);
      for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
        const x = cx(i), y = cy(j); let ins = false;
        for (let a = 0, b = P.length - 1; a < P.length; b = a++) if ((P[a][1] > y) !== (P[b][1] > y) && x < ((P[b][0] - P[a][0]) * (y - P[a][1])) / (P[b][1] - P[a][1]) + P[a][0]) ins = !ins;
        if (ins) g[j * nx + i] = k;
      }
      return T;
    };
    /** 위쪽 경계와 이어진 빈 셀 */
    function exposed() {
      const ex = new Uint8Array(nx * ny), st = [];
      for (let i = 0; i < nx; i++) if (!g[i]) { ex[i] = 1; st.push(i); }
      while (st.length) {
        const k = st.pop(), i = k % nx, j = (k - i) / nx;
        const nb = [i > 0 ? k - 1 : -1, i < nx - 1 ? k + 1 : -1, j > 0 ? k - nx : -1, j < ny - 1 ? k + nx : -1];
        for (const q of nb) if (q >= 0 && !g[q] && !ex[q]) { ex[q] = 1; st.push(q); }
      }
      return ex;
    }
    /** 다익스트라 거리(16 이웃). seed(k) 참이면 0, cost(k): 들어가는 셀의 길이 배율(0이면 막힘) */
    function distance(seed, cost, limit) {
      const dist = new Float64Array(nx * ny).fill(Infinity), hk = [], hv = [];
      const push = (k, v) => { hk.push(k); hv.push(v); let c = hk.length - 1; while (c > 0) { const p = (c - 1) >> 1; if (hv[p] <= hv[c]) break; [hk[p], hk[c]] = [hk[c], hk[p]]; [hv[p], hv[c]] = [hv[c], hv[p]]; c = p; } };
      const pop = () => { const k = hk[0], v = hv[0], lk = hk.pop(), lv = hv.pop(); if (hk.length) { hk[0] = lk; hv[0] = lv; let c = 0; for (;;) { const l = 2 * c + 1, r = l + 1; let m = c; if (l < hk.length && hv[l] < hv[m]) m = l; if (r < hk.length && hv[r] < hv[m]) m = r; if (m === c) break; [hk[m], hk[c]] = [hk[c], hk[m]]; [hv[m], hv[c]] = [hv[c], hv[m]]; c = m; } } return [k, v]; };
      for (let k = 0; k < nx * ny; k++) if (seed(k)) { dist[k] = 0; push(k, 0); }
      while (hk.length) {
        const [k, v] = pop();
        if (v > dist[k] || v > limit) continue;
        const i = k % nx, j = (k - i) / nx;
        for (const [di, dj] of NB) {
          const a = i + di, b = j + dj;
          if (a < 0 || a >= nx || b < 0 || b >= ny) continue;
          const q = b * nx + a, cq = cost(q);
          if (!cq) continue;
          if (Math.abs(di) + Math.abs(dj) === 3) {
            const m1 = Math.abs(dj) === 2 ? (j + dj / 2) * nx + i : j * nx + i + di / 2, m2 = Math.abs(dj) === 2 ? (j + dj / 2) * nx + a : b * nx + i + di / 2;
            if (!cost(m1) || !cost(m2)) continue;
          } else if (di && dj && !cost(j * nx + a) && !cost(b * nx + i)) continue;
          const nv = v + Math.hypot(di, dj) * dx * cq;
          if (nv < dist[q]) { dist[q] = nv; push(q, nv); }
        }
      }
      return dist;
    }
    const solidNb = (k) => { const i = k % nx, j = (k - i) / nx; return (i > 0 && g[k - 1]) || (i < nx - 1 && g[k + 1]) || (j > 0 && g[k - nx]) || (j < ny - 1 && g[k + nx]); };
    T.deposit = function (m, t, op = {}) {
      const mid = id(m), mode = op.mode || "conformal";
      if (mode === "directional") {
        const nT = Math.round(t / dx);
        for (let i = 0; i < nx; i++) { let j = 0; while (j < ny && !g[j * nx + i]) j++; for (let q = Math.max(0, j - nT); q < j; q++) g[q * nx + i] = mid; }
        return T;
      }
      if (mode === "conformal") {
        const ex = exposed(), d = distance((k) => g[k] > 0, (k) => (ex[k] ? 1 : 0), t + dx);
        for (let k = 0; k < nx * ny; k++) if (ex[k] && d[k] <= t + 0.5 * dx) g[k] = mid;
        return T;
      }
      // isotropic: 등방 입사 빔의 시야(sky view) 가중 성장. 셀마다 채움 비율을 쌓는다
      const sc = op.sc || 0, K = 25, ang = [], wsum = [0];
      for (let a = 0; a < K; a++) { const th = -PI / 2 + (PI * (a + 0.5)) / K; ang.push([Math.sin(th), -Math.cos(th), Math.cos(th)]); wsum[0] += Math.cos(th); }
      const h = 0.5 * dx, nIt = Math.max(1, Math.ceil(t / h)), hh = t / nIt, acc = new Float32Array(nx * ny);
      for (let it = 0; it < nIt; it++) {
        const ex = exposed();
        let top = ny; for (let k = 0; k < nx * ny; k++) if (g[k]) { top = Math.floor(k / nx); break; }
        const add = [];
        for (let k = 0; k < nx * ny; k++) {
          if (!ex[k] || !solidNb(k)) continue;
          const i0 = k % nx, j0 = (k - i0) / nx;
          let vis = 0;
          for (const [sx, sy, w] of ang) {
            let x = i0 + 0.5, y = j0 + 0.5, ok = true;
            for (;;) {
              x += sx * 0.5; y += sy * 0.5;
              if (y < top) break;
              const jj = Math.floor(y), ii = ((Math.floor(x) % nx) + nx) % nx;
              if (jj >= ny || g[jj * nx + ii]) { ok = false; break; }
            }
            if (ok) vis += w;
          }
          acc[k] += ((sc + (1 - sc) * (vis / wsum[0])) * hh) / dx;
          if (acc[k] >= 1) add.push(k);
        }
        add.forEach((k) => { g[k] = mid; acc[k] = 0; });
      }
      return T;
    };
    T.etch = function (dd, op = {}) {
      let rates = op.rates;
      if (!rates) { let top = 0; for (let k = 0; k < nx * ny; k++) if (g[k]) { top = g[k]; break; } rates = { [T.mats[top]]: 1 }; }
      const rt = T.mats.map((m) => (m && rates[m]) || 0);
      if ((op.mode || "anisotropic") === "anisotropic") {
        for (let i = 0; i < nx; i++) {
          let b = dd;
          for (let j = 0; j < ny && b > 0; j++) {
            const k = j * nx + i, r = rt[g[k]];
            if (!g[k]) continue;
            if (r <= 0) break;
            const c = dx / r;
            if (b < 0.5 * c) break;
            g[k] = 0; b -= c;
          }
        }
        if (op.ratio) T.etch(dd * op.ratio, { mode: "isotropic", rates });
        return T;
      }
      const ex = exposed(), d = distance((k) => ex[k] === 1, (k) => (g[k] && rt[g[k]] > 0 ? 1 / rt[g[k]] : 0), dd + dx);
      for (let k = 0; k < nx * ny; k++) if (g[k] && d[k] <= dd + 0.5 * dx) g[k] = 0;
      return T;
    };
    T.strip = (m) => { const k = T.mats.indexOf(m); if (k > 0) for (let q = 0; q < nx * ny; q++) if (g[q] === k) g[q] = 0; return T; };
    T.cmp = (y) => { for (let j = 0; j < ny; j++) if (cy(j) < y) for (let i = 0; i < nx; i++) g[j * nx + i] = 0; return T; };
    T.top = () => Float64Array.from({ length: nx }, (_, i) => { let j = 0; while (j < ny && !g[j * nx + i]) j++; return y0 + j * dx; });
    T.runs = (m, y) => { const k = T.mats.indexOf(m), j = Math.floor((y - y0) / dx), out = []; if (k < 0 || j < 0 || j >= ny) return out; let s = -1; for (let i = 0; i <= nx; i++) { const v = i < nx && g[j * nx + i] === k; if (v && s < 0) s = i; if (!v && s >= 0) { out.push([x0 + s * dx, x0 + i * dx]); s = -1; } } return out; };
    T.voids = () => { const ex = exposed(); let c = 0; for (let k = 0; k < nx * ny; k++) if (!g[k] && !ex[k]) c++; return { n: c, area: c * dx * dx }; };
    T.clone = () => { const U = TC.topo({ x0, x1: T.x1, y0, y1: T.y1, dx }); U.g.set(g); U.mats.length = 0; T.mats.forEach((m) => U.mats.push(m)); return U; };
    /** 재질별 다각형(행마다 구간을 이어 붙인 띠) */
    T.regions = function () {
      const out = [];
      for (let mk = 1; mk < T.mats.length; mk++) {
        let open = [];
        const close = (s) => { const L = s.l, Rr = s.r; out.push({ m: T.mats[mk], poly: L.concat(Rr.reverse()) }); };
        for (let j = 0; j <= ny; j++) {
          const runs = [];
          if (j < ny) { let s = -1; for (let i = 0; i <= nx; i++) { const v = i < nx && g[j * nx + i] === mk; if (v && s < 0) s = i; if (!v && s >= 0) { runs.push([s, i]); s = -1; } } }
          const next = [], used = new Set();
          runs.forEach(([a, b]) => {
            const ov = open.filter((s) => s.a < b && a < s.b);
            const xa = x0 + a * dx, xb = x0 + b * dx, ym = cy(j);
            if (ov.length === 1 && runs.filter(([c, d]) => ov[0].a < d && c < ov[0].b).length === 1) {
              const s = ov[0]; used.add(s);
              s.l.push([xa, ym]); s.r.push([xb, ym]); s.a = a; s.b = b; next.push(s);
            } else {
              ov.forEach((s) => { if (!used.has(s)) { used.add(s); s.l.push([x0 + s.a * dx, y0 + j * dx]); s.r.push([x0 + s.b * dx, y0 + j * dx]); close(s); } });
              next.push({ a, b, l: [[xa, y0 + j * dx], [xa, ym]], r: [[xb, y0 + j * dx], [xb, ym]] });
            }
          });
          open.forEach((s) => { if (!used.has(s)) { s.l.push([x0 + s.a * dx, y0 + j * dx]); s.r.push([x0 + s.b * dx, y0 + j * dx]); close(s); } });
          open = next;
        }
      }
      return out;
    };
    return T;
  };
  /**
   * 게이트 스택 + 스페이서 흐름: 등각 질화막 증착 → 이방성 에치백. o: {Lg(45), H(다결정 높이 50), tox(1.2), w(질화막 두께 25), over(과식각 비 0.1),
   *   x0, x1, y1(실리콘 바닥), dx(1)} → {topo, width(스페이서 바닥 폭 nm), stages: [{name, regions}]}
   */
  TC.spacerFlow = function (o = {}) {
    const Lg = o.Lg || 45, H = o.H || 50, tox = o.tox != null ? o.tox : 1.2, w = o.w != null ? o.w : 25, over = o.over != null ? o.over : 0.1, dx = o.dx || 1;
    const x0 = o.x0 != null ? o.x0 : -100, x1 = o.x1 != null ? o.x1 : 100, ytop = -(H + tox + w + 20);
    const T = TC.topo({ x0, x1, y0: ytop, y1: o.y1 || 20, dx });
    T.rect("si", x0, x1, 0, T.y1).rect("ox", -Lg / 2, Lg / 2, -Math.max(tox, dx), 0).rect("poly", -Lg / 2, Lg / 2, -H - Math.max(tox, dx), -Math.max(tox, dx));
    const stages = [{ name: "게이트", regions: T.regions() }];
    T.deposit("nit", w, { mode: "conformal" });
    stages.push({ name: "등각 증착", regions: T.regions() });
    T.etch(w * (1 + over), { mode: "anisotropic", rates: { nit: 1, ox: 0.05, si: 0.02 } });
    stages.push({ name: "에치백", regions: T.regions() });
    const r = T.runs("nit", -Math.max(tox, dx) - 0.5 * dx).filter(([a]) => a >= 0);
    return { topo: T, width: r.length ? r[0][1] - r[0][0] : 0, stages };
  };

  /* ------------------------------------------------------------ TN-45 공정 흐름 */
  /** TN-45 레시피(가상의 45 nm 평면 nMOS). 각 단계 {id, name, kind, …}. tn45Process의 overrides로 바꾼다 */
  TC.TN45_RECIPE = [
    { id: "sub", name: "p형 기판", kind: "sub", N: 1e16 },
    { id: "well", name: "p-웰 주입", kind: "implant", ion: "B", E: 50, dose: 3e13, tilt: 0, model: "pearson" },
    { id: "vt", name: "문턱 조절 주입", kind: "implant", ion: "BF2", E: 10, dose: 1e13, tilt: 0, model: "pearson" },
    { id: "wellAnneal", name: "웰 활성화 어닐", kind: "anneal", T: 1000, t: 10 },
    { id: "gox", name: "게이트 산화", kind: "oxide", tox: 1.2, T: 800, t: 30 },
    { id: "gate", name: "게이트 패터닝", kind: "gate", Lg: 45, H: 50 },
    { id: "offset", name: "오프셋 스페이서", kind: "spacer", w: 2 },
    { id: "halo", name: "할로 주입", kind: "implant", ion: "BF2", E: 15, dose: 8e13, tilt: 30, rot: 2, model: "pearson" },
    { id: "ext", name: "확장부 주입", kind: "implant", ion: "As", E: 4, dose: 1e15, tilt: 0, model: "dual", channel: 0.05 },
    { id: "spacer", name: "질화막 스페이서", kind: "spacer", w: 25 },
    { id: "sd", name: "깊은 S/D 주입", kind: "implant", ion: "As", E: 40, dose: 3e15, tilt: 0, model: "pearson" },
    { id: "spike", name: "스파이크 어닐", kind: "anneal", peak: 1050, up: 150, down: 75, start: 700, ted: { factor: 3, tau: 5 } },
  ];
  /**
   * TN-45 공정 모사(2D). overrides: {단계 id: {바꿀 값}, Lg, spacer(폭 nm)} 예: {halo: {dose: 3e13}, spike: {peak: 1000}, Lg: 40}
   * grid: {xs, ys} 또는 {nx, ny}(기본 x −120~120 nm 121점, y 0~150 nm 표면 0.5 nm 비균일)
   * → {xs, ys, nx, ny, net(활성 Nd−Na), Na, Nd(활성), NaChem, NdChem, fields(종별 화학 농도), xjExt, xjSD, Leff, Nch(채널 표면 p),
   *    steps: [{id, name, kind, Na, Nd, net(화학), regions}], regions, recipe, cut(x), cutY(y), dopingFn(x, y), totalFn(x, y)(Na+Nd), ms}
   */
  TC.tn45Process = function (overrides = {}, grid = {}) {
    const t0 = Date.now();
    const recipe = TC.TN45_RECIPE.map((s) => Object.assign({}, s, overrides[s.id] || {}));
    const step = (id) => recipe.find((s) => s.id === id);
    if (overrides.Lg != null) step("gate").Lg = overrides.Lg;
    if (overrides.spacer != null) step("spacer").w = overrides.spacer;
    if (overrides.offset != null) step("offset").w = overrides.offset;
    const xs = grid.xs || TC.linspace(-120, 120, grid.nx || 121);
    const ys = grid.ys || (grid.ny ? TC.linspace(0, 150, grid.ny) : TC.mesh1d([[0, 0.5], [8, 1], [40, 2.5], [150, 5]]));
    const nx = xs.length, ny = ys.length, N = nx * ny, G = { xs, ys };
    const F = {}, field = (sp) => (F[sp] = F[sp] || new Float64Array(N));
    let blocks = null, tox = 0, Lg = step("gate").Lg, H = step("gate").H, w = 0, gateOn = false, Tlast = 1000;
    const steps = [];
    const regionsNow = () => {
      const r = [{ m: "si", x0: xs[0], x1: xs[nx - 1], y0: 0, y1: ys[ny - 1] }];
      if (tox && !gateOn) r.push({ m: "ox", x0: xs[0], x1: xs[nx - 1], y0: -tox, y1: 0 });
      if (gateOn) {
        r.push({ m: "ox", x0: -Lg / 2 - w, x1: Lg / 2 + w, y0: -tox, y1: 0 }, { m: "poly", x0: -Lg / 2, x1: Lg / 2, y0: -tox - H, y1: -tox });
        if (w) [-1, 1].forEach((s) => { const p = [[s * Lg / 2, -tox]]; for (let k = 0; k <= 12; k++) { const a = (k / 12) * PI / 2; p.push([s * (Lg / 2 + w * Math.cos(a)), -tox - (H - 3) * Math.sin(a)]); } p.push([s * Lg / 2, -tox - H + 3]); r.push({ m: "nit", poly: p }); });
      }
      return r;
    };
    const chem = () => {
      const Na = new Float64Array(N), Nd = new Float64Array(N);
      Object.keys(F).forEach((s) => { const c = F[s], t = SIGN[s] > 0 ? Nd : Na; for (let k = 0; k < N; k++) t[k] += c[k]; });
      return { Na, Nd };
    };
    recipe.forEach((s) => {
      if (s.kind === "sub") field("B").fill(s.N);
      else if (s.kind === "implant") {
        const sp = IMPLANT[s.ion].sp, add = TC.implant2d(Object.assign({}, s, { grid: G, blocks, screen: tox }));
        const c = field(sp); for (let k = 0; k < N; k++) c[k] += add[k];
      } else if (s.kind === "anneal") {
        const T = s.T != null ? s.T : TC.spike(s), tEnd = s.t != null ? s.t : T[T.length - 1][0];
        const res = TC.anneal2d(G, F, { T, t: tEnd, model: s.model || "fermi", ted: s.ted, cluster: s.cluster !== false, steps: s.steps || 50 });
        Object.keys(res).forEach((k) => (F[k] = res[k]));
        Tlast = typeof T === "number" ? T : s.peak;
      } else if (s.kind === "oxide") {
        tox = s.tox;
        if (s.T && s.t) { const res = TC.anneal2d(G, F, { T: s.T, t: s.t, cluster: true, steps: 10 }); Object.keys(res).forEach((k) => (F[k] = res[k])); }
      } else if (s.kind === "gate") { Lg = s.Lg; H = s.H; gateOn = true; blocks = [{ x0: -Lg / 2, x1: Lg / 2, h: H + tox }]; }
      else if (s.kind === "spacer") { w = s.w; blocks = [{ x0: -Lg / 2 - w, x1: Lg / 2 + w, h: H + tox }]; }
      const c = chem(), net = new Float64Array(N);
      for (let k = 0; k < N; k++) net[k] = c.Nd[k] - c.Na[k];
      steps.push({ id: s.id, name: s.name, kind: s.kind, Na: c.Na, Nd: c.Nd, net, regions: regionsNow() });
    });
    const Na = new Float64Array(N), Nd = new Float64Array(N), net = new Float64Array(N);
    Object.keys(F).forEach((s) => { const c = F[s], t = SIGN[s] > 0 ? Nd : Na, cs = TC.solubility(s, Tlast); for (let k = 0; k < N; k++) t[k] += actv(c[k], cs); });
    for (let k = 0; k < N; k++) net[k] = Nd[k] - Na[k];
    const ch = chem();
    const bilin = (a, x, y) => { const [i, tx] = loc(xs, x), [j, ty] = loc(ys, y), i1 = Math.min(nx - 1, i + 1), j1 = Math.min(ny - 1, j + 1); return (a[j * nx + i] * (1 - tx) + a[j * nx + i1] * tx) * (1 - ty) + (a[j1 * nx + i] * (1 - tx) + a[j1 * nx + i1] * tx) * ty; };
    const colAt = (x, a) => { const [i, t] = loc(xs, x); return Float64Array.from({ length: ny }, (_, j) => a[j * nx + i] * (1 - t) + a[j * nx + Math.min(nx - 1, i + 1)] * t); };
    const rowAt = (y, a) => { const [j, t] = loc(ys, y); return Float64Array.from({ length: nx }, (_, i) => a[j * nx + i] * (1 - t) + a[Math.min(ny - 1, j + 1) * nx + i] * t); };
    const R = {
      xs, ys, nx, ny, net, Na, Nd, NaChem: ch.Na, NdChem: ch.Nd, fields: F, steps, recipe, regions: regionsNow(), Lg, spacer: w, tox, H,
      cut: (x) => ({ y: ys, Na: colAt(x, Na), Nd: colAt(x, Nd), net: colAt(x, net) }),
      cutY: (y) => ({ x: xs, Na: rowAt(y, Na), Nd: rowAt(y, Nd), net: rowAt(y, net) }),
      dopingFn: (x, y) => bilin(net, x, y),
      totalFn: (x, y) => bilin(Na, x, y) + bilin(Nd, x, y),
    };
    const xe = Lg / 2 + 2, xsd = Math.min(xs[nx - 1] - 5, Lg / 2 + w + 35);
    R.xjExt = TC.junctionDepth(ys, R.cut(xe).net);
    R.xjSD = TC.junctionDepth(ys, R.cut(xsd).net);
    const surf = R.cutY(1), ic = loc(xs, 0)[0];
    let xr = NaN; for (let i = ic; i < nx - 1; i++) if (surf.net[i] <= 0 && surf.net[i + 1] > 0) { xr = xs[i] + ((xs[i + 1] - xs[i]) * -surf.net[i]) / (surf.net[i + 1] - surf.net[i]); break; }
    R.Leff = 2 * xr;
    R.Nch = -R.dopingFn(0, 1);
    R.ms = Date.now() - t0;
    return R;
  };
  function loc(a, v) {
    const n = a.length;
    if (v <= a[0]) return [0, 0];
    if (v >= a[n - 1]) return [n - 1, 0];
    let lo = 0, hi = n - 1;
    while (hi - lo > 1) { const m = (lo + hi) >> 1; if (a[m] > v) hi = m; else lo = m; }
    return [lo, (v - a[lo]) / (a[hi] - a[lo])];
  }
})();
