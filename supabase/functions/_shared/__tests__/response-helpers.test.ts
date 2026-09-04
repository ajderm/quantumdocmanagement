import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

/**
 * Static guard on the shared response helpers.
 *
 * Their argument orders differ, which is easy to get wrong:
 *
 *   createJsonResponse(data, corsHeaders, status = 200)
 *   createErrorResponse(message, status, corsHeaders)
 *
 * Calling createJsonResponse(data, 200, corsHeaders) type-checks under this
 * project's loose config, spreads a number where the headers should be (so the
 * response carries no CORS headers), and passes an object as the status —
 * which makes `new Response` throw. Every success path then returns 500 from
 * the catch block, and a caller that fails closed shows nothing at all. That
 * happened; this is here so it cannot happen quietly again.
 */

const FUNCTIONS_DIR = new URL('../../', import.meta.url).pathname;

function edgeFunctionSources(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    if (entry === 'node_modules' || entry === '__tests__') continue;
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) edgeFunctionSources(full, out);
    else if (entry.endsWith('.ts')) out.push(full);
  }
  return out;
}

const sources = edgeFunctionSources(FUNCTIONS_DIR).map((f) => ({
  path: relative(FUNCTIONS_DIR, f),
  text: readFileSync(f, 'utf8'),
}));

test('the edge function sources are discoverable', () => {
  assert.ok(sources.length > 5, `expected several sources, found ${sources.length}`);
});

test('createJsonResponse is never called with a status as its second argument', () => {
  const offenders: string[] = [];
  for (const { path, text } of sources) {
    // Match the call and capture what follows the first argument, tolerating
    // nested braces/parens in an inline object literal.
    const re = /createJsonResponse\s*\(/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(text)) !== null) {
      let depth = 1, i = m.index + m[0].length, argStart = i;
      const args: string[] = [];
      while (i < text.length && depth > 0) {
        const ch = text[i];
        if ('([{'.includes(ch)) depth++;
        else if (')]}'.includes(ch)) depth--;
        else if (ch === ',' && depth === 1) { args.push(text.slice(argStart, i)); argStart = i + 1; }
        if (depth === 0) args.push(text.slice(argStart, i));
        i++;
      }
      const second = (args[1] ?? '').trim();
      if (/^\d+$/.test(second)) {
        const line = text.slice(0, m.index).split('\n').length;
        offenders.push(`${path}:${line} — second argument is ${second}, expected corsHeaders`);
      }
    }
  }
  assert.deepEqual(offenders, [],
    `createJsonResponse takes (data, corsHeaders, status?):\n${offenders.join('\n')}`);
});

test('createErrorResponse is never called with headers as its second argument', () => {
  const offenders: string[] = [];
  for (const { path, text } of sources) {
    const re = /createErrorResponse\s*\([^,]*,\s*([A-Za-z_$][\w$]*)\s*,/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(text)) !== null) {
      // The second argument must be a status, so a bare identifier that looks
      // like headers is the mirror-image mistake.
      if (/cors|header/i.test(m[1])) {
        const line = text.slice(0, m.index).split('\n').length;
        offenders.push(`${path}:${line} — second argument is ${m[1]}, expected a status code`);
      }
    }
  }
  assert.deepEqual(offenders, [],
    `createErrorResponse takes (message, status, corsHeaders):\n${offenders.join('\n')}`);
});
