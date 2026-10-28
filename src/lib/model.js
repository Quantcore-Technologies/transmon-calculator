/* Design model: input registry, the step-0…10 evaluation chain, window propagation and checks.
   Design quantities (what you draw) depend only on design inputs; "actual" quantities also see
   the fab-scatter windows of step 0. Qubit-specific nodes carry a suffix: _2 (lower) and _1 (upper). */
import * as P from './physics.js';


const K = P.K;
const TAU = 2 * Math.PI;
const QUBITS = ['2', '1'];

// nom/lo/hi are in display units; scale converts to SI. span = relative half-width of the
// window slider, spanAbs = absolute half-width. range:false gives a plain number field.
const INPUTS = [
  // Step 0 — constraints
  { id: 'epsR', step: 0, label: '<i>ε</i><sub>r</sub>', hint: 'Substrate relative permittivity (Si 11.45 at 4 K, sapphire 9.3–11.6)', unit: '', scale: 1, nom: 11.45, min: 1, max: 30, span: 0.1, dp: 3 },
  { id: 'hSub', step: 0, label: '<i>h</i>', hint: 'Substrate thickness', unit: 'µm', scale: 1e-6, nom: 525, min: 5, max: 5000, range: false, dp: 0 },
  { id: 'wC', step: 0, label: '<i>w</i>', hint: 'CPW centre-conductor width', unit: 'µm', scale: 1e-6, nom: 10, min: 0.5, max: 200, span: 0.3, dp: 2 },
  { id: 'sG_', step: 0, label: '<i>s</i>', hint: 'CPW gap to ground', unit: 'µm', scale: 1e-6, nom: 6, min: 0.5, max: 200, span: 0.3, dp: 2 },
  { id: 'epsMode', step: 0, type: 'select', label: '<i>ε</i><sub>eff</sub> from', options: [['geom', 'Geometry'], ['fit', 'Measured fit']], nom: 'geom' },
  { id: 'epsFit', step: 0, label: '<i>ε</i><sub>eff</sub> (fit)', hint: 'From a fit of measured resonators', unit: '', scale: 1, nom: 5.34, min: 1, max: 30, span: 0.1, dp: 3, showIf: (s) => s.epsMode.nom === 'fit' },
  { id: 'dl', step: 0, label: 'Δ<i>ℓ</i>', hint: 'Open-end and coupling-section length correction', unit: 'µm', scale: 1e-6, nom: 81, min: 0, max: 400, spanAbs: 40, dp: 1 },
  { id: 'tF', step: 0, label: '<i>t</i>', hint: 'Superconducting film thickness', unit: 'nm', scale: 1e-9, nom: 200, min: 5, max: 3000, span: 0.4, dp: 0 },
  { id: 'lamL', step: 0, label: '<i>λ</i><sub>L</sub>', hint: 'London penetration depth (Nb ≈ 90 nm film, Al ≈ 50 nm, NbTiN ≈ 350 nm)', unit: 'nm', scale: 1e-9, nom: 90, min: 0, max: 3000, span: 0.4, dp: 0 },
  { id: 'fband', step: 0, label: '<i>f</i><sub>band</sub>', hint: 'Drive and readout electronics limit', unit: 'GHz', scale: 1e9, nom: 8, min: 1, max: 20, range: false, dp: 2 },
  { id: 'T', step: 0, label: '<i>T</i><sub>eff</sub>', hint: 'Effective temperature of the readout line', unit: 'mK', scale: 1e-3, nom: 50, lo: 40, hi: 50, min: 5, max: 300, spanAbs: 30, dp: 1 },
  { id: 'Qi', step: 0, label: '<i>Q</i><sub>i</sub>', hint: 'Resonator internal quality factor', unit: '', scale: 1, nom: 900000, min: 1000, max: 1e8, range: false, dp: 0 },
  { id: 'sG', step: 0, label: '<i>σ</i><sub>EJ, global</sub>', hint: 'Run-to-run J<sub>c</sub> spread', unit: '%', scale: 0.01, nom: 5, min: 0, max: 50, range: false, dp: 2 },
  { id: 'sL', step: 0, label: '<i>σ</i><sub>EJ, local</sub>', hint: 'Junction-to-junction spread', unit: '%', scale: 0.01, nom: 2, min: 0, max: 50, range: false, dp: 2 },
  { id: 'sC', step: 0, label: '<i>σ</i><sub>C</sub>', hint: 'Lithographic capacitance spread', unit: '%', scale: 0.01, nom: 2.5, min: 0, max: 50, range: false, dp: 2 },
  { id: 'sFr', step: 0, label: '<i>σ</i><sub>fr</sub>', hint: 'Resonator frequency spread', unit: '%', scale: 0.01, nom: 0.4, min: 0, max: 10, range: false, dp: 2 },
  { id: 'sRa', step: 0, label: '<i>σ</i><sub>r</sub>', hint: 'SQUID junction-area ratio spread', unit: '%', scale: 0.01, nom: 4, min: 0, max: 50, range: false, dp: 2 },
  { id: 'sGqc', step: 0, label: '<i>σ</i><sub>gqc</sub>', hint: 'Qubit–coupler coupling spread', unit: '%', scale: 0.01, nom: 2, min: 0, max: 50, range: false, dp: 2 },
  { id: 'sG12', step: 0, label: '<i>σ</i><sub>g12</sub>', hint: 'Direct qubit–qubit coupling spread (small gap)', unit: '%', scale: 0.01, nom: 10, min: 0, max: 80, range: false, dp: 1 },
  { id: 'sQc', step: 0, label: '<i>σ</i><sub>Qc</sub>', hint: 'Coupling-section spread', unit: '%', scale: 0.01, nom: 15, min: 0, max: 80, range: false, dp: 1 },
  { id: 'dEJ', step: 0, kind: 'scatter', sigma: 'sG', label: 'δ<i>E</i><sub>J</sub>', hint: 'Global junction shift window', unit: '%', scale: 0.01, nom: 0, min: -40, max: 40, spanAbs: 20, dp: 2 },
  { id: 'dC', step: 0, kind: 'scatter', sigma: 'sC', label: 'δ<i>C</i>', hint: 'Capacitance window (all pads)', unit: '%', scale: 0.01, nom: 0, min: -40, max: 40, spanAbs: 10, dp: 2 },
  { id: 'dFr', step: 0, kind: 'scatter', sigma: 'sFr', label: 'δ<i>f</i><sub>r</sub>', hint: 'Resonator frequency window', unit: '%', scale: 0.01, nom: 0, min: -10, max: 10, spanAbs: 2, dp: 2 },
  { id: 'dRa', step: 0, kind: 'scatter', sigma: 'sRa', label: 'δ<i>r</i>', hint: 'SQUID area-ratio window', unit: '%', scale: 0.01, nom: 0, min: -40, max: 40, spanAbs: 15, dp: 2 },
  { id: 'dGqc', step: 0, kind: 'scatter', sigma: 'sGqc', label: 'δ<i>g</i><sub>qc</sub>', hint: 'Qubit–coupler coupling window', unit: '%', scale: 0.01, nom: 0, min: -40, max: 40, spanAbs: 10, dp: 2 },
  { id: 'dG12', step: 0, kind: 'scatter', sigma: 'sG12', label: 'δ<i>g</i><sub>12</sub>', hint: 'Direct coupling window', unit: '%', scale: 0.01, nom: 0, min: -80, max: 80, spanAbs: 30, dp: 1 },
  { id: 'dQc', step: 0, kind: 'scatter', sigma: 'sQc', label: 'δ<i>Q</i><sub>c</sub>', hint: 'Coupling-section window', unit: '%', scale: 0.01, nom: 0, min: -80, max: 80, spanAbs: 50, dp: 1 },
  // Step 1 — qubit capacitance
  { id: 'CS', step: 1, label: '<i>C</i><sub>Σ</sub>', hint: 'Total island capacitance', unit: 'fF', scale: 1e-15, nom: 95, min: 10, max: 400, span: 0.3, dp: 1 },
  { id: 'CJ', step: 1, label: '<i>C</i><sub>J</sub>', hint: 'Junction capacitance', unit: 'fF', scale: 1e-15, nom: 2, min: 0, max: 20, range: false, dp: 2 },
  { id: 'nPad', step: 1, label: '<i>N</i><sub>coupler pads</sub>', hint: 'Coupler pads on each island', unit: '', scale: 1, nom: 2, min: 0, max: 6, range: false, dp: 0 },
  // Step 2 — frequency plan
  { id: 'f2', step: 4, qubit: '2', lockActive: true, label: '<i>f</i><sub>max, Q2</sub>', hint: 'Lower qubit sweet spot', unit: 'GHz', scale: 1e9, nom: 6.0, min: 2, max: 12, span: 0.12, dp: 3 },
  { id: 'f1', step: 4, qubit: '1', lockActive: true, label: '<i>f</i><sub>max, Q1</sub>', hint: 'Upper qubit sweet spot', unit: 'GHz', scale: 1e9, nom: 6.4, min: 2, max: 12, span: 0.12, dp: 3 },
  // Step 3 — junction targets
  { id: 'gap', step: 2, label: 'Δ<sub>gap</sub>', hint: 'Superconducting gap: sets I<sub>c</sub>R<sub>n</sub> = πΔ/2e (Al ≈ 180 µeV, Nb ≈ 1.4 meV)', unit: 'µeV', scale: 1e-6 * K.e, nom: 180, min: 10, max: 3000, range: false, dp: 0 },
  { id: 'Rn2', step: 2, qubit: '2', label: '<i>R</i><sub>n,SQ</sub> of Q2', hint: 'Net SQUID resistance: both junctions in parallel, low temperature', unit: 'kΩ', scale: 1e3, nom: 5.937663, min: 0.05, max: 1000, range: false, dp: 4, showIf: (s, q) => q === '2' },
  { id: 'Rn1', step: 2, qubit: '1', label: '<i>R</i><sub>n,SQ</sub> of Q1', hint: 'Net SQUID resistance: both junctions in parallel, low temperature', unit: 'kΩ', scale: 1e3, nom: 5.241678, min: 0.05, max: 1000, range: false, dp: 4, showIf: (s, q) => q === '1' },
  // Step 4 — SQUID asymmetry
  { id: 'rA', step: 3, label: '<i>r</i> = <i>A</i><sub>1</sub>/<i>A</i><sub>2</sub>', hint: 'Junction area ratio', unit: '', scale: 1, nom: 9, min: 1, max: 40, spanAbs: 6, dp: 2 },
  { id: 'phi', step: 3, label: 'Φ<sub>op</sub>/Φ<sub>0</sub>', hint: 'Flux point for the slope', unit: '', scale: 1, nom: 0.1, min: 0, max: 0.5, spanAbs: 0.1, dp: 3 },
  // Step 5 — resonator frequency
  { id: 'resType', step: 5, type: 'select', label: 'Resonator', options: [['quarter', 'λ/4'], ['half', 'λ/2']], nom: 'quarter' },
  { id: 'off', step: 5, label: '<i>f</i><sub>r</sub> − <i>f</i><sub>q</sub>', hint: 'Resonator above its qubit', unit: 'GHz', scale: 1e9, nom: 1.2, min: 0.1, max: 4, span: 0.5, dp: 3 },
  // Step 6 — linewidth
  { id: 'kapMode', step: 6, type: 'select', label: '<i>κ</i> from', options: [['target', 'Target κ'], ['geom', 'Coupler geometry']], nom: 'target' },
  { id: 'kap', step: 6, label: '<i>κ</i>/2π', hint: 'Chosen from readout speed', unit: 'MHz', scale: 1e6, nom: 2.0, min: 0.05, max: 50, span: 0.75, dp: 3, showIf: (s) => s.kapMode.nom === 'target' },
  { id: 'cplType', step: 6, type: 'select', label: 'Hanger section', options: [['ground', 'Ground strip between'], ['edge', 'Edge-coupled']], nom: 'ground' },
  { id: 'dCpl', step: 6, label: '<i>d</i>', hint: 'Ground-strip width between feedline and resonator', unit: 'µm', scale: 1e-6, nom: 9, min: 0.5, max: 200, span: 0.5, dp: 2, showIf: (s) => s.cplType.nom === 'ground' },
  { id: 'scCpl', step: 6, label: '<i>s</i><sub>c</sub>', hint: 'Gap between the two centre conductors', unit: 'µm', scale: 1e-6, nom: 20, min: 0.5, max: 200, span: 0.5, dp: 2, showIf: (s) => s.cplType.nom === 'edge' },
  { id: 'lc', step: 6, label: '<i>ℓ</i><sub>c</sub>', hint: 'Parallel coupling length at the open end', unit: 'µm', scale: 1e-6, nom: 900, min: 1, max: 6000, span: 0.4, dp: 0 },
  { id: 'QcRef', step: 6, label: '<i>Q</i><sub>c, ref</sub>', hint: 'Measured reference coupler', unit: '', scale: 1, nom: 10000, min: 100, max: 1e7, range: false, dp: 0 },
  { id: 'LcRef', step: 6, label: '<i>ℓ</i><sub>c, ref</sub>', hint: 'Its coupling length', unit: 'µm', scale: 1e-6, nom: 500, min: 1, max: 5000, range: false, dp: 0 },
  // Step 7 — readout coupling
  { id: 'mode', step: 7, type: 'select', label: 'Coupling from', options: [['match', 'Match 2χ/κ'], ['cc', 'Claw C<sub>c</sub>']], nom: 'match' },
  { id: 'xT', step: 7, label: '2<i>χ</i>/<i>κ</i> target', hint: 'Separation peaks at 1', unit: '', scale: 1, nom: 1.0, min: 0.05, max: 5, spanAbs: 0.8, dp: 3, showIf: (s) => s.mode.nom === 'match' },
  { id: 'Cc', step: 7, label: '<i>C</i><sub>c</sub>', hint: 'Claw capacitance', unit: 'fF', scale: 1e-15, nom: 4.8, min: 0.1, max: 40, span: 0.5, dp: 2, showIf: (s) => s.mode.nom === 'cc' },
  // Step 8 — photons and Purcell
  { id: 'nbar', step: 8, label: '<i>n̄</i>', hint: 'Readout photon number', unit: '', scale: 1, nom: 15, min: 0, max: 2000, spanAbs: 15, dp: 1 },
  { id: 'filt', step: 8, type: 'select', label: 'Purcell filter', options: [['on', 'Individual'], ['off', 'None']], nom: 'on' },
  { id: 'kF', step: 8, label: '<i>κ</i><sub>F</sub>/2π', hint: 'Filter linewidth', unit: 'MHz', scale: 1e6, nom: 30, min: 1, max: 500, span: 0.6, dp: 1, showIf: (s) => s.filt.nom === 'on' },
  // Step 9 — coupler couplings
  { id: 'gqc', step: 9, label: '<i>g</i><sub>qc</sub>/2π', hint: 'Qubit–coupler coupling', unit: 'MHz', scale: 1e6, nom: 100, min: 5, max: 500, span: 0.4, dp: 1 },
  { id: 'g12', step: 9, label: '<i>g</i><sub>12</sub>/2π', hint: 'Static qubit–qubit coupling', unit: 'MHz', scale: 1e6, nom: 5, min: 0.1, max: 50, span: 0.6, dp: 2 },
  { id: 'Ccpl', step: 9, label: '<i>C</i><sub>cpl</sub>', hint: 'Coupler island capacitance', unit: 'fF', scale: 1e-15, nom: 69, min: 10, max: 300, span: 0.3, dp: 1 },
  // Step 10 — coupler junction
  { id: 'fcm', step: 10, label: '<i>f</i><sub>c, max</sub>', hint: 'Symmetric SQUID sweet spot', unit: 'GHz', scale: 1e9, nom: 10.0, min: 3, max: 20, span: 0.15, dp: 3 },
  { id: 'Jg', step: 10, label: '|<i>J</i><sub>gate</sub>|/2π', hint: 'Coupling during CZ', unit: 'MHz', scale: 1e6, nom: 7, lo: 5, hi: 9, min: 0.2, max: 50, spanAbs: 6, dp: 2 },
];
const INPUT = Object.fromEntries(INPUTS.map((d) => [d.id, d]));

