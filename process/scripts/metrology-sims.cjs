// Regression for the metrology.html simulators sim-sem, sim-ellip, sim-ca and sim-gage:
// runs each /* model:… */ block from the chapter and checks textbook anchors and every number the prose, notes and quiz quote.
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),path=require('node:path');
const root=path.resolve(__dirname,'..'),read=f=>fs.readFileSync(path.join(root,f),'utf8');
const html=read('chapters/metrology.html'),common=read('js/common.js');
const block=n=>{const a=html.indexOf(`/* model:${n} */`),b=html.indexOf(`/* /model:${n} */`);assert(a>0&&b>a,`model block ${n}`);return html.slice(a,b);};
// PB.rng is copied verbatim from common.js so the seeded noise matches the browser.
const PB={clamp:(x,a,b)=>Math.min(b,Math.max(a,x))};new Function('PB',common.match(/PB\.rng = function[^\n]*/)[0])(PB);
// compileFunction keeps the model's locals in a closure (a contextified global makes the SEM loop ~50× slower).
const {SEM,ELL,CA,GAGE}=vm.compileFunction(['sim-sem','sim-ellip','sim-ca','sim-gage'].map(block).join('\n')+'\nreturn {SEM,ELL,CA,GAGE};',['PB'])(PB);
const text=html.replace(/<script>[\s\S]*<\/script>/,'');
const quoted=(s,msg)=>assert(text.includes(s),`text should quote: ${msg||s}`);
const near=(a,b,tol,msg)=>assert(Math.abs(a-b)<=tol,`${msg}: ${a} vs ${b}`);
const f=(v,d)=>v.toFixed(d);

// ---- sim-sem: CD-SEM linescan
const sem=o=>SEM.measure(Object.assign({frames:16,method:'thr',theta:88,lwr:3,shrink:false},o));
const base=sem({});
for(const th of [78,80,84,88,90]){const r=sem({theta:th,method:'fit'});near(r.bias,0,0.1,`model fit is unbiased at ${th}°`);}
// Threshold and max-slope track the foot: bias grows by about H/tanθ when the wall leans (60 nm tall line).
const b88=sem({}).bias,b80=sem({theta:80}).bias;near(b80,60/Math.tan(80*Math.PI/180),0.8,'at 80° the 50 % threshold reads about the bottom CD');assert(b80-b88>5);
assert(sem({theta:80,method:'slope'}).bias>8);
// Precision scales like 1/sqrt(N); LWR noise bias and its correction.
const p1=sem({frames:1}).prec,p64=sem({frames:64}).prec;assert(p1/p64>5&&p1/p64<11,`precision ratio ${p1/p64}`);
const smooth1=sem({frames:1,lwr:0});assert(smooth1.lwrM>1.5&&smooth1.lwrU<0.3);
for(const N of [1,16,64]){const r=sem({frames:N});near(r.lwrU,3,0.35,`unbiased LWR at ${N} frames`);assert(r.lwrM>=r.lwrU);}
near(SEM.shrink(16),1,1e-12,'ArF shrink after one 16-frame measurement');near(SEM.shrink(1e6),3,1e-9,'shrink saturates at 3 nm');
const shr=sem({shrink:true});assert(shr.prec>10*base.prec);
for(const o of [{frames:1,theta:78,lwr:6,method:'slope'},{frames:64,theta:90,lwr:0,method:'fit',shrink:true}]){const r=sem(o);for(const k of ['cd','bias','prec','lwrM','lwrU'])assert(Number.isFinite(r[k]),k);}
quoted(`정밀도가 ${f(p1,2)} → ${f(p64,2)} nm로`);quoted(`측정 CD가 ${f(base.cd,1)} → ${f(sem({theta:80}).cd,1)} nm로`);
quoted(`측정 LWR이 ${f(smooth1.lwrM,1)} nm로`);quoted(`정밀도가 ${f(shr.prec,1)} nm로`);quoted(`위 실험에서는 ${f(smooth1.lwrM,1)} nm가`);
quoted(`바이어스는 +${f(b80,1)} nm다`);quoted('e<sup>−F/'+Math.round(16/Math.log(1.5))+'</sup>');

// ---- sim-ellip: Fresnel/Airy, Si 3.882 − 0.019i at 632.8 nm
const q0=ELL.psiDelta(0,1.457,70),D=ELL.period(1.457,70);
near(D,632.8/(2*Math.sqrt(1.457**2-Math.sin(70*Math.PI/180)**2)),1e-9,'period');near(D,284.16,0.01,'period SiO2 70°');
for(const d of [37,100,211]){const a=ELL.psiDelta(d,1.457,70),b=ELL.psiDelta(d+D,1.457,70);near(a.psi,b.psi,1e-6,'psi periodic');near(a.delta,b.delta,1e-6,'delta periodic');}
near(q0.delta,179.23,0.01,'bare Si delta');near(q0.psi,10.57,0.01,'bare Si psi');
// bare substrate: tanΨ e^{iΔ} must equal the two-interface Fresnel ratio for any film index
near(ELL.psiDelta(0,2.0,70).psi,q0.psi,1e-9,'d = 0 independent of film');
const s70=ELL.dDelta0(1.457,70),s75=ELL.dDelta0(1.457,75);assert(s70.dDelta<-2.5&&s70.dDelta>-3.2);assert(Math.abs(s75.dDelta)>5*Math.abs(s70.dDelta));
const d1=ELL.psiDelta(1,1.457,70);
quoted(`Ψ ${f(q0.psi,2)}°, Δ ${f(q0.delta,2)}°`);quoted(`${f(D,1)} nm마다`);quoted(`100 nm와 ${f(100+D,1)} nm`);
quoted(`Δ는 약 ${f(Math.abs(d1.delta-q0.delta),1)}°`);quoted(`Ψ는 ${f(d1.psi-q0.psi,2)}°밖에`);quoted(`감도가 −${f(Math.abs(s75.dDelta),1)} °/nm`);
quoted(`주기가 ${f(ELL.period(2,70),1)} nm로`);quoted('632.8 / (2 × 1.1135) ≈ 284.2 nm');near(Math.sqrt(1.457**2-Math.sin(70*Math.PI/180)**2),1.1135,5e-5,'quiz root');
quoted('약 75.6°');near(Math.atan(3.882)*180/Math.PI,75.56,0.01,'Si Brewster angle');

