// Regression for the oxidation chapter's new simulators (sim-flux, sim-recipe, sim-redis, sim-cv).
// Runs the /* model:<id> */ blocks from chapters/oxidation.html in node:vm and checks textbook anchors,
// independent limits (analytic similarity solution, steady-state snowplow, dose conservation) and every number the prose quotes.
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),path=require('node:path');
const root=path.resolve(__dirname,'..'),read=f=>fs.readFileSync(path.join(root,f),'utf8');
const html=read('chapters/oxidation.html'),xsec=read('js/xsec.js');
const block=id=>{const a=html.indexOf(`/* model:${id} */`),b=html.indexOf(`/* /model:${id} */`);assert(a>0&&b>a,`model block ${id}`);return html.slice(a,b);};
function context(patch){const c={window:{},Math,Float64Array};vm.createContext(c);vm.runInContext(xsec,c);c.XS=c.window.XS;if(patch)patch(c.XS);
 for(const id of ['sim-flux','sim-recipe','sim-redis','sim-cv'])vm.runInContext(block(id),c);return c;}
const C=context(),{FLUX,RECIPE,REDIS,CVM,XS}=C;
const near=(a,b,rel,msg)=>assert(Math.abs(a/b-1)<=rel,`${msg}: ${a} vs ${b}`);
const r3=x=>Number(x.toPrecision(3));
const says=s=>assert(html.includes(s),`prose should say: ${s}`);

// ---------- sim-flux: steady-state three fluxes
let fluxCases=0;
for(const amb of ['dry','wet'])for(const T of [800,1000,1200])for(const x of [0.001,0.05,0.3,2])for(const hk of [0.1,1,1000]){
 const f=FLUX.solve(T,amb,x,hk),cs=FLUX.CSTAR[amb];
 const F1=f.h*(cs-f.c0*cs),F2=f.D*(f.c0-f.ci)*cs/(x*1e-4),F3=f.ks*f.ci*cs;
 near(F1,f.F,1e-9,'F1=F');near(F2,f.F,1e-9,'F2=F');near(F3,f.F,1e-9,'F3=F');
 assert(Math.abs(f.share.reduce((a,b)=>a+b)-1)<1e-12);fluxCases++;
}
for(const amb of ['dry','wet'])for(const T of [900,1100])for(const x of [0.01,0.2,1.5]){   // h ≫ k_s → Deal–Grove rate and C_i/C* = 1/(1+2x/A)
 const f=FLUX.solve(T,amb,x,1e9),dg=XS.dealGrove(T,amb,'100');
 near(f.rate,dg.B/(dg.A+2*x)*1000/60,1e-6,'rate = B/(A+2x)');near(f.ci,1/(1+2*x/dg.A),1e-6,'C_i/C*');
}
const fd=FLUX.solve(1000,'dry',0.1,1000),fw=FLUX.solve(1000,'wet',0.1,1000),f2=FLUX.solve(1000,'dry',Math.pow(10,0.3),1000);
assert(fw.D<fd.D,'wet D is not larger than dry D (quiz 3)');near(FLUX.CSTAR.wet/FLUX.CSTAR.dry,577,0.01,'C* ratio');
assert.equal(Math.round(fd.A*1000),233);says('\\(A\\)는 약 233 nm');says('약 116 nm(= A/2)');
assert.equal(r3(f2.ci).toFixed(4),'0.0551');says('0.055 \\(C^*\\)로');assert.equal(Math.round(f2.share[1]*100),94);says('확산이 94 %');
assert.equal(r3(fd.rate),0.402);assert.equal(r3(fw.rate),8.42);says('0.402 → 8.42 nm/분');says('약 580배');
assert(FLUX.solve(1000,'dry',0.001,1000).ci>0.99,'1 nm: C_i ≈ C*');assert(FLUX.solve(1000,'dry',0.1,0.1).share[0]>0.5,'h/k_s = 0.1: gas-limited');