function defaults() {
  const s = {};
  for (const d of INPUTS) {
    if (d.type === 'select') { s[d.id] = { nom: d.nom }; continue; }
    let lo = d.lo != null ? d.lo : d.nom, hi = d.hi != null ? d.hi : d.nom;
    if (d.kind === 'scatter') {
      const sig = INPUT[d.sigma].nom;
      lo = -sig; hi = sig;
    }
    s[d.id] = { nom: d.nom, lo, hi };
  }
  return s;
}

// Geometry-only results are shared by most window corners, so cache them by their inputs
function memo(fn, size = 64) {
  const cache = new Map();
  return (key, ...args) => {
    if (cache.has(key)) return cache.get(key);
    const r = fn(...args);
    if (cache.size >= size) cache.delete(cache.keys().next().value);
    cache.set(key, r);
    return r;
  };
}
const lineOf = memo((v) => P.cpwLine({
  w: v.wC, s: v.sG_, h: v.hSub, epsR: v.epsR, t: v.tF, lam: v.lamL,
  epsEffFixed: v.epsMode === 'fit' ? v.epsFit : 0,
}));
const couplingOf = memo((v, epsEff) => (v.cplType === 'edge'
  ? P.coupledCPW(v.wC, v.sG_, v.scCpl, epsEff)
  : P.coupledCPWGround(v.wC, v.sG_, v.dCpl, epsEff)));
