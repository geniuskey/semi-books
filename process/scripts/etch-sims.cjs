#!/usr/bin/env node
/* 6장 식각: 2026-11에 더한 시뮬레이터 네 개(sim-iso, sim-sheath, sim-syn, sim-load)의 모형 회귀 검사. Node 전용(브라우저 없음).
   chapters/etch.html에서 model 블록을 잘라 node:vm으로 실행하고, (a) 교과서 기준값과 (b) 본문·해볼 것·퀴즈에 적힌 수치를 확인한다.
   수치는 화면과 같은 반올림으로 문자열을 만들어 본문에 그대로 있는지도 본다(본문과 엔진이 어긋나면 실패). */
"use strict";
const fs = require("node:fs"), vm = require("node:vm"), assert = require("node:assert/strict"), path = require("node:path");
const root = path.resolve(__dirname, ".."), read = (f) => fs.readFileSync(path.join(root, f), "utf8");
const html = read("chapters/etch.html");
const block = (id) => { const a = html.indexOf(`/* model:${id} */`), b = html.indexOf(`/* /model:${id} */`); assert(a > 0 && b > a, `model block ${id} not found`); return html.slice(a, b); };
const ctx = { Math, Float64Array, Infinity };
vm.createContext(ctx);
for (const id of ["sim-iso", "sim-sheath", "sim-syn", "sim-load"]) vm.runInContext(block(id), ctx, { filename: id });
const { isoModel, SHM, SYN, LOAD } = ctx;
// 페이지와 같은 난수열: js/common.js의 PB.rng(mulberry32)를 그대로 가져온다.
const rngSrc = read("js/common.js").match(/PB\.rng = (function \(seed\) \{[^\n]*\});/);
assert(rngSrc, "PB.rng not found in js/common.js");
const rng = vm.runInNewContext(`(${rngSrc[1]})`, { Math });
const note = (id) => { const m = html.match(new RegExp(`<div class="sim" id="${id}">[\\s\\S]*?<div class="sim-note">([\\s\\S]*?)</div>`)); assert(m, id + " note"); return m[1]; };
const has = (text, s, where) => assert(text.includes(s), `${where}: expected "${s}"`);
const near = (a, b, tol, msg) => assert(Math.abs(a - b) <= tol, `${msg}: ${a} vs ${b} (±${tol})`);
const fmt = (x, d) => Number(x.toPrecision(d)).toLocaleString("en-US", { maximumFractionDigits: 6 }); // = PB.fmt (0.001 ≤ |x| < 1e5)
let n = 0;

/* ---------- sim-iso: 하위헌스 작도 */
{
  const M = isoModel(200, 300, 700, 1, 20);
  // 등방성: 마스크 가장자리에서 반지름 t·f인 원(사분원), 개구 안은 평평한 바닥
  for (const f of [0.3, 0.7, 1]) for (const d of [0, 40, 90, 150]) {
    const exp = d === 0 ? Math.min(200, 200 * f) : Math.max(0, Math.min(200, Math.sqrt(Math.max(0, (200 * f) ** 2 - d * d))));
    near(M.depth(150 + d, f), exp, 1e-9, `iso circle f=${f} d=${d}`); n++;
  }
  // 완전 이방성(r = 0): 수직 벽, 언더컷 0
  const A = isoModel(200, 300, 700, 0, 20);
  assert.equal(A.depth(150 + 1e-6, 1.5), 0); assert.equal(A.depth(0, 0.5), 100); assert.equal(A.state(1.5).u, 0); n += 3;
  // 주기성: 다음 개구(1000 nm 옆)도 같은 모양
  near(M.depth(1000 + 170, 1.2), M.depth(170, 1.2), 1e-9, "iso periodic"); n++;
  // 하부막 손실 = t·과식각/S (개구 가운데), #endpoint 식 Δh = R/S·(t_total − t_clear)와 같다
  near(M.loss(0, 1.2), 200 * 0.2 / 20, 1e-12, "iso loss"); n++;
  // 본문 수치
  const iso = note("sim-iso"), st = (t, L, r, oe, S) => isoModel(t, 300, L, r, S).state(1 + oe / 100);
  const d = st(200, 700, 1, 20, 20);
  assert.equal(Math.round(d.u), 240); assert.equal(Math.round(d.cd), 480); assert(!d.lift);
  has(iso, "한쪽 언더컷은 240 nm, CD 바이어스는 480 nm", "iso ①");
  assert.equal(Math.round(st(200, 700, 1, 60, 20).contact), 60); has(iso, "60%로 늘리면 이웃 선 밑에 붙은 폭이 60 nm", "iso ②");
  assert(!st(200, 700, 1, 75, 20).lift && st(200, 700, 1, 80, 20).lift); has(iso, "80%면 양쪽 언더컷이 만나 마스크 선이 떨어진다", "iso ②");
  assert(st(400, 700, 1, 20, 20).lift); has(iso, "400 nm로 키워도 과식각 20%에서 떨어진다", "iso ②");
  const r1 = st(200, 700, 0.1, 20, 20); assert.equal(Math.round(r1.u), 24); assert.equal(r1.A.toFixed(2), "0.90"); has(iso, "언더컷은 24 nm뿐", "iso ③");
  assert.equal(st(200, 700, 1, 20, 20).loss.toFixed(0), "2"); assert.equal(st(200, 700, 1, 20, 5).loss.toFixed(0), "8"); has(iso, "하부막 손실이 2 nm에서 8 nm로", "iso ④");
  has(html, "u = 200 × 1.2 = 240 nm다. CD 바이어스는 2u = 480 nm", "quiz iso");
  n += 14;
}

