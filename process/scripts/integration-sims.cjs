// Copyright (c) 2026 geniuskey and ProcessBook contributors. SPDX-License-Identifier: MIT
// Regression for the Chapter 12 (integration) simulator models: slices each /* model:<id> */ block out of the
// chapter, runs it in node:vm, and checks textbook anchors plus every number the prose, notes and quiz quote.
const fs = require('node:fs'), vm = require('node:vm'), assert = require('node:assert/strict'), path = require('node:path');
const root = path.resolve(__dirname, '..'), html = fs.readFileSync(path.join(root, 'chapters/integration.html'), 'utf8');
const xc = { window: {} }; vm.createContext(xc); vm.runInContext(fs.readFileSync(path.join(root, 'js/xsec.js'), 'utf8'), xc);
const XS = xc.window.XS;
function model(id, name) {
  const m = html.match(new RegExp('/\\* model:' + id + ' \\*/([\\s\\S]*?)/\\* /model:' + id + ' \\*/'));
  assert(m, 'model block ' + id + ' not found');
  const c = { Math }; vm.createContext(c); vm.runInContext(m[1] + ';this.M=' + name + ';', c); return c.M;
}
const f3 = (x) => Number(x.toPrecision(3)), t1 = (x) => x.toFixed(1), near = (a, b, tol, msg) => assert(Math.abs(a - b) <= tol, `${msg}: ${a} vs ${b}`);
const quoted = (s) => assert(html.includes(s), 'chapter text should quote: ' + s);
let checks = 0; const ok = () => checks++, same = (a, b, msg) => assert.equal(JSON.stringify(a), JSON.stringify(b), msg);

