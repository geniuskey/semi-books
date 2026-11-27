/* Copyright (c) 2026 geniuskey and GPUBook contributors. MIT.
 * KaTeX check for single GPUBook pages without running the whole build:
 *   node gpu/tools/katex-check.mjs gpu/chapters/hbm.html [more.html ...]
 */
import { readFileSync } from 'node:fs';
import { renderMath } from '../../tools/katex.mjs';

let failed = 0;
for (const file of process.argv.slice(2)) {
  try {
    const out = renderMath(readFileSync(file, 'utf8'), file);
    if (out.errors.length) throw new Error(out.errors.join('\n'));
    console.log(`ok   ${file} (${out.count} formulas)`);
  } catch (e) {
    failed++;
    console.log(`FAIL ${file}\n${String(e.message || e).split('\n').slice(0, 20).join('\n')}`);
  }
}
process.exit(failed ? 1 : 0);
