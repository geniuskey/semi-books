/* DES-09, DES-27, DES-28 regression + existing built-in flow compatibility.
 * Run: node scripts/verify-factcheck.cjs. Geometry in nm; EDU45 schematic L=50nm.
 */
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm'), assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..');
const c = { window: {}, TextEncoder };
vm.createContext(c);
for (const file of ['cell','flow']) vm.runInContext(fs.readFileSync(path.join(root,'js',file+'.js'),'utf8'), c);
const C=c.window.CELL,F=c.window.FLOW;
let cases=0;
const clone = x => JSON.parse(JSON.stringify(x));
for (const cell of Object.values(C.CELLS)) {
 const ex=C.extract(cell.rects,cell.pins); assert.equal(C.lvs(ex,cell.sch).match,true,cell.name); cases++;
 const w=clone(ex); w.devices[0].W+=50; assert.equal(C.lvs(w,cell.sch).match,false,'W mismatch'); cases++;
 const l=clone(ex); l.devices[0].L+=10; assert.equal(C.lvs(l,cell.sch).match,false,'L mismatch'); cases++;
}
const inv=clone(C.CELLS.INV_X1);
const od=inv.rects.find(r=>r.l==='od'&&r.y0===150); assert.ok(od); od.y1+=50;
const wx=C.extract(inv.rects,inv.pins);
assert.equal(wx.devices.find(d=>d.t==='n').W,350);assert.equal(C.drc(inv.rects).length,0);assert.equal(C.lvs(wx,inv.sch).match,false);cases++;
// A two-finger inverter is compared by summed W only when L and connectivity match.
const x2=clone(C.extract(C.CELLS.INV_X2.rects,C.CELLS.INV_X2.pins));
x2.devices[0].L=60; assert.equal(C.lvs(x2,C.CELLS.INV_X2.sch).match,false);cases++;
// Endcap zero violates DRC but the ideal drawn geometry still separates source/drain.
const end=clone(C.CELLS.INV_X1);
end.rects.filter(r=>r.l==='po'&&r.y0===90).forEach(r=>{r.y0=150;r.y1=1110;});
const endex=C.extract(end.rects,end.pins);
assert.equal(C.drc(end.rects).filter(m=>m.id==='PO.EX.1').length,2);
assert.equal(C.lvs(endex,end.sch).match,true);cases++;
const fh=fs.readFileSync(path.join(root,'chapters/flow.html'),'utf8');
vm.runInContext(fh.slice(fh.indexOf('  var PRESETS = ['),fh.indexOf('  var srcEl =')),c);
for (const [name,src] of c.PRESETS) for (const opt of [false,true]) {
 const r=F.run(src,{opt}); assert.ok(!r.err,name); assert.ok(r.eq.ok,name);
 assert.equal(C.drc(r.L.rects).length,0,name); assert.ok(F.lvs(r.S,r.L).ok,name);
 const timing=F.sta(r.S,r.R); assert.ok(Number.isFinite(timing.worst.slack));assert.ok(Number.isFinite(timing.fmax));
 // The physical GDS stream must preserve all port text records and geometry.
 const gds=F.gds('REGRESSION',r.L); let n=0,texts=0,boundaries=0;
 while(n<gds.length) {const len=gds[n]*256+gds[n+1];assert.ok(len>=4&&len%2===0&&n+len<=gds.length);if(gds[n+2]===12)texts++;if(gds[n+2]===8)boundaries++;n+=len;}
 assert.equal(texts,r.L.labels.length);assert.equal(boundaries,r.L.rects.length);cases++;
}
for (const src of ['Y = ~A\nZ = ~A','Y = ~(A & B)\nZ = ~(A & B)','Y = A\nZ = ~B','Y = A\nZ = A\nW = ~B']) for (const opt of [true,false]) {
 const r=F.run(src,{opt});assert.ok(r.eq.ok);assert.ok(F.lvs(r.S,r.L).ok);
 for(const o of r.S.outs) assert.ok(r.L.labels.some(lb=>lb.name===o.name&&lb.io==='out'),o.name+' output label');
 const t=F.sta(r.S,r.R);for(const o of r.S.outs) assert.ok(Number.isFinite(t.AT[o.name])); assert.ok(Number.isFinite(t.fmax));
 const missing=clone(r.L);missing.labels=missing.labels.filter(lb=>lb.name!=='Z');assert.equal(F.lvs(r.S,missing).ok,false,'missing alias port');
 const moved=clone(r.L);moved.labels.find(lb=>lb.name==='Z').y+=70;assert.equal(F.lvs(r.S,moved).ok,false,'port off metal');
 cases++;
}
const single=F.run('Y = ~A'),double=F.run('Y = ~A\nZ = ~A');
assert.equal(double.S.gates.length,single.S.gates.length,'alias preserves structural sharing');
const st=F.sta(single.S,single.R),dt=F.sta(double.S,double.R);
assert.ok(Math.abs(dt.D[double.S.gates[0].id].Cl-st.D[single.S.gates[0].id].Cl-2)<1e-9,'alias load is aggregated');
assert.equal(dt.AT.Y,dt.AT.Z);assert.ok(dt.AT.Y>st.AT.Y,'extra output load affects delay');cases++;
// A disconnected metal island with the alias label must not pass by name alone.
const island=clone(double.L);island.rects.push({l:'m1',x0:0,x1:100,y0:1700,y1:1760});
Object.assign(island.labels.find(lb=>lb.name==='Z'),{x:50,y:1730});
assert.equal(F.lvs(double.S,island).ok,false,'alias must be physically connected');cases++;
// Execute the chapter schematic renderer with aliases and input-direct outputs.
c.PB={palette:()=>({}),font:()=>'',color:()=>''};
const si=fh.indexOf('  function schematic('), se=fh.indexOf('  var synCv =',si);
vm.runInContext(fh.slice(si,se),c);
const noop=()=>{},ctx=new Proxy({}, {get:(t,k)=>t[k]||noop,set:(t,k,v)=>(t[k]=v,true)});
for(const src of ['Y = ~A\nZ = ~A','Y = A\nZ = ~B']) {
 const r=F.run(src);c.R=r;c.schematic(ctx,800,400,r.S,{});cases++;
}
let chapters=0;
for(const file of fs.readdirSync(path.join(root,'chapters')).filter(f=>f.endsWith('.html'))) {
 const html=fs.readFileSync(path.join(root,'chapters',file),'utf8');
 for(const match of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)) if(!/src=|application\/ld\+json/.test(match[1])) new vm.Script(match[2],{filename:file});
 chapters++;
}
console.log(`DesignBook: ${cases} geometry/flow regressions passed; ${chapters} chapter scripts compiled.`);
