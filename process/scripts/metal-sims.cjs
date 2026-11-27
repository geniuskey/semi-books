// Regression for the metal chapter's new simulators (sim-ecp, sim-lowk, sim-blech, sim-sav).
// Runs the /* model:<id> */ blocks from chapters/metal.html in node:vm and checks physical anchors and every number the prose quotes.
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),path=require('node:path');
const root=path.resolve(__dirname,'..'),html=fs.readFileSync(path.join(root,'chapters/metal.html'),'utf8');
const block=id=>{const a=html.indexOf(`/* model:${id} */`),b=html.indexOf(`/* /model:${id} */`);assert(a>0&&b>a,`model block ${id}`);return html.slice(a,b);};
const c={Math,Float64Array,Float32Array,Int8Array};vm.createContext(c);
const ma=html.indexOf('  var MET = {'),mb=html.indexOf('  // 같은 축척의 선 단면');assert(ma>0&&mb>ma,'MET/wire block');
vm.runInContext(html.slice(ma,mb),c);
for(const id of ['sim-ecp','sim-lowk','sim-blech','sim-sav'])vm.runInContext(block(id),c);
const {ECP,LOWK,BL,SAV}=vm.runInContext('({ECP,LOWK,BL,SAV})',c);
const says=s=>assert(html.includes(s),`prose should say: ${s}`);
const f3=x=>Number(x.toPrecision(3)),f2=x=>Number(x.toPrecision(2));

// ---------- sim-ecp
assert.equal(f3(ECP.rate(10)),3.68);says('초당 3.68 nm');says('≈ 3.68 nm/s');
assert(Math.abs(ECP.rate(20)/ECP.rate(10)-2)<1e-12,'Faraday: rate ∝ J');
let ecpCases=0;
for(const ar of [1,2,3,4])for(const oh of [0,4,8])for(const add of ['none','s','sa','sal'])for(const J of [2,10,40]){
 const r=ECP.run(ar,oh,add,J);assert(['void','seam','clean'].includes(r.kind));
 assert(Number.isFinite(r.tFill)&&r.tFill>0&&r.tEnd>=r.tFill,`fill time ${ar}/${oh}/${add}/${J}`);
 if(add==='none'||add==='s')assert.equal(r.maxR,1,'no accelerator → ratio 1');
 if(add==='none'&&oh>0)assert.equal(r.kind,'void','conformal + overhang → void');
 if(r.kind==='clean')assert(r.em,'clean fill reaches the top');ecpCases++;
}
assert.equal(ECP.run(2,0,'none',10).kind,'seam','conformal, no overhang → seam');
const d=ECP.run(2,4,'sa',10);assert.equal(d.kind,'clean');assert.equal(f3(d.maxR),9.12);assert.equal(f3(d.tFill),5.44);
says('최대 9.12배');says('5.44 s 만에');says(`필드보다 ${f3(d.bump)} nm 솟는다`);
assert.equal(Math.round(ECP.run(2,4,'none',10).voidA),528);says('528 nm² 보이드');
for(const oh of [0,1,2])assert.equal(ECP.run(2,oh,'s',10).kind,'seam');assert.equal(ECP.run(2,4,'s',10).kind,'void');says('오버행 2 nm까지는 이음매');
const hi=ECP.run(2,4,'sa',40);assert.equal(hi.kind,'void');assert.equal(f3(hi.tFill),1.44);says('1.44 s 만에 입구가 닫혀');
const lo=ECP.run(2,6,'sa',3);assert.equal(lo.kind,'clean');assert.equal(f3(lo.tFill),17.4);says('오버행 6 nm도 17.4 s에');assert.equal(ECP.run(2,6,'sa',10).kind,'void');
{const L=ECP.run(2,4,'sal',10);assert.equal(L.kind,'clean');assert.equal(f3(L.bump),3.42);says('솟음이 3.42 nm로');}

// ---------- sim-lowk
for(const ks of [2.5,3,3.9]){assert(Math.abs(LOWK.k(0,ks)-ks)<1e-12);assert(Math.abs(LOWK.k(1,ks)-1)<1e-12);
 for(let p=0.05;p<1;p+=0.1){const k=LOWK.k(p,ks);assert(Math.abs(p*(1-k)/(1+2*k)+(1-p)*(ks-k)/(ks+2*k))<1e-12,'Bruggeman');}}
