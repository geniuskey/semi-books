// 7장 박막 증착: 새 시뮬레이터의 모델 블록(/* model:… */)을 장에서 잘라 실행하고, 교과서 기준값과 본문·노트·퀴즈가 인용한 수치를 확인한다.
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),path=require('node:path');
const root=path.resolve(__dirname,'..'),read=f=>fs.readFileSync(path.join(root,f),'utf8');
const html=read('chapters/deposition.html');
const block=id=>{const a=html.indexOf(`/* model:${id} */`),b=html.indexOf(`/* /model:${id} */`);assert(a>0&&b>a,`model block ${id}`);return html.slice(a,b);};
const ctx={window:{},Math,console};vm.createContext(ctx);vm.runInContext(read('js/xsec.js'),ctx);ctx.XS=ctx.window.XS;
const get=(id,name)=>vm.runInContext(block(id)+`;${name}`,ctx);
const LP=get('sim-lpcvd','LP'),HC=get('sim-hc','HC'),SPT=get('sim-sput','SPT'),HDP=get('sim-hdp','HDP');
const near=(v,want,tol,msg)=>assert(Math.abs(v-want)<=tol,`${msg}: ${v} vs ${want}`);
const P=process.argv.includes('--print');
// LPCVD
const flat=LP.run(100,300,620,0,5),ramp=LP.run(100,300,620,10,5),need=LP.rampFor(100,300,620,5,1,30);
const th5=LP.thiele(620,.5),th25=LP.thiele(620,.25),thAtm=LP.thiele(620,.5,760);
const n150=LP.rampFor(150,300,620,5,1,30),q400=LP.rampFor(100,400,620,5,1,30),flat150=LP.run(150,300,620,0,5);
if(P)console.log({flatNu:flat.nu,flatU:flat.util,drop:1-flat.G[99]/flat.G[0],rampNu:ramp.nu,rampU:ramp.util,rampAvg:ramp.avg,need,th5,th25,thAtm,n150,q400,flat150U:flat150.util,ks:LP.ks(620),G0:flat.G[0]});
// SiGe 임계 두께
const xs=[.2,.25,.3,.5];if(P)xs.forEach(x=>console.log('x',x,HC.mb(x),HC.pb(x)));
// 스퍼터
const p3=10**.48,p03=10**-.52,s1=SPT.calc('cu',500,p3,5,2),s2=SPT.calc('cu',500,p03,30,2),s3=SPT.calc('cu',500,p03,5,2),s4=SPT.calc('ti',500,p3,5,2);
if(P)console.log({p3,s1,s2,s3,s4});
// 갭필(XS)
const t0=Date.now();
function hdp(wT,ar,n,d,e,s){const A=HDP.make(wT,ar,(n+1)*d),B=HDP.make(wT,ar,(n+1)*d);for(const _ of HDP.run(A,HDP.single(n,d,s)));for(const _ of HDP.run(B,HDP.steps(n,d,e,s)));return {a:HDP.measure(A),b:HDP.measure(B)};}
const H0=hdp(80,2.5,10,12,11.5,.8);if(P)console.log('hdp default',H0,Date.now()-t0,'ms');
// ---- 기준값과 인용 수치
// LPCVD: 620 °C에서 약 9.7 nm/min, 평탄 ±10.5 %·이용률 19 %·뒤쪽 19 % 느림, +10 °C에서 ±0.9 %, ±1 %에 +9.9 °C, 150장은 못 맞춤(+17.9 °C에서 ±1.05 %), 400 sccm +6.9 °C
near(flat.G[0],9.7,.05,'front rate');near(flat.nu,10.5,.05,'flat nonuniformity');near(flat.util,19.2,.5,'flat utilization');near(1-flat.G[99]/flat.G[0],.19,.005,'front-back drop');
near(ramp.nu,.9,.05,'ramp nonuniformity');assert(need.ok&&need.dT===9.9,'ramp for 1%');assert(!n150.ok&&n150.dT===17.9&&Math.abs(n150.nu-1.05)<.005,'150 wafers');assert(q400.ok&&q400.dT===6.9,'400 sccm');
near(th5.center,.996,.0005,'thiele 5mm');near(th25.center,.992,.0005,'thiele 2.5mm');near(th25.phi,.18,.005,'phi 2.5mm');near(thAtm.phi,6.5,.05,'phi atm');near(thAtm.center,.01,.001,'center atm');
// 소모가 없으면 경사 0이 가장 고르다(검산): 유량을 아주 크게 하면 불균일도 → 0
assert(LP.run(100,1e7,620,0,5).nu<.01,'no depletion');
// SiGe: x=0.3 → MB 6.9·PB 78, x=0.25 → 8.8·122, x=0.2 → 11.7·209, x=0.5 → MB 3.4. 해가 방정식을 만족하는지도 본다
near(HC.mb(.3),6.9,.05,'MB 0.3');near(HC.pb(.3),78,.5,'PB 0.3');near(HC.mb(.25),8.8,.05,'MB 0.25');near(HC.pb(.25),122,.5,'PB 0.25');near(HC.mb(.2),11.7,.05,'MB 0.2');near(HC.pb(.2),209,.5,'PB 0.2');near(HC.mb(.5),3.4,.05,'MB 0.5');
for(const x of [.05,.3,1]){const f=.0418*x,h=HC.mb(x),q=HC.pb(x);near(h,.384*(1-.07)/(4*Math.PI*f*1.28)*(Math.log(h/.384)+1),1e-6*h,'MB root '+x);near(q,.72/1.28*.16/(16*Math.SQRT2*Math.PI*.5431)/(f*f)*Math.log(q/.4),1e-6*q,'PB root '+x);}
assert.equal(HC.judge(.3,10).state,'meta');assert.equal(HC.judge(.3,6).state,'stable');assert.equal(HC.judge(.2,10).state,'stable');assert.equal(HC.judge(.3,100).state,'relaxed');near(HC.judge(.3,100).eq*100,.15,.005,'eq strain');
// 스퍼터: 500 eV 수율, √E 근사, 기본·장거리·저압·Ti 수치
near(SPT.yieldOf('cu',500),2.35,1e-9,'Y Cu');near(SPT.yieldOf('ti',500),.51,1e-9,'Y Ti');assert.equal(SPT.yieldOf('w',30),0);
near(s1.lam,5.1,.05,'lambda');near(s1.fu,.38,.005,'fu');near(s1.bc,.26,.005,'bc');assert(s1.n<.25&&s1.n>.15,'n default');near(s1.rate,639,.5,'rate');near(s1.tm*180/Math.PI,63,.5,'theta max 5cm');
near(s3.fu,.91,.005,'fu low p');near(s3.bc,.27,.005,'bc low p');near(s2.tm*180/Math.PI,18,.5,'theta max 30cm');near(s2.bc,.62,.005,'bc long throw');near(s2.n,11,.5,'n long throw');near(s2.rate,255,.5,'rate long throw');near(s4.rate,208,.5,'rate Ti');
near(SPT.frac(0,s1.ta),Math.sin(s1.ta),2e-3,'isotropic fraction = sin');
// 갭필(XS): 기본값에서 식각 없이 보이드 6144 nm²·62 %·윗면 140 nm, 증착-식각은 폭 8 nm 이음매·99 %·44 nm
assert(!H0.a.seam&&H0.a.voidA===6144&&Math.round(H0.a.fill)===62&&H0.a.top===140,'no-etch default '+JSON.stringify(H0.a));
assert(H0.b.seam&&H0.b.vRow*4===8&&Math.round(H0.b.fill)===99&&H0.b.top===44,'DED default '+JSON.stringify(H0.b));
console.log('deposition sims ok',{lpcvd:need.dT,mb:+HC.mb(.3).toFixed(2),pb:+HC.pb(.3).toFixed(1),sputN:+s2.n.toFixed(1),hdp:[H0.a.voidA,H0.b.vRow*4],ms:Date.now()-t0});
if(P&&process.argv.includes('--more')){for(const c of [[80,2.5,10,12,7,.8],[80,2.5,10,12,11.5,.4],[80,2.5,10,12,0,.8],[80,2.5,6,12,11.5,.8]])console.log(c.join(' '),JSON.stringify(hdp(...c)));}
