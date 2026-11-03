/* Copyright (c) 2026 geniuskey and ProcessBook contributors.
   Executable code: MIT (see ../LICENSE-MIT).
   Educational content and illustrations: CC-BY-4.0 (see ../LICENSE.md). */
/* ==========================================================================
   ProcessBook 단면 시뮬레이터 — 전역 객체 XS
   2차원 셀 격자(가로 W × 세로 H, 셀 크기 dx nm) 위에서 공정을 차례로 적용한다.
   - 각 셀은 재질 하나(0 = 빈 공간)와 도펀트 농도(n형 nd, p형 na, cm^-3)를 가진다.
   - 식각·증착은 표면 셀마다 "가시도(visibility)" 광선 추적으로 입사 플럭스를 구하고,
     표면 법선 방향 L1 보정(|nx|+|ny|)으로 격자 이방성을 줄인 셀 오토마타로 전진시킨다.
   - 열산화는 산화막 속 경로 길이를 쓰는 국소 Deal–Grove 모델 + 부피 팽창(2.27배)으로,
     이온 주입은 가우시안(Rp, ΔRp) + 측면 퍼짐으로, 확산은 실리콘 영역 마스크 블러로 근사한다.
   모든 수치는 교육용 근사 모델이다. 경계는 가로 방향 주기 조건.
   좌표: 사용자 좌표 x(nm)는 왼쪽 끝 0, y(nm)는 초기 실리콘 표면 0, 아래(깊이)가 +.
   ========================================================================== */