/* ---------- sim-sheath: 차일드 시스 + 전하 교환 몬테카를로 */
{
  const N = 4000, run = (p, V, ne, Te, AR) => SHM.run(p, V, ne, Te, AR, N, rng(11));
  // 차일드 두께(n_e = 10¹⁶ m⁻³, T_e = 3 eV, 200 V): λ_D = 0.129 mm, s = (√2/3)λ_D(2V/T_e)^{3/4} = 2.38 mm
  const g = SHM.geom(1, 200, 1e16, 3);
  near(g.lD * 1e3, 0.1288, 5e-4, "Debye length"); near(g.s * 1e3, 2.382, 5e-3, "Child sheath"); n += 2;
  // λ = k_B T_g/(σ p): 1 Pa에서 8.28 mm (σ = 5×10⁻¹⁹ m², 300 K)
  near(g.lam * 1e3, 8.284, 5e-3, "mean free path"); n++;
  // s ∝ V^{3/4}, s ∝ n_e^{−1/2}
  near(SHM.geom(1, 1000, 1e16, 3).s / g.s, Math.pow(5, 0.75), 1e-12, "s ∝ V^3/4");
  near(SHM.geom(1, 200, 1e17, 3).s / g.s, 1 / Math.sqrt(10), 1e-12, "s ∝ n^-1/2"); n += 2;
  // 몬테카를로: 무충돌 비율 = e^{−s/λ} (이항 3σ 안)
  for (const p of [0.1, 1, 3, 10]) {
    const o = run(p, 200, 1e16, 3, 10), q = o.g.free;
    near(o.free, q, 3 * Math.sqrt(q * (1 - q) / N) + 1e-9, `free fraction p=${p}`); n++;
  }
  // 무충돌 극한: 입사각 rms = arctan√(T_i/(eV + T_e/2)) (본문의 σ_θ 식), 평균 = √(π/4)배. 100 V에서 1~2°.
  const o0 = run(1e-3, 100, 1e16, 3, 10), Ef = 100 + 1.5;
  let ms = 0; for (const t of o0.th) ms += t * t;
  const rmsDeg = Math.sqrt(ms / N) * 180 / Math.PI, sig = Math.atan(Math.sqrt(0.05 / Ef)) * 180 / Math.PI;
  near(rmsDeg, sig, 0.03 * sig, "collisionless rms angle"); near(o0.mean * 180 / Math.PI, Math.sqrt(Math.PI / 4) * sig, 0.03 * sig, "collisionless mean angle");
  assert(sig > 1 && sig < 2, "formula text: 100 V → 1~2°"); n += 3;
  // 에너지 보존: 무충돌이면 E = eV + T_e/2 (+ 가로 열에너지), 충돌한 이온은 그보다 낮다
  const oh = run(10, 200, 1e16, 3, 10); let bad = 0; for (const e of oh.E) if (e > 201.5 + 1 || e < 0) bad++; assert.equal(bad, 0); n++;
  // 본문 수치(해볼 것·퀴즈) — 화면과 같은 반올림
  const sh = note("sim-sheath"), pct = (v) => v >= 0.1 ? Math.round(v * 100) + "%" : fmt(v * 100, 2) + "%";
  const a = run(1, 200, 1e16, 3, 10), b = run(10, 200, 1e16, 3, 10);
  assert.equal(fmt(a.g.r, 2), "0.29"); assert.equal(fmt(b.g.r, 2), "2.9"); assert.equal(pct(a.g.free), "75%"); assert.equal(pct(b.g.free), "5.6%");
  has(sh, "s/λ가 0.29에서 2.9로 커져, 충돌 없이 닿는 이온이 75%에서 5.6%로", "sheath ①");
  assert.equal((a.mean * 180 / Math.PI).toFixed(2), "0.88"); assert.equal((b.mean * 180 / Math.PI).toFixed(2), "1.53");
  assert.equal(Math.round(a.bottom * 100), 99); assert.equal(Math.round(b.bottom * 100), 90);
  has(sh, "평균 입사각은 0.88°에서 1.53°로 커지고, AR 10 홀 바닥까지 가는 이온은 99%에서 90%로", "sheath ①");
  const c = run(10, 200, 1e17, 3, 10);
  assert.equal(fmt(a.g.s * 1e3, 3), "2.38"); assert.equal(fmt(c.g.s * 1e3, 3), "0.753"); assert.equal(pct(c.g.free), "40%");
  has(sh, "시스가 2.38 mm에서 0.753 mm로 얇아져 무충돌 이온이 40%로", "sheath ②");
  const d4 = run(1, 200, 1e16, 3, 40), e4 = run(1, 1000, 1e16, 3, 40);
  assert.equal((d4.acc * 180 / Math.PI).toFixed(2), "0.72"); assert.equal(Math.round(d4.bottom * 100), 46); assert.equal(Math.round(e4.bottom * 100), 87);
  assert(e4.g.free < d4.g.free, "1000 V: thicker sheath, more collisions");
  has(sh, "AR을 40(허용각 0.72°)으로 올리면 200 V에서는 바닥까지 가는 이온이 46%뿐이지만, 1000 V면", "sheath ③"); has(sh, "87%가 간다", "sheath ③");
  near(b.g.lam * 1e3, 0.83, 0.005, "quiz λ(10 Pa)"); assert.equal(Math.round(b.g.free * 100), 6);
  has(html, "8.3 mm에서 0.83 mm로 줄어 s/λ ≈ 2.9", "quiz sheath"); has(html, "(시스 두께 약 2.4 mm)", "quiz sheath");
  n += 20;
}