/* ---------------- sim-mask */
const MK = model('sim-mask', 'MKM');
const base = { metals: 10, vt: 3, tight: 2, pat: 'single', euv: false, io: true }, cnt = (o) => MK.count(Object.assign({}, base, o));
const d0 = cnt({});
assert.equal(d0.total, 42); assert.equal(d0.beol, 20); same(d0.steps, [630, 1050]); same(d0.days, [42, 63]); assert.equal(MK.zone(42), 'r28'); ok();
const sq = cnt({ pat: 'saqp' }), mp = sq.mods.find((d) => d.k === 'mp').n;
assert.equal(mp, 8); assert.equal(sq.total, 52); assert.equal(sq.mods.find((d) => d.k === 'gate').n, 2); assert.equal(sq.mods.find((d) => d.k === 'ct').n, 2); ok();
const adv = cnt({ metals: 14, vt: 4, tight: 4, pat: 'saqp' }), euv = cnt({ metals: 14, vt: 4, tight: 4, pat: 'saqp', euv: true });
assert.equal(adv.total, 70); assert.equal(MK.zone(70), 'adv'); assert.equal(euv.total, 54); assert.equal(euv.saved, 16); assert.equal(4 * 2 * (3 - 1), 16); ok();
for (let v = 1; v < 5; v++) assert.equal(cnt({ vt: v + 1 }).total - cnt({ vt: v }).total, 2);
assert.equal(cnt({ euv: true }).total, 42, 'EUV changes nothing when single exposure already prints the layer');
assert.equal(MK.count({ metals: 4, vt: 1, tight: 6, pat: 'lele', euv: false, io: false }).tight, 4, 'tight layers capped by metal layers'); ok();
// the cross-section flow above uses ten masks (the minimal configuration the prose refers to)
assert.equal((html.match(/lith\(\{ mod:/g) || []).length, 10); ok();
quoted('42장으로 28 nm급 범위에 든다'); quoted('8장이 늘고'); quoted('52장이 된다'); quoted('70장으로 첨단 범위'); quoted('54장(−16장)'); quoted('16장 준다'); quoted('(70 → 54장)');

/* ---------------- sim-tb */
const TB = model('sim-tb', 'TBM');
const kB = 8.617e-5, DB = (T) => 0.76 * Math.exp(-3.46 / (kB * (T + 273.15)));   // 9장 표(anneal.html)와 같은 값
near(TB.D('B', 1000), DB(1000), 1e-20, 'B @1000 °C'); near(TB.D('B', 1000), 1.5e-14, 0.2e-14, 'anneal table B @1000 °C ~1.5e-14');
near(TB.D('As', 1000), 1.6e-15, 0.25e-15, 'anneal table As @1000 °C ~1.6e-15'); ok();
assert.match(fs.readFileSync(path.join(root, 'chapters/anneal.html'), 'utf8'), /B: \[0\.76, 3\.46, "p"\][^\n]*As: \[0\.066, 3\.44, "n"\]/); ok();
const r1050 = TB.D('B', 1050), r400 = TB.D('B', 400), ratio = r1050 / r400, years = 1.5 * ratio / (365.25 * 86400);
near(r1050, 5e-14, 0.5e-14, 'D_B(1050)'); assert(r400 > 0.5e-26 && r400 < 2e-26, 'D_B(400) ~1e-26');
assert(ratio > 4.5e12 && ratio < 5.5e12, 'ratio ~5e12: ' + ratio); assert(years > 2.25e5 && years < 2.75e5, '~25만 년: ' + years); ok();
quoted('약 5×10¹²배'); quoted('약 25만 년'); quoted('약 5×10⁻¹⁴ cm²/s'); quoted('약 10⁻²⁶ cm²/s');
const tbRun = (sp, o) => { const rg = XS.range(sp, sp === 'As' ? 20 : 4); return TB.run(Object.assign({ sp, Rp: rg.Rp, dRp: rg.dRp, Q: 3e15, NB: 1e18, act: 'spike', metals: 10, mistake: false, Lg: 50, wsp: 24 }, o)); };
const nm = (cm) => cm * 1e7;
const as0 = tbRun('As', {});
assert.equal(t1(nm(as0.imp.xj)), '42.2'); assert.equal(t1(nm(as0.fin.xj)), '42.6'); assert.equal(as0.dom.k, 'act'); assert(as0.share >= 0.9995);
assert.equal(f3(nm(Math.sqrt(as0.total))), 0.884); assert(!as0.fin.merged); ok();
as0.rows.filter((r) => ['sil', 'ct', 'beol', 'fga'].includes(r.k)).forEach((r) => { const L = nm(Math.sqrt(r.Dt)); assert(L > 1e-5 && L < 1e-4, r.k + ' √Dt ' + L); });
assert.equal(t1(nm(as0.rows.find((r) => r.k === 'act').st.xj)), t1(nm(as0.fin.xj)), 'after the spike nothing moves x_j');
const late = as0.rows.filter((r) => ['sil', 'ct', 'beol', 'fga'].includes(r.k)).reduce((a, r) => a + r.Dt, 0), spike = as0.dom.Dt;
assert(late / spike < 1e-7, 'late steps < 1e-7 of the spike: ' + late / spike);
const bLate = tbRun('B', {}); assert(bLate.rows.filter((r) => ['sil', 'ct', 'beol', 'fga'].includes(r.k)).reduce((a, r) => a + r.Dt, 0) / bLate.dom.Dt < 1e-7); ok();
const asX = tbRun('As', { mistake: true });
assert.equal(asX.dom.k, 'ox'); assert.equal((asX.share * 100).toFixed(1), '99.7'); assert.equal(Math.round(nm(asX.fin.xj)), 104); assert(asX.fin.merged); assert(nm(asX.fin.xj) / nm(asX.imp.xj) > 2); ok();
const b0 = tbRun('B', {}); assert.equal(f3(nm(Math.sqrt(b0.total))), 2.75); assert(Math.sqrt(b0.total / as0.total) > 3); ok();
const bF = tbRun('B', { act: 'furn' }); assert.equal(t1(nm(bF.fin.xj)), '92.7'); assert(bF.fin.merged); ok();
assert.equal(t1(nm(tbRun('As', { metals: 16 }).fin.xj)), '42.6'); ok();
quoted('42.2 → 42.6 nm로 0.4 nm'); quoted('10⁻⁵~10⁻⁴ nm'); quoted('99.7 %를 차지해'); quoted('104 nm로 두 배 넘게'); quoted('2.75 nm로 비소의 세 배 넘게'); quoted('92.7 nm가 되고'); quoted('42.6 nm에서 104 nm로'); quoted('10⁻⁷배에도 못 미치기');
// lateral solver: an isolated window's reach equals √2·σ⊥·erfc⁻¹(2N_B/C_max) when the far window is negligible
{
  const st = as0.imp, th = 1e18 / st.pk.c; let lo = 0, hi = 10; for (let i = 0; i < 100; i++) { const m = (lo + hi) / 2; if (TB.erfc(m) > 2 * th) lo = m; else hi = m; }
  near(st.reach, Math.SQRT2 * st.sl * lo, 1e-9, 'lateral reach'); ok();
}

/* ---------------- sim-sa */
const SA = model('sim-sa', 'SAM');
near(SA.erfc(1), 0.157299207, 2e-8, 'erfc(1)'); near(SA.erfc(5) / 1.5374597944e-12, 1, 2e-7, 'erfc tail'); near(SA.erfcInv(SA.erfc(4.2)), 4.2, 1e-9, 'erfc⁻¹'); ok();
const sup1 = (x) => { const e = Math.floor(Math.log10(x)); return (x / 10 ** e).toFixed(1) + 'e' + e; };
const s0 = SA.run({ ov3: 10, m: 10, sa: false, N: 1e9 });
assert.equal(sup1(s0.p), '6.8e-6'); assert(s0.y < 0.001); assert.equal(s0.worstZ.toFixed(1), '6.2'); assert.equal(s0.worst.toFixed(1), '20.6'); assert.equal((-s0.ovL).toFixed(1), '5.6');
assert.equal(s0.cov.toFixed(1), '3.0'); assert.equal(Math.round(s0.area * 100), 15); ok();
assert.equal((SA.run({ ov3: 10, m: 10, sa: false, N: 1e3 }).y * 100).toFixed(1), '99.3'); ok();
const s17 = SA.run({ ov3: 10, m: 17, sa: false, N: 1e9 });
assert.equal((s17.y * 100).toFixed(1), '96.0'); assert.equal(s17.cov.toFixed(1), '4.4'); assert.equal(Math.round(s17.area * 100), 26); assert.equal(s17.Lg - SA.run({ ov3: 10, m: 0, sa: false, N: 1e9 }).Lg, 34); ok();
const sSA = SA.run({ ov3: 30, m: 0, sa: true, N: 1e10 }); assert.equal(sSA.y, 1); assert.equal(sSA.p, 0); assert.equal(sSA.mu, 5); ok();
const m90 = SA.marginFor(10, 1e9, 0.9), z90 = (m90 + 5) / (10 / 3);
assert.equal(m90.toFixed(1), '16.5'); near(m90 + 5, 21.5, 0.06, 'm+ΔL'); assert(z90 > 6.4 && z90 < 6.55, 'z90 ' + z90);
near(-Math.log(0.9) / 1e9, 1.05e-10, 0.01e-10, 'p needed ~1e-10'); near(SA.run({ ov3: 10, m: m90, sa: false, N: 1e9 }).y, 0.9, 0.002, 'yield at m90'); ok();
quoted('6.8×10⁻⁶뿐이지만'); quoted('6.2σ = 20.6 nm'); quoted('5.6 nm 틈'); quoted('99.3 %'); quoted('96.0 %'); quoted('34 nm 길어지고(피치의 26 %)'); quoted('4.4배'); quoted('약 16.5 nm'); quoted('약 6.5σ(21.5 nm)');

/* ---------------- sim-sil */
const SL = model('sim-sil', 'SLM');
const row = (m, n) => SL.PH[m].find((p) => p[0] === n);
same(row('ni', 'NiSi').slice(1, 5), [350, 15, 1.83, 2.22]); same(row('ni', 'Ni₂Si').slice(1, 5), [250, 24, 0.91, 1.51]);
same(row('ni', 'NiSi₂').slice(1, 5), [750, 40, 3.65, 3.59]); same(row('co', 'CoSi₂').slice(3, 5), [3.64, 3.52]); same(row('ti', 'C54 TiSi₂').slice(3, 5), [2.27, 2.51]);
assert(SL.tAgg(5) >= 600 && SL.tAgg(20) <= 700, 'agglomeration 600~700 °C'); ok();
// molar-volume check of the Ni rows (Ni 6.59, Si 12.06, NiSi 14.53 cm³/mol): Si/Ni = 1.83, NiSi/Ni = 2.2
near(12.06 / 6.589, 1.83, 0.005, 'NiSi Si consumption'); near(14.53 / 6.589, 2.22, 0.02, 'NiSi thickness'); ok();
const sl = (o) => SL.run(Object.assign({ metal: 'ni', tm: 10, T: 450, xj: 40 }, o));
const n0 = sl({}); assert.equal(n0.name, 'NiSi'); assert.equal(t1(n0.tSil), '22.2'); assert.equal(f3(n0.Rs), 6.61); assert.equal(t1(n0.gap), '21.7'); assert.equal(n0.v, 'ok'); assert.equal(t1(n0.tSi), '18.3'); ok();
assert.equal(f3(sl({ T: 200 }).Rs), 163); assert.equal(sl({ T: 200 }).v, 'none'); ok();
const n680 = sl({ T: 680 }); assert(n680.agg); assert.equal(n680.name, 'NiSi'); assert.equal(f3(n680.Rs), 44.2); ok();
const n800 = sl({ T: 800 }); assert.equal(n800.name, 'NiSi₂'); assert.equal(t1(n800.tSi), '36.5'); assert.equal(n800.v, 'short'); ok();
const c750 = sl({ metal: 'co', T: 750 }); assert.equal(c750.name, 'CoSi₂'); assert.equal(f3(c750.Rs), 5.1); assert.equal(t1(c750.tSi), '36.4'); assert.equal(t1(c750.gap), '3.6'); assert.equal(c750.v, 'bad'); ok();
const n20 = sl({ tm: 20 }); assert.equal(f3(n20.Rs), 3.37); assert.equal(t1(n20.gap), '3.4'); assert.equal(n20.v, 'bad'); ok();
assert(n0.Rs < 10 && f3(sl({ T: 200 }).Rs) > 100, '수십~수백 Ω/□ → 수 Ω/□'); ok();
quoted('NiSi 22.2 nm, R<sub>s</sub> 6.61 Ω/□, 접합까지 21.7 nm'); quoted('R<sub>s</sub> 163 Ω/□'); quoted('44.2 Ω/□'); quoted('실리콘 36.5 nm'); quoted('5.1 Ω/□'); quoted('실리콘 36.4 nm'); quoted('3.6 nm밖에'); quoted('3.37 Ω/□'); quoted('3.4 nm로 누설 위험');

/* ---------------- sim-spacer */
const SP = model('sim-spacer', 'SPM');
near(SP.Lreq, 40, 0.3, 'L_eff for 100 mV'); ok();
same([SP.C.lam, SP.C.V0, SP.C.dLDD, SP.C.RSD, SP.C.rch, SP.C.Vt0, SP.C.VDD, SP.C.lim], [8, 1.2, 5, 50, 12, 0.35, 1, 0.1], 'constants quoted under the spacer formula');
quoted('λ = 8 nm, V₀ = 1.2 V'); quoted('R<sub>SD</sub> = 50 Ω·µm'); quoted('r<sub>ch</sub> = 12 Ω·µm/nm'); ok();
const p0 = SP.dev(50, 40, 1000, 24), b0b = SP.band(50, 40, 1000);
assert.equal(t1(p0.Leff), '40.0'); assert(b0b.ok); assert.equal(Math.round(b0b.w0), 23); assert.equal(Math.round(b0b.w1), 37); assert(24 >= b0b.w0 && 24 <= b0b.w1); assert(-p0.dVt <= 0.1); ok();
const p15 = SP.dev(50, 40, 1000, 15); assert.equal(p15.enc, 13); assert.equal(p15.Leff, 24); assert.equal(Math.round(p15.dVt * 1000), -268); assert(p15.I > 2150 && p15.I < 2250, 'I(15) ' + p15.I); assert(-p15.dVt > 0.1); ok();
const b60 = SP.band(50, 60, 1000); assert(b60.ok); assert.equal(Math.round(b60.w0), 37); ok();
assert.equal(SP.band(45, 40, 1000).ok, false); assert.equal(SP.band(45, 40, 1000).why, 'short'); ok();
// I_on falls monotonically right of the band start (both L_eff and R_ext only grow)
for (let w = b0b.w0; w < 50; w += 0.5) assert(SP.dev(50, 40, 1000, w + 0.5).I <= SP.dev(50, 40, 1000, w).I + 1e-9); ok();
assert(SP.dev(50, 80, 1000, 0).pt && !Number.isFinite(SP.dev(50, 80, 1000, 0).I)); ok();
quoted('약 23~37 nm'); quoted('게이트 밑 13 nm'); quoted('L<sub>eff</sub>가 24 nm'); quoted('−268 mV'); quoted('약 2200 µA/µm'); quoted('약 37 nm 이상'); quoted('\\approx 40\\) nm');

/* ---------------- markup */
const qs = html.match(/<div class="quiz-q">[\s\S]*?<div class="quiz-exp">/g) || [];
assert(qs.length >= 6, 'quiz count ' + qs.length); qs.forEach((q, i) => assert.equal((q.match(/data-correct/g) || []).length, 1, 'quiz ' + (i + 1)));
['sim-mask', 'sim-tb', 'sim-sa', 'sim-sil', 'sim-spacer'].forEach((id) => assert.equal((html.match(new RegExp('id="' + id + '"', 'g')) || []).length, 1, id)); ok();
console.log({ integrationSims: 'ok', checks, quiz: qs.length });
