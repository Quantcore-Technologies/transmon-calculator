// Card specs, plots, formulas and display formatting: everything the UI shows is computable.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import katex from 'katex';
import * as M from '../src/lib/model.js';
import { CARDS, BRINGUP } from '../src/lib/cards.js';
import { fmt, triple, sigmaText, resolveKey } from '../src/lib/format.js';

const res = M.run(M.defaults());
const finite = (x) => typeof x === 'number' && Number.isFinite(x);

test('every displayed value exists and is finite, for both qubits', () => {
  const missing = [];
  for (const c of CARDS) {
    const outs = [c.primary, ...c.outputs, ...(c.uses || [])];
    for (const o of outs) for (const q of ['2', '1']) {
      const t = triple(res, resolveKey(o.key, q), o.conv, o.unit);
      if (!finite(t.nom)) missing.push(`${c.id}:${o.key}@Q${q}`);
    }
  }
  for (const b of BRINGUP) for (const q of ['2', '1']) if (!finite(triple(res, resolveKey(b.key, q), b.conv, b.unit).nom)) missing.push(`bringup:${b.key}`);
  assert.deepEqual(missing, []);
});

test('every card input exists, and every input appears on a card', () => {
  const used = new Set();
  for (const c of CARDS) for (const id of c.inputs || c.groups.flatMap((g) => g.ids)) {
    assert.ok(M.INPUT[id], `${c.id} uses unknown input ${id}`);
    used.add(id);
  }
  const orphan = M.INPUTS.map((d) => d.id).filter((id) => !used.has(id));
  assert.deepEqual(orphan, []);
});

test('every formula and every substituted formula renders in KaTeX', () => {
  const opts = { throwOnError: true, strict: 'ignore', displayMode: false };
  for (const c of CARDS) {
    for (const f of c.formulas) assert.doesNotThrow(() => katex.renderToString(`\\displaystyle ${f}`, opts), `${c.id}: ${f}`);
    for (const q of ['2', '1']) {
      const s = c.subst(res.nom, q);
      assert.doesNotThrow(() => katex.renderToString(s, opts), `${c.id} subst: ${s}`);
      assert.ok(!/NaN|undefined|Infinity/.test(s), `${c.id} subst has a bad number: ${s}`);
    }
  }
});

test('every plot evaluates to finite values across its domain (curve, map and slices)', () => {
  for (const c of CARDS) for (const p of c.plots || []) {
    if (p.type === 'iq') continue;
    for (const q of ['2', '1']) {
      if (p.type === 'spans') {
        for (const r of p.rows(res, q)) assert.ok([r.nom, r.lo, r.hi].every(finite), `${c.id} spans ${r.label}`);
        continue;
      }
      const [a, b] = p.x.domain(res.nom, q);
      const xs = [0.1, 0.3, 0.5, 0.7, 0.9].map((t) => (p.x.log ? a * (b / a) ** t : a + (b - a) * t));
      const ok = xs.map((x) => p.f(res.nom, q, x)).filter(finite);
      assert.ok(ok.length >= 4, `${c.id} “${p.title}” curve: ${ok.length}/5 finite`);
      if (p.z) {
        const [za, zb] = p.z.domain(res.nom, q);
        const wv = p.w ? p.w.get(res.nom, q) : undefined;
        assert.ok(finite(p.f(res.nom, q, xs[2], (za + zb) / 2, wv)), `${c.id} “${p.title}” map`);
      }
      if (p.x.get) assert.ok(finite(p.x.get(res.nom, q)), `${c.id} window getter`);
    }
  }
});

test('number formatting: significant digits, grouping, exponent carry', () => {
  assert.equal(fmt(203.9037, 4), '203.9');
  assert.equal(fmt(-1.0004, 4), '−1.000');
  assert.equal(fmt(32433.2, 5), '32 433');
  assert.equal(fmt(9.978e-4, 2), '1.0×10⁻³');
  assert.equal(fmt(NaN), '—');
});

test('units pick their SI prefix from the value', () => {
  const r = { nom: { a: 0.0719e-15, b: 95.3e-3, c: 6e9, d: -198e3, e: 4031e-6 }, R: {}, S: {} };
  const u = (k, unit, conv) => triple(r, k, conv, unit);
  assert.deepEqual([u('a', 'fF', (v) => v * 1e15).unit, Math.round(u('a', 'fF', (v) => v * 1e15).nom * 10) / 10], ['aF', 71.9]);
  assert.equal(u('b', 'µs', (v) => v * 1e6).unit, 'ms');
  assert.equal(u('c', 'GHz', (v) => v / 1e9).unit, 'GHz');
  assert.equal(u('d', 'MHz', (v) => v / 1e6).unit, 'kHz');
  assert.equal(u('e', 'µm', (v) => v * 1e6).unit, 'mm');
  assert.equal(u('a', 'µm', (v) => v * 1e6).unit, 'nm');
  // Not a plain power-of-ten conversion: left alone
  assert.equal(u('c', 'MHz', (v) => (2 * Math.abs(v)) / 1e6).unit, 'MHz');
  assert.equal(u('c', 'pF/m', (v) => v * 1e12).unit, 'pF/m');
});

// Displayed values that correctly carry no fab ±: drawn or design quantities, material constants,
// in-situ calibrated settings, and values at an optimum where the first-order σ vanishes.
const NO_SIGMA = new Set([
  'epsEff', 'Z0', 'vph', 'alphaK', 'LkSq', 'Cl', 'Lg', 'Lk', 'Zgeo', 'ell4_Q', 'ell2_Q',   // CPW and film (σ_fr covers resonators)
  'Cg_Q', 'EJd_Q', 'fT_Q', 'IcRn',                                                          // design targets, constant
  'fbare_Q', 'ell_Q', 'dfLoad_Q', 'Crd_Q',                                                  // drawn resonator
  'Qcd_Q', 'lcNeed_Q', 'QcGeom_Q', 'QcRefModel_Q', 'cm', 'lm',                              // drawn coupler section
  'Ccd_Q', 'Cqc_Q', 'C12', 'Cvia', 'Cdir', 'EJc_d',                                         // drawn capacitances, coupler target
  'sep_Q',                                                                                  // at its maximum: dσ = 0 to first order
  'tCZ',                                                                                    // set by J_gate, calibrated in situ
]);

test('every displayed value has a fab ± unless it is drawn, a design target or a constant', () => {
  const missing = [], extra = [];
  for (const c of CARDS) for (const o of [c.primary, ...c.outputs]) {
    if (o.noSigma) continue;
    const t = triple(res, resolveKey(o.key, '2'), o.conv, o.unit);
    const has = sigmaText(t) !== '';
    if (!has && !NO_SIGMA.has(o.key)) missing.push(`${c.id}:${o.key}`);
    if (has && NO_SIGMA.has(o.key)) extra.push(`${c.id}:${o.key}`);
  }
  assert.deepEqual(missing, [], 'values that should carry a ±');
  assert.deepEqual(extra, [], 'values listed as design-only that now carry a ±');
});

test('1σ label: shown with unit and percentage, hidden for design targets', () => {
  const t = triple(res, 'fq_2', (v) => v / 1e9, 'GHz');
  assert.match(sigmaText(t), /^±0\.1\d GHz · 3\.\d %$/);
  assert.equal(sigmaText(triple(res, 'EJd_2', (v) => v / 1e9, 'GHz')), '');
});
