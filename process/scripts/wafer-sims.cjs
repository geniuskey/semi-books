// Regression for the wafer chapter's simulators added in 2026-11 (sim-vg, sim-dz, sim-koh, sim-flat).
// Runs each /* model:<id> */ block of chapters/wafer.html in node:vm and checks textbook anchors plus every number the prose,
// notes and quiz quote. Node only, well under 1 s. PB.erf, PB.rng and PB.kB are taken verbatim from js/common.js.
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),path=require('node:path');
const root=path.resolve(__dirname,'..'),read=f=>fs.readFileSync(path.join(root,f),'utf8');
const html=read('chapters/wafer.html'),common=read('js/common.js');
const text=html.replace(/<[^>]+>/g,'');   // prose without tags (so "C<sub>eq</sub>" etc. do not split numbers)
const PB={};
vm.runInNewContext(common.match(/PB\.erf = function[\s\S]*?\n  \};/)[0]+'\n'+common.match(/PB\.rng = function[^\n]*\n/)[0]+'\n'+common.match(/PB\.kB = [^;]+;/)[0],{PB,Math});
assert(typeof PB.erf==='function'&&typeof PB.rng==='function'&&Math.abs(PB.kB-8.617333e-5)<1e-12,'PB helpers from common.js');
function load(id){
 const a=html.indexOf(`/* model:${id} */`),b=html.indexOf(`/* /model:${id} */`);
 assert(a>0&&b>a,`model block ${id} not found`);
 const ctx={PB,Math};vm.createContext(ctx);vm.runInContext(html.slice(a,b),ctx,{filename:id});return ctx;
}
const near=(x,y,tol,msg)=>assert(Math.abs(x-y)<=tol,`${msg}: ${x} vs ${y}`);
const has=(s,msg)=>assert(text.includes(s),`text should quote "${s}"${msg?' ('+msg+')':''}`);
const out={};

/* ---------- sim-vg: Voronkov v/G */
{
 const m=load('sim-vg');
 near(m.VG_XIT,0.13,1e-12,'xi_t');
 // heat balance v_max = k_s G/(rho dHf): 22·3000/(2330·1.8e6) m/s = 0.944 mm/min, xi_max = k_s/(rho dHf) ≈ 0.31 mm²/(min·K)
 near(m.vgVmax(3),22*3000/(2330*1.8e6)*6e4,1e-12,'vmax formula');near(m.vgVmax(3),0.944,0.001,'vmax(3)');
 near(m.vgVmax(3)/3,0.315,0.001,'xi_max');has('약 0.94 mm/분');
 near(m.vgVmax(1.5),0.472,0.001,'vmax(1.5)');has('0.47 mm/분');assert(0.55>m.vgVmax(1.5));
 // default: ramp 0.55 → 0.25 mm/min, Gc 3 K/mm, kappa 0.15, section at 50 %
 const v=0.55+(0.25-0.55)*0.5;near(v,0.40,1e-12,'v at 50 %');
 const xc=m.vgXi(v,3,0.15,0),xe=m.vgXi(v,3,0.15,1);
 near(xc,0.1333,1e-4,'xi centre');near(xe,0.1159,1e-4,'xi edge');has('0.133 mm²/(min·K)');has('0.116');
 near((xc/m.VG_XIT-1)*100,2.6,0.05,'centre above xi_t %');has('2.6 %');
 assert.equal(m.vgClass(xc),'Pv');assert.equal(m.vgClass(xe),'I');
 const fr=m.vgFree(v,3,0.15);near(fr.r0,0,0,'free r0');near(fr.r,0.78,0.005,'free radius');near(fr.area,0.61,0.005,'free area');
 has('78 %에서 100 %');has('바깥 22 %');near(1-fr.r1,0.22,0.005,'outer I band');
 near(m.vgFree(v,3,0.05).r,1,0,'kappa 0.05 → all defect-free');
 // edge boundary really is where xi = ratio·xi_t
 for(const ratio of [0.94,1,1.04,1.1])for(const kap of [0.05,0.15,0.4]){const s=m.vgEdge(0.42,3,kap,ratio);if(s>0&&s<1)near(m.vgXi(0.42,3,kap,s),ratio*m.VG_XIT,1e-12,'edge root');}
 // along the default ramp the centre goes V → OSF → Pv → Pi → I (the OSF ring closes in on the axis), no class repeats
 const seq=[];for(let i=0;i<=400;i++){const c=m.vgClass(m.vgXi(0.55-0.30*i/400,3,0.15,0));if(seq[seq.length-1]!==c)seq.push(c);}
 assert.deepEqual(seq,['V','OSF','Pv','Pi','I'],'centre sequence '+seq);
 assert.equal(m.vgClass(m.vgXi(0.55,3,0.15,1)),'V','seed end edge is still vacancy-type');
 // kappa = 0 → the whole cross-section is one class
 assert.equal(m.vgEdge(0.40,3,0,1.04),0);assert.equal(m.vgEdge(0.40,3,0,0.94),1);
 // slider extremes stay finite
 for(const v1 of [0.1,0.2,1.2])for(const G of [1.5,5])for(const k of [0,0.4]){const f=m.vgFree(v1,G,k);assert(Number.isFinite(f.r)&&f.r>=0&&f.r<=1);}
 out.vg={vmax3:+m.vgVmax(3).toFixed(3),xiC:+xc.toFixed(4),xiE:+xe.toFixed(4),free:+fr.r.toFixed(3)};
}

