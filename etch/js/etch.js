/* Copyright (c) 2026 geniuskey and EtchBook contributors.
   Executable code: MIT (see ../LICENSE-MIT).
   Educational content and illustrations: CC-BY-4.0 (see ../LICENSE.md). */
/* ==========================================================================
   EtchBook 식각 엔진 — 전역 객체 ET
   모든 장이 같은 단면 모델을 쓰게 하는 공통 엔진이다. 단위는 nm, y는 아래로 +.

   1) ET.sim   — 셀 기반 단면 + 몬테카를로 입자(이온·라디칼·고분자 전구체).
                 이온은 각도 분포를 갖고 직선으로 날아와 표면을 깎거나 비스듬히
                 맞으면 반사된다. 라디칼은 붙을 확률(sticking)로 반응하거나 튕겨
                 나간다(크누센 수송). 고분자는 측벽에 쌓여 보호막이 된다.
                 → 이방성, 언더컷, ARDE, 보잉, 마이크로트렌칭, 패시팅, 노칭이
                   규칙을 따로 넣지 않아도 저절로 나온다.
   2) ET.wet   — 도달 시간(fast marching) 풀이. 재질마다 속도가 다른 등방성 습식 식각.
                 한 번 풀면 시간 슬라이더에 즉시 반응한다. (KOH 같은 결정 방향 식각은
                 장 안에서 기하로 그린다: (111)면 54.74°.)
   3) 측정과 그리기 — ET.measure, ET.draw, 등고선(프로파일의 시간 기록).
   ========================================================================== */
