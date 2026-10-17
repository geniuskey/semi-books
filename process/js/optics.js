/* Copyright (c) 2026 geniuskey and ProcessBook contributors.
   Executable code: MIT (see ../LICENSE-MIT).
   Educational content and illustrations: CC-BY-4.0 (see ../LICENSE.md). */
/* ==========================================================================
   ProcessBook 1차원 결상 엔진 — 전역 객체 OPT
   주기 무늬(라인/스페이스) 마스크의 부분 결맞음 공중상을 Abbe 방식(광원 점마다 결맞은 상을
   더하는 방식)으로 계산한다. 2차원 광원(원형·환형·쌍극) 점은 동공 차단에만 쓰이고, 디포커스는
   비근축 위상 2πnz(√(1−(λf/n)²)−1)/λ 로 넣는다.
   ========================================================================== */
(function () {
  "use strict";
  const TOOLS = {
    iline: { name: "i-line", wl: 365, NA: 0.6, n: 1 },
    krf: { name: "KrF", wl: 248, NA: 0.8, n: 1 },
    arf: { name: "ArF 건식", wl: 193, NA: 0.93, n: 1 },
    arfi: { name: "ArF 액침", wl: 193, NA: 1.35, n: 1.44 },
    euv: { name: "EUV", wl: 13.5, NA: 0.33, n: 1 },
    hna: { name: "High-NA EUV", wl: 13.5, NA: 0.55, n: 1 },
  };

  /** 광원 점 목록 [{sx, sy}] (동공 좌표, NA로 정규화) */
  function source(s) {
    const pts = [], st = s.step || 0.07;
    for (let y = -1; y <= 1 + 1e-9; y += st) for (let x = -1; x <= 1 + 1e-9; x += st) {
      const r = Math.hypot(x, y);
      let ok = false;
      if (s.type === "coh") { ok = false; }
      else if (s.type === "conv") ok = r <= s.sigma + 1e-9;
      else if (s.type === "annular") ok = r <= s.so + 1e-9 && r >= s.si - 1e-9;
      else if (s.type === "dipole") ok = Math.hypot(Math.abs(x) - s.sc, y) <= s.sr + 1e-9;
      else if (s.type === "quad") ok = Math.hypot(Math.abs(x) - s.sc / Math.SQRT2, Math.abs(y) - s.sc / Math.SQRT2) <= s.sr + 1e-9;
      if (ok) pts.push({ sx: x, sy: y });
    }
    if (!pts.length) pts.push({ sx: 0, sy: 0 });
    return pts;
  }

  /** 마스크 투과율 샘플 (한 주기 P) */
  function maskT(m, Nf) {
    const p = m.pitch, w = m.cd, type = m.type || "binary";
    const P = type === "alt" ? 2 * p : p;
    const t = new Float64Array(Nf);
    const a = type === "att" ? -Math.sqrt(m.att || 0.06) : 0;
    for (let i = 0; i < Nf; i++) {
      const x = ((i + 0.5) / Nf) * P;   // 0 ~ P, 라인 중심은 0 (와 p)
      const xm = ((x % p) + p) % p, d = Math.min(xm, p - xm);
      const inLine = d < w / 2;
      if (m.tone === "space") { // 어두운 배경에 밝은 스페이스(트렌치)
        t[i] = inLine ? 1 : a;
        if (type === "alt" && inLine && Math.floor(x / p + 0.5) % 2 === 1) t[i] = -1;
      } else {
        t[i] = inLine ? a : 1;
        if (type === "alt" && !inLine && Math.floor(x / p) % 2 === 1) t[i] = -1;
      }
    }
    return { t, P };
  }

  /**
   * 공중상. o = { pitch, cd, type:'binary'|'att'|'alt', tone:'line'|'space', wl, NA, n, src:{...}, focus(nm), N(샘플 수) }
   * 반환 { x:[nm], I:[...] } — 한 주기(0~P), 큰 열린 영역 = 1
   */
  function image(o, srcPts) {
    const N = o.N || 128, Nf = 256;
    const { t, P } = maskT(o, Nf);
    const fc = o.NA / o.wl, n = o.n || 1;
    const pts = srcPts || source(o.src || { type: "conv", sigma: 0.5 });
    const smax = pts.reduce((a, p) => Math.max(a, Math.abs(p.sx)), 0);
    const K = Math.min(80, Math.ceil(P * fc * (1 + smax)) + 1);
    const Tr = [], Ti = [];
    for (let k = -K; k <= K; k++) {
      let re = 0, im = 0;
      for (let i = 0; i < Nf; i++) { const a = (-2 * Math.PI * k * (i + 0.5)) / Nf; re += t[i] * Math.cos(a); im += t[i] * Math.sin(a); }
      Tr.push(re / Nf); Ti.push(im / Nf);
    }
    const I = new Float64Array(N), X = [];
    for (let j = 0; j < N; j++) X.push((j / N) * P);
    const z = o.focus || 0;
    const er = new Float64Array(N), ei = new Float64Array(N);
    pts.forEach((s) => {
      er.fill(0); ei.fill(0);
      for (let k = -K; k <= K; k++) {
        const fx = k / P + s.sx * fc, fy = s.sy * fc;
        const rho2 = (fx * fx + fy * fy) / (fc * fc);
        if (rho2 > 1 + 1e-9) continue;
        const a = Tr[k + K], b = Ti[k + K];
        if (Math.abs(a) + Math.abs(b) < 1e-9) continue;
        const sin2 = (o.wl * o.wl * (fx * fx + fy * fy)) / (n * n);
        const ph0 = z ? ((2 * Math.PI * n * z) / o.wl) * (Math.sqrt(Math.max(0, 1 - sin2)) - 1) : 0;
        for (let j = 0; j < N; j++) {
          const ph = (2 * Math.PI * k * X[j]) / P + ph0;
          const c = Math.cos(ph), sn = Math.sin(ph);
          er[j] += a * c - b * sn; ei[j] += a * sn + b * c;
        }
      }
      for (let j = 0; j < N; j++) I[j] += er[j] * er[j] + ei[j] * ei[j];
    });
    for (let j = 0; j < N; j++) I[j] /= pts.length;
    return { x: X, I, P, K };
  }

  /** 라인 CD: 위치 0 (라인 중심) 주변에서 I < th 인 폭 (라인 톤), 스페이스 톤이면 I > th 인 폭 */
  function cd(img, th, tone) {
    const { x, I, P } = img, N = I.length;
    const dark = (j) => (tone === "space" ? I[(j + N) % N] > th : I[(j + N) % N] < th);
    if (!dark(0)) return 0;
    let r = 0; while (r < N / 2 && dark(r)) r++;
    let l = 0; while (l < N / 2 && dark(-l)) l++;
    if (r >= N / 2 || l >= N / 2) return P;    // 브리징
    const ip = (j0, j1) => { const a = I[(j0 + N) % N], b = I[(j1 + N) % N]; return (th - a) / (b - a || 1e-9); };
    const xr = (r - 1 + ip(r - 1, r)) * (P / N), xl = (l - 1 + ip(-(l - 1), -l)) * (P / N);
    return xr + xl;
  }
  function contrast(img) { let a = Infinity, b = -Infinity; for (const v of img.I) { a = Math.min(a, v); b = Math.max(b, v); } return { min: a, max: b, c: (b - a) / (b + a || 1) }; }
  /** NILS = w · |d ln I/dx| at edge (threshold th) */
  function nils(img, th, w, tone) {
    const { I, P } = img, N = I.length, dxn = P / N;
    let best = 0;
    for (let j = 0; j < N; j++) {
      const a = I[j], b = I[(j + 1) % N];
      if ((a - th) * (b - th) <= 0 && a !== b) { const s = Math.abs(Math.log(b / a)) / dxn; best = Math.max(best, s * w); }
    }
    return best;
  }

  window.OPT = { TOOLS, source, image, cd, contrast, nils, maskT };
})();
