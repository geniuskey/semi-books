const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const sandbox = { window: {} };
vm.runInNewContext(fs.readFileSync('js/industry.js', 'utf8'), sandbox);
const IND = sandbox.window.IND;
let checks = 0, scripts = 0;
// Murphy's squared Laplace factor independently integrated (two uniform factors, a triangular density).
for (const ad of [0, 1e-18, 1e-12, 1e-8, .001, .01, .1, .5, 1, 2, 5, 10, 20]) {
  const n = 4096;
  let sum = 0;
  for (let j = 0; j <= n; j++) sum += (j === 0 || j === n ? 1 : j % 2 ? 4 : 2) * Math.exp(-ad * j / n);
  const expected = (sum / (3 * n)) ** 2;
  for (const area of [.01, 1, 8.58]) {
    assert.ok(Math.abs(IND.yield(area, ad / area, 'murphy') - expected) < 1e-11, `Murphy AD=${ad}`);
    checks++;
  }
}
// Cost accounting: zero successful assemblies cannot yield a finite unit cost.
for (const model of ['murphy', 'poisson', 'negbin', 'seeds']) for (const area of [1, 100, 400, 858]) {
  const base = { area, waferCost: 18000, D0: .15, model, test: 50, pkg: 500 };
  const die = IND.dieCost(base);
  assert.equal(IND.dieCost({ ...base, pkgYield: 0 }).chipCost, Infinity); checks++;
  for (const y of [.01, .5, .95, 1]) {
    assert.ok(Math.abs(IND.dieCost({ ...base, pkgYield: y }).chipCost * y - (die.dieCost + 550)) < 1e-9);
    checks++;
  }
}
assert.equal(IND.hhi([50, 50]), 5000); checks++;
assert.equal(IND.hhi([25, 25, 25, 25]), 2500); checks++;
assert.equal(IND.hhi([20, 20, 20, 20, 20]), 2000); checks++;
for (const file of fs.readdirSync('chapters').filter(f => f.endsWith('.html'))) {
  const html = fs.readFileSync('chapters/' + file, 'utf8');
  for (const match of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/g)) {
    if (/\bsrc\s*=/.test(match[1]) || !match[2].trim()) continue;
    if (/application\/ld\+json/.test(match[1])) JSON.parse(match[2]);
    else new vm.Script(match[2], { filename: file });
    scripts++;
  }
}
// Exercise the actual verdict expressions around the historical boundary, including equality.
const equipment = fs.readFileSync('chapters/equipment.html', 'utf8');
const verdict = equipment.match(/const verdict = ([^;]+);/)[1];
for (const [hhi, expected] of [[1499, '경쟁적'], [1500, '중간 집중'], [2500, '중간 집중'], [2501, '고집중']]) {
  assert.equal(vm.runInNewContext(verdict, { hhi }), expected); checks++;
}
for (const chapter of ['foundry', 'memory', 'materials', 'geography', 'equipment', 'glossary']) {
  const html = fs.readFileSync(`chapters/${chapter}.html`, 'utf8');
  assert.ok(html.includes('2023년 지침') && html.includes('1,800 초과'));
  assert.ok(html.includes('2010년'));
  checks++;
}
const foundry = fs.readFileSync('chapters/foundry.html', 'utf8');
assert.ok(foundry.includes('e^{-(A/100) D_0}') && foundry.includes('100 mm² = 1 cm²')); checks++;
const correct = IND.yield(806 / 100, .1, 'murphy');
assert.ok(correct > .47 && correct < .48); checks++;
assert.ok(IND.yield(806, .1, 'murphy') < .0002); checks++;
assert.ok(foundry.includes('해당 분포의 정확한 표본은 아니다')); checks++;
console.log(`${checks} numerical/boundary checks; ${scripts} inline JavaScript/JSON checks passed`);
