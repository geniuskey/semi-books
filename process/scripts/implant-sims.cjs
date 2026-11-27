// Regression for the ion-implant chapter simulators (sim-mass, sim-beam, sim-stop, sim-amorph).
// Runs the pure model blocks (/* model:<id> */ … /* /model:<id> */) from chapters/implant.html in node:vm
// and checks textbook anchors plus every number the prose, notes and quiz quote.
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),path=require('node:path');
const root=path.resolve(__dirname,'..'),read=f=>fs.readFileSync(path.join(root,f),'utf8');
const html=read('chapters/implant.html');
const c={window:{}};vm.createContext(c);vm.runInContext(read('js/xsec.js'),c);c.XS=c.window.XS;
for(const id of ['sim-mass','sim-beam','sim-stop','sim-amorph']){
 const a=html.indexOf(`/* model:${id} */`),b=html.indexOf(`/* /model:${id} */`);
 assert(a>0&&b>a,`model block ${id} not found`);vm.runInContext(html.slice(a,b),c,{filename:id});
}
const {MS,BM,STP,AM,XS}=c;
const near=(v,want,tol,msg)=>assert(Math.abs(v-want)<=tol,`${msg}: ${v} vs ${want}±${tol}`);
const quoted=s=>assert(html.includes(s),`chapter should quote "${s}"`);

// ---- sim-mass: r = √(2mV/nq)/B, R0 = 0.5 m
const V30=30000,src=MS.SRC.bf3,find=t=>src.find(q=>q.t===t);
near(MS.bFor(11.0093,V30),0.1655,0.0003,'11B+ at 30 kV, r=0.5 m');quoted('약 0.165 T');quoted('0.1655 T');
near(MS.bFor(49.0061,V30),0.349,0.0005,'11BF2+ at 30 kV');quoted('약 0.349 T');
near(MS.bFor(10.0129,V30),0.1578,0.00005,'10B+ at 30 kV');quoted('0.1578 T');
near(MS.bFor(11.0093,60000)/MS.bFor(11.0093,V30),Math.SQRT2,1e-12,'B ∝ √V');
near(MS.mqAt(V30,MS.bFor(30.9738/2,V30)),15.4869,1e-9,'P2+ m/q');
near(find('¹⁰B⁺').a/find('¹¹B⁺').a,19.9/80.1,1e-12,'natural 10B/11B');
const pass=(B,w)=>{let tot=0;const r=src.map(q=>{const o=MS.orbit(MS.radius(q.mq,V30,B),w);tot+=q.a*o.T;return{q,o,I:q.a*o.T};});return{r,tot};};
{const {r}=pass(0.1655,0.010);for(const e of r)if(e.q.t==='¹¹B⁺')near(e.o.T,1,1e-9,'11B+ passes');else assert.equal(e.o.T,0,`${e.q.t} blocked at default`);
 const b10=r.find(e=>e.q.t==='¹⁰B⁺').o;assert.equal(b10.end,'tube');near(Math.abs(b10.d)*1000,38,0.6,'10B+ offset at slit plane');quoted('약 38 mm');}
{const {r}=pass(0.1578,0.010);near(r.find(e=>e.q.t==='¹⁰B⁺').o.T,1,1e-9,'10B+ passes at 0.1578 T');assert.equal(r.find(e=>e.q.t==='¹¹B⁺').o.T,0);}
const Bbf2=Math.round(MS.bFor(49.0061,V30)*1e4)/1e4;
const mix=w=>{const {r,tot}=pass(Bbf2,w);return r.find(e=>e.q.t==='¹⁰BF₂⁺').I/tot;};
near(mix(0.010)*100,3,0.5,'10BF2+ share, 10 mm');quoted('슬릿 전류의 3 % 섞이고');
near(mix(0.030)*100,20,0.3,'10BF2+ share, 30 mm');quoted('통째로 지나가 20 %가 된다');
assert.equal(mix(0.008),0,'8 mm slit is clean');quoted('8 mm 이하로 좁히면 깨끗해진다');
assert(mix(0.009)>0,'9 mm leaks');
assert.equal(Math.round(MS.resolving(0.010)),44);quoted('분해능 44');assert.equal(Math.round(MS.resolving(0.030)),21);quoted('분해능 21');
assert.equal(Math.round(11.0093/(11.0093-10.0129)),11);assert(49.0061/(49.0061-48.0097)>49);quoted('분해능이 49를 넘어야');
{const o=MS.orbit(MS.R0,0.01);near(o.d,0,1e-12,'design orbit centred');near(o.T,1,1e-12,'design orbit transmits');}
for(const dl of [-0.004,0.003])near(MS.orbit(MS.R0*(1+dl),0.01).d,(MS.R0+MS.LD)*dl,4e-5,'linear dispersion (R0+L)·δ');
quoted('60 keV로 두 배');quoted('√2배로 오른다');

