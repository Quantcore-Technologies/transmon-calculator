// The full design chain: design-note reference values, internal identities, window and σ
// propagation, checks and dependency tracing.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as P from '../src/lib/physics.js';
import * as M from '../src/lib/model.js';
import { close, pointState } from './helpers.js';

const at = (n, k) => n[k];
const nominal = (patch) => M.run(pointState(patch)).nom;

test('every node is finite at the defaults, for both qubits', () => {
  const n = M.run(M.defaults()).nom;
  const bad = Object.keys(n).filter((k) => typeof n[k] === 'number' && !Number.isFinite(n[k]));
  assert.deepEqual(bad, []);
});

// Values quoted in "Tunable-Transmon Chip Design Flow" (at a glance table and steps 1–10)
const NOTE = [
  ['EC_a', 203.9e6, 2e-3, 'E_C/h'],
  ['alpha_2', -222e6, 1e-2, 'α/2π'],
  ['EJd_2', 23.65e9, 2e-3, 'E_J/h Q2'], ['EJd_1', 26.79e9, 2e-3, 'E_J/h Q1'],
  ['ratio_2', 116, 1e-2, 'E_J/E_C Q2'], ['ratio_1', 131, 1e-2, 'E_J/E_C Q1'],
  ['LJ_2', 6.91e-9, 2e-3, 'L_J Q2'], ['LJ_1', 6.10e-9, 2e-3, 'L_J Q1'],
  ['Ic_2', 47.6e-9, 2e-3, 'I_c Q2'], ['Ic_1', 53.9e-9, 2e-3, 'I_c Q1'],
  ['Rn_2', 5.94e3, 2e-3, 'R_n Q2'], ['Rn_1', 5.24e3, 2e-3, 'R_n Q1'],
  ['range_2', 660e6, 1e-2, 'tuning range Q2'],
  ['fmin_2', 5.34e9, 2e-3, 'f at Φ0/2, Q2'], ['fmin_1', 5.7e9, 1e-2, 'f at Φ0/2, Q1'],
  ['slope_2', 1.06e9, 2e-2, 'slope at 0.1 Φ0'],
  ['EJ1_2', 21.3e9, 5e-3, 'E_J1 Q2'], ['EJ2_2', 2.37e9, 5e-3, 'E_J2 Q2'],
  ['EJ1_1', 24.1e9, 5e-3, 'E_J1 Q1'], ['EJ2_1', 2.68e9, 5e-3, 'E_J2 Q1'],
  ['Rn1_2', 6.6e3, 1e-2, 'R_n1 Q2'], ['Rn2_2', 59e3, 1e-2, 'R_n2 Q2'],
  ['Rn1_1', 5.8e3, 1e-2, 'R_n1 Q1'], ['Rn2_1', 52e3, 1e-2, 'R_n2 Q1'],
  ['fCZ', 6.222e9, 1e-3, 'CZ point'], ['exc', 178e6, 2e-2, 'Q1 excursion'],
  ['sigL_2', 62e6, 2e-2, 'local σ_f at 6 GHz'], ['sigPair', 88e6, 4e-2, 'pair σ'],
  ['gd_2', 88e6, 1e-2, 'g/2π'], ['chi_2', -1.0e6, 1e-2, 'χ/2π'],
  ['ncrit_2', 47, 2e-2, 'n_crit'], ['T1u_2', 15e-6, 2e-2, 'Purcell T1 unfiltered'],
  ['T1f_2', 95e-3, 2e-2, 'Purcell T1 filtered'], ['Pin_2', -123, 5e-3, 'readout power (dBm)'],
  ['Qcd_2', 3600, 1e-6, 'Q_c'], ['tau_2', 80e-9, 1e-2, 'photon lifetime'],
  ['Tphi_2', 160e-6, 2e-2, 'thermal T_φ at 50 mK'], ['push_2', 6.4e6, 1e-2, 'dressed push g²/|Δ|'],
  ['Cqc_2', 2.2e-15, 5e-2, 'C_qc'], ['C12', 0.15e-15, 3e-2, 'C_12,eff'],
  ['Cvia', 0.07e-15, 5e-2, 'via island'], ['Cdir', 0.08e-15, 5e-2, 'direct gap'],
  ['ECc_d', 280e6, 3e-3, 'coupler E_C'], ['EJc_d', 47.3e9, 5e-3, 'coupler E_J'],
  ['Icc', 95e-9, 1e-2, 'coupler I_c'], ['RnJ', 5.9e3, 1e-2, 'coupler R_n per junction'],
  ['fc_off_a', 8.53e9, 2e-3, 'off point'], ['Jmax', 1.7e6, 5e-2, 'J at f_max'],
  ['zz', -200e3, 2e-2, 'static ZZ'],
];

