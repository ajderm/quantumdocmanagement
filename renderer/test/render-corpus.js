// Renders every corpus case and prints a report table.
// Run: npm run corpus

import { mkdir } from 'node:fs/promises';
import { close } from '../src/render.js';
import { checkCase } from './check.js';
import { jobs } from './jobs.js';

const OUT = new URL('../out/', import.meta.url);
await mkdir(OUT, { recursive: true });

const results = [];
for (const job of jobs()) {
  results.push(await checkCase({ ...job, outDir: OUT }));
}
await close();

const pad = (s, n) => String(s).padEnd(n);
const lpad = (s, n) => String(s).padStart(n);
console.log('\n' + pad('case', 26) + lpad('pages', 6) + lpad('KB', 6) + lpad('chars', 7)
  + lpad('ms', 6) + lpad('warn', 6) + '  status');
console.log('-'.repeat(84));
let failed = 0;
for (const r of results) {
  const ok = r.failures.length === 0;
  if (!ok) failed++;
  console.log(pad(r.id, 26) + lpad(r.pages, 6) + lpad(r.kb, 6) + lpad(r.chars, 7)
    + lpad(r.ms, 6) + lpad(r.warnings, 6) + '  ' + (ok ? 'pass' : 'FAIL'));
  for (const f of r.failures) console.log(' '.repeat(28) + '· ' + f);
}
console.log('-'.repeat(84));
console.log(`${results.length - failed}/${results.length} renders passed`
  + `   ·   PDFs written to renderer/out/`);
if (failed) process.exitCode = 1;
