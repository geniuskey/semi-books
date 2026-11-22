/* Copyright (c) 2026 DeviceBook contributors. MIT.
 * Run: node tools/factcheck-regression.cjs
 * Exercises live functions and independent physical limits from DEV-03,07,08,09,11,16,29.
 */
const assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
const root = path.resolve(__dirname, '..');
const read = f => fs.readFileSync(path.join(root, f), 'utf8');
const c = vm.createContext({ window: {}, PB: { onTheme() {} } });
vm.runInContext(read('js/semi.js'), c); c.SC = c.window.SC;
const SC = c.SC;
const near = (a, b, tol, label) => assert.ok(Math.abs(a-b) <= tol, `${label}: ${a} != ${b}`);
function block(s, name) {
 const start = s.indexOf(`function ${name}(`), brace = s.indexOf('{', start);assert.ok(start >= 0, name);
 let depth=1, end=brace+1;
 for(;end<s.length && depth;end++){if(s[end]==='{')depth++;if(s[end]==='}')depth--;}
 return s.slice(start,end);
}
for(const file of fs.readdirSync(path.join(root,'chapters')).filter(f=>f.endsWith('.html'))){
 for(const m of read(`chapters/${file}`).matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)){
  if(/type=["']application\/ld\+json["']/i.test(m[0]))JSON.parse(m[1]);else new vm.Script(m[1],{filename:file});
 }
}
const crystal=read('chapters/crystal.html');
vm.runInContext('let memo=null;const EMAX=16.5;const f=(x,P)=>x<1e-9?P+1:P*Math.sin(x)/x+Math.cos(x);'+block(crystal,'solve')+'\nglobalThis.kp=solve;',c);
const free=c.kp(0);
near(free.bands[0].lo,0,1e-14,'free-electron bottom');
for(let i=1;i<free.bands.length;i++)near(free.bands[i].lo-free.bands[i-1].hi,0,1e-12,'free-electron gap');
const point=free.pts.find(p=>p.n===1&&p.ok&&p.e>.022);
near((point.e-free.bands[0].lo)/(Math.acos(point.fv)/Math.PI)**2,1,1e-12,'free-electron mass');
for(const P of [.1,1,5,20])for(const [i,b]of c.kp(P).bands.entries()){
 const x=Math.PI*Math.sqrt(b.lo), val=P*Math.sin(x)/x+Math.cos(x);
 near(val,i%2?-1:1,1e-10,'KP root boundary');assert.ok(b.lo<b.hi);
}
// A zero-temperature filling must never occupy an interpolated level above an empty one.
const splitStart=crystal.indexOf('    const Es ='),splitEnd=crystal.indexOf('    const gN = PB.range("sp-n"',splitStart);
const splitContext=vm.createContext({PB:{clamp:(x,a,b)=>Math.max(a,Math.min(b,x))}});
vm.runInContext(crystal.slice(splitStart,splitEnd)+'\nglobalThis.splitLevels=levels;',splitContext);
for(let atoms=1;atoms<=40;atoms++)for(let step=0;step<=88;step++){
 const energies=splitContext.splitLevels(atoms,1.6+step*.05);
 assert.equal(energies.length,4*atoms);
 for(let j=1;j<energies.length;j++)assert.ok(Number.isFinite(energies[j])&&energies[j]>=energies[j-1],'ground-state occupation follows energy order');
}
// Lattice geometry: boundary-weighted atoms per conventional cell and tetrahedral bonds.
vm.runInContext(block(crystal,'atoms')+'\n'+block(crystal,'arealDensity')+'\n'+block(crystal,'kpBottomMass')+'\nconst E=(kk,W)=>W/2*(1-Math.cos(Math.PI*kk));'+block(crystal,'blochPosition')+
 '\nglobalThis.geometry={atoms,arealDensity,kpBottomMass,blochPosition};',c);
const geometry=c.geometry;
for(const count of [1,2]){
 const lattice=geometry.atoms(count),positions=[...lattice.A,...lattice.B];
 const weight=positions.reduce((sum,p)=>sum+p.reduce((f,x)=>f*((x===0||x===count)?.5:1),1),0);
 near(weight,8*count**3,1e-12,'diamond weighted unit-cell count');
 for(const p of positions.filter(p=>p.every(x=>x>=.25&&x<=count-.25))){
  const neighbours=positions.filter(t=>Math.abs(Math.hypot(...t.map((v,j)=>v-p[j]))-Math.sqrt(3)/4)<1e-12);
  assert.equal(neighbours.length,4,'four nearest neighbours');
  for(let a=0;a<4;a++)for(let b=a+1;b<4;b++){
   const dot=neighbours[a].reduce((sum,x,j)=>sum+(x-p[j])*(neighbours[b][j]-p[j]),0)/(3/16);
   near(dot,-1/3,1e-12,'tetrahedral bond angle');
  }
 }
}
const latticeA=5.431,latticeAcm=latticeA*1e-8;
for(const [h,k,l,d,density]of [[1,0,0,0,2],[1,0,0,.25,2],[1,1,0,0,2*Math.SQRT2],[1,1,1,0,4/Math.sqrt(3)],[1,1,1,.75,4/Math.sqrt(3)]])
 near(geometry.arealDensity(h,k,l,d,latticeA)*latticeAcm**2,density,1e-12,'diamond planar density');
near(geometry.arealDensity(1,0,0,.125,latticeA),0,1e-12,'no atoms between crystal layers');
let maxKPMassError=0;
for(const P of [.1,1,5,20]){
 const edge=c.kp(P).bands[0].lo,kappa=1e-3,target=Math.cos(Math.PI*kappa);
 let lo=Math.PI*Math.sqrt(edge),hi=Math.PI;
 for(let j=0;j<70;j++){const x=(lo+hi)/2,f=P*Math.sin(x)/x+Math.cos(x);if(f>target)lo=x;else hi=x;}
 const energy=((lo+hi)/(2*Math.PI))**2,fromCurvature=kappa*kappa/(energy-edge),mass=geometry.kpBottomMass(P,edge);
 maxKPMassError=Math.max(maxKPMassError,Math.abs(mass/fromCurvature-1));
 assert.ok(Math.abs(mass/fromCurvature-1)<2e-5,'KP analytic band-bottom mass');
}
near(geometry.kpBottomMass(0,0),1,1e-14,'free-electron mass');
// pn junction: recover dopings and potential from both C–V linearizations.
const pnChapter = read('chapters/pn.html');
const junctionContext = vm.createContext({SC, q:SC.q, es:SC.MAT.Si.eps*SC.eps0, ni:SC.ni('Si'), Vt:SC.Vt(300)});
vm.runInContext(['gradedPotential','fitCapacitance','gaussProfile','junctionSample'].map(name=>block(pnChapter,name)).join('\n'),junctionContext);
const {q:electronCharge,es:epsSi,ni:intrinsicSi,Vt:thermalVoltage} = junctionContext;
const junctionArea = 1e-4;
for (const acceptors of [1e16,1e19]) for (const donors of [1e14,1e16,1e18]) {
 const junction = SC.pn(acceptors,donors);
 const C = V => junctionArea * SC.pn(acceptors,donors,V).Cj;
 const fit = junctionContext.fitCapacitance(C,2,junctionArea,acceptors);
 near(fit.extracted/donors,1,1e-11,'abrupt C–V extraction includes both doping densities');
 near(fit.intercept,junction.Vbi,1e-11,'abrupt C–V intercept');
 const charge = V => electronCharge * donors * SC.pn(acceptors,donors,V).xn * junctionArea;
 near((charge(-1.00001)-charge(-.99999))/(2e-5*C(-1)),1,1e-9,'abrupt depletion charge derivative');
}
for (const gradient of [1e19,1e21,1e24]) {
 const Vbi = junctionContext.gradedPotential(gradient);
 const width = V => Math.cbrt(12*epsSi*(Vbi-V)/(electronCharge*gradient));
 near(2*thermalVoltage*Math.log(gradient*width(0)/(2*intrinsicSi)),Vbi,1e-13,'graded equilibrium closure');
 const C = V => junctionArea*epsSi/width(V);
 const fit = junctionContext.fitCapacitance(C,3,junctionArea,1e19);
 near(fit.extracted/gradient,1,1e-12,'graded C–V slope reconstructs doping gradient');
 near(fit.intercept,Vbi,1e-12,'graded C–V intercept');
 const charge = V => electronCharge*gradient*width(V)**2/8*junctionArea;
 near((charge(-1.00001)-charge(-.99999))/(2e-5*C(-1)),1,1e-9,'graded depletion charge derivative');
}
const leftSheet = -.345, rightSheet = .616;
const sheets = junctionContext.gaussProfile([-1,leftSheet,0,rightSheet,1],
 x=>x>leftSheet&&x<rightSheet?1:0,true);
near(sheets.psi.at(-1)[1],leftSheet-rightSheet,1e-14,'sheet potential drop integrates across the exact sheet locations');
assert.deepEqual(Array.from(sheets.E.filter(([x])=>x===leftSheet),([,E])=>E),[0,1],'sheet field plotted with an exact jump');
let maxJunctionFieldError = 0;
for (const [Na,Nd] of [[1e15,1e15],[1e15,1e18],[1e18,1e15],[1e18,1e18],[1e17,3e15]]) {
 const {s,junction,LDp,LDn} = junctionContext.junctionSample(Na,Nd,0);
 const h = s.x[1]-s.x[0], j = s.x.findIndex(x=>x>junction);
 assert.ok(h<=Math.min(LDp,LDn)*.50000001,'junction mesh resolves shorter Debye length');
 const up = -Math.asinh(Na/(2*intrinsicSi)), un = Math.asinh(Nd/(2*intrinsicSi));
 const uj = (2*intrinsicSi*(Math.cosh(up)-Math.cosh(un))+Na*up+Nd*un)/(Na+Nd);
 const field = Math.sqrt(2*electronCharge*thermalVoltage/epsSi*
   (2*intrinsicSi*(Math.cosh(uj)-Math.cosh(up))+Na*(uj-up)));
 maxJunctionFieldError = Math.max(maxJunctionFieldError,Math.abs((s.psi[j]-s.psi[j-1])/(h*field)-1));
 for (const bias of [-5,Math.min(.6,SC.pn(Na,Nd).Vbi-.1)]) {
  const result = junctionContext.junctionSample(Na,Nd,bias).s;
  assert.ok(result.converged && result.rho.every(Number.isFinite),'biased junction converges from equilibrium');
  near(result.psi.at(-1)-result.psi[0],(un-up)*thermalVoltage-bias,1e-10,'numerical junction applies the displayed bias');
 }
}
assert.ok(maxJunctionFieldError<.025,`junction interface field differs from Poisson–Boltzmann reference by ${maxJunctionFieldError}`);
const contacts = read('chapters/ms.html');
const contactContext = vm.createContext({ SC, Vt0: thermalVoltage, ES: epsSi, Q: electronCharge, NC: SC.Nc('Si'), mt: .26, Ast: 112 });
vm.runInContext(['majoritySurfaceCharge', 'schottkyDepletion', 'e0eV', 'rhoc', 'tlmExtract'].map(name => block(contacts, name)).join('\n'), contactContext);
for (const N of [1e14, 1e16, 1e18]) {
 const debyeCapacitance = Math.sqrt(epsSi * electronCharge * N / thermalVoltage);
 for (const type of [-1, 1]) for (const bend of [-1e-10, 1e-10]) {
  const sheetCharge = contactContext.majoritySurfaceCharge(bend, N, type);
  near(sheetCharge / (bend * debyeCapacitance), 1, 1e-8, 'metal–semiconductor flat-band Debye limit');
 }
 for (const barrier of [.5, .8, .95]) {
  const forward = contactContext.schottkyDepletion(N, barrier, 0).Vbi - 3 * thermalVoltage;
  for (const V of [-5, 0, forward]) {
   const result = contactContext.schottkyDepletion(N, barrier, V);
   near(result.Emax * result.W / 2, result.Vbi - V, 1e-12, 'integrated depletion field equals band bending');
   near(result.inv / (1e-6 / result.C) ** 2, 1, 1e-12, 'C–V ordinate matches the displayed capacitance');
   const slope = (contactContext.schottkyDepletion(N, barrier, V - .01).inv - result.inv) / .01;
   near(slope * electronCharge * epsSi * N * 1e12 / 2, 1, 1e-12, 'Schottky C–V slope recovers doping');
   near(V + result.inv / slope, result.Vbi - thermalVoltage, 1e-11, 'Schottky C–V intercept includes the thermal correction');
  }
 }
}
for (const V of [-1e-18, 1e-18]) {
 const { J, Js } = SC.schottkyJ(.7, V);
 near(J / (Js * V / thermalVoltage), 1, 1e-12, 'thermionic current keeps its sign and slope near zero bias');
}
assert.equal(SC.schottkyJ(.7, 0).J, 0, 'zero equilibrium thermionic current');
near(contactContext.e0eV(4e19) / contactContext.e0eV(1e19), 2, 1e-12, 'tunneling energy scales as the square root of doping');
near(contactContext.e0eV(1e19), .0336, 5e-4, 'silicon tunneling energy uses SI density and permittivity');
const capDoping = 5e20;
assert.ok(contactContext.rhoc(.65, capDoping) > 1e-8, 'unlowered NiSi misses the contact resistance target at the doping ceiling');
assert.ok(contactContext.rhoc(.28, capDoping) < 1e-8, 'lower-barrier ErSi reaches the target');
for (const length of [2, 5, 50]) for (const transfer of [.5, 2, 7]) {
 const width = 100, sheet = 70, slope = sheet / width;
 const Rc = slope * transfer * Math.cosh(length / transfer) / Math.sinh(length / transfer);
 const result = contactContext.tlmExtract(slope, 2 * Rc, width, length);
 near(result.Rsh, sheet, 1e-12, 'TLM recovers sheet resistance');
 near(result.LT, transfer, 1e-12, 'finite-pad TLM recovers transfer length');
 near(result.resistivity / (sheet * (transfer * 1e-4) ** 2), 1, 1e-12, 'finite-pad TLM recovers contact resistivity');
}
assert.equal(contactContext.tlmExtract(0, 3, 100, 2), null, 'TLM rejects zero slope');
assert.equal(contactContext.tlmExtract(1, -3, 100, 2), null, 'TLM rejects negative contact resistance');
const mosfetChapter = read('chapters/mosfet.html');
const transistor = vm.createContext({ SC });
vm.runInContext(['gcaV', 'fitTransfer', 'logicLevels'].map(name => block(mosfetChapter, name)).join('\n'), transistor);
const transistorParams = { W: 10e-4, L: 1e-4, tox: 5e-7, Vth0: .5, n: 1.3, mu0: 400 };
for (const gate of [-.6, .5, 1.5]) for (const vsat of [undefined, 1e7]) {
 const p = { ...transistorParams, vsat };
 const { beta } = SC.mosfet(p, gate, 0);
 const z = (gate - p.Vth0) / (2 * p.n * thermalVoltage);
 const conductance = 2 * p.n * beta * thermalVoltage * Math.log1p(Math.exp(z)) / (1 + Math.exp(-z));
 assert.equal(SC.mosfet(p, gate, 0).Id, 0, 'MOS drain current cancels at equilibrium');
 near(SC.mosfet(p, gate, 1e-20).Id / (conductance * 1e-20), 1, 1e-12, 'weak and strong inversion retain infinitesimal output conductance');
 for (const vd of [1e-6, .1, 1.8]) {
  const forward = SC.mosfet(p, gate, vd).Id;
  near(SC.mosfet(p, gate - vd, -vd).Id / forward, -1, 1e-12, 'exchanging source and drain reverses channel current');
  near(SC.mosfet({ ...p, type: "p" }, -gate, -vd).Id / forward, -1, 1e-12, 'mirrored pMOS has the opposite sign');
 }
}
for (const vd of [1e-12, .2, .6]) for (const x of [0, .25, .5, 1]) {
 const n = 1.3, ov = 1;
 const v = transistor.gcaV(x, ov, n, vd, 1);
 near((ov * v - n * v * v / 2) / (ov * vd - n * vd * vd / 2), x, 1e-12, 'GCA integral conserves current along the channel');
}
near(transistor.gcaV(1, 1, 1.3, 2, .8), 2, 1e-13, 'pinch region closes at drain voltage');
near(transistor.gcaV(.8, 1, 1.3, 2, .8), 1 / 1.3, 1e-13, 'pinch occurs where inversion sheet charge reaches zero');
const linearTransfer = Array.from({ length: 31 }, (_, i) => { const v = i * .01; return [v, .002 * (v - .03)]; });
const logTransfer = linearTransfer.map(([v]) => [v, 1e-12 * 10 ** (v / .075)]);
near(transistor.fitTransfer(linearTransfer, 5, 23).at(.03), 0, 1e-15, 'sampled linear fit reconstructs the threshold intercept');
near(1000 / transistor.fitTransfer(logTransfer, 5, 23, true).slope, 75, 1e-12, 'sampled semilog fit reconstructs swing');
const inverterReference = v => 1 / (1 + Math.exp(16 * (v - .5)));
const logisticSamples = Array.from({ length: 161 }, (_, i) => [i / 160, inverterReference(i / 160)]);
const switchingLevels = transistor.logicLevels(logisticSamples, inverterReference);
const firstCrossing = .5 - Math.acosh(2) / 8;
near(switchingLevels.VIL, firstCrossing, 1e-7, 'inverter VIL locates the first −1 gain crossing');
near(switchingLevels.VIH, 1 - firstCrossing, 1e-7, 'inverter VIH locates the second −1 gain crossing');
near(switchingLevels.low, switchingLevels.high, 1e-10, 'symmetric inverter noise margins match');
const scalingChapter = read('chapters/scaling.html');
const scalingContext = vm.createContext({});
const distanceStart = scalingChapter.indexOf('  const scatteringDistance');
const flightStart = scalingChapter.indexOf('  function advanceFlight', distanceStart);
vm.runInContext(scalingChapter.slice(distanceStart, flightStart) + ['EcNL', 'barrierPeak', 'advanceFlight', 'transmittedFraction', 'backscatteringCurrent']
 .map(name => block(scalingChapter, name)).join('\n'), scalingContext);
for (const length of [5, 12, 28, 100]) for (const lambda of [2, 8, 15]) for (const drain of [0, .05, .7, 1.2]) {
 const base = .55, peak = scalingContext.barrierPeak(length, lambda, base, drain);
 const denom = Math.sinh(length / lambda);
 const reference = x => base - (base * Math.sinh((length - x) / lambda) + (base + drain) * Math.sinh(x / lambda)) / denom;
 near(scalingContext.EcNL(0, length, lambda, base, drain), 0, 1e-14, 'natural length source boundary');
 near(scalingContext.EcNL(length, length, lambda, base, drain), -drain, 1e-14, 'natural length drain boundary');
 near(peak.energy, reference(peak.x), 2e-15, 'scaled hyperbolic solution agrees with direct evaluation');
 const derivative = (base * Math.cosh((length - peak.x) / lambda) - (base + drain) * Math.cosh(peak.x / lambda)) / (denom * lambda);
 if (peak.x === 0) assert.ok(derivative <= 1e-12, 'barrier collapses at the source when its slope is nonpositive');
 else near(derivative, 0, 2e-15, 'interior barrier peak has zero slope');
}
near(scalingContext.barrierPeak(3000, 2, .55, 1).energy, .55, 1e-15, 'long channel remains finite beyond sinh overflow');
let scatteringSeed = 2239;
const randFlight = () => {
 scatteringSeed = (Math.imul(scatteringSeed, 1664525) + 1013904223) >>> 0;
 return (scatteringSeed + .5) / 4294967296;
};
for (const length of [.25, 1, 4, 12]) {
 const shots = 16000, mean = 1;
 let through = 0, unscattered = 0;
 for (let i = 0; i < shots; i++) {
  const remaining = -Math.log1p(-randFlight());
  unscattered += Number(remaining >= length);
  const p = { x: 0, direction: 1, remaining };
  let exitDirection;
  do { exitDirection = scalingContext.advanceFlight(p, .6, length, mean, randFlight); } while (!exitDirection);
  through += Number(exitDirection > 0);
 }
 near(through / shots, scalingContext.transmittedFraction(length, mean), .011, 'two-stream Monte Carlo reproduces ℓ/(L+ℓ)');
 near(unscattered / shots, Math.exp(-length / mean), .011, 'unscattered fraction follows exponential survival');
 near(scalingContext.backscatteringCurrent(length, mean, 3), 3 / (1 + 2 * length), 1e-14, 'finite-length backscattering restores the ballistic limit');
}
// Fixed position scale: peak-to-peak Bloch excursion is W/F, period is inverse force.
const excursion=(W,F)=>Math.abs(geometry.blochPosition(1,W,F)-geometry.blochPosition(0,W,F));
near(excursion(2,1)/excursion(2,3),3,1e-12,'Bloch amplitude inverse force');
near(excursion(4,1)/excursion(2,1),2,1e-12,'Bloch amplitude proportional to bandwidth');
const kappa0=.23,Wbloch=2,Fbloch=3,delta=1e-6;
const dxdk=(geometry.blochPosition(kappa0+delta,Wbloch,Fbloch)-geometry.blochPosition(kappa0-delta,Wbloch,Fbloch))/(2*delta);
near(dxdk*Fbloch,Wbloch*Math.PI*Math.sin(Math.PI*kappa0)/20,1e-9,'Bloch work-energy relation');
near(SC.ni('SiC',600),3.091176e6,2,'SiC intrinsic density');
near(SC.alphaSi(370),7.37e5,1e-9,'Green 370nm');near(SC.alphaSi(450),2.41e4,1e-9,'Green 450nm');near(SC.alphaSi(1150),.68,1e-12,'Green 1150nm');
// Components of a 3D Maxwell velocity projected onto the display plane.
const transport=read('chapters/transport.html');
let seed=937;const uniform=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return(seed+.5)/4294967296;};
c.PB={randn:()=>Math.sqrt(-2*Math.log(uniform()))*Math.cos(2*Math.PI*uniform())};
vm.runInContext(block(transport,'newVel')+'\nglobalThis.velocity=newVel;',c);
const ms=.26*SC.m0, vt=Math.sqrt(3*SC.kB*300/ms);
let sum=0,squares=0;
for(let i=0;i<200000;i++){const p={};c.velocity(p,{vthS:vt,tauS:1});sum+=p.vx;squares+=p.vx*p.vx;}
const variance=squares/200000-(sum/200000)**2;
near(variance/(SC.kB*300/ms),1,.015,'Maxwell component variance');
// Reflecting-wall kernel preserves particle count and approaches a uniform box.
c.LB=40;c.gD=()=>36;c.x0hist=new Float64Array(200);
vm.runInContext(block(transport,'theory')+'\n'+block(transport,'reflect')+'\nglobalThis.diffusion=theory;',c);
for(const [position, expected] of [[-83,3],[-3,3],[0,0],[40,40],[43,37],[83,3],[123,37]])
 near(c.reflect(position,40),expected,1e-12,'particle displacement reflected through every wall crossing');