test('reproduces the design-note values (qubit, readout, coupler)', () => {
  const n = nominal();
  for (const [k, v, rel, label] of NOTE) close(at(n, k), v, rel, label);
});

test('reproduces the note resonator table with its fitted ε_eff = 5.34 and no kinetic inductance', () => {
  // The note used c/4√ε_eff with Z0 = 50 Ω; geometry now sets Z0, so allow ~1 % on the loading
  const n = nominal({ epsMode: { nom: 'fit' }, lamL: 0 });
  close(n.K * 1e-3, 32433, 1e-3, 'length constant c/4√ε (GHz·µm)');
  close(n.ell4_2, 4392e-6, 1e-2, 'ℓ R2'); close(n.ell4_1, 4158e-6, 1e-2, 'ℓ R1');
});

test('CPW defaults: silicon gives ε_eff ≈ 6.22 and Z0 ≈ 51 Ω for w = 10 µm, s = 6 µm', () => {
  const n = nominal();
  close(n.epsEff, 6.22, 2e-3, 'ε_eff'); close(n.Z0, 51.3, 1e-2, 'Z0');
  assert.ok(n.alphaK > 0.01 && n.alphaK < 0.02, `α_k ${n.alphaK}`);
});

test('hanger model is calibrated to the measured reference (Q_c ≈ 10 000 at 500 µm)', () => {
  const n = nominal();
  close(n.QcRefModel_2, 10000, 0.15, 'model Q_c at ℓ_c,ref');
  assert.ok(n.lcNeed_2 > 800e-6 && n.lcNeed_2 < 950e-6, `ℓ_c for κ = 2 MHz: ${n.lcNeed_2}`);
});

test('internal identities hold at the nominal point', () => {
  const n = nominal();
  const TAU = 2 * Math.PI;
  for (const q of ['2', '1']) {
    const g = n['ga_' + q], D = n['Delta_' + q], a = n['alpha_' + q];
    close(n['chi_' + q], (g * g * a) / (D * (D + a)), 1e-12, `χ formula Q${q}`);
    close(n['xa_' + q], 1, 1e-9, `2χ/κ = target Q${q}`);
    close(n['ncrit_' + q], (D / (2 * g)) ** 2, 1e-12, `n_crit Q${q}`);
    close(n['T1u_' + q], (D / g) ** 2 / (TAU * n['kapa_' + q]), 1e-12, `Purcell Q${q}`);
    close(n['Crd_' + q], 1 / (8 * n['frd_' + q] * n.Z0), 1e-12, `C_r λ/4 Q${q}`);
    close(n['Vzpf_' + q], TAU * n['fra_' + q] * Math.sqrt((2 * P.K.hbar * n.Z0) / Math.PI), 1e-9, `V_zpf Q${q}`);
    close(n['ell2_' + q], 2 * n['ell4_' + q], 1e-12, `ℓ_λ/2 = 2 ℓ_λ/4 Q${q}`);
    close(n['fmin_' + q], P.f01(n['EJa_' + q] * n.dAsym, n.EC_a), 1e-12, `f_min Q${q}`);
    close(n['Qcd_' + q], n['frd_' + q] / n.$.kap, 1e-12, `Q_c = f_r/κ Q${q}`);
  }
  close(n.D12, n.fq_1 - n.fq_2, 1e-12, 'Δ12');
  close(n.fCZ, n.fq_2 - n.alpha_1, 1e-12, 'CZ point');
  assert.ok(Math.abs(P.Jnet(n.fc_off_a, n.fq_1, n.fq_2, n.$.gqc, n.$.g12)) < 1e3, 'J(off point) = 0');
  close(P.Jnet(n.fc_gate, n.fq_1, n.fq_2, n.$.gqc, n.$.g12), -n.$.Jg, 1e-6, 'J(gate point) = −J_gate');
  close(n.tCZ, 1 / (2 * Math.SQRT2 * n.$.Jg), 1e-12, 't_CZ');
});