const lengthFor = memo((Q, p) => P.couplingLengthFor(Q, p), 128);

/** The full chain for one set of SI input values. Returns a flat node map. */
function evaluate(v) {
  const n = { $: v };
  const fT = {}, EJof = {};

  // Step 0: CPW from substrate and geometry, including kinetic inductance
  const lineKey = [v.wC, v.sG_, v.hSub, v.epsR, v.tF, v.lamL, v.epsMode, v.epsFit].join();
  const line = lineOf(lineKey, v);
  n.epsEff = line.epsEff;
  n.epsGeo = line.epsGeo;
  n.Z0 = line.Z;
  n.Zgeo = line.Zgeo;
  n.Cl = line.Cl;
  n.Lg = line.Lg;
  n.Lk = line.Lk;
  n.alphaK = line.alphaK;
  n.LkSq = line.LkSq;
  n.vph = line.v;
  n.K = line.v / 4;                             // λ/4 length constant, m·Hz
  const cpl = couplingOf([lineKey, v.cplType, v.dCpl, v.scCpl].join(), v, line.epsEff);
  n.cm = cpl.cm;
  n.lm = cpl.lm;

  // Step 1
  n.CS_d = v.CS;
  n.CS_a = v.CS * (1 + v.dC);
  n.EC_d = K.e * K.e / (2 * n.CS_d * K.h);
  n.EC_a = K.e * K.e / (2 * n.CS_a * K.h);

  // Junction and frequency plan. The active qubit's junction is drawn (R_n), so through
  // I_c R_n = πΔ/2e the gap sets its I_c, E_J and sweet spot; a window on its f_max shifts it
  // relative to that value. The other qubit's sweet spot is planned and its junction solved.
  n.IcRn = Math.PI * v.gap / (2 * K.e);
  for (const q of QUBITS) {
    const fIn = v['f' + q], f0 = v._fNom ? v._fNom[q] : fIn;
    if (q === v.active) {
      const EJj = K.Phi0 * (n.IcRn / v['Rn' + q]) / (TAU * K.h);
      fT[q] = P.f01(EJj, n.EC_d) + (fIn - f0);
      EJof[q] = fIn === f0 ? EJj : P.EJfromF01(fT[q], n.EC_d);
    } else {
      fT[q] = fIn;
      EJof[q] = P.EJfromF01(fIn, n.EC_d);
    }
  }

  for (const q of QUBITS) {
    // Steps 2–4: junction target from the design point, actual qubit from the scattered junction
    const EJd = EJof[q];
    const EJa = EJd * (1 + v.dEJ) * (1 + (v['dEJl_' + q] || 0));
    const fq = P.f01(EJa, n.EC_a);
    n['fT_' + q] = fT[q];
    n['EJd_' + q] = EJd;
    n['EJasym_' + q] = P.EJasymptotic(fT[q], n.EC_d);
    n['EJa_' + q] = EJa;
    n['ratio_' + q] = EJd / n.EC_d;
    n['fq_' + q] = fq;
    n['alpha_' + q] = P.anharmonicity(EJa, n.EC_a);
    n['alphaD_' + q] = P.anharmonicity(EJd, n.EC_d);
    n['alphaRel_' + q] = n['alpha_' + q] / n.EC_a;
    n['disp_' + q] = P.chargeDispersion01(EJa, n.EC_a);
    n['LJ_' + q] = Math.pow(K.Phi0 / TAU, 2) / (K.h * EJd);
    const Ic = TAU * K.h * EJd / K.Phi0;
    n['Ic_' + q] = Ic;
    n['Rn_' + q] = Math.PI * v.gap / (2 * K.e * Ic);
    const Ica = TAU * K.h * EJa / K.Phi0;
    n['Ica_' + q] = Ica;
    n['LJa_' + q] = Math.pow(K.Phi0 / TAU, 2) / (K.h * EJa);
    n['Rna_' + q] = n.IcRn / Ica;
    n['ratioA_' + q] = EJa / n.EC_a;
    const S = 0.5 * (fq + n.EC_a) / fq;
    n['sens_' + q] = S;
    n['sigG_' + q] = S * v.sG * fq;
    n['sigL_' + q] = S * v.sL * fq;

    const d = (v.rA - 1) / (v.rA + 1);
    n.dAsym = d;
    n['EJ1_' + q] = EJd * v.rA / (v.rA + 1);
    n['EJ2_' + q] = EJd / (v.rA + 1);
    n['Rn1_' + q] = Math.PI * v.gap / (2 * K.e * (TAU * K.h * n['EJ1_' + q] / K.Phi0));
    n['Rn2_' + q] = Math.PI * v.gap / (2 * K.e * (TAU * K.h * n['EJ2_' + q] / K.Phi0));
    const rAa = v.rA * (1 + (v.dRa || 0)), da = (rAa - 1) / (rAa + 1);
    n.dAsymA = da;
    n['EJ1a_' + q] = EJa * rAa / (rAa + 1);
    n['EJ2a_' + q] = EJa / (rAa + 1);
    n['Rn1a_' + q] = n.IcRn / (TAU * K.h * n['EJ1a_' + q] / K.Phi0);
    n['Rn2a_' + q] = n.IcRn / (TAU * K.h * n['EJ2a_' + q] / K.Phi0);
    n['fmin_' + q] = P.f01(EJa * da, n.EC_a);
    n['range_' + q] = fq - n['fmin_' + q];
    const fAt = (phi) => P.f01(EJa * P.squid(phi, da), n.EC_a);
    const hph = 1e-4, ph = Math.min(Math.max(v.phi, hph), 0.5 - hph);
    n['slope_' + q] = Math.abs(fAt(ph + hph) - fAt(ph - hph)) / (2 * hph);  // Hz per Φ0
    n['fAtPhi_' + q] = fAt(v.phi);

    // Step 5: resonator placed from the design point, then scattered
    const frd = fT[q] + v.off;
    const fra = frd * (1 + v.dFr);
    // Lumped C_r = C_l·ℓ/2: π/(4ω_rZ) for λ/4, π/(2ω_rZ) for λ/2
    const nC = v.resType === 'half' ? 4 : 8;
    const Crd = 1 / (nC * frd * n.Z0), Cra = 1 / (nC * fra * n.Z0);
    n['frd_' + q] = frd;
    n['fra_' + q] = fra;
    n['Crd_' + q] = Crd;
    n['Vzpf_' + q] = Math.sqrt(K.hbar * TAU * fra / (2 * Cra));
    n['nth_' + q] = P.nth(fra, v.T);
    const Dd = fT[q] - frd, Da = fq - fra;
    n['DeltaD_' + q] = Dd;
    n['Delta_' + q] = Da;

    // Step 6: κ either chosen, or set by the hanger section's length and spacing
    const qp = { f: frd, v: n.vph, Zr: n.Z0, Zf: n.Z0, Cr: Crd, cm: n.cm, lm: n.lm };
    const QcGeom = P.hangerQc({ ...qp, lc: v.lc });
    const kapd = v.kapMode === 'geom' ? frd / QcGeom : v.kap;
    n['QcGeom_' + q] = QcGeom;
    n['kapd_' + q] = kapd;
    n['lcNeed_' + q] = lengthFor([frd, v.kap, n.vph, n.Z0, n.cm, n.lm, v.resType].join(), frd / v.kap, qp);
    n['QcRefModel_' + q] = P.hangerQc({ ...qp, lc: v.LcRef });
    const Qcd = frd / kapd, Qca = Qcd * (1 + v.dQc);
    const kapa = fra / Qca;
    n['Qcd_' + q] = Qcd;
    n['Qca_' + q] = Qca;
    n['kapa_' + q] = kapa;
    n['Ql_' + q] = 1 / (1 / Qca + 1 / v.Qi);
    n['tau_' + q] = 1 / (TAU * kapa);

    // Step 7: g designed at the nominal detuning, claw frozen, then evaluated at the actual point
    const aD = n['alphaD_' + q];
    let gd, Ccd;
    if (v.mode === 'cc') {
      Ccd = v.Cc;
      gd = (Ccd / 2) * Math.sqrt(TAU * fT[q] * TAU * frd / (n.CS_d * Crd)) / TAU;
    } else {
      gd = Math.sqrt(v.xT * kapd * Math.abs(Dd * (Dd + aD)) / (2 * Math.abs(aD)));
      Ccd = 2 * TAU * gd * Math.sqrt(n.CS_d * Crd / (TAU * fT[q] * TAU * frd));
    }
    const Cca = Ccd * (1 + v.dC);
    const ga = (Cca / 2) * Math.sqrt(TAU * fq * TAU * fra / (n.CS_a * Cra)) / TAU;
    const al = n['alpha_' + q];
    const chi = ga * ga * al / (Da * (Da + al));
    const x = 2 * Math.abs(chi) / kapa;
    n['gd_' + q] = gd;
    n['Ccd_' + q] = Ccd;
    n['ga_' + q] = ga;
    n['chi_' + q] = chi;
    n['xa_' + q] = x;
    n['sep_' + q] = 2 * x / (1 + x * x);
    n['gMis_' + q] = Math.sqrt(Math.abs(chi * Da));
    n['gOverD_' + q] = ga / Math.abs(Da);
    n['push_' + q] = ga * ga / Math.abs(Da);

    // Step 5 (cont.): claw loading needs the frozen claw from step 7
    const Cload = 1 / (1 / Ccd + 1 / n.CS_d);
    const dfL = -frd * Cload / (2 * Crd);
    n['dfLoad_' + q] = dfL;
    n['fbare_' + q] = frd - dfL;
    const fb = frd - dfL;
    n['ell4_' + q] = n.vph / (4 * fb) - v.dl;
    n['ell2_' + q] = n.vph / (2 * fb) - 2 * v.dl;
    n['ell_' + q] = v.resType === 'half' ? n['ell2_' + q] : n['ell4_' + q];

    // Step 8
    const ncrit = Math.pow(Da / (2 * ga), 2);
    n['ncrit_' + q] = ncrit;
    n['nRatio_' + q] = v.nbar / ncrit;
    n['chiN_' + q] = chi * (1 - (v.nbar + 1) / (2 * ncrit));
    const Pin = v.nbar * K.hbar * Math.pow(TAU * fra, 2) * Qca / (2 * Math.pow(n['Ql_' + q], 2));
    n['Pin_' + q] = 10 * Math.log10(Pin / 1e-3);
    const T1u = Math.pow(Da / ga, 2) / (TAU * kapa);
    n['T1u_' + q] = T1u;
    n['T1f_' + q] = T1u * Math.pow(2 * Da / v.kF, 2);
    n['T1P_' + q] = v.filt === 'on' ? n['T1f_' + q] : T1u;
    n['kn_' + q] = kapa * v.nbar;
    n['Tphi_' + q] = 1 / (n['nth_' + q] * TAU * kapa * (4 * chi * chi) / (kapa * kapa + 4 * chi * chi));
  }

  // Step 2: pair quantities
  n.D12 = n.fq_1 - n.fq_2;
  n.D12d = fT[1] - fT[2];
  n.fCZ = n.fq_2 - n.alpha_1;
  n.exc = n.fq_1 - n.fCZ;
  n.sigPair = Math.hypot(n.sigL_1, n.sigL_2);
  n.czMargin = n.exc / n.sigPair;
  n.czReach = n.fmin_1 <= n.fCZ ? 1 : 0;
  n.frSpacing = Math.abs(n.fra_1 - n.fra_2);
  n.frSpacingReq = 3 * Math.SQRT2 * v.sFr * Math.max(n.frd_1, n.frd_2);

  // Steps 9–10: coupler
  const offPoint = (f1, f2, gqc, g12) => P.findRoot((fc) => P.Jnet(fc, f1, f2, gqc, g12), Math.max(f1, f2) + 1e6, 40e9);
  const gqcA = v.gqc * (1 + (v.dGqc || 0)), g12A = v.g12 * (1 + (v.dG12 || 0));
  n.fc_off_d = offPoint(fT[1], fT[2], v.gqc, v.g12);
  n.fc_off_a = offPoint(n.fq_1, n.fq_2, gqcA, g12A);
  for (const q of QUBITS) {
    n['Cqc_' + q] = 2 * TAU * v.gqc * Math.sqrt(n.CS_d * v.Ccpl / (TAU * fT[q] * TAU * n.fc_off_d));
    n['Cg_' + q] = n.CS_d - n['Ccd_' + q] - v.nPad * n['Cqc_' + q] - v.CJ;
  }
  n.C12 = 2 * v.g12 * n.CS_d / Math.sqrt(fT[1] * fT[2]);
  n.Cvia = n.Cqc_1 * n.Cqc_2 / v.Ccpl;
  n.Cdir = n.C12 - n.Cvia;
  n.ECc_d = K.e * K.e / (2 * v.Ccpl * K.h);
  n.ECc_a = K.e * K.e / (2 * v.Ccpl * (1 + v.dC) * K.h);
  n.EJc_d = P.EJfromF01(v.fcm, n.ECc_d);
  n.EJc_a = n.EJc_d * (1 + v.dEJ) * (1 + (v.dEJl_c || 0));
  n.ratioC = n.EJc_d / n.ECc_d;
  n.fcm_a = P.f01(n.EJc_a, n.ECc_a);
  n.Icc = TAU * K.h * n.EJc_d / K.Phi0;
  n.RnJ = Math.PI * v.gap / (2 * K.e * (n.Icc / 2));
  n.RnJa = n.IcRn / (TAU * K.h * n.EJc_a / K.Phi0 / 2);
  n.offMargin = n.fcm_a - n.fc_off_a;
  n.offClear = n.fc_off_a - Math.max(n.fq_1, n.fq_2);
  n.fc_gate = P.findRoot((fc) => P.Jnet(fc, n.fq_1, n.fq_2, gqcA, g12A) + v.Jg, Math.max(n.fq_1, n.fq_2) + 1e6, n.fc_off_a);
  n.gateClear = n.fc_gate - Math.max(n.fq_1, n.fq_2);
  n.tCZ = 1 / (2 * Math.SQRT2 * v.Jg);
  n.zz = 2 * g12A * g12A * (n.alpha_1 + n.alpha_2) / ((n.D12 + n.alpha_1) * (n.D12 - n.alpha_2));
  n.Jmax = P.Jnet(n.fcm_a, n.fq_1, n.fq_2, gqcA, g12A);
  const EJoff = P.EJfromF01(n.fc_off_a, n.ECc_a);
  n.phiOff = Math.acos(Math.min(1, EJoff / n.EJc_a)) / Math.PI;
  const EJgate = P.EJfromF01(n.fc_gate, n.ECc_a);
  n.phiGate = Math.acos(Math.min(1, EJgate / n.EJc_a)) / Math.PI;
  return n;
}