/* ---------- sim-syn: 덮임률 모형 */
{
  const Gn = 10 ** 15.6, Gi = 10 ** 13.7, d = SYN.bars(Gn, Gi, 450);
  // Coburn–Winters(1979), EtchBook 표면 장의 표와 같은 값: XeF₂만 약 0.5, Ar⁺ 450 eV만 약 0.2, 함께 약 5~6 nm/min, 시너지 여덟 배 가까이
  near(d.gas, 0.5, 0.025, "CW gas only"); near(d.ion, 0.2, 0.01, "CW ion only"); assert(d.syn > 7 && d.syn < 8, "여덟 배 가까이"); assert(d.both >= 5 && d.both <= 6, "CW both"); n += 3;
  assert(d.both / d.gas > 10, "기존 본문: 열 배 넘게"); n++;
  // 정상 상태: 붙는 속도 = 떨어지는 속도
  const a = SYN.S * Gn, b = SYN.Yi(450) * Gi; near(a * (1 - d.th), (b + SYN.KTH) * d.th, 1e-6 * a, "site balance"); n++;
  // 중성 제한(작은 Γ_n/Γ_i): ER ≈ (sΓ_n + Y_spΓ_i)/ρ, 이온 제한(큰 비): ER → (Y_iΓ_i + k_th + Y_spΓ_i)/ρ
  const conv = 6e8 / SYN.RHO, lo = SYN.calc(1e9, Gi, 450).er, hi = SYN.calc(1e22, Gi, 450).er;
  near(lo, (SYN.S * 1e9 + SYN.Ysp(450) * Gi) * conv, 1e-3 * lo, "neutral-limited asymptote");
  near(hi, (b + SYN.KTH + SYN.Ysp(450) * Gi) * conv, 1e-4 * hi, "ion-limited asymptote"); n += 2;
  // 문턱 아래(E ≤ 20 eV)에서는 이온이 아무 일도 하지 않는다
  assert.equal(SYN.bars(Gn, Gi, 20).both, SYN.bars(Gn, Gi, 20).gas); n++;
  const sy = note("sim-syn");
  assert.equal(d.gas.toFixed(2) + " / " + d.ion.toFixed(2) + " / " + d.both.toFixed(2), "0.51 / 0.20 / 5.41"); assert.equal((d.gas + d.ion).toFixed(2), "0.70"); assert.equal(d.syn.toFixed(1), "7.7");
  has(sy, "세 막대는 약 0.51 / 0.20 / 5.41 nm/min으로, 따로의 합(0.70)의 7.7배다. 여덟 배 가까운", "syn ①");
  assert.equal(d.yield.toFixed(1), "8.3"); near(d.yield, SYN.Yi(450) * d.th + SYN.Ysp(450), 1e-12, "ion yield"); near(SYN.Ysp(450), 0.33, 0.005, "sputter yield"); has(sy, "Si 원자 약 8.3개", "syn ①");
  assert.equal(SYN.bars(Gn, Gi, 0).yield, 0, "no ion yield below threshold"); has(sy, "순수 스퍼터는 약 0.3개", "syn ①");
  assert.equal(fmt(SYN.bars(Gn, Gi, 100).both, 3), "2.35"); has(sy, "100 eV로 내리면 둘 다의 속도가 2.35 nm/min", "syn ②");
  const n14 = SYN.bars(1e14, Gi, 450), n17 = SYN.bars(1e17, Gi, 450);
  assert.equal(n14.th.toFixed(2), "0.08"); assert.equal(fmt(n14.both, 3), "0.75"); assert(n14.th < 0.3);
  has(sy, "θ ≈ 0.08인 중성 제한이 되어 속도가 0.75 nm/min", "syn ③");
  assert.equal(fmt(n17.both, 3), "6.78"); assert(n17.both / d.both - 1 > 0.23 && n17.both / d.both - 1 < 0.27, "4분의 1쯤"); assert.equal(Math.round(1e17 / Gn), 25); assert(n17.th > 0.7);
  has(sy, "10¹⁷까지 25배 늘려도 속도는 6.78 nm/min으로 4분의 1쯤만", "syn ③");
  const i15 = SYN.bars(Gn, 1e15, 450); assert.equal(Math.round(i15.both), 24); assert.equal(i15.th.toFixed(2), "0.16");
  has(sy, "24 nm/min까지 빨라지지만 θ가 0.16으로", "syn ④");
  n += 16;
}

