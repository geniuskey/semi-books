/* FAI-01: execute the published acceleration-test callback, including rendered units.
 * FAI-07: verify the stated approximate sample size, not exact binomial power.
 * Run: node scripts/verify-factcheck.cjs.
 */
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),read=n=>fs.readFileSync(path.join(root,'chapters',n+'.html'),'utf8');
const html=read('mechanisms'),start=html.indexOf('  /* ---------------- 가속 시험 계산기 */'),end=html.lastIndexOf('\n})();');
assert.ok(start>0&&end>start);
let callback,values,stats;
const FB={kB:8.617333e-5,range:id=>()=>values[id.slice(3)],seg:()=>()=>values.cl,canvas:(_,fn)=>{callback=fn;return{redraw(){}};},palette:()=>({}),chart(){},font:()=>'',fmt:x=>x,stat:(id,val)=>stats[id]=val};
const ctx=new Proxy({},{get:()=>()=>{},set:()=>true});
vm.runInNewContext(html.slice(start,end),{FB,small:(v,u)=>({value:Number(v),unit:u}),hrs:x=>x,e10:x=>x});
let scenarios=0;
function measure(v) {
 values=v;stats={};callback(ctx,640,380);scenarios++;
 const output=stats['af-o-ppm'],actual=output.value*(output.unit==='%'?1e-2:1e-6),fit=stats['af-o-fit'].value;
 assert.ok(Number.isFinite(actual)&&actual>=0&&actual<=1,'probability must be in [0,1]');
 // Independent survival formula uses the fitted rate actually displayed to the reader.
 const expected=1-Math.pow(Math.E,-fit*87600/1e9);
 assert.ok(Math.abs(actual-expected)<1e-12,`CDF mismatch ${actual} vs ${expected}`);
 return{fit,probability:actual};
}
const low={tu:55,ts:125,ea:.7,vu:1,vs:1.1,g:0,n:77,h:1000,r:0,cl:'60'};
const p=measure(low);assert.ok(Math.abs(p.probability-.0133388)<1e-7,'small-risk reference');
const extreme=measure({...low,tu:85,ts:85,h:100,cl:'90'});
assert.ok(extreme.fit*87600/1e9>1,'old linear risk exceeded 100%');assert.ok(extreme.probability>.99999999999&&extreme.probability<=1);
for(const tu of [25,85,105])for(const ts of [85,125,175])for(const ea of [.3,.7,1.2])
for(const n of [77,2310])for(const h of [100,2000])for(const r of [0,5])for(const cl of ['60','90']) measure({...low,tu,ts,ea,n,h,r,cl});
// Formula values are computed independently from the stated z-values and risks.
function size(p1,p2){return(1.645+1.282)**2*(p1*(1-p1)+p2*(1-p2))/(p1-p2)**2;}
assert.equal(Math.ceil(size(.22,.05)),65);assert.equal(Math.ceil(size(.22,.17)),1072);
assert.ok(read('rootcause').includes('군마다 1072개'));
// Compile every inline executable script; JSON-LD is data, not JavaScript.
let chapters=0;
for(const file of fs.readdirSync(path.join(root,'chapters')).filter(n=>n.endsWith('.html'))) {
 const source=fs.readFileSync(path.join(root,'chapters',file),'utf8');
 for(const m of source.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi))if(!/src=|application\/ld\+json/.test(m[1]))new vm.Script(m[2],{filename:file});
 chapters++;
}
console.log(`FailureBook: ${scenarios} acceleration probability/render scenarios passed; sample-size references 65/1072 passed; ${chapters} chapter scripts compiled.`);
