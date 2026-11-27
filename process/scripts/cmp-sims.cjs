// Regression for the CMP chapter simulators (sim-kin, sim-zone, sim-sti, sim-pcl).
// Slices each /* model:<id> */ block from chapters/cmp.html, runs it in node:vm and checks
// (a) textbook anchors of the model and (b) every number the prose, notes and quiz quote.
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),path=require('node:path');
const html=fs.readFileSync(path.resolve(__dirname,'../chapters/cmp.html'),'utf8');
function load(id,name){
 const a=html.indexOf(`/* model:${id} */`),b=html.indexOf(`/* /model:${id} */`);
 assert(a>0&&b>a,`model block ${id} not found`);
 const c={Math,Infinity};vm.createContext(c);vm.runInContext(html.slice(a,b)+`;this.__m=${name};`,c);return c.__m;
}
const near=(x,y,tol,msg)=>assert(Math.abs(x-y)<=tol,`${msg}: ${x} vs ${y}`);
const KIN=load('sim-kin','KIN'),ZONE=load('sim-zone','ZONE'),STI=load('sim-sti','STI'),PCL=load('sim-pcl','PCL');
let n=0;const ok=()=>n++;

// ---- sim-kin: relative velocity of pad and carrier
for(const e of [160,180,230])for(const w of [20,90,150]){ // ω_p = ω_c → v = ω_p·e everywhere, WIWNU 0
 const k=KIN.run(w,w,e,3);near(k.wiwnu,0,1e-4,'kin uniform (σ from a variance difference)');near(k.mean,w*Math.PI/30*e/1000,1e-12,'kin v=ω_p e');ok();
 for(const [x,y] of [[0,0],[100,-50],[-140,30]]){const v=KIN.vel(w,w,e,x,y);near(v[0],0,1e-15,'kin vx');near(v[1],w*Math.PI/30*e/1000,1e-12,'kin vy');ok();}
}
near(KIN.rate(1,6894.757/6894.757*1),1e-13*6894.757*6e10,1e-9,'Preston K_p P V');ok();
const k0=KIN.run(90,60,180,3);assert.equal(k0.wiwnu.toFixed(2),'0.55');assert.equal(Math.round(k0.rr),213);assert.equal(Math.round(k0.rrC),211);assert.equal(Math.round(k0.rrE),215);ok();
assert.equal(KIN.run(90,90,180,3).wiwnu.toFixed(2),'0.00');assert.equal(KIN.run(90,30,180,3).wiwnu.toFixed(2),'2.19');
assert.equal(KIN.run(90,0,180,3).wiwnu.toFixed(1),'36.7');assert.equal(KIN.run(93,87,180,3).wiwnu.toFixed(2),'0.02');ok();
const kc=KIN.run(90,-60,180,3);assert.equal(Math.round(kc.rrC),211);assert.equal(Math.round(kc.rrE),332);assert.equal((kc.rrE/kc.rrC).toFixed(1),'1.6');ok();
assert.equal(Math.round(KIN.run(90,90,160,3).rr),187);assert.equal(Math.round(KIN.run(90,90,230,3).rr),269);ok();
assert.equal((90*Math.PI/30*0.18).toFixed(2),'1.70');ok();
for(const wc of [-60,0,1,60,150])for(const e of [160,230]){const k=KIN.run(90,wc,e,6);assert(Number.isFinite(k.wiwnu)&&k.rrE>=k.rrC-1e-9&&k.prof.every(q=>q.lo<=q.v+1e-12&&q.v<=q.hi+1e-12));ok();}

// ---- sim-zone: multi-zone pressure + retaining ring
near(ZONE.C,1e-13*6894.757*1.5*120*1e9,1e-9,'zone nm/psi');assert.equal(Math.round(ZONE.C),124);ok();
{const u=ZONE.profile([3,3,3,3],3.75,'dome');near(u.A,0,1e-12,'neutral ring');assert(u.P.every(p=>Math.abs(p-3)<1e-9),'smoothing keeps a uniform pressure');ok();}
{const u=ZONE.profile([3,3,3,3],3,'dome');assert.equal(u.range.toFixed(1),'58.7');assert.equal(Math.round(u.inSpec*100),49);ok();
 const r5=ZONE.profile([3,3,3,3],5,'dome');assert(r5.A<0&&r5.post[298]>ZONE.TARGET+ZONE.TOL&&u.post[298]<ZONE.TARGET-ZONE.TOL,'ring 3→5 psi: edge goes from over- to under-polished');ok();}
