import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { close } from '../src/render.js';
import { checkCase } from './check.js';
import { jobs } from './jobs.js';

after(() => close());

for (const job of jobs()) {
  test(`corpus: ${job.id} — ${job.why}`, async () => {
    const r = await checkCase(job);
    assert.deepEqual(r.failures, [], `${job.id}: ${r.failures.join('; ')}`);
  });
}