/* ---------- sim-dz: oxygen out-diffusion and denuded zone */
{
 const m=load('sim-dz');
 const kT=PB.kB*1373.15;near(kT,0.1183,1e-4,'kT 1100 C');has('kT ≈ 0.118 eV');
 near(m.dzD(1100),6.735e-11,0.01e-11,'D(1100)');has('6.7×10⁻¹¹');
 const L=m.dzL(1100,4),Ceq=m.dzCeq(1100);
 near(L,9.85,0.01,'sqrt(Dt) 1100 C 4 h');has('≈ 9.9 µm');has('9.9×10⁻⁴ cm');
 near(Ceq,2.374e17,0.002e17,'Ceq(1100)');has('2.4×10¹⁷');
 const z=m.dzDepth(7.5e17,Ceq,5e17,L);near(z,9.66,0.01,'DZ default');has('DZ ≈ 9.7 µm');has('약 9.7 µm');
 near(m.dzC(z,7.5e17,Ceq,L),5e17,1e12,'C(zDZ) = threshold');near(m.dzC(0,7.5e17,Ceq,L),Ceq,1,'surface = solubility');
 near(m.dzC(10*L,7.5e17,Ceq,L),7.5e17,1e10,'bulk = C0');
 near(m.dzL(1100,16),19.69,0.01,'sqrt(Dt) 16 h');has('19.7 µm');near(m.dzDepth(7.5e17,Ceq,5e17,m.dzL(1100,16)),19.33,0.01,'DZ 16 h');has('약 19 µm');
 near(m.dzDepth(7.5e17,m.dzCeq(1050),5e17,m.dzL(1050,0.5)),2.69,0.01,'DZ 1050 C 30 min');has('2.7 µm');
 near(m.dzCeq(1200),5.678e17,0.002e17,'Ceq(1200)');has('5.7×10¹⁷');assert.equal(m.dzDepth(7.5e17,m.dzCeq(1200),5e17,m.dzL(1200,4)),0);
 // C_eq reaches the default threshold at about 1185 °C (no DZ above it with a fixed threshold)
 const Tlim=1.52/(PB.kB*Math.log(9e22/5e17))-273.15;near(Tlim,1184.5,0.1,'T where Ceq = 5e17');
 assert.equal(m.dzDepth(7e17,Ceq,8e17,L),Infinity,'threshold above C0 → no BMD');
 for(const y of [0.01,0.3,0.5123,0.9,0.99])near(PB.erf(m.dzErfInv(y)),y,1e-10,'erfinv');
 for(const T of [1050,1250])for(const h of [0.5,16])for(const c0 of [6e17,9e17])for(const th of [3e17,8e17]){const d=m.dzDepth(c0,m.dzCeq(T),th,m.dzL(T,h));assert(!Number.isNaN(d)&&d>=0);}
 out.dz={L:+L.toFixed(2),Ceq:+(Ceq/1e17).toFixed(3),dz:+z.toFixed(2)};
}

