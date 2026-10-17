/* Copyright (c) 2026 geniuskey and TCADBook contributors.
   Executable code: MIT (see ../LICENSE-MIT).
   Educational content and illustrations: CC-BY-4.0 (see ../LICENSE.md). */
/* ==========================================================================
   TCADBook 2D 소자 엔진 — TC에 붙는다 (tcad.js 다음에 로드)
   - TN-45 타깃: 치수·해석적 도핑·구조 영역·격자
   - 텐서곱 비균일 격자 + 박스 적분(유한 체적), 샤페터-거멜 전류
   - 비선형 포아송(뉴턴), 드리프트-확산(결합 뉴턴 / 거멜), 바이어스 연속법·스윕
   - 추출(Vt, SS, DIBL, gm), 후처리(충돌 이온화, 단면), 빠른 압축 모델, RDF
   - 들로네 삼각분할·보로노이 셀(격자 장 설명용), 2D 필드 그리기
   단위: 좌표 nm (x 가로, 게이트 중심 0 / y 깊이, 실리콘 표면 0, 아래로 +, 산화막·게이트는 y<0),
   농도 cm⁻³, 전압 V, 전류 밀도 A/cm², 단자 전류 A/µm(폭당). 내부 계산은 cm.
   ψ는 진성 준위 기준 전위: n = ni·e^{(ψ−φn)/Vt}, p = ni·e^{(φp−ψ)/Vt} (볼츠만).
   ========================================================================== */