// ---- sim-beam: t = Φ n q A / I, WPH = 3600/(t + 8 s)
const D0=Math.pow(10,15.3),d0=BM.calc(0.01,D0,1,1,0,30000);
near(BM.AW,706.858,0.001,'300 mm wafer area');
near(d0.t,22.6,0.05,'default time');quoted('한 장에 약 23 s');assert.equal(Math.round(d0.wph),118);quoted('시간당 118장');
const d1=BM.calc(0.001,D0,1,1,0,30000);assert.equal(Math.round(d1.t),226);quoted('226 s');assert.equal(Math.round(d1.wph),15);quoted('15장으로 준다');
assert(BM.wph(0.02,1e13,1)>440&&BM.wph(0.02,1e13,1)<450,'low dose is handling-limited');quoted('이송 한계(450장)');
near(BM.calc(0.01,D0,2,1,0,30000).err,-0.5,1e-12,'2+ counted as 1+');quoted('절반(−50 %)');
near(BM.calc(0.01,D0,2,1,0,30000).E,60,1e-12,'2+ energy doubles');
near(BM.calc(0.01,D0,1,1,0.05,30000).err*100,5.26,0.01,'5 % neutrals');quoted('+5.3 %');
const hot=BM.calc(0.01,D0,1,1,0,200000);near(hot.P,2000,1e-9,'beam power');assert.equal(Math.round(hot.Tw),119);quoted('약 119 °C');assert(hot.Tw>BM.TPR);
assert(d0.Tw<BM.TPR,'default wafer stays below PR limit');
near(BM.iLimit(80000,0)*1000,19.9,0.05,'PR-limited current at 80 kV');

// ---- sim-stop: ZBL nuclear + LSS electronic stopping, N = 5e22 cm^-3
near(STP.kLSS('B')*1e15,0.130,0.0006,'k_LSS B');near(STP.kLSS('P')*1e15,0.175,0.0006,'k_LSS P');near(STP.kLSS('As')*1e15,0.18,0.0015,'k_LSS As');quoted('B 0.13, P 0.175, As 0.18');
near(STP.cross('B',false),13.2,0.1,'B crossover');quoted('교차 에너지(약 13 keV)');quoted('B 약 13 keV');
near(STP.cross('P',false),121,1,'P crossover');
near(STP.cross('As',false),691,2,'As crossover');quoted('약 690 keV');
near(STP.cross('B',true),7.1,0.1,'B crossover, Plummer k');quoted('약 7 keV');
const sr=(sp,E)=>STP.Sn(sp,E)/STP.Se(sp,E,false);
near(1/sr('B',30),2.0,0.05,'B 30 keV: Se ≈ 2 Sn');quoted('전자 저지가 핵 저지의 두 배');
near(STP.integ('B',30,false).nu/30000,0.51,0.005,'B 30 keV nuclear share');quoted('핵 충돌 몫은 51 %');
near(sr('As',30),7.5,0.05,'As 30 keV Sn/Se');quoted('7.5배');
near(STP.integ('As',30,false).nu/30000,0.91,0.005,'As 30 keV nuclear share');quoted('91 %');
assert(sr('B',1)>1,'B at 1 keV is nuclear-dominated');
// integration: midpoint rule in u = √E against a fine reference
for(const [sp,E] of [['B',1],['As',30],['P',3000]]){let R=0;const n=20000,U=Math.sqrt(E*1000);for(let i=0;i<n;i++){const u=(i+.5)/n*U,e=u*u/1000;R+=2*u*U/n/(STP.NSI*(STP.Sn(sp,e)+STP.Se(sp,e,false)));}
 near(STP.integ(sp,E,false).R/(R*1e7),1,0.003,`range integral ${sp} ${E} keV`);}
