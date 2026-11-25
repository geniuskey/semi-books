/* Copyright (c) 2026 geniuskey and PackagingBook contributors. MIT.
 * node packaging/tools/factcheck-regression.cjs
 * Regressions for the dicing blade simulator default and the molding Kerner CTE form. */
"use strict";
{
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'..');
const s=fs.readFileSync(path.join(root,'chapters/dicing.html'),'utf8');
function block(s,name){const st=s.indexOf(`function ${name}(`);assert.ok(st>=0,name);const b=s.indexOf('{',st);let d=1,e=b+1;for(;d&&e<s.length;e++){if(s[e]==='{')d++;if(s[e]==='}')d--;}return s.slice(st,e);}
const c=vm.createContext({});vm.runInContext('var D=56,AE=0.12,SPEC=30;'+block(s,'calc'),c);
const g0=Number(s.match(/id="bl-g"[^>]*value="([\d.]+)"/)[1]),n0=Number(s.match(/id="bl-n"[^>]*value="([\d.]+)"/)[1])*1000;
const maxFeed=(rpm,g)=>{let b=0;for(let v=5;v<=150;v+=5)if(c.calc(v,rpm,g).bsc<=30)b=v;return b;};
const m0=maxFeed(n0,g0);assert.ok(m0>=50&&m0<150,`default crossing inside range: ${m0}`);
assert.equal(maxFeed(60000,g0),150);assert.equal(maxFeed(n0,4),150);
console.log('dicing blade regression ok, default max feed',m0,'mm/s');
}
{
const fs = require("fs"), vm = require("vm"), path = require("path"), assert = require("assert");
const root = path.resolve(__dirname, "..", "..");
const html = fs.readFileSync(path.join(root, "packaging/chapters/molding.html"), "utf8");
function block(src, start, end) { const i = src.indexOf(start); assert(i >= 0, "missing " + start); const j = src.indexOf(end, i); return src.slice(i, j); }
const code = block(html, "var RES = {", "cv = PB.canvas(\"#fp-cv\"");
const ctx = {}; vm.createContext(ctx);
vm.runInContext(code + "\nthis.props = props; this.FIL = FIL; this.RES = RES; this.KG = KG;", ctx);
const { props, FIL, RES, KG } = ctx;
for (const key of ["fs", "cs", "al"]) {
  const f = FIL[key], m = KG(RES.E, RES.nu), ff = KG(f.E, f.nu);
  for (const wt of [60, 75, 85, 90]) {
    const p = props(wt, f, 0.9), phi = p.phi;
    const Kc = m.K + phi / (1 / (ff.K - m.K) + 3 * (1 - phi) / (3 * m.K + 4 * m.G));
    const levin = RES.a * (1 - phi) + f.a * phi + (f.a - RES.a) / (1 / ff.K - 1 / m.K) * (1 / Kc - (phi / ff.K + (1 - phi) / m.K));
    assert(Math.abs(p.cte - levin) < 1e-9, key + " " + wt + " wt%: cte " + p.cte + " vs Levin/HS " + levin);
  }
}
// note values: fused silica 70 -> 88 wt% (phi_m 0.88): CTE 22 -> 9.6, eta 9.3 -> 196; phi_m 0.64 breaks at 77 wt%
const fsil = FIL.fs, a70 = props(70, fsil, 0.88), a88 = props(88, fsil, 0.88);
assert(Math.abs(a70.cte - 22.0) < 0.1 && Math.abs(a88.cte - 9.6) < 0.1, "CTE note values");
assert(a88.eta > 150 && a88.eta < 250 && a70.eta < 10, "viscosity note values");
assert(props(76, fsil, 0.64).ok && !props(77, fsil, 0.64).ok, "phi_m 0.64 cut-off near 77 wt%");
console.log("regress-B ok");
}