// ---------- sim-recipe: inverse Deal–Grove
let recipeCases=0;
for(const amb of ['dry','wet'])for(const ori of ['100','111'])for(let T=800;T<=1200;T+=50)for(const xt of [0.002,0.05,0.5,2])for(const xi of [0,0.02]){
 const t=RECIPE.time(T,amb,ori,xt,xi),dg=XS.dealGrove(T,amb,ori);
 if(xi>=xt){assert.equal(t,0);continue;}
 near(XS.dgThickness(dg.B,dg.A,t,xi),xt,1e-9,'forward(inverse) = target');
 if(amb==='dry')assert(t>RECIPE.time(T,'wet',ori,xt,xi),'wet is always faster');recipeCases++;
}
near(RECIPE.time(1000,'dry','100',XS.dgThickness(XS.dealGrove(1000,'dry').B,XS.dealGrove(1000,'dry').A,1),0),1,1e-9,'sim-dg 1 h dry');
const dg1=XS.dealGrove(1000,'dry'),wg1=XS.dealGrove(1000,'wet');
assert.equal(Math.round(XS.dgThickness(dg1.B,dg1.A,1)*1000*10)/10,38.5);assert.equal(Math.round(XS.dgThickness(wg1.B,wg1.A,1)*1000),388);
const tR=(x,a)=>RECIPE.time(1000,a,'100',x/1000,0);
assert.equal(r3(tR(Math.pow(10,1.59),'dry')),1.01);assert.equal(Math.round(tR(Math.pow(10,2.59),'wet')*100)/100,1);says('38.9 nm로 두면 1000 °C 건식이 1.01시간, 389 nm로 두면 습식이 1시간');
assert.equal(r3(tR(100,'dry')),3.19);assert.equal(r3(tR(100,'wet')*60),9.97);says('3.19시간');says('9.97분');
assert.equal(RECIPE.advise(tR(100,'dry'),tR(100,'wet')),'dry');assert(tR(100,'wet')<1/6,'wet 100 nm is just under 10 min');
for(const x of [500,Math.pow(10,2.7)]){assert.equal(Math.round(tR(x,'dry')),35);assert.equal(Math.round(tR(x,'wet')*10)/10,1.5);assert.equal(RECIPE.advise(tR(x,'dry'),tR(x,'wet')),'wet');}
says('약 35시간');says('약 1.5시간');near(wg1.B/dg1.B,30.2,0.01,'B wet/dry');says('\\(B\\)가 30배');
for(const x of [5,Math.pow(10,0.7)])assert.equal(Math.round(tR(x,'dry')*60),7);says('약 7분이면');
{let lo=800,hi=1200;for(let i=0;i<60;i++){const m=(lo+hi)/2;if(RECIPE.time(m,'dry','100',Math.pow(10,0.7)/1000,0)>1/6)lo=m;else hi=m;}assert(lo>970&&lo<978,`10-min temperature ${lo}`);says('약 970 °C 아래로');}
assert.equal(RECIPE.advise(RECIPE.time(1000,'dry','100',0.005,0),RECIPE.time(1000,'wet','100',0.005,0)),'cooler');
assert.equal(RECIPE.advise(RECIPE.time(800,'dry','100',2,0),RECIPE.time(800,'wet','100',2,0)),'hotter');
assert.equal(RECIPE.advise(0,0),'done');