/** SI inputs plus the active qubit and the f_max nominals its window is measured from. */
function baseValues(state, active = '2') {
  return { ...siValues(state), active, _fNom: { 2: state.f2.nom * 1e9, 1: state.f1.nom * 1e9 } };
}

function siValues(state, pick) {
  const v = {};
  for (const d of INPUTS) {
    const s = state[d.id];
    v[d.id] = d.type === 'select' ? s.nom : s[pick || 'nom'] * d.scale;
  }
  return v;
}

// Fab-process variables and the 1σ that drives each. The local junction spread is independent
// per junction (both qubits and the coupler); the global spread and capacitances are common.
const SIGMA_VARS = [
  ['dEJ', 'sG'], ['dEJl_2', 'sL'], ['dEJl_1', 'sL'], ['dEJl_c', 'sL'],
  ['dC', 'sC'], ['dFr', 'sFr'], ['dQc', 'sQc'],
  ['dRa', 'sRa'], ['dGqc', 'sGqc'], ['dG12', 'sG12'],
];

/**
 * 1σ fab uncertainty of every node by linear propagation (central differences at the nominal
 * point), summed in quadrature: σ_y² = Σ (∂y/∂x_i · σ_i)². Design windows do not enter.
 */
function sigmas(base) {
  const S = {};
  for (const [x, s] of SIGMA_VARS) {
    const sig = base[s];
    if (!(sig > 0)) continue;
    const h = sig * 0.01, x0 = base[x] || 0;
    const up = evaluate({ ...base, [x]: x0 + h }), dn = evaluate({ ...base, [x]: x0 - h });
    for (const k in up) {
      if (typeof up[k] !== 'number') continue;
      const d = ((up[k] - dn[k]) / (2 * h)) * sig;
      if (isFinite(d)) S[k] = (S[k] || 0) + d * d;
    }
  }
  for (const k in S) S[k] = Math.sqrt(S[k]);
  return S;
}

