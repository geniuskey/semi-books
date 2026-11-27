// resist.html 새 시뮬레이터(sim-spin, sim-pc, sim-peb)의 모델 블록과 본문·노트·퀴즈가 인용한 숫자 회귀 검사. Node 전용.
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),path=require('node:path');
const html=fs.readFileSync(path.join(__dirname,'..','chapters','resist.html'),'utf8');
const block=id=>{const a=html.indexOf(`/* model:${id} */`),b=html.indexOf(`/* /model:${id} */`);assert(a>0&&b>a,`model block ${id}`);return html.slice(a,b);};
const run=src=>{const c={Math};vm.createContext(c);vm.runInContext(src,c);return c;};
const near=(v,t,tol,msg)=>assert(Math.abs(v-t)<=tol,`${msg}: ${v} vs ${t}`);
const {SPIN}=run(block('sim-spin')),{PC}=run(block('sim-pc')),{PEB}=run(block('sim-peb'));

// 1) sim-spin의 전달 행렬은 sim-sw의 field()와 같아야 한다
const sa=html.indexOf('/* ---------------- 정재파 · 스윙 */'),sb=html.indexOf('var cvEl = document.getElementById("sw-cv")',sa);
const sw=run(html.slice(html.indexOf('var IDX',sa),sb)).field;
for(const lam of [193,248])for(const d of [50,123,180,377])for(const b of [0,31,80,100]){
 const x=sw(lam,d,b),y=SPIN.field(lam,d,b);assert.equal(x.absorbed,y.absorbed);assert.equal(x.R,y.R);}
// BARC 기본 두께는 1~120 nm에서 반사가 가장 작은 곳(±1 nm)
for(const lam of [193,248]){let best=[9,0];for(let b=1;b<=120;b+=0.5){const R=SPIN.field(lam,150,b).R;if(R<best[0])best=[R,b];}near(best[1],SPIN.BARC[lam],1,'BARC opt '+lam);}
near(SPIN.thick(3000,150),150,1e-12,'t ref');near(SPIN.thick(1500,150)/SPIN.thick(4000,150),Math.sqrt(4000/1500),1e-12,'t ∝ ω^-1/2');
let s=SPIN.state(3000,150,193,false);
near(s.slope,-3.28,0.05,'slope');near(s.dv,6.56,0.06,'dose ±2nm');assert.equal(s.risk,2);
assert.equal(s.near.type,'min');near(s.near.t,163,0.5,'min 163');near(Math.round(s.near.rpm/10)*10,2540,0.1,'2540 rpm');
s=SPIN.state(2540,150,193,false);near(s.t,163,0.5,'t at 2540');assert.equal(s.risk,0);
const mx=SPIN.info(193,false).ex.find(e=>e.type==='max'&&Math.abs(e.t-133)<1);assert(mx,'max 133');near(Math.round(SPIN.rpmFor(mx.t,150)/10)*10,3810,0.1,'3810 rpm');
near(SPIN.info(193,true).smax,0.13,0.005,'BARC smax');assert(SPIN.state(3000,150,193,true).flat&&SPIN.state(3000,150,248,true).flat);
near(248/(2*1.76),70,0.5,'KrF period');near(3000*(150/163)**2,2540,5,'quiz rpm');
// 범위 끝에서도 유한
for(const r of [1000,5000])for(const t of [90,150,230])for(const l of [193,248])for(const b of [false,true]){const q=SPIN.state(r,t,l,b);assert(isFinite(q.t)&&isFinite(q.slope)&&isFinite(q.dv));if(q.near)assert(isFinite(q.near.rpm));}

// 2) sim-pc: Tanaka σ = 6γcosθ/S·(H/W)², AR_c = √(σ_c S/6γcosθ)
const pc=o=>PC.state(Object.assign({liq:'water',th:60,W:50,S:50,H:120,sc:40},o));
s=pc({});near(s.ar,2.4,1e-12,'AR');near(s.sig,24.9,0.05,'σ');near(s.arc,3.04,0.005,'ARc');near(s.defl,1.8,0.05,'δ');assert(!s.collapse);
near(6*0.072*0.5/50e-9*2.4**2/1e6,s.sig,1e-9,'SI units');
assert(!pc({H:152}).collapse&&pc({H:154}).collapse);near(pc({H:154}).ar,3.08,1e-9,'AR 154');
s=pc({W:32,S:32});near(s.arc,2.43,0.005,'ARc 32');assert(s.collapse);assert(!pc({W:32,S:32,H:76}).collapse&&pc({W:32,S:32,H:78}).collapse);
near(pc({liq:'surf'}).arc,4.71,0.005,'surf');near(pc({liq:'ipa',th:0}).arc,3.89,0.005,'ipa');near(pc({th:0}).arc,2.15,0.005,'θ0');assert(pc({th:0}).collapse);
assert.equal(pc({liq:'sco2'}).sig,0);assert.equal(pc({liq:'sco2'}).arc,Infinity);assert.equal(pc({th:90}).sig,0);

// 3) sim-peb
const ps=(T,Ea=1.25,E=30,t=60)=>PEB.state(T,Ea,E,t);
s=ps(110);near(s.cd,50,1e-6,'CD ref');near(s.slope,-2.73,0.01,'dCD/dT');near(s.u,0.27,0.005,'±0.1°C');near(s.cd1,47.4,0.05,'T+1');
const w=PEB.window(1.25,30,60);near(w.lo,108.3,0.05,'win lo');near(w.hi,112.0,0.05,'win hi');assert(w.hi-w.lo<4);
near(ps(113).cd,42.8,0.05,'113');assert(!ps(113).ok&&ps(112).ok);
near(ps(110,0.95).slope,-2.0,0.05,'0.95 eV');near(ps(110,1.5).slope,-3.3,0.05,'1.5 eV');
near(ps(110,1.25,30,90).cd,40.35,0.01,'90 s');
let lo=100,hi=125;for(let i=0;i<50;i++){const m=(lo+hi)/2;if(PEB.cd(m,1.25,30,60)>40.35)lo=m;else hi=m;}near(lo-110,4,0.3,'90 s ≈ +4 °C');
const k=Ea=>Math.exp(Ea/8.617333e-5*(1/383.15-1/384.15))-1;near(k(1.25),0.10,0.01,'10 %/°C');near(1.25/0.043364,29,0.5,'kcal/mol');
assert(ps(90).closed&&ps(130).gone);
for(const T of [90,110,130])for(const Ea of [0.6,1.6])for(const E of [20,45])for(const t of [40,90]){const q=ps(T,Ea,E,t),v=PEB.window(Ea,E,t);assert(isFinite(q.cd)&&isFinite(q.slope)&&!isNaN(v.lo)&&!isNaN(v.hi));}
// 단조성: CD는 온도가 오르면 줄어든다
let prev=1e9;for(let T=90;T<=130;T+=0.5){const c=PEB.cd(T,1.25,30,60);assert(c<=prev+1e-9);prev=c;}
console.log({spin:'ok',pc:'ok',peb:'ok',slope:ps(110).slope.toFixed(3),window:[w.lo.toFixed(2),w.hi.toFixed(2)]});
