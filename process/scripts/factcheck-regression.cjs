const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),path=require('node:path');
const root=path.resolve(__dirname,'..'),read=f=>fs.readFileSync(path.join(root,f),'utf8');
const c={window:{}};vm.createContext(c);vm.runInContext(read('js/xsec.js'),c);
const XS=c.window.XS;let doseCases=0;
for(const species of ['B','P','As','BF2'])for(const E of [10,30,100])for(const channel of [0,.1,.2]){
 const sim=new XS.Sim({W:8,H:4000,dx:1,surf:0}),dose=1e14,r=sim.implant({species,E,dose,channel});
 const arr=r.type==='n'?sim.nd:sim.na;let total=0;for(const n of arr)total+=n*1e-7/8;
 // Gaussian loss at z<0 is physical; channeling redistributes the existing dose.
 let base=0;const dz=.02,lam=r.Rp*.8+2*r.dRp;
 for(let z=dz/2;z<r.Rp+12*r.dRp;z+=dz)base+=Math.exp(-.5*((z-r.Rp)/r.dRp)**2)/(Math.sqrt(2*Math.PI)*r.dRp)*dz;
 const expected=(1-channel)*base+channel;
 assert(Math.abs(total/dose-expected)<.003,`${species}/${E}/${channel}: ${total/dose} vs ${expected}`);doseCases++;
}
const cmp=read('chapters/cmp.html'),start=cmp.indexOf('    function calc(wum'),end=cmp.indexOf('    cv = PB.canvas',start);
vm.runInContext(cmp.slice(start,end),c);let cmpCases=0;
for(const w of [.05,2,50])for(const rho of [.1,.5,.9])for(const oe of [0,30,100])for(const S of [2,10,50]){
 const r=c.calc(w,rho,oe,S);assert(Number.isFinite(r.loss));assert.equal(r.open,r.ero+r.dish>=200);
 if(!r.open)assert(200/(200-r.loss)>=1);cmpCases++;
}
assert(c.calc(2,.9,100,2).open);assert(!c.calc(2,.5,30,10).open);
const anneal=read('chapters/anneal.html');const range=anneal.match(/<input[^>]*id="rt-s"[^>]*>/)[0];
assert(range.includes('min="-1"')&&range.includes('max="7"')&&range.includes('step="any"'));
let values={},callback;const PB={seg:(id,cb)=>{callback=cb;return()=>''},range:(id)=>{const g=()=>values[id];g.set=v=>values[id]=v;return g}};
const a=anneal.indexOf('    var PRE = { furn:'),b=anneal.indexOf('    cv = PB.canvas',a);
const ac={PB,Math,tf:x=>String(x),rr:()=>{}};vm.createContext(ac);vm.runInContext(anneal.slice(a,b),ac);
for(const [name,hold] of [['furn',1800],['rta',10],['spike',0],['flash',.001]]){
 callback(name);const p=ac.profile();assert(Math.abs(p.hold-hold)<=Math.max(1e-12,hold*1e-12));assert(p.total>=hold);
}
let scripts=0;for(const file of fs.readdirSync(path.join(root,'chapters')).filter(x=>x.endsWith('.html'))){for(const m of read('chapters/'+file).matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/g)){if(m[1].includes('src='))continue;if(m[1].includes('ld+json'))JSON.parse(m[2]);else new vm.Script(m[2],{filename:file});scripts++;}}
console.log({doseCases,cmpCases,annealPresets:4,compiledScripts:scripts});

// Follow-up: actual CMP trajectory versus independently integrated rate equations.
const planar={};vm.createContext(planar);
const pa=cmp.indexOf('    var R0 = 5;'),pb=cmp.indexOf('    cv = PB.canvas',pa);
vm.runInContext(cmp.slice(pa,pb),planar);
let planarCases=0;
for(const density of [.1,.2,.5,.9])for(const initial of [100,120,500])for(const contact of [20,120,400]){
 const trajectory=planar.sim(density,initial,contact,300);
 for(const [time,up,down] of trajectory){
  const removed=-(density*up+(1-density)*(down+initial));
  assert(Math.abs(removed-5*time)<1e-8,`CMP mean removal ${density}/${initial}/${contact}/${time}`);
  assert(up>=down-1e-9);
 }
 // RK4 integrates the same differential model independently, with dt <= .002s.
 for(const time of [.5,5,30]){
  const linearTime=Math.max(0,(initial-contact)*density/5);
  let gap=initial,remaining=time;
  const linear=Math.min(remaining,linearTime);gap-=5/density*linear;remaining-=linear;
  if(remaining>0){
   const count=Math.ceil(remaining/.002),step=remaining/count;
   const rate=h=>-5*h/(density*contact+(1-density)*h);
   for(let i=0;i<count;i++){const k1=rate(gap),k2=rate(gap+step*k1/2),k3=rate(gap+step*k2/2),k4=rate(gap+step*k3);gap+=step*(k1+2*k2+2*k3+k4)/6;}
  }
  const actual=trajectory[Math.round(time/.5)];
  assert(Math.abs(actual[1]-actual[2]-gap)<2e-7,`CMP RK4 gap ${density}/${initial}/${contact}/${time}`);
  planarCases++;
 }
}
// Execute the original SPC rule block with deterministic standardized fixtures.
const metrology=read('chapters/metrology.html');
const sa=metrology.indexOf('      var viol = [], flag ='),sb=metrology.indexOf('      var box =',sa);
function rules(values){const ctx={v:values,m:0,sd:1,UCL:3,LCL:-3};vm.createContext(ctx);vm.runInContext(metrology.slice(sa,sb),ctx);return ctx;}
let spcWindows=0;
for(const a of [-2.2,-2,-.5,0,.5,2,2.2])for(const b of [-2.2,-2,-.5,0,.5,2,2.2])for(const d of [-2.2,-2,-.5,0,.5,2,2.2]){
 const v=[a,b,d],expected=v.filter(x=>x>2).length>=2||v.filter(x=>x<-2).length>=2;
 assert.equal(rules(v).viol.includes('3점 중 2점 2σ 밖'),expected);spcWindows++;
}
for(const sign of [-1,1]){
 assert(rules([2.1*sign,2.2*sign,-.5*sign]).flag[2]);
 assert(rules(Array(8).fill(sign)).viol.includes('한쪽 8연속'));
 assert(!rules([...Array(7).fill(sign),0,sign]).viol.includes('한쪽 8연속'));
}
assert(!rules(Array(8).fill(0)).viol.includes('한쪽 8연속'));
console.log({planarRK4Cases:planarCases,planarConservationPoints:36*601,spcWindows,spcRunFixtures:7});