/* ---------- sim-koh: KOH anisotropic etch */
{
 const m=load('sim-koh');
 near(m.KOH_TH*180/Math.PI,54.7356,1e-4,'(100)/(111) angle');near(Math.tan(m.KOH_TH),Math.SQRT2,1e-12,'tan 54.74 = sqrt2');
 const S=t=>m.kohShape({ori:'100',W:50,t,sel:200,mask:'nit'});
 near(S(0).selfLimit,35.355,0.001,'0.707 W');has('35.4 µm');
 const tS=S(0).tSelf;near(tS,35.66,0.01,'time to V');has('약 36분');
 const atV=S(tS);near(atV.bot,35.66,0.01,'V depth incl. undercut');assert(atV.vee||Math.abs(atV.half)<1e-9);has('약 35.7 µm');
 assert(!S(tS-0.5).vee&&S(tS+0.5).vee,'V forms at tSelf');
 // after the V forms the tip only creeps with the (111) rate: d(tip)/dt = R111/cos(theta) = sqrt(3)·R111
 near((S(120).bot-S(60).bot)/60,Math.sqrt(3)*(1/200),1e-9,'tip creep rate');
 // undercut doubles when the selectivity halves
 near(m.kohShape({ori:'100',W:50,t:60,sel:100,mask:'nit'}).u/S(60).u,2,1e-12,'undercut ∝ 1/sel');has('언더컷이 두 배');
 // trapezoid geometry: sidewall at 54.74° from the mask edge, bottom width W + 2u − 2d/tan(theta)
 const d25=S(25);near(d25.depth,25,1e-9,'depth 25 min');near(d25.bottom,50+2*d25.u-2*25/Math.SQRT2,1e-9,'bottom width');
 // (110): vertical {111} walls, R110 = 1.5 R100 → 180 µm at 120 min, width ≈ W + 2·R111·t
 const v110=m.kohShape({ori:'110',W:50,t:120,sel:200,mask:'nit'});near(v110.depth,180,1e-9,'(110) depth');near(v110.bottom,51.2,1e-9,'(110) width');has('180 µm');
 assert.equal(v110.selfLimit,Infinity);
 // SiO2 mask: 500 nm at ~7 nm/min → gone at 71.4 min; then the top etches and the groove shallows and disappears
 const ox=t=>m.kohShape({ori:'100',W:50,t,sel:200,mask:'ox'});
 near(ox(0).tGone,71.43,0.01,'mask life');has('약 71분');has('약 7 nm');
 near(ox(25).mask,325,1e-9,'mask left at 25 min');assert(ox(90).depth<ox(70).depth&&ox(90).depth>0,'groove shallows after the mask is gone');assert(ox(120).gone,'groove erased');
 assert.equal(m.kohShape({ori:'100',W:50,t:120,sel:200,mask:'nit'}).mask,100,'nitride survives');
 for(const ori of ['100','110'])for(const W of [10,100])for(const t of [0,120])for(const sel of [100,400])for(const mask of ['ox','nit']){
  const r=m.kohShape({ori,W,t,sel,mask});for(const k of ['depth','bottom','u','mask','top'])assert(Number.isFinite(r[k])&&r[k]>=0,`${k} ${ori}/${W}/${t}/${sel}/${mask}`);
 }
 out.koh={tSelf:+tS.toFixed(2),vDepth:+atV.bot.toFixed(2),tGone:+ox(0).tGone.toFixed(1)};
}