for(const pre of ['dome','bowl','edge']){
 const x=ZONE.fit(pre),snap=x.map(v=>Math.floor(v/0.05+0.5)*0.05);  // range input snaps to the nearest step (ties up)
 const o=ZONE.profile(snap.slice(0,4),snap[4],pre);assert(o.range<11&&o.inSpec>0.999,`fit ${pre}: ${o.range}`);
 // coordinate descent reaches the box-constrained optimum: no single-variable move improves the cost
 const cost=v=>{const q=ZONE.profile(v.slice(0,4),v[4],pre);let s=0;for(let j=0;j<=294;j++){const w=j?q.r[j]:0.0625;s+=w*(q.post[j]-ZONE.TARGET)**2;}return s;};
 const c0=cost(x);for(let i=0;i<5;i++)for(const d of [-0.01,0.01]){const y=x.slice();y[i]=Math.min(i<4?6:8,Math.max(i<4?0.5:1,y[i]+d));assert(cost(y)>=c0-1e-6,`fit ${pre} not optimal in ${i}`);}
 if(pre==='dome'){assert.equal(x.map(v=>v.toFixed(1)).join('/'),'3.2/3.1/2.9/2.8/3.6');assert(Math.round(o.range)===9&&o.wiwnu.toFixed(2)==='0.35',`dome fit ${o.range} ${o.wiwnu}`);}
 ok();
}

// ---- sim-sti: STI CMP stopping on nitride
{ // identical density and trench width in both regions must give identical results
 const a=STI.run('ceria',STI.RHO_D,STI.W_D);assert.equal(a.D.tc,a.S.tc);const o=STI.at(a,20);near(o.stD,o.stE,0.5,'same density, same step');ok();}
const st=(s,r,w,op)=>STI.at(STI.run(s,r,w),op);
{const o=st('ceria',.25,10,20);assert.equal(o.nlD.toFixed(1),'1.9');assert.equal(o.nlS.toFixed(1),'8.4');assert.equal(Math.round(o.dish),31);assert.equal(Math.round(-o.stT),9);assert.equal(o.level,1);
 assert.equal([o.stD,o.stE,o.stT].map(v=>Math.round(v)).join('/'),'28/22/-9');ok();}
{const rn=STI.run('silica',.25,10);assert.equal(Math.round(rn.tEP-rn.S.tc),32);const o=STI.at(rn,20);assert(o.punch&&o.level===2);ok();}
{const o=st('hsc',.25,10,20);assert(o.nlD.toFixed(1)<='0.7'&&o.nlS.toFixed(1)==='0.7'&&o.level===0);ok();}
assert.equal(Math.round(st('ceria',.25,1,20).dish),4);assert.equal(Math.round(st('ceria',.25,100,20).dish),85);ok();
{const o=st('ceria',.6,10,20);assert.equal(o.nlD.toFixed(1),'2.2');assert.equal(o.nlS.toFixed(1),'1.8');assert.equal(o.level,0);ok();}
for(const s of ['silica','ceria','hsc'])for(const r of [.05,.6])for(const w of [.1,100]){const rn=STI.run(s,r,w);assert(rn.tEP*2<=300,'trajectory covers 100 % over-polish');
 let prev=-1;for(let op=0;op<=100;op+=10){const o=STI.at(rn,op);assert([o.dish,o.nlD,o.nlS,o.spread].every(Number.isFinite)&&Number.isFinite(o.stD)===!o.punchD&&Number.isFinite(o.stT)===!o.punchS&&(o.punch?o.level===2:true));assert(o.nlS>=prev-1e-9);prev=o.nlS;}ok();}

// ---- sim-pcl: particle adhesion vs rolling removal
const pc=(g,pH,b,dz)=>({g,pH,brush:!!b,dz:dz*1e-9});
{const q=PCL.forces(50e-9,pc(1e4,2.5,0,0));near(q.fa,0.8e-20*50e-9/(12*0.16e-18),1e-15,'F_a = A d/12z0² at the IEP');near(q.a*1e9,0.677,0.002,'JKR contact radius');ok();}
for(const g of [1e2,1e3,1e4,1e5])near(PCL.dc(pc(10*g,7,0,0))/PCL.dc(pc(g,7,0,0)),Math.pow(10,-0.75),1e-6,'d_c ∝ γ̇^-3/4');ok();
const dcn=o=>PCL.dc(o)*1e9;
assert.equal(Math.round(dcn(pc(1e4,7,0,0))),343);assert.equal((PCL.pre(pc(1e4,7,0,0))*100).toFixed(1),'1.4');assert.equal(Math.round(dcn(pc(1e5,7,0,0))),61);ok();
assert.equal(Math.round(dcn(pc(1e4,7,1,0))),45);assert.equal(Math.round(dcn(pc(1e4,7,1,.2))),20);assert.equal((PCL.pre(pc(1e4,7,1,.2))*100).toFixed(1),'98.2');ok();
assert.equal((PCL.dl(3)*100).toFixed(1),'0.7');assert.equal(Math.round(PCL.dl(10)*100),39);
assert.equal(Math.round(dcn(pc(1e4,3,1,.2))),28);assert.equal(Math.round(dcn(pc(1e4,10,1,.2))),17);ok();
{const q=PCL.forces(50e-9,pc(1e4,7,1,.2)),m=q.mrem/q.madh,f=q.frem/q.fa;assert.equal(m.toFixed(1),'3.4');assert.equal(f.toFixed(3),'0.032');assert(m/f>80&&m/f<125);ok();}
for(const g of [2,6])for(const pH of [2,12])for(const b of [0,1])for(const dz of [0,1]){const o=pc(10**g,pH,b,dz),d=PCL.dc(o);assert(Number.isFinite(d)&&d>0&&Number.isFinite(PCL.pre(o)));ok();}
console.log({cmpSimChecks:n});