/* ---------- sim-load: Mogab 로딩과 OES 종말점 SNR */
{
  // R = R₀/(1 + Φθ), SNR ∝ θR
  near(LOAD.rate(0.5, 2), 150, 1e-12, "Mogab"); assert.equal(LOAD.rate(0.3, 0), 300); n += 2;
  const c = (thPct, phi = 2, sig = 1, h = 200) => LOAD.calc(thPct / 100, phi, sig, h);
  near(c(20).snr / c(10).snr, 2 * LOAD.rate(0.2, 2) / LOAD.rate(0.1, 2), 1e-12, "SNR ∝ θR"); n++;
  // 계단: 막이 걷히기 전 = 배경 + ΔI, 뒤 = 배경. 10→90 % 하강 폭 = 2 ln 9 × 0.01 t_c ≈ 4 %
  const k = c(10); near(LOAD.level(k, 0), LOAD.BG + k.dI, 1e-9, "before"); near(LOAD.level(k, 3 * k.tc), LOAD.BG, 1e-9, "after");
  near(2 * Math.log(9) * 0.01, 0.044, 0.001, "fall width"); has(note("sim-load"), "t<sub>c</sub>의 약 4%가 걸린다", "load model"); n += 4;
  const ld = note("sim-load"), th60 = 10 ** 1.78;   // 슬라이더 끝 = 60.3 % (화면 "60%")
  assert.equal(fmt(th60, 2), "60");
  assert.equal(k.snr.toFixed(1), "8.3"); has(ld, "8.3σ만큼 떨어져", "load ①");
  assert.equal(Math.round(c(1).R), 294); assert.equal(c(1).snr.toFixed(1), "1.0"); has(ld, "속도는 294 nm/min으로 조금 빨라지지만 SNR이 약 1로", "load ②");
  assert.equal(c(1, 2, 0.2).snr.toFixed(1), "4.9"); assert(c(1, 2, 0.2).snr >= 3 && c(1, 2, 0.2).snr < 5); has(ld, "SNR 4.9로 아슬아슬", "load ②");
  assert.equal(Math.round(c(th60).R), 136); assert(c(th60).R < 150); assert.equal(Math.round(k.tc), 48); assert.equal(Math.round(c(th60).tc), 88);
  has(ld, "속도가 136 nm/min으로 절반 아래가 되어, 막이 걷히는 데 48 s 대신 88 s", "load ③");
  assert.equal(c(37, 0).R, 300); has(ld, "어느 면적에서나 300 nm/min", "load ④");
  has(html, "열린 면적 10%일 때 SNR 8.3이던 계단이 1%에서는 약 1로", "quiz load");
  n += 14;
}

// 화면이 쓰는 값은 슬라이더 끝과 기본값에서 모두 유한해야 한다(브라우저 검사와 별개로 모형만)
for (const p of [0.1, 30.2]) for (const V of [50, 1000]) for (const ne of [1e15, 1e18]) for (const Te of [1, 8]) {
  const o = SHM.run(p, V, ne, Te, 60, 400, rng(11)); assert(Number.isFinite(o.mean) && Number.isFinite(o.g.s) && Number.isFinite(o.meanE)); n++;
}
for (const E of [0, 1000]) for (const gn of [14, 17]) for (const gi of [12, 15]) { const o = SYN.bars(10 ** gn, 10 ** gi, E); assert(Number.isFinite(o.both) && Number.isFinite(o.syn) && Number.isFinite(o.yield)); n++; }
console.log(`etch-sims: ${n} checks ok`);