for(const initial of [0,100,199]){
 c.x0hist.fill(0);c.x0hist[initial]=900;
 for(const t of [0,.001,.1,1,100,1000,100000]){
  c.s2=2*36*t;const bins=c.diffusion(120),total=bins.reduce((a,b)=>a+b,0);
  near(total,900,.001,'reflecting mass');assert.ok(bins.every(v=>Number.isFinite(v)&&v>=0));
  if(t===100000)for(const value of bins)near(value,7.5,1e-9,'uniform reflecting equilibrium');
 }
}
// A constant equilibrium Fermi level requires zero electron current even at steep doping.
let equilibriumResidual=0;
for(const kind of ['exponential','step']){
 const L=2e-4,prof=x=>kind==='exponential'?1e18*(1e-3)**Math.max(0,Math.min(1,(x/L-.1)/.8)):Math.exp(Math.log(1e18)*(1-.5*(1+Math.tanh((x-L/2)/1e-6)))+Math.log(1e15)*.5*(1+Math.tanh((x-L/2)/1e-6)));
 const state=new SC.Device1D({L,N:301,doping:prof,mobility:'doping'}).state();
 equilibriumResidual=Math.max(equilibriumResidual,...Array.from(state.Jn,Math.abs));
 assert.ok(equilibriumResidual<1e-6,'SG equilibrium current');
}
// Series-resistance component curves must sum to the same solved terminal current.
const diode=read('chapters/diode.html');
vm.runInContext('const NA=1e18,WP=2e-4,WN=20e-4,AREA=1e-4;'+block(diode,'Jj')+block(diode,'I')+'\nglobalThis.current=I;',c);
for(const Rs of [0,1,10,100])for(const gr of [false,true])for(const hi of [false,true])for(const V of [-.5,0,.6,.8,1]){
 const p={Nd:1e16,tau:1e-6,T:300,Rs,gr,hi}, r=c.current(V,p);
 near((r.c.Jd+r.c.Jg)*1e-4,r.I,1e-14,'diode component sum');near(r.Vj+r.I*Rs,V,1e-11,'terminal voltage');
}
const chargeContext = vm.createContext({SC,q:SC.q,NA:1e18,WN:20e-4,AREA:1e-4});
vm.runInContext(block(diode,'storedCharge'),chargeContext);
for(const V of [-.3,0,.5])for(const Lp of [3e-4,2e-3,50e-3]){
 const parameters={Nd:1e16,T:300};
 const junction=SC.pn(1e18,parameters.Nd,V);
 const width=20e-4-junction.xn, edge=SC.ni('Si')**2/parameters.Nd*Math.expm1(V/SC.Vt(300));
 const n=2048, h=width/n;
 let normalized=0.5;
 for(let i=1;i<n;i++) normalized+=Math.sinh((width-i*h)/Lp)/Math.sinh(width/Lp);
 const integrated=SC.q*1e-4*edge*normalized*h;
 near(chargeContext.storedCharge(V,parameters,Lp),integrated,Math.max(1e-28,Math.abs(integrated)*2e-6),'stored charge integrates the finite neutral-region profile');
}
for(const [mat, listedVoltage] of [['Ge',.198],['Si',.608],['GaAs',1.047],['SiC',2.781]]){
 const { J0 }=SC.diodeJ({mat,Na:1e18,Nd:1e16,taun:1e-6,taup:1e-6});
 const factor=.1/J0;
 near(SC.Vt(300)*Math.log1p(factor),listedVoltage,.0005,'material table forward voltage at 10 microamp');
 assert.ok((SC.ni(mat)/1e16)**2*factor<.05,'tabulated example stays at low injection');
}
// Independent stationary-point / half-height calculation bounds the mission's
// peak-time approximation error over the new allowed physical parameter range.
const bisect=(lo,hi,fn)=>{for(let i=0;i<80;i++){const m=(lo+hi)/2;if(fn(m)>0)hi=m;else lo=m;}return(lo+hi)/2;};
let maxMuError=0,maxDError=0;
for(const N of [1e14,1e15,1e16])for(const tau of [30e-6,60e-6,150e-6])for(const E of [15,20,40,60]){
 const mu=SC.mobility('Si',N,300,'p'),D=mu*SC.Vt(300),v=mu*E,d=.5;
 const tp=d*d/(D+Math.sqrt(D*D+(v*v+4*D/tau)*d*d));
 const logSignal=t=>-.5*Math.log(t)-(d-v*t)**2/(4*D*t)-t/tau;
 const half=logSignal(tp)-Math.log(2);
 const left=bisect(1e-15,tp,t=>logSignal(t)-half);
 const right=bisect(tp,200e-6,t=>half-logSignal(t));
 const estimateMu=d/(E*tp), estimateD=(estimateMu*E)**2*(right-left)**2/(16*Math.log(2)*tp);
 maxMuError=Math.max(maxMuError,Math.abs(estimateMu/mu-1));maxDError=Math.max(maxDError,Math.abs(estimateD/D-1));
 assert.ok(tp<200e-6&&right<200e-6,'mission signal in window');
}
assert.ok(maxMuError<.08&&maxDError<.2,'Haynes-Shockley bounded approximation');
// Long-diode reverse recovery against the analytic half-space storage solution.
const recovery = vm.createContext({TMAX:3.2,PB:{
 erf(x) {
  const n=256, h=x/n;
  let sum=1+Math.exp(-x*x);
  for(let i=1;i<n;i++) sum+=(i%2?4:2)*Math.exp(-((i*h)**2));
  return 2/Math.sqrt(Math.PI)*sum*h/3;
 },
 clamp:(x,lo,hi)=>Math.max(lo,Math.min(hi,x)),
}});
vm.runInContext(['profileAt','kingston','simulate','recoveryFrame'].map(name=>block(diode,name)).join('\n'),recovery);
let maxRecoveryError=0;
for(const ir of [.05,.1,.5,1,2,5,10,20,40]){
 const ref=bisect(0,3.2,t=>recovery.PB.erf(Math.sqrt(t))-1/(1+ir));
 const result=recovery.simulate(ir);
 maxRecoveryError=Math.max(maxRecoveryError,Math.abs(result.ts/ref-1));
 assert.ok(result.ts>0 && result.trr>result.ts && result.trr<3.2,'storage and recovery observed within the full slider range');
 const transition=result.t.indexOf(result.ts);
 assert.ok(transition>0,'storage transition recorded at the actual crossing');
 near(result.Q[transition],(1+ir)*Math.exp(-result.ts)-ir,1e-3,'storage conservation of total excess charge');
 const frame=recovery.recoveryFrame(result,result.ts/2);
 near(frame.pAt(0),frame.p0,1e-13,'profile and junction readouts use a shared time');
 near(frame.i,-ir,1e-12,'reverse current held during storage');
}
assert.ok(maxRecoveryError<.003,`storage time differs from the half-space solution by ${maxRecoveryError}`);
const diffusionContext = vm.createContext({exp10:x=>10**x,gW:()=>0,gT:()=>-8,Dp:11.3});
vm.runInContext(block(diode,'prm')+'\nglobalThis.diffusionProfile=prm;',diffusionContext);
for(const [width, logTau] of [[0,-5],[1.3,-7],[2,-9]]){
 diffusionContext.gW=()=>width; diffusionContext.gT=()=>logTau;
 const p=diffusionContext.diffusionProfile();
 near(p.shape(0),1,1e-14,'normalized diffusion source');
 near(p.shape(1),0,1e-14,'finite neutral region absorbing contact');
 const delta=1e-7;
 near(p.rho0*p.Dv*(p.shape(0)-p.shape(delta))/delta/p.source,1,1e-5,'injection flux matches diffusion profile');
}
// Optical pulse: compare the chapter integrator with independent fixed-step RK4.
const gr = read('chapters/gr.html');
const grContext = vm.createContext({SC, ni:SC.ni('Si'), gN:()=>15, gT:()=>-5, gTy:()=>'n'});
const coefficientLine = gr.split('\n').find(line => line.includes('const REC ='));
vm.runInContext('const kT = SC.Vt(300), eventDuration = 0.75;'+coefficientLine+'\n'+
  ['recombinationRate','compute','solve','advanceTrap','prof','reflectSlab'].map(name=>block(gr,name)).join('\n'),grContext);