// ---------- sim-redis: moving-boundary redistribution
function erfc(x){const t=1/(1+0.5*Math.abs(x));const y=t*Math.exp(-x*x-1.26551223+t*(1.00002368+t*(0.37409196+t*(0.09678418+t*(-0.18628806+t*(0.27886807+t*(-1.13520398+t*(1.48851587+t*(-0.82215223+t*0.17087277)))))))));return x>=0?y:2-y;}
const similarity=(sp,T,B)=>{const m=REDIS.SEG[sp],k=1-1/(0.44*m),D=XS.diffusivity(sp,T)*3.6e11,l=0.22*Math.sqrt(B/D);return 1/(1-k*Math.sqrt(Math.PI)*l*Math.exp(l*l)*erfc(l));};
// (a) pure parabolic growth (A → 0): C_s/C_B is the Grove–Leistiko–Sah similarity value
const par=context(X=>{const dg=X.dealGrove;X.dealGrove=(T,a,o)=>{const c=dg(T,a,o);return {B:c.B,BA:c.B/1e-9,A:1e-9};};});
let simCases=0;
for(const sp of ['B','P'])for(const amb of ['dry','wet'])for(const T of [900,1000,1100]){
 const r=par.REDIS.run(sp,T,1,amb);near(r.cs,similarity(sp,T,XS.dealGrove(T,amb).B),0.004,`similarity ${sp} ${amb} ${T}`);assert(Math.abs(r.bal)<1e-6);simCases++;
}
assert(Math.abs(similarity('B',1000,dg1.B)-0.279)<0.001);says('붕소 0.28)');
// (b) linear growth for t ≫ D/v²: snowplow steady state C_s/C_B = 0.44 m
const lin=context(X=>{X.dealGrove=()=>({B:1e6,BA:1,A:1e6});});
for(const sp of ['B','P'])near(lin.REDIS.run(sp,1000,10,'dry').cs,0.44*REDIS.SEG[sp],0.02,`steady state ${sp}`);
says('0.44m: 0.13과 4.4');
// (c) dose conservation and trends on the real Deal–Grove growth
let balCases=0;
for(const sp of ['B','P'])for(const amb of ['dry','wet'])for(const T of [800,1000,1200])for(const th of [1/6,1,10]){
 const r=REDIS.run(sp,T,th,amb);assert(Math.abs(r.bal)<1e-6,`dose balance ${sp} ${amb} ${T} ${th}: ${r.bal}`);
 assert(Number.isFinite(r.cs)&&r.cs>0&&Number.isFinite(r.depth)&&r.depth>=0);
 if(sp==='B')assert(r.cs<1&&r.oxPct>100,'boron depletes');else assert(r.cs>1&&r.oxPct<100,'phosphorus piles up');
 assert(Math.abs(r.x-XS.dgThickness(XS.dealGrove(T,amb).B,XS.dealGrove(T,amb).A,th))<1e-12&&Math.abs(r.s-0.44*r.x)<1e-12);balCases++;
}
const rd=(sp,a,T,t)=>REDIS.run(sp,T,t,a);
const bd=rd('B','dry',1000,1),pd=rd('P','dry',1000,1),bw=rd('B','wet',1000,1),pw=rd('P','wet',1000,1),b11=rd('B','dry',1100,1);
assert.equal(r3(bd.cs),0.372);assert.equal(Math.round(bd.oxPct),358);says('C<sub>B</sub>의 0.372로');says('3.6배(358 %)');
assert.equal(r3(pd.cs),1.22);assert.equal(Math.round(pd.oxPct),26);says('1.22배로 쌓이고');says('26 %만');
assert.equal(r3(bw.cs),0.148);assert.equal(r3(pw.cs),3.09);says('붕소는 0.148, 인은 3.09배');assert(bw.cs<bd.cs&&pw.cs>pd.cs,'wet redistributes more');
assert.equal(r3(b11.cs),0.448);says('0.448로 회복');assert(b11.cs>bd.cs,'hotter: less boron depletion');
assert(Math.abs(rd('B','dry',1000,10).cs-0.279)<0.02,'10 h approaches the parabolic value');
assert.equal(REDIS.SEG.B,0.3);assert.equal(REDIS.SEG.P,10);