/** Evaluate nominal and the window box; returns nominal nodes, per-node ranges and plot contexts. */
function run(state, active = '2') {
  const t0 = performance.now();
  const base = baseValues(state, active);
  const nom = evaluate(base);
  const ranged = INPUTS.filter((d) => d.type !== 'select' && d.range !== false &&
    (state[d.id].lo < state[d.id].nom || state[d.id].hi > state[d.id].nom));
  const k = ranged.length;
  const samples = [], corners = [];
  // Both window ends are always sampled; for a one-sided window one end is the nominal
  const levelsOf = (d, three) => {
    const s = state[d.id];
    const L = three ? [s.lo, s.nom, s.hi] : [s.lo, s.hi];
    return L.filter((x, i) => L.indexOf(x) === i).map((x) => x * d.scale);
  };
  if (k > 0 && k <= 8) {
    const three = k <= 5;
    const levels = ranged.map((d) => levelsOf(d, three));
    const idx = new Array(k).fill(0);
    for (;;) {
      const v = Object.assign({}, base);
      let isCorner = true;
      for (let i = 0; i < k; i++) {
        v[ranged[i].id] = levels[i][idx[i]];
        if (three && levels[i].length === 3 && idx[i] === 1) isCorner = false;
      }
      const n = evaluate(v);
      samples.push(n);
      if (isCorner) corners.push(n);
      let i = 0;
      while (i < k && ++idx[i] >= levels[i].length) { idx[i] = 0; i++; }
      if (i === k) break;
    }
  } else if (k > 8) {
    // Sign-vertex method: move one window at a time to each end, then evaluate every node at the
    // vertex those one-at-a-time slopes point to (its predicted max and min). Exact for nodes that
    // are monotone in each window; 2k + (distinct vertices) evaluations instead of 2^k.
    const ends = ranged.map((d) => [evaluate({ ...base, [d.id]: state[d.id].lo * d.scale }), evaluate({ ...base, [d.id]: state[d.id].hi * d.scale })]);
    for (const [a, b] of ends) samples.push(a, b);
    const vertices = new Set();
    for (const key in nom) {
      if (typeof nom[key] !== 'number') continue;
      const up = ends.map(([a, b]) => (b[key] >= a[key] ? '1' : '0')).join('');
      vertices.add(up);
      vertices.add(up.replace(/[01]/g, (c) => (c === '1' ? '0' : '1')));
    }
    for (const pattern of vertices) {
      const v = Object.assign({}, base);
      ranged.forEach((d, i) => { v[d.id] = state[d.id][pattern[i] === '1' ? 'hi' : 'lo'] * d.scale; });
      const n = evaluate(v);
      samples.push(n);
      corners.push(n);
    }
  }

  const R = {};
  for (const key in nom) {
    if (typeof nom[key] !== 'number') continue;
    let lo = nom[key], hi = nom[key], bad = !isFinite(nom[key]);
    for (const s of samples) {
      const x = s[key];
      if (!isFinite(x)) { bad = true; continue; }
      if (!(x >= lo)) lo = x;
      if (!(x <= hi)) hi = x;
    }
    R[key] = { lo, hi, bad };
  }
  const ctx = corners.length > 256 ? corners.filter((_, i) => i % Math.ceil(corners.length / 256) === 0) : corners;
  return {
    nom, R, S: sigmas(base), ctx: [nom].concat(ctx), ranged: ranged.map((d) => d.id),
    evals: samples.length + 1, ms: performance.now() - t0,
  };
}