(function () {
  "use strict";
  const ET = (window.ET = {});
  const DEG = Math.PI / 180;

  /* ------------------------------------------------------------ materials */
  // key: CSS 변수 --m-<key> 로 색을 읽는다. name: 한국어 이름.
  const MAT = [
    null,
    { key: "si",   name: "실리콘" },
    { key: "ox",   name: "산화막 SiO₂" },
    { key: "nit",  name: "질화막 Si₃N₄" },
    { key: "poly", name: "폴리실리콘" },
    { key: "ac",   name: "비정질 탄소" },
    { key: "pr",   name: "레지스트" },
    { key: "sion", name: "SiON" },
    { key: "tin",  name: "TiN" },
    { key: "w",    name: "텅스텐" },
    { key: "al",   name: "알루미늄" },
    { key: "cu",   name: "구리" },
    { key: "lowk", name: "저유전막" },
    { key: "cr",   name: "크롬" },
    { key: "cfx",  name: "고분자 CFx" },
  ];
  const MI = {};
  MAT.forEach((m, i) => { if (m) MI[m.key] = i; });
  ET.MAT = MAT;
  ET.MI = MI;
  ET.matName = (k) => (MAT[MI[k]] ? MAT[MI[k]].name : k);
  const CFX = MI.cfx;

  /* ------------------------------------------------------------ rng */
  function rng(seed) {
    let a = (seed >>> 0) || 1;
    return function () {
      a |= 0; a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function gauss(r) { let u = 0; while (u === 0) u = r(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * r()); }
  ET.rng = rng;

  /* ------------------------------------------------------------ yields */
  /** 이온 강화 식각 수율의 입사각 의존(α: 표면 법선과 이루는 각, rad). 약 60°까지 거의 일정, 그 뒤 스치는 각에서 0으로. */
  ET.yIE = function (a) { const d = a / DEG; return d < 60 ? 1 : d > 89 ? 0 : (89 - d) / 29; };
  /** 물리 스퍼터 수율의 입사각 의존(야마무라형). 수직 입사에서 1, 약 65°에서 최대 약 1.7. */
  ET.ySP = function (a) { const c = Math.cos(a); if (c < 0.02) return 0; const u = 1 / c; return Math.pow(u, 1.8) * Math.exp(-0.76 * (u - 1)); };

  /* ------------------------------------------------------------ recipes */
  // mat: 재질별 계수. ie 이온 강화 식각, ch 자발(화학) 식각, sp 물리 스퍼터, pol 고분자가 쌓이는 정도.
  const RECIPES = {
    // 불화탄소(C4F8/Ar/O2) 산화막 식각. 산화막은 산소를 내놓아 고분자를 태우므로 pol이 작다.
    oxide: {
      label: "C₄F₈/Ar/O₂ 산화막 식각", target: "ox",
      ion: { flux: 1, sigma: 3, tilt: 0, energy: 1, reflect: 0.7, charge: 0 },
      neu: { flux: 40, stick: 0.05 },
      pol: { flux: 2.4, stick: 0.25, dep: 1, ion: 0.3, ionRemove: 1, chem: 0.25, p0: 0.4 },
      gamma: 1.2,
      mat: {
        ox:   { ie: 1.0,  ch: 0.0,   sp: 0.08, pol: 0.35 },
        nit:  { ie: 0.3,  ch: 0.0,   sp: 0.02, pol: 4.0 },
        si:   { ie: 0.30, ch: 0.0,   sp: 0.02, pol: 2.4 },
        poly: { ie: 0.30, ch: 0.0,   sp: 0.02, pol: 2.4 },
        ac:   { ie: 0.035, ch: 0.0,  sp: 0.008, pol: 0.6 },
        pr:   { ie: 0.22, ch: 0.0,   sp: 0.05, pol: 1.0 },
        lowk: { ie: 1.1,  ch: 0.0,   sp: 0.08, pol: 0.5 },
        tin:  { ie: 0.03, ch: 0.0,   sp: 0.03, pol: 1.5 },
      },
    },
    // 염소·브롬화수소 실리콘 식각. 측벽에 SiOxBry 보호막이 쌓인다.
    silicon: {
      label: "Cl₂/HBr/O₂ 실리콘 식각", target: "si",
      ion: { flux: 1, sigma: 4, tilt: 0, energy: 1, reflect: 0.6, charge: 0 },
      neu: { flux: 6, stick: 0.1 },
      pol: { flux: 0.5, stick: 0.2, dep: 1, ionRemove: 1, p0: 0.5 },
      gamma: 1,
      mat: {
        si:   { ie: 1.0,  ch: 0.03,  sp: 0.06, pol: 1.0 },
        poly: { ie: 1.0,  ch: 0.03,  sp: 0.06, pol: 1.0 },
        ox:   { ie: 0.02, ch: 0.0,   sp: 0.03, pol: 2.0 },
        nit:  { ie: 0.05, ch: 0.0,   sp: 0.03, pol: 2.0 },
        pr:   { ie: 0.30, ch: 0.0,   sp: 0.08, pol: 1.0 },
        ac:   { ie: 0.15, ch: 0.0,   sp: 0.05, pol: 1.0 },
      },
    },
    // SF6 실리콘 식각: 불소 라디칼이 바이어스 없이도 실리콘을 깎는다(등방성).
    sf6: {
      label: "SF₆ 화학적 식각", target: "si",
      ion: { flux: 0.3, sigma: 6, tilt: 0, energy: 0.3, reflect: 0.3, charge: 0 },
      neu: { flux: 6, stick: 0.05 },
      pol: { flux: 0, stick: 0.3, dep: 1, ionRemove: 1, p0: 0.5 },
      gamma: 0.5,
      mat: {
        si:   { ie: 0.4, ch: 0.9, sp: 0.02, pol: 1 },
        poly: { ie: 0.4, ch: 0.9, sp: 0.02, pol: 1 },
        ox:   { ie: 0.02, ch: 0.005, sp: 0.01, pol: 1 },
        nit:  { ie: 0.05, ch: 0.02, sp: 0.01, pol: 1 },
        pr:   { ie: 0.05, ch: 0.01, sp: 0.02, pol: 1 },
        ac:   { ie: 0.05, ch: 0.005, sp: 0.02, pol: 1 },
      },
    },
    // 아르곤 이온 밀링: 물리적 스퍼터만.
    argon: {
      label: "Ar 이온 밀링(물리 스퍼터)", target: "si",
      ion: { flux: 1, sigma: 2, tilt: 0, energy: 1, reflect: 0.2, charge: 0 },
      neu: { flux: 0, stick: 1 },
      pol: { flux: 0, stick: 0.3, dep: 1, ionRemove: 1, p0: 0.5 },
      gamma: 1,
      mat: {
        si: { ie: 0, ch: 0, sp: 0.5, pol: 1 }, poly: { ie: 0, ch: 0, sp: 0.5, pol: 1 },
        ox: { ie: 0, ch: 0, sp: 0.4, pol: 1 }, nit: { ie: 0, ch: 0, sp: 0.35, pol: 1 },
        pr: { ie: 0, ch: 0, sp: 0.6, pol: 1 }, ac: { ie: 0, ch: 0, sp: 0.25, pol: 1 },
        al: { ie: 0, ch: 0, sp: 0.6, pol: 1 }, cu: { ie: 0, ch: 0, sp: 0.9, pol: 1 },
        w:  { ie: 0, ch: 0, sp: 0.3, pol: 1 }, tin: { ie: 0, ch: 0, sp: 0.25, pol: 1 },
        cr: { ie: 0, ch: 0, sp: 0.6, pol: 1 },
      },
    },
    // 산소 플라스마: 탄소막·레지스트 식각/애싱.
    oxygen: {
      label: "O₂ 플라스마(탄소막 식각)", target: "ac",
      ion: { flux: 1, sigma: 3, tilt: 0, energy: 1, reflect: 0.6, charge: 0 },
      neu: { flux: 5, stick: 0.05 },
      pol: { flux: 0, stick: 0.3, dep: 1, ionRemove: 1, p0: 0.5 },
      gamma: 1,
      mat: {
        ac: { ie: 1.0, ch: 0.05, sp: 0.04, pol: 1 }, pr: { ie: 1.2, ch: 0.08, sp: 0.05, pol: 1 },
        sion: { ie: 0.01, ch: 0, sp: 0.02, pol: 1 }, ox: { ie: 0.005, ch: 0, sp: 0.02, pol: 1 },
        nit: { ie: 0.01, ch: 0, sp: 0.02, pol: 1 }, si: { ie: 0.005, ch: 0, sp: 0.02, pol: 1 },
        lowk: { ie: 0.1, ch: 0.02, sp: 0.03, pol: 1 },
      },
    },
  };
  ET.RECIPES = RECIPES;
  const clone = (o) => JSON.parse(JSON.stringify(o));
  /** 레시피 복사본. ET.recipe("oxide", { ion: { sigma: 6 }, mat: { ox: { ch: 0.1 } } }) 처럼 일부만 덮어쓴다. */
  ET.recipe = function (name, over) {
    const r = clone(RECIPES[name] || RECIPES.oxide);
    if (over) merge(r, over);
    return r;
  };
  function merge(a, b) {
    for (const k in b) {
      if (b[k] && typeof b[k] === "object" && !Array.isArray(b[k])) { if (!a[k] || typeof a[k] !== "object") a[k] = {}; merge(a[k], b[k]); }
      else a[k] = b[k];
    }
    return a;
  }
  ET.merge = merge;
  // 시간 단위: 기본 산화막 레시피의 이론적 openRate로 정규화(실제 셀 제거 속도와는 다름)
  const R0 = (function () {
    const R = RECIPES.oxide, mm = R.mat.ox, HI = R.ion.flux * R.ion.energy, HN = R.neu.flux * R.neu.stick;
    return mm.ie * HI * (HN / (HN + R.gamma * HI)) + mm.ch * HN + mm.sp * HI;
  })();
  ET.R0 = R0;

  /* ======================================================================
     ET.sim — 셀 단면 + 몬테카를로 입자
     ====================================================================== */
  /**
   * const s = ET.sim({ width: 40, height: 260, dx: 1, seed: 1 });
   *   width, height: nm. dx: 셀 크기(nm). 가로는 주기 경계(같은 무늬가 옆으로 되풀이된다).
   * s.layer("nit", 20).layer("ox", 160).layer("ac", 60)   아래에서 위로 평탄한 막을 쌓는다
   * s.open("ac", [[10, 30]], { taper: 0 })                  이 구간의 마스크를 연다(x는 nm). taper°는 열린 폭이 위로 넓어지는 각
   * s.paint((x, z) => key | null | undefined)              임의 모양. z는 바닥에서 잰 높이(nm). undefined면 그대로 둔다
   * s.setRecipe(ET.recipe("oxide"))
   * s.run(t)            시간 t(상대 단위: 기본 레시피의 이론적 openRate로 정규화)만큼 진행
   * s.step()            입자 한 묶음을 날리고 표면을 한 번 갱신
   */
  ET.sim = function (o) {
    o = o || {};
    const dx = o.dx || 1;
    const W = Math.max(4, Math.round((o.width || 40) / dx));
    const H = Math.max(4, Math.round((o.height || 200) / dx));
    const N = W * H;
    const S = {
      W, H, dx, width: W * dx, height: H * dx,
      mat: new Uint8Array(N), phi: new Float32Array(N), poly: new Float32Array(N),
      hi: new Float32Array(N), hs: new Float32Array(N), hr: new Float32Array(N), hn: new Float32Array(N), hp: new Float32Array(N),
      nx: new Float32Array(N), ny: new Float32Array(N), nstamp: new Int32Array(N),
      stamp: 1, t: 0, steps: 0, z: 0, // z: 쌓인 높이(셀)
      recipe: ET.recipe("oxide"),
      n: o.particles || 0, // 0이면 폭에 맞춰 자동
      rand: rng(o.seed || 7),
      periodic: o.periodic !== false,
      snaps: [], traces: [], wantTraces: 0,
      marks: {}, // 이름 붙인 높이(셀 행): 막 경계 등
      flux: { cells: [], rate: null, ion: null, neu: null, pol: null },
    };
    S.idx = (ix, iy) => iy * W + ix;

    /* ---------------- 형상 만들기 */
    S.layer = function (key, h) {
      const m = MI[key], rows = Math.max(1, Math.round(h / dx));
      const r1 = H - S.z, r0 = Math.max(0, r1 - rows);
      for (let iy = r0; iy < r1; iy++) for (let ix = 0; ix < W; ix++) { const c = iy * W + ix; S.mat[c] = m; S.phi[c] = 1; }
      S.marks[key + "Bot"] = r1; S.marks[key + "Top"] = r0;
      S.z += r1 - r0;
      S.marks.top = H - S.z;
      return S;
    };
    S.open = function (key, ranges, opt) {
      opt = opt || {};
      const m = MI[key], tp = Math.tan((opt.taper || 0) * DEG);
      const bot = S.marks[key + "Bot"], top = S.marks[key + "Top"];
      for (let iy = top; iy < bot; iy++) {
        const hup = (bot - iy - 0.5) * dx; // 막 바닥에서 위로 잰 높이
        for (const [a, b] of ranges) {
          const x0 = a - hup * tp, x1 = b + hup * tp;
          for (let ix = 0; ix < W; ix++) {
            const xc = (ix + 0.5) * dx;
            const c = iy * W + ix;
            if (S.mat[c] !== m) continue;
            const ov = Math.min(x1, (ix + 1) * dx) - Math.max(x0, ix * dx);
            if (ov <= 0) continue;
            const f = Math.min(1, ov / dx);
            if (f > 0.999 || (xc > x0 && xc < x1 && f > 0.5)) { S.mat[c] = 0; S.phi[c] = 0; }
            else S.phi[c] = Math.max(0, S.phi[c] - f);
            if (S.phi[c] <= 0.02) { S.mat[c] = 0; S.phi[c] = 0; }
          }
        }
      }
      return S;
    };
    S.paint = function (fn) {
      for (let iy = 0; iy < H; iy++) for (let ix = 0; ix < W; ix++) {
        const k = fn((ix + 0.5) * dx, (H - iy - 0.5) * dx);
        if (k === undefined) continue;
        const c = iy * W + ix;
        if (k === null || k === 0 || k === "") { S.mat[c] = 0; S.phi[c] = 0; }
        else { S.mat[c] = MI[k]; S.phi[c] = 1; }
      }
      return S;
    };
    S.setRecipe = function (r) { S.recipe = r; return S; };
    S.clone = function () {
      const c = ET.sim({ width: S.width, height: S.height, dx, seed: (S.rand() * 1e9) | 0, particles: S.n });
      c.mat.set(S.mat); c.phi.set(S.phi); c.poly.set(S.poly);
      c.z = S.z; c.t = S.t; c.marks = Object.assign({}, S.marks); c.recipe = clone(S.recipe);
      c.snaps = S.snaps.slice();
      return c;
    };
    /** 현재 상태를 저장/복원(시간 되감기용) */
    S.save = function () { return { mat: S.mat.slice(), phi: S.phi.slice(), poly: S.poly.slice(), t: S.t, steps: S.steps, snaps: S.snaps.slice() }; };
    S.load = function (st) { S.mat.set(st.mat); S.phi.set(st.phi); S.poly.set(st.poly); S.t = st.t; S.steps = st.steps; S.snaps = st.snaps.slice(); return S; };

    /* ---------------- 점유와 법선 */
    const occ = (ix, iy) => {
      if (iy >= H) return 1;
      if (iy < 0) return 0;
      if (ix < 0 || ix >= W) { if (!S.periodic) return ix < 0 ? occ(0, iy) : occ(W - 1, iy); ix = ((ix % W) + W) % W; }
      const c = iy * W + ix;
      return S.mat[c] ? S.phi[c] : 0;
    };
    S.occ = occ;
    // 반지름 4 셀의 가중 기울기 → 진공 쪽을 향하는 단위 법선(계단 모양 벽도 매끈한 법선을 갖도록 넓게 본다)
    const KW = [];
    for (let dy = -4; dy <= 4; dy++) for (let dxx = -4; dxx <= 4; dxx++) { const r2 = dxx * dxx + dy * dy; if (!r2 || r2 > 17) continue; KW.push([dxx, dy, Math.exp(-r2 / 8)]); }
    function normal(ix, iy) {
      const c = iy * W + ix;
      if (S.nstamp[c] === S.stamp) return c;
      let gx = 0, gy = 0;
      for (let k = 0; k < KW.length; k++) { const q = KW[k], v = occ(ix + q[0], iy + q[1]); gx += v * q[0] * q[2]; gy += v * q[1] * q[2]; }
      let L = Math.hypot(gx, gy);
      if (L < 1e-6) { gx = 0; gy = 1; L = 1; }
      S.nx[c] = -gx / L; S.ny[c] = -gy / L; S.nstamp[c] = S.stamp;
      return c;
    }
    S.normal = (ix, iy) => { const c = normal(ix, iy); return [S.nx[c], S.ny[c]]; };

    /* ---------------- 입자 추적 (격자 DDA) */
    // 결과는 hit 객체에 담는다: c(셀), x, y(진입점), ix, iy. 놓치면 c = -1
    const hit = { c: -1, x: 0, y: 0, ix: 0, iy: 0 };
    let yTop = 0; // 발사 높이(행)
    function trace(x, y, vx, vy, path) {
      let ix = Math.floor(x), iy = Math.floor(y);
      const sx = vx > 0 ? 1 : -1, sy = vy > 0 ? 1 : -1;
      const tdx = vx !== 0 ? Math.abs(1 / vx) : 1e30, tdy = vy !== 0 ? Math.abs(1 / vy) : 1e30;
      let tmx = vx !== 0 ? (vx > 0 ? ix + 1 - x : x - ix) * tdx : 1e30;
      let tmy = vy !== 0 ? (vy > 0 ? iy + 1 - y : y - iy) * tdy : 1e30;
      let t = 0;
      for (let k = 0; k < 6000; k++) {
        if (tmx < tmy) { t = tmx; tmx += tdx; ix += sx; }
        else { t = tmy; tmy += tdy; iy += sy; }
        if (iy < yTop) { hit.c = -1; if (path) path.push(x + vx * t, y + vy * t); return hit; }
        if (iy >= H) { iy = H - 1; }
        let jx = ix;
        if (jx < 0 || jx >= W) {
          if (!S.periodic) { hit.c = -1; return hit; }
          jx = ((jx % W) + W) % W;
        }
        const c = iy * W + jx;
        if (S.mat[c] && (S.mat[c] !== CFX || S.phi[c] >= 0.5)) {
          hit.c = c; hit.x = x + vx * t; hit.y = y + vy * t; hit.ix = jx; hit.iy = iy;
          // 주기 경계: 좌표를 상자 안으로 되돌린다
          if (S.periodic && (hit.x < 0 || hit.x >= W)) hit.x = ((hit.x % W) + W) % W;
          if (path) path.push(x + vx * t, y + vy * t);
          return hit;
        }
      }
      hit.c = -1;
      return hit;
    }
    // 대전(charging) 모드: 곡선 궤적을 작은 걸음으로 따라간다
    function traceCharged(x, y, vx, vy, q, path) {
      const st = 0.4;
      const yRef = S.marks.top != null ? S.marks.top : 0;
      const yDeep = deepest();
      for (let k = 0; k < 8000; k++) {
        const px = x, py = y;
        x += vx * st; y += vy * st;
        if (S.periodic) { if (x < 0) x += W; else if (x >= W) x -= W; }
        else if (x < 0 || x >= W) { hit.c = -1; return hit; }
        if (y < yTop) { hit.c = -1; if (path) path.push(x, y); return hit; }
        let iy = Math.floor(y), ix = Math.floor(x);
        if (iy >= H) iy = H - 1;
        const c = iy * W + ix;
        if (S.mat[c] && (S.mat[c] !== CFX || S.phi[c] >= 0.5)) { hit.c = c; hit.x = px; hit.y = py; hit.ix = ix; hit.iy = iy; if (path) path.push(x, y); return hit; }
        // 바닥 근처에서 이온을 벽 쪽으로 미는 가로 전기장(전자 그늘에 의한 대전의 단순 모델)
        if (y > yRef && yDeep > yRef + 2) {
          const f = Math.pow(Math.min(1, (y - yRef) / (yDeep - yRef)), 3);
          let l, r;
          if (wst[c] === S.stamp) { l = wl[c]; r = wr[c]; }
          else {
            l = 0; r = 0;
            while (l < 80 && !S.mat[iy * W + (((ix - l - 1) % W) + W) % W]) l++;
            while (r < 80 && !S.mat[iy * W + (ix + r + 1) % W]) r++;
            wl[c] = l; wr[c] = r; wst[c] = S.stamp;
          }
          if (l < 80 && r < 80) {
            const half = (l + r + 1) / 2, off = (x - (ix - l)) - half; // 홈 가운데에서 벗어난 거리
            vx += q * f * (off / Math.max(1, half)) * 0.004 * st;
            const L = Math.hypot(vx, vy); vx /= L; vy /= L;
          }
        }
        if (path && k % 6 === 0) path.push(x, y);
      }
      hit.c = -1;
      return hit;
    }
    const wl = new Int16Array(N), wr = new Int16Array(N), wst = new Int32Array(N);
    function deepest() {
      // 진공이 있는 가장 깊은 행(바닥에서 막히지 않은)
      for (let iy = H - 1; iy >= 0; iy--) { const o = iy * W; for (let ix = 0; ix < W; ix++) if (!S.mat[o + ix]) return iy; }
      return 0;
    }
    S.deepest = deepest;
    function topRow() {
      for (let iy = 0; iy < H; iy++) { const o = iy * W; for (let ix = 0; ix < W; ix++) if (S.mat[o + ix]) return iy; }
      return H - 1;
    }

    const lambert = (r) => Math.asin(2 * r() - 1); // 2D 코사인 분포 각
    // 반사·재방출의 출발점: 계단 모양 표면에서 바로 다시 부딪히지 않도록 매끈한 법선 쪽으로 띄운다
    function lift(x, y, nx, ny) {
      for (let d = 1.2; d > 0.05; d *= 0.5) {
        let px = x + nx * d; const py = y + ny * d;
        if (py < 0) continue;
        if (S.periodic) px = ((px % W) + W) % W; else if (px < 0 || px >= W) continue;
        const c = Math.floor(py) * W + Math.floor(px);
        if (!S.mat[c] || (S.mat[c] === CFX && S.phi[c] < 0.5)) return [px, py];
      }
      return [x + nx * 0.02, y + ny * 0.02];
    }
    const DP = new Float32Array(N);
    const PCAP = 1; // 이 두께(셀)를 넘으면 고분자가 셀을 차지하며 자란다
    const PMAT = { ie: 0, ch: 0, sp: 0.05, pol: 1 };
    // 법선 쪽 이웃 셀(8방향 중 법선과 가장 가까운 것)
    function outward(c) {
      const ix = c % W, iy = (c / W) | 0;
      normal(ix, iy);
      const a = Math.round(S.nx[c] * 1.3), b = Math.round(S.ny[c] * 1.3);
      let jx = ix + Math.max(-1, Math.min(1, a)); const jy = iy + Math.max(-1, Math.min(1, b));
      if (jy < 0 || jy >= H) return -1;
      if (jx < 0 || jx >= W) { if (!S.periodic) return -1; jx = (jx + W) % W; }
      return jy * W + jx;
    }
    function grow(c, amt) {
      const t = outward(c);
      if (t < 0 || t === c || t < W * 3) return; // 맨 위 세 줄로는 자라지 않는다(입자 발사 자리)
      if (!S.mat[t]) { S.mat[t] = CFX; S.phi[t] = Math.min(1, amt); }
      else if (S.mat[t] === CFX) S.phi[t] = Math.min(1, S.phi[t] + amt);
    }

    /* ---------------- 한 걸음 */
    const touched = []; // 이번 걸음에 맞은 셀
    const tmark = new Int32Array(N);
    let tstamp = 1;
    function touch(c) { if (tmark[c] !== tstamp) { tmark[c] = tstamp; touched.push(c); } }

    S.step = function (dtMax) {
      const R = S.recipe, rand = S.rand;
      S.stamp++; tstamp++; touched.length = 0;
      yTop = Math.max(0, topRow() - 2);
      const np = S.n || Math.max(400, Math.min(6000, W * 24));
      const wgt = W / np; // 평면 한 칸이 받는 플럭스 = 1 이 되도록
      const trc = S.wantTraces;
      S.traces = [];
      const ion = R.ion, neu = R.neu, pol = R.pol;

      /* 이온 */
      if (ion.flux > 0) {
        const w0 = wgt * ion.flux;
        for (let p = 0; p < np; p++) {
          const th = (ion.tilt + ion.sigma * gauss(rand)) * DEG;
          let vx = Math.sin(th), vy = Math.cos(th);
          let x = rand() * W, y = yTop + 1e-4, e = 1;
          const path = p < trc ? [x, y] : null;
          for (let b = 0; b < 6; b++) {
            const h = ion.charge > 0 ? traceCharged(x, y, vx, vy, ion.charge, path) : trace(x, y, vx, vy, path);
            if (h.c < 0) break;
            const c = normal(h.ix, h.iy);
            let nx = S.nx[c], ny = S.ny[c];
            let cs = -(vx * nx + vy * ny);
            if (cs <= 0.02) { nx = -vx; ny = -vy; cs = 1; }
            const a = Math.acos(Math.min(1, cs));
            const ad = a / DEG;
            const pr = ion.reflect * (ad < 65 ? 0 : ad > 86 ? 1 : (ad - 65) / 21);
            if (b < 5 && rand() < pr) {
              // 거울 반사 + 작은 흩어짐. 에너지 일부를 잃는다.
              vx = vx + 2 * cs * nx; vy = vy + 2 * cs * ny;
              const j = (rand() - 0.5) * 4 * DEG, cj = Math.cos(j), sj = Math.sin(j);
              const tx = vx * cj - vy * sj; vy = vx * sj + vy * cj; vx = tx;
              const L = Math.hypot(vx, vy); vx /= L; vy /= L;
              [x, y] = lift(h.x, h.y, nx, ny);
              e *= 0.9; S.nref = (S.nref || 0) + 1;
              continue;
            }
            const ww = w0 * e;
            S.hi[h.c] += ww * ET.yIE(a) * ion.energy;
            S.hs[h.c] += ww * ET.ySP(a) * ion.energy;
            S.hr[h.c] += ww * ion.energy;
            touch(h.c);
            break;
          }
          if (path) S.traces.push({ k: "ion", p: path });
        }
      }
      /* 라디칼(반응성 중성종)과 고분자 전구체: 같은 방식, 붙을 확률만 다르다 */
      const neutral = (spec, acc, kind) => {
        if (!(spec.flux > 0)) return;
        const w0 = wgt * spec.flux, s = Math.max(0.002, spec.stick);
        for (let p = 0; p < np; p++) {
          let th = lambert(rand);
          let vx = Math.sin(th), vy = Math.cos(th);
          let x = rand() * W, y = yTop + 1e-4;
          const path = kind && p < trc ? [x, y] : null;
          // 암묵적 포획: 부딪힐 때마다 무게의 s만큼 반응시키고 나머지를 들고 튕긴다(잡음이 훨씬 적다)
          let wt = w0;
          for (let b = 0; b < 80; b++) {
            const h = trace(x, y, vx, vy, path);
            if (h.c < 0) break;
            touch(h.c);
            if (b === 79 || wt < w0 * 0.03) { acc[h.c] += wt; break; }
            acc[h.c] += wt * s; wt *= 1 - s;
            const c = normal(h.ix, h.iy);
            const nx = S.nx[c], ny = S.ny[c];
            th = lambert(rand);
            const cs = Math.cos(th), sn = Math.sin(th);
            vx = nx * cs - ny * sn; vy = nx * sn + ny * cs;
            [x, y] = lift(h.x, h.y, nx, ny);
          }
          if (path) S.traces.push({ k: kind, p: path });
        }
      };
      neutral(neu, S.hn, "neu");
      neutral(pol, S.hp, null);

      /* 표면 갱신 */
      let maxRate = 1e-9;
      const rates = new Float32Array(touched.length);
      const M = R.mat;
      const gamma = R.gamma || 1;
      for (let k = 0; k < touched.length; k++) {
        const c = touched[k];
        // 이웃 표면 셀과 평균해 몬테카를로 잡음을 줄인다
        // 방향이 비슷한 면끼리만 섞는다(윗면과 측벽을 섞으면 모서리가 뭉개진다)
        let HI = 0, HS = 0, HR = 0, HN = 0, HP = 0, wsum = 0;
        const ix = c % W, iy = (c / W) | 0;
        normal(ix, iy);
        const cnx = S.nx[c], cny = S.ny[c];
        for (let dy = -1; dy <= 1; dy++) for (let dxx = -1; dxx <= 1; dxx++) {
          let jx = ix + dxx; const jy = iy + dy;
          if (jy < 0 || jy >= H) continue;
          if (jx < 0 || jx >= W) { if (!S.periodic) continue; jx = (jx + W) % W; }
          const q = jy * W + jx;
          if (tmark[q] !== tstamp) continue;
          let w = 1;
          if (q !== c) { normal(jx, jy); const d = cnx * S.nx[q] + cny * S.ny[q]; if (d < 0.88) continue; w = 0.5 * d * d; }
          HI += S.hi[q] * w; HS += S.hs[q] * w; HR += S.hr[q] * w; HN += S.hn[q] * w; HP += S.hp[q] * w; wsum += w;
        }
        HI /= wsum; HS /= wsum; HR /= wsum; HN /= wsum; HP /= wsum;
        const isP = S.mat[c] === CFX;
        const mm = isP ? PMAT : M[MAT[S.mat[c]].key] || { ie: 0, ch: 0, sp: 0, pol: 1 };
        // 한 칸짜리 돌기(양옆이나 세 면이 빈 셀)는 버티지 못한다: 격자 크기의 가짜 가시를 없앤다
        const eL = !occ(ix - 1, iy), eR = !occ(ix + 1, iy), eU = !occ(ix, iy - 1), eD = iy + 1 < H && !occ(ix, iy + 1);
        const spike = (eL && eR) || (eU && eD) || (eL + eR + eU + eD >= 3);
        if (spike) S.poly[c] = 0;
        const theta = HN / (HN + gamma * HI + 1e-9);
        const blk = Math.exp(-S.poly[c] / (pol.p0 || 0.5));
        // 고분자: 중성 전구체의 쌓임 + 이온이 실어 오는 쌓임(pol.ion) − 이온에 의한 제거 − 라디칼에 의한 제거(pol.chem)
        const dp = (mm.pol == null ? 1 : mm.pol) * (pol.dep * HP + (pol.ion || 0) * HR) - pol.ionRemove * HR - (pol.chem || 0) * HN;
        let r;
        if (isP) r = Math.max(0, -dp) + 0.05 * HS; // 고분자 덩어리는 이온과 라디칼에 깎인다
        else r = (mm.ie * HI * theta + mm.ch * HN) * blk + mm.sp * HS * (0.4 + 0.6 * blk);
        if (spike) r = Math.max(r * 2, (mm.ie + mm.ch + mm.sp) * 0.5, 0.2);
        rates[k] = r;
        DP[c] = spike ? Math.min(0, dp) : dp;
        if (r > maxRate) maxRate = r;
        if (DP[c] > maxRate) maxRate = DP[c];
      }
      let dt = 0.5 * dx / maxRate; // 가장 빠른 셀이 반 칸 깎이도록
      if (dtMax != null && dt > dtMax) dt = dtMax;
      for (let k = 0; k < touched.length; k++) {
        const c = touched[k];
        const g = DP[c] * dt;
        if (S.mat[c] === CFX) {
          if (g > 0) grow(c, g / dx);
        } else if (g > 0) {
          const P = S.poly[c] + g / dx;
          if (P > PCAP) { S.poly[c] = PCAP; grow(c, P - PCAP); } else S.poly[c] = P;
        } else if (g < 0) {
          let neg = -g / dx;
          // 먼저 법선 쪽 이웃의 얇은(투명한) 고분자부터 깎는다
          const t = outward(c);
          if (t >= 0 && S.mat[t] === CFX && S.phi[t] < 0.5) { const tk = Math.min(S.phi[t], neg); S.phi[t] -= tk; neg -= tk; if (S.phi[t] <= 0.001) { S.phi[t] = 0; S.mat[t] = 0; } }
          S.poly[c] = Math.max(0, S.poly[c] - neg);
        }
        S.phi[c] -= rates[k] * dt / dx;
        if (S.phi[c] <= 0) { S.phi[c] = 0; S.mat[c] = 0; S.poly[c] = 0; }
      }
      // 마지막 걸음의 표면 플럭스와 속도를 남긴다(그리기·설명용)
      const F = S.flux;
      F.cells = touched.slice(); F.rate = rates; F.ion = new Float32Array(touched.length); F.neu = new Float32Array(touched.length); F.pol = new Float32Array(touched.length);
      for (let k = 0; k < touched.length; k++) { const c = touched[k]; F.ion[k] = S.hr[c]; F.neu[k] = S.hn[c]; F.pol[k] = S.hp[c]; S.hi[c] = S.hs[c] = S.hr[c] = S.hn[c] = S.hp[c] = 0; }
      const tu = dt * R0; // 이론적 openRate 기준의 시간 정규화; 실제 셀 제거량은 별도 측정
      S.t += tu;
      S.steps++;
      return tu;
    };
    /** 시간 t만큼 진행(최대 maxSteps 걸음). 남은 시간에 맞춰 마지막 걸음을 자른다. */
    S.run = function (t, maxSteps) {
      const end = S.t + t;
      let k = 0;
      while (S.t < end - 1e-9 && k < (maxSteps || 100000)) { S.step((end - S.t) / R0); k++; }
      return S;
    };
    /** 재질 key의 이론적 열린 평면 속도(nm / 정규화 시간). 기본 산화막 = 1; 실제 셀 제거 속도는 별도 측정 */
    S.rateOf = (key) => S.openRate(key) / R0;
    /** 등고선 기록: 지금의 윤곽선을 저장(그리기에서 시간에 따라 흐리게 겹친다) */
    S.snap = function () { S.snaps.push({ t: S.t, seg: ET.contour(S) }); if (S.snaps.length > 60) S.snaps.shift(); return S; };

    /** 재질 key의 이론적 열린 평면 속도(상대값, 시간 정규화 기준) */
    S.openRate = function (key) {
      const R = S.recipe, mm = R.mat[key] || { ie: 0, ch: 0, sp: 0, pol: 1 };
      const HI = R.ion.flux * R.ion.energy, HN = R.neu.flux * R.neu.stick, HP = R.pol.flux * R.pol.stick;
      const theta = HN / (HN + (R.gamma || 1) * HI + 1e-9);
      const dp = (mm.pol == null ? 1 : mm.pol) * (R.pol.dep * HP + (R.pol.ion || 0) * HI) - R.pol.ionRemove * HI - (R.pol.chem || 0) * HN;
      const blk = dp > 0 ? 0 : 1;
      return (mm.ie * HI * theta + mm.ch * HN) * blk + mm.sp * HI * (0.4 + 0.6 * blk);
    };
    return S;
  };

  /* ======================================================================
     ET.wet — 도달 시간 풀이 (등방성 습식 식각)
     ====================================================================== */
  /**
   * const w = ET.wet(s, { rates: { ox: 1, si: 0 } });
   * w.apply(t)   시간 t에 깎인 모습으로 s를 바꾼다(처음 상태에서 다시 계산하므로 되감기도 된다).
   * w.T          셀 중심에 식각 전면이 도달한 시간(Float64Array, 못 닿으면 Infinity)
   * rates: 재질별 식각 속도(nm/단위시간). 0이면 깎이지 않는다(마스크).
   * 시작점은 처음부터 진공이면서 맨 위와 이어진 셀이다.
   */
  ET.wet = function (s, opt) {
    const W = s.W, H = s.H, N = W * H, dx = s.dx;
    const mat0 = s.mat.slice(), phi0 = s.phi.slice();
    const rate = new Float32Array(MAT.length);
    MAT.forEach((m, i) => { if (m) rate[i] = (opt.rates && opt.rates[m.key]) || 0; });
    const T = new Float64Array(N).fill(Infinity);
    const done = new Uint8Array(N);
    // 맨 위와 이어진 진공에서 시작
    const heap = new Heap();
    const seen = new Uint8Array(N);
    const q = [];
    for (let ix = 0; ix < W; ix++) if (!mat0[ix]) { q.push(ix); seen[ix] = 1; }
    while (q.length) {
      const c = q.pop(); T[c] = 0; heap.push(0, c);
      const ix = c % W, iy = (c / W) | 0;
      const nb = [[1, 0], [-1, 0], [0, 1], [0, -1]];
      for (const [a, b] of nb) {
        let jx = ix + a; const jy = iy + b;
        if (jy < 0 || jy >= H) continue;
        if (jx < 0 || jx >= W) { if (!s.periodic) continue; jx = (jx + W) % W; }
        const d = jy * W + jx;
        if (!seen[d] && !mat0[d]) { seen[d] = 1; q.push(d); }
      }
    }
    const ST = [];
    for (let a = -2; a <= 2; a++) for (let b = -2; b <= 2; b++) {
      if (!a && !b) continue;
      if (Math.abs(a) === 2 && Math.abs(b) === 2) continue;
      if ((Math.abs(a) === 2 && b === 0) || (Math.abs(b) === 2 && a === 0)) continue;
      // Integrate slowness along the centre-to-centre segment. A long
      // move must pay for every crossed material, not only its destination.
      const ts = [0, 1];
      for (const v of [a, b]) for (let k = 0; k < Math.abs(v); k++) ts.push((k + 0.5) / Math.abs(v));
      ts.sort((x, y) => x - y);
      const cuts = ts.filter((t, i) => !i || t !== ts[i - 1]);
      const cells = [], corners = [], d = Math.hypot(a, b) * dx;
      for (let i = 1; i < cuts.length; i++) {
        const t = (cuts[i - 1] + cuts[i]) / 2;
        cells.push([Math.floor(a * t + 0.5), Math.floor(b * t + 0.5), (cuts[i] - cuts[i - 1]) * d]);
      }
      // Do not pass through a zero-width corner between insoluble cells.
      for (let i = 1; i < cells.length; i++) {
        const p = cells[i - 1], q = cells[i];
        if (p[0] !== q[0] && p[1] !== q[1]) corners.push([p[0], q[1]], [q[0], p[1]]);
      }
      ST.push({ a, b, cells, corners });
    }
    const at = (ix, iy) => {
      if (iy < 0 || iy >= H) return -1;
      if (ix < 0 || ix >= W) {
        if (!s.periodic) return -1;
        ix = ((ix % W) + W) % W;
      }
      return iy * W + ix;
    };
    while (heap.size) {
      const [tc, c] = heap.pop();
      if (done[c] || tc > T[c]) continue;
      done[c] = 1;
      const ix = c % W, iy = (c / W) | 0;
      for (const move of ST) {
        const e = at(ix + move.a, iy + move.b);
        if (e < 0) continue;
        let cost = 0, blocked = false;
        for (const [a, b] of move.corners) {
          const j = at(ix + a, iy + b);
          if (j < 0 || (mat0[j] && rate[mat0[j]] <= 0)) { blocked = true; break; }
        }
        if (blocked) continue;
        for (const [a, b, length] of move.cells) {
          const j = at(ix + a, iy + b);
          if (j < 0) { blocked = true; break; }
          const m = mat0[j];
          if (!m) continue; // Liquid fills a newly opened void without etch delay.
          const r = rate[m];
          if (r <= 0) { blocked = true; break; }
          cost += length / r;
        }
        if (blocked) continue;
        const nt = tc + cost;
        if (nt < T[e]) { T[e] = nt; heap.push(nt, e); }
      }
    }
    const w = { T, s };
    w.apply = function (t) {
      for (let c = 0; c < N; c++) {
        const m = mat0[c];
        if (!m) { s.mat[c] = 0; s.phi[c] = 0; continue; }
        const r = rate[m] || 1;
        const f = (t - T[c]) / (dx / r) + 0.5; // 셀을 다 깎는 데 걸리는 시간 기준의 부분 제거
        if (f >= 1) { s.mat[c] = 0; s.phi[c] = 0; }
        else if (f > 0) { s.mat[c] = m; s.phi[c] = phi0[c] * (1 - f); if (s.phi[c] < 0.02) { s.mat[c] = 0; s.phi[c] = 0; } }
        else { s.mat[c] = m; s.phi[c] = phi0[c]; }
      }
      s.poly.fill(0);
      s.t = t;
      return s;
    };
    return w;
  };
  function Heap() { this.k = []; this.v = []; this.size = 0; }
  Heap.prototype.push = function (key, val) {
    const k = this.k, v = this.v; let i = this.size++;
    k[i] = key; v[i] = val;
    while (i > 0) { const p = (i - 1) >> 1; if (k[p] <= k[i]) break; [k[p], k[i]] = [k[i], k[p]]; [v[p], v[i]] = [v[i], v[p]]; i = p; }
  };
  Heap.prototype.pop = function () {
    const k = this.k, v = this.v; const top = [k[0], v[0]];
    this.size--;
    if (this.size > 0) {
      k[0] = k[this.size]; v[0] = v[this.size];
      let i = 0;
      for (;;) {
        const l = 2 * i + 1, r = l + 1; let m = i;
        if (l < this.size && k[l] < k[m]) m = l;
        if (r < this.size && k[r] < k[m]) m = r;
        if (m === i) break;
        [k[m], k[i]] = [k[i], k[m]]; [v[m], v[i]] = [v[i], v[m]]; i = m;
      }
    }
    return top;
  };

  /* ======================================================================
     측정
     ====================================================================== */
  /**
   * 홈(트렌치·구멍) 하나의 치수를 잰다. 단위 nm.
   * opt: { x: 홈 가운데(nm), ref: 기준 행(대상막 윗면, 기본 s.marks[target+"Top"]), target: "ox", mask: "ac" }
   * 반환: { depth(가운데 깊이), maxDepth, micro(가장자리 - 가운데 깊이), top(기준면 폭), mid, bottom(깊이 90%의 폭),
   *         bow(최대 폭 - 윗 폭), bowAt(최대 폭의 깊이), angle(측벽 각, 90°=수직), undercut(마스크 아래로 파고든 폭, 한쪽),
   *         maskLeft(가장 얇은 마스크 두께), widths:[{d, w, l, r}] }
   */
  ET.measure = function (s, opt) {
    opt = opt || {};
    const W = s.W, H = s.H, dx = s.dx;
    const tk = opt.target || "ox", mk = opt.mask || "ac";
    const ref = opt.ref != null ? opt.ref : (s.marks[tk + "Top"] != null ? s.marks[tk + "Top"] : s.marks.top || 0);
    const xc = Math.floor((opt.x != null ? opt.x : s.width / 2) / dx);
    const wrap = (i) => (s.periodic ? ((i % W) + W) % W : Math.max(0, Math.min(W - 1, i)));
    const empty = (ix, iy) => { const c = iy * W + wrap(ix); return !s.mat[c] || s.phi[c] < 0.5; };
    // Count each cell at most once, including rows where adjacent openings merge.
    const span = (iy) => {
      if (iy < 0 || iy >= H || !empty(xc, iy)) return null;
      let l = 0, r = 0;
      while (l < W - 1 && (s.periodic || xc - l - 1 >= 0) && empty(xc - l - 1, iy)) l++;
      while (l + r + 1 < W && (s.periodic || xc + r + 1 < W) && empty(xc + r + 1, iy)) r++;
      return { w: (l + r + 1) * dx, l: (xc - l) * dx, r: (xc + r + 1) * dx,
        merged: !!s.periodic && l + r + 1 === W };
    };
    const widths = [];
    let depthRow = ref - 1;
    for (let iy = ref; iy < H; iy++) {
      if (!empty(xc, iy)) {
        // 가운데가 막혔어도 홈 폭 안에 빈 곳이 있으면 계속 (마이크로트렌치)
        let any = false;
        for (let d = 1; d < W / 2; d++) { if (empty(xc - d, iy) || empty(xc + d, iy)) { any = true; break; } if (!empty(xc - d, iy - 1) && !empty(xc + d, iy - 1)) break; }
        if (!any) break;
      }
      if (empty(xc, iy)) {
        widths.push({ d: (iy - ref + 1) * dx, ...span(iy) });
        depthRow = iy;
      } else break;
    }
    const depth = (depthRow - ref + 1) * dx;
    // 가장 깊은 점(마이크로트렌치)
    let maxRow = depthRow;
    const half = widths.length ? Math.ceil(widths[0].w / dx / 2) + 2 : 0;
    for (let ix = xc - half; ix <= xc + half; ix++) {
      let iy = ref;
      if (!empty(ix, ref)) continue;
      while (iy < H - 1 && empty(ix, iy + 1)) iy++;
      if (iy > maxRow) maxRow = iy;
    }
    const maxDepth = (maxRow - ref + 1) * dx;
    // 부분 깎인 셀 보정(가운데 열)
    const cB = Math.min(H - 1, depthRow + 1) * W + wrap(xc);
    const frac = s.mat[cB] ? 1 - s.phi[cB] : 0;
    const out = { depth: depth + (frac < 0.5 ? frac : 0) * dx, maxDepth, micro: maxDepth - depth, widths };
    if (widths.length) {
      const w0 = widths[0].w;
      const at = (f) => { const k = Math.min(widths.length - 1, Math.max(0, Math.round(f * (widths.length - 1)))); return widths[k]; };
      out.top = w0; out.mid = at(0.5).w; out.bottom = at(0.9).w;
      let mx = 0, mxd = 0;
      widths.forEach((q) => { if (q.w > mx) { mx = q.w; mxd = q.d; } });
      out.max = mx; out.bow = Math.max(0, mx - w0); out.bowAt = mxd;
      // 측벽 각: 깊이 10%와 90%의 각 벽 위치를 잇는 두 점 기울기.
      const a = at(0.1), b = at(0.9);
      if (widths.length > 4 && b.d > a.d) {
        out.angleLeft = 90 - Math.atan2(b.l - a.l, b.d - a.d) / DEG;
        out.angleRight = 90 - Math.atan2(a.r - b.r, b.d - a.d) / DEG;
        out.angle = out.angleLeft;
      } else out.angle = 90;
      out.widthMerged = widths.some((q) => q.merged);
      out.angleValid = !a.merged && !b.merged;
    }
    // 마스크 남은 두께(마스크가 있는 열들 중 가장 얇은 곳은 홈 가장자리 근처이므로 홈에서 떨어진 열의 최소)
    const mi = MI[mk];
    if (mi) {
      let best = Infinity, maxT = 0;
      for (let ix = 0; ix < W; ix++) {
        let t = 0;
        for (let iy = 0; iy < H; iy++) { const c = iy * W + ix; if (s.mat[c] === mi) t += s.phi[c]; }
        if (t > maxT) maxT = t;
        if (t > 0.5 && t < best) best = t;
      }
      out.maskMax = maxT * dx;
      out.maskLeft = (isFinite(best) ? best : 0) * dx;
      // 언더컷은 마스크 바로 아래 행에서 잰다. 깊은 곳의 보잉과 구분한다.
      const mb = s.marks[mk + "Bot"];
      if (mb != null) {
        const opening = span(mb - 1), below = span(mb);
        out.maskOpen = opening ? opening.w : 0;
        out.undercutLeft = opening && below ? Math.max(0, opening.l - below.l) : 0;
        out.undercutRight = opening && below ? Math.max(0, below.r - opening.r) : 0;
        out.undercut = Math.max(out.undercutLeft, out.undercutRight);
        out.undercutMerged = !!(below && below.merged);
        if (out.undercutMerged && opening) {
          // Once no separating wall remains, report the half-gap consumed,
          // rather than an arbitrary unwrapped edge coordinate.
          out.undercut = Math.max(0, (below.w - opening.w) / 2);
        }
      }
    }
    return out;
  };
  /** 재질 key가 열 x(nm)에서 남은 두께(nm) */
  ET.thick = function (s, key, x) {
    const m = MI[key], ix = Math.min(s.W - 1, Math.max(0, Math.floor(x / s.dx)));
    let t = 0;
    for (let iy = 0; iy < s.H; iy++) { const c = iy * s.W + ix; if (s.mat[c] === m) t += s.phi[c]; }
    return t * s.dx;
  };
  /** 열 x(nm)에서 맨 위 고체 표면의 깊이(행 기준 nm, 위에서부터) */
  ET.surfaceY = function (s, x) {
    const ix = Math.min(s.W - 1, Math.max(0, Math.floor(x / s.dx)));
    for (let iy = 0; iy < s.H; iy++) { const c = iy * s.W + ix; if (s.mat[c]) return (iy + 1 - s.phi[c]) * s.dx; }
    return s.height;
  };

  /* ======================================================================
     윤곽선 (marching squares, 점유 0.5)
     ====================================================================== */
  /** 반환: Float32Array [x0,y0,x1,y1, ...] (셀 단위, 주기 경계 열 하나 더) */
  ET.contour = function (s, level) {
    level = level == null ? 0.5 : level;
    const W = s.W, H = s.H, out = [];
    const v = (ix, iy) => s.occ(ix - 0.5 < 0 && !s.periodic ? 0 : ix, iy);
    // 격자점 = 셀 중심. (ix+0.5, iy+0.5)
    for (let iy = -1; iy < H; iy++) {
      for (let ix = 0; ix < W; ix++) {
        const a = v(ix, iy), b = v(ix + 1, iy), c = v(ix + 1, iy + 1), d = v(ix, iy + 1);
        let code = 0;
        if (a > level) code |= 8; if (b > level) code |= 4; if (c > level) code |= 2; if (d > level) code |= 1;
        if (code === 0 || code === 15) continue;
        const x0 = ix + 0.5, y0 = iy + 0.5;
        const lerp = (p, q) => (level - p) / (q - p);
        const top = [x0 + lerp(a, b), y0], right = [x0 + 1, y0 + lerp(b, c)], bot = [x0 + lerp(d, c), y0 + 1], left = [x0, y0 + lerp(a, d)];
        const seg = (p, q) => out.push(p[0], p[1], q[0], q[1]);
        switch (code) {
          case 1: case 14: seg(left, bot); break;
          case 2: case 13: seg(bot, right); break;
          case 3: case 12: seg(left, right); break;
          case 4: case 11: seg(top, right); break;
          case 5: seg(left, top); seg(bot, right); break;
          case 6: case 9: seg(top, bot); break;
          case 7: case 8: seg(left, top); break;
          case 10: seg(top, right); seg(left, bot); break;
        }
      }
    }
    return new Float32Array(out);
  };

  /* ======================================================================
     그리기
     ====================================================================== */
  const colorCache = {};
  function parseColor(str) {
    str = (str || "").trim();
    if (colorCache[str]) return colorCache[str];
    let r = 128, g = 128, b = 128;
    if (str[0] === "#") {
      const h = str.length === 4 ? str.slice(1).split("").map((q) => q + q).join("") : str.slice(1, 7);
      r = parseInt(h.slice(0, 2), 16); g = parseInt(h.slice(2, 4), 16); b = parseInt(h.slice(4, 6), 16);
    } else {
      const m = str.match(/[\d.]+/g);
      if (m) { r = +m[0]; g = +m[1]; b = +m[2]; }
    }
    return (colorCache[str] = [r, g, b]);
  }
  ET.parseColor = parseColor;
  function cssVar(name) { return getComputedStyle(document.documentElement).getPropertyValue(name).trim(); }
  /** 재질 색(CSS --m-key) */
  ET.matColor = (key) => cssVar("--m-" + key) || "#888";

  /**
   * 단면을 그린다.
   * box: {x, y, w, h} 그릴 자리(px). opt:
   *   x0, x1: 보여 줄 가로 범위(nm, 기본 0~width). 주기 경계라 바깥도 되풀이해서 그린다.
   *   y0, y1: 세로 범위(nm, 위에서부터. 기본 0~height). 비율은 지키지 않는다 → keepAspect: true면 가로 세로 같은 축척
   *   outline: 윤곽선 색(기본 없음), outlineWidth
   *   history: true면 s.snaps 윤곽을 흐리게 겹친다. historyColor
   *   poly: 고분자 보호막을 칠할지(기본 true)
   *   traces: true면 마지막 걸음의 입자 궤적
   * 반환: { X(nm)→px, Y(nm)→px, nmX(px), nmY(px), scale }
   */
  ET.draw = function (ctx, box, s, opt) {
    opt = opt || {};
    const dx = s.dx;
    let x0 = opt.x0 != null ? opt.x0 : 0, x1 = opt.x1 != null ? opt.x1 : s.width;
    let y0 = opt.y0 != null ? opt.y0 : 0, y1 = opt.y1 != null ? opt.y1 : s.height;
    let bx = box.x, by = box.y, bw = box.w, bh = box.h;
    if (opt.keepAspect) {
      const sc = Math.min(bw / (x1 - x0), bh / (y1 - y0));
      const nw = (x1 - x0) * sc, nh = (y1 - y0) * sc;
      bx += (bw - nw) / 2; by += opt.alignTop ? 0 : (bh - nh); bw = nw; bh = nh;
    }
    const sx = bw / (x1 - x0), sy = bh / (y1 - y0);
    const X = (x) => bx + (x - x0) * sx, Y = (y) => by + (y - y0) * sy;
    // 셀 영상
    const W = s.W, H = s.H;
    if (!s._cv || s._cv.width !== W || s._cv.height !== H) {
      s._cv = document.createElement("canvas"); s._cv.width = W; s._cv.height = H;
      s._img = s._cv.getContext("2d").createImageData(W, H);
    }
    const img = s._img, D = img.data;
    const cols = MAT.map((m) => (m ? parseColor(ET.matColor(m.key)) : null));
    const pc = parseColor(cssVar("--m-cfx") || "#9a5b2c");
    const showPoly = opt.poly !== false;
    for (let c = 0, p = 0; c < W * H; c++, p += 4) {
      const m = s.mat[c];
      if (!m) { D[p + 3] = 0; continue; }
      let [r, g, b] = cols[m];
      if (showPoly && s.poly[c] > 0.05) { const f = Math.min(0.85, s.poly[c] / 1.0); r += (pc[0] - r) * f; g += (pc[1] - g) * f; b += (pc[2] - b) * f; }
      D[p] = r; D[p + 1] = g; D[p + 2] = b; D[p + 3] = Math.round(255 * Math.min(1, s.phi[c] * 1.15));
    }
    s._cv.getContext("2d").putImageData(img, 0, 0);
    ctx.save();
    ctx.beginPath(); ctx.rect(bx, by, bw, bh); ctx.clip();
    ctx.imageSmoothingEnabled = opt.smooth !== false;
    // 주기 되풀이
    const kx0 = Math.floor(x0 / s.width), kx1 = Math.ceil(x1 / s.width);
    const rows0 = Math.max(0, Math.floor(y0 / dx)), rows1 = Math.min(H, Math.ceil(y1 / dx));
    for (let k = kx0; k < kx1; k++) {
      if (!s.periodic && k !== 0) continue;
      ctx.drawImage(s._cv, 0, rows0, W, rows1 - rows0, X(k * s.width), Y(rows0 * dx), s.width * sx, (rows1 - rows0) * dx * sy);
    }
    const P = window.EB ? window.EB.palette() : { accent: "#c2255c", accent2: "#1c7ed6", dim: "#888" };
    const segs = (seg, color, wdt, alpha) => {
      ctx.strokeStyle = color; ctx.lineWidth = wdt; ctx.globalAlpha = alpha == null ? 1 : alpha;
      ctx.beginPath();
      for (let k = kx0; k < kx1; k++) {
        if (!s.periodic && k !== 0) continue;
        const ox = k * s.width;
        for (let i = 0; i < seg.length; i += 4) {
          ctx.moveTo(X(ox + seg[i] * dx), Y(seg[i + 1] * dx));
          ctx.lineTo(X(ox + seg[i + 2] * dx), Y(seg[i + 3] * dx));
        }
      }
      ctx.stroke(); ctx.globalAlpha = 1;
    };
    if (opt.history && s.snaps.length) {
      const n = s.snaps.length;
      s.snaps.forEach((sn, i) => segs(sn.seg, opt.historyColor || P.dim, 1, 0.25 + 0.55 * ((i + 1) / n)));
    }
    if (opt.outline) segs(ET.contour(s), opt.outline, opt.outlineWidth || 1.6, 1);
    if (opt.traces && s.traces.length) {
      ctx.lineWidth = 1;
      s.traces.forEach((tr) => {
        ctx.strokeStyle = tr.k === "ion" ? (opt.ionColor || P.accent) : (opt.neuColor || P.accent2);
        ctx.globalAlpha = 0.75;
        ctx.beginPath();
        const p = tr.p;
        for (let k = kx0; k < kx1; k++) {
          const ox = k * s.width;
          ctx.moveTo(X(ox + p[0] * dx), Y(p[1] * dx));
          for (let i = 2; i < p.length; i += 2) {
            // 주기 경계를 넘는 선분은 끊는다
            if (Math.abs(p[i] - p[i - 2]) > s.W / 2) ctx.moveTo(X(ox + p[i] * dx), Y(p[i + 1] * dx));
            else ctx.lineTo(X(ox + p[i] * dx), Y(p[i + 1] * dx));
          }
        }
        ctx.stroke();
      });
      ctx.globalAlpha = 1;
    }
    ctx.restore();
    return { X, Y, nmX: (px) => x0 + (px - bx) / sx, nmY: (py) => y0 + (py - by) / sy, box: { x: bx, y: by, w: bw, h: bh }, sx, sy };
  };

  /* ======================================================================
     비동기 실행: 화면을 멈추지 않고 시간을 흘린다
     ====================================================================== */
  /**
   * const run = ET.runAsync(s, 400, { budget: 14, snapEvery: 20, onFrame(s), onDone(s) });
   *   한 프레임에 budget ms만큼만 걸음을 돌리고 다음 프레임으로 넘긴다. snapEvery(시간 단위)마다 s.snap().
   *   run.stop() 중단, run.running 진행 여부. 끝 시간(s.t 기준 절대값)은 run.end.
   */
  ET.runAsync = function (s, t, o) {
    o = o || {};
    const end = s.t + t, budget = o.budget || 14;
    let raf = 0, nextSnap = o.snapEvery ? s.t + o.snapEvery : Infinity;
    const ctl = { running: true, end, stop() { ctl.running = false; if (raf) cancelAnimationFrame(raf); raf = 0; } };
    if (o.snapEvery && !s.snaps.length) s.snap();
    function frame() {
      raf = 0;
      if (!ctl.running) return;
      const t0 = performance.now();
      while (s.t < end - 1e-9 && performance.now() - t0 < budget) {
        s.step((Math.min(end, nextSnap) - s.t) / ET.R0);
        if (s.t >= nextSnap - 1e-9) { s.snap(); nextSnap += o.snapEvery; }
      }
      if (o.onFrame) o.onFrame(s);
      if (s.t >= end - 1e-9) { ctl.running = false; if (o.onDone) o.onDone(s); return; }
      raf = requestAnimationFrame(frame);
    }
    raf = requestAnimationFrame(frame);
    return ctl;
  };

  /* ======================================================================
     해석 도우미 (본문 수식과 같은 것)
     ====================================================================== */
  /** 아레니우스: 상대 속도 exp(-Ea/kT). Ea eV, T K */
  ET.arrhenius = (Ea, T) => Math.exp(-Ea / (8.617333e-5 * T));
  /** 긴 슬롯의 면적 평균 직접 도달률(벽 반사 제외). A = 깊이/폭 */
  ET.slotView = (A) => 1 / (Math.sqrt(1 + A * A) + A);
  /** 같은 지름의 동축 원판 사이 면적 평균 직접 도달률(벽 반사 제외) */
  ET.holeView = (A) => ET.slotView(A) ** 2;
  /** 클라우징 투과 확률 근사(원통): 1 / (1 + 3A/4)  (A = 깊이/지름) */
  ET.clausing = (A) => 1 / (1 + 0.75 * A);
  /** 코번-윈터스: 바닥 플럭스 비 = 1 / (1 + s(1/K − 1)) */
  ET.coburn = (s, K) => 1 / (1 + s * (1 / K - 1));
  /** 데바이 길이(m): ne m⁻³, Te eV */
  ET.debye = (ne, Te) => Math.sqrt((8.8541878128e-12 * Te) / (ne * 1.602176634e-19));
  /** 봄 속도(m/s): Te eV, 이온 질량 amu */
  ET.bohm = (Te, amu) => Math.sqrt((Te * 1.602176634e-19) / (amu * 1.66053907e-27));

  /* ======================================================================
     이어지는 타깃 EB-20
     ====================================================================== */
  /**
   * 가상의 DRAM 주변 회로층 산화막 트렌치. 피치 40 nm, 폭 20 nm, 깊이 160 nm(종횡비 8).
   * 비정질 탄소 하드마스크 60 nm, 아래 질화막 정지막 15 nm, 그 아래 실리콘.
   *   const s = ET.EB20.build();  s.setRecipe(ET.EB20.recipe());  s.run(ET.EB20.time)
   */
  ET.EB20 = {
    pitch: 40, cd: 20, depth: 160, mask: 60, stop: 15, si: 20, head: 14,
    spec: { angle: 88.5, bow: 3, micro: 2, maskLeft: 15, stopLoss: 3 },
    build(o) {
      o = o || {};
      const E = ET.EB20, pitch = o.pitch || E.pitch, cd = o.cd || E.cd;
      const s = ET.sim({ width: pitch, height: E.si + E.stop + E.depth + (o.mask || E.mask) + E.head, dx: o.dx || 1, seed: o.seed || 20 });
      s.layer("si", E.si).layer("nit", E.stop).layer("ox", E.depth).layer("ac", o.mask || E.mask);
      s.open("ac", [[(pitch - cd) / 2, (pitch + cd) / 2]], { taper: o.taper || 0 });
      return s;
    },
    recipe(over) { return ET.recipe("oxide", over); },
  };
})();
