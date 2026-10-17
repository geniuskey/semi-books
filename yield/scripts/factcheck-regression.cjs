const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),path=require('node:path');const root=path.resolve(__dirname,'..'),read=f=>fs.readFileSync(path.join(root,f),'utf8');
const YB={clamp:(x,a,b)=>Math.max(a,Math.min(b,x)),rng(seed){let a=seed>>>0;return()=>{a|=0;a=(a+0x6d2b79f5)|0;let t=Math.imul(a^(a>>>15),1|a);t=(t+Math.imul(t^(t>>>7),61|t))^t;return((t^(t>>>14))>>>0)/4294967296}}};
const c={window:{},YB};vm.createContext(c);vm.runInContext(read('js/wafer.js'),c);
const line=read('chapters/defects.html').split('\n').find(x=>x.includes('const theta ='));vm.runInContext(line+'\nthis.actualTheta=theta;',c);
for(const [s,w,x0,expected] of [[20,60,30,.3875],[10,60,30,.553571428571],[10,60,80,1],[60,60,30,1/12]])assert(Math.abs(c.actualTheta(s,s+w,x0)-expected)<1e-5);
const WM=c.window.WM,W=WM.wafer({dieW:6.5,dieH:8,shot:[4,4]});let exceeds=0;
for(let seed=1;seed<=10000;seed++){const map=WM.map(W,{base:.12,seed});if((WM.components(map)[0]?.size||0)>11)exceeds++;}
assert.equal(exceeds,467);assert(Math.abs(707*1e-4/(1e-8**2*1e8)/100/3600-19.638888889)<1e-8);
let scripts=0;for(const f of fs.readdirSync(path.join(root,'chapters')).filter(f=>f.endsWith('.html')))for(const m of read('chapters/'+f).matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/g)){if(m[1].includes('src='))continue;if(m[1].includes('ld+json'))JSON.parse(m[2]);else new vm.Script(m[2],{filename:f});scripts++;}
console.log({criticalAreaCases:4,randomMaps:10000,exceeds11:exceeds,compiledScripts:scripts});