let maxDecayError = 0;
for (const [dose,tau,NA] of [[1e11,1e-6,1e16],[1e15,1e-5,1e14],[1e18,1e-5,1e18],[6.4e18,1e-4,1e18]]) {
 const actual = grContext.compute(dose,tau,NA);
 const equilibrium = SC.np(0,NA);
 const derivative = (dn,source) => {
  const n = equilibrium.n + dn, p = equilibrium.p + dn;
  const excess = dn * (equilibrium.n + equilibrium.p + dn);
  return source - excess / (tau * (n + p + 2 * grContext.ni)) - (4.7e-15 + 2.8e-31*n + 9.9e-32*p)*excess;
 };
 const subdivisions = 200, dt = actual.Tw / (600 * subdivisions);
 let dn = 0;
 for (let i = 1; i < actual.pts.length; i++) {
  const source = i <= 12 ? dose / (0.02 * actual.Tw) : 0;
  for (let j = 0; j < subdivisions; j++) {
   const a = derivative(dn,source), b = derivative(dn+a*dt/2,source);
   const c = derivative(dn+b*dt/2,source), d = derivative(dn+c*dt,source);
   dn += dt*(a+2*b+2*c+d)/6;
  }
  maxDecayError = Math.max(maxDecayError, Math.abs(actual.pts[i][1]-dn)/actual.peak);
 }
}
assert.ok(maxDecayError < 2e-4, `nonlinear optical decay differs from fixed-step reference by ${maxDecayError} of peak`);
for (const type of ['p','n']) for (const doping of [13,15,18]) for (const logTau of [-7,-5,-3]) for (const logG of [12,18,24]) {
 grContext.gN = () => doping;
 grContext.gT = () => logTau;
 grContext.gTy = () => type;
 const N = 10**doping, G = 10**logG, tau = 10**logTau;
 const s = grContext.solve(G), nt = SC.np(type==='n'?N:0,type==='p'?N:0);
 const U = s.dn*(nt.n+nt.p+s.dn) * (1/(tau*(s.n+s.p+2*grContext.ni))+4.7e-15+2.8e-31*s.n+9.9e-32*s.p);
 near(U/G,1,1e-12,'steady optical generation/recombination balance');
 near(Math.exp((s.Efn-s.Efp)/SC.Vt(300)), s.n*s.p/grContext.ni**2,
  1e-13*s.n*s.p/grContext.ni**2,'quasi-Fermi splitting reconstructs np');
}
// Rear Robin boundary and injection flux, with x measured into the sample.
grContext.gT = () => 1;
grContext.gD = () => 12;
grContext.gW = () => 180;
for (const S of [0,10,1e4,1e7,Infinity]) {
 const p=grContext.prof(S), h=1e-7;
 const flux = x => -p.L*(p.f(x+h)-p.f(x-h))/(2*h);
 near(flux(0),1,1e-8,'normalized front injection');
 if (S === Infinity) near(p.f(p.W),0,1e-15,'absorbing rear limit');
 else near(flux(p.W),S*p.L/p.D*p.f(p.W),1e-8,'rear surface flux balance');
}
for (const [x,reflected,hits] of [[-17,3,2],[-6,4,1],[-2,2,0],[6,4,1],[13,3,1],[17,3,2],[30,0,3]]) {
 const hop=grContext.reflectSlab(x,5);
 near(hop.x,reflected,1e-15,'reflect through every slab crossing');
 assert.equal(hop.rearHits,hits,'only rear crossings can cause surface loss');
}
// Competing continuous-time SRH transitions preserve occupation and branching fractions.
let trapSeed=477;
grContext.random = () => { trapSeed=(Math.imul(trapSeed,1664525)+1013904223)>>>0; return (trapSeed+.5)/4294967296; };
vm.runInContext('Math.random = random;',grContext);
const trap = {occ:false,event:null}, trapCounts = {a:0,b:0,c:0,d:0};
let occupied = 0;
for(let t = 0; t < 150000; t++) {
 grContext.advanceTrap(trap,.05,[['a',1],['d',4]],[['b',8],['c',2]],1,trapCounts);
 occupied += Number(trap.occ);
}
near(occupied/150000,1/3,.015,'stationary trap occupation');
near(trapCounts.a/(trapCounts.a+trapCounts.d),.2,.012,'filling branching fraction');
near(trapCounts.b/(trapCounts.b+trapCounts.c),.8,.012,'emptying branching fraction');
assert.ok(Math.abs(trapCounts.a+trapCounts.d-trapCounts.b-trapCounts.c)<=1,'trap event count conserves occupation');
// The lab's forward-exponential fit must not invent a saturation current from
// reverse leakage or an illuminated IV curve.
// A finite-gate-voltage solution must close the charge balance without an artificial surface-voltage ceiling.
for (const type of ['p', 'n']) for (const N of [1e15, 1e17, 1e18]) for (const tox of [1.5e-7, 30e-7]) {
 const m = SC.mosSetup({ Nsub: N, type, tox, phims: -.3, Qox: 2e-9 });
 const atFlatBand = m.psis(m.Vfb, 'lf');
 assert.equal(Math.abs(atFlatBand), 0, 'flat band gives exactly zero surface potential');
 near(m.C(m.Vfb, 'hf'), 1 / (1 / m.Cox + m.LD / m.es), 1e-19, 'flat-band HF Debye capacitance');
 for (const mode of ['lf', 'dd']) for (const offset of [-3, -.1, .1, 1, 3, 450]) {
  const gate = m.Vfb + m.sgn * offset, ps = m.psis(gate, mode);
  near(m.Vg(ps, mode), gate, 3e-11, 'MOS gate voltage closes from the solved potential');
  const dx = offset > 10 ? 1e-3 : 1e-6;
  const delta = m.Qs(m.psis(gate + dx, mode), mode) - m.Qs(m.psis(gate - dx, mode), mode);
  near(m.C(gate, mode) / (-delta / (2 * dx)), 1, 3e-7, 'small-signal capacitance is the differential gate charge');
 }
 const edge = m.sgn * 2 * m.phiF;
 near(m.CAtSurface(edge - m.sgn * 1e-8, 'hf') / m.CAtSurface(edge + m.sgn * 1e-8, 'hf'), 1, 3e-8, 'continuous HF capacitance around threshold');
 const on = m.Vth + m.sgn * 3;
 const minimum = 1 / (1 / m.Cox + m.Wmax / m.es);
 near(m.C(on, 'hf'), minimum, 1e-19, 'HF inversion plateau follows maximum depletion width');
 assert.ok(m.C(on, 'dd') < minimum && m.C(on, 'lf') > minimum, 'deep depletion and low-frequency inversion straddle the HF plateau');
}
// Independent Poisson–Boltzmann quadrature reference: integrate the excess
// minority density through the equilibrium spatial profile, not Qs(lf)-Qs(dd).
const inversionReferences = [
 [1e15, .2, 1.3652025516787451e-18], [1e15, 1, 5.1137691316287615e-15],
 [1e15, 2, 3.171077115205647e-10], [1e15, 2.5, 3.860093727988158e-8],
 [1e17, .2, 3.0779356576986418e-21], [1e17, 1, 4.179776380590745e-16],
 [1e17, 2, 2.6493770881531947e-9], [1e17, 2.5, 1.4557298989501756e-6],
 [1e18, .2, 1.4432834530592336e-22], [1e18, 1, 1.224426226188926e-16],
 [1e18, 2, 7.809688851801172e-9], [1e18, 2.5, 8.544520046901545e-6],
];
let maxInversionChargeError=0;
for(const [N, multiple, reference] of inversionReferences){
 for(const type of ['p','n']){
  const m=SC.mosSetup({Nsub:N,type,tox:5e-7,phims:0}),sg=type==='p'?1:-1;
  const psi=sg*multiple*m.phiF,gate=m.Vg(psi,'lf');
  near(m.psis(gate,'lf'),psi,1e-12,'MOS surface-potential inversion');
  const error=Math.abs(m.Qinv(gate)/reference-1);
  maxInversionChargeError=Math.max(maxInversionChargeError,error);
  assert.ok(error<3e-6,'MOS excess minority sheet charge');
  near(m.Qinv(m.Vg(-sg*.2,'lf')),0,1e-30,'no inversion charge in accumulation');
  // Debye screening is the small-band-bending limit of the full charge law.
  const slope=m.es/m.LD*Math.sqrt(1+(m.ni/N)**2);
  for(const u of [-1e-8,1e-8]){
   const smallPsi=sg*u*m.Vt;
   near(m.Qs(smallPsi,'lf')/(-slope*smallPsi),1,1e-7,'MOS Debye limit at flat band');
  }
 }
}
// A neutral illuminated slab with equal electron/hole mobilities has zero field.
// Its SRH law reduces exactly to U=(n-ni)/(2*tau), so the spatial solution is analytic.
const equalMobilityMat={...SC.MAT.Si,mun:1000,mup:1000},photoTau=1e-6,photoG=1e20,photoLength=.02;
const photoDevice=new SC.Device1D({mat:equalMobilityMat,T:300,L:photoLength,N:401,
 doping:()=>0,mobility:'const',taun:photoTau,taup:photoTau,G:()=>photoG});
