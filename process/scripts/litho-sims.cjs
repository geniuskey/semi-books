// Node-only regression for chapters/litho.html: runs each `/* model:sim-… */` block in node:vm and
// checks textbook anchors plus every number the prose, notes and quiz quote for the new simulators.
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),path=require('node:path');
const html=fs.readFileSync(path.join(__dirname,'..','chapters','litho.html'),'utf8');
function model(id,name){
 const a=html.indexOf(`/* model:${id} */`),b=html.indexOf(`/* /model:${id} */`);
 assert(a>0&&b>a,`model block ${id} not found`);
 const c={Math,Float64Array};vm.createContext(c);vm.runInContext(html.slice(a,b),c);
 assert(c[name],`${id} defines ${name}`);return c[name];
}
const near=(v,x,tol,msg)=>assert(Math.abs(v-x)<=tol,`${msg}: ${v} vs ${x}`);
const says=(s)=>assert(html.includes(s),`chapter text should contain: ${s}`);
const r1=v=>v.toFixed(1),r0=v=>String(Math.round(v)),r2=v=>v.toFixed(2);

// ---- sim-tput
{
 const T=model('sim-tput','TPUT'),A=T.TOOLS.arfi,E=T.TOOLS.euv,H=T.TOOLS.hna;
 const f33=T.fields(26,33),f16=T.fields(26,16.5);
 assert.deepEqual([f33.n,f33.full,f33.part],[96,58,38]);assert.equal(f16.n,186);
 says('96 → 186개');
 // independent field count for one offset: every listed field touches the 147 mm disk, none is missing
 for(const q of f33.list){const px=Math.max(q.x0,Math.min(0,q.x1)),py=Math.max(q.y0,Math.min(0,q.y1));assert(Math.hypot(px,py)<147);}
 const arf=T.calc(A,30,90,55,2.5),arf80=T.calc(A,80,90,55,2.5),arf100=T.calc(A,100,90,55,2.5);
 assert(arf.stage&&arf80.stage&&!arf100.stage);near(arf.wph,arf80.wph,1e-9,'ArF flat below the knee');
 assert.equal(r0(arf.wph),'290');assert.equal(r0(arf.Dk),'87');says('10 → 80 mJ/cm²로 바꿔도 처리량은 약 290장');says('87 mJ/cm²까지는');
 const e30=T.calc(E,30,300,70,4),e60=T.calc(E,60,300,70,4),e600=T.calc(E,30,600,70,4);
 assert(!e30.stage&&!e60.stage);assert.equal(r0(e30.wph),'163');assert.equal(r0(e60.wph),'108');assert.equal(r0(e600.wph),'220');
 assert.equal(r0((e600.wph/e30.wph-1)*100),'35');assert.equal(r0((1-e60.wph/e30.wph)*100),'34');
 says('163 → 108장');says('220장(+35 %)');says('163 → 108장(약 −34 %)');
 // dose formula D = P/(W v): exposure-limited speed reproduces the dose
 near(e30.Pw/(26*e30.v)/1e-5,30,1e-9,'D = P/(Wv)');near(e30.Pw,2.31,1e-9,'P_wafer 300 W');says('300 W → 2.3 W');says('투과율 0.77 %');
 const h30=T.calc(H,30,300,45,4),h70=T.calc(H,30,300,70,4);assert.equal(h30.n,186);assert.equal(r0(h70.wph),'126');says('126장으로 떨어진다');
 // public-spec anchors (approx.): ArF immersion 275–295 WPH, EUV 160–220 WPH at 30 mJ/cm²
 assert(arf.wph>=275&&arf.wph<=300&&e30.wph>=150&&e30.wph<=170&&e600.wph<=225);
 const pe=T.photons(13.5,30),pa=T.photons(193,30);
 assert.equal(r1(pe),'20.4');assert.equal(r0(pa/10)+'0','290');assert.equal(r0(pe*100/10)+'0','2040');assert.equal(r1(100/Math.sqrt(pe*100)),'2.2');
 const eV=l=>1239.841984/l;assert.equal(r1(eV(13.5)),'91.8');assert.equal(r1(eV(193)),'6.4');assert.equal(r0(193/13.5),'14');
 says('91.8 eV 대 6.4 eV');says('약 2040개');says('약 2.2 %');
 // robustness: every slider corner is finite
 for(const t of [A,E,H])for(const D of [10,100])for(const P of [t.P[0],t.P[1]])for(const s of [20,150])for(const x of [1,10]){const r=T.calc(t,D,P,s,x);assert(Number.isFinite(r.wph)&&r.wph>0&&Number.isFinite(r.v));}
}
// ---- sim-knobs
{
 const K=model('sim-knobs','KNOBS');
 const hp=K.hp(0.27,193,1.35),dof=K.dofPar(1,193,1.35),naE=0.27*13.5/hp,dE=K.iso(0.27,1,13.5,hp);
 assert.equal(r1(hp),'38.6');assert.equal(r0(dof),'106');assert.equal(naE.toFixed(3),'0.094');assert.equal(r0(dE),'1514');assert.equal(r0(dE/dof),'14');
 says('하프 피치 38.6 nm, 근축 DOF 106 nm');says('NA 0.094면 되고 DOF가 14배(약 1514 nm)');
 near(K.iso(0.27,1,193,hp),dof,1e-9,'iso line passes through the point');
 assert.equal(r0(K.hp(0.27,193,0.93)),'56');says('하프 피치가 56 nm로');
 assert.equal(r0(K.dofPar(1,193,0.93)),'223');assert.equal(r0(K.dofNP(1,193,0.93,1)),'153');says('근축 DOF 223 nm와 비근축 DOF 153 nm');
 const he=K.hp(0.36,13.5,0.33);assert.equal(r1(he),'14.7');assert.equal(r1(hp/he),'2.6');assert(Math.abs(K.dofPar(1,13.5,0.33)-120)<5);
 says('38.6 nm에서 14.7 nm로 2.6배');
 // table consistency (하프 피치 column) and chapter DOF anchors
 const want={g:[700,850],i:[330,380],krf:[120,140],arf:[60,70],arfi:[36,40],euv:[13,16.5],hna:[8,10]};
 for(const g of K.GEN){const v=K.hp(g.k1,g.wl,g.NA);assert(v>=want[g.key][0]&&v<=want[g.key][1],`${g.key} HP ${v}`);}
 assert(Math.abs(K.dofNP(1,193,1.35,1.44)-100)<5&&Math.abs(K.dofNP(1,13.5,0.55,1)-43)<3);
 assert.equal(K.naMax('arf',true),1.35);assert.equal(K.naMax('arf',false),0.93);assert.equal(K.naMax('euv',true),0.55);
 assert.equal(K.nearest(38.6).key,'arfi');assert.equal(K.nearest(800).key,'g');
}
// ---- sim-imm
{
 const I=model('sim-imm','IMM');
 const air=I.calc(1.35,'air'),w=I.calc(1.35,'water'),w2=I.calc(1.42,'water'),hif=I.calc(1.5,'hif'),dry=I.calc(0.93,'air');
 assert(air.tir&&!w.tir&&!hif.tir&&!dry.tir);assert.equal(r1(air.crit),'39.9');says('임계각은 39.9°');
 assert.equal(r1(w.tm),'70.0');assert.equal(r1(w.tr),'52.6');says('물속 70.0°');says('감광막 안 52.6°');
 assert.equal(r0(w2.tm),'81');says('NA 1.42에서는 물속 각도가 81°');
 assert.equal(hif.naMax,1.56);assert.equal(hif.limBy,'유리');assert.equal(w.naMax,1.437);
 assert.equal(r0(w.lam),'134');assert.equal(r2(1.35/1.437),'0.94');says('\\(\\sin\\theta\\) = 0.94');
 assert(Math.round(dry.tm)===68&&Math.round(w.tm)===70);says('68~70°');
 // Snell invariance n·sinθ = NA in every layer
 for(const k of ['air','water','hif'])for(const na of [0.5,0.9,0.99]){const c=I.calc(na,k);for(const [n,t] of [[I.NG,c.tg],[c.nm,c.tm],[I.NR,c.tr]])near(n*Math.sin(t*Math.PI/180),na,1e-12,'Snell');}
}
// ---- sim-mlm
{
 const M=model('sim-mlm','MLM'),o=(x)=>Object.assign({d:6.95,g:0.4,th:6,sig:0},x);
 const pk=(x,N)=>M.peak(M.column(M.table(o(x),N),N));
 // independent Parratt implementation (complex objects, layer list) as a cross-check
 const C=(re,im)=>({re,im}),add=(a,b)=>C(a.re+b.re,a.im+b.im),sub=(a,b)=>C(a.re-b.re,a.im-b.im),mul=(a,b)=>C(a.re*b.re-a.im*b.im,a.re*b.im+a.im*b.re);
 const div=(a,b)=>{const d=b.re*b.re+b.im*b.im;return C((a.re*b.re+a.im*b.im)/d,(a.im*b.re-a.re*b.im)/d);},cexp=a=>{const e=Math.exp(a.re);return C(e*Math.cos(a.im),e*Math.sin(a.im));};
 const csqrt=a=>{const r=Math.hypot(a.re,a.im);return C(Math.sqrt((r+a.re)/2),Math.sign(a.im||1)*Math.sqrt(Math.max(0,(r-a.re)/2)));};
 function ref(lam,p){const MO=C(.9238,.0064),SI=C(.999,.0018),s2=Math.sin(p.th*Math.PI/180)**2,k0=2*Math.PI/lam,L=[{n:C(1,0),d:0}];
  for(let i=0;i<p.N;i++){L.push({n:SI,d:(1-p.g)*p.d});L.push({n:MO,d:p.g*p.d});}L.push({n:SI,d:0});
  const kz=L.map(l=>mul(C(k0,0),csqrt(sub(mul(l.n,l.n),C(s2,0)))));let out=0;
  for(const pol of ['s','p']){let G=C(0,0);for(let j=L.length-2;j>=0;j--){let num,den;
   if(pol==='s'){num=sub(kz[j],kz[j+1]);den=add(kz[j],kz[j+1]);}else{const a=mul(mul(L[j+1].n,L[j+1].n),kz[j]),b=mul(mul(L[j].n,L[j].n),kz[j+1]);num=sub(a,b);den=add(a,b);}
   let r=div(num,den);if(p.sig)r=mul(r,cexp(mul(C(-2*p.sig*p.sig,0),mul(kz[j],kz[j+1]))));
   const t=mul(G,j+1<L.length-1?cexp(mul(C(0,2*L[j+1].d),kz[j+1])):C(0,0));G=div(add(r,t),add(C(1,0),mul(r,t)));}
   out+=(G.re*G.re+G.im*G.im)/2;}return out;}
 for(const [lam,x,N] of [[13.5,{},40],[13.2,{th:15,sig:.5},20],[13.9,{g:.3,d:7.3},7]])near(M.Rall(lam,o(x),N)[N],ref(lam,Object.assign(o(x),{N})),1e-12,'Parratt cross-check');
 const d=pk({},40);assert.equal(r1(d.Rp*100),'72.9');assert.equal(r2(d.lp),'13.50');assert.equal(r2(d.fwhm),'0.71');
 says('최대 반사율은 72.9 %, 반치폭은 0.71 nm');says('13.50 nm에 맞춘');
 const sweep=[10,20,40,60].map(N=>r1(pk({},N).Rp*100));says(`${sweep[0]} → ${sweep[1]} → ${sweep[2]} → ${sweep[3]} %로 포화`);
 assert.equal(r1(pk({th:15},40).lp),'13.1');says('최대 파장이 13.1 nm로');
 assert.equal(r1(pk({sig:.5},40).Rp*100),'69.8');says('최대 반사율이 69.8 %로');
 const ideal=pk({th:0},60).Rp;assert(ideal>0.72&&ideal<0.75,'ideal Mo/Si peak 72–75 %');
 // single vacuum/Mo interface reflectivity < 0.2 %; plain Bragg period is 2–3 % short
 const n=.9238,k=.0064;assert(((1-n)**2+k*k)/((1+n)**2+k*k)<0.002);
 const plain=13.5/(2*Math.cos(6*Math.PI/180));assert(6.95/plain>1.02&&6.95/plain<1.03);
 let lo=6.8,hi=7.1;for(let i=0;i<30;i++){const m=(lo+hi)/2;if(pk({d:m,th:0},40).lp<13.5)lo=m;else hi=m;}assert(lo>6.85&&lo<7.0&&lo/6.75>1.02&&lo/6.75<1.03);
 assert.equal(r1(0.7**10*100),'2.8');says('0.7<sup>10</sup> ≈ 2.8 %');
 const rough=pk({sig:1,th:15,g:.3,d:6.5},5);assert(Number.isFinite(rough.Rp));
}
// ---- sim-shadow
{
 const S=model('sim-shadow','SHADOW');
 const a=S.calc(.33,4,6,60,'h'),b=S.calc(.55,4,6,60,'h'),b2=S.calc(.55,4,9.2,60,'h'),c=S.calc(.55,8,5.4,60,'h'),v=S.calc(.33,4,6,60,'v');
 assert.equal(r1(a.alpha),'4.7');assert.equal(r1(a.req),'6.0');assert(a.req<=6&&c.req<=5.355);assert(!a.overlap&&!a.tight);assert.equal(r1(a.shMask),'6.3');assert.equal(r2(a.shWafer),'1.58');
 says('마스크에서 6.3 nm, 웨이퍼에서 1.58 nm');
 assert.equal(r1(b.alpha),'7.9');assert(b.overlap);assert.equal(r1(b.req),'9.2');assert(!b2.overlap&&!b2.tight);
 assert.equal(r2(b2.shWafer),'2.43');assert.equal(r1(b2.hp),'9.8');assert.equal(r0(b2.frac*100),'25');says('2.43 nm, 하프 피치(k₁ 0.4 기준 9.8 nm)의 약 25 %');
 assert.equal(r1(c.alpha),'3.9');assert(!c.overlap&&!c.tight);assert.equal(r2(c.shWafer),'0.71');assert.equal(c.field[1],16.5);says('그림자는 0.71 nm로');
 assert.equal(v.shWafer,0);assert.equal(S.calc(.25,8,3,40,'h').overlap,false);assert(S.calc(.6,4,3,80,'h').overlap);
}
console.log('litho-sims: ok (tput, knobs, imm, mlm, shadow)');