/** Design checks over nominal values and windows. */
function checks(res) {
  const { nom: n, R } = res, v = n.$;
  const out = [];
  const add = (sev, step, msg, q) => out.push({ sev, step, msg, q });
  const lo = (k) => (R[k] ? R[k].lo : n[k]), hi = (k) => (R[k] ? R[k].hi : n[k]);
  const MHz = (x) => (x / 1e6).toFixed(0) + ' MHz', GHz = (x) => (x / 1e9).toFixed(2) + ' GHz';

  for (const key in n) {
    if (typeof n[key] === 'number' && !isFinite(n[key])) {
      add('error', null, `Node “${key}” is not finite at the nominal point; an upstream input is out of range.`);
      break;
    }
  }

  if (Math.abs(n.Z0 - 50) > 5) add('warn', 0, `CPW impedance Z₀ = ${n.Z0.toFixed(1)} Ω; adjust w or s to match the 50 Ω feedline and electronics.`);
  if (n.alphaK > 0.1) add('warn', 0, `Kinetic-inductance fraction ${(n.alphaK * 100).toFixed(1)} %: resonator frequencies now follow film thickness and λ_L scatter.`);
  else if (n.alphaK > 0.02) add('info', 0, `Kinetic-inductance fraction ${(n.alphaK * 100).toFixed(1)} % lowers resonators by ≈ ${(n.alphaK * 50).toFixed(1)} %.`);

  for (const q of QUBITS) {
    const Q = 'Q' + q;
    const r = n['ratio_' + q], a = Math.abs(n['alpha_' + q]);
    if (r < 20) add('error', 1, `${Q}: E_J/E_C = ${r.toFixed(0)} is outside the transmon regime; charge noise dominates.`, q);
    else if (r < 50) add('warn', 1, `${Q}: E_J/E_C = ${r.toFixed(0)} < 50; charge dispersion ${(n['disp_' + q] / 1e3).toFixed(1)} kHz.`, q);
    if (a < 150e6) add('warn', 1, `${Q}: |α| = ${MHz(a)} < 150 MHz; leakage and CZ room get tight.`, q);
    if (a > 350e6) add('warn', 1, `${Q}: |α| = ${MHz(a)} is large; E_J/E_C drops and charge noise grows.`, q);
    if (n['Cg_' + q] <= 0) add('error', 1, `${Q}: island budget C_g = ${(n['Cg_' + q] * 1e15).toFixed(1)} fF; attached capacitances exceed C_Σ.`, q);

    if (hi('fra_' + q) > v.fband) add('error', 5, `R${q}: f_r up to ${GHz(hi('fra_' + q))} exceeds the ${GHz(v.fband)} electronics band.`, q);
    else if (hi('fra_' + q) > v.fband - 0.2e9) add('warn', 5, `R${q}: f_r within 200 MHz of the band edge.`, q);
    const Dmin = Math.min(Math.abs(lo('Delta_' + q)), Math.abs(hi('Delta_' + q)));
    if (lo('Delta_' + q) * hi('Delta_' + q) <= 0 || Dmin <= a) {
      add('error', 5, `${Q}: |Δ| reaches ${MHz(Dmin)} ≤ |α|; the pair straddles and the dispersive model fails.`, q);
    } else if (Dmin < a + 3 * n['sigG_' + q]) {
      add('warn', 5, `${Q}: |Δ| = ${MHz(Dmin)} at the window edge is below |α| + 3σ_global.`, q);
    }

    if (n['Qcd_' + q] > v.Qi / 10) add('warn', 6, `R${q}: Q_c = ${n['Qcd_' + q].toFixed(0)} is within 10× of Q_i; internal loss enters κ.`, q);
    if (n['kapd_' + q] > 10e6) add('warn', 6, `R${q}: κ/2π = ${MHz(n['kapd_' + q])} needs a strong filter and a parametric amplifier.`, q);
    if (v.kapMode === 'target' && !isFinite(n['lcNeed_' + q])) add('error', 6, `R${q}: no coupling length up to λ/4 reaches κ/2π = ${MHz(v.kap)}; narrow the spacing.`, q);
    if (v.lc > n['ell_' + q]) add('error', 6, `R${q}: coupling length ${(v.lc * 1e6).toFixed(0)} µm exceeds the resonator length.`, q);

    const xl = lo('xa_' + q), xh = hi('xa_' + q);
    if (lo('sep_' + q) < 0.8) add('warn', 7, `${Q}: 2χ/κ spans ${xl.toFixed(2)}–${xh.toFixed(2)}; readout separation drops to ${(lo('sep_' + q) * 100).toFixed(0)} %.`, q);
    if (n['gOverD_' + q] > 0.1) add('warn', 7, `${Q}: g/|Δ| = ${n['gOverD_' + q].toFixed(3)} > 0.1; dispersive approximation weakens.`, q);

    const nc = n['ncrit_' + q];
    if (v.nbar > nc) add('error', 8, `${Q}: n̄ = ${v.nbar.toFixed(0)} exceeds n_crit = ${nc.toFixed(0)}; readout is not QND.`, q);
    else if (v.nbar > nc / 3) add('warn', 8, `${Q}: n̄ = ${v.nbar.toFixed(0)} > n_crit/3 = ${(nc / 3).toFixed(0)}; χ drifts with power.`, q);
    if (lo('T1P_' + q) < 1e-3) add('warn', 8, `${Q}: Purcell T₁ down to ${(lo('T1P_' + q) * 1e6).toFixed(0)} µs${v.filt === 'on' ? '' : '; add a Purcell filter'}.`, q);
  }

  if (n.fT_1 <= n.fT_2) add('error', 4, `Q1 must be the upper qubit (f_max,Q1 > f_max,Q2).`);
  else {
    if (n.exc < 0) add('warn', 4, `Q1 idles below the CZ point by ${MHz(-n.exc)}; tune Q2 down instead.`);
    else if (n.czMargin < 2) add('warn', 4, `CZ excursion ${MHz(n.exc)} is only ${n.czMargin.toFixed(1)}σ of the pair spread.`);
    if (!n.czReach) add('error', 3, `Q1 tunes down only to ${GHz(n.fmin_1)}; the CZ point ${GHz(n.fCZ)} is out of reach.`);
    const sp = n.sigPair;
    if (Math.abs(n.D12) < 3 * sp) add('warn', 4, `Idle qubits only ${MHz(Math.abs(n.D12))} apart (< 3σ pair).`);
    const cz = Math.abs(Math.abs(n.D12) - Math.abs(n.alpha_1));
    if (cz < sp) add('warn', 4, `Idle detuning sits ${MHz(cz)} from the |11⟩↔|20⟩ collision (< 1σ).`);
    else if (cz < 3 * sp) add('info', 4, `Idle detuning is ${MHz(cz)} from the |11⟩↔|20⟩ collision (< 3σ); rely on tunability.`);
  }
  if (n.frSpacing < n.frSpacingReq) add('warn', 5, `Resonators ${MHz(n.frSpacing)} apart; need ≥ ${MHz(n.frSpacingReq)} (3√2σ_r).`);

  if (n.Cdir < 0) add('error', 9, `Coupler path alone gives ${(n.Cvia * 1e15).toFixed(3)} fF > C₁₂,eff; no positive direct gap realises g₁₂.`);
  if (n.Cqc_1 > 10e-15) add('warn', 9, `C_qc = ${(n.Cqc_1 * 1e15).toFixed(1)} fF is large; it loads the qubit island.`);

  if (!isFinite(n.fc_off_a)) add('error', 10, 'No coupler off point above the qubits (needs g₁₂ > 0).');
  else {
    const m = lo('fcm_a') - hi('fc_off_a');
    if (m < 0) add('error', 10, `Coupler f_max (≥ ${GHz(lo('fcm_a'))}) may not reach the off point (≤ ${GHz(hi('fc_off_a'))}).`);
    else if (m < 0.3e9) add('warn', 10, `Only ${MHz(m)} between the lowest f_max and the highest off point.`);
    if (n.offClear < 0.6e9) add('warn', 10, `Off point only ${MHz(n.offClear)} above the upper qubit (< 0.6 GHz).`);
  }
  if (!isFinite(n.fc_gate)) add('error', 10, `|J| = ${MHz(v.Jg)} is not reachable between the qubits and the off point.`);
  else if (lo('gateClear') < 0.6e9) add('warn', 10, `Gate point only ${MHz(lo('gateClear'))} above the upper qubit; the coupler stops being virtual.`);
  return out;
}
/**
 * Inputs that a node depends on at the current point: nudge each input (or flip each select)
 * and keep those that move the node. Hidden inputs (showIf false) are skipped.
 */