const photo=photoDevice.state(),photoDiffLength=Math.sqrt(2*1000*SC.Vt(300)*photoTau);
let photoProfileError=0;
for(let i=0;i<photo.x.length;i++){
 const expected=photo.ni+2*photoG*photoTau*(1-Math.cosh((photo.x[i]-photoLength/2)/photoDiffLength)/Math.cosh(photoLength/(2*photoDiffLength)));
 photoProfileError=Math.max(photoProfileError,Math.abs(photo.n[i]-expected)/(2*photoG*photoTau));
}
assert.ok(photo.converged&&photoProfileError<1e-4,'illuminated neutral-slab analytic profile');
// During a transfer, one bound electron and one vacancy must each be drawn once.
(function(){
const source=crystal;let hole=source.slice(source.indexOf('  (function () {',source.indexOf('6. 정공 애니메이션')),source.indexOf('  /* ============================================================ 7. 직접'));
const elements=new Map(),callbacks={},dots=[];const noop=()=>{};
const palette=new Proxy({},{get:()=> '#888'}),gradient={addColorStop:noop};
const ctx=new Proxy({},{get:(t,k)=>k==='createRadialGradient'?()=>gradient:(t[k]||noop),set:(t,k,v)=>(t[k]=v,true)});
const PB={range:()=>()=>1,seg:()=>()=>1,canvas:(id,draw)=>(callbacks.draw=draw,{canvas:{},redraw:noop}),loop:(el,step)=>{callbacks.step=step;},palette:()=>palette,matColor:()=> '#888',mix:()=> '#888',alpha:()=> '#888',text:noop,arrow:noop,stat:noop,lerp:(a,b,t)=>a+(b-a)*t,clamp:(x,a,b)=>Math.max(a,Math.min(b,x))};
const testContext=vm.createContext({PB,SC:{dot:(ctx,x,y,kind)=>dots.push({x,y,kind})},document:{getElementById:id=>{if(!elements.has(id))elements.set(id,{addEventListener:noop});return elements.get(id);}}});
const marker=hole.lastIndexOf('  })();');assert(marker>=0);
hole=hole.slice(0,marker)+`  globalThis.setupTransfer=()=>{
 lay=layout(400,400);free=[];flashes=[];recomb=0;
 const toBond=lay.bonds.find(b=>b.nb.length>1),fromBond=toBond.nb[0],to=toBond.slots[0],from=fromBond.slots[0];
 to.full=false;const vacancy={b:toBond,s:to,t:0};vac=[vacancy];hop=[{from,to,T:.28,t:.1,v:vacancy,nb:fromBond}];
 return {slots:lay.bonds.length*2,cutoff:lay.bot};
 };
 globalThis.activeTransfers=()=>hop.length;
`+hole.slice(marker);
vm.runInContext(hole,testContext);const fixture=testContext.setupTransfer();callbacks.draw(ctx,400,400);const topDots=dots.filter(d=>d.y<fixture.cutoff);
assert.equal(topDots.filter(d=>d.kind==='e').length,fixture.slots-1,'bound electron rendered once during hop');
assert.equal(topDots.filter(d=>d.kind==='h').length,1,'one vacancy rendered once during hop');
callbacks.step(.01);assert.equal(testContext.activeTransfers(),1,'one vacancy cannot start simultaneous transfers');


})();
// Carrier statistics: independent activation-energy derivative and complete UI range.
const carriers=read('chapters/carriers.html'), carrierContext=vm.createContext({SC,kB:SC.kBeV});
vm.runInContext(['correctedActivationEnergy','carrierRegime','invF12'].map(n=>block(carriers,n)).join('\n')+'\nlet degenCache=null;'+block(carriers,'degenCurves')+'\nglobalThis.h={correctedActivationEnergy,carrierRegime,invF12,degenCurves};',carrierContext);
const h=carrierContext.h;
for(const mat of Object.values(SC.MAT))for(const T of [150,300,500,1000]){
 const derivative=-mat.a*T*(T+2*mat.b)/(T+mat.b)**2;
 near(h.correctedActivationEnergy(mat,T),(SC.Eg(mat,T)-T*derivative)/2,1e-5,'intrinsic activation energy');
}
near(h.correctedActivationEnergy({...SC.MAT.Si,a:0},300),SC.MAT.Si.Eg0/2,1e-10,'constant gap activation limit');
for(const T of [15,77,300,500,800]){
 const r=SC.equilibrium('Si',T,{Nd:1e18,Na:0,Ed:.2,Ea:.045});
 assert.ok(r.n<.9e18,'deep donors remain below extrinsic plateau');
 assert.equal(h.carrierRegime(r,1e18),'동결','no invented extrinsic regime');
}
assert.equal(h.carrierRegime({n:1e16,ni:1e10},1e16),'외인성');
assert.equal(h.carrierRegime({n:20e16,ni:20e16},1e16),'진성');
for(const mat of ['Si','GaAs'])for(const T of [77,300,500])for(const N of [1e15,1e18,1e20]){
 const ratio=N/SC.Nc(mat,T),eta=h.invF12(ratio),bounds=h.degenCurves(eta,ratio);
 near(SC.F12(eta)/ratio,1,1e-9,'Fermi integral inversion');
 assert.ok(bounds.left<eta&&eta<bounds.right&&bounds.ymin<ratio&&ratio<bounds.ymax,'carrier point visible across UI range');
}
// BJT: check the bias explorer's geometry, current conservation and reciprocity.
const bjt = read('chapters/bjt.html');
const bjtContext = vm.createContext({SC});
const modelStart = bjt.indexOf('  const T = 300, Vt');
const modelEnd = bjt.indexOf('  /* ================= 그리기 도우미', modelStart);
vm.runInContext(bjt.slice(modelStart, modelEnd) + '\nglobalThis.defaults = DEF;', bjtContext);
const bjtOptions = {...bjtContext.defaults, WB: 0.25e-4};
let bjtBiasCases = 0;
for (const vbe of [-1, -0.6, 0, 0.45, 0.7, 0.8]) {
 for (const vbc of [-3, -2, 0, 0.6, 0.7, 0.75]) {
  const m = bjtContext.model(bjtOptions, vbe, vbc);
  assert.ok(m.valid, 'both depletion regions leave neutral material over the explorer range');
  near((m.IE - m.IC - m.IB) / (Math.abs(m.IE) + Math.abs(m.IC) + 1e-30), 0, 1e-13, 'BJT terminal current conservation');
  near(m.aF * m.IES / m.IS, 1, 1e-14, 'forward transport reciprocity');
  near(m.aR * m.ICS / m.IS, 1, 1e-14, 'reverse transport reciprocity');
  for (const x of [0, bjtOptions.WB]) {
   near(bjtContext.EcAt(bjtOptions, m.g, x - 1e-13), bjtContext.EcAt(bjtOptions, m.g, x + 1e-13), 2e-7, 'junction energy continuity');
  }
  bjtBiasCases++;
 }
}
const reverse = bjtContext.model(bjtOptions, -1, 0.7);
near((-reverse.IE / reverse.IB) / reverse.bR, 1, 1e-10, 'reverse output current leaves through the emitter under the reverse sign convention');
const punched = bjtContext.model({...bjtOptions, WB: 0.12e-4}, 0.45, -3);
assert.equal(punched.g.WBn, 0);
assert.equal(punched.valid, false);
assert.equal(punched.IC, undefined);
// Optical models: independent depth quadrature and solar operating point checks.
const opto = read('chapters/opto.html');
const optoContext = vm.createContext({SC, PB: {lerp: (a, b, t) => a + (b - a) * t}});
vm.runInContext(['collectedFraction', 'solarCurve', 'threshold', 'fresT'].map(name => block(opto, name)).join('\n'), optoContext);
function simpson(fn, start, end, n) {
 const dx = (end - start) / n;
 let sum = fn(start) + fn(end);
 for (let i = 1; i < n; i++) sum += (i % 2 === 0 ? 2 : 4) * fn(start + i * dx);
 return dx * sum / 3;
}
let optoCollectionCases = 0;
for (const a of [0, 0.000068, 0.04, 1/0.15, 177]) for (const xj of [0.03, 0.2, 1]) for (const W of [0.1, 3, 80]) for (const L of [1, 1000]) {
 const geom = {xj, xd: xj + W, L, Ls: 0.15};
 const cuts = [0, xj, geom.xd, 300];
 const flux = (x) => a * Math.exp(-a * x);
 const front = x => flux(x) * Math.exp((x - xj) / geom.Ls);
 const back = x => flux(x) * Math.exp((geom.xd - x) / L);
 const ref = [front, flux, back].reduce((sum, fn, i) => sum + simpson(fn, cuts[i], cuts[i + 1], 100000), 0);
 const actual = optoContext.collectedFraction(a, geom, 300);
 near(actual, ref, 3e-8, 'finite-thickness optical collection');
 assert.ok(actual >= 0 && actual <= -Math.expm1(-a * 300) + 1e-14);
 optoCollectionCases++;
}
let solarCases = 0;
for (const T of [250, 300, 350]) for (const sun of [0.1, 1, 2]) for (const Rs of [0, 0.5, 5]) for (const Rsh of [10, 1e5]) {
 const Vt = SC.Vt(T), JL = 0.04 * sun * (1 + 5e-4 * (T - 300));
 const {J0, Jgr0} = SC.diodeJ({Na: 1e16, Nd: 1e19, V: 0, T, taun: 1e-4, taup: 1e-7, Wn: 0.3e-4, tauG: 1e-4});
 const result = optoContext.solarCurve(JL, J0, Jgr0, Vt, Rs, Rsh);
 assert.equal(result.Jat(result.Voc), 0);
 assert.ok(result.pts.every(([V, J], i, pts) => V >= 0 && J >= 0 && (!i || V > pts[i - 1][0])));
 for (const V of [0, result.Vm, 0.99 * result.Voc]) {
  const J = result.Jat(V), Vj = V + J * Rs;
  near(J + J0 * Math.expm1(Vj / Vt) + Jgr0 * Math.expm1(Vj / (2 * Vt)) + Vj / Rsh, JL, 2e-12, 'terminal solar-current residual');
 }
 const Vjm = result.Vm + Rs * result.Jm;
 const dJ = -(J0 * Math.exp(Vjm / Vt) + 0.5 * Jgr0 * Math.exp(Vjm / (2 * Vt))) / Vt - 1 / Rsh;
 near(result.Jm + result.Vm * dJ / (1 - Rs * dJ), 0, 1e-7, 'solar MPP stationary condition');
 solarCases++;
}
const heat = 0.00135, laserThreshold = optoContext.threshold(40, heat, 60);
near(laserThreshold * Math.exp(-heat * laserThreshold), 40, 1e-11, 'self-heated laser threshold');
assert.equal(optoContext.threshold(60, heat, 60), null);
near(optoContext.fresT(1.5, 1.5, Math.PI / 4), 1, 1e-14, 'index-matched interface');
assert.equal(optoContext.fresT(3.5, 1, Math.PI / 4), 0);
const sqStart = opto.indexOf('    const K = ((2 * Math.PI)');
const sqEnd = opto.indexOf('    let curve = [], curve1 = [];', sqStart);
vm.runInContext('const {q, h, kBeV} = SC, c = 299792458;\n' + opto.slice(sqStart, sqEnd), optoContext);
const blackbody = (E, T) => E === 0 ? 0 : E * E / Math.expm1(E / (SC.kBeV * T));
const powerNorm = simpson(E => E * blackbody(E, 5778), 0, 16, 10000);
for (const Eg of [0.5, 0.83755, 1.12, 1.34, 2.2555, 3]) {
 const one = optoContext.sq(Eg, 1), high = optoContext.sq(Eg, 1000);
 const ref = 1000 * simpson(E => blackbody(E, 5778), Eg, 16, 10000) / powerNorm;
 near(one.Jsc / ref, 1, 2e-6, 'SQ photon integral at the exact band edge');
 near(high.Jsc / one.Jsc, 1000, 1e-10, 'SQ current scales with concentration');
 assert.ok(high.Voc > one.Voc && high.eta > one.eta);
 for (const r of [one, high]) {
  assert.ok([r.Pnot, r.Ptherm, r.Pother, r.Pm].every(P => P > 0));
  near((r.Pnot + r.Ptherm + r.Pother + r.Pm) / r.Pin, 1, 1e-13, 'SQ power balance');
 }
}
// Heterojunctions: inspect the interface and the roots that appear just below a finite barrier.
const hetero = read('chapters/hetero.html');
const heteroContext = vm.createContext({SC});
vm.runInContext(hetero.slice(hetero.indexOf('  var KT ='), hetero.indexOf('  /* ---------------------------------------------------------------- 그리기')), heteroContext);
const {MATS, KQ, qwLevels, qwPsi, solveHJ, offsets, hemt} = heteroContext;
let wellEdgeCases = 0;
for (const V of [0.05, 0.23, 0.52]) {
 for (const mw of [0.041, 0.067, 0.35]) {
  for (const mb of [0.075, 0.6]) {
   const thresholdWidth = Math.PI / (KQ * Math.sqrt(mw * V));
   assert.equal(qwLevels(V, mw, mb, thresholdWidth).length, 1, 'a state at the continuum edge is not bound');
   const L = thresholdWidth * 1.00001, bound = qwLevels(V, mw, mb, L);
   assert.equal(bound.length, 2, 'shallow bound state below the barrier is found');
   assert.ok(bound[1].odd && bound[1].E < V);
   for (const l of bound) {
    const x = L / 2, delta = 1e-5, at = qwPsi(l, V, mw, mb, L, x);
    const left = (at - qwPsi(l, V, mw, mb, L, x - delta)) / (delta * mw);
    const right = (qwPsi(l, V, mw, mb, L, x + delta) - at) / (delta * mb);
    near(left, right, 1e-4, 'finite-well mass-weighted derivative continuity');
   }
   wellEdgeCases++;
  }
 }
}
for (const mode of ['and', 'exp']) {
 for (const [A, B] of [[MATS.AlGaAs, MATS.GaAs], [MATS.InP, MATS.InGaAs], [MATS.GaAs, MATS.GaAs]]) {
  const {dEc, dEv} = offsets(A, B, mode);
  for (const [NA, NB] of [[1e17, -1e17], [1e15, -1e19], [-1e18, 1e16], [1e18, 1e15]]) {
   const r = solveHJ({A, B, NA, NB, dEc});
   assert.ok(r.conv, 'heterojunction Poisson solver converges');
   near(r.V1 + r.V2, r.psiR - r.psiL, 1e-14, 'bending uses one continuous interface potential');
   near(r.boundary[1].ec - r.boundary[0].ec, dEc, 1e-14, 'conduction band interface step');
   near(r.boundary[1].ev - r.boundary[0].ev, dEv, 1e-14, 'valence band interface step');
   assert.ok(Math.abs(r.QL + r.QR) <= 0.01 * Math.max(Math.abs(r.QL), Math.abs(r.QR), 1e8), 'finite-domain net charge');
  }
 }
}
for (const dd of [15e-7, 50e-7]) for (const ds of [0, 30e-7]) for (const Nd of [2e17, 4e18]) {
 const opts = {x: 0.3, dd, ds, Nd, phiB: 0.9, Ed: 0.06};
 const off = hemt({...opts, Vg: -1.5}), on = hemt({...opts, Vg: 0.8});
 assert.ok(on.ns >= off.ns && on.ns <= on.nsMax);
 near(on.G(on.nsRaw), 0.1, 1e-12, 'channel charge satisfies the gate-voltage condition');
 const d = Math.min(on.nsMax / Nd, dd), F = heteroContext.fermiOf(on.nsMax);
 const minEnergy = on.dEc - F.EF - SC.q * on.nsMax * (ds + d) / on.eps2 + SC.q * Nd * d * d / (2 * on.eps2);
 near(minEnergy, opts.Ed, 1e-12, 'parallel conduction evaluated within the doped layer');
}
// Power devices: unipolar breakdown, switching-energy integration and thermal balance.
const powerChapter = read('chapters/power.html');
const powerContext = vm.createContext({SC, Q: SC.q, EPS0: SC.eps0});
const ionStart = powerChapter.indexOf('  const ION =');
const ionEnd = powerChapter.indexOf('  /* ============================================================ 1. 이온화', ionStart);
const switchStart = powerChapter.indexOf('  const DEV =');
const switchEnd = powerChapter.indexOf('  (function () {', switchStart);
vm.runInContext(powerChapter.slice(ionStart, ionEnd) + powerChapter.slice(switchStart, switchEnd) +
 '\nglobalThis.ion = ION; globalThis.dev = DEV;', powerContext);
