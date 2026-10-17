/* Copyright (c) 2026 geniuskey and TCADBook contributors.
   Executable code: MIT (see ../LICENSE-MIT).
   Educational content and illustrations: CC-BY-4.0 (see ../LICENSE.md). */
/* ==========================================================================
   TCADBook 1D 소자 엔진 — TC에 붙는다 (tcad.js 다음에 로드)
   - 비선형 포아송(뉴턴·감쇠 뉴턴·피카르), 한 걸음씩 도는 풀이기
   - 드리프트-확산(샤페터-거멜, 완전 결합 뉴턴·거멜), 바이어스 스윕, 과도(후진 오일러), AC 소신호
   - 다이오드: 구조, 해석식(계단 접합·쇼클리), 이상 계수, 이온화 적분과 항복
   - MOS 커패시터: 게이트–산화막–실리콘 포아송, LF/HF/깊은 공핍 C-V, 밀도 기울기, 슈뢰딩거–포아송
   - 수송 너머: 앙상블 몬테카를로, 에너지 균형(n⁺nn⁺), 탄도 MOSFET(장벽 꼭대기), NEGF 투과, 열 방정식
   단위: API의 x는 nm(내부 cm), 농도 cm⁻³, 전압 V, 에너지 eV, 전계 V/cm, 전류 밀도 A/cm², 시간 s.
   전위 ψ는 진성 준위 기준(n = ni·e^{(ψ−φn)/Vt}), 에너지는 접지 전극의 평형 페르미 준위 = 0 eV.
   ========================================================================== */