test('closed loops: claw mode reproduces the matched g; geometry mode at ℓ_c,need reproduces κ', () => {
  const m = nominal();
  const cc = nominal({ mode: { nom: 'cc' }, Cc: m.Ccd_2 * 1e15 });
  close(cc.gd_2, m.gd_2, 1e-9, 'g from C_c');
  const geo = nominal({ kapMode: { nom: 'geom' }, lc: m.lcNeed_2 * 1e6 });
  close(geo.kapd_2, 2e6, 1e-5, 'κ from the solved coupling length');
});

test('λ/2 doubles C_r and the resonator length', () => {
  const q4 = nominal(), q2 = nominal({ resType: { nom: 'half' } });
  close(q2.Crd_2, 2 * q4.Crd_2, 1e-12, 'C_r');
  assert.ok(q2.ell_2 > 1.9 * q4.ell_2, 'ℓ');
});

test('a +5 % junction shift moves f by ≈ +2.6 % (note, step 4)', () => {
  const base = nominal(), up = nominal({ dEJ: 5 });
  close(up.fq_2 / base.fq_2 - 1, 0.026, 5e-2, 'δf/f');
});

test('switching the active qubit with synced inputs changes nothing', () => {
  const a = M.run(pointState(), '2').nom;
  const s = pointState({ f2: a.fT_2 / 1e9, Rn1: a.Rn_1 / 1e3 });   // what the App writes back
  const b = M.run(s, '1').nom;
  for (const k of ['fT_2', 'fT_1', 'EJd_2', 'EJd_1', 'Ic_1', 'LJ_2', 'ga_1', 'chi_2', 'ell_1', 'fc_off_a', 'zz', 'czMargin']) close(b[k], a[k], 1e-9, k);
});

test('windows: bounds contain the nominal; collapsed windows give a single value', () => {
  const r = M.run(M.defaults());
  for (const k in r.R) {
    const { lo, hi } = r.R[k], v = r.nom[k];
    if (!Number.isFinite(v)) continue;
    const eps = 1e-9 * Math.max(Math.abs(v), 1e-30);
    assert.ok(lo <= v + eps && v <= hi + eps, `${k}: ${lo} ≤ ${v} ≤ ${hi}`);
  }
  const p = M.run(pointState());
  assert.equal(p.evals, 1);
  for (const k in p.R) if (Number.isFinite(p.nom[k])) assert.equal(p.R[k].lo, p.R[k].hi, k);
});

test('windows: corner sampling matches a dense grid for two windows', () => {
  const s = pointState({ CS: { nom: 95, lo: 90, hi: 100 }, f2: { nom: 6.0, lo: 5.8, hi: 6.2 } });
  const r = M.run(s);
  let lo = Infinity, hi = -Infinity;
  for (let i = 0; i <= 20; i++) for (let j = 0; j <= 20; j++) {
    const v = M.baseValues(s);
    v.CS = (90 + i * 0.5) * 1e-15; v.f2 = (5.8 + j * 0.02) * 1e9;
    const x = M.evaluate(v).chi_2;
    lo = Math.min(lo, x); hi = Math.max(hi, x);
  }
  close(r.R.chi_2.lo, lo, 1e-6, 'lower bound'); close(r.R.chi_2.hi, hi, 1e-6, 'upper bound');
});

test('windows: with many windows the sign-vertex bounds match full corner enumeration', () => {
  const s = M.defaults();
  s.dCpl.lo = 7; s.lc.hi = 1100; s.wC.hi = 12;   // twelve windows, some one-sided
  const r = M.run(s);
  const ranged = M.INPUTS.filter((d) => d.type !== 'select' && d.range !== false && (s[d.id].lo < s[d.id].nom || s[d.id].hi > s[d.id].nom));
  assert.equal(ranged.length, 12);
  assert.ok(r.evals < 400, `fast: ${r.evals} evaluations`);
  const base = M.baseValues(s), keys = ['fq_2', 'chi_2', 'ncrit_2', 'T1u_2', 'fc_off_a', 'offMargin', 'zz', 'kapa_2', 'ell_2', 'Rna_2', 'range_2'];
  const lo = {}, hi = {};
  for (let m = 0; m < 2 ** ranged.length; m++) {
    const v = { ...base };
    ranged.forEach((d, i) => { v[d.id] = s[d.id][(m >> i) & 1 ? 'hi' : 'lo'] * d.scale; });
    const n = M.evaluate(v);
    for (const k of keys) { lo[k] = Math.min(lo[k] ?? Infinity, n[k]); hi[k] = Math.max(hi[k] ?? -Infinity, n[k]); }
  }
  for (const k of keys) {
    close(r.R[k].lo, lo[k], 1e-9, `${k} lower bound`);
    close(r.R[k].hi, hi[k], 1e-9, `${k} upper bound`);
  }
});

