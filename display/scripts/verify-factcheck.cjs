'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const root=path.join(__dirname,'..'),read=p=>fs.readFileSync(path.join(root,p),'utf8');
const ctx={window:{}};vm.createContext(ctx);const common=read('js/common.js');
vm.runInContext(common.slice(0,common.indexOf('/* ------------------------------------------------------------ theme */'))+'})();',ctx);const DB=ctx.window.DB;let checks=0;
function near(a,b,tol=1e-12){assert.ok(Math.abs(a-b)<=tol,`${a} != ${b}`);checks++;}
// Independent definitions of mean and Michelson modulation; exercise actual helper.
for(const mode of ['pwm','hyb','dc'])for(let bi=0;bi<=100;bi++)for(let mi=0;mi<=100;mi+=5){
 const b=bi/100,m=mi/100,w=DB.pwmWave(b,m,mode);
 near(w.hi*w.D+w.lo*(1-w.D),b);
 assert.ok(w.hi>=w.lo && w.lo>=0 && w.hi<=1+1e-12 && w.D>0 && w.D<=1);checks++;
 if(w.pwm)near((w.hi-w.lo)/(w.hi+w.lo),m);else near(w.hi,w.lo);
}
for(const [f,m,expected] of [[60,1,'저위험 권고 구간'],[60,2,'권고 초과'],[89,2.3,'권고 초과'],[90,2.3,'무영향 권고 구간'],[240,30,'권고 초과'],[240,15,'저위험 권고 구간'],[240,5,'무영향 권고 구간'],[1250,100,'권고 초과'],[1250.1,100,'저위험 권고 구간'],[1920,100,'저위험 권고 구간'],[3000,100,'저위험 권고 구간'],[3000.1,100,'무영향 권고 구간'],[3840,100,'무영향 권고 구간'],[240,0,'변조 없음']]){assert.equal(DB.flickerLevel(f,m),expected);checks++;}
// Solid-angle integration: upper hemisphere vs one cone in full sphere.
for(const n of [1.5,1.7,1.75,1.8,2]){const t=Math.asin(1/n);let area=0,N=10000;for(let i=0;i<N;i++)area+=Math.sin((i+.5)*t/N)*t/N;near(area,1-Math.cos(t),1e-10);near(area/2,(1-Math.cos(t))/2,1e-10);}
for(let code=0;code<=255;code++)near(DB.srgbEnc(DB.srgbDec(code/255)),code/255,1e-14);
let blocks=0;for(const f of fs.readdirSync(path.join(root,'chapters')).filter(f=>f.endsWith('.html'))){for(const m of read('chapters/'+f).matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/g)){if(m[1].includes('application/ld+json'))JSON.parse(m[2]);else if(!m[1].includes('src='))new vm.Script(m[2],{filename:f});blocks++;}}
console.log(`PASS ${checks} numerical checks; ${blocks} script/JSON blocks in 20 chapters.`);