(function () {
  "use strict";
  const TC = window.TC;
  const Q = TC.q, EPS0 = TC.eps0, NM = TC.NM, K = Q / EPS0;

  /* ------------------------------------------------------------ 공통 도구 */
  const isArr = (v) => Array.isArray(v) || ArrayBuffer.isView(v);
  const arr = (v, xn, def) => typeof v === "function" ? Float64Array.from(xn, (x, i) => v(x, i)) : isArr(v) ? Float64Array.from(v) : Float64Array.from(xn, () => (v == null ? def : v));
  function meshOf(o) {
    if (o.x) return Float64Array.from(isArr(o.x[0]) ? TC.mesh1d(o.x) : o.x);
    if (o.mesh) return Float64Array.from(TC.mesh1d(o.mesh));
    return Float64Array.from(TC.linspace(0, o.L || 1000, o.nodes || 201));
  }
  /** 기하급수 격자: x0에서 간격 h0로 시작해 비율 r로 hmax까지 늘리며 x1까지 (nm 배열) */
  TC.geoMesh = function (x0, x1, h0, r = 1.1, hmax = Infinity) {
    const o = [x0];
    let x = x0, h = h0;
    while (x + h < x1 - 0.5 * h) { x += h; o.push(x); h = Math.min(h * r, hmax); }
    o.push(x1);
    return o;
  };
  const geoRev = (x0, x1, h0, r, hmax) => TC.geoMesh(0, x1 - x0, h0, r, hmax).map((v) => x1 - v).reverse();
  const join = (...parts) => parts.reduce((a, b) => (a.length ? a.concat(b.slice(1)) : b.slice()), []);
  const log1pexp = (z) => (z > 35 ? z : Math.log1p(Math.exp(z)));
  const dfd = (a) => (a < -30 ? Math.exp(a) : (TC.fd12(a + 1e-4) - TC.fd12(a - 1e-4)) / 2e-4);
  function dbern(x) {
    if (Math.abs(x) < 1e-3) return -0.5 + x / 6;
    const B = TC.bern(x);
    return (B * (1 - B)) / x - B;
  }

  /* 작은 밀집 행렬 풀이(부분 피벗): A(m×m) X = B(m×k), B에 결과 */
  function gauss(m, A, B, k) {
    for (let c = 0; c < m; c++) {
      let pr = c, pv = Math.abs(A[c * m + c]);
      for (let r = c + 1; r < m; r++) { const v = Math.abs(A[r * m + c]); if (v > pv) { pv = v; pr = r; } }
      if (pr !== c) {
        for (let j = 0; j < m; j++) { const t = A[c * m + j]; A[c * m + j] = A[pr * m + j]; A[pr * m + j] = t; }
        for (let j = 0; j < k; j++) { const t = B[c * k + j]; B[c * k + j] = B[pr * k + j]; B[pr * k + j] = t; }
      }
      const d = A[c * m + c] || 1e-300;
      for (let r = c + 1; r < m; r++) {
        const f = A[r * m + c] / d;
        if (!f) continue;
        for (let j = c; j < m; j++) A[r * m + j] -= f * A[c * m + j];
        for (let j = 0; j < k; j++) B[r * k + j] -= f * B[c * k + j];
      }
    }
    for (let c = m - 1; c >= 0; c--) {
      const d = A[c * m + c] || 1e-300;
      for (let j = 0; j < k; j++) { let s = B[c * k + j]; for (let q = c + 1; q < m; q++) s -= A[c * m + q] * B[q * k + j]; B[c * k + j] = s / d; }
    }
  }
  /** 블록 삼중 대각 풀이(블록 토머스, 행 평형 + 블록 안 부분 피벗). L·D·U: N개의 m×m 블록(행 우선), R: 우변. 블록과 R을 망가뜨린다. TC.blockTri.res = 평형 후 |R|∞ */
  TC.blockTri = function (N, m, L, D, U, R) {
    const mm = m * m, m1 = m + 1, Cp = new Float64Array(N * mm), Rp = new Float64Array(N * m);
    const A = new Float64Array(mm), B = new Float64Array(m * m1);
    let res = 0;
    for (let i = 0; i < N; i++) {
      const o = i * mm, r = i * m;
      for (let a = 0; a < m; a++) {
        let s = 0;
        for (let b = 0; b < m; b++) { const k = o + a * m + b; s = Math.max(s, Math.abs(L[k]), Math.abs(D[k]), Math.abs(U[k])); }
        s = s || 1;
        for (let b = 0; b < m; b++) { const k = o + a * m + b; L[k] /= s; D[k] /= s; U[k] /= s; }
        R[r + a] /= s;
        if (Math.abs(R[r + a]) > res || R[r + a] !== R[r + a]) res = Math.abs(R[r + a]);
      }
      for (let k = 0; k < mm; k++) A[k] = D[o + k];
      for (let a = 0; a < m; a++) { for (let b = 0; b < m; b++) B[a * m1 + b] = U[o + a * m + b]; B[a * m1 + m] = R[r + a]; }
      if (i > 0) {
        const po = o - mm, pr = r - m;
        for (let a = 0; a < m; a++) for (let k = 0; k < m; k++) {
          const l = L[o + a * m + k];
          if (!l) continue;
          for (let b = 0; b < m; b++) A[a * m + b] -= l * Cp[po + k * m + b];
          B[a * m1 + m] -= l * Rp[pr + k];
        }
      }
      gauss(m, A, B, m1);
      for (let a = 0; a < m; a++) { for (let b = 0; b < m; b++) Cp[o + a * m + b] = B[a * m1 + b]; Rp[r + a] = B[a * m1 + m]; }
    }
    const X = new Float64Array(N * m);
    for (let i = N - 1; i >= 0; i--) for (let a = 0; a < m; a++) {
      let s = Rp[i * m + a];
      if (i < N - 1) for (let b = 0; b < m; b++) s -= Cp[i * mm + a * m + b] * X[(i + 1) * m + b];
      X[i * m + a] = s;
    }
    TC.blockTri.res = res;
    return X;
  };

  /* ------------------------------------------------------------ 포아송 코어 */
  function pSetup(o) {
    const T = o.T || 300, Vt = TC.vt(T), ni = TC.ni(T);
    const xn = meshOf(o), N = xn.length, x = Float64Array.from(xn, (v) => v * NM);
    const h = new Float64Array(N - 1), er = new Float64Array(N - 1), semE = new Uint8Array(N - 1), regs = o.regions || [];
    for (let e = 0; e < N - 1; e++) {
      h[e] = x[e + 1] - x[e];
      const xm = 0.5 * (xn[e] + xn[e + 1]), r = regs.find((g) => xm > g.x0 && xm < g.x1);
      er[e] = r ? r.eps || (TC.MAT[r.m || "ox"] || {}).eps || 3.9 : o.eps || 11.7;
      semE[e] = r ? 0 : 1;
    }
    const dx = new Float64Array(N);
    for (let i = 0; i < N; i++) dx[i] = (i > 0 && semE[i - 1] ? h[i - 1] / 2 : 0) + (i < N - 1 && semE[i] ? h[i] / 2 : 0);
    const net = arr(o.net, xn, 0), bg = Float64Array.from(net, (v) => (o.bgn ? TC.bgn(v) / 2 : 0));
    let Nref = ni; for (let i = 0; i < N; i++) if (dx[i]) Nref = Math.max(Nref, Math.abs(net[i]));
    const bc = Object.assign({ left: { type: "ohmic" }, right: { type: "ohmic" } }, o.bc);
    const st = {
      T, Vt, ni, N, xn, x, h, er, dx, net, bg, Nref, bc, Nc: TC.Nc(T), Nv: TC.Nv(T), fd: o.stats === "fd",
      phin: arr(o.phin, xn, 0), phip: arr(o.phip, xn, 0), sheets: [], dg: null, qc: null,
      n: new Float64Array(N), p: new Float64Array(N), dn: new Float64Array(N), dp: new Float64Array(N),
    };
    st.lnc = Math.log(st.Nc / ni); st.lnv = Math.log(st.Nv / ni);
    (o.sheets || []).forEach((s) => {
      let i = 0; for (let j = 1; j < N; j++) if (Math.abs(xn[j] - s.x) < Math.abs(xn[i] - s.x)) i = j;
      st.sheets.push({ i, Q: s.Q || 0, Dit: s.Dit || 0 });
    });
    pBC(st);
    return st;
  }
  const CR = { n: 0, p: 0, dn: 0, dp: 0 };
  function carr1(st, i, ps) {
    if (!st.dx[i]) { CR.n = CR.p = CR.dn = CR.dp = 0; return CR; }
    const Vt = st.Vt, en = (ps - st.phin[i] + st.bg[i]) / Vt, ep = (st.phip[i] - ps + st.bg[i]) / Vt;
    if (st.fd) {
      const a = en - st.lnc, b = ep - st.lnv;
      CR.n = st.Nc * TC.fd12(a); CR.dn = (st.Nc * dfd(a)) / Vt;
      CR.p = st.Nv * TC.fd12(b); CR.dp = (-st.Nv * dfd(b)) / Vt;
    } else {
      CR.n = st.ni * Math.exp(en); CR.dn = CR.n / Vt;
      CR.p = st.ni * Math.exp(ep); CR.dp = -CR.p / Vt;
    }
    const qc = st.qc;
    if (qc && qc.mask[i]) {
      const v = qc.dens[i] * Math.exp((qc.sig * (ps - qc.psi0[i])) / Vt);
      if (qc.sig > 0) { CR.n = v; CR.dn = v / Vt; } else { CR.p = v; CR.dp = -v / Vt; }
    }
    return CR;
  }
  function carriers(st, psi) {
    for (let i = 0; i < st.N; i++) { const c = carr1(st, i, psi[i]); st.n[i] = c.n; st.p[i] = c.p; st.dn[i] = c.dn; st.dp[i] = c.dp; }
  }
  /** 국소 전하 중성 전위 */
  function neutral(st, i, phn, php) {
    const a = st.phin[i], b = st.phip[i];
    st.phin[i] = phn; st.phip[i] = php;
    const f = (ps) => { const c = carr1(st, i, ps); return c.p - c.n + st.net[i]; };
    const r = TC.bisect(f, Math.min(phn, php) - 2, Math.max(phn, php) + 2, 1e-13);
    st.phin[i] = a; st.phip[i] = b;
    return r;
  }
  function pBC(st) {
    [["left", 0], ["right", st.N - 1]].forEach(([k, i]) => {
      const b = st.bc[k];
      if (b.type === "ohmic") { const V = b.V != null ? b.V : st.phin[i]; b.psi = neutral(st, i, V, V); }
      else if (b.type === "dirichlet") b.psi = b.V || 0;
    });
  }
  function pInit(st, how) {
    const { N, xn } = st, psi = new Float64Array(N);
    if (isArr(how)) return Float64Array.from(how);
    if (how === "zero") { psi.fill(0); }
    else {
      const ok = [];
      for (let i = 0; i < N; i++) if (st.dx[i]) { psi[i] = neutral(st, i, st.phin[i], st.phip[i]); ok.push(i); }
      for (let i = 0; i < N; i++) if (!st.dx[i] && ok.length) {
        let a = -1, b = -1;
        for (const j of ok) { if (j < i) a = j; else if (b < 0) b = j; }
        psi[i] = a < 0 ? psi[b] : b < 0 ? psi[a] : psi[a] + ((psi[b] - psi[a]) * (xn[i] - xn[a])) / (xn[b] - xn[a]);
      }
    }
    ["left", "right"].forEach((k, j) => { const b = st.bc[k]; if (b.type !== "neumann") psi[j ? N - 1 : 0] = b.psi; });
    return psi;
  }
  /* 뉴턴 야코비안·잔차. hf: 소수 캐리어와 계면 트랩 응답을 얼린다(고주파 C). m = 2이면 밀도 기울기 변수 w를 함께 */
  function pAssemble(st, psi, w, hf) {
    const { N, h, er, dx, Vt } = st, dg = st.dg, m = dg ? 2 : 1, mm = m * m;
    if (!st.Lb || st.Lb.length !== N * mm) { st.Lb = new Float64Array(N * mm); st.Db = new Float64Array(N * mm); st.Ub = new Float64Array(N * mm); st.R = new Float64Array(N * m); }
    const Lb = st.Lb.fill(0), Db = st.Db.fill(0), Ub = st.Ub.fill(0), R = st.R.fill(0);
    carriers(st, psi);
    if (dg) for (let i = 0; i < N; i++) if (dg.on[i] && dx[i]) {
      const c = st.ni * Math.exp(2 * w[i]);
      if (dg.sig > 0) { st.n[i] = c; st.dn[i] = 0; } else { st.p[i] = c; st.dp[i] = 0; }
    }
    for (let i = 0; i < N; i++) {
      const o = i * mm, r = i * m, b = i === 0 ? st.bc.left : i === N - 1 ? st.bc.right : null;
      if (b && b.type !== "neumann") { Db[o] = 1; R[r] = psi[i] - b.psi; }
      else {
        let F = 0, d = 0;
        if (i < N - 1) { const c = er[i] / h[i]; F += c * (psi[i + 1] - psi[i]); d -= c; Ub[o] = c; }
        if (i > 0) { const c = er[i - 1] / h[i - 1]; F -= c * (psi[i] - psi[i - 1]); d -= c; Lb[o] = c; }
        let dn = st.dn[i], dp = st.dp[i];
        const minN = st.net[i] < 0;
        if (hf) { if (minN) dn = 0; else dp = 0; }
        F += K * dx[i] * (st.p[i] - st.n[i] + st.net[i]);
        d += K * dx[i] * (dp - dn);
        if (dg && dg.on[i] && dx[i] && !(hf && (dg.sig > 0) === minN)) Db[o + 1] = K * dx[i] * 2 * (dg.sig > 0 ? -st.n[i] : st.p[i]);
        for (const s of st.sheets) if (s.i === i) {
          F += K * s.Q;
          if (s.Dit) { const v = psi[i] - st.phin[i], lim = 0.55; F -= K * s.Dit * Math.max(-lim, Math.min(lim, v)); if (!hf && Math.abs(v) < lim) d -= K * s.Dit; }
        }
        Db[o] = d; R[r] = F;
      }
      if (m === 2) {
        if (!dg.on[i]) { Db[o + 3] = 1; continue; }
        const hl = i > 0 && dg.on[i - 1] ? h[i - 1] : 0, hr = i < N - 1 && dg.on[i + 1] ? h[i] : 0, V = (hl + hr) / 2, bb = dg.b;
        const gl = hl ? (w[i] - w[i - 1]) / hl : 0, gr = hr ? (w[i + 1] - w[i]) / hr : 0;
        const phi = dg.sig > 0 ? st.phin[i] : st.phip[i];
        R[r + 1] = V * (dg.sig * (psi[i] - phi) + st.bg[i] - dg.dE[i] - 2 * Vt * w[i]) + 2 * bb * (gr - gl) + bb * (hl * gl * gl + hr * gr * gr);
        Db[o + 2] = dg.sig * V;
        let dw = -2 * Vt * V;
        if (hr) { dw -= 2 * bb / hr; Ub[o + 3] = 2 * bb * (1 / hr + gr); dw -= 2 * bb * gr; }
        if (hl) { dw -= 2 * bb / hl; Lb[o + 3] = 2 * bb * (1 / hl - gl); dw += 2 * bb * gl; }
        Db[o + 3] = dw;
      }
    }
    return m;
  }
  function pNewton(st, psi, w, opt) {
    const m = pAssemble(st, psi, w, false), N = st.N;
    const X = TC.blockTri(N, m, st.Lb, st.Db, st.Ub, st.R), res = TC.blockTri.res;
    const damp = opt.damping || "log", Vt = st.Vt;
    let mx = 0;
    for (let i = 0; i < N; i++) mx = Math.max(mx, Math.abs(X[i * m]));
    const t = damp === "clamp" ? Math.min(1, (opt.dmax || 0.5) / mx) : 1;
    let upd = 0, mw = 0;
    if (m === 2) for (let i = 0; i < N; i++) mw = Math.max(mw, Math.abs(X[i * 2 + 1]));
    const tw = Math.min(1, 2 / mw);
    for (let i = 0; i < N; i++) {
      let d = -X[i * m] * t;
      if (damp === "log") d = Math.sign(d) * Vt * Math.log1p(Math.abs(d) / Vt);
      psi[i] += d;
      upd = Math.max(upd, Math.abs(d) / Vt);
      if (m === 2) { const dw = -X[i * 2 + 1] * tw; w[i] += dw; upd = Math.max(upd, Math.abs(dw)); }
    }
    return { res, upd: mx !== mx ? NaN : upd };
  }
  function pPicard(st, psi, omega) {
    const { N, h, er, dx } = st;
    carriers(st, psi);
    const a = new Float64Array(N), b = new Float64Array(N), c = new Float64Array(N), d = new Float64Array(N);
    let res = 0;
    for (let i = 0; i < N; i++) {
      const bc = i === 0 ? st.bc.left : i === N - 1 ? st.bc.right : null;
      if (bc && bc.type !== "neumann") { b[i] = 1; d[i] = bc.psi; continue; }
      let F = K * dx[i] * (st.p[i] - st.n[i] + st.net[i]);
      if (i < N - 1) { const k = er[i] / h[i]; c[i] = k; b[i] -= k; F += k * (psi[i + 1] - psi[i]); }
      if (i > 0) { const k = er[i - 1] / h[i - 1]; a[i] = k; b[i] -= k; F -= k * (psi[i] - psi[i - 1]); }
      for (const s of st.sheets) if (s.i === i) F += K * s.Q;
      res = Math.max(res, Math.abs(F) / (-b[i] * st.Vt));
      d[i] = -K * dx[i] * (st.p[i] - st.n[i] + st.net[i]) - st.sheets.reduce((z, s) => z + (s.i === i ? K * s.Q : 0), 0);
    }
    const pn = TC.tridiag(a, b, c, d);
    let upd = 0;
    for (let i = 0; i < N; i++) { const dd = omega * (pn[i] - psi[i]); psi[i] += dd; upd = Math.max(upd, Math.abs(dd) / st.Vt); }
    return { res, upd };
  }
  function pResult(st, psi, w) {
    const { N, xn, Vt, h } = st;
    carriers(st, psi);
    if (st.dg) for (let i = 0; i < N; i++) if (st.dg.on[i] && st.dx[i]) { const c = st.ni * Math.exp(2 * w[i]); if (st.dg.sig > 0) st.n[i] = c; else st.p[i] = c; }
    const n = Float64Array.from(st.n), p = Float64Array.from(st.p), E = new Float64Array(N), Ee = new Float64Array(N - 1);
    for (let e = 0; e < N - 1; e++) Ee[e] = -(psi[e + 1] - psi[e]) / h[e];
    for (let i = 0; i < N; i++) E[i] = i === 0 ? Ee[0] : i === N - 1 ? Ee[N - 2] : (Ee[i - 1] * h[i] + Ee[i] * h[i - 1]) / (h[i] + h[i - 1]);
    const rho = Float64Array.from(n, (v, i) => (st.dx[i] ? Q * (p[i] - v + st.net[i]) : 0));
    const ec = Vt * st.lnc, ev = Vt * st.lnv;
    return {
      x: Array.from(xn), psi: Float64Array.from(psi), n, p, E, Ee, rho,
      Ei: Float64Array.from(psi, (v) => -v),
      Ec: Float64Array.from(psi, (v, i) => -v + ec - st.bg[i]),
      Ev: Float64Array.from(psi, (v, i) => -v - ev + st.bg[i]),
      Efn: Float64Array.from(st.phin, (v) => -v), Efp: Float64Array.from(st.phip, (v) => -v),
    };
  }

  /**
   * 한 걸음씩 도는 1D 포아송 풀이기(수렴 애니메이션용).
   * o: {x(nm 배열 | mesh1d 사양) | L, nodes, net(배열|fn(x)), T, stats:"mb"|"fd", bgn, phin, phip(배열|스칼라 V),
   *     bc:{left:{type:"ohmic"|"dirichlet"|"neumann", V}, right}, regions:[{x0,x1,eps|m}], sheets:[{x, Q(cm⁻²)}],
   *     method:"newton"|"picard", damping:"log"|"clamp"|"none", dmax, omega(피카르 이완), init:"neutral"|"zero"|배열}
   * → {x, psi, history, step() → {it, res, upd, diverged}, run(tol, maxIter), result()}
   */
  TC.poissonSolver1d = function (o = {}) {
    const st = pSetup(o), psi = pInit(st, o.init);
    const S = {
      st, x: Array.from(st.xn), psi, history: [], it: 0, diverged: false, converged: false,
      step() {
        const r = o.method === "picard" ? pPicard(st, psi, o.omega || 1) : pNewton(st, psi, null, o);
        S.it++;
        let bad = !(r.upd < 1e30) || !(r.res < 1e300);
        for (let i = 0; i < st.N && !bad; i++) if (!(Math.abs(psi[i]) < 1e3)) bad = true;
        S.diverged = bad;
        const rec = { it: S.it, res: r.res, upd: r.upd, diverged: bad };
        S.history.push(rec);
        return rec;
      },
      run(tol = o.tol || 1e-9, maxIter = o.maxIter || 100) {
        while (S.it < maxIter && !S.diverged) { const r = S.step(); if (r.upd < tol) { S.converged = true; break; } }
        return S;
      },
      result() { return Object.assign(pResult(st, psi, null), { iters: S.it, history: S.history, converged: S.converged, diverged: S.diverged, Eref: "평형 페르미 준위 = 0 eV" }); },
    };
    return S;
  };
  /** 1D 비선형 포아송(뉴턴). 옵션은 poissonSolver1d와 같다 → {x, psi(V), n, p, E(노드), Ee(구간), rho(C/cm³), Ec, Ev, Ei, Efn, Efp(eV, 평형 Ef = 0), iters, history, converged} */
  TC.poisson1d = (o = {}) => TC.poissonSolver1d(o).run().result();

  /* ------------------------------------------------------------ 슈뢰딩거 */
  const HB2M = (TC.hbar * TC.hbar) / (2 * TC.m0 * Q) * 1e18; // ħ²/2m0 (eV·nm²) = 0.0381
  /**
   * 1D 유효 질량 슈뢰딩거 방정식(양 끝 ψ = 0). x(nm, 비균일 가능), V(eV 배열), mEff(상대 질량, 스칼라|배열), nStates
   * 대칭화한 삼중 대각 행렬에 스투름 이분법 + 역반복 → {E: [eV], psi: [Float64Array(∫ψ²dx = 1, nm⁻¹)]}
   */
  TC.schrod1d = function (x, V, mEff = 1, nStates = 4) {
    const N = x.length, M = N - 2;
    if (M < 1) return { E: [], psi: [] };
    const c = new Float64Array(N - 1), vol = new Float64Array(N);
    for (let e = 0; e < N - 1; e++) { const me = isArr(mEff) ? 0.5 * (mEff[e] + mEff[e + 1]) : mEff; c[e] = HB2M / (me * (x[e + 1] - x[e])); }
    for (let i = 1; i < N - 1; i++) vol[i] = 0.5 * (x[i + 1] - x[i - 1]);
    const d = new Float64Array(M), od = new Float64Array(M);
    let lo = Infinity, hi = -Infinity;
    for (let k = 0; k < M; k++) {
      const i = k + 1;
      d[k] = (c[i - 1] + c[i]) / vol[i] + V[i];
      if (k < M - 1) od[k] = -c[i] / Math.sqrt(vol[i] * vol[i + 1]);
    }
    for (let k = 0; k < M; k++) { const r = (k ? Math.abs(od[k - 1]) : 0) + (k < M - 1 ? Math.abs(od[k]) : 0); lo = Math.min(lo, d[k] - r); hi = Math.max(hi, d[k] + r); }
    const count = (lam) => {
      let q = d[0] - lam, n = q < 0 ? 1 : 0;
      for (let k = 1; k < M; k++) { q = d[k] - lam - (od[k - 1] * od[k - 1]) / (q || 1e-300); if (q < 0) n++; }
      return n;
    };
    const E = [], psi = [], ns = Math.min(nStates, M);
    let a0 = lo;
    for (let s = 0; s < ns; s++) {
      let a = a0, b = hi;
      while (b - a > 1e-11 * (1 + Math.abs(a))) { const mid = 0.5 * (a + b); if (count(mid) > s) b = mid; else a = mid; }
      const lam = 0.5 * (a + b);
      E.push(lam); a0 = a;
      const sh = lam - 1e-10 * (1 + Math.abs(lam)), A = new Float64Array(M), B = new Float64Array(M), C = new Float64Array(M);
      for (let k = 0; k < M; k++) { B[k] = d[k] - sh; A[k] = k ? od[k - 1] : 0; C[k] = k < M - 1 ? od[k] : 0; }
      let y = Float64Array.from({ length: M }, (_, k) => 1 + 0.1 * Math.sin(k * 1.7 + s));
      for (let it = 0; it < 3; it++) {
        y = TC.tridiag(A, B, C, y);
        let nrm = 0; for (let k = 0; k < M; k++) nrm += y[k] * y[k];
        nrm = Math.sqrt(nrm); for (let k = 0; k < M; k++) y[k] /= nrm;
      }
      const f = new Float64Array(N);
      for (let k = 0; k < M; k++) f[k + 1] = y[k] / Math.sqrt(vol[k + 1]);
      let mx = 0; for (let i = 0; i < N; i++) if (Math.abs(f[i]) > Math.abs(mx)) mx = f[i];
      if (mx < 0) for (let i = 0; i < N; i++) f[i] = -f[i];
      psi.push(f);
    }
    return { E, psi };
  };
  /** 실리콘 (100) 계곡: 전자 2겹(mz 0.916, 상태 밀도 0.19), 4겹(mz 0.19, 0.417). 정공은 근사(HH, LH) */
  TC.VALLEYS = {
    n: [{ name: "2겹(Δ2)", mz: 0.916, md: 0.19, g: 2 }, { name: "4겹(Δ4)", mz: 0.19, md: 0.417, g: 4 }],
    p: [{ name: "HH", mz: 0.29, md: 0.433, g: 1 }, { name: "LH", mz: 0.2, md: 0.169, g: 1 }],
  };
  /* 양자 영역의 캐리어 밀도(cm⁻³)와 부띠 */
  function spDensity(st, psi, cfg) {
    const { i0, i1, sig } = cfg, T = st.T, kT = TC.kB * T, Vt = st.Vt;
    const xs = Array.from(st.xn.slice(i0, i1 + 1));
    const V = xs.map((_, k) => { const i = i0 + k; return sig > 0 ? -psi[i] + Vt * st.lnc - st.bg[i] : psi[i] + Vt * st.lnv - st.bg[i]; });
    const Fref = sig > 0 ? -st.phin[i0] : st.phip[i0];
    const C2D = ((TC.m0 * kT * Q) / (Math.PI * TC.hbar * TC.hbar)) * 1e-4;
    const dens = cfg.dens.fill(0), subs = [];
    (cfg.valleys || TC.VALLEYS[sig > 0 ? "n" : "p"]).forEach((v) => {
      const r = TC.schrod1d(xs, V, v.mz, cfg.nStates || 10);
      r.E.forEach((E, j) => {
        const Ns = C2D * v.g * v.md * log1pexp((Fref - E) / kT);
        subs.push({ valley: v.name, E: sig > 0 ? E : -E, N: Ns, psi: r.psi[j] });
        const f = r.psi[j];
        for (let k = 0; k < xs.length; k++) dens[i0 + k] += Ns * f[k] * f[k] * 1e7;
      });
    });
    cfg.subbands = subs;
  }

  /* ------------------------------------------------------------ MOS 커패시터 */
  const CHI_SI = 4.05, CHI_OX = 0.95, EG_OX = 9.0;
  function mosSetup(o) {
    const T = o.T || 300, sub = o.sub || "p", Na = o.N || 1e17, Vt = TC.vt(T), ni = TC.ni(T);
    const epsOx = o.epsOx || 3.9, tox = o.tox != null ? o.tox : o.EOT != null ? (o.EOT * epsOx) / 3.9 : 2, EOT = (tox * 3.9) / epsOx;
    const g = o.gate || (sub === "p" ? "n+poly" : "p+poly"), poly = typeof g === "string" && o.Npoly > 0;
    const wf = typeof g === "object" ? g.wf : g === "p+poly" ? CHI_SI + TC.Eg(T) : CHI_SI;
    const es = 11.7 * EPS0, phiF = Vt * Math.log(Na / ni), Wd = Math.sqrt((4 * es * phiF) / (Q * Na)) / NM;
    const depth = o.depth || Math.max(60, 3 * Wd), tp = o.tpoly || 40;
    const nOx = Math.max(6, Math.ceil(tox / 0.1));
    const si = TC.geoMesh(0, depth, o.h0 || 0.02, 1.08, Math.max(0.5, depth / 60));
    const ox = TC.linspace(-tox, 0, nOx + 1);
    const xn = poly ? join(geoRev(-tox - tp, -tox, 0.03, 1.12, 2), ox, si) : join(ox, si);
    const N = xn.length, iS = xn.indexOf(0), sgnSub = sub === "p" ? -1 : 1, sgnPoly = g === "p+poly" ? -1 : 1;
    const net = xn.map((x) => (x >= 0 ? sgnSub * Na : x < -tox ? sgnPoly * (o.Npoly || 0) : 0));
    const st = pSetup({
      x: xn, net, T, stats: o.stats, bgn: o.bgn, regions: [{ x0: -tox, x1: 0, eps: epsOx }],
      sheets: o.Qox || o.Dit ? [{ x: 0, Q: o.Qox || 0, Dit: o.Dit || 0 }] : [],
      bc: { left: poly ? { type: "ohmic", V: 0 } : { type: "dirichlet", V: 0 }, right: { type: "ohmic", V: 0 } },
    });
    const M = { o, st, T, sub, Na, tox, EOT, epsOx, poly, wf, iS, N, phiF, Cox: (epsOx * EPS0) / (tox * NM), sig: sub === "p" ? 1 : -1, psi: null, w: null, Vg: null };
    M.psiB = neutral(st, N - 1, 0, 0);
    M.psiG0 = poly ? neutral(st, 0, 0, 0) : -wf + CHI_SI + Vt * st.lnc;
    M.Vfb = M.psiB - M.psiG0 - (o.Qox || 0) * Q / M.Cox;
    if (o.qm === "dg") {
      const on = new Uint8Array(N), dE = new Float64Array(N);
      for (let i = 0; i < N; i++) { on[i] = xn[i] > -tox + 1e-9 ? 1 : 0; dE[i] = xn[i] < 0 ? (M.sig > 0 ? CHI_SI - CHI_OX : EG_OX + CHI_OX - CHI_SI - TC.Eg(T)) : 0; }
      st.dg = { sig: M.sig, on, dE, b: (TC.hbar * TC.hbar) / (12 * Q * (o.mDG || 0.15) * TC.m0) * 1e4 };
    }
    if (o.qm === "sp") {
      const Lq = o.qbox || Math.min(depth, 20);
      let i1 = iS; while (i1 < N - 1 && xn[i1] < Lq) i1++;
      const mask = new Uint8Array(N); for (let i = iS; i <= i1; i++) mask[i] = 1;
      M.qc = { i0: iS, i1, sig: M.sig, mask, dens: new Float64Array(N), psi0: new Float64Array(N), nStates: o.nStates || 10, valleys: o.valleys };
    }
    return M;
  }
  function dgInit(M) {
    const st = M.st, dg = st.dg, w = new Float64Array(M.N), ws = (dg.sig * M.psi[M.iS] + st.bg[M.iS]) / (2 * st.Vt);
    for (let i = 0; i < M.N; i++) {
      if (!dg.on[i]) continue;
      w[i] = st.xn[i] >= 0 ? (dg.sig * M.psi[i] + st.bg[i]) / (2 * st.Vt) : ws + Math.sqrt(dg.dE[i] / (2 * dg.b)) * st.xn[i] * NM;
    }
    return w;
  }
  function mosBias(M, Vg, mode) {
    const st = M.st, N = M.N, big = 60;
    for (let i = 0; i < N; i++) {
      const x = st.xn[i];
      if (x < -M.tox + 1e-9 && M.poly) { st.phin[i] = st.phip[i] = Vg; }
      else { st.phin[i] = 0; st.phip[i] = 0; if (mode === "dd" && x >= 0) { if (M.sig > 0) st.phin[i] = big; else st.phip[i] = -big; } }
    }
    st.bc.left.V = M.poly ? Vg : M.psiG0 + Vg;
    pBC(st);
  }
  function mosNewton(M, maxIter = 60, tol = 1e-10) {
    const st = M.st;
    for (let it = 1; it <= maxIter; it++) {
      const r = pNewton(st, M.psi, M.w, { damping: "log" });
      if (!(r.upd < 1e30)) return -1;
      if (r.upd < tol) return it;
    }
    return -1;
  }
  function mosSolveOnce(M, Vg, mode) {
    mosBias(M, Vg, mode);
    const st = M.st;
    if (!M.qc) return mosNewton(M);
    st.qc = null;
    let its = mosNewton(M);
    if (its < 0) return -1;
    const qc = M.qc;
    for (let k = 0; k < 80; k++) {
      spDensity(st, M.psi, qc);
      qc.psi0.set(M.psi);
      st.qc = qc;
      const i2 = mosNewton(M);
      if (i2 < 0) return -1;
      its += i2;
      let d = 0; for (let i = 0; i < M.N; i++) d = Math.max(d, Math.abs(M.psi[i] - qc.psi0[i]));
      if (d < 1e-7) { spDensity(st, M.psi, qc); qc.psi0.set(M.psi); return its; }
    }
    return its;
  }
  function mosSolve(M, Vg, mode = "lf") {
    if (!M.psi || M.mode !== mode) {
      M.mode = mode;
      mosBias(M, M.Vfb, mode);
      M.psi = pInit(M.st, "neutral");
      if (M.st.dg) M.w = dgInit(M);
      M.Vg = M.Vfb;
      if (mosSolveOnce(M, M.Vfb, mode) < 0) return -1;
    }
    let V = M.Vg, step = Math.sign(Vg - V) * Math.min(0.25, Math.abs(Vg - V)), its = 0;
    while (Math.abs(Vg - V) > 1e-12) {
      if (Math.abs(step) > Math.abs(Vg - V)) step = Vg - V;
      const sp = Float64Array.from(M.psi), sw = M.w && Float64Array.from(M.w);
      const r = mosSolveOnce(M, V + step, mode);
      if (r >= 0) { V += step; its += r; step *= 1.5; }
      else { M.psi = sp; M.w = sw; step /= 2; if (Math.abs(step) < 1e-5) return -1; }
    }
    M.Vg = Vg;
    return its || mosSolveOnce(M, Vg, mode);
  }
  /* 게이트 전하(산화막 전계)와 선형화한 dQg/dVg */
  function mosQg(M, psi) { const e = M.iS - 1, st = M.st; return st.er[e] * EPS0 * (psi[e] - psi[e + 1]) / st.h[e]; }
  function mosCap(M, hf) {
    const st = M.st, N = M.N, m = pAssemble(st, M.psi, M.w, hf), rhs = new Float64Array(N * m);
    rhs[0] = st.bc.left.type === "neumann" ? 0 : 1;
    for (let i = 1; i < N; i++) if (M.poly && st.xn[i] < -M.tox + 1e-9) {
      let dn = st.dn[i], dp = st.dp[i];
      if (hf) { if (st.net[i] < 0) dn = 0; else dp = 0; }
      rhs[i * m] = K * st.dx[i] * (dp - dn);
    }
    const X = TC.blockTri(N, m, st.Lb, st.Db, st.Ub, rhs), d = Float64Array.from({ length: N }, (_, i) => X[i * m]);
    return mosQg(M, d);
  }
  function mosPack(M, Vg) {
    const st = M.st, r = pResult(st, M.psi, M.w), N = M.N, iS = M.iS, xn = st.xn;
    let Qs = 0, Ninv = 0, xc = 0;
    const c = M.sig > 0 ? r.n : r.p;
    for (let i = iS; i < N; i++) { const v = st.dx[i]; Qs += Q * (r.p[i] - r.n[i] + st.net[i]) * v; Ninv += c[i] * v; xc += c[i] * v * xn[i]; }
    const nb = M.sig > 0 ? r.n[N - 1] : r.p[N - 1];
    let NinvX = 0; for (let i = iS; i < N; i++) NinvX += Math.max(0, c[i] - nb) * st.dx[i];
    const Qinv = -M.sig * Q * NinvX, Qg = mosQg(M, M.psi), ec = st.Vt * st.lnc;
    const Evac = Float64Array.from(M.psi, (v) => -v + ec + CHI_SI);
    for (let i = 0; i < N; i++) if (!st.dx[i]) { r.Ec[i] = Evac[i] - CHI_OX; r.Ev[i] = r.Ec[i] - EG_OX; }
    return Object.assign(r, {
      Vg, psiS: M.psi[iS] - M.psi[N - 1], psiSurf: M.psi[iS], Qg, Qs, Qinv, Qdep: Qs - Qinv, Ninv: NinvX, centroid: xc / Ninv,
      Qit: st.sheets.length ? -Q * st.sheets[0].Dit * Math.max(-0.55, Math.min(0.55, M.psi[iS])) : 0,
      Cox: M.Cox, EOT: M.EOT, tox: M.tox, Vfb: M.Vfb, iS, subbands: M.qc ? M.qc.subbands : null, EfGate: -Vg,
      Ef: Float64Array.from(xn, (x) => (x < -M.tox ? -Vg : x > 0 ? 0 : NaN)),
    });
  }
  /**
   * MOS 커패시터 1D 단면 풀이(게이트–산화막–실리콘). x는 Si/SiO₂ 계면 0, 산화막 [−tox, 0], 실리콘 +, 다결정 게이트는 −tox 위쪽.
   * o: {sub:"p"|"n", N, tox(nm) | EOT, epsOx, gate:"n+poly"|"p+poly"|{wf}, Npoly(주면 다결정 공핍), tpoly, Qox(cm⁻²), Dit(cm⁻²eV⁻¹),
   *     T, stats, bgn, qm:"none"|"dg"|"sp", mDG(밀도 기울기 질량, 0.15), qbox(nm), depth, Vg, mode:"lf"|"dd"}
   * → {x, psi, n, p, Ec, Ev, Ei, Ef, psiS(V), Qg, Qs, Qinv, Qdep(C/cm²), Ninv(cm⁻²), centroid(nm), Cox, Vfb, subbands, iters}
   */
  TC.moscap = function (o = {}) {
    const M = mosSetup(o), t0 = Date.now(), its = mosSolve(M, o.Vg || 0, o.mode || "lf");
    return Object.assign(mosPack(M, o.Vg || 0), { iters: its, converged: its >= 0, ms: Date.now() - t0 });
  };
  /**
   * C-V 스윕. opt.mode: "lf"(준정적) | "hf"(소수 캐리어·트랩을 얼린 고주파) | "dd"(깊은 공핍). 앞 점에서 이어 푼다.
   * → {Vg, C(F/cm²), CCox, Qg, psiS, Ninv, centroid, iters, Cox, EOT, Vfb, sols(opt.keep)}
   */
  TC.mosCV = function (o, vgList, opt = {}) {
    const mode = opt.mode || "lf", M = mosSetup(o), out = { Vg: [], C: [], CCox: [], Qg: [], psiS: [], Ninv: [], centroid: [], iters: [], Cox: M.Cox, EOT: M.EOT, Vfb: M.Vfb, sols: [] };
    const fd = o.qm === "sp" && mode !== "hf";
    vgList.forEach((Vg) => {
      const it = mosSolve(M, Vg, mode === "hf" ? "lf" : mode), r = mosPack(M, Vg);
      out.Vg.push(Vg); out.iters.push(it); out.Qg.push(r.Qg); out.psiS.push(r.psiS); out.Ninv.push(r.Ninv); out.centroid.push(r.centroid);
      out.C.push(fd ? NaN : mosCap(M, mode === "hf"));
      if (opt.keep) out.sols.push(r);
    });
    if (fd) {
      const V = out.Vg, Qg = out.Qg, n = V.length;
      for (let i = 0; i < n; i++) { const a = Math.max(0, i - 1), b = Math.min(n - 1, i + 1); out.C[i] = (Qg[b] - Qg[a]) / (V[b] - V[a]); }
    }
    out.CCox = out.C.map((c) => c / M.Cox);
    return out;
  };
  /** MOS 해석식(고전, 볼츠만): {phiF, Vfb, Vt(ψs = 2φF), Cox, Cfb, Cmin(HF), Wdmax(nm), LD(nm), Qdmax(C/cm²)} */
  TC.mosAnalytic = function (o = {}) {
    const M = mosSetup(Object.assign({}, o, { qm: "none" })), es = 11.7 * EPS0, Vt = TC.vt(M.T);
    const LD = Math.sqrt((es * Vt) / (Q * M.Na)), Wd = Math.sqrt((2 * es * 2 * M.phiF) / (Q * M.Na)), Qd = Q * M.Na * Wd;
    const Vt0 = M.Vfb + M.sig * (2 * M.phiF + Qd / M.Cox);
    return { phiF: M.phiF, Vfb: M.Vfb, Vt: Vt0, Cox: M.Cox, EOT: M.EOT, Cfb: 1 / (1 / M.Cox + LD / es), Cmin: 1 / (1 / M.Cox + Wd / es), Wdmax: Wd / NM, LD: LD / NM, Qdmax: Qd, phiMS: M.psiB - M.psiG0 };
  };
  /**
   * C-V 추출: cv(TC.mosCV 결과) → {Cox, Cfb, Vfb(C = Cfb 교차), Vt(Ninv 최대 기울기 외삽), VtPsi(ψs = 2φF), CET(nm, vgCET 또는 Ninv = ninvCET인 Vg에서 3.9ε0/C), Vcet, Cinv}
   */
  TC.mosExtract = function (cv, o = {}) {
    const a = TC.mosAnalytic(o), V = cv.Vg, C = cv.C, n = V.length, sig = (o.sub || "p") === "p" ? 1 : -1;
    const cross = (ys, y0, near) => {
      let best = NaN;
      for (let i = 0; i < n - 1; i++) if ((ys[i] - y0) * (ys[i + 1] - y0) <= 0 && ys[i] !== ys[i + 1]) {
        const v = V[i] + ((y0 - ys[i]) * (V[i + 1] - V[i])) / (ys[i + 1] - ys[i]);
        if (!(Math.abs(v - near) >= Math.abs(best - near))) best = v;
      }
      return best;
    };
    let best = 0, Vt = NaN;
    for (let i = 0; i < n - 1; i++) {
      const s = (cv.Ninv[i + 1] - cv.Ninv[i]) / (V[i + 1] - V[i]);
      if (sig * s > best) { best = sig * s; Vt = V[i] - cv.Ninv[i] / s; }
    }
    const ord = V.map((_, i) => i).sort((i, j) => cv.Ninv[i] - cv.Ninv[j]);
    const vc = o.ninvCET ? TC.interp(ord.map((i) => cv.Ninv[i]), ord.map((i) => V[i]), o.ninvCET) : o.vgCET != null ? o.vgCET : V[n - 1], Cinv = TC.interp(V, C, vc);
    return { Cox: cv.Cox, Cfb: a.Cfb, Vfb: cross(C, a.Cfb, a.Vfb), Vt, VtPsi: cross(cv.psiS.map((p) => sig * p), 2 * a.phiF, a.Vt), Vcet: vc, Cinv, CET: (3.9 * EPS0) / Cinv / NM };
  };

  /* ------------------------------------------------------------ 드리프트-확산 */
  function ddSetup(o) {
    const T = o.T || 300, Vt = TC.vt(T), ni = TC.ni(T);
    const xn = meshOf(o), N = xn.length, x = Float64Array.from(xn, (v) => v * NM);
    const h = new Float64Array(N - 1), dx = new Float64Array(N);
    for (let e = 0; e < N - 1; e++) h[e] = x[e + 1] - x[e];
    for (let i = 0; i < N; i++) dx[i] = ((i > 0 ? h[i - 1] : 0) + (i < N - 1 ? h[i] : 0)) / 2;
    const net = arr(o.net, xn, 0), Nt = o.Ntot ? arr(o.Ntot, xn, 0) : Float64Array.from(net, Math.abs);
    const bg = Float64Array.from(net, (v) => (o.bgn ? TC.bgn(v) / 2 : 0)), nie = Float64Array.from(bg, (b) => ni * Math.exp(b / Vt));
    const mob = o.mobility || "ct";
    const mf = mob === "const" ? (_, c) => (c === "n" ? o.mun || 1417 : o.mup || 470.5) : mob === "masetti" ? (Nx, c) => TC.mobMasetti(Nx, c, T) : (Nx, c) => TC.mobCT(Nx, c, T);
    const mn0 = new Float64Array(N - 1), mp0 = new Float64Array(N - 1);
    for (let e = 0; e < N - 1; e++) { const Ne = 0.5 * (Nt[e] + Nt[e + 1]); mn0[e] = mf(Ne, "n"); mp0[e] = mf(Ne, "p"); }
    const ta = o.tau == null ? 1e-7 : o.tau, tn = new Float64Array(N), tp = new Float64Array(N);
    for (let i = 0; i < N; i++) {
      const a = typeof ta === "number" ? ta : ta.n || 1e-7, b = typeof ta === "number" ? ta : ta.p || a;
      tn[i] = ta.doping ? TC.tauSRH(Nt[i], a, ta.Nref || 5e16) : a; tp[i] = ta.doping ? TC.tauSRH(Nt[i], b, ta.Nref || 5e16) : b;
    }
    const rc = Object.assign({ srh: true, auger: true, rad: false, ii: false, bbt: false }, o.recomb);
    const eq = TC.poissonSolver1d({ x: xn, net, T, bgn: o.bgn }).run(1e-11, 200);
    const psi = Float64Array.from(eq.psi);
    const S = {
      o, T, Vt, ni, N, xn, x, h, dx, net, bg, nie, mn0, mp0, tn, tp, rc, er: (o.eps || 11.7) * EPS0, Et: o.Et || 0, field: !!o.field,
      psi, n: Float64Array.from(psi, (v, i) => nie[i] * Math.exp(v / Vt)), p: Float64Array.from(psi, (v, i) => nie[i] * Math.exp(-v / Vt)),
      VL: 0, VR: 0, RsL: 0, RsR: 0, dt: Infinity, nold: null, pold: null, Eold: null,
      L: new Float64Array(N * 9), D: new Float64Array(N * 9), U: new Float64Array(N * 9), R: new Float64Array(N * 3),
      fn: new Float64Array(N - 1), fnA: new Float64Array(N - 1), fnB: new Float64Array(N - 1), fnP: new Float64Array(N - 1),
      fp: new Float64Array(N - 1), fpA: new Float64Array(N - 1), fpB: new Float64Array(N - 1), fpP: new Float64Array(N - 1),
      an: new Float64Array(N - 1), ap: new Float64Array(N - 1), Uc: new Float64Array(N), Gc: new Float64Array(N), mun: new Float64Array(N - 1), mup: new Float64Array(N - 1),
    };
    S.psiEq = [psi[0], psi[N - 1]]; S.nEq = [S.n[0], S.n[N - 1]]; S.pEq = [S.p[0], S.p[N - 1]];
    return S;
  }
  function ddFlux(S) {
    const { N, h, psi, n, p, Vt, bg } = S;
    for (let e = 0; e < N - 1; e++) {
      const dps = psi[e + 1] - psi[e], db = bg[e + 1] - bg[e], E = -dps / h[e];
      let mn = S.mn0[e], mp = S.mp0[e];
      let gn = 0, gp = 0;
      if (S.field) {
        const m1 = TC.mobField(mn, E, "n", S.T), m2 = TC.mobField(mp, E, "p", S.T), dE = 1e-4 * Math.abs(E) + 1;
        gn = (TC.mobField(mn, E + dE, "n", S.T) - TC.mobField(mn, E - dE, "n", S.T)) / (2 * dE * m1);
        gp = (TC.mobField(mp, E + dE, "p", S.T) - TC.mobField(mp, E - dE, "p", S.T)) / (2 * dE * m2);
        mn = m1; mp = m2;
      }
      S.mun[e] = mn; S.mup[e] = mp;
      const an = (Vt * mn) / h[e], ap = (Vt * mp) / h[e], dn = (dps + db) / Vt, dp = (dps - db) / Vt;
      const B1 = TC.bern(dn), B2 = TC.bern(-dn), C1 = TC.bern(dp), C2 = TC.bern(-dp);
      S.fn[e] = an * (n[e + 1] * B1 - n[e] * B2); S.fnA[e] = -an * B2; S.fnB[e] = an * B1; S.fnP[e] = (an * (n[e + 1] * dbern(dn) + n[e] * dbern(-dn))) / Vt - (S.fn[e] * gn) / h[e];
      S.fp[e] = ap * (p[e] * C1 - p[e + 1] * C2); S.fpA[e] = ap * C1; S.fpB[e] = -ap * C2; S.fpP[e] = (ap * (p[e] * dbern(dp) + p[e + 1] * dbern(-dp))) / Vt - (S.fp[e] * gp) / h[e];
      if (S.rc.ii) { S.an[e] = TC.alphaII(E, "n", S.T); S.ap[e] = TC.alphaII(E, "p", S.T); }
    }
  }
  /* 접점 구간 e의 단자 전류(전도 + 변위, A/cm², +x 방향)와 그 미분 */
  function ddJc(S, e) {
    const d = S.dt < Infinity ? S.er / (S.h[e] * S.dt) : 0;
    const Ee = -(S.psi[e + 1] - S.psi[e]) / S.h[e], old = S.Eold ? S.Eold[e] : 0;
    return {
      J: Q * (S.fn[e] + S.fp[e]) + (d ? d * S.h[e] * (Ee - old) : 0),
      d0: Q * (-S.fnP[e] - S.fpP[e]) + d, d1: Q * (S.fnP[e] + S.fpP[e]) - d,
      n0: Q * S.fnA[e], n1: Q * S.fnB[e], p0: Q * S.fpA[e], p1: Q * S.fpB[e],
    };
  }
  /* 반올림 잡음이 가장 작은 구간(다수 캐리어 플럭스 상쇄가 가장 작은 곳): 1D 전류 보존이므로 단자 전류를 여기서 읽는다 */
  function quiet(S) {
    let best = Infinity, k = 0;
    for (let e = 0; e < S.N - 1; e++) {
      const w = (Math.max(S.n[e], S.n[e + 1]) * S.mn0[e] + Math.max(S.p[e], S.p[e + 1]) * S.mp0[e]) / S.h[e];
      if (w < best) { best = w; k = e; }
    }
    return k;
  }
  function ddAssemble(S) {
    const { N, h, dx, psi, n, p, Vt, rc, er } = S, L = S.L.fill(0), D = S.D.fill(0), U = S.U.fill(0), R = S.R.fill(0);
    ddFlux(S);
    const iDt = S.dt < Infinity ? 1 / S.dt : 0, ke = er / EPS0;
    let ftot = 0;
    if (rc.ii) ftot = S.fn[quiet(S)] + S.fp[quiet(S)];
    for (let i = 0; i < N; i++) {
      const o = i * 9, r = i * 3, ni2 = S.nie[i] * S.nie[i], num = n[i] * p[i] - ni2;
      let Ur = 0, dUn = 0, dUp = 0, G = 0;
      if (rc.srh) {
        const e = Math.exp(S.Et / Vt), n1 = S.nie[i] * e, p1 = S.nie[i] / e, Dd = S.tp[i] * (n[i] + n1) + S.tn[i] * (p[i] + p1);
        Ur += num / Dd; dUn += (p[i] * Dd - num * S.tp[i]) / (Dd * Dd); dUp += (n[i] * Dd - num * S.tn[i]) / (Dd * Dd);
      }
      if (rc.auger) { const c = 2.8e-31 * n[i] + 9.9e-32 * p[i]; Ur += c * num; dUn += 2.8e-31 * num + c * p[i]; dUp += 9.9e-32 * num + c * n[i]; }
      if (rc.rad) { Ur += 1.1e-14 * num; dUn += 1.1e-14 * p[i]; dUp += 1.1e-14 * n[i]; }
      if (rc.bbt && i > 0 && i < N - 1) G += TC.bbt(0.5 * ((psi[i] - psi[i - 1]) / h[i - 1] + (psi[i + 1] - psi[i]) / h[i]));
      S.Uc[i] = Ur;
      if (i === 0 || i === N - 1) {
        const k = i ? 1 : 0, Rs = k ? S.RsR : S.RsL, V = k ? S.VR : S.VL;
        D[o] = 1; D[o + 4] = 1; D[o + 8] = 1;
        R[r] = psi[i] - S.psiEq[k] - V; R[r + 1] = n[i] - S.nEq[k]; R[r + 2] = p[i] - S.pEq[k];
        if (Rs) {
          const c = ddJc(S, k ? N - 2 : 0), s = k ? -Rs : Rs, A = k ? L : U;
          R[r] += s * c.J;
          if (k) { D[o] += s * c.d1; A[o] += s * c.d0; A[o + 1] += s * c.n0; A[o + 2] += s * c.p0; }
          else { D[o] += s * c.d0; A[o] += s * c.d1; A[o + 1] += s * c.n1; A[o + 2] += s * c.p1; }
        }
        S.Gc[i] = 0;
        continue;
      }
      const cl = ke / h[i - 1], cr = ke / h[i], v = dx[i];
      R[r] = cr * (psi[i + 1] - psi[i]) - cl * (psi[i] - psi[i - 1]) + K * v * (p[i] - n[i] + S.net[i]);
      D[o] = -cl - cr; D[o + 1] = -K * v; D[o + 2] = K * v; L[o] = cl; U[o] = cr;
      R[r + 1] = S.fn[i] - S.fn[i - 1] - (Ur - G) * v;
      D[o + 3] = -S.fnP[i] - S.fnP[i - 1]; D[o + 4] = S.fnA[i] - S.fnB[i - 1] - dUn * v; D[o + 5] = -dUp * v;
      U[o + 3] = S.fnP[i]; U[o + 4] = S.fnB[i]; L[o + 3] = S.fnP[i - 1]; L[o + 4] = -S.fnA[i - 1];
      R[r + 2] = -(S.fp[i] - S.fp[i - 1]) - (Ur - G) * v;
      D[o + 6] = S.fpP[i] + S.fpP[i - 1]; D[o + 7] = -dUn * v; D[o + 8] = -S.fpA[i] + S.fpB[i - 1] - dUp * v;
      U[o + 6] = -S.fpP[i]; U[o + 8] = -S.fpB[i]; L[o + 6] = -S.fpP[i - 1]; L[o + 8] = S.fpA[i - 1];
      if (iDt) {
        R[r + 1] -= (n[i] - S.nold[i]) * iDt * v; D[o + 4] -= iDt * v;
        R[r + 2] -= (p[i] - S.pold[i]) * iDt * v; D[o + 8] -= iDt * v;
      }
      if (rc.ii) {
        let Gi = 0;
        for (const [e, A, B] of [[i - 1, L, D], [i, D, U]]) {
          const c = h[e] / 2, hm = p[e] + p[e + 1] > n[e] + n[e + 1];
          const Fn = hm ? S.fn[e] : ftot - S.fp[e], Fp = hm ? ftot - S.fn[e] : S.fp[e];
          const sn = Math.sign(Fn) * S.an[e] * c, sp = Math.sign(Fp) * S.ap[e] * c, k = hm ? sn - sp : sp - sn, col = hm ? 1 : 2;
          Gi += sn * Fn + sp * Fp;
          for (const row of [3, 6]) { A[o + row + col] += k * (hm ? S.fnA[e] : S.fpA[e]); B[o + row + col] += k * (hm ? S.fnB[e] : S.fpB[e]); }
        }
        R[r + 1] += Gi; R[r + 2] += Gi; G += Gi / v;
      }
      S.Gc[i] = G;
    }
  }
  function ddApply(S, dps, dn, dp) {
    const { N, psi, n, p, Vt } = S, fl = S.ni * 1e-3;
    let upd = 0;
    for (let i = 0; i < N; i++) {
      psi[i] += dps[i];
      upd = Math.max(upd, Math.abs(dps[i]) / Vt);
      for (const [c, d] of [[n, dn], [p, dp]]) {
        if (!d) continue;
        const old = c[i], r = d[i] / old;
        c[i] = S.raw ? old + d[i] : Math.max(1e-100, r > -0.5 ? old * (1 + r) : 0.5 * old * Math.exp(2 * (r + 0.5)));
        upd = Math.max(upd, Math.abs(c[i] - old) / (old + fl));
      }
    }
    return upd;
  }
  function ddNewton(S) {
    ddAssemble(S);
    const N = S.N, X = TC.blockTri(N, 3, S.L, S.D, S.U, S.R), res = TC.blockTri.res;
    let mx = 0; for (let i = 0; i < N; i++) mx = Math.max(mx, Math.abs(X[3 * i]));
    if (!(mx < 1e10)) return { res, upd: NaN };
    if (S.raw) for (let i = 0; i < N; i++) if (!(S.n[i] - X[3 * i + 1] > 0 && S.p[i] - X[3 * i + 2] > 0)) return { res, upd: NaN };
    const t = S.raw ? 1 : Math.min(1, (S.dmax || 1) / mx);
    const dps = new Float64Array(N), dn = new Float64Array(N), dp = new Float64Array(N);
    for (let i = 0; i < N; i++) { dps[i] = -t * X[3 * i]; dn[i] = -t * X[3 * i + 1]; dp[i] = -t * X[3 * i + 2]; }
    return { res, upd: ddApply(S, dps, dn, dp) };
  }
  /* 거멜: 준페르미 준위를 얼린 포아송 → 전자 연속 → 정공 연속 */
  function ddGummel(S) {
    const N = S.N, a = new Float64Array(N), b = new Float64Array(N), c = new Float64Array(N), d = new Float64Array(N);
    let res = 0, upd = 0;
    const sub = (k, extra) => {
      ddAssemble(S);
      for (let i = 0; i < N; i++) {
        const o = i * 9 + k * 4;
        a[i] = S.L[o]; b[i] = S.D[o] + (extra ? extra(i) : 0); c[i] = S.U[o]; d[i] = -S.R[i * 3 + k];
        res = Math.max(res, Math.abs(d[i]) / (Math.max(Math.abs(a[i]), Math.abs(b[i]), Math.abs(c[i])) || 1));
      }
      return TC.tridiag(a, b, c, d);
    };
    for (let it = 0; it < 3; it++) {
      const dps = sub(0, (i) => (i > 0 && i < N - 1 ? (S.D[i * 9 + 1] * S.n[i] - S.D[i * 9 + 2] * S.p[i]) / S.Vt : 0));
      let m = 0;
      for (let i = 0; i < N; i++) { dps[i] = Math.max(-1, Math.min(1, dps[i])); m = Math.max(m, Math.abs(dps[i])); }
      for (let i = 1; i < N - 1; i++) { const ex = Math.exp(dps[i] / S.Vt); S.n[i] *= ex; S.p[i] /= ex; }
      for (let i = 0; i < N; i++) S.psi[i] += dps[i];
      upd = Math.max(upd, m / S.Vt);
      if (m < 1e-3 * S.Vt) break;
    }
    upd = Math.max(upd, ddApply(S, new Float64Array(N), sub(1), null));
    upd = Math.max(upd, ddApply(S, new Float64Array(N), null, sub(2)));
    return { res, upd };
  }
  function ddPack(S) {
    ddAssemble(S);
    const { N, xn, h, psi, n, p, Vt, bg } = S, ni = S.ni;
    const Jn = Float64Array.from(S.fn, (v) => Q * v), Jp = Float64Array.from(S.fp, (v) => Q * v), Ee = Float64Array.from(h, (hh, e) => -(psi[e + 1] - psi[e]) / hh);
    let Jm = 0, Jerr = 0;
    for (let e = 0; e < N - 1; e++) Jm += (Jn[e] + Jp[e]) / (N - 1);
    for (let e = 0; e < N - 1; e++) Jerr = Math.max(Jerr, Math.abs(Jn[e] + Jp[e] - Jm));
    const c0 = ddJc(S, quiet(S)), ec = Vt * Math.log(TC.Nc(S.T) / ni), ev = Vt * Math.log(TC.Nv(S.T) / ni);
    return {
      x: Array.from(xn), xe: Array.from(h, (_, e) => 0.5 * (xn[e] + xn[e + 1])), psi: Float64Array.from(psi), n: Float64Array.from(n), p: Float64Array.from(p),
      phin: Float64Array.from(psi, (v, i) => v + bg[i] - Vt * Math.log(n[i] / ni)), phip: Float64Array.from(psi, (v, i) => v - bg[i] + Vt * Math.log(p[i] / ni)),
      Jn, Jp, J: c0.J, Jcontact: ddJc(S, 0).J, Jmean: Jm, Jerr: Jerr / (Math.abs(Jm) || 1e-300), Ee,
      E: Float64Array.from(psi, (_, i) => (i === 0 ? Ee[0] : i === N - 1 ? Ee[N - 2] : (Ee[i - 1] * h[i] + Ee[i] * h[i - 1]) / (h[i] + h[i - 1]))),
      R: Float64Array.from(S.Uc), G: Float64Array.from(S.Gc), mun: Float64Array.from(S.mun), mup: Float64Array.from(S.mup),
      Ec: Float64Array.from(psi, (v, i) => -v + ec - bg[i]), Ev: Float64Array.from(psi, (v, i) => -v - ev + bg[i]),
      Va: S.VL - S.VR, VL: S.VL, VR: S.VR, Vdev: psi[0] - S.psiEq[0] - (psi[N - 1] - S.psiEq[1]),
      state: { psi: Float64Array.from(psi), n: Float64Array.from(n), p: Float64Array.from(p), VL: S.VL, VR: S.VR },
    };
  }
  /**
   * 한 걸음씩 도는 1D 드리프트-확산 풀이기. 변수 (ψ, n, p), 샤페터-거멜 전류, 노드마다 3×3 블록 삼중 대각 뉴턴(또는 거멜).
   * o: {x | mesh | L, nodes, net(배열|fn), Ntot(이동도·수명용 총 도핑), T, bgn, mobility:"const"|"ct"|"masetti", mun, mup, field(속도 포화),
   *     tau(s | {n, p, doping, Nref}), Et(eV), recomb:{srh, auger, rad, ii, bbt}, contacts:{left:{V, Rs(Ω·cm²)}, right}, Va(왼쪽 전극), contact:"left"|"right",
   *     method:"newton"|"gummel", tol, maxIter, dmax(전위 갱신 상한 V, 기본 1), raw(감쇠·양수 보호 끔: 발산 시연), init(이전 결과)}
   * → {S, step() → {it, res, upd}, solve() → {ok, iters}, setBias(VL, VR), solveTo(VL, VR, {maxStep, adaptive}) → ok, totalIters, result(), ac(freqs)}
   */
  TC.ddSolver1d = function (o = {}) {
    const S = ddSetup(o), cs = o.contacts || {};
    S.RsL = (cs.left && cs.left.Rs) || 0; S.RsR = (cs.right && cs.right.Rs) || 0; S.dmax = o.dmax; S.raw = !!o.raw;
    if (o.init && o.init.state) { const s = o.init.state; S.psi.set(s.psi); S.n.set(s.n); S.p.set(s.p); S.VL = s.VL; S.VR = s.VR; }
    const tol = o.tol || 1e-9, maxIt = o.maxIter || (o.method === "gummel" ? 400 : 40);
    const sv = {
      S, x: Array.from(S.xn), history: [], it: 0, totalIters: 0,
      setBias(VL, VR = 0) { S.VL = VL; S.VR = VR; },
      step(method = o.method) {
        const r = method === "gummel" ? ddGummel(S) : ddNewton(S);
        sv.it++;
        const rec = { it: sv.it, res: r.res, upd: r.upd };
        sv.history.push(rec);
        return rec;
      },
      solve(method = o.method) {
        sv.history = []; sv.it = 0;
        if (S.rc.ii && !S.dt0) {
          S.rc.ii = false; S.dt0 = true;
          const r0 = sv.solve(method);
          S.rc.ii = true; S.dt0 = false;
          if (!r0.ok) return r0;
        }
        const save = [Float64Array.from(S.psi), Float64Array.from(S.n), Float64Array.from(S.p)];
        for (let k = 0; k < maxIt; k++) {
          const r = sv.step(method);
          if (!(r.upd < 1e30)) break;
          if (r.upd < tol && k > 0) { if (method !== "gummel") sv.step(method); return { ok: true, iters: sv.it }; }
        }
        S.psi.set(save[0]); S.n.set(save[1]); S.p.set(save[2]);
        return { ok: false, iters: sv.it };
      },
      solveTo(VL, VR = 0, opt = {}) {
        const A0 = S.VL, B0 = S.VR, mx = opt.maxStep || 0.5, span = Math.max(Math.abs(VL - A0), Math.abs(VR - B0));
        let t = 0, dt = span > mx ? mx / span : 1, its = 0;
        if (span === 0) { const r = sv.solve(); sv.totalIters = r.iters; return r.ok; }
        while (t < 1 - 1e-12) {
          const t1 = Math.min(1, t + dt);
          sv.setBias(A0 + (VL - A0) * t1, B0 + (VR - B0) * t1);
          const r = sv.solve();
          its += r.iters;
          if (r.ok) { t = t1; if (r.iters < 6) dt = Math.min(dt * 2, mx / span); }
          else { sv.setBias(A0 + (VL - A0) * t, B0 + (VR - B0) * t); dt /= 2; if (opt.adaptive === false || dt * span < 1e-5) { sv.totalIters = its; return false; } }
        }
        sv.totalIters = its;
        return true;
      },
      result() { return Object.assign(ddPack(S), { iters: sv.it, history: sv.history }); },
      ac(freqs) { return ddAC(S, freqs); },
    };
    return sv;
  };
  const biasOf = (o, V) => (o.contact === "right" ? [0, V] : [V, 0]);
  /** 1D 드리프트-확산 정상 상태 한 점: 평형에서 Va(또는 contacts의 V)까지 연속법으로 → {x, psi, n, p, phin, phip, Jn, Jp(구간, A/cm²), J(왼쪽 단자), Jerr(전류 연속 상대 오차), E, Ee, R, G, Ec, Ev, Vdev, iters, ok, state} */
  TC.dd1d = function (o = {}) {
    const t0 = Date.now(), sv = TC.ddSolver1d(o), cs = o.contacts || {};
    const [VL, VR] = cs.left || cs.right ? [(cs.left && cs.left.V) || 0, (cs.right && cs.right.V) || 0] : biasOf(o, o.Va || 0);
    const ok = sv.solveTo(VL, VR);
    return Object.assign(sv.result(), { ok, iters: sv.totalIters, ms: Date.now() - t0 });
  };
  /**
   * 바이어스 스윕(앞 점을 초기값으로, 실패하면 간격을 반으로). o.contact 전극에 biasList(V)를 건다. opt: {keep, adaptive, maxStep, stopOnFail}
   * → {V, J(A/cm²), iters(점마다 뉴턴 반복 합), ok, sols(keep일 때), solver}
   */
  TC.sweep1d = function (o, biasList, opt = {}) {
    const sv = TC.ddSolver1d(o), out = { V: [], J: [], iters: [], ok: [], sols: [], solver: sv };
    for (const V of biasList) {
      const ok = sv.solveTo(...biasOf(o, V), opt), r = ok ? sv.result() : null;
      out.V.push(V); out.ok.push(ok); out.iters.push(sv.totalIters); out.J.push(r ? r.J : NaN);
      if (opt.keep) out.sols.push(r);
      if (!ok && opt.stopOnFail !== false) break;
    }
    return out;
  };
  /**
   * 후진 오일러 과도 해석(왼쪽 전극 = 전원 Vs + 직렬 저항 Rs). tr: {Vs: fn(t) | 숫자(t > 0), V0(t = 0 전압), times:[s] | {tEnd, steps}, Rs(Ω·cm²), every(스냅숏 간격)}
   * t = 0의 정상 상태에서 시작 → {t, J(변위 포함 단자 전류 A/cm²), Vs, Vd(소자 전압), iters, snaps:[{t, n, p, psi}], ok}
   */
  TC.dd1dTransient = function (o, tr = {}) {
    const Vs = typeof tr.Vs === "function" ? tr.Vs : (t) => (t > 0 ? tr.Vs : tr.V0 || 0);
    const sv = TC.ddSolver1d(Object.assign({}, o, { contacts: { left: { V: 0, Rs: tr.Rs || 0 } } })), S = sv.S;
    const times = isArr(tr.times) ? tr.times : TC.linspace(0, tr.tEnd || 1e-6, (tr.steps || 100) + 1);
    const out = { t: [], J: [], Vs: [], Vd: [], iters: [], snaps: [], ok: true };
    sv.solveTo(Vs(times[0]), 0);
    const rec = (t, it) => {
      const r = ddPack(S);
      out.t.push(t); out.J.push(r.J); out.Vs.push(S.VL); out.Vd.push(r.Vdev); out.iters.push(it);
      if (tr.every && (out.t.length - 1) % tr.every === 0) out.snaps.push({ t, n: r.n, p: r.p, psi: r.psi });
    };
    rec(times[0], sv.totalIters);
    const advance = (t0, t1, depth) => {
      S.nold = Float64Array.from(S.n); S.pold = Float64Array.from(S.p);
      S.Eold = Float64Array.from(S.h, (hh, e) => -(S.psi[e + 1] - S.psi[e]) / hh);
      S.dt = t1 - t0; sv.setBias(Vs(t1), 0);
      const r = sv.solve("newton");
      if (r.ok) return r.iters;
      if (depth > 8) return -1;
      const tm = 0.5 * (t0 + t1), a = advance(t0, tm, depth + 1);
      if (a < 0) return -1;
      const b = advance(tm, t1, depth + 1);
      return b < 0 ? -1 : a + b;
    };
    for (let k = 1; k < times.length; k++) {
      const it = advance(times[k - 1], times[k], 0);
      if (it < 0) { out.ok = false; break; }
      rec(times[k], it);
    }
    S.dt = Infinity;
    return out;
  };
  /* 소신호 AC: (J − jωM)δu = −∂F/∂V·δV 를 6×6 실수 블록으로 */
  function ddAC(S, freqs) {
    S.dt = Infinity;
    ddAssemble(S);
    const N = S.N, L0 = Float64Array.from(S.L), D0 = Float64Array.from(S.D), U0 = Float64Array.from(S.U), c0 = ddJc(S, 0);
    return freqs.map((f) => {
      const w = 2 * Math.PI * f, L = new Float64Array(N * 36), D = new Float64Array(N * 36), U = new Float64Array(N * 36), R = new Float64Array(N * 6);
      for (let i = 0; i < N; i++) for (let a = 0; a < 3; a++) for (let b = 0; b < 3; b++) {
        const s = i * 9 + a * 3 + b, o = i * 36;
        for (const [blk, src] of [[L, L0], [D, D0], [U, U0]]) { blk[o + a * 6 + b] = src[s]; blk[o + (a + 3) * 6 + b + 3] = src[s]; }
        if (a === b && a > 0 && i > 0 && i < N - 1) { D[o + a * 6 + b + 3] = w * S.dx[i]; D[o + (a + 3) * 6 + b] = -w * S.dx[i]; }
      }
      R[0] = 1;
      const X = TC.blockTri(N, 6, L, D, U, R), re = (k, c) => X[k * 6 + c], im = (k, c) => X[k * 6 + 3 + c];
      const dJ = (g) => c0.d0 * g(0, 0) + c0.d1 * g(1, 0) + c0.n0 * g(0, 1) + c0.n1 * g(1, 1) + c0.p0 * g(0, 2) + c0.p1 * g(1, 2);
      const dE = (g) => -(g(1, 0) - g(0, 0)) / S.h[0];
      const Yr = dJ(re) - w * S.er * dE(im), Yi = dJ(im) + w * S.er * dE(re);
      return { f, G: Yr, C: Yi / w, Y: [Yr, Yi] };
    });
  }
  /** 소신호 어드미턴스(왼쪽 전극): 바이어스 V에서 freqs(Hz) → [{f, G(S/cm²), C(F/cm²)}] */
  TC.ac1d = function (o, V, freqs = [1e3]) { const sv = TC.ddSolver1d(o); sv.solveTo(...biasOf(o, V)); return sv.ac(freqs); };

  /* ------------------------------------------------------------ 다이오드 */
  const erf = (x) => { const t = 1 / (1 + 0.3275911 * Math.abs(x)), y = 1 - ((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-x * x); return x >= 0 ? y : -y; };
  /**
   * 1D 다이오드 구조 → dd1d 옵션. 왼쪽이 양극(p). o: {kind:"pn"|"np"|"pin"|"nnn", Na, Nd, length(nm), xj(nm), profile:"abrupt"|"linear"|"erfc", grad(nm),
   *   Li(nm, pin의 i층·nnn의 n층 폭), Nlow, hj(접합 격자 nm), hc(접점 격자 nm)}. 나머지 키(tau, recomb, …)는 그대로 넘긴다
   */
  TC.diode1d = function (o = {}) {
    const kind = o.kind || "pn", L = o.length || 2000, xj = o.xj != null ? o.xj : L / 2, Na = o.Na || 1e17, Nd = o.Nd || 1e17, g = o.grad || 20;
    const LD = Math.sqrt((11.7 * EPS0 * TC.vt()) / (Q * Math.max(Na, Nd))) / NM;
    const hj = o.hj || Math.max(0.2, Math.min(2, LD / 2)), hc = o.hc || Math.max(5, L / 60), w = Math.min(xj, L - xj);
    let net, xs;
    if (kind === "pin" || kind === "nnn") {
      const Li = o.Li || L / 3, a = xj - Li / 2, b = xj + Li / 2, lo = o.Nlow || (kind === "pin" ? 1e13 : 1e16);
      const s = Math.min(Li / 4, a / 2, (L - b) / 2, 40 * hj), hm = Math.max(hj, s / 8), hi = Math.max(hm, Li / 40);
      net = kind === "pin" ? (x) => (x < a ? -Na : x > b ? Nd : -lo) : (x) => (x < a || x > b ? Nd : lo);
      xs = TC.mesh1d([[0, hc], [a - s, hm], [a, hj], [a + s, hm], [xj, hi], [b - s, hm], [b, hj], [b + s, hm], [L, hc]]);
    } else {
      const s = kind === "np" ? -1 : 1, prof = o.profile || "abrupt";
      const f = prof === "linear" ? (x) => Math.max(-1, Math.min(1, (x - xj) / g)) : prof === "erfc" ? (x) => erf((x - xj) / g) : (x) => (x < xj ? -1 : 1);
      net = (x) => { const u = f(x); return s * (u < 0 ? u * Na : u * Nd); };
      const span = Math.min(w * 0.9, Math.max(40 * hj, prof === "abrupt" ? 30 : 2 * g)), hm = Math.max(hj, Math.min(hc, span / 8));
      xs = TC.mesh1d([[0, hc], [xj - span, hm], [xj, hj], [xj + span, hm], [L, hc]]);
    }
    const out = Object.assign({}, o, { x: xs, net, meta: { kind, xj, Na, Nd, L } });
    delete out.kind; delete out.length;
    return out;
  };
  /** 계단 접합 공핍 근사: {Na, Nd, Va, T} → {Vbi(V), W, xn, xp(nm), Emax(V/cm), Cj(F/cm²), Wc(2kT/q 보정 W, nm)} */
  TC.abrupt = function ({ Na = 1e17, Nd = 1e17, Va = 0, T = 300 } = {}) {
    const es = 11.7 * EPS0, Vbi = TC.vbi(Na, Nd, T), V = Math.max(Vbi - Va, 1e-6), f = 1 / Na + 1 / Nd;
    const W = Math.sqrt((2 * es * V * f) / Q), Wc = Math.sqrt((2 * es * Math.max(V - 2 * TC.vt(T), 1e-6) * f) / Q);
    const xn = (W * Na) / (Na + Nd), xp = (W * Nd) / (Na + Nd);
    return { Vbi, W: W / NM, xn: xn / NM, xp: xp / NM, Emax: (Q * Nd * xn) / es, Cj: es / W, Wc: Wc / NM };
  };
  /** 쇼클리 포화 전류(유한 폭 중성 영역 + 오믹 접점, coth 식): {Na, Nd, wp, wn(중성 폭 nm), taun, taup, T, mobility} → {J0(A/cm²), Ln, Lp(µm), Dn, Dp, Jgen(Wnm, τ) 공핍 생성 전류} */
  TC.shockley = function ({ Na = 1e17, Nd = 1e17, wp = 1e4, wn = 1e4, taun = 1e-7, taup = 1e-7, T = 300, mobility = "ct" } = {}) {
    const mf = mobility === "masetti" ? TC.mobMasetti : TC.mobCT, ni = TC.ni(T);
    const Dn = TC.einstein(mf(Na, "n", T), T), Dp = TC.einstein(mf(Nd, "p", T), T), Ln = Math.sqrt(Dn * taun), Lp = Math.sqrt(Dp * taup);
    const coth = (z) => 1 / Math.tanh(z);
    const J0 = Q * ni * ni * ((Dn / (Ln * Na)) * coth((wp * NM) / Ln) + (Dp / (Lp * Nd)) * coth((wn * NM) / Lp));
    return { J0, Ln: Ln * 1e4, Lp: Lp * 1e4, Dn, Dp, Jgen: (Wnm, tau = Math.sqrt(taun * taup)) => (Q * ni * Wnm * NM) / (2 * tau) };
  };
  /** 이상 계수 n(V) = (1/Vt)·dV/d ln J (중앙 차분) */
  TC.ideality = function (V, J, T = 300) {
    const n = V.length;
    return V.map((_, i) => { const a = Math.max(0, i - 1), b = Math.min(n - 1, i + 1); return (V[b] - V[a]) / (TC.vt(T) * Math.log(Math.abs(J[b]) / Math.abs(J[a]))); });
  };
  /**
   * 충돌 이온화 적분(van Overstraeten). x(nm), E(V/cm, 같은 길이). 정공은 E 방향, 전자는 반대로 움직인다.
   * → {Ip(정공 주입), In(전자 주입): 1이 되면 항복, Mp, Mn(증배 계수), intAn, intAp(∫α dx)}
   */
  TC.ionIntegral = function (x, E, opt = {}) {
    const T = opt.T || 300, N = x.length;
    let s = 0; for (let i = 1; i < N; i++) s += (E[i] + E[i - 1]) * (x[i] - x[i - 1]);
    const ord = [...Array(N).keys()]; if (s < 0) ord.reverse();
    const xs = ord.map((i) => Math.abs(x[i] - x[ord[0]]) * NM), an = ord.map((i) => TC.alphaII(E[i], "n", T)), ap = ord.map((i) => TC.alphaII(E[i], "p", T));
    const cum = new Float64Array(N);
    for (let i = 1; i < N; i++) cum[i] = cum[i - 1] + 0.5 * (ap[i] - an[i] + ap[i - 1] - an[i - 1]) * (xs[i] - xs[i - 1]);
    const tot = cum[N - 1];
    const Ip = TC.trapz(xs, ap.map((a, i) => a * Math.exp(-cum[i]))), In = TC.trapz(xs, an.map((a, i) => a * Math.exp(tot - cum[i])));
    return { Ip, In, Mp: 1 / Math.max(1 - Ip, 1e-12), Mn: 1 / Math.max(1 - In, 1e-12), intAn: TC.trapz(xs, an), intAp: TC.trapz(xs, ap) };
  };
  /** 이온화 적분으로 항복 전압 찾기: 역바이어스 DD 스윕(충돌 이온화 끔)의 전계로 I(V) = 1 교차를 보간. opt: {Vmax(음수), dV} → {BV(V), V, I} */
  TC.bvIonization = function (o, opt = {}) {
    const sv = TC.ddSolver1d(Object.assign({}, o, { recomb: Object.assign({}, o.recomb, { ii: false }) })), Vmax = opt.Vmax || -60, dV = opt.dV || -1;
    const out = { V: [], I: [], BV: NaN };
    for (let V = dV; V >= Vmax - 1e-9; V += dV) {
      if (!sv.solveTo(...biasOf(o, V))) break;
      const r = sv.result(), ii = TC.ionIntegral(r.x, r.E, o), I = Math.max(ii.Ip, ii.In), k = out.I.length;
      out.V.push(V); out.I.push(I);
      if (I >= 1) { out.BV = k ? out.V[k - 1] + ((1 - out.I[k - 1]) * (V - out.V[k - 1])) / (I - out.I[k - 1]) : V; break; }
    }
    return out;
  };


  /* ------------------------------------------------------------ 수송: 몬테카를로·에너지 균형·탄도·NEGF·열 */
  const trRng = function (seed = 12345) {
    let a = seed >>> 0;
    return () => {
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  };

  const TR_PH = [
    [0.012, 0.5e8, 1], [0.0185, 0.8e8, 1], [0.062, 11e8, 1],
    [0.019, 0.3e8, 4], [0.0474, 2e8, 4], [0.059, 2e8, 4],
  ];
  const trMcCache = {};
  function trMcTable(T) {
    if (trMcCache[T]) return trMcCache[T];
    const q = TC.q, hb = TC.hbar, md = 0.32 * TC.m0, al = 0.5, kT = TC.kB * T * q;
    const rho = 2329, u = 9e5 * 1e-2, Xi = 9 * q, nE = 1000, Emax = 2.5, de = Emax / nE;
    const gJ = (e) => (e > 0 ? e * (1 + al * e) * q : 0);
    const Cac = (Math.SQRT2 * Math.pow(md, 1.5) * kT * Xi * Xi) / (Math.PI * Math.pow(hb, 4) * rho * u * u);
    const procs = [[0, 0]];
    TR_PH.forEach(([hw, DK, Z]) => {
      const w = (hw * q) / hb, Nq = 1 / Math.expm1((hw * q) / kT), D = DK * 100 * q;
      const C = (Z * Math.pow(md, 1.5) * D * D) / (Math.SQRT2 * Math.PI * rho * hb * hb * hb * w);
      procs.push([hw, C * Nq], [-hw, C * (Nq + 1)]);
    });
    const np = procs.length, rate = new Float64Array(nE * np);
    let G = 0;
    for (let i = 0; i < nE; i++) {
      const e = (i + 0.5) * de;
      let s = 0;
      for (let j = 0; j < np; j++) {
        const ef = e + procs[j][0];
        const r = j === 0 ? Cac * Math.sqrt(gJ(e)) * (1 + 2 * al * e) : ef > 0 ? procs[j][1] * Math.sqrt(gJ(ef)) * (1 + 2 * al * ef) : 0;
        s += r; rate[i * np + j] = s;
      }
      G = Math.max(G, s);
    }
    G *= 1.02;
    for (let i = 0; i < rate.length; i++) rate[i] /= G;
    return (trMcCache[T] = { rate, np, de, nE, G, dE: procs.map((p) => p[0]), al });
  }

  /** 벌크 Si 전자 앙상블 몬테카를로(비포물선 단일 밸리, 음향·밸리 간 포논). E: V/cm(상수 또는 t(s) 함수), 전계가 전자를 +x로 민다고 본 드리프트 속도(양수).
   *  opts {E, T=300, n=2000, steps=300, dt=5e-15, seed, Eprev=0, warmup} → {t, v (cm/s), energy (eV), vSteady, eSteady, G (1/s)} */
  TC.mcBulk = function (o = {}) {
    const T = o.T || 300, n = o.n || 2000, steps = o.steps || 300, dt = o.dt || 5e-15, rng = trRng(o.seed ?? 12345);
    const tb = trMcTable(T), { rate, np, de, nE, G, dE, al } = tb;
    const q = TC.q, hb = TC.hbar, mc = 0.26 * TC.m0, kq = (2 * mc * q) / (hb * hb), ek = (hb * hb) / (2 * mc * q);
    const Ef = typeof o.E === "function" ? o.E : () => o.E || 0;
    const Ep = o.Eprev || 0, nw = o.warmup ?? (Ep ? 300 : 40);
    const kx = new Float64Array(n), ky = new Float64Array(n), kz = new Float64Array(n), ts = new Float64Array(n);
    const sk = Math.sqrt((mc * TC.kB * T * q) / (hb * hb));
    const gauss = () => Math.sqrt(-2 * Math.log(1 - rng())) * Math.cos(2 * Math.PI * rng());
    const flight = () => -Math.log(1 - rng()) / G;
    for (let p = 0; p < n; p++) { kx[p] = sk * gauss(); ky[p] = sk * gauss(); kz[p] = sk * gauss(); ts[p] = flight(); }
    const eps = (g) => (2 * g) / (1 + Math.sqrt(1 + 4 * al * g));
    const isoK = (p, k) => {
      const c = 1 - 2 * rng(), s = Math.sqrt(1 - c * c), f = 2 * Math.PI * rng();
      kx[p] = k * c; ky[p] = k * s * Math.cos(f); kz[p] = k * s * Math.sin(f);
    };
    const scatter = (p) => {
      const e = eps(ek * (kx[p] * kx[p] + ky[p] * ky[p] + kz[p] * kz[p]));
      const b = Math.min(nE - 1, Math.floor(e / de)) * np, r = rng();
      for (let j = 0; j < np; j++) {
        if (r < rate[b + j]) {
          const e2 = e + dE[j];
          if (e2 <= 0) return;
          isoK(p, Math.sqrt(kq * e2 * (1 + al * e2)));
          return;
        }
      }
    };
    const advance = (E) => {
      const F = (q * E * 100) / hb;
      for (let p = 0; p < n; p++) {
        let tl = dt;
        while (ts[p] < tl) { kx[p] += F * ts[p]; tl -= ts[p]; scatter(p); ts[p] = flight(); }
        kx[p] += F * tl; ts[p] -= tl;
      }
    };
    const sample = () => {
      let sv = 0, se = 0;
      for (let p = 0; p < n; p++) {
        const e = eps(ek * (kx[p] * kx[p] + ky[p] * ky[p] + kz[p] * kz[p]));
        sv += (hb * kx[p]) / (mc * (1 + 2 * al * e)); se += e;
      }
      return [(sv / n) * 100, se / n];
    };
    for (let s = 0; s < nw; s++) advance(Ep);
    const t = [0], v = [], energy = [];
    let s0 = sample(); v.push(s0[0]); energy.push(s0[1]);
    for (let s = 0; s < steps; s++) {
      advance(Ef(s * dt + 0.5 * dt));
      s0 = sample(); t.push((s + 1) * dt); v.push(s0[0]); energy.push(s0[1]);
    }
    const h = Math.floor(steps / 2);
    let vs = 0, es = 0;
    for (let i = h + 1; i <= steps; i++) { vs += v[i]; es += energy[i]; }
    return { t, v, energy, vSteady: vs / (steps - h), eSteady: es / (steps - h), G };
  };
  /** 속도-전계 곡선: Elist(V/cm) → [{E, v (cm/s), energy (eV)}]. opts는 mcBulk와 같다 */
  TC.mcVelocityField = (Elist, o = {}) =>
    Elist.map((E, i) => { const r = TC.mcBulk({ ...o, E, Eprev: E, warmup: o.warmup ?? 100, seed: (o.seed ?? 12345) + i }); return { E, v: r.vSteady, energy: r.eSteady }; });

  /** 1D n⁺–n–n⁺ 구조의 정상 상태: 에너지 균형(model "eb", Baccarani-Wordeman 이동도) 또는 표동-확산("dd", Canali). 길이 nm, 농도 cm⁻³.
   *  {Nplus=5e17, Nminus=2e15, Lch=400, Lc=200, Va=1, T=300, tauW=0.4e-12, model="eb", nodes=401} → {x, psi, n, Tn (K), v (cm/s), E (V/cm), J (A/cm²), N, iters, converged} */
  TC.hydro1d = function (o = {}) {
    const TL = o.T || 300, Np = o.Nplus || 5e17, Nm = o.Nminus || 2e15, Lch = o.Lch ?? 400, Lc = o.Lc ?? 200;
    const Va = o.Va ?? 1, tw = o.tauW || 0.4e-12, eb = (o.model || "eb") === "eb", nn = o.nodes || 401;
    const q = TC.q, kq = TC.kB, vt = TC.vt(TL), ni = TC.ni(TL), es = 11.7 * TC.eps0, vs = TC.vsat("n", TL);
    const x = TC.linspace(0, Lch + 2 * Lc, nn), h = (x[1] - x[0]) * TC.NM, h2 = h * h, M = nn - 1;
    const N = x.map((xi) => (xi < Lc - 1e-9 || xi > Lc + Lch + 1e-9 ? Np : Nm));
    const mu0 = N.map((d) => TC.mobCT(d, "n", TL)), mu0e = new Float64Array(M);
    for (let i = 0; i < M; i++) mu0e[i] = 0.5 * (mu0[i] + mu0[i + 1]);
    const psi = Float64Array.from(N, (d) => vt * Math.log(d / ni)), n = Float64Array.from(N), Tn = new Float64Array(nn).fill(TL);
    const mu = new Float64Array(M), Je = new Float64Array(M);
    const a = new Float64Array(nn), b = new Float64Array(nn), c = new Float64Array(nn), d = new Float64Array(nn);
    const B = TC.bern, psiL = psi[0], psiR = psi[M];
    const edgeJ = () => {
      for (let i = 0; i < M; i++) {
        const V1 = kq * Tn[i], V2 = kq * Tn[i + 1], xa = (psi[i + 1] - psi[i]) / (0.5 * (V1 + V2));
        Je[i] = ((q * mu[i]) / h) * (V2 * n[i + 1] * B(xa) - V1 * n[i] * B(-xa));
      }
    };
    const mobility = () => {
      for (let i = 0; i < M; i++) {
        if (eb) mu[i] = mu0e[i] / (1 + (1.5 * mu0e[i] * kq * Math.max(0.5 * (Tn[i] + Tn[i + 1]) - TL, 0)) / (tw * vs * vs));
        else mu[i] = TC.mobField(mu0e[i], (psi[i + 1] - psi[i]) / h, "n", TL);
      }
    };
    const dir = (i, v) => { a[i] = 0; c[i] = 0; b[i] = 1; d[i] = v; };
    let iters = 0, converged = true;
    const solveBias = (V) => {
      psi[0] = psiL; psi[M] = psiR + V;
      for (let it = 0; ; it++) {
        iters++;
        let dpsi = 0;
        const n0 = Float64Array.from(n), p0 = Float64Array.from(psi);
        for (let k = 0; k < 30; k++) {
          dir(0, 0); dir(M, 0);
          for (let i = 1; i < M; i++) {
            const Vn = kq * Tn[i], ne = n0[i] * Math.exp(Math.min((psi[i] - p0[i]) / Vn, 80));
            a[i] = es / h2; c[i] = es / h2; b[i] = (-2 * es) / h2 - (q * ne) / Vn;
            d[i] = -(es * (psi[i + 1] - 2 * psi[i] + psi[i - 1])) / h2 - q * (N[i] - ne);
          }
          const dl = TC.tridiag(a, b, c, d);
          let mx = 0;
          for (let i = 1; i < M; i++) {
            let s = dl[i];
            if (Math.abs(s) > vt) s = Math.sign(s) * vt * (1 + Math.log(Math.abs(s) / vt));
            psi[i] += s; mx = Math.max(mx, Math.abs(s));
          }
          if (mx < 1e-10) break;
        }
        for (let i = 1; i < M; i++) dpsi = Math.max(dpsi, Math.abs(psi[i] - p0[i]));
        mobility();
        dir(0, N[0]); dir(M, N[M]);
        for (let i = 1; i < M; i++) {
          const Vm = kq * Tn[i - 1], V0 = kq * Tn[i], Vp = kq * Tn[i + 1];
          const xp = (psi[i + 1] - psi[i]) / (0.5 * (V0 + Vp)), xm = (psi[i] - psi[i - 1]) / (0.5 * (Vm + V0));
          c[i] = mu[i] * Vp * B(xp); a[i] = mu[i - 1] * Vm * B(-xm);
          b[i] = -mu[i] * V0 * B(-xp) - mu[i - 1] * V0 * B(xm); d[i] = 0;
        }
        const nNew = TC.tridiag(a, b, c, d);
        let dn = 0;
        for (let i = 1; i < M; i++) { const v = Math.max(nNew[i], 1); dn = Math.max(dn, Math.abs(v - n[i]) / v); n[i] = v; }
        let dT = 0;
        if (eb) {
          edgeJ();
          dir(0, TL); dir(M, TL);
          for (let i = 1; i < M; i++) {
            const kp = 2.5 * q * kq * kq * mu[i] * 0.5 * (n[i] + n[i + 1]) * 0.5 * (Tn[i] + Tn[i + 1]);
            const km = 2.5 * q * kq * kq * mu[i - 1] * 0.5 * (n[i] + n[i - 1]) * 0.5 * (Tn[i] + Tn[i - 1]);
            const pp = (-2.5 * kq * Je[i] * h) / kp, pm = (-2.5 * kq * Je[i - 1] * h) / km;
            const R = (1.5 * n[i] * q * kq) / tw;
            const P = -0.5 * (Je[i] * (psi[i + 1] - psi[i]) + Je[i - 1] * (psi[i] - psi[i - 1])) / h;
            b[i] = (kp * B(-pp) + km * B(pm)) / h2 + R; c[i] = (-kp * B(pp)) / h2; a[i] = (-km * B(-pm)) / h2;
            d[i] = P + R * TL;
          }
          const Tnew = TC.tridiag(a, b, c, d);
          for (let i = 1; i < M; i++) {
            const v = Math.max(0.5 * TL, Tn[i] + 0.7 * (Tnew[i] - Tn[i]));
            dT = Math.max(dT, Math.abs(v - Tn[i])); Tn[i] = v;
          }
        }
        if (dpsi < 1e-7 && dn < 1e-6 && dT < 1e-3) break;
        if (it === 399) { converged = false; break; }
      }
    };
    const nst = Math.max(1, Math.ceil(Math.abs(Va) / (o.dV || 0.1)));
    for (let s = 0; s <= nst; s++) solveBias((Va * s) / nst);
    mobility(); edgeJ();
    let J = 0;
    for (let i = 0; i < M; i++) J += Je[i] / M;
    const v = x.map((_, i) => -(i === 0 ? Je[0] : i === M ? Je[M - 1] : 0.5 * (Je[i] + Je[i - 1])) / (q * n[i]));
    const E = x.map((_, i) => -(psi[Math.min(i + 1, M)] - psi[Math.max(i - 1, 0)]) / (h * (i === 0 || i === M ? 1 : 2)));
    return { x, psi: Array.from(psi), n: Array.from(n), Tn: Array.from(Tn), v, E, J, N, iters, converged };
  };

  const trLn1pe = (x) => (x > 35 ? x : Math.log1p(Math.exp(x)));
  /** 탄도 MOSFET(Natori / Rahman–Lundstrom 장벽 꼭대기 모델, (100) Si 2D 부띠, 페르미-디랙).
   *  {Vg=1, Vd=1, T=300, Vt=0.3, Cox | EOT=1.2 nm, n=1.2(αG=1/n), dibl=0, mt=0.19, ml=0.916, valleys "2f"|"all", dE4=0.1 eV, m, gv=2}
   *  → {I (A/µm), N (cm⁻², 장벽 꼭대기), vinj (cm/s = I/qN), vT (+k 주입 속도), Ef_minus_Ec (eV), etaS} */
  TC.ballistic = function (o = {}) {
    const T = o.T || 300, kT = TC.kB * T, Vg = o.Vg ?? 1, Vd = o.Vd ?? 1, Vt = o.Vt ?? 0.3;
    const q = TC.q, hb = TC.hbar, m0 = TC.m0;
    const Cox = o.Cox || (3.9 * TC.eps0) / ((o.EOT || 1.2) * TC.NM), aG = 1 / (o.n || 1.2), Cs = Cox / aG, aD = o.dibl || 0;
    const mt = o.mt || 0.19, ml = o.ml || 0.916;
    const vl = o.m ? [[o.m, o.m, o.gv || 2, 0]] : o.valleys === "all"
      ? [[mt, mt, 2, 0], [ml, mt, 2, o.dE4 ?? 0.1], [mt, ml, 2, o.dE4 ?? 0.1]] : [[mt, mt, 2, 0]];
    const V = vl.map(([mx, my, g, dE]) => ({
      dE, N2: (g * Math.sqrt(mx * my) * m0 * kT * q) / (Math.PI * hb * hb) * 1e-4,
      F: (g * Math.sqrt(2 * my * m0) * Math.pow(kT * q, 1.5)) / (2 * Math.pow(Math.PI, 1.5) * hb * hb) * 1e-2,
    }));
    const charge = (Ec) => V.reduce((s, v) => s + 0.5 * v.N2 * (trLn1pe((-Ec - v.dE) / kT) + trLn1pe((-Vd - Ec - v.dE) / kT)), 0);
    const UL = -aG * (Vg - Vt) - aD * Vd;
    const Ec = TC.bisect((e) => e - UL - (q * charge(e)) / Cs, UL - 1e-9, UL + (q * charge(UL)) / Cs + 1e-9, 1e-12);
    const N = charge(Ec);
    let Fp = 0, Fn = 0, np = 0;
    V.forEach((v) => {
      const es = (-Ec - v.dE) / kT;
      Fp += v.F * TC.fd12(es); Fn += v.F * TC.fd12(es - Vd / kT); np += 0.5 * v.N2 * trLn1pe(es);
    });
    const I = q * (Fp - Fn);
    return { I: I * 1e-4, N, vinj: N > 0 ? I / (q * N) : 0, vT: Fp / np, Ef_minus_Ec: -Ec, etaS: -Ec / kT };
  };
  /** 탄도 MOSFET I–V 표: → {Vg, Vd, I: I[iVg][iVd] (A/µm)} */
  TC.ballisticIV = (o, VgList, VdList) => ({
    Vg: VgList, Vd: VdList, I: VgList.map((Vg) => VdList.map((Vd) => TC.ballistic({ ...o, Vg, Vd }).I)),
  });

  /** 1D 퍼텐셜 장벽 생성(셀 평균 퍼텐셜로 경계 절반 가중). {kind "single"|"double", height=0.3 eV, width=2 nm, well=5 nm, lead=10 nm, L, dx=0.1 nm} → {x (nm), U (eV)} */
  TC.barrier1d = function (o = {}) {
    const H = o.height ?? 0.3, w = o.width ?? 2, wl = o.well ?? 5, dx = o.dx || 0.1, dbl = o.kind === "double";
    const core = dbl ? 2 * w + wl : w, L = o.L || core + 2 * (o.lead ?? 10), x0 = 0.5 * (L - core);
    const segs = dbl ? [[x0, x0 + w], [x0 + w + wl, x0 + 2 * w + wl]] : [[x0, x0 + w]];
    const n = Math.round(L / dx) + 1, x = TC.linspace(0, L, n);
    const U = x.map((xi) => segs.reduce((s, [p, r]) => s + Math.max(0, Math.min(xi + dx / 2, r) - Math.max(xi - dx / 2, p)), 0) * (H / dx));
    return { x, U };
  };
  /** 1D 유효 질량 강결합 NEGF 투과율: T(E) = Γ1Γ2|G1N|². {x (nm 배열) | {L, dx}, U (eV 배열 | x(nm)→eV), m=0.067, E (eV 배열 | {e0, e1, n}), eta=1e-6} → {E, T} */
  TC.transmission1d = function (o = {}) {
    const x = Array.isArray(o.x) ? o.x : TC.linspace(0, (o.x || {}).L || 20, Math.round(((o.x || {}).L || 20) / ((o.x || {}).dx || 0.1)) + 1);
    const N = x.length, a = (x[1] - x[0]) * 1e-9, m = (o.m || 0.067) * TC.m0, eta = o.eta ?? 1e-6;
    const U = typeof o.U === "function" ? x.map(o.U) : o.U || x.map(() => 0);
    const t0 = (TC.hbar * TC.hbar) / (2 * m * a * a * TC.q);
    const Eg = o.E || { e0: 0.005, e1: 1, n: 200 }, E = Array.isArray(Eg) ? Eg : TC.linspace(Eg.e0, Eg.e1, Eg.n);
    const lead = (e, u) => {
      const c = 1 - (e - u) / (2 * t0);
      if (Math.abs(c) <= 1) return [c, Math.sqrt(1 - c * c)];
      return [c > 0 ? c - Math.sqrt(c * c - 1) : c + Math.sqrt(c * c - 1), 0];
    };
    const T = E.map((e) => {
      const [c1, s1] = lead(e, U[0]), [c2, s2] = lead(e, U[N - 1]);
      if (s1 <= 0 || s2 <= 0) return 0;
      let gr = e - 2 * t0 - U[0] + t0 * c1, gi = eta + t0 * s1, d = gr * gr + gi * gi;
      gr /= d; gi = -gi / d;
      let Gr = gr, Gi = gi;
      for (let i = 1; i < N; i++) {
        let dr = e - 2 * t0 - U[i] - t0 * t0 * gr, di = eta - t0 * t0 * gi;
        if (i === N - 1) { dr += t0 * c2; di += t0 * s2; }
        d = dr * dr + di * di; gr = dr / d; gi = -di / d;
        const r = -t0 * (Gr * gr - Gi * gi), im = -t0 * (Gr * gi + Gi * gr);
        Gr = r; Gi = im;
      }
      return Math.min(1, 4 * t0 * t0 * s1 * s2 * (Gr * Gr + Gi * Gi));
    });
    return { E, T, t0 };
  };

  /** 1D 열전도(유한 체적): 정상 상태(삼중 대각) 또는 후진 오일러 과도. x nm, k W/cm·K, C J/cm³·K, Q W/cm³, bc {type "T"|"flux"(q W/cm², 유입 +)|"conv"(h, T)}.
   *  {x | {L, n}, k=1.5, C=1.63, Q, bc, T0=300, transient {dt, steps, every}} → {x, T (K), Tmax, t?, Thist?, TmaxHist?} */
  TC.heat1d = function (o = {}) {
    const x = Array.isArray(o.x) ? o.x : TC.linspace(0, (o.x || {}).L || 1000, (o.x || {}).n || 101);
    const n = x.length, T0 = o.T0 ?? 300, xc = x.map((v) => v * TC.NM);
    const arr = (v, def) => (Array.isArray(v) || ArrayBuffer.isView(v) ? v : typeof v === "function" ? x.map(v) : x.map(() => v ?? def));
    const k = arr(o.k, 1.5), C = arr(o.C, 1.63), Q = arr(o.Q, 0);
    const bc = o.bc || {}, bL = bc.left || { type: "T", T: T0 }, bR = bc.right || { type: "T", T: T0 };
    const vol = xc.map((_, i) => 0.5 * ((i > 0 ? xc[i] - xc[i - 1] : 0) + (i < n - 1 ? xc[i + 1] - xc[i] : 0)));
    const ge = new Float64Array(n - 1);
    for (let i = 0; i < n - 1; i++) ge[i] = (2 * k[i] * k[i + 1]) / (k[i] + k[i + 1]) / (xc[i + 1] - xc[i]);
    const a = new Float64Array(n), b = new Float64Array(n), c = new Float64Array(n), d = new Float64Array(n);
    const build = (Told, dt) => {
      for (let i = 0; i < n; i++) {
        const gl = i > 0 ? ge[i - 1] : 0, gr = i < n - 1 ? ge[i] : 0, m = dt ? (C[i] * vol[i]) / dt : 0;
        a[i] = -gl; c[i] = -gr; b[i] = gl + gr + m; d[i] = Q[i] * vol[i] + (dt ? m * Told[i] : 0);
      }
      [[0, bL], [n - 1, bR]].forEach(([i, s]) => {
        const t = s.type || "T";
        if (t === "T") { a[i] = 0; c[i] = 0; b[i] = 1; d[i] = s.T ?? T0; }
        else if (t === "flux") d[i] += s.q || 0;
        else { b[i] += s.h || 0; d[i] += (s.h || 0) * (s.T ?? T0); }
      });
      return TC.tridiag(a, b, c, d);
    };
    const tr = o.transient;
    if (!tr) { const T = Array.from(build()); return { x, T, Tmax: TC.minmax(T)[1] }; }
    const dt = tr.dt || 1e-10, steps = tr.steps || 100, ev = tr.every || Math.max(1, Math.ceil(steps / 200));
    let T = x.map(() => T0);
    const t = [0], Thist = [T.slice()], TmaxHist = [TC.minmax(T)[1]];
    for (let s = 1; s <= steps; s++) {
      T = Array.from(build(T, dt));
      if (s % ev === 0 || s === steps) { t.push(s * dt); Thist.push(T); TmaxHist.push(TC.minmax(T)[1]); }
    }
    return { x, T, Tmax: TC.minmax(T)[1], t, Thist, TmaxHist };
  };
})();