// ---- sim-ca: critical area of parallel lines, f ∝ x^-p
for(const [w,s,p,t] of [[20,20,3,'short'],[10,10,3,'open'],[30,60,2.5,'short'],[50,15,4,'open'],[10,10,4,'short']]){
 let num=0;const N=200000,la=Math.log(CA.X0),lb=Math.log(1e6);
 for(let i=0;i<N;i++){const x=Math.exp(la+(i+.5)*(lb-la)/N);num+=CA.frac(x,w,s,t)*CA.f(x,p)*x*(lb-la)/N;}
 near(CA.avg(w,s,p,t),num,2e-4*num+1e-6,`analytic critical area ${w}/${s}/${p}/${t}`);
}
for(const [w,s] of [[20,20],[20,40],[60,25]])near(CA.avg(w,s,3,'short'),100/(s*(w+2*s)),1e-12,'p = 3 closed form x0²/(s(P+s))');
near(CA.avg(10,10,3,'short')/CA.avg(20,20,3,'short'),4,1e-9,'half pitch → 4×');near(CA.peak(20,20,3,'short'),40,1e-12,'most dangerous size 2s');
const ya=CA.yieldOf(1,20,20,3,'short',1).Y,yh=CA.yieldOf(1,10,10,3,'short',1).Y;
quoted(`중 ${f(CA.avg(20,20,3,'short')*100,1)} %만`);quoted(`수율은 ${f(ya*100,1)} %다`);quoted(`수율이 ${f(yh*100,1)} %로`);
quoted(`치명 비율이 ${f(CA.avg(20,40,3,'short')*100,1)} %로`);quoted(`치명 비율이 ${f(CA.avg(20,20,4,'short')*100,1)} %로`);quoted(`수율은 ${f(ya*100,1)} → ${f(yh*100,1)} %다`);

// ---- sim-gage: misclassification by integration vs brute force
const T=GAGE.TOL;
for(const [sm,cpk,off,g] of [[0.2,1.33,0,0],[0.3,1,0.5,0.3],[0.05,2,-1,0],[0.6,0.67,1.5,1],[0,1.33,0,0.2]]){
 const r=GAGE.calc(sm,cpk,off,g);let fr=0,fa=0;const n=200000,lo=r.mu-12*r.sp,hi=r.mu+12*r.sp,h=(hi-lo)/n;
 for(let i=0;i<n;i++){const x=lo+(i+.5)*h,pp=r.pdf(x)*h,a=r.acc(x);if(x>=r.LSL&&x<=r.USL)fr+=pp*(1-a);else fa+=pp*a;}
 near(r.frJ,fr,2e-3*fr+1e-9,'false-reject integral');near(r.faJ,fa,2e-3*fa+1e-10,'false-accept integral');
 near(r.cpkObs,(T-Math.abs(off))/(3*Math.hypot(r.sp,sm)),1e-12,'observed Cpk');
 for(const k of ['FR','FA','cpkObs','PT'])assert(Number.isFinite(r[k]),k);
}
near(GAGE.Phi(-4),3.1671e-5,1e-9,'Phi(-4)');near(GAGE.Q(6),9.8659e-10,1e-13,'Q(6) relative accuracy');
const g=(a,b,c,d)=>GAGE.calc(a,b,c,d),g1=g(.1,1.33,0,0),g3=g(.3,1.33,0,0),gg=g(.3,1.33,0,.3),g20=g(.3,2,0,0);
quoted(`관측 C<sub>pk</sub>가 ${f(g1.cpkObs,2)} → ${f(g3.cpkObs,2)}으로`);quoted(`오판 불합격이 ${Math.round(g1.FR*1e6)} → ${Math.round(g3.FR*1e6)} ppm으로`);
quoted(`오판 합격은 ${Math.round(g3.FA*100)} %나`);quoted(`오판 합격이 ${f(gg.FA*100,1)} %로`);quoted(`오판 불합격이 ${Math.round(gg.FR*1e6)} ppm으로`);
quoted(`관측 C<sub>pk</sub>가 ${f(g20.cpkObs,2)}밖에`);quoted(`관측으로는 ${f(g3.cpkObs,2)}으로`);near(Math.hypot(0.75,0.3),0.81,0.005,'quiz observed sigma');
assert(gg.FA<g3.FA&&gg.FR>g3.FR,'guard band trades false accepts for false rejects');

// the SPC regression marker block must stay unique and untouched by the new code
assert.equal(html.split('      var why = v.map(').length,2);assert.equal(html.split('      var all = v.slice(40)').length,2);
console.log({semPrecision1:+p1.toFixed(3),semPrecision64:+p64.toFixed(3),ellipPeriod:+D.toFixed(2),caKill:+CA.avg(20,20,3,'short').toFixed(4),gageFR30ppm:+(g3.FR*1e6).toFixed(1)});