let powerAvalancheCases = 0;
for (const key of Object.keys(powerContext.ion)) {
 const m = powerContext.ion[key];
 for (const N of [1e14, 1e15, 1e17]) {
  const b = powerContext.bvCalc(m, N, 0, 400);
  const k = SC.q * N / (m.eps * SC.eps0);
  near(b.V, 0.5 * b.E * b.W, 1e-9, 'NPT field area');
  if (key === 'Si') near(b.E / (8 * k / 1.8e-35) ** (1 / 8), 1, 3e-6, 'Fulop closed-form breakdown');
  const r = powerContext.ionI(m, N, Math.sqrt(0.97) * b.E, 0, 400);
  near(r.M / (1 / (1 - r.In)), 1, 5e-10, 'electron multiplication matches its unscaled integral');
  const thin = powerContext.bvCalc(m, N, b.W / 2, 400);
  assert.ok(thin.pt);
  near(thin.V, thin.E * thin.W - 0.5 * k * thin.W * thin.W, 1e-9, 'PT field area');
  powerAvalancheCases++;
 }
}
let switchingCases = 0;
for (const d of Object.values(powerContext.dev)) for (const R of [3, 40]) for (const mode of ['on', 'off']) {
 const r = powerContext.dptRun(d, mode, 400, 20, R);
 const fine = powerContext.dptRun(d, mode, 400, 20, R, 0.025e-9);
 assert.ok(r.settled && fine.settled && r.E > 0);
 assert.ok(r.out.every(([t, vg, vd, id, p]) => [t, vg, vd, id, p].every(Number.isFinite) && vd >= 0 && vd <= 400 + 1e-8 && p >= 0));
 assert.ok(r.out.filter(([t]) => t <= 10e-9).every(([, , , , p]) => p === 0));
 near(r.E / fine.E, 1, 0.04, 'DPT energy converges as the timestep shrinks');
 switchingCases++;
}
const {thermalPoint} = powerContext;
const thermal = thermalPoint(50, 1.2, 10, T => 5 + 0.02 * (T - 50), 400);
near(thermal.Tj, 50 + 18 / 0.976, 1e-5, 'self-heated analytic linear thermal balance');
assert.equal(thermalPoint(100, 4, 1, T => 10 + 0.28 * (T - 100), 500), null);
// RF terminal Jacobian, gain crossing, and noise reference limits.
const rfHtml = read('chapters/rf.html');
const rfContext = vm.createContext({SC});
vm.runInContext(
 rfHtml.slice(rfHtml.indexOf('  const T = 300'), rfHtml.indexOf('  /* ---- 표시 도우미')) +
 block(rfHtml, 'cross') +
 '\nObject.assign(globalThis, {devP, idExt, op, twoPort, stability, noiseParams, noiseOf, noiseAtWidth, gateR, scaleOp});',
 rfContext
);
let rfBiasCases = 0;
let maxRfJacobianError = 0;
for (const L of [30, 65, 130, 250, 500]) for (const W of [1, 20]) {
 const p = rfContext.devP(L, W);
 for (const vg of [0.2, 0.3, 0.55, 0.8, 1.0, 1.2]) for (const vd of [0.1, 0.3, 1, 1.2]) {
  const o = rfContext.op(L, W, vg, vd), h = 1e-5;
  const gm = (rfContext.idExt(p, vg + h, vd) - rfContext.idExt(p, vg - h, vd)) / (2 * h);
  const gds = (rfContext.idExt(p, vg, vd + h) - rfContext.idExt(p, vg, vd - h)) / (2 * h);
  for (const [actual, reference] of [[o.gm, gm], [o.gds, gds]]) {
   const error = Math.abs((actual - reference) / reference);
   maxRfJacobianError = Math.max(maxRfJacobianError, error);
   assert.ok(error < 0.002, 'RF terminal derivatives agree with direct DC perturbation');
  }
  const {Y} = rfContext.twoPort(o, 12, 1e3, 0);
  near(Y[1][0].re / gm, 1, 0.002, 'Y21 in the low-frequency limit; series resistances are counted once');
  near(Y[1][1].re / gds, 1, 0.002, 'Y22 in the low-frequency limit');
  rfBiasCases++;
 }
}
near(rfContext.cross([10, 100], [10, -10]), Math.sqrt(1000), 1e-12, '0 dB crossing is log-frequency interpolated');
assert.ok(Number.isNaN(rfContext.cross([10, 100, 1000], [5, 1, NaN])));
assert.ok(Number.isNaN(rfContext.cross([10, 100], [-5, 5])));
const {K, detMag} = rfContext.stability([[0.2, 0.1], [2, 0.3]].map(row => row.map(re => ({re, im:0}))));
near(detMag, 0.14, 1e-12, 'Rollett determinant');
near(K, 2.224, 1e-12, 'Rollett stability factor');
const resistorNoise = rfContext.noiseParams({gm:0.02, Cgs:80e-15, Cgd:10e-15, Rg:12, gd0:0.02, gamma:0, delta:0}, 5e9);
near(resistorNoise.Rn, 12 * 300 / 290, 1e-12, 'gate resistor noise with 290 K source reference');
near(resistorNoise.F(1 / 50, 0), 1 + 12 / 50 * 300 / 290, 1e-12, 'series gate resistor noise factor');
let rfNoiseCases = 0;
for (const L of [30, 65, 250]) for (const vg of [0.3, 0.55, 1.1]) {
 const o1 = rfContext.op(L, 1, vg, 1);
 const params = (o, w, f, gamma) => rfContext.noiseParams(
  rfContext.noiseOf(o, rfContext.gateR(o, L, 1, w, true, 10, 10).Rg, gamma), f
 );
 for (const f of [0.5e9, 2.4e9, 28e9, 100e9]) for (const gamma of [0.67, 1, 2.5]) {
  const unit = params(o1, 1, f, gamma);
  for (const W of [3.2, 60, 1000]) {
   const o = rfContext.scaleOp(o1, W), r = params(o, W, f, gamma);
   near(r.Fmin / unit.Fmin, 1, 1e-12, 'minimum NF is independent of the number of identical fingers');
   near(r.F(r.Gopt, r.Bopt) / r.Fmin, 1, 1e-12, 'minimum NF is attained at the stated optimal admittance');
   const NF50 = r.F(1 / 50, r.Bopt);
   assert.ok(NF50 >= r.Fmin - 1e-12);
   near(rfContext.noiseAtWidth(unit, 1 / 50, W) / NF50, 1, 1e-12, 'challenge width search matches direct NF evaluation');
   rfNoiseCases++;
  }
 }
}
// Reliability tails, HCI worst bias, snapback events, and the delay guardband.
const relHtml = read('chapters/reliability.html');
const relContext = vm.createContext({SC, kB:8.617333e-5});
vm.runInContext(
 relHtml.slice(relHtml.indexOf('  const cumulativeHazard'), relHtml.indexOf('  const fF')) +
 relHtml.slice(relHtml.indexOf('  const HC ='), relHtml.indexOf('  /* ================================================== 2.')) +
 ['esdPulse', 'voltageGuardband', 'compoundShift'].map(name => block(relHtml, name)).join('\n') +
 relHtml.split('\n').find(line => line.startsWith('  const alphaDelay')) +
 '\nObject.assign(globalThis, {cumulativeHazard, failureFromHazard, Wb, Fw, etaArea, weibullTime, arrhenius, HC, columnHazard, maxPassingVoltage, alphaDelay});',
 relContext
);
const {etaArea, weibullTime, failureFromHazard, Wb, Fw, columnHazard, arrhenius, maxPassingVoltage, HC, esdPulse, voltageGuardband, alphaDelay, compoundShift} = relContext;
let reliabilityWeibullCases = 0;
for (const beta of [0.8, 1, 1.4, 2, 4]) for (const area of [1, 1000, 100000]) for (const F of [1e-16, 1e-6, 1e-4, 0.5, 0.99]) {
 const t = weibullTime(etaArea(1000, area, beta), F, beta);
 near(failureFromHazard(area * (t / 1000) ** beta) / F, 1, 5e-14, 'independent weakest-link Weibull quantile');
 near(Fw(Wb(F)) / F, 1, 5e-14, 'stable Weibull transform in the lower tail');
 reliabilityWeibullCases++;
}
for (let n = 1; n <= 7; n++) {
 const t = 1e-10, alpha = 0.6;
 const slope = (Math.log(columnHazard(2*t, alpha, n, 40)) - Math.log(columnHazard(t, alpha, n, 40))) / Math.log(2);
 near(slope, n*alpha, 1e-5, 'early independent-column slope is n alpha');
}
for (const t of [1e-12, 0.5, 10]) near(columnHazard(t, 0.6, 1, 40), 40 * t ** 0.6, 1e-9, 'single-layer exact cumulative hazard');
const arrheniusReference = Math.exp((0.7 * 1.602176634e-19 / 1.380649e-23) * 70 / (328.15 * 398.15));
near(arrhenius(0.7, 328.15, 398.15), arrheniusReference, 0.00002, '125 C to 55 C Arrhenius ratio');
assert.equal(maxPassingVoltage(v => 10 - v, 0.8, 1.6, 10), null);
assert.equal(maxPassingVoltage(v => 10 - v, 0.8, 1.6, 8), 1.6);
near(maxPassingVoltage(v => 10 - v, 0.8, 1.6, 8.75), 1.25, 1e-12, 'descending lifetime crossing');
let reliabilityHciCases = 0;
for (const vd of [1.8, 1.98, 2.7, 3.6]) for (const ldd of [false, true]) {
 const atPeak = HC.dev(HC.peakSub(vd, ldd, 50), vd, ldd);
 for (let i = 0; i <= 54; i++) assert.ok(HC.dev((600 + 50*i)/1000, vd, ldd).Isub <= atPeak.Isub);
 const min = HC.tau(HC.dev(HC.worst(vd, ldd), vd, ldd));
 assert.ok(min < HC.tau(HC.dev(HC.peakSub(vd, ldd), vd, ldd)));
 reliabilityHciCases++;
}
let reliabilityEsdCases = 0;
for (const kind of ['hbm', 'cdm']) for (const mode of ['none', 'dio', 'gg']) for (const V of [100, 1000, 7943]) for (const W of [50, 200, 1000]) {
 const d = {vdd:1.8, bv:8, vt1:7, vh:4.5};
 const r = esdPulse(d, mode, kind, V, W);
 near(r.tr.find(p => p[0] === r.tpk)[1], V / (kind === 'hbm' ? 1500 : 100), 1e-12, 'normalized discharge peak');
 near(Math.max(...r.tr.filter(p => Number.isFinite(p[2])).map(p => p[2])), r.Vpk, 1e-10, 'max pin voltage agrees with event-resolved trace');
 if (mode === 'gg') {
  const trigger = r.tr.find(p => p[1] === r.triggerI && p[2] === d.vt1);
  assert.ok(trigger && trigger[0] < r.tpk);
  assert.ok(r.tr.some(p => p[0] === trigger[0] && p[2] < d.vt1));
  near(r.pinAtPeak, d.vh + (r.Ip - r.holdI) * 800 / W, 1e-12, 'current-peak pair is on the holding branch');
 } else if (mode === 'none') {
  assert.equal(r.Vpk, d.bv);
  assert.ok(Number.isNaN(r.pinAtPeak));
  assert.ok(r.tr.filter(p => p[0] > r.breakdown).every(p => Number.isNaN(p[2])));
 }
 reliabilityEsdCases++;
}
assert.equal(voltageGuardband(0.75, 0.4, 0.4), 0);
for (const vt of [0.42, 0.48, 0.6, 0.72]) {
 const g = voltageGuardband(0.75, 0.4, vt);
 near(alphaDelay(0.75 + g, vt), alphaDelay(0.75, 0.4), 1e-11, 'guardband restores target delay');
}
let relSeed = 55;
const relRand = () => ((relSeed = (Math.imul(1664525, relSeed) + 1013904223) >>> 0) + 0.5) / 2**32;
assert.equal(compoundShift(0, 0.01, relRand), 0);
const relSamples = Array.from({length: 40000}, () => compoundShift(5, 0.008, relRand));
const relMean = relSamples.reduce((sum, v) => sum + v, 0) / relSamples.length;
const relVariance = relSamples.reduce((sum, v) => sum + (v-relMean)**2, 0) / relSamples.length;
near(relMean, 0.04, 0.0006, 'compound-Poisson shift mean');
near(relVariance, 2*0.008*0.04, 0.000023, 'compound-Poisson shift variance');
const relChallengeCode = relHtml.slice(relHtml.indexOf('    const TJ = 378.15'), relHtml.indexOf('    let cv; const rr', relHtml.indexOf('    const TJ = 378.15')));
const relGrid = vm.runInContext(relChallengeCode + `
 const winners = [];
 for (let mv = 600; mv <= 1000; mv += 5) for (let gb = 0; gb <= 40; gb++) {
  const r = ev(mv / 1000, gb);
  if (r.okF && r.okL && r.okG) winners.push([mv, gb]);
 }
 ({winners, vmin});`, relContext);