const R=c.lineR('cu',20,2,2.5,1),L0=LOWK.calc(0,0,2.5,R),L25=LOWK.calc(0.25,0,2.5,R),L45=LOWK.calc(0.45,0,2.5,R),LA=LOWK.calc(0.25,0.5,2.5,R);
assert.equal(Math.round(L0.dC*100),-22);assert.equal(L0.E,16);says('C′는 SiO₂보다 22 % 작다');
assert.equal(f3(L25.k),2.38);assert.equal(f3(L25.E),7.79);says('k는 2.38로');says('7.79 GPa');
assert.equal(f3(L45.k),1.93);assert.equal(f3(L45.E),3.59);says('k 1.93, E 3.59 GPa');
assert.equal(f3(LA.kLat),1.41);assert.equal(Math.round(LA.dC*100),-54);assert.equal(f3(LA.tau),47.5);assert.equal(f3(LA.tauOx),103);
says('선 사이 k가 1.41');says('C′가 54 % 줄고');says('103 ps에서 47.5 ps');

// ---------- sim-blech
const B=(L,j,jc)=>BL.calc(L,j,jc);
assert(Math.abs(B(30,1,3000).jL-3000)<1e-9,'jL at L_B');
assert.equal(BL.nice(Math.pow(10,1.3)),20);assert.equal(BL.nice(Math.pow(10,0.7)),5);assert.equal(BL.nice(Math.pow(10,2.7)),500);assert.equal(BL.nice(Math.pow(10,0.3)),2);
const b0=B(20,1,3000);assert(b0.immortal);assert.equal(b0.jL,2000);assert.equal(b0.LB,30);says('jL = 2000 A/cm');says('블레흐 길이는 30 µm');
const b1=B(20,2,3000);assert(!b1.immortal);assert.equal(b1.jL,4000);assert.equal(Math.round(b1.life),40);says('jL = 4000 A/cm로 수명이 생긴다(40년)');
assert(B(10,2,3000).immortal);assert.equal(B(10,2,3000).LB,15);assert(!B(100,2,3000).immortal);assert.equal(B(100,2,3000).jL,20000);
assert.equal(f3(B(100,1,3000).life),20.4);says('20.4년');assert.equal(B(20,1,2000).LB,20);says('블레흐 길이가 20 µm로');
assert.equal(Math.round(b0.dSc),90);says('Δσ<sub>c</sub> ≈ 90 MPa');
for(const L of [5,50,500])for(const j of [0.1,1,5]){const q=B(L,j,3000);if(!q.immortal)assert(q.life>10*Math.pow(j,-2),'Blech-corrected life is longer than Black');}

// ---------- sim-sav
assert(Math.abs(SAV.tail(-10,1)-1)<1e-6,"tail(-inf)=1");assert(SAV.tail(1,1)>SAV.tail(2,1)&&SAV.tail(2,1)>SAV.tail(3,1),"tail decreasing");
const q=(Pp,o,cd,s,N)=>SAV.calc(Pp,o,cd,s,N);
const s32=q(32,3,100,false,1e9);assert.equal(f3(s32.sW),9.56);assert(s32.chip<1e-5);assert.equal(f3(s32.life),0.283);says('9.56 nm로');says('0.283배');
const s28=q(28,3,100,false,1e9);assert.equal(f3(s28.sW),7.56);assert.equal(Math.round(s28.chip*100),50);says('7.56 nm로 불량 확률이 50 %');
const s24=q(24,3,100,false,1e9);assert.equal(f3(s24.sW),5.56);assert(s24.chip>0.999);says('5.56 nm로 거의 100 %');
const sS=q(24,3,100,true,1e9);assert.equal(sS.sW,12);assert.equal(sS.chip,0);says('12 nm 아래로');
const s15=q(24,1.5,100,false,1e9);assert.equal(f3(s15.sW),8.33);assert.equal(f2(s15.chip*100),0.007);says('8.33 nm가 남아 불량이 0.007 %');
assert(Math.abs(s32.xN/Math.hypot(1,1/3)-6.1)<0.15,'1/N quantile ≈ 6σ');
for(const Pp of [20,40,80])for(const o of [1,8])for(const cd of [80,140])for(const s of [false,true]){const r=q(Pp,o,cd,s,1e11);assert(Number.isFinite(r.sW)&&r.chip>=0&&r.chip<=1);if(s)assert(r.sW>=Pp/2-1e-9);}
console.log({ecpCases,ecpDefault:{t:f3(d.tFill),ratio:f3(d.maxR),bump:f3(d.bump)},lowk:[f3(L25.k),f3(L25.E)],blech:b0.LB,sav:f3(s32.sW)});