test('junction, SQUID and coupler values carry the fab σ the note quotes', () => {
  const r = M.run(M.defaults()), n = r.nom, S = r.S;
  const rel = (k) => S[k] / Math.abs(n[k]);
  const ej = Math.hypot(0.05, 0.02);   // global ⊕ local junction spread
  for (const k of ['Ica_2', 'LJa_2', 'Rna_2', 'Rn1a_2']) close(rel(k), ej, 0.02, k);
  // The small junction carries 1/(r+1) of I_c, so the area-ratio spread adds r/(r+1)·σ_r
  close(rel('Rn2a_2'), Math.hypot(ej, (9 / 10) * 0.04), 0.02, 'Rn2a_2');
  assert.ok(rel('dAsymA') > 0, 'asymmetry from the area-ratio spread');
  close(S.fc_off_a, 0.3e9, 0.25, 'off point ±0.3 GHz (note)');
  // ZZ sits near the |11⟩↔|20⟩ pole, so the pair detuning already gives a large σ; g12 adds 2·σ_g12 in quadrature
  const zz0 = M.run(pointState({ sG12: 0 })).S.zz / Math.abs(n.zz);
  close(Math.sqrt(rel('zz') ** 2 - zz0 ** 2), 0.2, 0.05, 'ZZ ∝ g12²: +20 % in quadrature');
  close(n.Ica_2, n.Ic_2, 1e-12, 'after-fab nominal equals the drawn target');
});

test('1σ propagation agrees with the note’s spread table', () => {
  const r = M.run(M.defaults()), n = r.nom, S = r.S;
  const rel = (k) => S[k] / Math.abs(n[k]);
  close(S.fq_2, 175e6, 0.06, 'f_q (global + local + E_C)');
  close(S.fc_off_a / n.fc_off_a, 0.035, 0.25, 'off point');
  close(S.D12, 88e6, 0.06, 'pair detuning (local only)');
  close(rel('kapa_2'), 0.15, 1e-3, 'κ');
  close(rel('fra_2'), 0.004, 1e-2, 'f_r');
  close(rel('EC_a'), 0.025, 1e-2, 'E_C');
  for (const [k, v] of [['chi_2', 0.26], ['ncrit_2', 0.28], ['T1u_2', 0.32]]) {
    const x = rel(k);
    assert.ok(x > v && x < v * 1.25, `${k}: ${x} vs note ${v} (adds local and capacitance spread)`);
  }
  assert.equal(S.EJd_2 || 0, 0, 'design targets carry no fab σ');
});

test('1σ propagation: global junction scatter largely cancels in the pair detuning', () => {
  // Only the difference in sensitivity survives: S·σ_G·(f1 − f2) ≈ 0.52 × 5 % × 400 MHz ≈ 10 MHz
  const r = M.run(pointState({ sL: 0, sC: 0 })), n = r.nom;
  close(r.S.D12, n.sens_2 * n.$.sG * n.D12, 0.1, 'σ(Δ12), global only');
  assert.ok(r.S.D12 < 0.1 * r.S.fq_2, 'much smaller than σ(f)');
});

test('1σ propagation matches a Monte Carlo of the process variables', () => {
  const s = M.defaults(), base = M.baseValues(s);
  const lin = M.run(s).S;
  let seed = 7;
  const u = () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) + 1) / 0x80000001;
  const gauss = () => Math.sqrt(-2 * Math.log(u())) * Math.cos(2 * Math.PI * u());
  const N = 3000, keys = ['fq_2', 'D12', 'Delta_2', 'kapa_2'], acc = Object.fromEntries(keys.map((k) => [k, []]));
  for (let i = 0; i < N; i++) {
    const v = { ...base };
    for (const [x, sg] of M.SIGMA_VARS) v[x] = (v[x] || 0) + base[sg] * gauss();
    const e = M.evaluate(v);
    for (const k of keys) acc[k].push(e[k]);
  }
  // κ ∝ 1/Q_c is nonlinear at ±15 %, so first-order propagation reads ~10 % low there
  const tol = { fq_2: 0.08, D12: 0.08, Delta_2: 0.08, kapa_2: 0.2 };
  for (const k of keys) {
    const m = acc[k].reduce((a, b) => a + b, 0) / N;
    const sd = Math.sqrt(acc[k].reduce((a, b) => a + (b - m) ** 2, 0) / (N - 1));
    close(sd, lin[k], tol[k], `σ(${k}) Monte Carlo vs linear`);
  }
});