// ---------- sim-cv: high-frequency MOS C–V
const q=1.602176634e-19,ES=11.7*8.8541878128e-14;
const base={NA:1e16,tox:50,Qf:1e11,Qm:0,bts:'u',Dit:0,gate:'np'},mk=o=>CVM.make({...base,...o});
const M=mk({}),I=mk({Qf:0});
near(M.VFB-M.phims,-q*1e11/M.Cox,1e-9,'ΔV_FB = −qQ_f/C_ox');assert.equal(r3(M.VFB-M.phims),-0.232);says('0.232 V 왼쪽');
const Qd=Math.sqrt(2*ES*q*1e16*2*M.phiF),Wm=Math.sqrt(2*ES*2*M.phiF/(q*1e16));
assert(Math.abs(M.VT-(M.phims-q*1e11/M.Cox+2*M.phiF+Qd/M.Cox))<0.01,'V_T vs depletion formula');
near(M.Cmin,1/(1+M.Cox*Wm/ES),0.03,'C_min vs W_max formula');near(M.CFB,1/(1+M.Cox/Math.sqrt(ES*q*1e16/0.025852)),1e-9,'C_FB');
assert.equal(r3(M.VT),0.27);assert.equal(r3(M.Cmin),0.335);assert.equal(r3(M.Cox*1e9),69.1);
const M10=mk({tox:10});assert.equal(r3(M10.VFB-M10.phims),-0.0464);says('0.046 V만');
const Mp=mk({Qm:2e11,bts:'p'}),Mu=mk({Qm:2e11,bts:'u'}),Mn=mk({Qm:2e11,bts:'n'});
assert.equal(r3(Mp.VFB-M.VFB),-0.464);near(Mu.VFB-M.VFB,(Mp.VFB-M.VFB)/2,1e-9,'uniform = half');assert(Math.abs(Mn.VFB-M.VFB)<1e-12,'−BTS: no shift');says('이온 몫이 0.464 V');
const M17=mk({NA:1e17});assert.equal(r3(M17.Cmin),0.595);assert.equal(r3(M17.VT),2.03);says('0.335 → 0.595');says('0.27 → 2.03 V');
near(mk({gate:'pp'}).phims-M.phims,1.12,1e-9,'p+ − n+ poly φ_ms');says('약 1.1 V 커져');
const Md=mk({Dit:1e12});near(Md.VFB-M.VFB,-q*1e12*M.phiF/M.Cox,1e-9,'Q_it(0) shift');
near(M.Cox*0.46/q,1.98e11,0.01,'quiz Q_m');
let cvCases=0;
for(const NA of [1e15,1e16,1e17,1e18])for(const tox of [5,50,100])for(const Dit of [0,1e11,2e12])for(const gate of ['al','np','pp']){
 const m=CVM.make({...base,NA,tox,Dit,gate});let prev=-Infinity;
 for(let psi=-0.5;psi<=2*m.phiF+0.3;psi+=0.01){const v=m.VG(psi);assert(v>prev,'V_G(ψ_s) increasing');prev=v;const cc=m.C(psi);assert(cc>0&&cc<=1);}
 for(const V of [m.VFB,m.VT,m.Vacc])assert(Math.abs(m.VG(m.psiAt(V))-V)<1e-6,'psiAt inverts V_G');
 assert(m.Vacc<=m.VFB+1e-12&&m.VFB<m.VT&&m.Cmin<m.CFB);cvCases++;
}

// ---------- quiz structure
const qs=[...html.matchAll(/<div class="quiz-q">([\s\S]*?)<div class="quiz-exp">/g)];
assert(qs.length>=6,`quiz count ${qs.length}`);for(const m of qs)assert.equal((m[1].match(/data-correct/g)||[]).length,1);
console.log({fluxCases,recipeCases,similarityCases:simCases,doseBalanceCases:balCases,cvCases,quiz:qs.length,
 dry1h:38.5,wet1h:388,dVFB:r3(M.VFB-M.phims),VT:r3(M.VT),Cmin:r3(M.Cmin),boronDry1h:r3(bd.cs),phosDry1h:r3(pd.cs)});