let lo=9,hi=0,lo2=9,hi2=0;
for(const sp of ['B','P','As']){for(const E of [1,3,10,30]){const q=STP.integ(sp,E,false).Rp/XS.range(sp,E).Rp;lo=Math.min(lo,q);hi=Math.max(hi,q);}
 for(const E of [100,150,200]){const q=STP.integ(sp,E,false).Rp/XS.range(sp,E).Rp;lo2=Math.min(lo2,q);hi2=Math.max(hi2,q);}}
assert(lo>=1.10&&hi<=1.80,`Rp integral/table at ≤30 keV: ${lo}..${hi}`);quoted('10~80 % 깊고');
assert(lo2>=0.93&&hi2<=1.07,`Rp integral/table at 100–200 keV: ${lo2}..${hi2}`);quoted('7 % 안에서 맞는다');

// ---- sim-amorph: Gaussian damage at 0.75 Rp, width ΔRp; amorphous where D > 6e23 eV/cm³ (12 eV/atom)
near(AM.EC/5e22,12,1e-12,'E_c per atom');
const g=AM.analyze('Ge',20,1e15,true);assert.equal(g.x1,0);near(g.x2,26.3,0.3,'Ge 20 keV 1e15 a/c depth');quoted('표면부터 약 26 nm');
near(g.th/1e14,1.31,0.02,'Ge 20 keV threshold');quoted('문턱(약 1.3×10¹⁴)');
assert(g.xe>g.x2&&g.xe-g.x2<8,'EOR band just below a/c');
near(g.nu/20000,0.91,0.01,'Ge 20 keV nuclear share');
const gb=AM.analyze('Ge',20,1.4e14,true);assert(gb.x1>0&&gb.x2>gb.x1,'buried layer near threshold');
for(const E of [1,5,20,100,200])assert.equal(AM.analyze('B',E,1e16,true).th,Infinity,`B ${E} keV never amorphous at RT`);
quoted('10¹⁶을 넣어도 비정질이 되지 않는다');
const bc=AM.analyze('B',20,1e15,false);near(bc.th/1e14,3.7,0.06,'B 20 keV threshold without dynamic annealing');quoted('약 3.7×10¹⁴');
near(STP.integ('B',20,false).nu/1000,11.5,0.05,'B 20 keV nu');quoted('57 %(11.5 keV)');near(STP.integ('B',20,false).nu/20000,0.57,0.005,'B 20 keV share');
for(const E of [20,30]){const t=AM.analyze('BF2',E,1e15,true).th;assert(t>=0.95e15&&t<=1.1e15,`BF2 ${E} keV threshold ${t}`);}quoted('1×10¹⁵ 남짓에서 비정질');
for(const sp of ['As','Ge'])for(const E of [10,20,30,100]){const t=AM.analyze(sp,E,1e15,true).th;assert(t>=0.9e14&&t<=1.8e14,`${sp} ${E} keV threshold ${t}`);}
for(const sp of ['Si','P'])for(const E of [10,20,30]){const t=AM.analyze(sp,E,1e15,true).th;assert(t>=4e14&&t<=6e14,`${sp} ${E} keV threshold ${t}`);}
quoted('실온에서 As·Ge ~10¹⁴ cm⁻², Si·P ~5×10¹⁴');quoted('As 약 10¹⁴, Si 약 5×10¹⁴');
// heavier ions reach the threshold with less dose (same energy)
{const t=sp=>AM.analyze(sp,30,1e15,true).th;assert(t('As')<t('P')&&t('P')<t('BF2')&&t('BF2')<t('B'));}
// dose scaling: threshold is independent of dose, layer grows with dose
{const a=AM.analyze('As',30,3e14,true),b=AM.analyze('As',30,3e15,true);assert(Math.abs(a.th-b.th)<1e-6*a.th&&b.x2>a.x2);}
// Si/Ge ranges sit next to their table neighbours
{const si=AM.rangeOf('Si',30),p=XS.range('P',30),ge=AM.rangeOf('Ge',30),as=XS.range('As',30);
 assert(si.Rp>p.Rp&&si.Rp<1.15*p.Rp,`Si Rp ${si.Rp}`);assert(ge.Rp>as.Rp&&ge.Rp<1.06*as.Rp,`Ge Rp ${ge.Rp}`);}
console.log({implantSims:'ok',B11_30kV:+MS.bFor(11.0093,V30).toFixed(4),crossB:+STP.cross('B',false).toFixed(1),crossAs:Math.round(STP.cross('As',false)),GeTh:g.th.toExponential(2),GeAc:+g.x2.toFixed(1)});