test('checks: clean at the defaults, errors on broken designs', () => {
  const errs = (patch) => M.checks(M.run(pointState(patch))).filter((p) => p.sev === 'error');
  assert.deepEqual(M.checks(M.run(M.defaults())).filter((p) => p.sev === 'error'), []);
  assert.ok(errs({ fband: 7 }).some((p) => p.step === 5), 'resonator above the band');
  assert.ok(errs({ nbar: 100 }).some((p) => p.step === 8), 'n̄ above n_crit');
  assert.ok(errs({ f1: 5.5 }).some((p) => p.step === 4), 'Q1 planned below Q2');
  assert.ok(errs({ rA: 40 }).some((p) => p.step === 3), 'tuning range too small for CZ');
  assert.ok(errs({ lc: 5000 }).some((p) => p.step === 6), 'coupling section longer than the resonator');
});

test('dependency tracing finds exactly the inputs a value depends on', () => {
  const s = M.defaults();
  assert.deepEqual(M.dependencies(s, 'EC_a').sort(), ['CS', 'dC']);
  assert.deepEqual(M.dependencies(s, 'C12').sort(), ['CS', 'Rn2', 'f1', 'g12', 'gap']);
  const z = M.dependencies(s, 'Z0');
  for (const id of ['epsR', 'wC', 'sG_', 'tF', 'lamL']) assert.ok(z.includes(id), `Z0 depends on ${id}`);
  assert.ok(!z.includes('CS'), 'Z0 does not depend on C_Σ');
});

test('junction card: with the drawn R_n fixed, the gap sets I_c, E_J, L_J and the sweet spot', () => {
  const al = nominal(), nb = nominal({ gap: 360 });
  close(nb.Ic_2 / al.Ic_2, 2, 1e-12, 'I_c ∝ Δ');
  close(nb.EJd_2 / al.EJd_2, 2, 1e-12, 'E_J ∝ I_c');
  close(nb.LJ_2 / al.LJ_2, 0.5, 1e-12, 'L_J ∝ 1/I_c');
  assert.ok(nb.fT_2 > 8e9 && nb.fq_2 > 8e9, 'sweet spot and f after fab move up');
  close(nb.Rn_2, al.Rn_2, 1e-12, 'R_n is the drawn junction');
  close(nb.Ic_2 * nb.Rn_2, (Math.PI * nb.$.gap) / (2 * P.K.e), 1e-12, 'Ambegaokar–Baratoff');
  // The planned (other) qubit keeps its frequency; its junction is re-solved
  close(nb.fT_1, al.fT_1, 1e-12, 'planned Q1 unchanged');
  close(nb.Rn_1 / al.Rn_1, 2, 1e-9, 'Q1 R_n re-solved');
  for (const k of ['Ic_2', 'LJ_2', 'EJd_2', 'fT_2', 'fq_2', 'ratio_2']) {
    const d = M.dependencies(M.defaults(), k, '2');
    assert.ok(d.includes('gap') && d.includes('Rn2'), `${k} deps: ${d}`);
    assert.ok(!d.includes('f2'), `${k}: the read-only f_max is not a control`);
  }
});

test('the default junctions reproduce the note sweet spots', () => {
  close(nominal().fT_2, 6.0e9, 1e-4, 'Q2 from R_n = 5.94 kΩ');
  close(M.run(pointState(), '1').nom.fT_1, 6.4e9, 1e-4, 'Q1 from R_n = 5.24 kΩ');
});

test('SQUID: the big and small junction resistances combine in parallel to the net R_n,SQ', () => {
  for (const q of ['2', '1']) {
    const n = M.run(pointState(), q).nom;
    close(1 / (1 / n['Rn1_' + q] + 1 / n['Rn2_' + q]), n['Rn_' + q], 1e-12, `Q${q} parallel`);
    close(n['Rn2_' + q] / n['Rn1_' + q], n.$.rA, 1e-12, `Q${q} ratio = area ratio`);
    close(n['Rn_' + q], n.$['Rn' + q], 1e-9, `Q${q} equals the entered R_n,SQ`);
  }
});
