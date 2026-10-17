'use strict';
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm'), assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..'), html = fs.readFileSync(path.join(root, 'chapters/adc.html'), 'utf8');
const common = fs.readFileSync(path.join(root, 'js/common.js'), 'utf8');
const gauss = html.match(/  const gauss = .*;/)[0];
const start = html.indexOf('    function build() {', html.indexOf('(function simHist()'));
const end = html.indexOf('    function clear()', start);
const ctx = { AB: {}, Math, Float64Array }; vm.createContext(ctx);
vm.runInContext(common.match(/  AB.rng = .*;/)[0] + gauss, ctx);
vm.runInContext(`const N=8,L=256;let seed=4,sigma=3,dacV,trueDnl,trueInl;const ss=()=>sigma;
${html.slice(start,end)}
globalThis.run=(sd,s)=>{seed=sd;sigma=s;build();return {dacV,trueDnl,trueInl,sar};};`, ctx);
let assertions = 0, oldFalseMissing = null, maxOldDnlError = 0;
for (const sigma of [0, .1, 3, 6, 8]) for (let seed = 1; seed <= 100; seed++) {
  const r = ctx.run(seed, sigma), cuts = [...new Set([0, 256, ...r.dacV].filter(x => x >= 0 && x <= 256))].sort((a,b)=>a-b);
  // Independent oracle partitions the input at every possible DAC comparison value,
  // executes the original SAR at each interval midpoint, and sums the interval lengths.
  const widths = new Float64Array(256), old = new Float64Array(256);
  for (let i = 1; i < cuts.length; i++) widths[r.sar((cuts[i]+cuts[i-1])/2)] += cuts[i]-cuts[i-1];
  assert(Math.abs(widths.reduce((a,b)=>a+b,0)-256)<1e-10); assertions++;
  let mean = 0; for (let c = 1; c < 255; c++) mean += widths[c]; mean /= 254;
  for(let i=0;i<256*64;i++) old[r.sar((i+.5)/64)]++;
  let om=0;for(let c=1;c<255;c++)om+=old[c];om/=254;
  for (let c = 1; c < 255; c++) {
    assert(Math.abs(r.trueDnl[c]-(widths[c]/mean-1))<1e-10); assertions++;
    assert.equal(r.trueDnl[c]===-1,widths[c]===0); assertions++;
    maxOldDnlError=Math.max(maxOldDnlError,Math.abs(old[c]/om-1-r.trueDnl[c]));
    if(old[c]===0 && widths[c]>0 && !oldFalseMissing) oldFalseMissing={seed,sigma,code:c,widthLSB:widths[c],trueDnl:r.trueDnl[c],oldMissing:[...old].slice(1,255).filter(v=>v===0).length,actualMissing:[...widths].slice(1,255).filter(v=>v===0).length};
    if(widths[c]>0) assert.equal(r.sar(cuts.find(x=>r.sar(x+1e-9)===c)+widths[c]/2),c);
  }
}
assert(oldFalseMissing,'The fixture must catch the original false missing-code result.'); assertions++;
let blocks=0, chapters=0;
for(const file of fs.readdirSync(path.join(root,'chapters')).filter(f=>f.endsWith('.html'))){
 const text=fs.readFileSync(path.join(root,'chapters',file),'utf8');chapters++;
 for(const match of text.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)){
  if(/\bsrc\s*=/.test(match[1]))continue;
  if(/application\/ld\+json/.test(match[1]))JSON.parse(match[2]);else new vm.Script(match[2],{filename:file});blocks++;
 }
}
console.log(JSON.stringify({assertions,conditions:500,oldFalseMissing,maxOldDnlError,chapters,inlineBlocks:blocks},null,2));