assert.ok(relGrid.winners.length > 0);
assert.equal(relGrid.vmin, relGrid.winners[0][0] / 1000);
assert.equal(relGrid.winners[0][0], 810);
assert.equal(relGrid.winners[0][1], 19);
// Independent charge, energy and circuit-balance limits for the ESD simulators.
const esdHtml = read('chapters/esd.html');
const esdContext = vm.createContext({});
vm.runInContext(
 esdHtml.slice(esdHtml.indexOf('  const logspace'), esdHtml.indexOf('  function ctrlOff')) +
 esdHtml.slice(esdHtml.indexOf('  const dexp'), esdHtml.indexOf('  // 호버로')) +
 esdHtml.slice(esdHtml.indexOf('  const HBM_TR'), esdHtml.indexOf('  /* ================================================== 1.')) +
 ['ggnmosCurve','splitCurrent','seedTrace'].map(name=>block(esdHtml,name)).join('\n') +
 '\nObject.assign(globalThis,{hbm,HBM_TP,iec,IEC_TP,cdmWave});',
 esdContext
);
const {hbm, HBM_TP, iec, IEC_TP, cdmWave, ggnmosCurve, splitCurrent, seedTrace} = esdContext;
near(hbm(HBM_TP, 3000), 2, 1e-12, 'HBM short-circuit peak at 3 kV');
for (const [time,current] of [[IEC_TP,30],[30,16],[60,8]]) near(iec(time,8000),current,1e-5,'IEC model calibration at 8 kV');
let esdCdmCases = 0;
const esdCriticalCpf = (4 * 12e-9 / 50**2) * 1e12;
for (const cpf of [2, 6, esdCriticalCpf*(1-1e-8), esdCriticalCpf, esdCriticalCpf*(1+1e-8), 20, 60]) {
 const C = cpf * 1e-12, w = cdmWave(cpf), dtNs = 0.001;
 let charge = 0, energy = 0;
 for (let k=0;k<50000;k++) {
  const i = w.f((k + 0.5)*dtNs);
  charge += i * dtNs * 1e-9;
  energy += 50 * i**2 * dtNs * 1e-9;
 }
 near(charge/C, 1, 2e-6, 'signed RLC time integral equals initial capacitor charge');
 near(energy/(C/2), 1, 2e-6, 'all initial capacitor energy dissipates in the RLC resistance');
 assert.ok(w.f(w.tp*.99) < w.pk && w.f(w.tp*1.01) < w.pk);
 near(w.f(w.tp)/w.pk, 1, 1e-13, 'CDM peak aligns with waveform');
 if (cpf < 10) {
  const omega = Math.sqrt(1/(12e-9*C) - (50/(2*12e-9))**2);
  assert.ok(w.f(1e9*1.5*Math.PI/omega) < 0);
 }
 esdCdmCases++;
}
let esdGgCases = 0;
for (const BV of [5,7.5,11]) for (const beta of [2,8,50]) for (const Rsub of [100,800,10000]) for (const W of [50,200,400]) {
 const o = ggnmosCurve(BV,beta,Rsub,W);
 near(o.pts.at(-1)[1],0.005*W,2e-12,'exact GGNMOS It2 endpoint current');
 assert.ok(o.pts.every(([v,i])=>Number.isFinite(v) && v>=0 && i>0));
 assert.ok(o.pts.every((p,k)=>!k || p[1]>=o.pts[k-1][1]));
 if (Number.isFinite(o.Vt1)) assert.ok(o.It1<o.Ih && o.Vt1>=o.Vh);
 for (const [v,i] of o.pts.slice(-4)) {
  const normalizedJunction = (v - i*600/W) / BV;
  const multiplication = 1/(1-normalizedJunction**4), ic = i/multiplication-1e-12*W;
  const vbe = .02585*Math.log1p(ic/(1e-17*W));
  near((1-1/multiplication)*i, vbe/Rsub+ic/beta, 1e-11, 'GGNMOS base-node avalanche and recombination current balance');
 }
 esdGgCases++;
}
let esdSeedCases=0;
for (const type of ['dio','snap']) for (const tvs of [null,6,12]) for (const R of [0,5,20]) for (const kv of [1,4,8]) {
 const r = seedTrace(kv,tvs,R,type);
 for (const [,i,it,ic] of r.out) {
  assert.ok(it>=0 && ic>=0);
  near(it+ic,i,1e-12,'SEED charge path current sum');
  if (tvs && it>0 && ic>0) {
   const vChip = type==='dio'?1.5:4.5-0.02*1.5;
   near(tvs+.1*it,vChip+(R+(type==='dio'?1.2:1.5))*ic,1e-11,'both SEED branches share the same node voltage');
  }
 }
 near(r.cpk,Math.max(...r.out.map(p=>p[3])),1e-12,'SEED peak is plotted');
 assert.ok(r.frac>=0 && r.frac<=1+1e-12);
 esdSeedCases++;
}
assert.equal(splitCurrent(3,6,.1,1.5,1.2).tv,0);
assert.equal(seedTrace(8,6,0,'snap').cpk,0);
assert.ok(seedTrace(8,12,0,'snap').cpk>1);
assert.ok(seedTrace(8,6,20,'dio').ok);
// Device Lab: finite-volume balance, optical generation and exact-bias bookkeeping.
const labHtml = read('chapters/lab.html');
const labContext = vm.createContext({SC, UM:1e-4});
vm.runInContext(
 labHtml.slice(labHtml.indexOf('  function makeDev('), labHtml.indexOf('  /* ================================================================\n     런타임 상태')) +
 block(labHtml, 'analyzeIV') +
 '\nObject.assign(globalThis,{presetState,buildModel,makeDev,analyzeIV});', labContext
);
const {presetState,buildModel,makeDev,analyzeIV} = labContext;
let labBiasCases = 0, labMaxCurrentClosure = 0, labMaxPoissonResidual = 0;
function labBalance(d, m) {
 const s = d.state(), {x,psi,n,p} = s, {mat,T} = m.opts, es = SC.eps0 * SC.mat(mat).eps;
 const jn = [], jp = [];
 for (let i = 0; i < x.length - 1; i++) {
  const dz = (psi[i+1]-psi[i])/s.Vt, bp = SC.bernoulli(dz), bm = SC.bernoulli(-dz);
  const mob = carrier => (SC.mobility(mat,s.Nt[i],T,carrier)+SC.mobility(mat,s.Nt[i+1],T,carrier))/2;
  jn.push(SC.q*s.Vt*mob('n')*(n[i+1]*bp-n[i]*bm)/(x[i+1]-x[i]));
  jp.push(SC.q*s.Vt*mob('p')*(p[i]*bp-p[i+1]*bm)/(x[i+1]-x[i]));
 }
 for (let i=1;i<x.length-1;i++) {
  const h = (x[i+1]-x[i-1])/2;
  const left = (psi[i]-psi[i-1])/(x[i]-x[i-1]), right = (psi[i+1]-psi[i])/(x[i+1]-x[i]);
  const charge = SC.q*h/es*(p[i]-n[i]+s.C[i]);
  const scale = Math.abs(right)+Math.abs(left)+SC.q*h/es*(p[i]+n[i]+Math.abs(s.C[i]))+1;
  labMaxPoissonResidual = Math.max(labMaxPoissonResidual,Math.abs(right-left+charge)/scale);
  const src = SC.q*h*(s.R[i]-s.G[i]);
  const dJn = jn[i]-jn[i-1], dJp = jp[i]-jp[i-1];
  const absolute = Math.max(Math.abs(dJn-src),Math.abs(dJp+src));
  const signal = Math.max(1e-8,Math.abs(s.J),Math.abs(src));
  // The unreconstructed face differences in heavily doped material are roundoff limited.
  labMaxCurrentClosure = Math.max(labMaxCurrentClosure,absolute);
  assert.ok(absolute <= 3e-6 + 1e-6*signal, 'raw SG face currents satisfy discrete continuity');
 }
}
for (const key of ['pn','p+n','pin','res','lin','diff','npn']) for (const bias of [-0.3,0,0.3]) {
 const m = buildModel(presetState(key)), d = makeDev(m.opts).solve(bias);
 assert.ok(d.initialized && d.converged);
 near(d.Va,bias,1e-12,'solved at the requested bias');
 const s=d.state();
 assert.ok(s.n.every(v=>v>0&&Number.isFinite(v)) && s.p.every(v=>v>0&&Number.isFinite(v)));
 near(s.Efn[0],-bias,1e-12,'left electron contact quasi-Fermi energy');
 near(s.Efp[0],-bias,1e-12,'left hole contact quasi-Fermi energy');
 near(s.Efn.at(-1),0,1e-12,'right electron contact reference');
 if (bias===0 && key!=='pin') {
  assert.ok(s.n.every((n,i)=>Math.abs(n*s.p[i]/s.ni**2-1)<1e-12));
 }
 labBalance(d,m);
 labBiasCases++;
}
assert.ok(labMaxPoissonResidual < 2e-11, 'Poisson discrete flux balance');
let labUniformCases = 0;
for (const mat of ['Si','Ge','GaAs']) for (const T of [250,350]) for (const bias of [-0.7,0.7]) {
 const st = presetState('pn',{mat,T,r:[{t:'n',lg:16,w:2,sh:'u',s:0.1}]}), m=buildModel(st);
 const d = makeDev(m.opts).solve(bias), s=d.state(), n0=1e16/2+Math.hypot(1e16/2,s.ni), p0=s.ni**2/n0;
 const conductivity = SC.q*(SC.mobility(mat,1e16,T,'n')*n0 + SC.mobility(mat,1e16,T,'p')*p0);
 assert.ok(d.converged);
 near(s.J/(conductivity*bias/m.R.L),1,1e-9,'uniform slab analytic Ohmic current');
 near(s.psi[0]-s.psi.at(-1),bias,1e-12,'uniform slab potential difference');
 labUniformCases++;
}
let labOpticalCases = 0;
for (const mat of ['Si','Ge','GaAs']) for (const lam of [400,600,900]) {
 const st=presetState('pin',{mat,lam});
 const m=buildModel(st);
 if (!m.G) continue;
 const s=makeDev(m.opts).state();
 assert.ok(s.converged);
 let flux=0;
 for (let i=1;i<s.x.length-1;i++) flux+=s.G[i]*(s.x[i+1]-s.x[i-1])/2;
 const tail=(s.x.at(-1)+s.x.at(-2))/2, front=(s.x[0]+s.x[1])/2;
 const alpha = (Math.log(m.G(front))-Math.log(m.G(tail)))/(tail-front);
 const expected=(m.G(front)-m.G(tail))/alpha;
 near(flux/expected,1,1e-12,'Beer–Lambert cell integral');
 labOpticalCases++;
}
const extremeLab = makeDev(buildModel(presetState('npn',{mat:'GaAs'})).opts);
const originalLab = extremeLab.state();
extremeLab.solve(.9);
assert.ok(!extremeLab.converged && extremeLab.Va < .9);
if (extremeLab.Va === 0) assert.deepEqual(extremeLab.state().psi,originalLab.psi);
const challengeLab=presetState('pn');
challengeLab.r.forEach(r=>r.lg=17.5);
const challengeLabDevice=makeDev(buildModel(challengeLab).opts).solve(-2);
assert.ok(challengeLabDevice.converged && challengeLabDevice.vbi>=.88 && Math.abs(challengeLabDevice.state().J)<=1e-8);
// An ideal Shockley curve recovers its forward ideality and saturation current.
for (const ideality of [1,1.5,2]) {
 const saturation=1e-12, data=[];
 for (let i=-40;i<=40;i++) {
  const voltage=i*.025;
  data.push([voltage,saturation*Math.expm1(voltage/(ideality*SC.Vt(300)))]);
 }
 const result=analyzeIV(data,false,SC.Vt(300),.6);
 near(result.n,ideality,1e-3,'forward exponential ideality');
 near(result.J0/saturation,1,1e-3,'forward saturation current');
 assert.ok(Number.isNaN(analyzeIV(data,false,SC.Vt(300),-.6).J0),'no reverse extrapolation');
 assert.ok(Number.isNaN(analyzeIV(data,true,SC.Vt(300),.6).J0),'no illuminated exponential fit');
}
const labVt=SC.Vt(300), modelN=1.7, modelJ=2e-9;
const logSamples=[.1,.125,.15].map(V=>[V,modelJ*Math.exp(V/(modelN*labVt))]);
const fitLab=analyzeIV(logSamples,false,labVt,.13);
near(fitLab.n,modelN,1e-12,'local ideality from a bracketing interval');
near(fitLab.J0/modelJ,1,1e-12,'local extrapolation uses the same interval');
assert.ok(Number.isNaN(analyzeIV(logSamples,false,labVt,.2).n));
near(analyzeIV([[0,-1],[.025,1]],true,labVt,0).Voc,.0125,1e-12,'Voc crossing may straddle zero bias');
assert.ok(Number.isNaN(analyzeIV([[0,-1],[.075,1]],true,labVt,0).Voc));
console.log(JSON.stringify({passed:true,velocityVarianceRatio:variance/(SC.kB*300/ms),reflectingCases:21,diodeCases:80,equilibriumResidual,maxMuError,maxDError,maxDecayError,maxInversionChargeError,photoProfileError,maxKPMassError,maxJunctionFieldError,maxRecoveryError,bjtBiasCases,optoCollectionCases,solarCases,wellEdgeCases,powerAvalancheCases,switchingCases,rfBiasCases,maxRfJacobianError,rfNoiseCases,reliabilityWeibullCases,reliabilityHciCases,reliabilityEsdCases,relMean,relVariance,reliabilityChallengePassingPairs:relGrid.winners.length,esdCdmCases,esdGgCases,esdSeedCases,labBiasCases,labUniformCases,labOpticalCases,labMaxPoissonResidual,labMaxCurrentClosure},null,2));