(function () {
  "use strict";

  /* ------------------------------------------------------------ 재질 */
  // k: 이온 주입 저지 능력(실리콘 대비, 클수록 얇은 두께로 막는다)
  const MATS = [
    null,
    { key: "si",   name: "실리콘",       en: "Si",      color: "#8f99aa", semi: true, k: 1.0 },
    { key: "ox",   name: "산화막",       en: "SiO₂",    color: "#bcd8f0", k: 1.1 },
    { key: "nit",  name: "질화막",       en: "Si₃N₄",   color: "#e2b05a", k: 1.4 },
    { key: "poly", name: "폴리실리콘",   en: "poly-Si", color: "#c0604a", semi: true, k: 1.0 },
    { key: "pr",   name: "감광막",       en: "PR",      color: "#cf7aa6", k: 0.6 },
    { key: "w",    name: "텅스텐",       en: "W",       color: "#58606e", k: 3.5 },
    { key: "cu",   name: "구리",         en: "Cu",      color: "#cc7a3a", k: 3.0 },
    { key: "al",   name: "알루미늄",     en: "Al",      color: "#b7bec8", k: 0.95 },
    { key: "tin",  name: "TiN",          en: "TiN",     color: "#c9a227", k: 2.0 },
    { key: "hk",   name: "High-k",       en: "HfO₂",    color: "#6fbf9a", k: 3.0 },
    { key: "sil",  name: "실리사이드",   en: "NiSi",    color: "#6f5f93", k: 1.8 },
    { key: "epi",  name: "SiGe 에피",    en: "SiGe",    color: "#c9b48a", semi: true, k: 1.05 },
    { key: "lowk", name: "저유전막",     en: "low-k",   color: "#a8e0d0", k: 0.7 },
    { key: "acl",  name: "탄소 하드마스크", en: "ACL",  color: "#33363d", k: 0.85 },
    { key: "cfx",  name: "고분자 보호막", en: "CFₓ",   color: "#b4a3e6", k: 0.5 },
  ];
  const ID = {};
  MATS.forEach((m, i) => { if (m) { ID[m.key] = i; m.id = i; m.rgb = hex2rgb(m.color); } });
  function hex2rgb(h) { const n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
  const mid = (k) => (typeof k === "number" ? k : ID[k] || 0);

  /* ------------------------------------------------------------ 물리 데이터 */
  // 이온 주입: 실리콘 속 투사 거리 Rp, 표준편차 ΔRp (nm). 교육용 근사 표(LSS 계열 값에 맞춤)
  const RANGE = {
    B:  { E: [1, 5, 10, 20, 30, 50, 100, 200], Rp: [5.5, 19, 37, 70, 101, 162, 300, 530], dRp: [4, 11, 17, 28, 37, 52, 73, 95], type: "p", m: 11 },
    P:  { E: [1, 5, 10, 20, 30, 50, 100, 200], Rp: [3, 8, 14, 27, 41, 66, 135, 280], dRp: [2, 4, 7, 12, 17, 26, 46, 82], type: "n", m: 31 },
    As: { E: [1, 5, 10, 20, 30, 50, 100, 200], Rp: [2.5, 6, 10, 17, 24, 37, 68, 130], dRp: [1.2, 2.5, 4, 6.5, 9, 14, 25, 45], type: "n", m: 75 },
    BF2:{ alias: "B", factor: 11 / 49, type: "p", m: 49 },
  };
  function logInterp(xs, ys, x) {
    const lx = Math.log(x);
    if (x <= xs[0]) return ys[0] * Math.pow(x / xs[0], Math.log(ys[1] / ys[0]) / Math.log(xs[1] / xs[0]));
    for (let i = 1; i < xs.length; i++) {
      if (x <= xs[i] || i === xs.length - 1) {
        const a = Math.log(xs[i - 1]), b = Math.log(xs[i]);
        const t = (lx - a) / (b - a);
        return Math.exp(Math.log(ys[i - 1]) + t * (Math.log(ys[i]) - Math.log(ys[i - 1])));
      }
    }
    return ys[ys.length - 1];
  }
  /** XS.range('B', 30) → {Rp, dRp, type} (nm) */
  function range(sp, E) {
    let d = RANGE[sp], f = 1;
    if (d.alias) { f = d.factor; d = RANGE[d.alias]; }
    const e = Math.max(0.2, E * f);
    return { Rp: logInterp(d.E, d.Rp, e), dRp: logInterp(d.E, d.dRp, e), type: RANGE[sp].type };
  }
  // 고유(intrinsic) 확산 계수 D = D0 exp(-Ea/kT), cm²/s
  const DIFF = { B: [0.76, 3.46], P: [3.85, 3.66], As: [0.066, 3.44], Sb: [0.214, 3.65] };
  const kB = 8.617e-5;
  function diffusivity(sp, Tc) { const d = DIFF[sp]; return d[0] * Math.exp(-d[1] / (kB * (Tc + 273.15))); }
  // Deal–Grove 계수 (100) 실리콘. B: µm²/h, B/A: µm/h
  function dealGrove(Tc, ambient, orient) {
    const T = Tc + 273.15;
    let B, BA;
    if (ambient === "wet") { B = 386 * Math.exp(-0.78 / (kB * T)); BA = 1.63e8 * Math.exp(-2.05 / (kB * T)); }
    else { B = 772 * Math.exp(-1.23 / (kB * T)); BA = 6.23e6 * Math.exp(-2.0 / (kB * T)); }
    if (orient === "111") BA *= 1.68;
    return { B, BA, A: B / BA };
  }
  /** 주어진 시간(h) 후 산화막 두께(µm), 초기 두께 xi(µm) */
  function dgThickness(B, A, th, xi = 0) {
    const tau = (xi * xi + A * xi) / B;
    return (-A + Math.sqrt(A * A + 4 * B * (th + tau))) / 2;
  }

  /* ------------------------------------------------------------ 광선 분포 */
  function makeDist(kind, a = 0, b = 0) {
    const rays = [];
    if (kind === "ion") {           // a = σ(도), b = 틸트(도)
      const s = Math.max(0.5, a), n = 13;
      for (let i = 0; i < n; i++) {
        const th = b + (-3 + (6 * i) / (n - 1)) * s;
        if (Math.abs(th) >= 89) continue;
        rays.push([th, Math.exp(-0.5 * Math.pow((th - b) / s, 2))]);
      }
    } else {                        // 'iso': 등방 기체(입사 코사인은 별도), 'cosn': cos^a 분포(PVD)
      const n = 29;
      for (let i = 0; i < n; i++) {
        const th = -87 + (174 * i) / (n - 1);
        const w = kind === "cosn" ? Math.pow(Math.cos((th * Math.PI) / 180), a) : 1;
        rays.push([th, w]);
      }
    }
    const out = rays.map(([th, w]) => { const r = (th * Math.PI) / 180; return { sx: Math.sin(r), sy: -Math.cos(r), w }; });
    let norm = 0; out.forEach((r) => (norm += r.w * -r.sy));
    out.forEach((r) => (r.w /= norm));
    return out;
  }

  /* ------------------------------------------------------------ Sim */
  function Sim(o = {}) {
    this.W = o.W || 160; this.H = o.H || 100; this.dx = o.dx || 2;
    this.surf = o.surf != null ? o.surf : Math.round(this.H * 0.45);   // 초기 실리콘 표면 행
    const N = this.W * this.H;
    this.mat = new Uint8Array(N); this.acc = new Float32Array(N);
    this.nd = new Float32Array(N); this.na = new Float32Array(N);
    this.log = [];
    if (o.substrate !== false) {
      const sub = mid(o.substrate || "si");
      for (let y = this.surf; y < this.H; y++) for (let x = 0; x < this.W; x++) this.mat[y * this.W + x] = sub;
      if (o.bgType && o.bgConc) { const arr = o.bgType === "n" ? this.nd : this.na; for (let i = this.surf * this.W; i < N; i++) arr[i] = o.bgConc; }
    }
  }
  const SP = Sim.prototype;
  SP.clone = function () {
    const s = Object.create(Sim.prototype);
    s.W = this.W; s.H = this.H; s.dx = this.dx; s.surf = this.surf;
    s.mat = this.mat.slice(); s.acc = this.acc.slice(); s.nd = this.nd.slice(); s.na = this.na.slice();
    s.log = this.log.slice();
    return s;
  };
  SP.col = function (xnm) { return Math.round(xnm / this.dx); };
  SP.row = function (ynm) { return this.surf + Math.round(ynm / this.dx); };
  SP.ynm = function (row) { return (row - this.surf) * this.dx; };
  SP.at = function (x, y) { const W = this.W; if (y < 0 || y >= this.H) return 0; return this.mat[y * W + (((x % W) + W) % W)]; };
  /** 직사각형 채우기 (nm 좌표) */
  SP.rect = function (m, x0, x1, y0, y1) {
    const id = mid(m);
    const c0 = this.col(x0), c1 = this.col(x1), r0 = this.row(y0), r1 = this.row(y1);
    for (let y = Math.max(0, r0); y < Math.min(this.H, r1); y++) for (let x = c0; x < c1; x++) { const i = y * this.W + (((x % this.W) + this.W) % this.W); this.mat[i] = id; this.acc[i] = 0; }
    return this;
  };
  SP.topRow = function () { const W = this.W; for (let i = 0; i < this.mat.length; i++) if (this.mat[i]) return (i / W) | 0; return this.H; };
  /** 열 x의 가장 위 고체 행 */
  SP.surfRow = function (x) { for (let y = 0; y < this.H; y++) if (this.mat[y * this.W + x]) return y; return this.H; };
  SP.count = function (m) { const id = mid(m); let n = 0; for (let i = 0; i < this.mat.length; i++) if (this.mat[i] === id) n++; return n; };

  /** 위(기체)와 연결된 빈 셀 표시: 1 = 연결, 0 = 막힘(보이드) */
  SP.reach = function () {
    const W = this.W, H = this.H, m = this.mat, r = new Uint8Array(W * H), q = new Int32Array(W * H);
    let h = 0, t = 0;
    for (let x = 0; x < W; x++) if (!m[x]) { r[x] = 1; q[t++] = x; }
    while (h < t) {
      const i = q[h++], x = i % W, y = (i / W) | 0;
      const nb = [y > 0 ? i - W : -1, y < H - 1 ? i + W : -1, y * W + ((x + 1) % W), y * W + ((x - 1 + W) % W)];
      for (const j of nb) if (j >= 0 && !m[j] && !r[j]) { r[j] = 1; q[t++] = j; }
    }
    return r;
  };

  /** 셀 (x,y) 의 바깥(빈 공간) 방향 법선. 5×5 점유도 기울기 */
  SP.normal = function (x, y) {
    const W = this.W, H = this.H, m = this.mat;
    let gx = 0, gy = 0;
    for (let dy = -2; dy <= 2; dy++) {
      const yy = y + dy; if (yy < 0) continue;
      for (let dx = -2; dx <= 2; dx++) {
        if (!dx && !dy) continue;
        const occ = yy >= H ? 1 : m[yy * W + (((x + dx) % W) + W) % W] ? 1 : 0;
        const w = 1 / (dx * dx + dy * dy);
        gx += occ * dx * w; gy += occ * dy * w;
      }
    }
    const L = Math.hypot(gx, gy);
    if (L < 1e-6) return [0, -1];
    return [-gx / L, -gy / L];
  };

  /** 광선 가시도: (x,y) 셀 중심에서 dist의 각 방향으로 기체(최상단)까지 막히지 않은 비율 × 입사 코사인 */
  SP.flux = function (x, y, dist, n, top) {
    const W = this.W, m = this.mat;
    let F = 0;
    const startI = y * W + x;
    for (let k = 0; k < dist.length; k++) {
      const r = dist[k];
      const cosi = r.sx * n[0] + r.sy * n[1];
      if (cosi <= 0) continue;
      let px = x + 0.5, py = y + 0.5, ok = true;
      for (let s = 0; s < 4000; s++) {
        px += r.sx * 0.6; py += r.sy * 0.6;
        if (py < top) break;
        const cx = Math.floor(px), cy = Math.floor(py);
        const i = cy * W + (((cx % W) + W) % W);
        if (i === startI) continue;
        if (m[i]) { ok = false; break; }
      }
      if (ok) F += r.w * cosi;
    }
    return F;
  };

  /* ------------------------------------------------------------ 공정: 식각 */
  /**
   * p = { sel:{mat:상대속도}, rate:nm/s, time:s, ion:0..1(이온 지배 비율), sigma:도, tilt:도,
   *       wet:bool, rateFn:(i)=>상대속도 (선택), endpoint:{mat, over:0.3} }
   */
  SP.etchGen = function* (p) {
    const W = this.W, H = this.H, m = this.mat, acc = this.acc;
    const sel = new Float32Array(MATS.length);
    for (const k in p.sel || {}) sel[mid(k)] = p.sel[k];
    const ionF = p.wet ? 0 : p.ion != null ? p.ion : 0.85;
    const dIon = makeDist("ion", p.sigma != null ? p.sigma : 3, p.tilt || 0);
    const dNeu = makeDist("iso");
    const r0 = (p.rate || 5) / this.dx;   // cells/s at rel=1, flat
    let t = 0, tEnd = p.time || 10, it = 0, epHit = false;
    const epMat = p.endpoint ? mid(p.endpoint.mat) : 0;
    const R = new Float32Array(W * H);
    const list = [];
    while (t < tEnd - 1e-9 && it < 20000) {
      it++;
      const top = this.topRow();
      const reach = this.reach();
      list.length = 0;
      let maxR = 0, epCells = 0;
      for (let y = Math.max(0, top); y < H; y++) {
        for (let x = 0; x < W; x++) {
          const i = y * W + x, mt = m[i];
          if (!mt) continue;
          let rel = p.rateFn ? p.rateFn(i, mt) : sel[mt];
          if (rel <= 0) continue;
          // 노출 여부: 4-이웃 중 기체와 연결된 빈 셀
          const up = y > 0 ? i - W : -1, dn = y < H - 1 ? i + W : -1;
          const lf = y * W + ((x - 1 + W) % W), rt = y * W + ((x + 1) % W);
          const ex = (up >= 0 && !m[up] && reach[up]) || (dn >= 0 && !m[dn] && reach[dn]) || (!m[lf] && reach[lf]) || (!m[rt] && reach[rt]) || y === 0;
          if (!ex) continue;
          const n = this.normal(x, y);
          const nexp = (up >= 0 && !m[up] ? 1 : 0) + (dn >= 0 && !m[dn] ? 1 : 0) + (!m[lf] ? 1 : 0) + (!m[rt] ? 1 : 0);
          const L1 = Math.max(Math.abs(n[0]) + Math.abs(n[1]), nexp >= 3 ? 2.5 : 0);
          let F;
          if (p.wet) F = 1;
          else {
            const Fi = ionF > 0 ? this.flux(x, y, dIon, n, top) : 0;
            const Fn = ionF < 1 ? this.flux(x, y, dNeu, n, top) : 0;
            F = ionF * Fi + (1 - ionF) * Fn;
            if (epMat && mt === epMat && Fi > 0.5) epCells++;
          }
          const rr = r0 * rel * F * L1;
          if (rr <= 0) continue;
          R[i] = rr; list.push(i, n[0] * 10 | 0, n[1] * 10 | 0);
          if (rr > maxR) maxR = rr;
        }
      }
      if (p.endpoint && !epHit && it > 1 && epCells === 0) { epHit = true; tEnd = t * (1 + (p.endpoint.over || 0)); if (tEnd <= t) break; }
      if (!list.length || maxR <= 0) break;
      const dt = Math.min(0.5 / maxR, tEnd - t);
      for (let k = 0; k < list.length; k += 3) {
        const i = list[k];
        acc[i] += R[i] * dt;
        if (acc[i] >= 0.9999) {
          const over = acc[i] - 1;
          m[i] = 0; acc[i] = 0; this.nd[i] = 0; this.na[i] = 0;
          // 남은 양을 안쪽(법선 반대) 이웃에 넘긴다
          const nx = -list[k + 1] / 10, ny = -list[k + 2] / 10, x = i % W, y = (i / W) | 0;
          let j;
          if (Math.abs(nx) > Math.abs(ny)) j = y * W + ((x + (nx > 0 ? 1 : -1) + W) % W);
          else j = ny > 0 ? (y < H - 1 ? i + W : -1) : (y > 0 ? i - W : -1);
          if (j >= 0 && m[j] && (p.rateFn ? p.rateFn(j, m[j]) : sel[m[j]]) > 0) acc[j] += over * 0.8;
        }
        R[i] = 0;
      }
      t += dt;
      yield Math.min(1, t / tEnd);
    }
    // 마무리: 절반 넘게 깎인 셀은 제거 (셀보다 얇은 식각량의 반올림)
    for (let i = 0; i < m.length; i++) if (m[i] && acc[i] >= 0.5 && (p.rateFn ? p.rateFn(i, m[i]) : sel[m[i]]) > 0) { m[i] = 0; acc[i] = 0; this.nd[i] = 0; this.na[i] = 0; }
    this.lastTime = t;
  };

  /* ------------------------------------------------------------ 공정: 증착 */
  /**
   * p = { mat, thick:nm(평탄면 기준), mode:'ald'|'cvd'|'pvd'|'epi', stick:0..1 (CVD), cosn: PVD 지수,
   *       on:[재질...] (선택 성장) }
   */
  SP.depoGen = function* (p) {
    const W = this.W, H = this.H, m = this.mat, acc = this.acc, id = mid(p.mat);
    const mode = p.mode || "cvd";
    const stick = mode === "ald" ? 0 : mode === "pvd" ? 1 : p.stick != null ? p.stick : 0.3;
    const dist = mode === "pvd" ? makeDist("cosn", p.cosn != null ? p.cosn : 1) : makeDist("iso");
    const onSet = p.on ? new Set(p.on.map(mid)) : mode === "epi" ? new Set([ID.si, ID.epi, ID.poly]) : null;
    const total = p.thick / this.dx;  // cells on flat surface
    let done = 0, it = 0;
    const R = new Float32Array(W * H), list = [];
    while (done < total - 1e-6 && it < 20000) {
      it++;
      const top = Math.max(0, this.topRow() - 1);
      const reach = this.reach();
      list.length = 0;
      let maxR = 0;
      for (let y = top; y < H; y++) {
        for (let x = 0; x < W; x++) {
          const i = y * W + x;
          if (m[i] || !reach[i]) continue;
          const up = y > 0 ? m[i - W] : 0, dn = y < H - 1 ? m[i + W] : 0;
          const lf = m[y * W + ((x - 1 + W) % W)], rt = m[y * W + ((x + 1) % W)];
          if (!(up || dn || lf || rt)) continue;
          if (onSet && !(onSet.has(up) || onSet.has(dn) || onSet.has(lf) || onSet.has(rt) || (mode === "epi" && (up === id || dn === id || lf === id || rt === id)))) continue;
          const n = this.normal(x, y);  // 빈 셀에서 본 법선은 고체 반대(바깥) 방향
          const nsol = (up ? 1 : 0) + (dn ? 1 : 0) + (lf ? 1 : 0) + (rt ? 1 : 0);
          const L1 = Math.max(Math.abs(n[0]) + Math.abs(n[1]), nsol >= 3 ? 2.5 : 0);
          let F = 1;
          if (stick > 0) F = (1 - stick) + stick * this.flux(x, y, dist, n, top);
          if (mode === "epi") F = 1;
          const rr = F * L1;
          if (rr <= 0) continue;
          R[i] = rr; list.push(i, n[0] * 10 | 0, n[1] * 10 | 0);
          if (rr > maxR) maxR = rr;
        }
      }
      if (!list.length || maxR <= 0) break;
      const d = Math.min(0.5 / maxR, total - done);  // 평탄면 기준 진행량(셀)
      for (let k = 0; k < list.length; k += 3) {
        const i = list[k];
        acc[i] += R[i] * d;
        if (acc[i] >= 0.9999) {
          const over = acc[i] - 1;
          m[i] = id; acc[i] = 0;
          const nx = list[k + 1] / 10, ny = list[k + 2] / 10, x = i % W, y = (i / W) | 0;
          let j;
          if (Math.abs(nx) > Math.abs(ny)) j = y * W + ((x + (nx > 0 ? 1 : -1) + W) % W);
          else j = ny > 0 ? (y < H - 1 ? i + W : -1) : (y > 0 ? i - W : -1);
          if (j >= 0 && !m[j]) acc[j] += over * 0.8;
        }
        R[i] = 0;
      }
      done += d;
      yield done / total;
    }
    // 마무리: 절반 넘게 자란 셀은 막으로 (셀보다 얇은 두께의 반올림)
    for (let i = 0; i < m.length; i++) if (!m[i] && acc[i] >= 0.5) { m[i] = id; acc[i] = 0; } else if (!m[i]) acc[i] = 0;
  };

  /* ------------------------------------------------------------ 공정: 평탄 도포 (스핀 코팅) */
  /** 가장 높은 표면에서 thick(nm) 위까지 빈 공간을 채운다(위에서 내려다본 열 단위). */
  SP.coat = function (mat, thick, planar = 1) {
    const W = this.W, id = mid(mat);
    const tops = []; for (let x = 0; x < W; x++) tops.push(this.surfRow(x));
    const hi = Math.min(...tops);
    const t = Math.round(thick / this.dx);
    for (let x = 0; x < W; x++) {
      // planar=1: 완전 평탄, 0: 컨포멀
      const lvl = Math.round(planar * (hi - t) + (1 - planar) * (tops[x] - t));
      for (let y = Math.max(0, lvl); y < this.H; y++) { const i = y * W + x; if (this.mat[i]) break; this.mat[i] = id; this.acc[i] = 0; }
    }
  };
  SP.strip = function (mat) { const id = mid(mat); for (let i = 0; i < this.mat.length; i++) if (this.mat[i] === id) { this.mat[i] = 0; this.acc[i] = 0; } };

  /* ------------------------------------------------------------ 공정: 노광 */
  /**
   * 부분 결맞음 1차원 공중상(Abbe 합). 주기 = 도메인 폭.
   * o = { clear:[[x0,x1],...] 빛이 통과하는 구간(nm) | chrome:[[x0,x1]] 가리는 구간, wl, NA, sigma, focus(nm), z(nm) }
   * 반환: 열마다 상대 강도 (열린 큰 영역 = 1)
   */
  function aerial(W, dx, o, zList) {
    const P = W * dx, Nf = 256;
    const t = new Float32Array(Nf);
    const inChrome = (xn) => (o.chrome || []).some(([a, b]) => xn >= a && xn < b);
    const inClear = (xn) => (o.clear || []).some(([a, b]) => xn >= a && xn < b);
    for (let i = 0; i < Nf; i++) {
      const xn = ((i + 0.5) / Nf) * P;
      let v = o.clear ? (inClear(xn) ? 1 : 0) : inChrome(xn) ? 0 : 1;
      if (o.atten && v === 0) v = -Math.sqrt(o.atten);  // 감쇠형 위상 반전 마스크
      t[i] = v;
    }
    const fc = o.NA / o.wl;
    const K = Math.min(120, Math.ceil(fc * (1 + (o.sigma || 0.5)) * P) + 1);
    const Tr = [], Ti = [];
    for (let k = -K; k <= K; k++) {
      let re = 0, im = 0;
      for (let i = 0; i < Nf; i++) { const a = (-2 * Math.PI * k * i) / Nf; re += t[i] * Math.cos(a); im += t[i] * Math.sin(a); }
      Tr.push(re / Nf); Ti.push(im / Nf);
    }
    const S = Math.max(1, Math.round((o.sigma || 0) * 6));
    const srcs = [];
    if (!o.sigma) srcs.push(0); else for (let s = -S; s <= S; s++) srcs.push(((s / S) * o.sigma) * fc);
    const out = zList.map(() => new Float32Array(W));
    zList.forEach((zf, zi) => {
      const img = out[zi];
      srcs.forEach((fs) => {
        // 각 열의 복소 전기장
        for (let x = 0; x < W; x++) {
          const xn = (x + 0.5) * dx;
          let er = 0, ei = 0;
          for (let k = -K; k <= K; k++) {
            const f = k / P, ff = f + fs;
            if (Math.abs(ff) > fc) continue;
            const ph = (2 * Math.PI * f * xn) - Math.PI * o.wl * zf * (ff * ff);
            const c = Math.cos(ph), s = Math.sin(ph), a = Tr[k + K], b = Ti[k + K];
            er += a * c - b * s; ei += a * s + b * c;
          }
          img[x] += (er * er + ei * ei) / srcs.length;
        }
      });
    });
    return out;
  }

  /**
   * 노광 + 현상(Mack 현상 속도 모델). 감광막 셀에 잠상(억제제 농도 m)을 만들고 현상액으로 녹여 낸다.
   * p = { chrome|clear, wl, NA, sigma, dose(mJ/cm²), focus(nm), tone:'pos'|'neg', alpha(1/µm), swing:0..1, peb(nm), dev(s), C, rmax, rmin, n, mth }
   */
  SP.litho = function* (p) {
    const W = this.W, H = this.H, m = this.mat, PR = ID.pr, dx = this.dx;
    let top = H, bot = 0;
    for (let i = 0; i < m.length; i++) if (m[i] === PR) { const y = (i / W) | 0; if (y < top) top = y; if (y > bot) bot = y; }
    if (top > bot) return;
    const rows = []; for (let y = top; y <= bot; y++) rows.push(y);
    const nr = 1.7;
    const zl = rows.map((y) => (p.focus || 0) + ((y - top) * dx - ((bot - top + 1) * dx) / 2) / nr);   // 초점 기준 = 막 두께 중간
    const img = aerial(W, dx, { chrome: p.chrome, clear: p.clear, wl: p.wl || 193, NA: p.NA || 0.93, sigma: p.sigma != null ? p.sigma : 0.6, atten: p.atten }, zl);
    const alpha = (p.alpha != null ? p.alpha : 0.6) / 1000;   // 1/nm
    const sw = p.swing || 0, wl = p.wl || 193;
    const thick = (bot - top + 1) * dx;
    const lat = new Float32Array(W * H);
    rows.forEach((y, ri) => {
      const z = (y - top) * dx;
      const stand = 1 + sw * Math.cos((4 * Math.PI * nr * (thick - z)) / wl);
      for (let x = 0; x < W; x++) lat[y * W + x] = (p.dose || 30) * img[ri][x] * Math.exp(-alpha * z) * stand;
    });
    // PEB: 감광막 안에서 산 확산(가우시안 블러)
    if (p.peb) blurMasked(lat, m, PR, W, H, p.peb / dx);
    yield 0.3;
    const C = p.C || 0.04, rmax = p.rmax || 80, rmin = p.rmin || 0.05, n = p.n || 6, mth = p.mth != null ? p.mth : 0.45;
    const a = ((n + 1) / (n - 1)) * Math.pow(1 - mth, n);
    const neg = p.tone === "neg";
    const rate = new Float32Array(W * H);
    for (let i = 0; i < m.length; i++) if (m[i] === PR) {
      const mi = Math.exp(-C * lat[i]);
      let r = (rmax * (a + 1) * Math.pow(1 - mi, n)) / (a + Math.pow(1 - mi, n)) + rmin;
      if (neg) r = rmax + rmin - r;
      rate[i] = r;
    }
    const base = rmax;
    const g = this.etchGen({ wet: true, rate: base, time: p.dev || 40, rateFn: (i, mt) => (mt === PR ? rate[i] / base : 0) });
    for (const f of g) yield 0.3 + 0.7 * f;
    this.lastImage = img[Math.floor(img.length / 2)];
  };

  function blurMasked(a, m, id, W, H, sig) {
    if (sig < 0.3) return;
    const R = Math.ceil(sig * 3), k = [];
    for (let i = -R; i <= R; i++) k.push(Math.exp(-0.5 * (i / sig) * (i / sig)));
    const tmp = new Float32Array(W * H);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const i = y * W + x; if (m[i] !== id) continue;
      let s = 0, ws = 0;
      for (let d = -R; d <= R; d++) { const j = y * W + (((x + d) % W) + W) % W; if (m[j] === id) { s += a[j] * k[d + R]; ws += k[d + R]; } }
      tmp[i] = s / ws;
    }
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const i = y * W + x; if (m[i] !== id) continue;
      let s = 0, ws = 0;
      for (let d = -R; d <= R; d++) { const yy = y + d; if (yy < 0 || yy >= H) continue; const j = yy * W + x; if (m[j] === id) { s += tmp[j] * k[d + R]; ws += k[d + R]; } }
      a[i] = s / ws;
    }
  }

  /* ------------------------------------------------------------ 공정: 이온 주입 */
  /** p = { species:'B'|'P'|'As'|'BF2', E:keV, dose:cm^-2, tilt:도, channel:0..1 (채널링 꼬리 비율) } */
  SP.implant = function (p) {
    const W = this.W, H = this.H, m = this.mat, dx = this.dx;
    const r = range(p.species, p.E);
    const arr = r.type === "n" ? this.nd : this.na;
    const add = new Float32Array(W * H);
    const th = ((p.tilt || 0) * Math.PI) / 180, sx = Math.sin(th), sy = Math.cos(th);
    const Rp = r.Rp, dR = r.dRp, ch = p.channel || 0, lam = Rp * 0.8 + 2 * dR;
    const peak = p.dose / (Math.sqrt(2 * Math.PI) * dR * 1e-7);  // cm^-3
    for (let x0 = 0; x0 < W; x0++) {
      // 위에서 비스듬히 들어오는 광선을 따라 등가 실리콘 깊이 누적
      let px = x0 + 0.5 - sx * this.surf * 1.0, py = 0, z = 0;
      const step = 0.5;
      for (let s = 0; s < H * 4; s++) {
        px += sx * step; py += sy * step;
        if (py >= H) break;
        const cx = Math.floor(px), cy = Math.floor(py);
        const i = cy * W + (((cx % W) + W) % W);
        const mt = m[i];
        if (!mt) continue;
        const dz = step * dx * MATS[mt].k;
        const zc = z + dz / 2;
        z += dz;
        let c = (1 - ch) * peak * Math.exp(-0.5 * Math.pow((zc - Rp) / dR, 2));
        if (ch > 0 && zc > Rp) c += ch * p.dose / (lam * 1e-7) * Math.exp(-(zc - Rp) / lam);
        add[i] += c * step;  // 셀 하나를 지나는 길이(셀 단위) 가중
        if (z > Rp + 8 * dR + (ch ? 6 * lam : 0)) break;
      }
    }
    // 측면 퍼짐 (ΔR⊥ ≈ 0.8 ΔRp)
    const sig = (0.8 * dR) / dx;
    if (sig > 0.3) {
      const R = Math.ceil(sig * 3), k = [];
      let ks = 0;
      for (let i = -R; i <= R; i++) { const v = Math.exp(-0.5 * (i / sig) * (i / sig)); k.push(v); ks += v; }
      const row = new Float32Array(W);
      for (let y = 0; y < H; y++) {
        for (let x = 0; x < W; x++) { let s = 0; for (let d = -R; d <= R; d++) s += add[y * W + (((x + d) % W) + W) % W] * k[d + R]; row[x] = s / ks; }
        for (let x = 0; x < W; x++) { const i = y * W + x; if (m[i]) arr[i] += row[x]; }
      }
    } else for (let i = 0; i < W * H; i++) if (m[i]) arr[i] += add[i];
    return r;
  };

  /* ------------------------------------------------------------ 공정: 열처리(확산) */
  /** p = { T:°C, time:s }  실리콘·폴리·에피 안에서만 확산 (n형=P, p형=B 확산 계수 사용) */
  SP.diffuse = function (p) {
    const out = {};
    [["nd", "P"], ["na", "B"]].forEach(([key, sp]) => {
      const D = diffusivity(p.species && p.species[key] ? p.species[key] : sp, p.T);  // cm²/s
      const L = Math.sqrt(2 * D * p.time) * 1e7;  // nm (가우시안 σ = √(2Dt))
      out[key] = L / Math.SQRT2;                  // √(Dt) 보고
      const sig = Math.min(L / this.dx, 80);
      if (sig < 0.3) return;
      const steps = Math.max(1, Math.ceil((sig / 6) * (sig / 6)));
      const s1 = sig / Math.sqrt(steps);
      const a = this[key], m = this.mat;
      const semi = new Uint8Array(m.length);
      for (let i = 0; i < m.length; i++) semi[i] = m[i] && MATS[m[i]].semi ? 1 : 0;
      for (let s = 0; s < Math.min(steps, 40); s++) blurMaskedSet(a, semi, this.W, this.H, s1 * (steps > 40 ? Math.sqrt(steps / 40) : 1));
    });
    return out;
  };
  function blurMaskedSet(a, mask, W, H, sig) {
    const R = Math.ceil(sig * 3), k = [];
    for (let i = -R; i <= R; i++) k.push(Math.exp(-0.5 * (i / sig) * (i / sig)));
    const tmp = new Float32Array(W * H);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const i = y * W + x; if (!mask[i]) continue;
      let s = 0, ws = 0;
      for (let d = -R; d <= R; d++) { const j = y * W + (((x + d) % W) + W) % W; if (mask[j]) { s += a[j] * k[d + R]; ws += k[d + R]; } }
      tmp[i] = s / ws;
    }
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const i = y * W + x; if (!mask[i]) continue;
      let s = 0, ws = 0;
      for (let d = -R; d <= R; d++) { const yy = y + d; if (yy < 0 || yy >= H) continue; const j = yy * W + x; if (mask[j]) { s += tmp[j] * k[d + R]; ws += k[d + R]; } }
      a[i] = s / ws;
    }
  }

  /* ------------------------------------------------------------ 공정: 열산화 */
  /**
   * p = { T:°C, time:min, ambient:'dry'|'wet', orient:'100'|'111' }
   * 실리콘 표면에서 산화제가 산화막만을 지나 기체까지 가는 최단 경로 길이 X로 국소 Deal–Grove
   * 성장 속도 dX/dt = B/(A+2X)를 쓴다. 질화막은 산화제를 막는다. 소모된 실리콘 1에 대해
   * 산화막 2.27이 생기므로 남는 부피는 바깥쪽 고체를 밀어 올린다(LOCOS 버즈 빅, 질화막 들림).
   */
  SP.oxidizeGen = function* (p) {
    const W = this.W, H = this.H, m = this.mat, acc = this.acc, dx = this.dx;
    const OX = ID.ox;
    const dg = dealGrove(p.T, p.ambient, p.orient);
    const BA = (dg.BA * 1e3) / 3600, Bn = (dg.B * 1e6) / 3600;   // nm/s, nm²/s
    const D = Bn / 2, k = BA;                                    // B = 2DC*/N1, B/A = kC*/N1 (C* = 1로 정규화)
    const a = D / (dx * dx), b = k / dx;
    const tEnd = (p.time || 10) * 60;
    let t = 0, it = 0;
    const C = new Float32Array(W * H);
    const expand = new Float32Array(W * H);
    const nbr = (i) => { const x = i % W, y = (i / W) | 0; return [y > 0 ? i - W : -1, y < H - 1 ? i + W : -1, y * W + ((x + 1) % W), y * W + ((x - 1 + W) % W)]; };
    const isSemi = (mt) => mt && MATS[mt].semi;
    while (t < tEnd - 1e-6 && it < 8000) {
      it++;
      const reach = this.reach();
      // 1) 산화막 속 산화제 농도: 정상 상태 확산 (기체 면 C=1, 실리콘 면 흡수 kC), SOR 반복
      const ox = [];
      for (let i = 0; i < W * H; i++) if (m[i] === OX) ox.push(i);
      const info = ox.map((i) => {
        let nOx = [], nGas = 0, nSi = 0;
        for (const j of nbr(i)) { if (j < 0) continue; const mt = m[j]; if (mt === OX) nOx.push(j); else if (!mt && reach[j]) nGas++; else if (isSemi(mt)) nSi++; }
        return { i, nOx, den: nOx.length * a + nGas * 2 * a + nSi * b, src: nGas * 2 * a };
      });
      // SOR, 바뀐 값이 충분히 작아질 때까지(이전 단계 값에서 출발). 고정 횟수(24회)로는 산화막이 두꺼워질수록
      // 농도장이 덜 수렴해 성장 속도가 Deal–Grove보다 10 % 남짓 느렸다.
      const maxSweeps = it === 1 ? 600 : 300;
      for (let s = 0; s < maxSweeps; s++) {
        let dmax = 0;
        for (const o of info) {
          if (o.den <= 0) continue;
          let sum = o.src; for (const j of o.nOx) sum += a * C[j];
          const v = sum / o.den, old = C[o.i];
          let c = old + 1.7 * (v - old);
          if (c < 0) c = 0; else if (c > 1) c = 1;
          C[o.i] = c;
          const dd = c > old ? c - old : old - c; if (dd > dmax) dmax = dd;
        }
        if (s >= 6 && dmax < 1e-6) break;
      }
      // 2) 실리콘 셀의 소모 속도 = 0.44 × Σ(면을 통한 산화막 성장 속도) / dx
      const list = [];
      let maxR = 0;
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
        const i = y * W + x;
        if (!isSemi(m[i])) continue;
        let v = 0, gx = 0, gy = 0;
        const nb = nbr(i), dirs = [[0, -1], [0, 1], [1, 0], [-1, 0]];
        for (let q = 0; q < 4; q++) {
          const j = nb[q]; if (j < 0) continue;
          let f = 0;
          if (!m[j] && reach[j]) f = k; else if (m[j] === OX) f = k * C[j];
          if (f > 0) { v += f; gx += dirs[q][0] * f; gy += dirs[q][1] * f; }
        }
        if (v <= 0) continue;
        const rr = (0.44 * v) / dx;
        list.push(i, rr, gx, gy);
        if (rr > maxR) maxR = rr;
      }
      if (!list.length) break;
      const dt = Math.min(0.5 / maxR, tEnd - t);
      for (let q = 0; q < list.length; q += 4) {
        const i = list[q];
        acc[i] += list[q + 1] * dt;
        if (acc[i] >= 0.9999) {
          acc[i] = 0; m[i] = OX; C[i] = 0.5; this.nd[i] *= 0.3; this.na[i] *= 0.3;
          expand[i] += 1.27;
          // 부피 팽창: 산화제가 들어온 쪽(가로 또는 위)으로 첫 빈 셀까지 고체를 한 칸 민다
          while (expand[i] >= 1) { expand[i] -= 1; this.push(i, list[q + 2], list[q + 3], OX); }
          // 남은 몫(0.27…)은 다음에 산화될 안쪽 실리콘 셀로 넘긴다. 버리면 산화막이 2/2.27로 얇아지고 소모 비율이 44 % 대신 50 %가 된다.
          if (expand[i] > 0) {
            const gx = -list[q + 2], gy = -list[q + 3], x = i % W, y = (i / W) | 0;
            const hz = y * W + ((x + (gx > 0 ? 1 : -1) + W) % W), vt = gy > 0 ? (y < H - 1 ? i + W : -1) : (y > 0 ? i - W : -1);
            const order = Math.abs(gx) > Math.abs(gy) * 1.2 ? [hz, vt] : [vt, hz];
            const j = order.find((k) => k >= 0 && isSemi(m[k]));
            if (j != null) expand[j] += expand[i];
            expand[i] = 0;
          }
        }
      }
      t += dt;
      yield t / tEnd;
    }
  };
  /** 셀 i에서 (nx,ny) 쪽으로 첫 빈 셀까지 한 칸씩 밀고, i 옆에 재질 id를 끼워 넣는다 */
  SP.push = function (i, nx, ny, id) {
    const W = this.W, m = this.mat, x = i % W, y = (i / W) | 0;
    let ddx = 0, ddy = 0;
    if (Math.abs(nx) > Math.abs(ny) * 1.2) ddx = nx > 0 ? 1 : -1; else ddy = -1;
    const cells = [];
    let cx = x, cy = y;
    for (let s = 0; s < 400; s++) {
      cx += ddx; cy += ddy;
      if (cy < 0) return;
      const j = cy * W + (((cx % W) + W) % W);
      cells.push(j);
      if (!m[j]) break;
    }
    for (let k = cells.length - 1; k > 0; k--) { const a = cells[k], b = cells[k - 1]; m[a] = m[b]; this.acc[a] = this.acc[b]; this.nd[a] = this.nd[b]; this.na[a] = this.na[b]; }
    m[cells[0]] = id; this.acc[cells[0]] = 0; this.nd[cells[0]] = 0; this.na[cells[0]] = 0;
  };

  /* ------------------------------------------------------------ 공정: CMP */
  /**
   * p = { stop:재질 | level:nm(실리콘 표면 기준 높이, 위가 -), over:nm, dish:{mat:최대 디싱 nm}, w0:nm }
   */
  SP.cmp = function (p) {
    const W = this.W, H = this.H, m = this.mat, dx = this.dx;
    let L;
    if (p.stop) {
      const sid = mid(p.stop); L = H;
      for (let i = 0; i < m.length; i++) if (m[i] === sid) { L = (i / W) | 0; break; }
      if (L >= H) L = this.row(p.level || 0);
    } else L = this.row(p.level || 0);
    L += Math.round((p.over || 0) / dx);
    for (let y = 0; y < Math.min(L, H); y++) for (let x = 0; x < W; x++) { const i = y * W + x; m[i] = 0; this.acc[i] = 0; this.nd[i] = 0; this.na[i] = 0; }
    // 디싱: 무른 재질이 넓을수록 오목하게 더 깎인다
    if (p.dish) {
      const w0 = (p.w0 || 200) / dx;
      for (const key in p.dish) {
        const id = mid(key), dmax = p.dish[key] / dx;
        let x = 0;
        while (x < W) {
          if (m[L * W + x] !== id) { x++; continue; }
          let x1 = x; while (x1 < W && m[L * W + x1] === id) x1++;
          const w = x1 - x, depth = dmax * (1 - Math.exp(-w / w0));
          for (let c = x; c < x1; c++) {
            const u = (c - x + 0.5) / w, d = Math.round(depth * (1 - Math.pow(2 * u - 1, 2)) );
            for (let y = L; y < Math.min(H, L + d); y++) { const i = y * W + c; if (m[i] === id) m[i] = 0; }
          }
          x = x1;
        }
      }
    }
    return L;
  };

  /* ------------------------------------------------------------ 실리사이드 (자기 정렬) */
  /** 노출된 실리콘/폴리 표면 depth nm를 실리사이드로 바꾼다 (금속 증착-반응-미반응 금속 제거를 한 번에) */
  SP.silicide = function (depth) {
    const W = this.W, H = this.H, m = this.mat, reach = this.reach(), SIL = ID.sil;
    const d = Math.max(1, Math.round(depth / this.dx));
    const mark = new Uint8Array(W * H);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const i = y * W + x; if (!(m[i] === ID.si || m[i] === ID.poly || m[i] === ID.epi)) continue;
      const up = y > 0 ? i - W : -1;
      if (up >= 0 && !m[up] && reach[up]) for (let k = 0; k < d && y + k < H; k++) { const j = i + k * W; if (m[j] === ID.si || m[j] === ID.poly || m[j] === ID.epi) mark[j] = 1; }
    }
    for (let i = 0; i < W * H; i++) if (mark[i]) m[i] = SIL;
  };

  /* ------------------------------------------------------------ 단계 실행기 */
  /**
   * step 객체를 받아 제너레이터로 실행한다.
   *  {op:'depo', ...} {op:'etch', ...} {op:'coat', mat, thick} {op:'litho', ...} {op:'strip', mat}
   *  {op:'implant', ...} {op:'anneal', T, time, ambient} {op:'ox', ...} {op:'cmp', ...} {op:'silicide', depth}
   *  {op:'rect', mat, x0,x1,y0,y1}
   */
  SP.stepGen = function* (st) {
    switch (st.op) {
      case "depo": yield* this.depoGen(st); break;
      case "etch": yield* this.etchGen(st); break;
      case "coat": this.coat(st.mat || "pr", st.thick, st.planar != null ? st.planar : 1); break;
      case "litho":
        if (st.thick) this.coat("pr", st.thick, 1);
        yield* this.litho(st); break;
      case "strip": (Array.isArray(st.mat) ? st.mat : [st.mat]).forEach((k) => this.strip(k)); break;
      case "implant": this.result = this.implant(st); break;
      case "anneal":
        if (st.ambient === "dry" || st.ambient === "wet") yield* this.oxidizeGen({ T: st.T, time: st.time / 60, ambient: st.ambient });
        this.result = this.diffuse({ T: st.T, time: st.time }); break;
      case "ox": yield* this.oxidizeGen(st); if (st.diffuse !== false) this.diffuse({ T: st.T, time: st.time * 60 }); break;
      case "cmp": this.cmp(st); break;
      case "silicide": this.silicide(st.depth || 10); break;
      case "rect": this.rect(st.mat, st.x0, st.x1, st.y0, st.y1); break;
      case "fn": st.fn(this); break;
    }
    yield 1;
  };
  SP.run = function (st) { for (const _ of this.stepGen(st)); return this; };

  /**
   * 단계 목록을 순서대로 계산해 스냅숏을 보관하는 실행기. 애니메이션 지원.
   *   const R = XS.runner(() => new XS.Sim({...}), steps, (sim, k, prog) => draw());
   *   R.goto(k, animate)  R.cur  R.sim(k)
   */
  function runner(make, steps, onUpdate) {
    const R = { steps, snaps: [make()], cur: 0, busy: false, live: null };
    let job = null, raf = 0;
    function ensure(k) { while (R.snaps.length <= k) { const s = R.snaps[R.snaps.length - 1].clone(); s.run(steps[R.snaps.length - 1]); R.snaps.push(s); } }
    R.sim = (k) => { ensure(k); return R.snaps[k]; };
    R.reset = (newSteps) => { cancel(); if (newSteps) R.steps = steps = newSteps; R.snaps = [make()]; R.cur = 0; onUpdate && onUpdate(R.snaps[0], 0, 1); };
    R.truncate = (k) => { cancel(); R.snaps.length = Math.min(R.snaps.length, k + 1); };
    function cancel() { if (raf) cancelAnimationFrame(raf); raf = 0; job = null; R.busy = false; R.live = null; }
    R.cancel = cancel;
    R.goto = function (k, animate) {
      cancel();
      k = Math.max(0, Math.min(steps.length, k));
      if (animate && k === R.cur + 1 && R.snaps.length <= k) {
        const s = R.snaps[k - 1].clone();
        const g = s.stepGen(steps[k - 1]);
        R.busy = true; R.live = s; job = { g, s, k };
        const tick = () => {
          const t0 = performance.now();
          let prog = 0, done = false;
          while (performance.now() - t0 < 14) { const r = job.g.next(); if (r.done) { done = true; break; } prog = r.value; }
          if (done) { R.snaps[k] = s; R.cur = k; R.busy = false; R.live = null; job = null; raf = 0; onUpdate && onUpdate(s, k, 1); return; }
          onUpdate && onUpdate(s, k, prog);
          raf = requestAnimationFrame(tick);
        };
        raf = requestAnimationFrame(tick);
        return;
      }
      ensure(k); R.cur = k; onUpdate && onUpdate(R.snaps[k], k, 1);
    };
    return R;
  }

  /* ------------------------------------------------------------ 그리기 */
  /*
   * 렌더러(v2, 벡터). 셀 격자를 매끄러운 다각형으로 바꿔 그린다.
   * 1) 다재질 마칭 스퀘어: 셀 중심을 꼭짓점으로 하는 작은 사각형마다, 재질이 다른 변의 가운데에 경계점을 둔다.
   *    재질이 셋 이상 만나면 사각형 가운데에 접점을 둔다. 사각형 안의 영역은 그 재질의 작은 다각형이 된다.
   * 2) 이완: 경계점을 자기 격자 변 위에서만(±0.45셀) 이웃 경계점의 평균 쪽으로 여러 번 옮긴다.
   *    계단(디지털 직선)은 곧은 선·곡선이 되고, 1셀 두께 막과 2셀 이상의 실제 굴곡(스캘럽·정재파)은 남는다.
   *    이웃한 두 재질이 같은 경계점을 쓰므로 틈이나 겹침이 생기지 않는다.
   * 3) 그리기: 재질마다 하나의 경로로 채우고(위→아래 음영, style.css의 --m-<재질>-1/-2), 경계를 --m-<재질>-e 선으로 긋는다.
   *    도핑은 셀 해상도 틴트 이미지를 매끄럽게 확대해 반도체 영역에만, p-n 접합은 순 도핑 0 등고선을 점선으로.
   * 기하는 셀 단위로 캐시하므로 커서 이동·리사이즈 때 다시 계산하지 않는다.
   */
  let palCache = null;
  if (window.PB && PB.onTheme) PB.onTheme(() => { palCache = null; });
  function cssRGB(cs, name) { const v = cs.getPropertyValue(name).trim(); return v ? hex2rgb(toHex(v)) : null; }
  const rgbStr = (c, a) => (a == null ? `rgb(${c[0] | 0},${c[1] | 0},${c[2] | 0})` : `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a})`);
  function palette() {
    const theme = (PB.isDark() ? "d" : "l") + (document.documentElement.getAttribute("data-theme") || "");
    if (palCache && palCache.theme === theme) return palCache;
    const cs = getComputedStyle(document.documentElement);
    const mats = MATS.map((m) => {
      if (!m) return null;
      const base = m.rgb;
      const c1 = cssRGB(cs, `--m-${m.key}-1`) || base.map((v) => Math.min(255, v + 18));
      const c2 = cssRGB(cs, `--m-${m.key}-2`) || base;
      const e = cssRGB(cs, `--m-${m.key}-e`) || base.map((v) => v * 0.72);
      return { c1, c2, e };
    });
    const bg = cssRGB(cs, "--canvas-bg") || [255, 255, 255];
    const txt = cssRGB(cs, "--text") || [20, 26, 38];
    const vd = bg.map((v, i) => v + (txt[i] - v) * 0.16);
    mats.push({ c1: vd, c2: vd, e: bg.map((v, i) => v + (txt[i] - v) * 0.35) });   // VOID(닫힌 빈 공간)
    palCache = {
      theme, mats, bg, txt,
      nTint: cssRGB(cs, "--m-np-2") || [61, 123, 224],
      pTint: cssRGB(cs, "--m-pp-2") || [224, 87, 74],
      junc: cssRGB(cs, "--junction") || [232, 177, 0],
      dark: PB.isDark(),
    };
    return palCache;
  }
  /** 재질 색(CSS 문자열): XS.color('ox') → 아래쪽 색, XS.color('ox','1') → 위쪽 색, XS.color('ox','e') → 경계색 */
  function matColor(k, which) {
    const p = palette().mats[mid(k)]; if (!p) return "transparent";
    return rgbStr(which === "e" ? p.e : which === "1" ? p.c1 : p.c2);
  }

  // 단면 해시: 재질·도핑이 같으면 같은 값(캐시 키)
  function simHash(sim, r0, r1) {
    let h = 2166136261 >>> 0;
    const W = sim.W, m = sim.mat, a = r0 * W, b = r1 * W;
    for (let i = a; i < b; i++) { h ^= m[i]; h = Math.imul(h, 16777619); }
    const nd = new Uint32Array(sim.nd.buffer, sim.nd.byteOffset, sim.nd.length), na = new Uint32Array(sim.na.buffer, sim.na.byteOffset, sim.na.length);
    for (let i = a; i < b; i++) { const v = nd[i] ^ Math.imul(na[i], 31); if (v) { h ^= v; h = Math.imul(h, 16777619); } }
    return h >>> 0;
  }

  const SHORT = { si: "Si", ox: "SiO_2", nit: "Si_3N_4", poly: "poly-Si", pr: "PR", w: "W", cu: "Cu", al: "Al", tin: "TiN", hk: "HfO_2", sil: "NiSi", epi: "SiGe", lowk: "low-k", acl: "ACL", cfx: "CF_x" };
  // 안장점(대각선 두 칸만 같은 재질)에서 어느 재질을 이어 줄지: 빈 공간 < 보이드 < 실리콘 < 나머지(얇은 막일 가능성이 큼)
  const prio = (m, VOID) => (m === 0 ? -2 : m === VOID ? -1 : m === ID.si ? 0 : m);

  /**
   * 셀 단위 기하. 좌표는 보이는 영역의 왼쪽 위가 (0,0), 셀 하나가 1.
   * 반환 { mats:[{m, rects:[x,y,w,h…], polys:[[x,y,…]…]}], edges:[{a,b,pts:[x,y,…]}…], semi:Path 데이터, tint, junc:[[x,y,…]…] }
   */
  function geometry(sim, r0, r1, o) {
    const W = sim.W, rows = r1 - r0, mat = sim.mat, NM = MATS.length, VOID = NM;
    const PAD = 1, PW = W + 2 * PAD, PH = rows + 2 * PAD;
    let enclosed = null;
    if (o.voids !== false) {
      const reach = sim.reach();
      for (let y = r0; y < r1; y++) for (let x = 0; x < W; x++) { const i = y * W + x; if (!mat[i] && !reach[i]) { if (!enclosed) enclosed = new Uint8Array(mat.length); enclosed[i] = 1; } }
    }
    const L = new Uint8Array(PW * PH);
    for (let y = 0; y < PH; y++) for (let x = 0; x < PW; x++) {
      const sx = Math.min(W - 1, Math.max(0, x - PAD)), sy = Math.min(rows - 1, Math.max(0, y - PAD)) + r0;
      const i = sy * W + sx; let m = mat[i];
      if (!m && enclosed && enclosed[i]) m = VOID;
      L[y * PW + x] = m;
    }
    // 꼭짓점: H변(가로 이웃 셀 중심 사이) idx = y*PW+x, V변 idx = NE + y*PW+x, 사각형 중심 idx = 2NE + y*PW+x
    const NE = PW * PH, NV = 3 * NE;
    const VX = new Float32Array(NV), VY = new Float32Array(NV), used = new Uint8Array(NV);
    const nb = new Int32Array(NV * 4).fill(-1), deg = new Uint8Array(NV);
    const cx = (x) => x + 0.5 - PAD, cy = (y) => y + 0.5 - PAD;   // 셀 중심 좌표(보이는 영역 기준)
    const hV = (x, y) => { const v = y * PW + x; if (!used[v]) { used[v] = 1; VX[v] = cx(x) + 0.5; VY[v] = cy(y); } return v; };
    const vV = (x, y) => { const v = NE + y * PW + x; if (!used[v]) { used[v] = 2; VX[v] = cx(x); VY[v] = cy(y) + 0.5; } return v; };
    const cV = (x, y) => { const v = 2 * NE + y * PW + x; if (!used[v]) { used[v] = 3; VX[v] = cx(x) + 0.5; VY[v] = cy(y) + 0.5; } return v; };
    const link = (a, b) => { if (deg[a] < 4) nb[a * 4 + deg[a]++] = b; if (deg[b] < 4) nb[b * 4 + deg[b]++] = a; };
    const segs = [];          // [a, b, matLeft?, matRight?] — 경계선 그리기용(양쪽 재질)
    const regions = [];       // 재질별 다각형: {m, ring:[(-1-cornerIdx) | vertexIdx …]}
    const pureRuns = [];      // [m, x0, x1, y]
    for (let y = 0; y < PH - 1; y++) {
      let run = -1, runM = -1;
      for (let x = 0; x < PW - 1; x++) {
        const a = L[y * PW + x], b = L[y * PW + x + 1], c = L[(y + 1) * PW + x + 1], d = L[(y + 1) * PW + x];
        if (a === b && b === c && c === d) {
          if (run >= 0 && runM === a) continue;
          if (run >= 0) pureRuns.push(runM, run, x - 1, y);
          run = x; runM = a; continue;
        }
        if (run >= 0) { pureRuns.push(runM, run, x - 1, y); run = -1; }
        // 시계 방향: TL(a) · 위 변 · TR(b) · 오른 변 · BR(c) · 아래 변 · BL(d) · 왼 변
        const corner = [a, b, c, d];
        const cxy = [[x, y], [x + 1, y], [x + 1, y + 1], [x, y + 1]];
        const mids = [];   // [slotIndex(0..3: 위,오른,아래,왼), vertex]
        if (a !== b) mids.push([0, hV(x, y)]);
        if (b !== c) mids.push([1, vV(x + 1, y)]);
        if (c !== d) mids.push([2, hV(x, y + 1)]);
        if (d !== a) mids.push([3, vV(x, y)]);
        const cornerRef = (k) => -1 - ((cxy[k][1]) * PW + cxy[k][0]);
        // 경계 하나(mi 뒤에서 mj 앞까지의 모서리들)를 영역 다각형으로
        const regionFrom = (i, j, inner) => {
          // mids[i] 다음부터 mids[j]까지 시계 방향으로 모서리를 모은다
          const ring = [mids[i][1]];
          let k = (mids[i][0] + 1) % 4;   // 변 s 다음 모서리 = (s+1)%4
          const stop = mids[j][0];
          let guard = 0;
          while (guard++ < 5) { ring.push(cornerRef(k)); if (k === stop) break; k = (k + 1) % 4; }
          ring.push(mids[j][1]);
          if (inner) ring.push(...inner);
          return ring;
        };
        const mOf = (i) => corner[(mids[i][0] + 1) % 4];
        if (mids.length === 2) {
          link(mids[0][1], mids[1][1]);
          regions.push({ m: mOf(0), ring: regionFrom(0, 1) });
          regions.push({ m: mOf(1), ring: regionFrom(1, 0) });
          segs.push(mids[0][1], mids[1][1], mOf(0), mOf(1));
        } else if (mids.length === 4 && a === c && b === d) {
          // 안장점: 우선순위가 높은 재질을 대각선으로 잇는다
          const keepAC = prio(a, VOID) >= prio(b, VOID);
          if (keepAC) {   // b(TR), d(BL) 모서리를 잘라 낸다: 위–오른, 아래–왼
            link(mids[0][1], mids[1][1]); link(mids[2][1], mids[3][1]);
            regions.push({ m: b, ring: [mids[0][1], cornerRef(1), mids[1][1]] });
            regions.push({ m: d, ring: [mids[2][1], cornerRef(3), mids[3][1]] });
            regions.push({ m: a, ring: [mids[3][1], cornerRef(0), mids[0][1], mids[1][1], cornerRef(2), mids[2][1]] });
            segs.push(mids[0][1], mids[1][1], b, a, mids[2][1], mids[3][1], d, a);
          } else {        // a(TL), c(BR) 모서리를 잘라 낸다: 왼–위, 오른–아래
            link(mids[3][1], mids[0][1]); link(mids[1][1], mids[2][1]);
            regions.push({ m: a, ring: [mids[3][1], cornerRef(0), mids[0][1]] });
            regions.push({ m: c, ring: [mids[1][1], cornerRef(2), mids[2][1]] });
            regions.push({ m: b, ring: [mids[0][1], cornerRef(1), mids[1][1], mids[2][1], cornerRef(3), mids[3][1]] });
            segs.push(mids[3][1], mids[0][1], a, b, mids[1][1], mids[2][1], c, b);
          }
        } else {
          // 셋 이상 만나는 곳: 가운데 접점에서 부채꼴로 나눈다
          const C = cV(x, y);
          const n = mids.length;
          for (let i = 0; i < n; i++) {
            link(C, mids[i][1]);
            const j = (i + 1) % n;
            regions.push({ m: mOf(i), ring: regionFrom(i, j, [C]) });
            segs.push(C, mids[i][1], corner[mids[i][0]], mOf(i));
          }
        }
      }
      if (run >= 0) pureRuns.push(runM, run, PW - 2, y);
    }
    // 이완: 경계점(차수 2)을 자기 변 위에서 이웃 평균 쪽으로
    const T = o.smooth === false ? 0 : 0.45;
    if (T > 0) {
      const list = [];
      for (let v = 0; v < 2 * NE; v++) if (used[v] && deg[v] === 2) list.push(v);
      const OX = new Float32Array(list.length), OY = new Float32Array(list.length);
      list.forEach((v, k) => { OX[k] = VX[v]; OY[k] = VY[v]; });
      const nx = new Float32Array(list.length);
      for (let it = 0; it < (o.relax || 28); it++) {
        for (let k = 0; k < list.length; k++) {
          const v = list[k], p = nb[v * 4], q = nb[v * 4 + 1];
          if (used[v] === 1) nx[k] = MATH_clamp(VX[v] + 0.5 * ((VX[p] + VX[q]) / 2 - VX[v]), OX[k] - T, OX[k] + T);
          else nx[k] = MATH_clamp(VY[v] + 0.5 * ((VY[p] + VY[q]) / 2 - VY[v]), OY[k] - T, OY[k] + T);
        }
        for (let k = 0; k < list.length; k++) { const v = list[k]; if (used[v] === 1) VX[v] = nx[k]; else VY[v] = nx[k]; }
      }
    }
    // 재질별 경로 데이터(셀 단위 숫자 배열)
    const per = new Map();
    const get = (m) => { let e = per.get(m); if (!e) { e = { m, rects: [], polys: [] }; per.set(m, e); } return e; };
    for (let k = 0; k < pureRuns.length; k += 4) {
      const m = pureRuns[k]; if (!m) continue;
      const x0 = pureRuns[k + 1], x1 = pureRuns[k + 2], y = pureRuns[k + 3];
      get(m).rects.push(cx(x0), cy(y), x1 - x0 + 1, 1);
    }
    for (const r of regions) {
      if (!r.m) continue;
      const pts = [];
      for (const v of r.ring) {
        if (v < 0) { const ci = -1 - v, x = ci % PW, y = (ci / PW) | 0; pts.push(cx(x), cy(y)); }
        else pts.push(VX[v], VY[v]);
      }
      get(r.m).polys.push(pts);
    }
    // 경계선(양쪽 재질별로 묶음)
    const edges = new Map();
    for (let k = 0; k < segs.length; k += 4) {
      const a = segs[k], b = segs[k + 1], p = segs[k + 2], q = segs[k + 3];
      if (p === q) continue;
      const key = p < q ? p * 256 + q : q * 256 + p;
      let arr = edges.get(key); if (!arr) { arr = []; edges.set(key, arr); }
      arr.push(VX[a], VY[a], VX[b], VY[b]);
    }
    // 도핑 틴트(셀 해상도)와 접합 등고선
    let tint = null, junc = null, semiMats = [];
    MATS.forEach((m, i) => { if (m && m.semi && per.has(i)) semiMats.push(i); });
    if (o.doping !== false && semiMats.length) {
      const U = new Float32Array(W * rows), S = new Uint8Array(W * rows);
      let any = false;
      for (let y = 0; y < rows; y++) for (let x = 0; x < W; x++) {
        const i = (y + r0) * W + x, m = mat[i];
        if (!m || !MATS[m].semi) continue;
        S[y * W + x] = 1;
        const n = sim.nd[i] - sim.na[i];
        if (n === 0) continue;
        const q = n / 1e14; U[y * W + x] = Math.log(q + Math.sqrt(q * q + 1)) / Math.LN10; any = true;
      }
      if (any) {
        // 반도체가 아닌 셀은 이웃 반도체 값으로 채운다(경계에서 틴트가 옅어지거나 가짜 접합이 생기지 않게)
        for (let pass = 0; pass < 2; pass++) {
          const S2 = S.slice(), U2 = U.slice();
          for (let y = 0; y < rows; y++) for (let x = 0; x < W; x++) {
            const i = y * W + x; if (S[i]) continue;
            let s = 0, n = 0;
            for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const xx = (x + dx + W) % W, yy = y + dy; if (yy < 0 || yy >= rows) continue; const j = yy * W + xx; if (S[j]) { s += U[j]; n++; } }
            if (n) { U2[i] = s / n; S2[i] = 1; }
          }
          S.set(S2); U.set(U2);
        }
        tint = U;
        // 접합: U = 0 등고선(선형 보간 마칭 스퀘어), 선분을 이어 폴리라인으로
        const key = (x, y, h) => (y * (W + 1) + x) * 2 + h;
        const P = new Map(), nextOf = new Map();
        const pt = (x, y, h) => { const k = key(x, y, h); if (!P.has(k)) { let px, py; if (h === 0) { const u0 = U[y * W + x], u1 = U[y * W + x + 1]; const t = u0 / (u0 - u1); px = x + 0.5 + t; py = y + 0.5; } else { const u0 = U[y * W + x], u1 = U[(y + 1) * W + x]; const t = u0 / (u0 - u1); px = x + 0.5; py = y + 0.5 + t; } P.set(k, [px, py]); } return k; };
        const segsJ = [];
        for (let y = 0; y < rows - 1; y++) for (let x = 0; x < W - 1; x++) {
          const a = U[y * W + x], b = U[y * W + x + 1], c = U[(y + 1) * W + x + 1], d = U[(y + 1) * W + x];
          const sa = a > 0, sb = b > 0, sc_ = c > 0, sd = d > 0;
          const e = [];
          if (sa !== sb) e.push(pt(x, y, 0));
          if (sb !== sc_) e.push(pt(x + 1, y, 1));
          if (sc_ !== sd) e.push(pt(x, y + 1, 0));
          if (sd !== sa) e.push(pt(x, y, 1));
          if (e.length === 2) segsJ.push(e[0], e[1]);
          else if (e.length === 4) { if ((a + b + c + d) / 4 > 0 === sa) { segsJ.push(e[0], e[1], e[2], e[3]); } else { segsJ.push(e[3], e[0], e[1], e[2]); } }
        }
        // 이어 붙이기
        const adj = new Map();
        const addA = (p, q) => { if (!adj.has(p)) adj.set(p, []); adj.get(p).push(q); };
        for (let k = 0; k < segsJ.length; k += 2) { addA(segsJ[k], segsJ[k + 1]); addA(segsJ[k + 1], segsJ[k]); }
        const seen = new Set(); junc = [];
        const walk = (start) => {
          const line = [start]; seen.add(start);
          let cur = start;
          for (;;) { const nx_ = (adj.get(cur) || []).find((q) => !seen.has(q)); if (nx_ == null) break; seen.add(nx_); line.push(nx_); cur = nx_; }
          return line;
        };
        for (const [k, list] of adj) if (list.length === 1 && !seen.has(k)) { const l = walk(k); junc.push(l.map((q) => P.get(q))); }
        for (const [k] of adj) if (!seen.has(k)) { const l = walk(k); l.push(l[0]); junc.push(l.map((q) => P.get(q))); }
        junc = junc.filter((l) => l.length > 1).map((l) => { const f = []; l.forEach((p) => f.push(p[0], p[1])); return f; });
      }
    }
    return { W, rows, mats: [...per.values()], edges, tint, junc, semiMats, VOID };
  }
  const MATH_clamp = (v, a, b) => (v < a ? a : v > b ? b : v);

  /** 재질 이름표 자리: 영역 안에서 가장 깊숙한 셀(거리 변환), 재질마다 큰 영역 1~2곳 */
  function labelSpots(sim, r0, r1, sc, o) {
    const W = sim.W, rows = r1 - r0, mat = sim.mat, N = W * rows;
    const D = new Float32Array(N);
    const INF = 1e9;
    for (let y = 0; y < rows; y++) for (let x = 0; x < W; x++) D[y * W + x] = mat[(y + r0) * W + x] ? INF : 0;
    const mAt = (i) => mat[(Math.floor(i / W) + r0) * W + (i % W)];
    const at = (x, y) => (y < 0 || y >= rows ? -1 : y * W + ((x % W) + W) % W);
    const pass = (y, x, dirs) => {
      const i = y * W + x; if (!D[i]) return;
      let v = y === 0 || y === rows - 1 ? 0.5 : D[i];
      const mi = mAt(i);
      for (const [dx, dy, c] of dirs) { const j = at(x + dx, y + dy); if (j < 0) continue; v = Math.min(v, mAt(j) === mi ? D[j] + c : c * 0.5); }
      D[i] = v;
    };
    const F = [[-1, 0, 1], [0, -1, 1], [-1, -1, 1.414], [1, -1, 1.414]], B = [[1, 0, 1], [0, 1, 1], [1, 1, 1.414], [-1, 1, 1.414]];
    for (let y = 0; y < rows; y++) for (let x = 0; x < W; x++) pass(y, x, F);
    for (let y = rows - 1; y >= 0; y--) for (let x = W - 1; x >= 0; x--) pass(y, x, B);
    const spots = [], perMat = {};
    const idx = []; for (let i = 0; i < N; i++) if (D[i] < INF && D[i] * sc >= (o.minR || 9)) idx.push(i);
    const key = (i) => D[i] - 0.004 * Math.abs((i % W) - W / 2);
    idx.sort((a, b) => key(b) - key(a));
    for (const i of idx) {
      const m = mAt(i);
      if (!m || (o.only && o.only.indexOf(MATS[m].key) < 0)) continue;
      const x = i % W, y = Math.floor(i / W);
      const list = perMat[m] || (perMat[m] = []);
      if (list.length >= (o.perMat || 2)) continue;
      let a = x, b = x; while (b - a < W && mat[(y + r0) * W + ((a - 1 + W) % W)] === m) a--; while (b - a < W && mat[(y + r0) * W + ((b + 1) % W)] === m) b++;
      const run = b - a + 1;
      const pt = { m, x, y, r: D[i], run, cx: run >= W ? W / 2 : (a + b + 1) / 2 };
      // 이름표는 그 행의 같은 재질 구간 가운데에 그리므로, 그린 자리끼리 거리를 잰다(같은 재질 이름표가 겹치지 않게)
      if (list.some((p) => Math.hypot(p.cx - pt.cx, p.y - y) * sc < 220)) continue;
      list.push(pt); spots.push(pt);
    }
    return spots;
  }

  const cache = new WeakMap();
  const tintCanvas = (g, pal) => {
    if (!g.tint) return null;
    const { W, rows } = g, cv = document.createElement("canvas");
    cv.width = W; cv.height = rows;
    const c = cv.getContext("2d"), im = c.createImageData(W, rows), d = im.data;
    for (let i = 0; i < W * rows; i++) {
      const u = g.tint[i], t = Math.min(1, Math.max(0, (Math.abs(u) - 1) / 5.5)) * 0.85;
      const tc = u > 0 ? pal.nTint : pal.pTint;
      d[i * 4] = tc[0]; d[i * 4 + 1] = tc[1]; d[i * 4 + 2] = tc[2]; d[i * 4 + 3] = Math.round(t * 255);
    }
    c.putImageData(im, 0, 0);
    return cv;
  };
  /**
   * XS.draw(ctx, sim, {x,y,w,h}, opts) → { X(nm), Y(nm), sc(px/nm), ox, oy, pw, ph, r0, cell(px,py), taken }
   * opts: { y0nm, y1nm (보이는 세로 범위), doping:true, junction:true, scale:true|'tl'|'tr'|'bl'|'br'|false,
   *         outline:true, smooth:true, alignTop:false, labels:false|true|{only:[재질], minR:9, perMat:2, names:{재질:이름}}, voids:true, border:true }
   */
  function draw(ctx, sim, box, o = {}) {
    const W = sim.W, H = sim.H, dx = sim.dx;
    const r0 = o.y0nm != null ? Math.max(0, sim.row(o.y0nm)) : 0;
    const r1 = o.y1nm != null ? Math.min(H, sim.row(o.y1nm)) : H;
    const rows = Math.max(1, r1 - r0);
    const sc = Math.min(box.w / W, box.h / rows);  // px per cell
    const pw = W * sc, ph = rows * sc;
    const ox = box.x + (box.w - pw) / 2, oy = box.y + (o.alignTop ? 0 : (box.h - ph) / 2);
    const cv = ctx.canvas;
    const pal = palette();
    const hash = simHash(sim, r0, r1);
    const key = [hash, r0, r1, o.doping !== false, o.smooth !== false, o.voids !== false].join("|");
    let ent = cache.get(cv);
    if (!ent || ent.key !== key) { ent = { key, g: geometry(sim, r0, r1, o), tint: null, tintTheme: "", spots: null }; cache.set(cv, ent); }
    const g = ent.g;
    if (g.tint && ent.tintTheme !== pal.theme) { ent.tint = tintCanvas(g, pal); ent.tintTheme = pal.theme; }
    ctx.save();
    ctx.beginPath(); ctx.rect(ox, oy, pw, ph); ctx.clip();
    ctx.fillStyle = rgbStr(pal.bg); ctx.fillRect(ox, oy, pw, ph);
    ctx.translate(ox, oy); ctx.scale(sc, sc);
    // 재질 채우기
    const pathOf = (e) => {
      if (e.path) return e.path;
      const p = new Path2D();
      for (let k = 0; k < e.rects.length; k += 4) p.rect(e.rects[k], e.rects[k + 1], e.rects[k + 2], e.rects[k + 3]);
      for (const q of e.polys) { p.moveTo(q[0], q[1]); for (let k = 2; k < q.length; k += 2) p.lineTo(q[k], q[k + 1]); p.closePath(); }
      return (e.path = p);
    };
    const grads = {};
    for (const e of g.mats) {
      const c = pal.mats[e.m]; if (!c) continue;
      const gr = ctx.createLinearGradient(0, 0, 0, rows);
      gr.addColorStop(0, rgbStr(c.c1)); gr.addColorStop(1, rgbStr(c.c2));
      grads[e.m] = gr;
      ctx.fillStyle = gr; ctx.fill(pathOf(e));
    }
    // 도핑 틴트(반도체 영역 안만)
    if (ent.tint) {
      ctx.save();
      const clip = new Path2D();
      g.mats.forEach((e) => { if (g.semiMats.indexOf(e.m) >= 0) clip.addPath(pathOf(e)); });
      ctx.clip(clip);
      ctx.imageSmoothingEnabled = true;
      ctx.drawImage(ent.tint, 0, 0, g.W, g.rows);
      ctx.restore();
    }
    // 경계선
    if (o.outline !== false) {
      ctx.lineJoin = "round"; ctx.lineCap = "round";
      ctx.lineWidth = 1.1 / sc;
      for (const [k, arr] of g.edges) {
        const p = Math.floor(k / 256), q = k % 256;
        const cp = pal.mats[p], cq = pal.mats[q];
        let e;
        if (!p || p === g.VOID) e = cq && cq.e; else if (!q || q === g.VOID) e = cp && cp.e;
        else { const e1 = cp.e, e2 = cq.e; e = e1[0] + e1[1] + e1[2] < e2[0] + e2[1] + e2[2] ? e1 : e2; }
        if (!e) continue;
        ctx.strokeStyle = rgbStr(e, pal.dark ? 0.95 : 0.9);
        ctx.beginPath();
        for (let i = 0; i < arr.length; i += 4) { ctx.moveTo(arr[i], arr[i + 1]); ctx.lineTo(arr[i + 2], arr[i + 3]); }
        ctx.stroke();
      }
    }
    // p-n 접합
    if (g.junc && g.junc.length && o.junction !== false) {
      ctx.save();
      const clip = new Path2D();
      g.mats.forEach((e) => { if (g.semiMats.indexOf(e.m) >= 0) clip.addPath(pathOf(e)); });
      ctx.clip(clip);
      const jp = new Path2D();
      g.junc.forEach((l) => { jp.moveTo(l[0], l[1]); for (let k = 2; k < l.length; k += 2) jp.lineTo(l[k], l[k + 1]); });
      ctx.lineJoin = "round"; ctx.lineCap = "butt";
      ctx.strokeStyle = pal.dark ? "rgba(0,0,0,.45)" : "rgba(20,26,38,.32)"; ctx.lineWidth = 3.4 / sc; ctx.setLineDash([]); ctx.stroke(jp);
      ctx.strokeStyle = rgbStr(pal.junc); ctx.lineWidth = 1.7 / sc; ctx.setLineDash([5 / sc, 3.5 / sc]); ctx.stroke(jp);
      ctx.restore();
    }
    ctx.restore();
    ctx.save();
    if (o.border !== false) { ctx.strokeStyle = PB.color("border"); ctx.lineWidth = 1; ctx.strokeRect(Math.round(ox) + 0.5, Math.round(oy) + 0.5, Math.round(pw) - 1, Math.round(ph) - 1); }
    const P = PB.palette();
    const isVac = (px, py) => { const cx = Math.floor((px - ox) / sc), cy = Math.floor((py - oy) / sc) + r0; if (cx < 0 || cx >= W || cy < 0 || cy >= H) return true; return !sim.mat[cy * W + cx]; };
    const vacFrac = (x, y, w, h) => { let v = 0, n = 0; for (let yy = y; yy <= y + h; yy += Math.max(2, h / 4)) for (let xx = x; xx <= x + w; xx += Math.max(2, w / 8)) { n++; if (isVac(xx, yy)) v++; } return v / n; };
    const taken = [];
    // 축척 막대(빈 공간이 가장 많은 모서리)
    if (o.scale !== false) {
      const target = (W * dx) / 5, mag = Math.pow(10, Math.floor(Math.log10(target)));
      const len = [1, 2, 5, 10].map((v) => v * mag).filter((v) => v <= target).pop() || mag;
      const lp = (len / dx) * sc;
      const label = len >= 1000 ? len / 1000 + " µm" : len + " nm";
      ctx.font = PB.font(11, 600, true);
      const tw = ctx.measureText(label).width, bw = lp + tw + 22, bh = 20;
      const cands = { tl: [ox + 8, oy + 8], tr: [ox + pw - bw - 8, oy + 8], bl: [ox + 8, oy + ph - bh - 8], br: [ox + pw - bw - 8, oy + ph - bh - 8] };
      let pos = typeof o.scale === "string" ? o.scale : null;
      if (!pos) { let bestF = -1; ["tl", "tr", "bl", "br"].forEach((k) => { const [x, y] = cands[k]; const f = vacFrac(x, y, bw, bh) - (k[0] === "b" ? 0.05 : 0); if (f > bestF + 0.02) { bestF = f; pos = k; } }); }
      const [bx, by] = cands[pos];
      PB.rrect(ctx, bx, by, bw, bh, 6);
      ctx.fillStyle = PB.alpha(P.bg, 0.86); ctx.fill();
      ctx.strokeStyle = P.border; ctx.lineWidth = 1; ctx.stroke();
      const y = by + bh / 2, x0 = bx + 8;
      ctx.strokeStyle = P.text; ctx.lineWidth = 1.6; ctx.lineCap = "butt";
      ctx.beginPath(); ctx.moveTo(x0, y); ctx.lineTo(x0 + lp, y); ctx.moveTo(x0 + 0.8, y - 4); ctx.lineTo(x0 + 0.8, y + 4); ctx.moveTo(x0 + lp - 0.8, y - 4); ctx.lineTo(x0 + lp - 0.8, y + 4); ctx.stroke();
      ctx.fillStyle = P.text; ctx.textAlign = "left"; ctx.textBaseline = "middle";
      ctx.fillText(label, x0 + lp + 6, y + 0.5);
      taken.push([bx, by, bw, bh]);
    }
    // 재질 이름표
    if (o.labels) {
      const lo = o.labels === true ? {} : o.labels;
      const sk = key + "|" + sc.toFixed(2);
      if (!ent.spots || ent.spotKey !== sk) { ent.spots = labelSpots(sim, r0, r1, sc, lo); ent.spotKey = sk; }
      ctx.font = PB.font(lo.size || 11, 600);
      ent.spots.forEach((p) => {
        const name = (lo.names && lo.names[MATS[p.m].key]) || SHORT[MATS[p.m].key] || MATS[p.m].name;
        const tw = PB.textWidth(ctx, name, { font: ctx.font }), bw = tw + 12, bh = 17;
        if (p.run * sc < bw + 8 || p.r * sc < bh / 2 + 4) return;
        let cx = ox + p.cx * sc, cy = oy + (p.y + 0.5) * sc;
        cx = PB.clamp(cx, ox + bw / 2 + 4, ox + pw - bw / 2 - 4); cy = PB.clamp(cy, oy + bh / 2 + 4, oy + ph - bh / 2 - 4);
        const r = [cx - bw / 2, cy - bh / 2, bw, bh];
        if (taken.some((t) => r[0] < t[0] + t[2] + 4 && r[0] + r[2] + 4 > t[0] && r[1] < t[1] + t[3] + 3 && r[1] + r[3] + 3 > t[1])) return;
        taken.push(r);
        const pm = pal.mats[p.m], lum = pm ? (pm.c2[0] * 0.3 + pm.c2[1] * 0.59 + pm.c2[2] * 0.11) : 200;
        PB.rrect(ctx, r[0], r[1], bw, bh, 5);
        ctx.fillStyle = lum < 110 ? "rgba(255,255,255,.16)" : PB.alpha(P.bg, pal.dark ? 0.5 : 0.62); ctx.fill();
        ctx.fillStyle = lum < 110 ? "#fff" : P.text; ctx.textAlign = "center"; ctx.textBaseline = "middle";
        PB.text(ctx, name, cx, cy + 0.5);
      });
    }
    ctx.restore();
    return {
      X: (xn) => ox + (xn / dx) * sc,
      Y: (yn) => oy + (sim.row(0) + yn / dx - r0) * sc,
      sc: sc / dx, ox, oy, pw, ph, r0,
      cell: (px, py) => [Math.floor((px - ox) / sc), Math.floor((py - oy) / sc) + r0],
      taken,
    };
  }
  function toHex(c) {
    c = (c || "").trim();
    if (c[0] === "#") { if (c.length === 4) return "#" + c[1] + c[1] + c[2] + c[2] + c[3] + c[3]; return c.slice(0, 7); }
    const m = c.match(/\d+(\.\d+)?/g); if (!m) return "#ffffff";
    return "#" + m.slice(0, 3).map((v) => (+v | 0).toString(16).padStart(2, "0")).join("");
  }

  /** 재질 범례 HTML: XS.legend(['si','ox','pr'], true) — 견본은 그림과 같은 재질 그라데이션 */
  function legend(keys, doping) {
    const sw = (k) => `background:linear-gradient(var(--m-${k}-1),var(--m-${k}-2));border-color:var(--m-${k}-e)`;
    return keys.map((k) => { const m = MATS[mid(k)]; return `<span><i style="${sw(m.key)}"></i><span>${m.name}${m.en && m.en !== m.name ? ` <span class="en">${m.en}</span>` : ""}</span></span>`; }).join("") +
      (doping ? `<span><i style="${sw("np")}"></i><span>n형 도핑</span></span><span><i style="${sw("pp")}"></i><span>p형 도핑</span></span><span><i style="background:transparent;border:1.5px dashed var(--junction)"></i><span>p-n 접합</span></span>` : "");
  }

  /* ------------------------------------------------------------ 측정 도우미 */
  /** 행 y에서 재질 id 연속 구간들: [[x0,x1],...] (셀) */
  function runs(sim, y, test) {
    const out = []; let s = -1;
    for (let x = 0; x <= sim.W; x++) {
      const v = x < sim.W && test(sim.mat[y * sim.W + x]);
      if (v && s < 0) s = x; if (!v && s >= 0) { out.push([s, x]); s = -1; }
    }
    return out;
  }
  /** 열 x에서 위에서부터 빈 공간이 끝나는 깊이(nm, 실리콘 표면 기준) */
  function depthAt(sim, x) { return sim.ynm(sim.surfRow(x)); }

  /** 농도 HTML: 3.2×10<sup>18</sup> cm<sup>−3</sup> */
  function concHTML(v) {
    let e = Math.floor(Math.log10(v) + 1e-9), m = v / Math.pow(10, e);
    if (m >= 9.95) { e++; m /= 10; }   // 1e15가 10.0×10¹⁴로 보이지 않게
    return `${m.toFixed(1)}×10<sup>${e}</sup> cm<sup>−3</sup>`;
  }

  /* ------------------------------------------------------------ 단계별 단면 위젯 */
  /**
   * XS.stepper(container, {
   *   title, make: () => Sim, steps: [{label, desc, k(약어), ...step}], legend:[재질], doping:true,
   *   view:{y0nm, y1nm}, aspect, minHeight, note, overlay:(ctx, map, sim, k)=>{}, start: 0, animate: true })
   * → { R(runner), go(k), setSteps(steps, k), add(step), remove(k), redraw() }
   */
  function stepper(el, o) {
    if (typeof el === "string") el = document.querySelector(el);
    const uid = "xs" + Math.random().toString(36).slice(2, 7);
    el.classList.add("sim");
    el.innerHTML = `
      <div class="sim-head"><span class="sim-tag">${o.tag || "CROSS-SECTION"}</span><h3>${o.title || "단면 시뮬레이터"}</h3></div>
      <div class="sim-body side">
        <div class="sim-view"><canvas></canvas></div>
        <div class="sim-controls">
          <div class="ctrl"><span>단계 <output id="${uid}-k"></output></span><input type="range" id="${uid}-r" min="0" max="1" value="0"></div>
          <div class="btn-row"><button class="btn sm" data-a="first" title="처음으로" aria-label="처음으로">⏮</button><button class="btn sm" data-a="prev" title="이전 단계" aria-label="이전 단계">◀</button><button class="btn sm primary" data-a="next">다음 ▶</button><button class="btn sm" data-a="play">자동 재생</button></div>
          <div class="step-desc" id="${uid}-d"></div>
          ${o.extra || ""}
          <ol class="steps-list" id="${uid}-l"></ol>
        </div>
      </div>
      ${o.below ? `<div class="sim-controls xs-below">${o.below}</div>` : ""}
      <div class="xs-legend-row"><div class="mat-legend" id="${uid}-g"></div><span class="xs-hint">단면 위를 가리키면 재질·깊이·도핑을 읽습니다</span></div>
      <div class="sim-readout">
        <div class="stat"><span class="k">현재 공정</span><span class="v" id="${uid}-o1" style="font-size:15px">—</span></div>
        <div class="stat"><span class="k">커서 위치 (x, 깊이)</span><span class="v" id="${uid}-o2" style="font-size:15px">—</span></div>
        <div class="stat"><span class="k">재질 · 순 도핑</span><span class="v" id="${uid}-o3" style="font-size:15px">—</span></div>
      </div>
      ${o.note ? `<div class="sim-note">${o.note}</div>` : ""}`;
    const cvEl = el.querySelector("canvas"), list = el.querySelector("#" + uid + "-l"), desc = el.querySelector("#" + uid + "-d");
    const rng = el.querySelector("#" + uid + "-r"), kout = el.querySelector("#" + uid + "-k");
    el.querySelector("#" + uid + "-g").innerHTML = legend(o.legend || ["si", "ox", "nit", "poly", "pr"], o.doping !== false);
    let steps = o.steps || [], shown = null, shownK = 0, prog = 1, map = null, hover = null, playing = false;
    const API = {};
    const R = runner(o.make, steps, (sim, k, p) => { shown = sim; shownK = k; prog = p; sync(); cv.redraw(); if (p >= 1 && playing) setTimeout(() => { if (playing) { if (R.cur < steps.length) R.goto(R.cur + 1, true); else stopPlay(); } }, 380); });
    API.R = R;
    // 높이 비율은 현재 단면(첫 스냅숏)의 보이는 행 수 / 폭으로 정한다. 리사이즈마다 다시 읽으므로 영역을 바꾸면 따라간다.
    const cvOpts = { minHeight: o.minHeight || 260, maxHeight: o.maxHeight || 560 };
    Object.defineProperty(cvOpts, "aspect", { enumerable: true, get() {
      if (o.aspect) return o.aspect;
      const s0 = R.sim(0), v = o.view || {};
      const r0 = v.y0nm != null ? Math.max(0, s0.row(v.y0nm)) : 0, r1 = v.y1nm != null ? Math.min(s0.H, s0.row(v.y1nm)) : s0.H;
      return PB.clamp((r1 - r0) / s0.W + 0.02, 0.45, 1.05);
    } });
    const cv = PB.canvas(cvEl, (ctx, w, h) => {
      const sim = shown || R.sim(0);
      map = draw(ctx, sim, { x: 6, y: 6, w: w - 12, h: h - 12 }, Object.assign({ doping: o.doping !== false, labels: o.labels != null ? o.labels : true }, o.view || {}));
      if (o.overlay) o.overlay(ctx, map, sim, shownK);
      if (prog < 1) {
        const P = PB.palette(), bw = Math.min(map.pw - 24, 220), bx = map.ox + (map.pw - bw) / 2, by = map.oy + map.ph - 30;
        PB.rrect(ctx, bx - 10, by - 18, bw + 20, 34, 9); ctx.fillStyle = PB.alpha(P.bg, 0.88); ctx.fill(); ctx.strokeStyle = P.border; ctx.lineWidth = 1; ctx.stroke();
        PB.text(ctx, "계산 중 · " + (steps[shownK - 1] ? steps[shownK - 1].label : ""), bx, by - 6, { size: 11, weight: 600, color: P.dim, align: "left", baseline: "middle" });
        PB.rrect(ctx, bx, by + 4, bw, 5, 2.5); ctx.fillStyle = P.border; ctx.fill();
        PB.rrect(ctx, bx, by + 4, Math.max(5, bw * prog), 5, 2.5); ctx.fillStyle = P.accent; ctx.fill();
      }
      // 단계 목록 높이를 단면 높이에 맞춘다(넓은 화면의 옆 배치일 때)
      const ctl = list.parentElement;
      if (ctl && getComputedStyle(ctl).borderLeftWidth !== "0px") {
        const avail = h + 12 - (list.offsetTop - ctl.offsetTop) - 18;
        list.style.maxHeight = Math.max(96, avail) + "px";
      } else list.style.maxHeight = "";
      if (hover) {
        ctx.save(); ctx.globalAlpha = 0.75;
        ctx.strokeStyle = PB.color("accent-2"); ctx.setLineDash([3, 3]); ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(map.ox, Math.round(hover[1]) + 0.5); ctx.lineTo(map.ox + map.pw, Math.round(hover[1]) + 0.5); ctx.moveTo(Math.round(hover[0]) + 0.5, map.oy); ctx.lineTo(Math.round(hover[0]) + 0.5, map.oy + map.ph); ctx.stroke(); ctx.setLineDash([]);
        ctx.restore();
        ctx.beginPath(); ctx.arc(hover[0], hover[1], 3.5, 0, Math.PI * 2); ctx.fillStyle = PB.color("accent-2"); ctx.fill(); ctx.strokeStyle = PB.color("canvas-bg"); ctx.lineWidth = 1.5; ctx.stroke();
      }
    }, cvOpts);
    function sync() {
      rng.max = steps.length; rng.value = shownK;
      rng.style.setProperty("--fill", (steps.length ? (shownK / steps.length) * 100 : 0) + "%");
      kout.textContent = shownK + " / " + steps.length;
      const st = shownK > 0 ? steps[shownK - 1] : null;
      desc.innerHTML = st ? `<b>${st.label}</b><br>${st.desc || ""}` : `<b>시작</b><br>${o.startDesc || "깨끗한 실리콘 웨이퍼에서 출발한다."}`;
      PB.stat(uid + "-o1", st ? st.label : "시작");
      [...list.children].forEach((li, i) => { li.classList.toggle("cur", i === shownK - 1); li.classList.toggle("future", i >= shownK); });
      const cur = list.children[shownK - 1];
      if (cur && list.scrollHeight > list.clientHeight) { const top = cur.offsetTop - list.offsetTop; if (top < list.scrollTop || top > list.scrollTop + list.clientHeight - 30) list.scrollTop = top - 60; }
    }
    function renderList() {
      list.innerHTML = steps.map((s, i) => `<li data-i="${i}"><span class="k">${s.k || s.op.toUpperCase()}</span><span class="d">${s.label}</span>${o.editable ? '<button class="x" title="이 단계부터 삭제" aria-label="삭제">×</button>' : ""}</li>`).join("");
    }
    list.addEventListener("click", (e) => {
      const li = e.target.closest("li"); if (!li) return;
      const i = +li.dataset.i;
      if (e.target.classList.contains("x")) { API.remove(i); return; }
      stopPlay(); API.go(i + 1);
    });
    rng.addEventListener("input", () => { stopPlay(); API.go(+rng.value); });
    function stopPlay() { playing = false; el.querySelector('[data-a="play"]').textContent = "자동 재생"; }
    el.querySelectorAll("[data-a]").forEach((b) => b.addEventListener("click", () => {
      const a = b.dataset.a;
      if (a === "play") { if (playing) { stopPlay(); return; } playing = true; b.textContent = "정지"; if (R.cur >= steps.length) R.goto(0); R.goto(R.cur + 1, true); return; }
      stopPlay();
      if (a === "first") API.go(0);
      if (a === "prev") API.go(Math.max(0, R.cur - 1));
      if (a === "next") API.go(Math.min(steps.length, R.cur + 1), true);
    }));
    API.go = (k, anim) => R.goto(k, anim !== false && o.animate !== false && anim);
    API.setSteps = (s, k) => { steps = s; R.reset(s); cv.resize(); renderList(); API.go(k != null ? k : 0); };
    API.add = (st) => { R.cancel(); R.truncate(R.cur); steps.splice(R.cur); steps.push(st); renderList(); R.goto(steps.length, true); };
    API.remove = (i) => { R.cancel(); steps.splice(i); R.truncate(i); renderList(); API.go(Math.min(i, steps.length)); };
    API.redraw = () => cv.redraw();
    API.cur = () => shown;
    API.steps = () => steps;
    // 커서 읽기: 십자선 + 떠 있는 정보 상자 + 아래 읽음표. 터치는 누른 곳을 읽는다.
    const tip = PB.tip(cvEl);
    const onMove = (e) => {
      if (!map || !shown) return;
      const r = cvEl.getBoundingClientRect(), px = e.clientX - r.left, py = e.clientY - r.top;
      const [cx, cy] = map.cell(px, py);
      if (cx < 0 || cx >= shown.W || cy < 0 || cy >= shown.H || px < map.ox || px > map.ox + map.pw || py < map.oy || py > map.oy + map.ph) { if (hover) { hover = null; tip.hide(); cv.redraw(); } return; }
      hover = [px, py];
      const i = cy * shown.W + cx, mt = shown.mat[i], net = shown.nd[i] - shown.na[i];
      const xn = Math.round(cx * shown.dx), yn = shown.ynm(cy);
      PB.stat(uid + "-o2", `${xn}, ${yn}<small>nm</small>`);
      const dop = mt && MATS[mt].semi && Math.abs(net) > 1e14 ? `${net > 0 ? "n" : "p"}형 ${concHTML(Math.abs(net))}` : "";
      const name = mt ? MATS[mt].name : "빈 공간";
      PB.stat(uid + "-o3", name + (dop ? `<small> · ${dop}</small>` : ""));
      const sw = mt ? `<span class="sw" style="background:linear-gradient(var(--m-${MATS[mt].key}-1),var(--m-${MATS[mt].key}-2))"></span>` : "";
      tip.show(px, py, `${sw}<b>${name}</b>${mt && MATS[mt].en !== MATS[mt].name ? ` <span class="k">${MATS[mt].en}</span>` : ""}<br><span class="num">x ${xn} nm · 깊이 ${yn} nm</span>${dop ? `<br>${dop}` : ""}`);
      cv.redraw();
    };
    cvEl.addEventListener("pointermove", onMove);
    cvEl.addEventListener("pointerdown", onMove);
    cvEl.addEventListener("pointerleave", (e) => { if (e.pointerType === "touch") return; hover = null; tip.hide(); cv.redraw(); });
    renderList();
    API.go(o.start || 0);
    return API;
  }

  window.XS = { stepper, MATS, ID, Sim, range, RANGE, diffusivity, DIFF, dealGrove, dgThickness, aerial, makeDist, runner, draw, legend, runs, depthAt, mid, color: matColor, palette, concHTML, SHORT };
})();