/* ---------- sim-flat: TTV vs SFQR */
{
 const m=load('sim-flat');
 const t0=Date.now(),geo=m.flBuild(PB.rng(7)),S8=m.flSites(geo,26,8),S33=m.flSites(geo,26,33);
 const ms=Date.now()-t0;assert(ms<1500,'flat build '+ms+' ms');
 assert.equal(geo.n,68836);assert.equal(S8.length,331);assert.equal(S33.length,83);
 const ev=(S,a,e,n,b)=>m.flEval(geo,S,a,e,n,b),inner=S=>S.filter(s=>!s.edge&&!s.ok).length;
 // the global shape has PV = slider value exactly; a pure tilt is removed completely by the site plane fit
 near(ev(S8,1,0,0,30).ttv,1000,1e-6,'TTV 1 µm');near(ev(S8,0.1,0,0,30).ttv,100,1e-6,'TTV 0.1');near(ev(S8,3,0,0,30).ttv,3000,1e-6,'TTV 3');has('30배');
 const tilt=Object.assign({},geo,{g:geo.x.map((x,i)=>0.3*x+0.2*geo.y[i]),nt:geo.nt.map(()=>0),e:geo.e.map(()=>0)});
 assert(m.flEval(tilt,S8,1,0,0,30).worst<1e-6,'plane fit removes tilt');
 const w1=ev(S8,1,0,0,30).worst;near(w1,2.3,0.05,'TTV 1 µm alone');has('2.3 nm');
 near(ev(S8,3,0,0,30).worst,7.0,0.05,'TTV 3 µm alone');has('7 nm에 그친다');
 const n20=ev(S8,1,0,20,30);near(n20.worst,36,0.5,'NT 20 nm alone');has('36 nm');has('약 36 nm');has('50배');
 near(ev(S8,1,100,0,30).worst,92,0.5,'ERO 100 nm alone');has('약 92 nm');
 const e100=ev(S8,1,100,12,30);assert(e100.edgeFail/e100.edgeN>0.7,'ERO 100 → most edge sites fail');
 const nt20=ev(S8,1,30,20,30);assert(inner(S8)>=3,'NT 20 → inner sites fail too: '+inner(S8));
 const d8=ev(S8,1,30,12,30),p8=Math.round(d8.pass/d8.total*100),d33=ev(S33,1,30,12,30),p33=Math.round(d33.pass/d33.total*100);
 assert.equal(p8,97);assert.equal(p33,75);has('97 %에서 75 %');
 // larger sites see more curvature: dome-only SFQR grows from 26×8 to 26×33
 assert(ev(S33,3,0,0,30).worst>2*ev(S8,3,0,0,30).worst,'curvature ∝ site size');
 for(const S of [S8,S33])for(const a of [0.1,3])for(const e of [0,500])for(const n of [0,60])for(const b of [20,60]){const r=ev(S,a,e,n,b);assert(Number.isFinite(r.worst)&&r.total>0&&r.pass>=0);}
 out.flat={buildMs:ms,default:`${d8.pass}/${d8.total} worst ${d8.worst.toFixed(1)} edge ${d8.edgeFail}/${d8.edgeN}`,field:`${d33.pass}/${d33.total}`,nt20:+n20.worst.toFixed(1),tilt1:+w1.toFixed(2)};
}

// quiz shape: ≥ 6 questions, each with exactly one data-correct and an explanation
{
 const qs=html.split('<div class="quiz-q">').slice(1);assert(qs.length>=6,'quiz count '+qs.length);
 for(const q of qs){assert.equal((q.match(/data-correct/g)||[]).length,1);assert(q.includes('quiz-exp'));}
 out.quiz=qs.length;
}
console.log('wafer-sims ok',JSON.stringify(out));
