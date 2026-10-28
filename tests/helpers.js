import assert from 'node:assert/strict';
import { defaults } from '../src/lib/model.js';

/** Relative closeness with a readable failure message. */
export function close(actual, expected, rel, msg) {
  const tol = rel * Math.abs(expected) || rel;
  assert.ok(Number.isFinite(actual), `${msg}: got ${actual}`);
  assert.ok(Math.abs(actual - expected) <= tol, `${msg}: ${actual} vs ${expected} (±${(rel * 100).toPrecision(2)} %)`);
}

/** Default inputs with every window collapsed to its nominal. */
export function pointState(patch = {}) {
  const s = defaults();
  for (const id in s) if ('lo' in s[id]) { s[id].lo = s[id].nom; s[id].hi = s[id].nom; }
  for (const id in patch) s[id] = { ...s[id], ...(typeof patch[id] === 'object' ? patch[id] : { nom: patch[id], lo: patch[id], hi: patch[id] }) };
  return s;
}