(function () {
  "use strict";
  const TC = window.TC;
  const NM = 1e-7, T0 = 300, VT = TC.vt(T0), NI = TC.ni(T0), QE = TC.q / TC.eps0;
  const SQ2 = Math.SQRT2;

  /** 상보 오차 함수(상대 오차 < 1.2e-7) */
  function erfc(x) {
    const z = Math.abs(x), t = 1 / (1 + 0.5 * z);
    const r = t * Math.exp(-z * z - 1.26551223 + t * (1.00002368 + t * (0.37409196 + t * (0.09678418 + t * (-0.18628806 + t * (0.27886807 + t * (-1.13520398 + t * (1.48851587 + t * (-0.82215223 + t * 0.17087277)))))))));
    return x >= 0 ? r : 2 - r;
  }
  TC.erfc = TC.erfc || erfc;
  const gau = (y, R, s) => Math.exp(-((y - R) * (y - R)) / (2 * s * s));

  /* ------------------------------------------------------------ TN-45 타깃 */
  /**
   * TN-45: 가상의 45 nm 평면 벌크 nMOSFET. 길이 nm, 농도 cm⁻³.
   * 도핑은 해석식(TC.tn45Doping): 레트로그레이드 웰 + Vt 조정(채널) + 할로 포켓 + 확장부 + 깊은 S/D.
   * xjExt, xjSD는 기준 배경 Nref에서의 접합 깊이로 수직 표준편차를 정한다(실제 금속학적 접합은 TC.tn45Junctions).
   */
  TC.TN45 = {
    name: "TN-45", Lg: 45, eot: 1.2, spacer: 25, hPoly: 50, hStack: 6, lCont: 30, depth: 150,
    Npoly: 2e20, polyDep: true, gateWf: null, VDD: 1.0, T: 300,              // n+ poly(공핍 포함) 또는 금속 일함수 gateWf(eV)
    Nsub: 5e17, Nwell: 2.5e18, Rwell: 150, dWell: 45,           // 붕소 p-웰 바탕 + 레트로그레이드 봉우리
    Nch: 2.7e18, Rch: 12, dCh: 6.3,                             // Vt 조정 주입(붕소, 표면 아래 봉우리)
    Nhalo: 1.9e19, xHalo: 3.5, yHalo: 10.5, sxHalo: 11.5, dHalo: 5.7, // 할로: 게이트 끝에서 안쪽 xHalo, 깊이 yHalo
    Next: 1.5e20, xjExt: 28, ovl: 5, sxExt: 3.4,                // 비소 확장부: 게이트 끝에서 안쪽 ovl 위치에 가로 erfc 끝
    Nsd: 2e20, xjSD: 70, offSD: 5, sxSD: 8,                     // 깊은 S/D: 스페이서 바깥 끝에서 안쪽 offSD
    Nref: 2e18, muScale: 1, vsatScale: 1,                       // 접합 깊이 기준 배경, 이동도·포화 속도 배수(보정용)
  };
  /** TN-45 계산 영역 {x0, x1, y0, y1}(nm): 게이트 스택 위쪽 hStack까지, 아래로 depth */
  TC.tn45Domain = function (p) {
    p = Object.assign({}, TC.TN45, p);
    const xD = p.Lg / 2 + p.spacer + p.lCont;
    return { x0: -xD, x1: xD, y0: -(p.eot + p.hStack), y1: p.depth };
  };
  TC.TN45.domain = TC.tn45Domain(TC.TN45);

  /** TN-45 도너·억셉터 농도 {nd, na}(cm⁻³) at (x, y) nm */
  TC.tn45DopingParts = function (x, y, p) {
    p = p || TC.TN45;
    if (y < 0) return { nd: 0, na: 0 };
    const xg = p.Lg / 2, ax = Math.abs(x);
    let na = p.Nsub + p.Nwell * gau(y, p.Rwell, p.dWell) + p.Nch * gau(y, p.Rch, p.dCh);
    const xh = xg - p.xHalo;
    const gx = ax >= xh ? 1 : gau(ax, xh, p.sxHalo);
    na += p.Nhalo * gx * gau(y, p.yHalo, p.dHalo);
    const se = p.xjExt / Math.sqrt(2 * Math.log(p.Next / p.Nref));
    const ss = p.xjSD / Math.sqrt(2 * Math.log(p.Nsd / p.Nref));
    let nd = p.Next * 0.5 * erfc((xg - p.ovl - ax) / (SQ2 * p.sxExt)) * gau(y, 0, se);
    nd += p.Nsd * 0.5 * erfc((xg + p.spacer - p.offSD - ax) / (SQ2 * p.sxSD)) * gau(y, 0, ss);
    return { nd, na };
  };
  /** TN-45 순 도핑 Nd − Na (cm⁻³). 해석식: 가로 erfc × 세로 가우시안, 할로 가우시안 포켓, 레트로그레이드 웰 */
  TC.tn45Doping = function (x, y, p) { const d = TC.tn45DopingParts(x, y, p); return d.nd - d.na; };
  /** 접합 위치: 표면 금속학적 접합 x(nm, 드레인 쪽)와 확장부·S/D 수직 접합 깊이(nm) */
  TC.tn45Junctions = function (p, dop) {
    p = Object.assign({}, TC.TN45, p);
    const f = dop || ((x, y) => TC.tn45Doping(x, y, p));
    const xg = p.Lg / 2, xe = xg + 2, xsd = xg + p.spacer + p.lCont / 2;
    const xjLat = f(0, 0.5) > 0 ? 0 : TC.bisect((x) => f(x, 0.5), 0, xg + p.spacer);
    const depth = (x) => (f(x, 0) <= 0 ? 0 : TC.bisect((y) => f(x, y), 0, p.depth));
    return { xjLat, leff: 2 * xjLat, xjExt: depth(xe), xjSD: depth(xsd) };
  };

  /** 재질 영역(nm): TC.drawStruct용. 실리콘, 게이트 산화막, n+ 다결정 게이트, 질화막 스페이서(D자형), S/D 실리사이드 접촉 */
  TC.tn45Regions = function (p) {
    p = Object.assign({}, TC.TN45, p);
    const d = TC.tn45Domain(p), xg = p.Lg / 2, sp = p.spacer, t = p.eot, H = p.hPoly;
    const spacerPoly = (s) => {
      const pts = [[s * xg, -t]];
      for (let k = 0; k <= 12; k++) {
        const a = (k / 12) * Math.PI / 2;
        pts.push([s * (xg + sp * Math.cos(a)), -t - (H - 4) * Math.sin(a) * 0.98]);
      }
      pts.push([s * xg, -t - H]);
      return pts;
    };
    return [
      { m: "si", x0: d.x0, x1: d.x1, y0: 0, y1: d.y1, name: "Si" },
      { m: "ox", x0: -xg - sp, x1: xg + sp, y0: -t, y1: 0, name: "SiO₂" },
      { m: "nit", poly: spacerPoly(-1), name: "Si₃N₄" },
      { m: "nit", poly: spacerPoly(1), name: "Si₃N₄" },
      { m: "poly", x0: -xg, x1: xg, y0: -t - H, y1: -t, name: "n⁺ poly" },
      { m: "sil", x0: d.x0, x1: -xg - sp, y0: -6, y1: 0, name: "S" },
      { m: "sil", x0: xg + sp, x1: d.x1, y0: -6, y1: 0, name: "D" },
    ];
  };

  /* ------------------------------------------------------------ 격자 */
  function specMesh(pts) {
    // [[x, h], ...] 에서 좌표가 단조 증가하지 않는 점을 걸러 TC.mesh1d
    const s = [];
    pts.forEach((q) => { if (!s.length || q[0] > s[s.length - 1][0] + 1e-9) s.push(q); });
    return TC.mesh1d(s);
  }
  /** 텐서곱 비균일 격자: {xSpec, ySpec} (TC.mesh1d 형식 [[좌표, 간격], ...]) 또는 {xs, ys} → {xs, ys, nx, ny} */
  TC.mesh2d = function (o) {
    const xs = o.xs || specMesh(o.xSpec), ys = o.ys || specMesh(o.ySpec);
    return { xs, ys, nx: xs.length, ny: ys.length };
  };
  const DENS = { coarse: 1.7, normal: 1, fine: 0.6, xfine: 0.4 };
  /** TN-45 격자. opt.density: "coarse"|"normal"|"fine"|"xfine" 또는 간격 배수(숫자). 산화막·표면·접합을 촘촘히 */
  TC.tn45Mesh = function (p, opt = {}) {
    p = Object.assign({}, TC.TN45, p);
    const f = typeof opt.density === "number" ? opt.density : DENS[opt.density || "normal"] || 1;
    const d = TC.tn45Domain(p), xg = p.Lg / 2, sp = p.spacer, t = p.eot;
    const hj = 1.5 * f, hm = Math.min(Math.max(p.Lg / 10, 2.5), 30) * f;
    const half = specMesh([[0, hm], [xg - 9, Math.min(hm, hj * 1.6)], [xg, hj], [xg + 3, hj * 1.3], [xg + sp, 5 * f], [d.x1, 10 * f]]);
    const xs = half.slice(1).reverse().map((v) => -v).concat(half);
    const nox = Math.max(2, Math.round(3 / Math.sqrt(f)));
    const ys = specMesh([[d.y0, 2.5 * f], [-t - 1.5, 0.5 * f], [-t, t / nox], [0, opt.hs || Math.min(0.4 * f, t / nox)], [3, 1.1 * f], [12, 2.6 * f],
      [p.xjExt + 10, 5 * f], [p.xjSD + 15, 12 * f], [d.y1, 30 * f]]);
    return { xs, ys, nx: xs.length, ny: ys.length };
  };

  /* ------------------------------------------------------------ 소자 구성 */
  const MATS = ["si", "ox", "nit", "gate", "src", "drn", "poly"];
  const M_SI = 0, M_POLY = 6;
  const CONT = ["gate", "source", "drain", "body"];
  function makeDopingFn(dop) {
    if (typeof dop === "function") return dop;
    // 격자 도핑 {xs, ys, net, total?} → 겹선형 보간
    const gx = dop.xs, gy = dop.ys, nx = gx.length, at = (arr) => (x, y) => {
      const loc = (a, v) => { let lo = 0, hi = a.length - 1; if (v <= a[0]) return [0, 0]; if (v >= a[hi]) return [hi - 1, 1]; while (hi - lo > 1) { const m = (lo + hi) >> 1; if (a[m] > v) hi = m; else lo = m; } return [lo, (v - a[lo]) / (a[lo + 1] - a[lo])]; };
      const [i, tx] = loc(gx, x), [j, ty] = loc(gy, y), k = j * nx + i;
      return (arr[k] * (1 - tx) + arr[k + 1] * tx) * (1 - ty) + (arr[k + nx] * (1 - tx) + arr[k + nx + 1] * tx) * ty;
    };
    const f = at(dop.net);
    if (dop.total) f.total = at(dop.total);
    return f;
  }
  /**
   * 2D 소자: 텐서 격자 + 셀 재질 + 도핑 → 박스 적분 기하.
   *   o: {xs, ys (nm), mat(xc, yc) → "si"|"ox"|"nit"|"gate"|"src"|"drn", doping: (x,y)→net | {xs, ys, net, total},
   *       total: (x,y)→Nd+Na (생략 시 |net|), gateOff (게이트 ψ = Vg + gateOff), Npoly ("poly" 셀 도핑: 포아송만 풀어 게이트 공핍을 낸다),
   *       L (게이트 길이 nm, 추출용), muScale·vsatScale (전자 저전계 이동도·포화 속도 배수, 보정용)}. "gate"는 금속(디리클레), "poly"는 맨 위 행이 게이트 접촉.
   * 반환 dev: {nx, ny, xs, ys, C, Ctot, kind(0 비활성,1 반도체,2 절연체,3 게이트 poly), dir(디리클레), cont(−1|0 게이트|1 S|2 D|3 기판), ...}
   */
  TC.device2d = function (o) {
    const xs = o.xs, ys = o.ys, nx = xs.length, ny = ys.length, N = nx * ny;
    const cx = nx - 1, cy = ny - 1;
    const hx = new Float64Array(cx), hy = new Float64Array(cy);
    for (let i = 0; i < cx; i++) hx[i] = (xs[i + 1] - xs[i]) * NM;
    for (let j = 0; j < cy; j++) hy[j] = (ys[j + 1] - ys[j]) * NM;
    const cmat = new Uint8Array(cx * cy), ceps = new Float64Array(cx * cy);
    const EPS = [TC.MAT.si.eps, TC.MAT.ox.eps, TC.MAT.nit.eps, 0, 0, 0, TC.MAT.poly.eps];
    for (let j = 0; j < cy; j++) for (let i = 0; i < cx; i++) {
      const m = MATS.indexOf(o.mat(0.5 * (xs[i] + xs[i + 1]), 0.5 * (ys[j] + ys[j + 1])));
      cmat[j * cx + i] = m < 0 ? 7 : m; ceps[j * cx + i] = m < 0 ? 0 : EPS[m];
    }
    const cm = (i, j) => (i < 0 || j < 0 || i >= cx || j >= cy ? -1 : cmat[j * cx + i]);
    const kind = new Uint8Array(N), dir = new Uint8Array(N), cont = new Int8Array(N).fill(-1), area = new Float64Array(N);
    const dopFn = makeDopingFn(o.doping), totFn = o.total || dopFn.total;
    const C = new Float64Array(N), Ctot = new Float64Array(N);
    for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
      const k = j * nx + i;
      let semi = false, ins = false, pol = false, c = -1;
      const quads = [[i - 1, j - 1], [i, j - 1], [i - 1, j], [i, j]];
      for (const [a, b] of quads) {
        const m = cm(a, b);
        if (m === M_SI) { semi = true; area[k] += 0.25 * hx[a] * hy[b]; }
        else if (m === M_POLY) { pol = true; if (!semi) area[k] += 0.25 * hx[a] * hy[b]; }
        else if (m === 1 || m === 2) ins = true;
        else if (m >= 3 && m <= 5) c = m - 3;
      }
      kind[k] = semi ? 1 : pol ? 3 : ins ? 2 : 0;
      if (semi && j === ny - 1) c = 3;
      if (pol && !semi && j === 0) c = 0;
      if (c >= 0) { cont[k] = c; dir[k] = 1; } else if (!semi && !ins && !pol) dir[k] = 1;
      if (kind[k] === 3) C[k] = o.Npoly || 1e20;
      if (semi) {
        const v = dopFn(xs[i], ys[j]);
        C[k] = v; Ctot[k] = totFn ? Math.max(totFn(xs[i], ys[j]), Math.abs(v)) : Math.abs(v);
      }
    }
    // 가로 변 e = j·cx + i : (i,j)-(i+1,j), 세로 변 e = j·nx + i : (i,j)-(i,j+1)
    const hP = new Float64Array(cx * ny), hW = new Float64Array(cx * ny), vP = new Float64Array(nx * cy), vW = new Float64Array(nx * cy);
    for (let j = 0; j < ny; j++) for (let i = 0; i < cx; i++) {
      let p = 0, w = 0;
      if (j > 0) { const c = (j - 1) * cx + i; p += ceps[c] * 0.5 * hy[j - 1]; if (cmat[c] === M_SI) w += 0.5 * hy[j - 1]; }
      if (j < cy) { const c = j * cx + i; p += ceps[c] * 0.5 * hy[j]; if (cmat[c] === M_SI) w += 0.5 * hy[j]; }
      hP[j * cx + i] = p / hx[i]; hW[j * cx + i] = w;
    }
    for (let j = 0; j < cy; j++) for (let i = 0; i < nx; i++) {
      let p = 0, w = 0;
      if (i > 0) { const c = j * cx + i - 1; p += ceps[c] * 0.5 * hx[i - 1]; if (cmat[c] === M_SI) w += 0.5 * hx[i - 1]; }
      if (i < cx) { const c = j * cx + i; p += ceps[c] * 0.5 * hx[i]; if (cmat[c] === M_SI) w += 0.5 * hx[i]; }
      vP[j * nx + i] = p / hy[j]; vW[j * nx + i] = w;
    }
    // 오믹 접촉의 내부 전위, 평형 캐리어
    const psiBi = new Float64Array(N), nEq = new Float64Array(N), pEq = new Float64Array(N);
    const rep = [[], [], [], []];
    for (let k = 0; k < N; k++) if (kind[k] === 1) {
      const e = TC.equil(C[k], T0, NI); psiBi[k] = e.psi; nEq[k] = e.n; pEq[k] = e.p;
      if (cont[k] > 0) rep[cont[k]].push(e.psi);
    }
    const repPsi = rep.map((a) => (a.length ? a.sort((u, v) => u - v)[a.length >> 1] : 0));
    for (let k = 0; k < N; k++) if (dir[k] && kind[k] !== 1 && cont[k] > 0) psiBi[k] = repPsi[cont[k]];
    let jSurf = 0; while (jSurf < ny - 1 && ys[jSurf] < -1e-9) jSurf++;
    const byCol = ny <= nx, perm = new Int32Array(N);
    for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) perm[j * nx + i] = byCol ? i * ny + j : j * nx + i;
    const dev = {
      nx, ny, N, xs: Float64Array.from(xs), ys: Float64Array.from(ys), hx, hy, cmat, kind, dir, cont, area, C, Ctot,
      hP, hW, vP, vW, psiBi, nEq, pEq, jSurf, perm, stride: byCol ? ny : nx,
      gateOff: o.gateOff != null ? o.gateOff : VT * Math.asinh(1e20 / (2 * NI)), L: o.L || 45, p: o.p || null, regions: o.regions || null,
      contacts: CONT, muScale: o.muScale || 1, vsatScale: o.vsatScale || 1,
    };
    dev.mu0 = edgeMuDoping(dev);
    return dev;
  };

  /** TN-45 셀 재질 함수 */
  function tn45Mat(p) {
    const xg = p.Lg / 2, sp = p.spacer, t = p.eot;
    return (x, y) => {
      if (y > 0) return "si";
      const ax = Math.abs(x);
      if (ax > xg + sp) return x < 0 ? "src" : "drn";
      if (y > -t) return "ox";
      return ax < xg ? (p.gateWf == null && p.polyDep !== false ? "poly" : "gate") : "nit";
    };
  }
  /**
   * TN-45 소자. over: TC.TN45 덮어쓰기 + {density, hs (표면 첫 간격 nm), mesh: {xs, ys}, doping: (x,y)→net | {xs, ys, net, total}, total}.
   * 공정 모사 도핑(TC.tn45Process(...).dopingFn)을 doping으로 넘기면 그대로 쓴다.
   */
  TC.tn45Device = function (over = {}) {
    const p = Object.assign({}, TC.TN45, over);
    delete p.doping; delete p.total; delete p.mesh; delete p.density; delete p.hs;
    p.domain = TC.tn45Domain(p);
    const m = over.mesh || TC.tn45Mesh(p, { density: over.density, hs: over.hs });
    const gateOff = p.gateWf != null ? TC.MAT.si.chi + TC.Eg(p.T) / 2 - p.gateWf : VT * Math.asinh(p.Npoly / (2 * NI));
    const doping = over.doping || ((x, y) => TC.tn45Doping(x, y, p));
    const total = over.doping ? over.total : (x, y) => { const d = TC.tn45DopingParts(x, y, p); return d.nd + d.na; };
    return TC.device2d({ xs: m.xs, ys: m.ys, mat: tn45Mat(p), doping, total, gateOff, Npoly: p.Npoly, L: p.Lg, p, regions: TC.tn45Regions(p), muScale: p.muScale, vsatScale: p.vsatScale });
  };

  /* ------------------------------------------------------------ 이동도 (변마다) */
  function edgeMuDoping(dev) {
    const { nx, ny, Ctot } = dev, cx = nx - 1;
    const h = new Float64Array(cx * ny), v = new Float64Array(nx * (ny - 1)), hp = new Float64Array(cx * ny), vp = new Float64Array(nx * (ny - 1));
    for (let j = 0; j < ny; j++) for (let i = 0; i < cx; i++) {
      const k = j * nx + i, N = 0.5 * (Ctot[k] + Ctot[k + 1]);
      h[j * cx + i] = TC.mobCT(N, "n"); hp[j * cx + i] = TC.mobCT(N, "p");
    }
    for (let j = 0; j < ny - 1; j++) for (let i = 0; i < nx; i++) {
      const k = j * nx + i, N = 0.5 * (Ctot[k] + Ctot[k + nx]);
      v[k] = TC.mobCT(N, "n"); vp[k] = TC.mobCT(N, "p");
    }
    return { h, v, hp, vp };
  }
  const MODELS = {
    const: { dop: false, surf: false, field: false }, doping: { dop: true, surf: false, field: false },
    surface: { dop: true, surf: true, field: false }, field: { dop: true, surf: false, field: true }, full: { dop: true, surf: true, field: true },
  };
  /**
   * 변 이동도: 도핑(CT) → 표면(Lombardi, x 방향 변, 1/μ += D/μac + D/μsr, D = e^{−y/10 nm}) → 속도 포화(Canali, 구동력 |∇φ|).
   * 뉴턴 야코비안용으로 K = (u^β/(1+u^β))/Δφ 를 저장한다(dμ/dΔφ = −μ·K, u = μE/vsat).
   */
  function edgeMobility(dev, S, model, carrier) {
    const md = MODELS[model] || MODELS.full, { nx, ny, ys, hx, hy, jSurf, Ctot } = dev, cx = nx - 1;
    const isN = carrier === "n";
    const muH = isN ? S.muH : S.muHp, muV = isN ? S.muV : S.muVp, kH = isN ? S.kH : S.kHp, kV = isN ? S.kV : S.kVp;
    const base = isN ? dev.mu0 : { h: dev.mu0.hp, v: dev.mu0.vp };
    const muMax = TC.MOB.ct[carrier].max, psi = S.psi, c = isN ? S.n : S.p;
    const lo = TC.MOB.lo[carrier], vs = TC.MOB.vs[carrier], vsat = vs.vsat * (dev.vsatScale || 1), beta = vs.beta;
    const lcrit = 10, sgn = isN ? 1 : -1, ms = isN ? dev.muScale || 1 : 1;
    const sat = (mu, ca, cb, dpsi, len, K, e) => {
      K[e] = 0;
      if (!(ca > 1 && cb > 1)) return mu;
      const dphi = dpsi - sgn * VT * Math.log(cb / ca), ub = Math.pow((mu * Math.abs(dphi)) / (len * vsat), beta);
      if (S.kf && dphi !== 0) K[e] = ub / (1 + ub) / dphi;
      return mu / Math.pow(1 + ub, 1 / beta);
    };
    for (let j = 0; j < ny; j++) for (let i = 0; i < cx; i++) {
      const e = j * cx + i, k = j * nx + i;
      kH[e] = 0;
      if (dev.hW[e] === 0) { muH[e] = 0; continue; }
      let mu = (md.dop ? base.h[e] : muMax) * ms;
      if (md.surf && j >= jSurf && ys[j] < 8 * lcrit && j < ny - 1) {
        let F = Math.abs(psi[k + nx] - psi[k] + psi[k + nx + 1] - psi[k + 1]) / (2 * hy[j]);
        if (j > jSurf) F = 0.5 * (F + Math.abs(psi[k] - psi[k - nx] + psi[k + 1] - psi[k + 1 - nx]) / (2 * hy[j - 1]));
        F = Math.max(F, 1e2);
        const N = 0.5 * (Ctot[k] + Ctot[k + 1]) || 1, D = Math.exp(-ys[j] / lcrit);
        const muAc = lo.B / F + (lo.C * Math.pow(N, lo.lam)) / Math.cbrt(F), muSr = lo.delta / (F * F);
        mu = 1 / (1 / mu + D / (ms * muAc) + D / (ms * muSr));
      }
      if (md.field) mu = sat(mu, c[k], c[k + 1], psi[k + 1] - psi[k], hx[i], kH, e);
      muH[e] = mu;
    }
    for (let j = 0; j < ny - 1; j++) for (let i = 0; i < nx; i++) {
      const e = j * nx + i;
      kV[e] = 0;
      if (dev.vW[e] === 0) { muV[e] = 0; continue; }
      let mu = (md.dop ? base.v[e] : muMax) * ms;
      if (md.field) mu = sat(mu, c[e], c[e + nx], psi[e + nx] - psi[e], hy[j], kV, e);
      muV[e] = mu;
    }
  }

  /* ------------------------------------------------------------ 띠 행렬 */
  /** 띠 LU(피벗 없음) 제자리 풀이: A[r·W + (c − r + bw)], W = 2bw+1. b를 해로 덮어쓴다 */
  function bandLU(N, bw, A, b) {
    const W = 2 * bw + 1;
    for (let k = 0; k < N; k++) {
      const kk = k * W + bw, inv = 1 / A[kk], iEnd = Math.min(N - 1, k + bw), len = iEnd - k, bk = b[k];
      for (let i = k + 1; i <= iEnd; i++) {
        const ik = i * W + (k - i + bw), a = A[ik];
        if (a === 0) continue;
        const f = a * inv;
        for (let t = 1; t <= len; t++) A[ik + t] -= f * A[kk + t];
        b[i] -= f * bk;
      }
    }
    for (let i = N - 1; i >= 0; i--) {
      const ii = i * W + bw, jEnd = Math.min(N - 1, i + bw);
      let s = b[i];
      for (let j = i + 1; j <= jEnd; j++) s -= A[ii + (j - i)] * b[j];
      b[i] = s / A[ii];
    }
    return b;
  }
  TC.bandLU = bandLU;
  function bern(x) { // B(x) = x/(e^x − 1)
    const ax = Math.abs(x);
    if (ax < 1e-4) return 1 - x / 2 + (x * x) / 12;
    if (x > 700) return x * Math.exp(-x);
    if (x < -700) return -x;
    return x / Math.expm1(x);
  }
  function dbern(x, B) { // B'(x)
    if (Math.abs(x) < 1e-3) return -0.5 + x / 6;
    return (B * (1 - x - B)) / x;
  }

  /* ------------------------------------------------------------ 상태·경계 조건 */
  function newState(dev, holes) {
    const N = dev.N, ne = (dev.nx - 1) * dev.ny, nv = dev.nx * (dev.ny - 1);
    return {
      psi: new Float64Array(N), n: new Float64Array(N), p: new Float64Array(N), holes: !!holes,
      muH: new Float64Array(ne), muV: new Float64Array(nv), muHp: new Float64Array(ne), muVp: new Float64Array(nv),
      kH: new Float64Array(ne), kV: new Float64Array(nv), kHp: new Float64Array(ne), kVp: new Float64Array(nv),
      bias: { vg: 0, vs: 0, vd: 0, vb: 0 },
    };
  }
  function cloneState(dev, s, holes) {
    const S = newState(dev, holes != null ? holes : s.holes);
    S.psi.set(s.psi); S.n.set(s.n); S.p.set(s.p); S.bias = Object.assign({}, s.bias);
    if (s.muH) { S.muH.set(s.muH); S.muV.set(s.muV); }
    if (!S.holes || !s.holes) fillHoles(dev, S);
    return S;
  }
  function normBias(b) { return { vg: b.vg || 0, vs: b.vs || 0, vd: b.vd || 0, vb: b.vb || 0 }; }
  function fillHoles(dev, S) {
    const { psi, p } = S, vb = S.bias.vb;
    for (let k = 0; k < dev.N; k++) p[k] = dev.kind[k] === 1 ? NI * Math.exp((vb - psi[k]) / VT) : 0;
    fillGate(dev, S);
  }
  function fillGate(dev, S) { // poly 게이트 전자(φn = Vg)
    const vg = S.bias.vg;
    for (let k = 0; k < dev.N; k++) if (dev.kind[k] === 3) S.n[k] = NI * Math.exp((S.psi[k] - vg) / VT);
  }
  function applyBC(dev, S, bias) {
    S.bias = normBias(bias);
    const V = [S.bias.vg, S.bias.vs, S.bias.vd, S.bias.vb];
    for (let k = 0; k < dev.N; k++) {
      if (!dev.dir[k]) continue;
      const c = dev.cont[k];
      if (c < 0) { S.psi[k] = 0; S.n[k] = 0; S.p[k] = 0; continue; }
      S.psi[k] = c === 0 ? V[0] + dev.gateOff : V[c] + dev.psiBi[k];
      if (dev.kind[k] === 1) { S.n[k] = dev.nEq[k]; S.p[k] = dev.pEq[k]; } else { S.n[k] = 0; S.p[k] = 0; }
    }
  }

  /* ------------------------------------------------------------ 비선형 포아송 */
  // phin, phip: 노드 배열 또는 스칼라. n = ni e^{(ψ−φn)/Vt}, p = ni e^{(φp−ψ)/Vt}
  function poissonNewton(dev, S, phin, phip, opt = {}) {
    const { N, nx, ny, kind, dir, area, C, hP, vP, perm } = dev, cx = nx - 1;
    const bw = dev.stride, W = 2 * bw + 1;
    const A = opt.A && opt.A.length === N * W ? opt.A.fill(0) : new Float64Array(N * W), b = new Float64Array(N);
    const psi = S.psi, fn = typeof phin === "number" ? () => phin : (k) => phin[k], fp = typeof phip === "number" ? () => phip : (k) => phip[k];
    const maxIt = opt.maxIter || 50, tol = opt.tol || 1e-8, vg = S.bias.vg;
    let it = 0, dmax = 0;
    for (; it < maxIt; it++) {
      if (it) A.fill(0);
      for (let k = 0; k < N; k++) {
        const r = perm[k];
        if (dir[k]) { A[r * W + bw] = 1; b[r] = 0; continue; }
        let F = 0, D = 0;
        if (kind[k] === 1) {
          const nn = NI * Math.exp((psi[k] - fn(k)) / VT), pp = NI * Math.exp((fp(k) - psi[k]) / VT);
          F = QE * area[k] * (pp - nn + C[k]); D = (-QE * area[k] * (pp + nn)) / VT;
        } else if (kind[k] === 3) {
          const nn = NI * Math.exp((psi[k] - vg) / VT);
          F = QE * area[k] * (C[k] - nn); D = (-QE * area[k] * nn) / VT;
        }
        const i = k % nx, j = (k / nx) | 0;
        const nb = (kk, c) => { F += c * (psi[kk] - psi[k]); D -= c; A[r * W + (perm[kk] - r + bw)] += c; };
        if (i > 0) nb(k - 1, hP[j * cx + i - 1]);
        if (i < cx) nb(k + 1, hP[j * cx + i]);
        if (j > 0) nb(k - nx, vP[(j - 1) * nx + i]);
        if (j < ny - 1) nb(k + nx, vP[j * nx + i]);
        A[r * W + bw] += D; b[r] = -F;
      }
      bandLU(N, bw, A, b);
      dmax = 0;
      for (let k = 0; k < N; k++) {
        if (dir[k]) continue;
        let d = b[perm[k]];
        const ad = Math.abs(d);
        if (ad > dmax) dmax = ad;
        if (ad > VT) d = Math.sign(d) * VT * (1 + Math.log(ad / VT));
        psi[k] += d;
      }
      if (dmax < tol) { it++; break; }
    }
    for (let k = 0; k < N; k++) if (kind[k] === 1 && !dir[k]) {
      S.n[k] = NI * Math.exp((psi[k] - fn(k)) / VT); S.p[k] = NI * Math.exp((fp(k) - psi[k]) / VT);
    }
    fillGate(dev, S);
    return { iters: it, dPsi: dmax };
  }
  function initGuess(dev, S, phin, phip) {
    for (let k = 0; k < dev.N; k++) {
      if (dev.dir[k]) continue;
      if (dev.kind[k] === 1) { const C = dev.C[k]; S.psi[k] = VT * Math.asinh(C / (2 * NI)) + (C > 0 ? phin(k) : phip(k)); }
      else S.psi[k] = dev.kind[k] === 3 ? S.bias.vg + dev.gateOff : 0;
    }
  }
  /**
   * 비선형 포아송(전류 없음). bias {vg, vs, vd, vb}, {phin, phip}(스칼라/노드 배열, 생략 시 소스·드레인 쪽 접촉 전압, φp = vb).
   * 평형(모든 바이어스 0 V 또는 vg만)에서 정확. 반환 sol(TC.mos2d와 같은 형식, 전류 0)
   */
  TC.poisson2d = function (dev, bias = {}, opt = {}) {
    const S = newState(dev, false), b = normBias(bias);
    applyBC(dev, S, b);
    let phin = opt.phin, phip = opt.phip != null ? opt.phip : b.vb;
    if (phin == null) {
      if (b.vs === b.vd) phin = b.vs;
      else { phin = new Float64Array(dev.N); for (let k = 0; k < dev.N; k++) phin[k] = dev.xs[k % dev.nx] < 0 ? b.vs : b.vd; }
    }
    const fn = typeof phin === "number" ? () => phin : (k) => phin[k], fp = typeof phip === "number" ? () => phip : (k) => phip[k];
    if (opt.init) S.psi.set(opt.init.psi); else initGuess(dev, S, fn, fp);
    applyBC(dev, S, b);
    const r = poissonNewton(dev, S, phin, phip, opt);
    const sol = finish(dev, S, { model: "doping" });
    sol.iters = r.iters; sol.converged = r.dPsi < 1e-6; sol.Id = sol.Is = sol.Ib = 0;
    return sol;
  };

  /* ------------------------------------------------------------ 결합 뉴턴 (ψ, n[, p]) */
  function newtonStep(dev, S, W_, opt) {
    const { N, nx, ny, kind, dir, area, C, hP, vP, hW, vW, hx, hy, perm } = dev, cx = nx - 1;
    const holes = S.holes, nv = holes ? 3 : 2, NN = N * nv, bw = nv * dev.stride + nv - 1, W = 2 * bw + 1;
    let A = W_.A;
    if (!A || A.length !== NN * W) A = W_.A = new Float64Array(NN * W); else A.fill(0);
    const F = W_.F && W_.F.length === NN ? W_.F.fill(0) : (W_.F = new Float64Array(NN));
    const psi = S.psi, n = S.n, p = S.p;
    if (!holes) fillHoles(dev, S);
    const add = (r, c, v) => { A[r * W + (c - r + bw)] += v; };
    // 노드 항
    for (let k = 0; k < N; k++) {
      const r = perm[k] * nv;
      if (dir[k]) { for (let c = 0; c < nv; c++) A[(r + c) * W + bw] = 1; continue; }
      if (kind[k] === 3) { // poly 게이트: 공핍 전하만
        const qa = QE * area[k], ng = NI * Math.exp((psi[k] - S.bias.vg) / VT);
        F[r] += qa * (C[k] - ng); add(r, r, (-qa * ng) / VT);
      }
      if (kind[k] !== 1) continue; // 절연체·poly: ψ만
      const qa = QE * area[k];
      F[r] += qa * (p[k] - n[k] + C[k]);
      add(r, r + 1, -qa);
      if (holes) add(r, r + 2, qa); else add(r, r, (-qa * p[k]) / VT);
    }
    // 변 항
    const edge = (a, b, cP, w, len, mun, mup, Kn, Kp) => {
      const ra = perm[a] * nv, rb = perm[b] * nv, da = !dir[a], db = !dir[b];
      const dpsi = psi[b] - psi[a];
      if (da) { F[ra] += cP * dpsi; add(ra, ra, -cP); add(ra, rb, cP); }
      if (db) { F[rb] -= cP * dpsi; add(rb, rb, -cP); add(rb, ra, cP); }
      if (w === 0) return;
      const x = dpsi / VT, Bp = bern(x), Bm = Bp + x, dBp = dbern(x, Bp), dBm = dbern(-x, Bm);
      if (mun > 0) {
        const g = (mun * w) / len, fl = g * (n[b] * Bp - n[a] * Bm);
        let dnb = g * Bp, dna = -g * Bm, dpb = (g * (n[b] * dBp + n[a] * dBm)) / VT;
        if (Kn) { const f = fl * Kn; dpb -= f; dnb += (f * VT) / n[b]; dna -= (f * VT) / n[a]; }
        if (da) { F[ra + 1] += fl; add(ra + 1, rb + 1, dnb); add(ra + 1, ra + 1, dna); add(ra + 1, rb, dpb); add(ra + 1, ra, -dpb); }
        if (db) { F[rb + 1] -= fl; add(rb + 1, rb + 1, -dnb); add(rb + 1, ra + 1, -dna); add(rb + 1, rb, -dpb); add(rb + 1, ra, dpb); }
      }
      if (holes && mup > 0) {
        const g = (mup * w) / len, fl = g * (p[b] * Bm - p[a] * Bp);
        let dpB = g * Bm, dpA = -g * Bp, dps = (-g * (p[b] * dBm + p[a] * dBp)) / VT;
        if (Kp) { const f = fl * Kp; dps -= f; dpB -= (f * VT) / p[b]; dpA += (f * VT) / p[a]; }
        if (da) { F[ra + 2] += fl; add(ra + 2, rb + 2, dpB); add(ra + 2, ra + 2, dpA); add(ra + 2, rb, dps); add(ra + 2, ra, -dps); }
        if (db) { F[rb + 2] -= fl; add(rb + 2, rb + 2, -dpB); add(rb + 2, ra + 2, -dpA); add(rb + 2, rb, -dps); add(rb + 2, ra, dps); }
      }
    };
    for (let j = 0; j < ny; j++) for (let i = 0; i < cx; i++) {
      const e = j * cx + i, k = j * nx + i;
      if (hP[e] === 0 && hW[e] === 0) continue;
      edge(k, k + 1, hP[e], hW[e], hx[i], S.muH[e], S.muHp[e], S.kH[e], S.kHp[e]);
    }
    for (let j = 0; j < ny - 1; j++) for (let i = 0; i < nx; i++) {
      const e = j * nx + i;
      if (vP[e] === 0 && vW[e] === 0) continue;
      edge(e, e + nx, vP[e], vW[e], hy[j], S.muV[e], S.muVp[e], S.kV[e], S.kVp[e]);
    }
    // 반도체가 아닌 노드의 n·p 행: 항등
    for (let k = 0; k < N; k++) if (!dir[k] && kind[k] !== 1) { const r = perm[k] * nv; for (let c = 1; c < nv; c++) { A[(r + c) * W + bw] = 1; F[r + c] = 0; } }
    let res = 0;
    for (let k = 0; k < N; k++) if (!dir[k]) { const v = Math.abs(F[perm[k] * nv]); if (v > res) res = v; }
    for (let r = 0; r < NN; r++) F[r] = -F[r];
    bandLU(NN, bw, A, F);
    // 감쇠 갱신
    let dps = 0, dn = 0;
    for (let k = 0; k < N; k++) if (!dir[k]) { const v = Math.abs(F[perm[k] * nv]); if (!(v <= dps)) dps = v; }
    if (!isFinite(dps)) return { dPsi: Infinity, dN: Infinity, res, damp: 0 };
    const t = dps > opt.dvMax ? opt.dvMax / dps : 1;
    for (let k = 0; k < N; k++) {
      if (dir[k]) continue;
      const r = perm[k] * nv;
      psi[k] += t * F[r];
      if (kind[k] !== 1) continue;
      const n0 = n[k], n1 = n0 + t * F[r + 1];
      const nn = n1 > 0.05 * n0 ? n1 : 0.05 * n0;
      const rel = Math.abs(nn - n0) / (n0 + 1e8);
      if (rel > dn) dn = rel;
      n[k] = nn;
      if (holes) { const p0 = p[k], p1 = p0 + t * F[r + 2]; p[k] = p1 > 0.05 * p0 ? p1 : 0.05 * p0; }
    }
    if (!holes) fillHoles(dev, S); else fillGate(dev, S);
    return { dPsi: dps * t, dN: dn, res, damp: t };
  }

  /* ------------------------------------------------------------ 거멜 반복 */
  function continuity(dev, S, carrier) {
    const { N, nx, ny, kind, dir, hW, vW, hx, hy, perm } = dev, cx = nx - 1;
    const bw = dev.stride, W = 2 * bw + 1, A = new Float64Array(N * W), b = new Float64Array(N);
    const psi = S.psi, c = carrier === "n" ? S.n : S.p, muH = carrier === "n" ? S.muH : S.muHp, muV = carrier === "n" ? S.muV : S.muVp, s = carrier === "n" ? 1 : -1;
    for (let k = 0; k < N; k++) if (dir[k] || kind[k] !== 1) { A[perm[k] * W + bw] = 1; b[perm[k]] = dir[k] ? c[k] : 0; }
    const edge = (a, bb, w, len, mu) => {
      if (w === 0 || mu === 0) return;
      const x = (s * (psi[bb] - psi[a])) / VT, Bp = bern(x), Bm = Bp + x, g = (mu * w) / len;
      const ra = perm[a], rb = perm[bb];
      if (!dir[a] && kind[a] === 1) { A[ra * W + (rb - ra + bw)] += g * Bp; A[ra * W + bw] -= g * Bm; }
      if (!dir[bb] && kind[bb] === 1) { A[rb * W + (ra - rb + bw)] += g * Bm; A[rb * W + bw] -= g * Bp; }
    };
    for (let j = 0; j < ny; j++) for (let i = 0; i < cx; i++) { const e = j * cx + i, k = j * nx + i; edge(k, k + 1, hW[e], hx[i], muH[e]); }
    for (let j = 0; j < ny - 1; j++) for (let i = 0; i < nx; i++) { const e = j * nx + i; edge(e, e + nx, vW[e], hy[j], muV[e]); }
    bandLU(N, bw, A, b);
    let dmax = 0;
    for (let k = 0; k < N; k++) if (kind[k] === 1 && !dir[k]) {
      const v = Math.max(b[perm[k]], 1e-30);
      const d = Math.abs(Math.log(v / c[k])); if (d > dmax) dmax = d;
      c[k] = v;
    }
    return dmax;
  }
  function gummelStep(dev, S, opt) {
    const N = dev.N, phin = new Float64Array(N), phip = new Float64Array(N);
    for (let k = 0; k < N; k++) if (dev.kind[k] === 1) {
      phin[k] = S.psi[k] - VT * Math.log(Math.max(S.n[k], 1e-30) / NI);
      phip[k] = S.holes ? S.psi[k] + VT * Math.log(Math.max(S.p[k], 1e-30) / NI) : S.bias.vb;
    }
    const psi0 = Float64Array.from(S.psi);
    poissonNewton(dev, S, phin, phip, { maxIter: opt.inner || 3, tol: 1e-6 });
    let dps = 0;
    for (let k = 0; k < N; k++) { const d = Math.abs(S.psi[k] - psi0[k]); if (d > dps) dps = d; }
    // 포아송이 바꾼 n을 되돌리고(φn 고정) 연속 방정식으로 새 n
    updateMobility(dev, S, opt);
    const dn = continuity(dev, S, "n");
    if (S.holes) { continuity(dev, S, "p"); fillGate(dev, S); } else fillHoles(dev, S);
    return { dPsi: dps, dN: dn, res: dps, damp: 1 };
  }
  function updateMobility(dev, S, opt) {
    edgeMobility(dev, S, opt.mobility || "full", "n");
    if (S.holes) edgeMobility(dev, S, opt.mobility || "full", "p");
  }

  /* ------------------------------------------------------------ 후처리 */
  function finish(dev, S, opt = {}) {
    const { N, nx, ny, hx, hy, hW, vW, kind, cont, dir } = dev, cx = nx - 1;
    if (opt.model && !S.muH[0] && !S.muH[1]) updateMobility(dev, S, { mobility: opt.model });
    const psi = S.psi, n = S.n, p = S.p;
    const phin = new Float64Array(N), phip = new Float64Array(N);
    for (let k = 0; k < N; k++) if (kind[k] === 1) {
      phin[k] = psi[k] - VT * Math.log(Math.max(n[k], 1e-300) / NI);
      phip[k] = psi[k] + VT * Math.log(Math.max(p[k], 1e-300) / NI);
    }
    // 노드 전계(실리콘 계면은 실리콘 쪽 한쪽 차분)
    const Ex = new Float64Array(N), Ey = new Float64Array(N), Emag = new Float64Array(N);
    for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
      const k = j * nx + i;
      if (kind[k] === 0 && !dir[k]) continue;
      Ex[k] = i === 0 ? -(psi[k + 1] - psi[k]) / hx[0] : i === cx ? -(psi[k] - psi[k - 1]) / hx[cx - 1] : -(psi[k + 1] - psi[k - 1]) / (hx[i] + hx[i - 1]);
      if (j === 0) Ey[k] = -(psi[k + nx] - psi[k]) / hy[0];
      else if (j === ny - 1) Ey[k] = -(psi[k] - psi[k - nx]) / hy[j - 1];
      else if (j === dev.jSurf && kind[k] === 1) Ey[k] = -(psi[k + nx] - psi[k]) / hy[j];
      else Ey[k] = -(psi[k + nx] - psi[k - nx]) / (hy[j] + hy[j - 1]);
      Emag[k] = Math.hypot(Ex[k], Ey[k]);
    }
    // 샤페터-거멜 변 전류(A/cm²) → 노드 평균, 단자 전류
    const q = TC.q, Jnx = new Float64Array(N), Jny = new Float64Array(N), Jpx = new Float64Array(N), Jpy = new Float64Array(N);
    const cntX = new Float64Array(N), cntY = new Float64Array(N);
    const I = [0, 0, 0, 0];
    const edge = (a, b, w, len, mun, mup, X) => {
      const x = (psi[b] - psi[a]) / VT, Bp = bern(x), Bm = Bp + x;
      const jn = mun > 0 ? ((q * VT * mun) / len) * (n[b] * Bp - n[a] * Bm) : 0;
      const jp = mup > 0 ? ((-q * VT * mup) / len) * (p[b] * Bm - p[a] * Bp) : 0;
      const J = jn + (S.holes ? jp : 0);
      if (X) { Jnx[a] += jn; Jnx[b] += jn; Jpx[a] += jp; Jpx[b] += jp; cntX[a]++; cntX[b]++; }
      else { Jny[a] += jn; Jny[b] += jn; Jpy[a] += jp; Jpy[b] += jp; cntY[a]++; cntY[b]++; }
      const ca = cont[a], cb = cont[b];
      if (ca > 0 && ca !== cb) I[ca] += J * w;
      if (cb > 0 && cb !== ca) I[cb] -= J * w;
    };
    for (let j = 0; j < ny; j++) for (let i = 0; i < cx; i++) { const e = j * cx + i, k = j * nx + i; if (hW[e] > 0) edge(k, k + 1, hW[e], hx[i], S.muH[e], S.muHp[e], true); }
    for (let j = 0; j < ny - 1; j++) for (let i = 0; i < nx; i++) { const e = j * nx + i; if (vW[e] > 0) edge(e, e + nx, vW[e], hy[j], S.muV[e], S.muVp[e], false); }
    for (let k = 0; k < N; k++) {
      if (cntX[k]) { Jnx[k] /= cntX[k]; Jpx[k] /= cntX[k]; }
      if (cntY[k]) { Jny[k] /= cntY[k]; Jpy[k] /= cntY[k]; }
    }
    const toUm = 1e-4; // A/cm(깊이당) → A/µm
    const sol = {
      dev, psi: Float64Array.from(psi), n: Float64Array.from(n), p: Float64Array.from(p), phin, phip, Ex, Ey, Emag, Jnx, Jny, Jpx, Jpy,
      Id: I[2] * toUm, Is: I[1] * toUm, Ib: I[3] * toUm, Ig: 0, bias: Object.assign({}, S.bias), holes: S.holes,
      muH: Float64Array.from(S.muH), muV: Float64Array.from(S.muV), muHp: Float64Array.from(S.muHp), muVp: Float64Array.from(S.muVp),
      mobility: opt.model,
    };
    return sol;
  }

  /* ------------------------------------------------------------ 풀이기 */
  function stateFromSol(dev, sol, holes) {
    const S = newState(dev, holes);
    S.psi.set(sol.psi); S.n.set(sol.n); S.p.set(sol.p); S.bias = Object.assign({}, sol.bias);
    if (sol.muH) { S.muH.set(sol.muH); S.muV.set(sol.muV); S.muHp.set(sol.muHp); S.muVp.set(sol.muVp); }
    if (!holes || !sol.holes) fillHoles(dev, S);
    return S;
  }
  /**
   * 한 바이어스점의 단계 풀이기(수렴 과정을 프레임마다 그리기 위함).
   *   bias {vg, vd, vs, vb}, opt {init (이전 sol, 없으면 같은 vg의 평형), method: "newton"|"gummel", mobility, holes, tol, maxIter, dvMax}
   *   .step() → {iter, dPsi, dN, res, damp}, .done, .converged, .history, .solution() → sol
   * init과 바이어스가 크게 다르면 한 번에 뛰므로 뉴턴이 발산할 수 있다(5장의 교훈). 안전한 풀이는 TC.mos2d.
   */
  TC.mosSolver = function (dev, bias, opt = {}) {
    const holes = !!opt.holes, b = normBias(bias), model = opt.mobility || "full";
    let S;
    if (opt.init) S = stateFromSol(dev, opt.init, holes);
    else { S = stateFromSol(dev, TC.poisson2d(dev, { vg: b.vg, vb: b.vb, vs: b.vb, vd: b.vb }), holes); }
    applyBC(dev, S, b);
    if (!holes) fillHoles(dev, S);
    const o = { mobility: model, dvMax: opt.dvMax != null ? opt.dvMax : 0.5, inner: opt.inner };
    const tol = opt.tol || 1e-5, maxIter = opt.maxIter || (opt.method === "gummel" ? 200 : 40), W_ = {};
    const self = {
      dev, bias: b, history: [], iter: 0, done: false, converged: false, failed: false, state: S,
      step() {
        if (self.done) return self.history[self.history.length - 1];
        const lh = self.history[self.history.length - 1];
        S.kf = opt.picard ? 0 : lh && lh.dPsi < 1e-2 ? 1 : 0; // 속도 포화 미분은 해 가까이에서만(멀면 피카르)
        updateMobility(dev, S, o);
        const r = opt.method === "gummel" ? gummelStep(dev, S, o) : newtonStep(dev, S, W_, o);
        self.iter++;
        const h = { iter: self.iter, dPsi: r.dPsi, dN: r.dN, res: r.res, damp: r.damp };
        self.history.push(h);
        if (opt.onIter) opt.onIter(h);
        const ok = opt.method === "gummel" ? r.dPsi < tol && r.dN < 1e-3 : r.dPsi < tol && r.dN < 1e-3;
        if (!isFinite(r.dPsi) || r.dPsi > 50) { self.done = true; self.failed = true; }
        else if (ok) { self.done = true; self.converged = true; }
        else if (self.iter >= maxIter) self.done = true;
        return h;
      },
      run() { while (!self.done) self.step(); return self.solution(); },
      solution() {
        const sol = finish(dev, S, { model });
        sol.iters = self.iter; sol.history = self.history; sol.converged = self.converged;
        return sol;
      },
    };
    return self;
  };
  /**
   * 드리프트-확산 한 바이어스점(정상 상태). 연속법: init.bias에서 목표까지 maxStep(V) 간격으로 걷고, 실패하면 간격을 반으로.
   *   bias {vg, vd, vs=0, vb=0}, opt {init, mobility: "const"|"doping"|"surface"|"field"|"full"(기본), holes(기본 false: φp = vb 고정),
   *        method, maxIter, tol(V), maxStep(기본 0.3 V), onIter}
   * 반환 sol: {psi, n, p, phin, phip, Ex, Ey, Emag(V/cm), Jnx, Jny, Jpx, Jpy(A/cm²), Id, Is, Ib(A/µm, 들어가는 방향 +), iters, history, converged, bias}
   * 배열은 data[j·nx + i] (TC.putField 순서).
   */
  TC.mos2d = function (dev, bias, opt = {}) {
    const target = normBias(bias), maxStep = opt.maxStep || 0.3, keys = ["vg", "vs", "vd", "vb"];
    let cur = opt.init || TC.poisson2d(dev, { vg: target.vg, vb: target.vb, vs: target.vb, vd: target.vb });
    let from = normBias(cur.bias), last = cur, totalIt = 0, fails = 0, h = maxStep;
    const dist = () => Math.max(...keys.map((k) => Math.abs(target[k] - from[k])));
    for (;;) {
      const D = dist(), f = D <= h ? 1 : h / D, b = {};
      keys.forEach((k) => (b[k] = from[k] + (target[k] - from[k]) * f));
      const sol = TC.mosSolver(dev, b, Object.assign({}, opt, { init: cur })).run();
      totalIt += sol.iters;
      if (sol.converged) {
        cur = last = sol; from = normBias(b);
        if (f === 1) break;
        h = Math.min(maxStep, h * 1.5);
      } else {
        last = sol;
        if (++fails > 8) break;
        h *= 0.5;
      }
    }
    last.iters = totalIt;
    return last;
  };

  /* ------------------------------------------------------------ 스윕 */
  /**
   * 바이어스 스윕 생성기(한 점씩). spec: {vg: [..], vd} (Id-Vg) 또는 {vd: [..], vg} (Id-Vd), vs, vb.
   * opt: TC.mos2d 옵션 + {keep: true면 점마다 sol 보관, init}. → {next() → {done, value: 점}, run() → 결과, points, last}
   * 점: {vg, vd, id, is, ib, iters, converged, sol?}. 결과: {vg: [], vd: [], id: [], points}
   */
  TC.sweep2d = function (dev, spec, opt = {}) {
    const sweepVg = Array.isArray(spec.vg), list = sweepVg ? spec.vg : spec.vd;
    const pts = [];
    let sol = opt.init || null, prev = null, idx = 0;
    // 예측자: 앞의 두 해로 ψ, ln n을 선형 외삽해 다음 점의 초기값으로
    const predict = (v) => {
      if (!prev || !sol || opt.predict === false) return sol;
      const key = sweepVg ? "vg" : "vd", v1 = sol.bias[key], v0 = prev.bias[key];
      if (v1 === v0) return sol;
      const r = (v - v1) / (v1 - v0);
      if (r <= 0 || r > 2) return sol;
      const g = Object.assign({}, sol, { psi: Float64Array.from(sol.psi), n: Float64Array.from(sol.n), p: Float64Array.from(sol.p) });
      for (let k = 0; k < dev.N; k++) {
        g.psi[k] += r * (sol.psi[k] - prev.psi[k]);
        if (sol.n[k] > 0 && prev.n[k] > 0) g.n[k] *= Math.exp(Math.max(-5, Math.min(5, r * Math.log(sol.n[k] / prev.n[k]))));
        if (sol.p[k] > 0 && prev.p[k] > 0) g.p[k] *= Math.exp(Math.max(-5, Math.min(5, r * Math.log(sol.p[k] / prev.p[k]))));
      }
      return g;
    };
    const it = {
      points: pts, last: null,
      get done() { return idx >= list.length; },
      next() {
        if (idx >= list.length) return { done: true, value: undefined };
        const v = list[idx++];
        const b = { vg: sweepVg ? v : spec.vg, vd: sweepVg ? spec.vd : v, vs: spec.vs || 0, vb: spec.vb || 0 };
        const s1 = TC.mos2d(dev, b, Object.assign({}, opt, { init: predict(v) }));
        prev = sol; sol = s1;
        it.last = sol;
        const pt = { vg: b.vg, vd: b.vd, id: sol.Id, is: sol.Is, ib: sol.Ib, iters: sol.iters, converged: sol.converged };
        if (opt.keep) pt.sol = sol;
        pts.push(pt);
        return { done: false, value: pt };
      },
      result() { return { vg: pts.map((q) => q.vg), vd: pts.map((q) => q.vd), id: pts.map((q) => q.id), points: pts, last: it.last }; },
      run() { while (!it.done) it.next(); return it.result(); },
    };
    return it;
  };
  /** Id-Vg: spec {vd, vg: [..]} → {vg, id (A/µm), points, last} */
  TC.idvg = (dev, spec, opt) => TC.sweep2d(dev, { vd: spec.vd, vg: spec.vg, vs: spec.vs, vb: spec.vb }, opt).run();
  /** Id-Vd: spec {vg, vd: [..]} */
  TC.idvd = (dev, spec, opt) => TC.sweep2d(dev, { vg: spec.vg, vd: spec.vd, vs: spec.vs, vb: spec.vb }, opt).run();

  /* ------------------------------------------------------------ 추출 */
  /**
   * 문턱 전압(V). method "cc"(기본): Id = icc 가 되는 Vg (log 보간). icc 기본 = 1e-7·W/L A → A/µm로 1e-7·(1000/L[nm]).
   * method "gm": 최대 gm 점의 선형 외삽 Vg − Id/gm (opt.vd를 주면 − vd/2).
   */
  TC.extractVt = function (vg, id, opt = {}) {
    if ((opt.method || "cc") === "gm") {
      const g = TC.gm(vg, id);
      let m = 0; g.forEach((v, i) => { if (v > g[m]) m = i; });
      return vg[m] - id[m] / g[m] - (opt.vd ? opt.vd / 2 : 0);
    }
    const icc = opt.icc || 1e-7 * (1000 / (opt.L || 45));
    for (let i = 1; i < vg.length; i++) {
      if (id[i - 1] < icc && id[i] >= icc) {
        const a = Math.log(Math.abs(id[i - 1])), b = Math.log(Math.abs(id[i]));
        return vg[i - 1] + ((Math.log(icc) - a) / (b - a)) * (vg[i] - vg[i - 1]);
      }
    }
    return NaN;
  };
  /** 문턱 아래 기울기(mV/dec): 이웃 점 사이 dVg/dlog10(Id)의 최소, Id가 [imin, imax] 안인 구간만(기본 1e-13 ~ 1e-6 A/µm) */
  TC.ss = function (vg, id, opt = {}) {
    const lo = opt.imin || 1e-13, hi = opt.imax || 1e-6;
    let best = Infinity;
    for (let i = 1; i < vg.length; i++) {
      if (id[i - 1] < lo || id[i] > hi || id[i] <= id[i - 1]) continue;
      const s = (1000 * (vg[i] - vg[i - 1])) / (Math.log10(id[i]) - Math.log10(id[i - 1]));
      if (s < best) best = s;
    }
    return best;
  };
  /** DIBL(mV/V) = (Vt,lin − Vt,sat)/(Vd,sat − Vd,lin). 인자는 숫자(Vt) 또는 {vt, vd} */
  TC.dibl = function (lin, sat, vdLin = 0.05, vdSat = 1) {
    const a = typeof lin === "number" ? { vt: lin, vd: vdLin } : lin, b = typeof sat === "number" ? { vt: sat, vd: vdSat } : sat;
    return (1000 * (a.vt - b.vt)) / (b.vd - a.vd);
  };
  /** 전달 전도도 gm = dId/dVg (중앙 차분, 배열) */
  TC.gm = function (vg, id) {
    const n = vg.length;
    return vg.map((_, i) => {
      const a = Math.max(0, i - 1), b = Math.min(n - 1, i + 1);
      return (id[b] - id[a]) / (vg[b] - vg[a]);
    });
  };

  /* ------------------------------------------------------------ 후처리 도구 */
  /** 단면: field(노드 배열) 를 x = 상수 또는 y = 상수 선에서 → {s: 좌표 nm, v: 값}. dev 대신 {xs, ys, nx, ny} 가능 */
  TC.cutline = function (field, dev, at) {
    const xs = dev.xs, ys = dev.ys, nx = xs.length, ny = ys.length;
    const loc = (a, v) => { let lo = 0, hi = a.length - 1; if (v <= a[0]) return [0, 0]; if (v >= a[hi]) return [hi - 1, 1]; while (hi - lo > 1) { const m = (lo + hi) >> 1; if (a[m] > v) hi = m; else lo = m; } return [lo, (v - a[lo]) / (a[lo + 1] - a[lo])]; };
    if (at.x != null) {
      const [i, t] = loc(xs, at.x);
      return { s: Array.from(ys), v: Array.from(ys, (_, j) => field[j * nx + i] * (1 - t) + field[j * nx + i + 1] * t) };
    }
    const [j, t] = loc(ys, at.y);
    return { s: Array.from(xs), v: Array.from(xs, (_, i) => field[j * nx + i] * (1 - t) + field[(j + 1) * nx + i] * t) };
  };
  /**
   * 충돌 이온화(사후 처리): G = αn(Eeff)·|Jn|/q (+ holes일 때 정공 항), 기판 전류 Isub = q∫G dA (A/µm, 생성 정공이 모두 기판으로).
   * 가열 전계 Eh = max(0, E·Ĵn)(전자를 운동 방향으로 가속하는 성분). opt.relax(nm, 기본 50): 에너지 이완 길이 λ로
   * 전자 진행 방향(가로)을 따라 Eeff = ∫Eh e^{−s/λ} ds/λ 로 지연시킨다(비국소 보정). relax: 0이면 국소 전계 모델(짧은 채널에서 과대).
   * 반환 {G (cm⁻³s⁻¹), Eeff (V/cm), Isub, Gmax, at: {x, y}}. 해에 되먹이지 않는다.
   */
  TC.impact2d = function (dev, sol, opt = {}) {
    const { N, nx, ny, xs, area, kind } = dev, G = new Float64Array(N), Eh = new Float64Array(N), Ee = new Float64Array(N);
    const lam = opt.relax != null ? opt.relax : 50;
    for (let k = 0; k < N; k++) {
      if (kind[k] !== 1) continue;
      const jx = sol.Jnx[k], jy = sol.Jny[k], J = Math.hypot(jx, jy);
      if (J > 0) Eh[k] = Math.max(0, (sol.Ex[k] * jx + sol.Ey[k] * jy) / J);
    }
    if (lam > 0) {
      const f = new Float64Array(nx), bk = new Float64Array(nx);
      for (let j = 0; j < ny; j++) {
        const r = j * nx;
        for (let i = 0; i < nx; i++) { const w = i ? Math.exp(-(xs[i] - xs[i - 1]) / lam) : 0; f[i] = (i ? f[i - 1] * w : 0) + Eh[r + i] * (1 - w); }
        for (let i = nx - 1; i >= 0; i--) { const w = i < nx - 1 ? Math.exp(-(xs[i + 1] - xs[i]) / lam) : 0; bk[i] = (i < nx - 1 ? bk[i + 1] * w : 0) + Eh[r + i] * (1 - w); }
        for (let i = 0; i < nx; i++) Ee[r + i] = sol.Jnx[r + i] <= 0 ? f[i] : bk[i];
      }
    } else Ee.set(Eh);
    let I = 0, gmax = 0, at = { x: 0, y: 0 };
    for (let k = 0; k < N; k++) {
      if (kind[k] !== 1) continue;
      let g = (TC.alphaII(Ee[k], "n") * Math.hypot(sol.Jnx[k], sol.Jny[k])) / TC.q;
      if (sol.holes) {
        const px = sol.Jpx[k], py = sol.Jpy[k], P = Math.hypot(px, py);
        if (P > 0) g += (TC.alphaII(Math.max(0, (sol.Ex[k] * px + sol.Ey[k] * py) / P), "p") * P) / TC.q;
      }
      G[k] = g; I += g * area[k];
      if (g > gmax) { gmax = g; at = { x: xs[k % nx], y: dev.ys[(k / nx) | 0] }; }
    }
    return { G, Eeff: Ee, Isub: TC.q * I * 1e-4, Gmax: gmax, at };
  };
  /** 채널 표면(깊이 y nm, 기본 0.5) 가로 전계 Ex(V/cm) 단면과 최댓값 → {s, v, max, xAt} */
  TC.surfaceField = function (dev, sol, y = 0.5) {
    const c = TC.cutline(sol.Ex, dev, { y });
    let m = 0; c.v.forEach((v, i) => { if (Math.abs(v) > Math.abs(c.v[m])) m = i; });
    return { s: c.s, v: c.v, max: Math.abs(c.v[m]), xAt: c.s[m] };
  };
  /* ------------------------------------------------------------ 빠른 압축 모델 */
  // 2D TN-45 결과에 맞춘 보정 상수(TC.mosCompactParams 안에서 물리량에 곱하거나 더한다)
  TC.COMPACT_CAL = { dtinv: 0.0924, vt0: -0.0681, a: 3.3, lam: 0.727, lamd: 1.806, b: 0.2317, n1: 0, vx0: 5.806e6, mu: 2.524, beta: 1, rs: 56.3, alpha: 1.138, pm: 2.23 };
  /**
   * 압축 모델 매개변수(가상 소스형). p: TN-45 매개변수(+ dopingFn: (x,y)→net 이면 그것으로 Na_eff·Leff를 구한다).
   * → {leff (nm), naEff (cm⁻³), wdep (nm), lambda (nm), cinv (F/cm²), vtLong, vt0 (Vd=0 문턱), dibl (V/V), n, mu (cm²/Vs), vx0 (cm/s), rs (Ω·µm)}
   * 물리: Vt,long = VFB + 2φF + Qdep/Cox, 단채널 ΔVt ∝ (Vbi − 2φF)·e^{−Leff/2λ}, DIBL ∝ e^{−Leff/2λ}, λ = √(εsi/εox·tox·Wdep)
   */
  TC.mosCompactParams = function (p, opt = {}) {
    p = Object.assign({}, TC.TN45, p);
    const c = Object.assign({}, TC.COMPACT_CAL, opt.cal), es = TC.MAT.si.eps * TC.eps0, eo = TC.MAT.ox.eps * TC.eps0;
    const f = p.dopingFn || ((x, y) => TC.tn45Doping(x, y, p));
    const xj = f(0, 0.5) > 0 ? 0.5 : TC.bisect((x) => f(x, 0.5), 0, p.Lg / 2 + p.spacer);
    const leff = Math.max(2 * xj, 2);
    let wd = 15, na = 1e18, phiF = 0.45;
    for (let it = 0; it < 4; it++) {
      let s = 0, m = 0;
      for (let a = 0; a <= 8; a++) for (let b = 0; b <= 8; b++) {
        const x = (-0.5 + a / 8) * leff, y = 0.3 + (b / 8) * wd;
        s += Math.pow(Math.max(-f(x, y), 1e15), c.pm); m++;
      }
      na = Math.pow(s / m, 1 / c.pm); phiF = VT * Math.log(na / NI);
      wd = Math.sqrt((2 * es * 2 * phiF) / (TC.q * na)) / NM;
    }
    const tinv = p.eot + c.dtinv, cox = eo / (p.eot * NM), cinv = eo / (tinv * NM);
    const gateOff = p.gateWf != null ? TC.MAT.si.chi + TC.Eg(300) / 2 - p.gateWf : VT * Math.asinh(p.Npoly / (2 * NI));
    const vfb = -gateOff - phiF, qd = Math.sqrt(2 * TC.q * es * na * 2 * phiF);
    const vtLong = vfb + 2 * phiF + qd / cox;
    const lam = c.lam * Math.sqrt((TC.MAT.si.eps / TC.MAT.ox.eps) * p.eot * wd), e = Math.exp(-leff / (2 * lam));
    const vbi = VT * Math.log((na * p.Next) / (NI * NI));
    const vt0 = vtLong - c.a * 2 * (vbi - 2 * phiF) * (e + 2 * e * e) + c.vt0;
    const ed = Math.exp(-leff / (2 * c.lamd * lam)), dibl = c.b * (ed + 2 * ed * ed);
    const cdep = es / (wd * NM), n = (1 + cdep / cinv) * (1 + c.n1 * e);
    const mu = c.mu / (1 / TC.mobCT(na, "n") + 1 / 240);
    return { leff, naEff: na, wdep: wd, lambda: lam, tinv, cinv, cox, vtLong, vt0, dibl, n, mu, vx0: c.vx0, beta: c.beta, rs: c.rs, alpha: c.alpha, phiF };
  };
  /** 압축 모델 Id (A/µm) at (vg, vd), vs = vb = 0. p는 TN-45 매개변수 또는 TC.mosCompactParams 결과(.cinv가 있으면 그대로) */
  TC.mosCompact = function (p, vg, vd) {
    const m = p && p.cinv ? p : TC.mosCompactParams(p);
    const sgn = vd < 0 ? -1 : 1;
    vd = Math.abs(vd);
    const core = (vgs, vds) => {
      const vt = m.vt0 - m.dibl * vds, a = m.alpha, nvt = m.n * VT;
      const Ff = 1 / (1 + Math.exp((vgs - (vt - (a * VT) / 2)) / (a * VT)));
      const qi = m.cinv * nvt * Math.log1p(Math.exp((vgs - (vt - a * VT * Ff)) / nvt));
      const vgt = Math.max(qi / m.cinv, 2 * nvt);
      const v = 1 / (1 / m.vx0 + (2 * m.leff * NM) / (m.mu * vgt));
      const vdsat = ((2 * v * m.leff * NM) / m.mu) * (1 - Ff) + VT * Ff;
      const r = vds / vdsat, Fs = r / Math.pow(1 + Math.pow(r, m.beta), 1 / m.beta);
      return qi * v * Fs * 1e-4;
    };
    let id = core(vg, vd);
    for (let it = 0; it < 40 && m.rs > 0; it++) {
      const nid = core(vg - id * m.rs, Math.max(vd - 2 * id * m.rs, 0));
      if (Math.abs(nid - id) < 1e-15 + 1e-7 * id) { id = nid; break; }
      id = 0.5 * (id + nid);
    }
    return sgn * id;
  };

  /* ------------------------------------------------------------ 변동성: 펠그롬, 무작위 도펀트 */
  /**
   * 무작위 도펀트(RDF)에 의한 σVt(V): σ = (q·tinv/εox)·√(Na·Wdep/(3·W·L)).
   * p: TN-45 매개변수(Na_eff, Wdep, tinv는 압축 모델에서) 또는 {na, wdep (nm), tinv (nm)}. W, L: nm.
   * → {sigma (V), avt (mV·µm), na, wdep, tinv}
   */
  TC.pelgrom = function (p, W, L) {
    let na, wd, tinv;
    if (p && p.na != null) { na = p.na; wd = p.wdep; tinv = p.tinv; }
    else { const m = TC.mosCompactParams(p); na = m.naEff; wd = m.wdep; tinv = m.tinv; L = L || m.leff; }
    W = W || 1000; L = L || 45;
    const sigma = ((TC.q * tinv * NM) / (TC.MAT.ox.eps * TC.eps0)) * Math.sqrt((na * wd * NM) / (3 * W * NM * L * NM));
    return { sigma, avt: sigma * 1e3 * Math.sqrt((W * L) / 1e6), na, wdep: wd, tinv };
  };
  function rngSeed(seed) { let a = seed >>> 0; return function () { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  function poissonRnd(lam, r) {
    if (lam > 30) { const u = Math.max(r(), 1e-12), v = r(); return Math.max(0, Math.round(lam + Math.sqrt(lam) * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v))); }
    const L = Math.exp(-lam);
    let k = 0, q = 1;
    do { k++; q *= r(); } while (q > L);
    return k - 1;
  }
  /**
   * 무작위 도펀트 표본: 노드 제어 체적 × 폭 W(nm, 기본 게이트 길이) 안의 도너·억셉터 개수를 푸아송으로 뽑아 도핑을 바꾼 새 dev.
   * 2D 단면은 폭 방향으로 균일하다고 보므로 도펀트 하나가 폭 W에 번진 전하가 된다. opt {W, region: {x0, x1, y1} (nm, 기본 채널 주변)}
   */
  TC.rdfSample = function (dev, seed = 1, opt = {}) {
    const r = rngSeed(seed), W = (opt.W || dev.L) * NM, nx = dev.nx;
    const reg = opt.region || { x0: -dev.L / 2 - 15, x1: dev.L / 2 + 15, y1: 40 };
    const C = Float64Array.from(dev.C), Ctot = Float64Array.from(dev.Ctot);
    for (let k = 0; k < dev.N; k++) {
      if (dev.kind[k] !== 1 || dev.dir[k]) continue;
      const x = dev.xs[k % nx], y = dev.ys[(k / nx) | 0];
      if (x < reg.x0 || x > reg.x1 || y > reg.y1) continue;
      const V = dev.area[k] * W, nd = 0.5 * (dev.Ctot[k] + dev.C[k]), na = 0.5 * (dev.Ctot[k] - dev.C[k]);
      const Nd = poissonRnd(Math.max(nd, 0) * V, r) / V, Na = poissonRnd(Math.max(na, 0) * V, r) / V;
      C[k] = Nd - Na; Ctot[k] = Nd + Na;
    }
    const d = Object.assign({}, dev, { C, Ctot, rdfSeed: seed });
    d.mu0 = edgeMuDoping(d);
    return d;
  };

  /* ------------------------------------------------------------ 삼각 격자 도구 (격자 장) */
  function circum(a, b, c) {
    const d = 2 * (a[0] * (b[1] - c[1]) + b[0] * (c[1] - a[1]) + c[0] * (a[1] - b[1]));
    const a2 = a[0] * a[0] + a[1] * a[1], b2 = b[0] * b[0] + b[1] * b[1], c2 = c[0] * c[0] + c[1] * c[1];
    const x = (a2 * (b[1] - c[1]) + b2 * (c[1] - a[1]) + c2 * (a[1] - b[1])) / d, y = (a2 * (c[0] - b[0]) + b2 * (a[0] - c[0]) + c2 * (b[0] - a[0])) / d;
    return [x, y, (x - a[0]) * (x - a[0]) + (y - a[1]) * (y - a[1])];
  }
  /** 들로네 삼각분할(Bowyer–Watson, O(n²)). points [[x,y],...] → [[i,j,k],...] (반시계) */
  TC.delaunay = function (points) {
    const P = points.slice(), n = P.length;
    const [x0, x1] = TC.minmax(P.map((q) => q[0])), [y0, y1] = TC.minmax(P.map((q) => q[1]));
    const d = Math.max(x1 - x0, y1 - y0) || 1, cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
    P.push([cx - 20 * d, cy - 10 * d], [cx + 20 * d, cy - 10 * d], [cx, cy + 20 * d]);
    let tris = [{ v: [n, n + 1, n + 2], c: circum(P[n], P[n + 1], P[n + 2]) }];
    for (let i = 0; i < n; i++) {
      const p = P[i], bad = [], keep = [];
      tris.forEach((t) => ((p[0] - t.c[0]) ** 2 + (p[1] - t.c[1]) ** 2 < t.c[2] * (1 - 1e-12) ? bad : keep).push(t));
      const edges = new Map();
      bad.forEach((t) => {
        for (let e = 0; e < 3; e++) {
          const a = t.v[e], b = t.v[(e + 1) % 3], key = a < b ? a + "," + b : b + "," + a, m = edges.get(key);
          if (m) m.n++; else edges.set(key, { a, b, n: 1 });
        }
      });
      edges.forEach((e) => { if (e.n === 1) keep.push({ v: [e.a, e.b, i], c: circum(P[e.a], P[e.b], p) }); });
      tris = keep;
    }
    return tris.filter((t) => t.v.every((v) => v < n)).map((t) => {
      const [a, b, c] = t.v, cr = (P[b][0] - P[a][0]) * (P[c][1] - P[a][1]) - (P[b][1] - P[a][1]) * (P[c][0] - P[a][0]);
      return cr >= 0 ? [a, b, c] : [a, c, b];
    });
  };
  /** 삼각형 외심 [[x, y], ...] */
  TC.circumcenters = (points, tris) => tris.map(([a, b, c]) => circum(points[a], points[b], points[c]).slice(0, 2));
  /**
   * 보로노이 셀(박스 적분의 제어 체적): 점마다 이웃 삼각형 외심을 각도순으로 이은 다각형.
   * → [{i, poly: [[x,y],...], closed (경계 점이 아니면 true), area}]
   */
  TC.voronoiCells = function (points, tris) {
    const cc = TC.circumcenters(points, tris), inc = points.map(() => []), ecount = new Map();
    tris.forEach((t, k) => t.forEach((v, e) => {
      inc[v].push(k);
      const b = t[(e + 1) % 3], key = v < b ? v + "," + b : b + "," + v;
      ecount.set(key, (ecount.get(key) || 0) + 1);
    }));
    const onHull = new Uint8Array(points.length);
    ecount.forEach((c, key) => { if (c === 1) key.split(",").forEach((v) => (onHull[+v] = 1)); });
    return points.map((p, i) => {
      const poly = inc[i].map((k) => cc[k]).sort((u, v) => Math.atan2(u[1] - p[1], u[0] - p[0]) - Math.atan2(v[1] - p[1], v[0] - p[0]));
      let area = 0;
      for (let k = 0; k < poly.length; k++) { const a = poly[k], b = poly[(k + 1) % poly.length]; area += a[0] * b[1] - b[0] * a[1]; }
      return { i, poly, closed: !onHull[i], area: onHull[i] ? NaN : Math.abs(area) / 2 };
    });
  };
  /**
   * 삼각 격자 품질: 각도(도), 둔각 삼각형 수, 비들로네 변(마주 보는 두 각의 합 > 180°, 박스 적분 결합 계수가 음수가 된다) 수.
   * → {minAngle, maxAngle, obtuse, obtuseList, badEdges, badEdgeList: [[i,j],...]}
   */
  TC.meshQuality = function (points, tris) {
    let minA = 180, maxA = 0, obtuse = 0;
    const obtuseList = [], opp = new Map();
    tris.forEach((t, k) => {
      let isOb = false;
      for (let e = 0; e < 3; e++) {
        const a = points[t[e]], b = points[t[(e + 1) % 3]], c = points[t[(e + 2) % 3]];
        const u = [b[0] - a[0], b[1] - a[1]], v = [c[0] - a[0], c[1] - a[1]];
        const ang = (Math.acos(Math.max(-1, Math.min(1, (u[0] * v[0] + u[1] * v[1]) / (Math.hypot(u[0], u[1]) * Math.hypot(v[0], v[1]))))) * 180) / Math.PI;
        minA = Math.min(minA, ang); maxA = Math.max(maxA, ang);
        if (ang > 90 + 1e-9) isOb = true;
        const i = t[(e + 1) % 3], j = t[(e + 2) % 3], key = i < j ? i + "," + j : j + "," + i; // 점 a가 마주 보는 변
        opp.set(key, (opp.get(key) || 0) + ang);
      }
      if (isOb) { obtuse++; obtuseList.push(k); }
    });
    const badEdgeList = [];
    opp.forEach((s, key) => { if (s > 180 + 1e-9) badEdgeList.push(key.split(",").map(Number)); });
    return { minAngle: minA, maxAngle: maxA, obtuse, obtuseList, badEdges: badEdgeList.length, badEdgeList };
  };

  /* ------------------------------------------------------------ 2D 소자 그리기 (브라우저) */
  const FIELDS = {
    psi: { key: "psi", map: "turbo", label: "ψ (V)", where: "active" },
    phin: { key: "phin", map: "turbo", label: "φn (V)", where: "si" },
    n: { key: "n", map: "inferno", log: true, label: "n (cm⁻³)", where: "si", lo: 2, hi: 20.5 },
    p: { key: "p", map: "inferno", log: true, label: "p (cm⁻³)", where: "si", lo: 2, hi: 20.5 },
    Emag: { key: "Emag", map: "turbo", label: "|E| (V/cm)", where: "si" },
    Ex: { key: "Ex", map: "div", label: "Ex (V/cm)", where: "si", sym: true },
    Ey: { key: "Ey", map: "div", label: "Ey (V/cm)", where: "si", sym: true },
    J: { map: "inferno", log: true, label: "|Jn| (A/cm²)", where: "si" },
    G: { map: "inferno", log: true, label: "G (cm⁻³s⁻¹)", where: "si" },
    doping: { map: "doping", label: "Nd − Na (cm⁻³)", where: "si" },
  };
  /**
   * 2D 소자 필드 맵. opt {field: "psi"|"phin"|"n"|"p"|"Emag"|"Ex"|"Ey"|"J"|"G"|"doping", data (노드 배열 직접), map, lo, hi, log, label,
   *   view {x0,x1,y0,y1} nm, struct (게이트·산화막·스페이서 겹쳐 그리기, 기본 true), mesh (격자선), junction (금속학적 접합 점선, 기본 true),
   *   contours: [값...] (필드 단위, log면 log10 값), decades (log 자동 범위 최대 폭, 기본 12), arrows (전자 흐름 화살표, true 또는 가로 개수), colorbar: {x,y,w,h}, res}
   * sol은 doping일 때 null 가능. 반환 {X, Y, toNm(px, py), view, lo, hi, map, log, label}. 브라우저 전용(TC.putField).
   */
  TC.drawDevice2d = function (ctx, box, dev, sol, opt = {}) {
    const { nx, ny, xs, ys } = dev, cx = nx - 1, F = FIELDS[opt.field || "psi"] || FIELDS.psi;
    const view = opt.view || { x0: xs[0], x1: xs[nx - 1], y0: ys[0], y1: ys[ny - 1] };
    let data = opt.data;
    if (!data) {
      if (opt.field === "doping") data = dev.C;
      else if (opt.field === "J") data = sol.Jnx.map((v, k) => Math.hypot(v, sol.Jny[k]));
      else if (opt.field === "G") data = TC.impact2d(dev, sol).G;
      else data = sol[F.key];
    }
    const siOnly = F.where === "si", log = opt.log != null ? opt.log : !!F.log, map = opt.map || F.map;
    let lo = opt.lo, hi = opt.hi;
    if (lo == null || hi == null) {
      let a = Infinity, b = -Infinity;
      for (let k = 0; k < data.length; k++) {
        if (dev.kind[k] === 0 || (siOnly && dev.kind[k] !== 1)) continue;
        const ii = k % nx, jj = (k / nx) | 0;
        if (xs[ii] < view.x0 || xs[ii] > view.x1 || ys[jj] < view.y0 || ys[jj] > view.y1) continue;
        let v = data[k];
        if (log) { if (!(v > 0)) continue; v = Math.log10(v); }
        if (v < a) a = v;
        if (v > b) b = v;
      }
      if (log && F.lo != null) { a = Math.max(a, F.lo); b = Math.min(b, F.hi); }
      if (F.sym) { const m = Math.max(Math.abs(a), Math.abs(b)); a = -m; b = m; }
      if (log && b - a < 1) a = b - 1;
      if (log && b - a > (opt.decades || 12)) a = b - (opt.decades || 12);
      if (lo == null) lo = a;
      if (hi == null) hi = b;
    }
    const cmatAt = (i, j) => dev.cmat[Math.min(j, ny - 2) * cx + Math.min(i, cx - 1)];
    const mask = (v, i, j) => { const m = cmatAt(i, j); return siOnly ? m === 0 : m <= 2 || m === 6; };
    const fo = { xs, ys, view, map, lo, hi, log, mask, res: opt.res || 0.5 };
    const isDop = opt.field === "doping" && !opt.data;
    if (isDop) { fo.fn = (v) => 0.5 + TC.slog(v, 1e14) / 14; fo.log = false; }
    const X = (x) => box.x + ((x - view.x0) / (view.x1 - view.x0)) * box.w, Y = (y) => box.y + ((y - view.y0) / (view.y1 - view.y0)) * box.h;
    if (opt.struct !== false && dev.regions) TC.drawStruct(ctx, box, dev.regions.filter((r) => r.m !== "si"), view, { alpha: siOnly ? 1 : 0.35 });
    TC.putField(ctx, box, data, nx, ny, fo);
    const P = window.TB ? TB.palette() : { dim: "#888" };
    ctx.save();
    ctx.beginPath(); ctx.rect(box.x, box.y, box.w, box.h); ctx.clip();
    if (opt.struct !== false && dev.regions) {
      ctx.strokeStyle = P.dim; ctx.lineWidth = 1;
      dev.regions.forEach((r) => {
        if (r.m === "si") return;
        ctx.beginPath();
        if (r.poly) r.poly.forEach(([x, y], i) => (i ? ctx.lineTo(X(x), Y(y)) : ctx.moveTo(X(x), Y(y))));
        else ctx.rect(X(r.x0), Y(r.y0), X(r.x1) - X(r.x0), Y(r.y1) - Y(r.y0));
        ctx.closePath(); ctx.stroke();
      });
    }
    if (opt.mesh) {
      ctx.strokeStyle = opt.meshColor || "rgba(255,255,255,.35)"; ctx.lineWidth = 0.5; ctx.beginPath();
      for (let i = 0; i < nx; i++) if (xs[i] >= view.x0 && xs[i] <= view.x1) { ctx.moveTo(X(xs[i]), Y(Math.max(ys[0], view.y0))); ctx.lineTo(X(xs[i]), Y(Math.min(ys[ny - 1], view.y1))); }
      for (let j = 0; j < ny; j++) if (ys[j] >= view.y0 && ys[j] <= view.y1) { ctx.moveTo(X(Math.max(xs[0], view.x0)), Y(ys[j])); ctx.lineTo(X(Math.min(xs[nx - 1], view.x1)), Y(ys[j])); }
      ctx.stroke();
    }
    ctx.restore();
    if (opt.junction !== false) {
      const Cj = Float64Array.from(dev.C);
      for (let j = ny - 2; j >= 0; j--) for (let i = 0; i < nx; i++) if (dev.kind[j * nx + i] !== 1) Cj[j * nx + i] = Cj[(j + 1) * nx + i];
      TC.drawContours(ctx, box, Cj, nx, ny, [0], { xs, ys, view, color: opt.junctionColor || "rgba(255,255,255,.85)", width: 1.2, dash: [4, 3] });
    }
    if (opt.contours && opt.contours.length) {
      const cd = log ? Array.from(data, (v) => Math.log10(Math.max(v, 1e-300))) : data;
      TC.drawContours(ctx, box, cd, nx, ny, opt.contours, { xs, ys, view, color: opt.contourColor || "rgba(255,255,255,.7)", width: 1 });
    }
    if (opt.arrows && sol) {
      const na = opt.arrows === true ? 16 : opt.arrows, mb = Math.max(1, Math.round((na * box.h) / box.w));
      const jx = sol.Jnx, jy = sol.Jny, sx = box.w / (view.x1 - view.x0), sy = box.h / (view.y1 - view.y0);
      let jmax = 0;
      for (let k = 0; k < dev.N; k++) if (dev.kind[k] === 1) jmax = Math.max(jmax, Math.hypot(jx[k], jy[k]));
      const loc = (a, v) => { let l = 0, h = a.length - 1; while (h - l > 1) { const m = (l + h) >> 1; if (a[m] > v) h = m; else l = m; } return l; };
      ctx.save(); ctx.strokeStyle = opt.arrowColor || "rgba(255,255,255,.9)"; ctx.fillStyle = ctx.strokeStyle; ctx.lineWidth = 1.2;
      for (let a = 0; a < na; a++) for (let b = 0; b < mb; b++) {
        const x = view.x0 + ((a + 0.5) / na) * (view.x1 - view.x0), y = view.y0 + ((b + 0.5) / mb) * (view.y1 - view.y0);
        if (y <= 0) continue;
        const k = loc(ys, y) * nx + loc(xs, x);
        if (dev.kind[k] !== 1) continue;
        const ux = -jx[k] * sx, uy = -jy[k] * sy, m = Math.hypot(ux, uy), mj = Math.hypot(jx[k], jy[k]); // 전자 흐름 = −Jn
        if (!(mj > jmax * 1e-3)) continue;
        const L = (0.35 + 0.65 * Math.max(0, 1 + Math.log10(mj / jmax) / 3)) * (box.w / na) * 0.8;
        const px = X(x), py = Y(y), dx = (ux / m) * L, dy = (uy / m) * L, hx = px + dx / 2, hy = py + dy / 2, ang = Math.atan2(dy, dx);
        ctx.beginPath(); ctx.moveTo(px - dx / 2, py - dy / 2); ctx.lineTo(hx, hy); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(hx, hy); ctx.lineTo(hx - 4 * Math.cos(ang - 0.45), hy - 4 * Math.sin(ang - 0.45)); ctx.lineTo(hx - 4 * Math.cos(ang + 0.45), hy - 4 * Math.sin(ang + 0.45)); ctx.closePath(); ctx.fill();
      }
      ctx.restore();
    }
    const fmt = (v) => (fo.log ? "1e" + Math.round(v) : Math.abs(v) >= 1e4 ? v.toExponential(0) : String(+v.toPrecision(2)));
    const info = { lo, hi, map, log: !!fo.log, label: opt.label || F.label };
    if (opt.colorbar) {
      if (isDop) TC.colorbar(ctx, opt.colorbar, { map: "doping", label: info.label, ticks: [[0, "−1e21"], [0.5, "0"], [1, "1e21"]] });
      else TC.colorbar(ctx, opt.colorbar, { map, label: info.label, ticks: [[0, fmt(lo)], [0.5, fmt((lo + hi) / 2)], [1, fmt(hi)]] });
    }
    return Object.assign(info, { X, Y, view, toNm: (px, py) => [view.x0 + ((px - box.x) / box.w) * (view.x1 - view.x0), view.y0 + ((py - box.y) / box.h) * (view.y1 - view.y0)] });
  };
})();
