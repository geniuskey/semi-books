/* Copyright (c) 2026 SoCBook contributors. MIT.
 * node tools/factcheck-regression.cjs
 * Regressions for SOC-05/18/19 using live simulator functions.
 */
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'..');const read=f=>fs.readFileSync(path.join(root,f),'utf8');
const near=(a,b,tol,msg)=>assert.ok(Math.abs(a-b)<=tol,`${msg}: ${a} vs ${b}`);
function block(s,name){const start=s.indexOf(`function ${name}(`);assert.ok(start>=0,name);const brace=s.indexOf('{',start);let depth=1,end=brace+1;for(;depth&&end<s.length;end++){if(s[end]==='{')depth++;if(s[end]==='}')depth--;}return s.slice(start,end);}
for(const file of fs.readdirSync(path.join(root,'chapters')).filter(f=>f.endsWith('.html'))){for(const m of read(`chapters/${file}`).matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)){if(/type=["']application\/ld\+json["']/i.test(m[0]))JSON.parse(m[1]);else new vm.Script(m[1],{filename:file});}}
const c=vm.createContext({SB:{clamp:(x,a,b)=>Math.max(a,Math.min(b,x))}});
const rngLine=read('js/common.js').split('\n').find(s=>s.includes('SB.rng = function'));
vm.runInContext(rngLine,c);
const dram=read('chapters/dram.html');
c.RFC=[130,210,280,280,380,380];vm.runInContext(block(dram,'mult')+block(dram,'ov'),c);
for(let i=0;i<6;i++)for(const T of [45,85,90,95,100,105]){
 const refi=3906/(T>95?4:T>85?2:1),pbCommand=refi/16;
 const independentPbBusy=(c.RFC[i]/2/pbCommand)/16;
 near(c.ov(i,T,'pb'),independentPbBusy,1e-12,'per-bank request blocking');near(c.ov(i,T,'pb')/c.ov(i,T,'ab'),.5,1e-12,'refresh ratio');
}
near(c.ov(3,45,'pb')*100,3.58423,.00001,'16Gb per-bank percent');
// Systolic arrays: independent PE recurrence, output dot products, and first/final cycles.
const npu=read('chapters/npu.html').slice(read('chapters/npu.html').indexOf('/* ---------------------------------------------------------------- 3. 시스톨릭 배열 */'));
vm.runInContext('var S,L,flow,seed=3,A,W,C,rowsA,colsA,t;'+block(npu,'gen')+block(npu,'total')+block(npu,'exact')+block(npu,'stateAt'),c);
let cases=0,steps=0;
for(const flow of ['ws','os'])for(let S=2;S<=8;S++)for(let L=1;L<=16;L++){
 Object.assign(c,{flow,S,L});c.gen();let first=0,last=0,prev=c.stateAt(0);const need=flow==='ws'?L*S:S*S;
 for(let tt=1;tt<=c.total();tt++){
  const q=c.stateAt(tt);if(!first&&Object.keys(q.outs).length)first=tt;if(!last&&Object.keys(q.outs).length===need)last=tt;
  for(let r=0;r<S;r++)for(let col=0;col<S;col++){
   const p=q.pe[r][col];
   if(flow==='ws'&&p.act){const before=r===0?0:prev.pe[r-1][col].ps;assert.notEqual(before,null);assert.equal(p.ps,before+p.a*c.W[r][col]);}
   if(flow==='os')assert.equal(p.acc,prev.pe[r][col].acc+(p.act?p.a*p.b:0));
  }
  for(const [key,value]of Object.entries(q.outs)){
   const [row,col]=key.split(',').map(Number);let dot=0;for(let k=0;k<(flow==='ws'?S:L);k++)dot+=c.A[row][k]*c.W[k][col];assert.equal(value,dot);
  }
  prev=q;steps++;
 }
 assert.equal(prev.macs,L*S*S);assert.equal(first,flow==='ws'?S:L);assert.equal(last,c.total());
 assert.ok(Object.keys(c.stateAt(c.total()-1).outs).length<need,'no idle final cycle');cases++;
}
// Droop dynamics stay the same; actual voltage/frequency now determine safety in both modes.
const thermal=read('chapters/thermal.html').slice(read('chapters/thermal.html').indexOf('/* ---------------------------------------------------------------- 13-8 드룹 */'));
vm.runInContext('var VR=.8,Rser=.003,Resr=.004,VMIN=.72,I0=1,T0=20,TT=300,VTHd=.3;'+block(thermal,'fOf')+block(thermal,'sim'),c);
let droopCases=0;
for(const dI of [.5,4,6])for(const tr of [.5,2,80])for(const Lp of [10,100,400])for(const Cn of [20,150,800])for(const ac of [false,true]){
 Object.assign(c,{dI,tr,Lp,Cn,ac});const r=c.sim();assert.ok(Number.isFinite(r.minV)&&r.viol>=0&&r.fmin>=.4);
 // Each saved violating sample is necessarily covered by the full-step violation count.
 if(r.out.some(p=>p[3]>c.fOf(p[1])/c.fOf(.72)+1e-12))assert.ok(r.viol>0);
 if(!ac&&r.minV>=.72)near(r.viol,0,1e-20,'safe fixed clock');droopCases++;
}
Object.assign(c,{dI:6,tr:.5,Lp:400,Cn:20,ac:true});const extreme=c.sim();
near(extreme.minV,.4082836,1e-6,'extreme droop unchanged');near(extreme.fmin,.4,1e-12,'40% frequency floor');near(extreme.viol*1e9,2.42,.015,'adaptive protection exceeded');
vm.runInContext(block(thermal,'sim').replace('dt = 0.01e-9','dt = 0.005e-9').replace('function sim(', 'function simFine('),c);const fine=c.simFine();
near(fine.viol*1e9,extreme.viol*1e9,.03,'time-step refinement');
Object.assign(c,{dI:.5,tr:80,Lp:10,Cn:800,ac:true});near(c.sim().viol,0,1e-20,'safe adaptive scenario');
console.log(JSON.stringify({passed:true,systolicCases:cases,systolicSteps:steps,refreshConditions:36,droopCases,extremeMinV:extreme.minV,adaptiveViolationNs:extreme.viol*1e9,refinedViolationNs:fine.viol*1e9},null,2));
