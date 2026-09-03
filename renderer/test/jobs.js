// Flattens the corpus (which may declare parameter sweeps) into render jobs.

import { CORPUS } from './corpus.js';

export function jobs() {
  const out = [];
  for (const c of CORPUS) {
    if (c.sweep) {
      for (const n of c.sweep) {
        out.push({ id: `${c.id}-${n}`, why: `${c.why} (n=${n})`,
          template: c.template, data: c.data(n), expect: c.expect });
      }
    } else {
      out.push({ id: c.id, why: c.why, template: c.template, data: c.data, expect: c.expect });
    }
  }
  return out;
}
