const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),html=fs.readFileSync(path.join(root,'chapters/burnin.html'),'utf8');
const start=html.indexOf('  function lnGamma('),end=html.indexOf('  const chi2pdf',start),ctx=vm.createContext({});
vm.runInContext(html.slice(start,end)+';globalThis.api={chi2inv,fitExposure};',ctx);const {chi2inv,fitExposure}=ctx.api;
let checks=0,blocks=0;
for(const N of [1,2,77,231,2400])for(const t of [24,48,1008,1992])for(const af of [10,350,1000])for(const p of [0,.1,.5,.75,1])for(const count of [0,1,Math.min(N,5),N]){
 const failures=Array.from({length:count},(_,i)=>({i,f:(i+.5)/count}));
 // Independently add each device's elapsed operating time, censoring at its failure.
 let expected=0;for(let i=0;i<N;i++)expected+=Math.min(p,i<count?failures[i].f:Infinity)*t*af;
 const actual=fitExposure(N,t,af,failures,p);assert.ok(Math.abs(actual-expected)<=1e-9*Math.max(1,expected));checks++;
}
assert.equal(fitExposure(77,1008,350,[{i:0,f:.5}]),26989200);checks++;
for(const c of [.6,.9,.95]){const x=chi2inv(c,2);assert.ok(Math.abs(x+2*Math.log1p(-c))<1e-10);checks++;}
// df=2(r+1) is Erlang: validate CDF by an independent finite Poisson sum.
for(const r of [1,2,5,20])for(const c of [.6,.9,.95]){const y=chi2inv(c,2*r+2)/2;let term=1,sum=1;for(let k=1;k<=r;k++){term*=y/k;sum+=term;}assert.ok(Math.abs(1-Math.exp(-y)*sum-c)<1e-10);checks++;}
for(const f of fs.readdirSync(path.join(root,'chapters')).filter(f=>f.endsWith('.html'))){const s=fs.readFileSync(path.join(root,'chapters',f),'utf8');for(const m of s.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)){if(/\bsrc\s*=/.test(m[1])||!m[2].trim())continue;if(/ld\+json/.test(m[1]))JSON.parse(m[2]);else new vm.Script(m[2],{filename:f});blocks++;}}
console.log({checks,compiledScriptBlocks:blocks});