function dependencies(state, key, active = '2') {
  const base = baseValues(state, active);
  const y0 = evaluate(base)[key];
  if (typeof y0 !== 'number') return [];
  const out = [];
  for (const d of INPUTS) {
    if (d.showIf && !d.showIf(state, active)) continue;
    const trials = [];
    if (d.type === 'select') {
      for (const [opt] of d.options) if (opt !== base[d.id]) trials.push(opt);
    } else {
      const nom = state[d.id].nom;
      const step = Math.max(Math.abs(nom) * 1e-3, (d.max - d.min) * 1e-5);
      trials.push((nom + step) * d.scale);
    }
    for (const t of trials) {
      // The active qubit's f_max box is read-only: move its nominal with it, so only R_n, gap, C_Σ count
      const locked = d.lockActive && d.qubit === active;
      const y = evaluate({ ...base, [d.id]: t, ...(locked ? { _fNom: { ...base._fNom, [d.qubit]: t } } : {}) })[key];
      const moved = isFinite(y0) ? Math.abs(y - y0) > 1e-9 * Math.max(Math.abs(y0), 1e-300) : isFinite(y);
      if (moved) { out.push(d.id); break; }
    }
  }
  return out;
}

export { INPUTS, INPUT, QUBITS, SIGMA_VARS, defaults, evaluate, run, checks, siValues, baseValues, sigmas, dependencies };

