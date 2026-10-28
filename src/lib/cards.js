/* Card specifications for steps 0–10: outputs, inherited values, formulas and plots.
   Keys ending in _Q resolve to the active qubit (_2 or _1). Plot functions take display units. */
import * as P from './physics.js';
import { COLORS as C } from './plots.js';


const K = P.K;

const U = {
  GHz: (v) => v / 1e9, MHz: (v) => v / 1e6, kHz: (v) => v / 1e3, Hz: (v) => v,
  fF: (v) => v * 1e15, nH: (v) => v * 1e9, nA: (v) => v * 1e9, kOhm: (v) => v / 1e3,
  um: (v) => v * 1e6, uV: (v) => v * 1e6, us: (v) => v * 1e6, ms: (v) => v * 1e3, ns: (v) => v * 1e9,
  one: (v) => v, mGHzum: (v) => v * 1e-3, pct: (v) => v * 100,
};
const ECof = (CfF) => K.e * K.e / (2 * CfF * 1e-15 * K.h);
const at = (c, q, k) => c[k + '_' + q];
// CPW line for a context's inputs, with optional overrides (SI)
// Plots call these once per point and per window corner, but the geometry repeats across
// corners, so results are cached by their arguments (the ground-strip solve costs ~0.25 ms).
function cached(fn, size = 2000) {
  const cache = new Map();
  return (key, make) => {
    let r = cache.get(key);
    if (r === undefined) {
      r = make();
      if (cache.size >= size) cache.delete(cache.keys().next().value);
      cache.set(key, r);
    }
    return r;
  };
}
const lineCache = cached(), couplingCache = cached();
const lineAt = (c, o = {}) => {
  const a = {
    w: c.$.wC, s: c.$.sG_, h: c.$.hSub, epsR: c.$.epsR, t: c.$.tF, lam: c.$.lamL,
    epsEffFixed: c.$.epsMode === 'fit' ? c.$.epsFit : 0, ...o,
  };
  return lineCache([a.w, a.s, a.h, a.epsR, a.t, a.lam, a.epsEffFixed].join(), () => P.cpwLine(a));
};
const couplingAt = (c, d, sc) => {
  const edge = c.$.cplType === 'edge';
  const gap = edge ? (sc != null ? sc : c.$.scCpl) : (d != null ? d : c.$.dCpl);
  return couplingCache([edge, c.$.wC, c.$.sG_, gap, c.epsEff].join(), () => (edge
    ? P.coupledCPW(c.$.wC, c.$.sG_, gap, c.epsEff)
    : P.coupledCPWGround(c.$.wC, c.$.sG_, gap, c.epsEff)));
};
const qcAt = (c, q, lc, spacing) => {
  const k = couplingAt(c, spacing, spacing);
  return P.hangerQc({ f: at(c, q, 'frd'), v: c.vph, Zr: c.Z0, Zf: c.Z0, Cr: at(c, q, 'Crd'), lc, cm: k.cm, lm: k.lm });
};

// LaTeX number: significant digits, thin-space grouping, proper minus
function tx(v, sig) {
  if (!isFinite(v)) return '\\text{—}';
  const a = Math.abs(v);
  if (a !== 0 && (a < 1e-3 || a >= 1e6)) {
    const e = Math.floor(Math.log10(a));
    return (v / Math.pow(10, e)).toFixed(2) + '\\times10^{' + e + '}';
  }
  const d = Math.max(0, Math.min(6, (sig || 4) - 1 - Math.floor(Math.log10(a || 1))));
  let s = Math.abs(v).toFixed(d);
  if (a >= 1e4) s = s.replace(/\B(?=(\d{3})+(?!\d))/g, '\\,');
  return (v < 0 ? '-' : '') + s;
}

const CARDS = [
  {
    id: 's0', step: 0, section: 'constraints', wide: true, tag: 'fixed',
    title: 'Constraints, CPW and process statistics',
    lede: 'What cannot move: substrate and CPW cross-section, superconducting film, electronics band, readout-line temperature and junction statistics.',
    groups: [
      { title: 'Substrate and CPW', ids: ['epsR', 'hSub', 'wC', 'sG_', 'epsMode', 'epsFit', 'dl'] },
      { title: 'Film and kinetic inductance', ids: ['tF', 'lamL'] },
      { title: 'Band and readout line', ids: ['fband', 'T', 'Qi'] },
      { title: 'Process statistics, 1σ', ids: ['sG', 'sL', 'sC', 'sFr', 'sQc', 'sRa', 'sGqc', 'sG12'] },
      { title: 'Fab-scatter windows', ids: ['dEJ', 'dC', 'dFr', 'dQc', 'dRa', 'dGqc', 'dG12'] },
    ],
    primary: { key: 'epsEff', label: 'Effective permittivity <i>ε</i><sub>eff</sub>', unit: '', conv: U.one, sig: 4 },
    outputs: [
      { key: 'Z0', label: 'Impedance <i>Z</i><sub>0</sub>', unit: 'Ω', conv: U.one, sig: 4, sum: true },
      { key: 'vph', label: 'Phase velocity <i>v</i><sub>ph</sub>', unit: '×10⁸ m/s', conv: (v) => v / 1e8 },
      { key: 'alphaK', label: 'Kinetic fraction <i>α</i><sub>k</sub>', unit: '%', conv: U.pct, sig: 3, sum: true },
      { key: 'LkSq', label: 'Sheet <i>L</i><sub>k,□</sub>', unit: 'pH/□', conv: (v) => v * 1e12, sig: 3 },
      { key: 'Cl', label: '<i>C</i><sub>ℓ</sub>', unit: 'pF/m', conv: (v) => v * 1e12 },
      { key: 'Lg', label: 'Geometric <i>L</i><sub>g</sub>', unit: 'nH/m', conv: (v) => v * 1e9 },
      { key: 'Lk', label: 'Kinetic <i>L</i><sub>k</sub>', unit: 'nH/m', conv: (v) => v * 1e9, sig: 3 },
      { key: 'Zgeo', label: '<i>Z</i><sub>0</sub> without <i>L</i><sub>k</sub>', unit: 'Ω', conv: U.one, sig: 4 },
      { key: 'ell4_Q', label: 'CPW λ/4 length at <i>f</i><sub>r</sub>', unit: 'µm', conv: U.um, sig: 5, sum: true },
      { key: 'ell2_Q', label: 'CPW λ/2 length at <i>f</i><sub>r</sub>', unit: 'µm', conv: U.um, sig: 5 },
      { key: 'sigG_Q', label: '<i>σ</i><sub>f</sub> global at <i>f</i><sub>max</sub>', unit: 'MHz', conv: U.MHz, noSigma: true },
      { key: 'sigL_Q', label: '<i>σ</i><sub>f</sub> local at <i>f</i><sub>max</sub>', unit: 'MHz', conv: U.MHz, noSigma: true },
    ],
    formulas: [
      'k_0 = \\frac{w}{w+2s},\\qquad k_1 = \\frac{\\sinh(\\pi w/4h)}{\\sinh\\left(\\pi(w+2s)/4h\\right)},\\qquad k^{\\prime} = \\sqrt{1-k^2}',
      '\\varepsilon_\\mathrm{eff} = 1 + \\frac{\\varepsilon_r - 1}{2}\\,\\frac{K(k_1)\\,K(k_0^{\\prime})}{K(k_1^{\\prime})\\,K(k_0)}',
      'C_\\ell = 4\\varepsilon_0\\varepsilon_\\mathrm{eff}\\,\\frac{K(k_0)}{K(k_0^{\\prime})},\\qquad L_g = \\frac{\\mu_0}{4}\\,\\frac{K(k_0^{\\prime})}{K(k_0)}',
      'L_k = \\mu_0\\lambda_L\\,\\frac{C}{4ADK(k_0)^2}\\left[\\frac{1.7}{\\sinh(t/2\\lambda_L)} + \\frac{0.4}{\\sqrt{\\left[(B/A)^2-1\\right]\\left[1-(B/D)^2\\right]}}\\right]',
      'A = -\\tfrac{t}{\\pi} + \\tfrac12\\sqrt{(2t/\\pi)^2 + w^2},\\qquad B = \\tfrac{w^2}{4A},\\qquad C = B - \\tfrac{t}{\\pi} + \\sqrt{(t/\\pi)^2 + s^2},\\qquad D = \\tfrac{2t}{\\pi} + C',
      'Z_0 = \\sqrt{\\frac{L_g + L_k}{C_\\ell}},\\qquad v_\\mathrm{ph} = \\frac{1}{\\sqrt{(L_g + L_k)\\,C_\\ell}},\\qquad \\alpha_k = \\frac{L_k}{L_g + L_k},\\qquad L_{k,\\square} = \\mu_0\\lambda_L\\coth\\frac{t}{\\lambda_L}',
      '\\ell_{\\lambda/4} = \\frac{v_\\mathrm{ph}}{4 f_r} - \\Delta\\ell,\\qquad \\ell_{\\lambda/2} = \\frac{v_\\mathrm{ph}}{2 f_r} - 2\\Delta\\ell',
    ],
    subst: (n) => `\\varepsilon_\\mathrm{eff} = 1 + \\frac{${tx(n.$.epsR, 4)} - 1}{2} \\times ${tx((n.epsGeo - 1) / ((n.$.epsR - 1) / 2), 4)} = ${tx(n.epsGeo, 4)}${n.$.epsMode === 'fit' ? `\\ (\\text{using fit } ${tx(n.epsEff, 4)})` : ''},\\quad Z_0 = ${tx(n.Z0, 4)}\\,\\Omega,\\quad \\alpha_k = ${tx(n.alphaK * 100, 3)}\\,\\%`,
    notes: 'ε<sub>eff</sub> follows from ε<sub>r</sub> by conformal mapping for a CPW on a substrate of finite thickness; switch to a measured fit if you have one. Kinetic inductance uses the Watanabe et al. (1994) CPW formula with the London depth of the film; it lowers v<sub>ph</sub>, raises Z<sub>0</sub> and shortens every resonator. Ranges are windows, not σ: each output window is the extreme over the corners of the input box, so several windows add linearly (worst case). The σ fields set the σ-based margins and the k·σ buttons in the header.',
    plots: [
      {
        title: '<i>Z</i><sub>0</sub>(<i>s</i>, <i>w</i>)',
        x: { label: '<i>s</i> (µm)', domain: () => [1, 40], get: (c) => c.$.sG_ * 1e6 },
        z: { label: '<i>w</i> (µm)', domain: () => [2, 60], get: (c) => c.$.wC * 1e6 },
        y: { label: '<i>Z</i><sub>0</sub> (Ω)' },
        f: (c, q, x, z) => lineAt(c, { s: x * 1e-6, w: (z != null ? z : c.$.wC * 1e6) * 1e-6 }).Z,
        hmarks: () => [{ y: 50, label: '50 Ω' }],
      },
      {
        title: '<i>α</i><sub>k</sub>(<i>t</i>, <i>λ</i><sub>L</sub>)',
        x: { label: '<i>t</i> (nm)', log: true, domain: () => [20, 1000], get: (c) => c.$.tF * 1e9 },
        z: { label: '<i>λ</i><sub>L</sub> (nm)', domain: () => [20, 400], get: (c) => c.$.lamL * 1e9 },
        y: { label: '<i>α</i><sub>k</sub> (%)', log: true },
        f: (c, q, x, z) => lineAt(c, { t: x * 1e-9, lam: (z != null ? z : c.$.lamL * 1e9) * 1e-9 }).alphaK * 100,
      },
      {
        title: 'Length rule', x: { label: '<i>f</i><sub>r</sub> (GHz)', domain: () => [4, 9], get: (c, q) => at(c, q, 'fbare') / 1e9 },
        y: { label: '<i>ℓ</i> (µm)' },
        f: (c, q, x) => (c.vph / (4 * x * 1e9) - c.$.dl) * 1e6,
        series: [{ f: (c, q, x) => (c.vph / (2 * x * 1e9) - 2 * c.$.dl) * 1e6, color: C[1], dash: '5 4' }],
        vmarks: (c) => [{ x: c.$.fband / 1e9, label: 'band limit' }],
      },
    ],
  },
  {
    id: 's1', step: 1, section: 'qubit', tag: 'litho', title: 'Qubit capacitance',
    lede: 'The most reproducible number on the chip. Sets E<sub>C</sub> and the anharmonicity.',
    inputs: ['CS', 'CJ', 'nPad'],
    uses: [{ key: 'fq_Q', label: '<i>f</i><sub>q</sub>', unit: 'GHz', conv: U.GHz, step: 4 }, { key: 'Ccd_Q', label: '<i>C</i><sub>c</sub>', unit: 'fF', conv: U.fF, step: 7 }, { key: 'Cqc_Q', label: '<i>C</i><sub>qc</sub>', unit: 'fF', conv: U.fF, step: 9 }],
    primary: { key: 'EC_a', label: 'Charging energy <i>E</i><sub>C</sub>/<i>h</i>', unit: 'MHz', conv: U.MHz },
    outputs: [
      { key: 'alpha_Q', label: 'Anharmonicity <i>α</i>/2π', unit: 'MHz', conv: U.MHz, sum: true },
      { key: 'alphaRel_Q', label: '<i>α</i> / <i>E</i><sub>C</sub>', unit: '', conv: U.one },
      { key: 'ratioA_Q', label: '<i>E</i><sub>J</sub>/<i>E</i><sub>C</sub>', unit: '', conv: U.one, sig: 3 },
      { key: 'disp_Q', label: 'Charge dispersion, 0–1', unit: 'Hz', conv: U.Hz, sig: 2 },
      { key: 'Cg_Q', label: 'Island-to-ground budget <i>C</i><sub>g</sub>', unit: 'fF', conv: U.fF },
    ],
    formulas: [
      'C_\\Sigma = C_g + C_c + \\textstyle\\sum_k C_{qc,k} + C_J',
      'E_C = \\frac{e^2}{2C_\\Sigma},\\qquad \\frac{E_C}{h}\\,[\\mathrm{MHz}] = \\frac{19\\,370}{C_\\Sigma\\,[\\mathrm{fF}]}',
      'f_{01} \\approx \\frac{\\sqrt{8E_JE_C} - E_C}{h},\\qquad \\alpha \\approx -\\frac{E_C}{h}',
      '\\hat H = 4E_C(\\hat n - n_g)^2 - E_J\\cos\\hat\\varphi',
      '\\varepsilon_m \\approx (-1)^m E_C\\,\\frac{2^{4m+5}}{m!}\\sqrt{\\frac{2}{\\pi}}\\left(\\frac{E_J}{2E_C}\\right)^{\\frac{m}{2}+\\frac{3}{4}} e^{-\\sqrt{8E_J/E_C}}',
    ],
    subst: (n, q) => `\\frac{E_C}{h} = \\frac{19\\,370}{${tx(n.CS_a * 1e15, 4)}} = ${tx(n.EC_a / 1e6, 4)}\\ \\mathrm{MHz},\\quad \\alpha = ${tx(at(n, q, 'alphaRel'), 3)}\\,E_C = ${tx(at(n, q, 'alpha') / 1e6, 4)}\\ \\mathrm{MHz}`,
    notes: 'α comes from exact diagonalisation in the charge basis (41 states, n<sub>g</sub> = ¼), not from −E<sub>C</sub>. The C<sub>g</sub> budget subtracts the claw (step 7), the coupler pads (step 9) and C<sub>J</sub>. Spread: ±2–3 % in C<sub>Σ</sub> moves E<sub>C</sub> and α by the same.',
    plots: [
      {
        title: '<i>E</i><sub>C</sub>(<i>C</i><sub>Σ</sub>)', x: { label: '<i>C</i><sub>Σ</sub> (fF)', domain: (c) => [c.$.CS * 1e15 * 0.5, c.$.CS * 1e15 * 1.6], get: (c) => c.CS_a * 1e15 },
        y: { label: '<i>E</i><sub>C</sub>/<i>h</i> (MHz)' }, f: (c, q, x) => ECof(x) / 1e6,
      },
      {
        title: '<i>α</i>(<i>C</i><sub>Σ</sub>, <i>f</i>)', x: { label: '<i>C</i><sub>Σ</sub> (fF)', domain: (c) => [c.$.CS * 1e15 * 0.6, c.$.CS * 1e15 * 1.5], get: (c) => c.CS_a * 1e15 },
        z: { label: '<i>f</i><sub>01</sub> (GHz)', domain: (c, q) => [at(c, q, 'fT') / 1e9 * 0.8, at(c, q, 'fT') / 1e9 * 1.2], get: (c, q) => at(c, q, 'fq') / 1e9 },
        y: { label: '<i>α</i>/2π (MHz)' },
        f: (c, q, x, z) => { const EC = ECof(x), f = z != null ? z * 1e9 : at(c, q, 'fq'); return P.anharmonicity(P.EJfromF01(f, EC), EC) / 1e6; },
        hmarks: () => [{ y: -150, label: '|α| = 150 MHz' }],
      },
    ],
  },
  {
    id: 's3', step: 2, section: 'qubit', tag: 'junction', perQubit: true, title: 'Junction targets',
    lede: 'The drawn junction (R<sub>n</sub>) and the superconducting gap set I<sub>c</sub>, E<sub>J</sub> and L<sub>J</sub>; with C<sub>Σ</sub> they fix this qubit’s sweet spot.',
    inputs: ['gap', 'Rn2', 'Rn1'],
    uses: [{ key: 'EC_d', label: '<i>E</i><sub>C</sub>/<i>h</i>', unit: 'MHz', conv: U.MHz, step: 1 }],
    primary: { key: 'EJd_Q', label: 'Junction <i>E</i><sub>J</sub>/<i>h</i> (SQUID total)', unit: 'GHz', conv: U.GHz },
    outputs: [
      { key: 'Ica_Q', label: '<i>I</i><sub>c</sub> = πΔ/2e<i>R</i><sub>n</sub>', unit: 'nA', conv: U.nA },
      { key: 'LJa_Q', label: '<i>L</i><sub>J</sub>', unit: 'nH', conv: U.nH },
      { key: 'fT_Q', label: 'Sweet spot <i>f</i><sub>max</sub>', unit: 'GHz', conv: U.GHz, sum: true },
      { key: 'ratioA_Q', label: '<i>E</i><sub>J</sub>/<i>E</i><sub>C</sub>', unit: '', conv: U.one, sig: 3 },
      { key: 'IcRn', label: '<i>I</i><sub>c</sub><i>R</i><sub>n</sub> = πΔ/2e', unit: 'µV', conv: U.uV, sig: 4 },
      { key: 'EJa_Q', label: '<i>E</i><sub>J</sub> after fab', unit: 'GHz', conv: U.GHz },
      { key: 'fq_Q', label: '<i>f</i><sub>max</sub> after fab', unit: 'GHz', conv: U.GHz },
      { key: 'sigL_Q', label: 'Local <i>σ</i><sub>f</sub>', unit: 'MHz', conv: U.MHz, noSigma: true },
    ],
    formulas: [
      'I_c = \\frac{\\pi\\,\\Delta_\\mathrm{gap}}{2e\\,R_n}\\ \\text{(Ambegaokar–Baratoff)},\\qquad E_J = \\frac{\\Phi_0\\,I_c}{2\\pi},\\qquad L_J = \\left(\\frac{\\Phi_0}{2\\pi}\\right)^2 \\frac{1}{E_J}',
      'f_{01} \\approx \\frac{\\sqrt{8E_JE_C} - E_C}{h}\\quad \\text{(exact charge-basis levels are used)}',
      '\\frac{\\delta f_{01}}{f_{01}} = \\frac{1}{2}\\frac{f_{01} + E_C/h}{f_{01}}\\frac{\\delta E_J}{E_J} + \\frac{1}{2}\\frac{f_{01} - E_C/h}{f_{01}}\\frac{\\delta E_C}{E_C}',
    ],
    subst: (n, q) => `I_c = \\frac{${tx(n.IcRn * 1e6, 4)}\\,\\mu\\mathrm{V}}{${tx(at(n, q, 'Rn') / 1e3, 4)}\\,\\mathrm{k\\Omega}} = ${tx(at(n, q, 'Ic') * 1e9, 4)}\\ \\mathrm{nA},\\quad E_J/h = ${tx(at(n, q, 'EJd') / 1e9, 4)}\\ \\mathrm{GHz},\\quad L_J = ${tx(at(n, q, 'LJ') * 1e9, 4)}\\ \\mathrm{nH},\\quad f_{01} = ${tx(at(n, q, 'fT') / 1e9, 4)}\\ \\mathrm{GHz}`,
    notes: 'The drawn junction is the independent variable: R<sub>n</sub> is what you fabricate (area × J<sub>c</sub>) and what you measure on test junctions, and the gap of the junction material converts it to I<sub>c</sub>. Change the gap and I<sub>c</sub>, E<sub>J</sub>, L<sub>J</sub> and the sweet spot move with it; the frequency plan (04) then follows. The other qubit’s R<sub>n</sub> is solved from its planned frequency and appears here when you switch to it. R<sub>n</sub> is the low-temperature value; calibrate the room-temperature factor on your own test junctions (Al ≈ 180 µeV, Nb trilayer ≈ 1.4 meV).',
    plots: [{
      title: '<i>f</i><sub>01</sub>(<i>E</i><sub>J</sub>, <i>C</i><sub>Σ</sub>)',
      x: { label: '<i>E</i><sub>J</sub>/<i>h</i> (GHz)', domain: (c, q) => [at(c, q, 'EJd') / 1e9 * 0.6, at(c, q, 'EJd') / 1e9 * 1.4], get: (c, q) => at(c, q, 'EJa') / 1e9 },
      z: { label: '<i>C</i><sub>Σ</sub> (fF)', domain: (c) => [c.$.CS * 1e15 * 0.8, c.$.CS * 1e15 * 1.2], get: (c) => c.CS_a * 1e15 },
      y: { label: '<i>f</i><sub>01</sub> (GHz)' },
      f: (c, q, x, z) => P.f01(x * 1e9, z != null ? ECof(z) : c.EC_a) / 1e9,
      series: [{ f: (c, q, x) => (Math.sqrt(8 * x * 1e9 * c.EC_a) - c.EC_a) / 1e9, color: C[1], dash: '5 4' }],
    }],
  },
  {
    id: 's4', step: 3, section: 'qubit', tag: 'junction', perQubit: true, title: 'SQUID asymmetry',
    lede: 'The junction-area ratio sets the tuning range and the flux slope near the sweet spot.',
    inputs: ['rA', 'phi'],
    uses: [{ key: 'EJa_Q', label: '<i>E</i><sub>J</sub>', unit: 'GHz', conv: U.GHz, step: 2 }, { key: 'fCZ', label: 'CZ point', unit: 'GHz', conv: U.GHz, step: 4 }],
    primary: { key: 'range_Q', label: 'Tuning range <i>f</i>(0) − <i>f</i>(Φ<sub>0</sub>/2)', unit: 'MHz', conv: U.MHz },
    outputs: [
      { key: 'dAsymA', label: 'Asymmetry <i>d</i>', unit: '', conv: U.one, sig: 3 },
      { key: 'fmin_Q', label: '<i>f</i><sub>min</sub> at Φ<sub>0</sub>/2', unit: 'GHz', conv: U.GHz, sum: true },
      { key: 'slope_Q', label: 'Slope |∂<i>f</i>/∂Φ| at Φ<sub>op</sub>', unit: 'GHz/Φ₀', conv: U.GHz, sig: 3 },
      { key: 'Rna_Q', label: 'Net SQUID <i>R</i><sub>n,SQ</sub> (both in parallel)', unit: 'kΩ', conv: U.kOhm, sum: true },
      { key: 'EJ1a_Q', label: 'Big junction <i>E</i><sub>J,big</sub>/<i>h</i>', unit: 'GHz', conv: U.GHz },
      { key: 'EJ2a_Q', label: 'Small junction <i>E</i><sub>J,small</sub>/<i>h</i>', unit: 'GHz', conv: U.GHz },
      { key: 'Rn1a_Q', label: 'Big junction <i>R</i><sub>n,big</sub>', unit: 'kΩ', conv: U.kOhm },
      { key: 'Rn2a_Q', label: 'Small junction <i>R</i><sub>n,small</sub>', unit: 'kΩ', conv: U.kOhm },
    ],
    formulas: [
      'E_J(\\Phi) = \\left(E_{J1}+E_{J2}\\right)\\left|\\cos\\frac{\\pi\\Phi}{\\Phi_0}\\right|\\sqrt{1 + d^2\\tan^2\\frac{\\pi\\Phi}{\\Phi_0}}',
      'd = \\frac{E_{J1} - E_{J2}}{E_{J1} + E_{J2}} = \\frac{r-1}{r+1},\\qquad E_J(\\Phi_0/2) = d\\,(E_{J1}+E_{J2})',
      'R_{n,\\mathrm{big}} = R_{n,\\mathrm{SQ}}\\,\\frac{r+1}{r},\\qquad R_{n,\\mathrm{small}} = R_{n,\\mathrm{SQ}}\\,(r+1),\\qquad \\frac{1}{R_{n,\\mathrm{SQ}}} = \\frac{1}{R_{n,\\mathrm{big}}} + \\frac{1}{R_{n,\\mathrm{small}}}',
    ],
    subst: (n, q) => `d = \\frac{${tx(n.$.rA, 3)} - 1}{${tx(n.$.rA, 3)} + 1} = ${tx(n.dAsym, 3)},\\quad ${tx(at(n, q, 'fq') / 1e9, 4)} - ${tx(at(n, q, 'fmin') / 1e9, 4)} = ${tx(at(n, q, 'range') / 1e6, 4)}\\ \\mathrm{MHz}`,
    notes: 'A larger asymmetry narrows the range but lowers the flux slope near the sweet spot. Loop area does not change the range; it sets current per flux quantum and how much flux noise and crosstalk the loop collects (keep loops ≈ 10–20 µm).',
    plots: [
      {
        title: '<i>f</i>(Φ)', x: { label: 'Φ/Φ<sub>0</sub>', domain: () => [0, 0.5], get: (c) => c.$.phi },
        z: { label: '<i>r</i> = <i>A</i><sub>1</sub>/<i>A</i><sub>2</sub>', domain: () => [1.5, 20], get: (c) => c.$.rA },
        y: { label: '<i>f</i><sub>01</sub> (GHz)' },
        f: (c, q, x, z) => { const r = z != null ? z : c.$.rA, d = (r - 1) / (r + 1); return P.f01(at(c, q, 'EJa') * P.squid(x, d), c.EC_a) / 1e9; },
        hmarks: (c, q) => (q === '1' ? [{ y: c.fCZ / 1e9, label: 'CZ point', color: C[2] }] : []),
      },
      {
        title: 'Flux slope', x: { label: 'Φ/Φ<sub>0</sub>', domain: () => [0, 0.5], get: (c) => c.$.phi },
        y: { label: '|∂<i>f</i>/∂Φ| (GHz/Φ<sub>0</sub>)' },
        f: (c, q, x) => {
          const d = c.dAsym, h = 1e-4, a = Math.max(x - h, 0), b = Math.min(x + h, 0.5);
          const fa = P.f01(at(c, q, 'EJa') * P.squid(a, d), c.EC_a), fb = P.f01(at(c, q, 'EJa') * P.squid(b, d), c.EC_a);
          return Math.abs(fb - fa) / (b - a) / 1e9;
        },
      },
    ],
  },
  {
    id: 's2', step: 4, section: 'qubit', tag: 'junction', title: 'Frequency plan',
    lede: 'The active qubit’s sweet spot follows from its junction (02) and C<sub>Σ</sub> (01); plan the other qubit here, its junction is solved to match. Keep the upper qubit at least |α| above the lower one.',
    inputs: ['f2', 'f1'],
    uses: [{ key: 'fT_Q', label: '<i>f</i><sub>max</sub>', unit: 'GHz', conv: U.GHz, step: 2 }, { key: 'alpha_1', label: '<i>α</i><sub>1</sub>', unit: 'MHz', conv: U.MHz, step: 1 }, { key: 'sigPair', label: '<i>σ</i><sub>pair</sub>', unit: 'MHz', conv: U.MHz, step: 0, noSigma: true }],
    primary: { key: 'D12', label: 'Idle detuning Δ<sub>12</sub> = <i>f</i><sub>1</sub> − <i>f</i><sub>2</sub>', unit: 'MHz', conv: U.MHz },
    outputs: [
      { key: 'Delta_2', label: 'Q2 – R2 detuning', unit: 'GHz', conv: U.GHz, sum: true },
      { key: 'Delta_1', label: 'Q1 – R1 detuning', unit: 'GHz', conv: U.GHz, sum: true },
      { key: 'fCZ', label: 'CZ point <i>f</i><sub>2</sub> + |<i>α</i><sub>1</sub>|', unit: 'GHz', conv: U.GHz },
      { key: 'exc', label: 'Q1 excursion to CZ', unit: 'MHz', conv: U.MHz },
      { key: 'sigPair', label: 'Pair spread √2·<i>σ</i><sub>local</sub>', unit: 'MHz', conv: U.MHz, noSigma: true },
      { key: 'czMargin', label: 'CZ margin', unit: 'σ', conv: U.one, sig: 3, sum: true },
    ],
    formulas: [
      'f_1 + f_2 = 2f_1 + \\alpha_1 \\;\\Rightarrow\\; f_1^{\\mathrm{CZ}} = f_2 - \\alpha_1',
      '\\sigma_{\\Delta_{12}} = \\sqrt{\\sigma_{1}^2 + \\sigma_{2}^2},\\qquad \\sigma_i = \\tfrac12\\,\\frac{f_i+E_C/h}{f_i}\\,\\sigma_{E_J,\\mathrm{local}}\\,f_i',
      '\\text{margin} = \\frac{f_1 - f_1^{\\mathrm{CZ}}}{\\sigma_{\\Delta_{12}}}',
    ],
    subst: (n) => `f_1^{\\mathrm{CZ}} = ${tx(n.fq_2 / 1e9, 4)} + ${tx(-n.alpha_1 / 1e9, 3)} = ${tx(n.fCZ / 1e9, 4)}\\ \\mathrm{GHz},\\quad \\frac{${tx(n.exc / 1e6, 3)}}{${tx(n.sigPair / 1e6, 3)}} = ${tx(n.czMargin, 3)}\\,\\sigma`,
    notes: 'The active qubit’s f<sub>max</sub> box is read-only: it is set by its junction (02) and C<sub>Σ</sub> (01); its slider still sets a window. Switch the active qubit in the header to plan the other one. Flux only tunes down, and the sweet spot is first-order flux-insensitive, so both qubits idle there. A global E<sub>J</sub> shift moves both qubits together and largely cancels in Δ<sub>12</sub>; the local spread sets collision margins. If Q1 lands too low, Q2 can be tuned down instead.',
    plots: [{
      title: 'Frequency map', type: 'spans', xlabel: '<i>f</i> (GHz)',
      rows: (res) => {
        const n = res.nom, R = res.R, G = (k) => n[k] / 1e9, L = (k) => R[k].lo / 1e9, H = (k) => R[k].hi / 1e9;
        const row = (label, k, color, tlo, thi) => ({ label, color, nom: G(k), lo: L(k), hi: H(k), tlo, thi });
        return [
          row('Q2', 'fq_2', C[0], G('fmin_2'), G('fq_2')),
          row('Q1', 'fq_1', C[0], G('fmin_1'), G('fq_1')),
          row('Q1 at CZ', 'fCZ', C[2]),
          row('R2', 'fra_2', C[1]),
          row('R1', 'fra_1', C[1]),
          row('Coupler gate', 'fc_gate', C[3]),
          row('Coupler off', 'fc_off_a', C[3]),
          row('Coupler <i>f</i><sub>max</sub>', 'fcm_a', C[3], G('fc_gate'), G('fcm_a')),
        ];
      },
      domain: (res) => [Math.floor((res.R.fmin_2.lo / 1e9 - 0.2) * 2) / 2, Math.ceil((res.R.fcm_a.hi / 1e9 + 0.2) * 2) / 2],
      vmarks: (res) => [{ x: res.nom.$.fband / 1e9, label: 'band' }],
    }],
  },
  {
    id: 's5', step: 5, section: 'readout', tag: 'litho', perQubit: true, title: 'Resonator frequency',
    lede: 'Place each resonator above its qubit; draw it high to pre-compensate the claw loading.',
    inputs: ['resType', 'off'],
    uses: [{ key: 'fT_Q', label: '<i>f</i><sub>max</sub>', unit: 'GHz', conv: U.GHz, step: 4 }, { key: 'Ccd_Q', label: '<i>C</i><sub>c</sub>', unit: 'fF', conv: U.fF, step: 7 }, { key: 'Z0', label: '<i>Z</i><sub>0</sub>', unit: 'Ω', conv: U.one, step: 0 }, { key: 'vph', label: '<i>v</i><sub>ph</sub>', unit: '×10⁸ m/s', conv: (v) => v / 1e8, step: 0 }],
    primary: { key: 'fra_Q', label: 'Resonator <i>f</i><sub>r</sub>', unit: 'GHz', conv: U.GHz },
    outputs: [
      { key: 'fbare_Q', label: 'Bare <i>f</i><sub>r</sub> to draw', unit: 'GHz', conv: U.GHz },
      { key: 'ell_Q', label: 'Drawn length <i>ℓ</i>', unit: 'µm', conv: U.um, sig: 5, sum: true },
      { key: 'ell4_Q', label: 'λ/4 length', unit: 'µm', conv: U.um, sig: 5 },
      { key: 'ell2_Q', label: 'λ/2 length', unit: 'µm', conv: U.um, sig: 5 },
      { key: 'dfLoad_Q', label: 'Claw loading shift', unit: 'MHz', conv: U.MHz, sig: 3 },
      { key: 'Crd_Q', label: '<i>C</i><sub>r</sub>', unit: 'fF', conv: U.fF },
      { key: 'Vzpf_Q', label: '<i>V</i><sub>zpf</sub>', unit: 'µV', conv: U.uV, sig: 3 },
      { key: 'Delta_Q', label: 'Δ = <i>f</i><sub>q</sub> − <i>f</i><sub>r</sub>', unit: 'GHz', conv: U.GHz, sum: true },
      { key: 'push_Q', label: 'Dressed push <i>g</i>²/|Δ|', unit: 'MHz', conv: U.MHz, sig: 3 },
      { key: 'nth_Q', label: 'Thermal photons <i>n</i><sub>th</sub>', unit: '', conv: U.one, sig: 2 },
    ],
    formulas: [
      'C_r = \\frac{C_\\ell\\,\\ell}{2},\\qquad C_r^{\\lambda/4} = \\frac{\\pi}{4\\,\\omega_r Z_0},\\qquad C_r^{\\lambda/2} = \\frac{\\pi}{2\\,\\omega_r Z_0},\\qquad V_\\mathrm{zpf} = \\sqrt{\\frac{\\hbar\\,\\omega_r}{2C_r}}',
      '\\frac{\\delta\\omega_r}{\\omega_r} \\approx -\\frac{C_\\mathrm{load}}{2C_r},\\qquad C_\\mathrm{load} = \\left(\\frac{1}{C_c} + \\frac{1}{C_\\Sigma}\\right)^{-1}',
      '\\ell_{\\lambda/4} = \\frac{v_\\mathrm{ph}}{4 f_\\mathrm{bare}} - \\Delta\\ell,\\qquad \\ell_{\\lambda/2} = \\frac{v_\\mathrm{ph}}{2 f_\\mathrm{bare}} - 2\\Delta\\ell,\\qquad n_\\mathrm{th} = \\frac{1}{e^{hf_r/k_BT}-1}',
    ],
    subst: (n, q) => `C_r = \\frac{1}{${n.$.resType === 'half' ? 4 : 8} \\cdot ${tx(at(n, q, 'frd') / 1e9, 4)}\\,\\mathrm{GHz} \\cdot ${tx(n.Z0, 4)}\\,\\Omega} = ${tx(at(n, q, 'Crd') * 1e15, 4)}\\ \\mathrm{fF},\\quad \\ell = \\frac{${tx(n.vph / 1e6, 5)}\\,\\mathrm{m/\\mu s}}{${n.$.resType === 'half' ? 2 : 4} \\cdot ${tx(at(n, q, 'fbare') / 1e9, 4)}\\,\\mathrm{GHz}} - ${n.$.resType === 'half' ? 2 : 1}\\Delta\\ell = ${tx(at(n, q, 'ell') * 1e6, 5)}\\ \\mu\\mathrm{m}`,
    notes: 'A higher resonator holds fewer thermal photons and keeps the qubit’s 1–2 transition further away. The 1.2 GHz default is ≈ 7σ of the global qubit spread. Space resonators ≥ 3√2σ<sub>r</sub> apart; take C<sub>load</sub> from the extracted capacitance matrix in the final design. For λ/2 the end correction Δℓ is applied at both open ends.',
    plots: [{
      title: '<i>n</i><sub>th</sub>(<i>f</i><sub>r</sub>, <i>T</i>)', x: { label: '<i>f</i><sub>r</sub> (GHz)', domain: () => [3, 10], get: (c, q) => at(c, q, 'fra') / 1e9 },
      z: { label: '<i>T</i><sub>eff</sub> (mK)', domain: () => [15, 120], get: (c) => c.$.T * 1e3 },
      y: { label: '<i>n</i><sub>th</sub>', log: true },
      f: (c, q, x, z) => P.nth(x * 1e9, z != null ? z * 1e-3 : c.$.T),
      vmarks: (c) => [{ x: c.$.fband / 1e9, label: 'band' }],
    }],
  },
  {
    id: 's6', step: 6, section: 'readout', tag: 'litho', perQubit: true, title: 'Linewidth κ',
    lede: 'Chosen from the readout speed you want, then realised by the hanger section: its length and spacing set Q<sub>c</sub>.',
    inputs: ['kapMode', 'kap', 'cplType', 'dCpl', 'scCpl', 'lc', 'QcRef', 'LcRef'],
    uses: [{ key: 'frd_Q', label: '<i>f</i><sub>r</sub>', unit: 'GHz', conv: U.GHz, step: 5 }, { key: 'nth_Q', label: '<i>n</i><sub>th</sub>', unit: '', conv: U.one, step: 5 }],
    primary: { key: 'Qcd_Q', label: 'Coupling quality factor <i>Q</i><sub>c</sub>', unit: '', conv: U.one, sig: 4 },
    outputs: [
      { key: 'kapa_Q', label: '<i>κ</i>/2π after fab', unit: 'MHz', conv: U.MHz, sig: 3, sum: true },
      { key: 'Ql_Q', label: 'Loaded <i>Q</i><sub>l</sub>', unit: '', conv: U.one, sig: 4 },
      { key: 'tau_Q', label: 'Photon lifetime 1/<i>κ</i>', unit: 'ns', conv: U.ns, sig: 3 },
      { key: 'lcNeed_Q', label: '<i>ℓ</i><sub>c</sub> for target <i>κ</i>', unit: 'µm', conv: U.um, sig: 4, sum: true },
      { key: 'QcGeom_Q', label: '<i>Q</i><sub>c</sub> at entered <i>ℓ</i><sub>c</sub>', unit: '', conv: U.one, sig: 4 },
      { key: 'QcRefModel_Q', label: 'Model <i>Q</i><sub>c</sub> at <i>ℓ</i><sub>c,ref</sub>', unit: '', conv: U.one, sig: 4 },
      { key: 'cm', label: 'Mutual <i>c</i><sub>m</sub>', unit: 'pF/m', conv: (v) => v * 1e12, sig: 3 },
      { key: 'lm', label: 'Mutual <i>l</i><sub>m</sub>', unit: 'nH/m', conv: (v) => v * 1e9, sig: 3 },
      { key: 'Tphi_Q', label: 'Thermal-photon <i>T</i><sub>φ</sub> limit', unit: 'µs', conv: U.us, sig: 3 },
    ],
    formulas: [
      '\\kappa = \\frac{\\omega_r}{Q_c},\\qquad \\frac{1}{Q_l} = \\frac{1}{Q_c} + \\frac{1}{Q_i},\\qquad \\tau_\\mathrm{photon} = \\frac{1}{\\kappa}',
      'S_{21}(\\omega) = 1 - \\frac{Q_l/Q_c}{1 + 2iQ_l\\,\\dfrac{\\omega - \\omega_r}{\\omega_r}}',
      'c_m = \\tfrac12\\left(C_\\mathrm{odd} - C_\\mathrm{even}\\right),\\qquad l_m = \\tfrac12\\left(L_\\mathrm{even} - L_\\mathrm{odd}\\right),\\qquad L_\\mathrm{mode} = \\frac{\\mu_0\\varepsilon_0}{C_\\mathrm{mode}^\\mathrm{air}}',
      't = z^2,\\qquad \\Omega_\\mathrm{even}^{\\prime} \\propto \\frac{t-\\tau}{\\sqrt{t(t-A)(t-a)(t-b)(t-c)}},\\qquad A = \\left(\\tfrac{d}{2}\\right)^2,\\ a = \\left(\\tfrac{d}{2}+s\\right)^2,\\qquad b = \\left(\\tfrac{d}{2}+s+w\\right)^2,\\ c = \\left(\\tfrac{d}{2}+2s+w\\right)^2',
      'V_\\pm = \\tfrac12\\int_0^{\\ell_c} e^{\\pm i\\beta x}\\left(\\sigma_v \\pm Z_0\\,\\sigma_i\\right)dx,\\qquad \\sigma_v = -i\\omega l_m I_r,\\ \\ \\sigma_i = i\\omega c_m V_r,\\qquad V_r = V_0\\cos\\beta x,\\ \\ I_r = -\\tfrac{iV_0}{Z_0}\\sin\\beta x',
      'Q_c = \\frac{\\omega_r\\,\\tfrac12 C_r V_0^2}{\\left(|V_+|^2 + |V_-|^2\\right)/2Z_0},\\qquad Q_c \\xrightarrow{\\ \\ell_c \\ll \\lambda\\ } \\frac{\\pi}{2\\,\\omega_r^2\\,(c_m\\ell_c)^2 Z_0^2}\\ (\\lambda/4)',
      '\\Gamma_\\varphi = n_\\mathrm{th}\\,\\kappa\\,\\frac{4\\chi^2}{\\kappa^2 + 4\\chi^2}',
    ],
    subst: (n, q) => `Q_c = \\frac{${tx(at(n, q, 'frd') / 1e9, 4)}\\,\\mathrm{GHz}}{${tx(at(n, q, 'kapd') / 1e6, 3)}\\,\\mathrm{MHz}} = ${tx(at(n, q, 'Qcd'), 4)},\\quad Q_c(\\ell_c = ${tx(n.$.lc * 1e6, 4)}\\,\\mu\\mathrm{m}) = ${tx(at(n, q, 'QcGeom'), 4)},\\quad \\ell_c^{\\,\\kappa} = ${tx(at(n, q, 'lcNeed') * 1e6, 4)}\\,\\mu\\mathrm{m}`,
    notes: 'A smaller Q<sub>c</sub> means a larger κ and a shorter photon lifetime, not a longer one. The Q<sub>c</sub> spread (±10–20 %) matters little because the readout signal is flat near 2χ = κ (step 7). Q<sub>c</sub> from geometry follows the transmission-line coupling treatment of Besedin &amp; Menushenkov, EPJ Quantum Technol. 5, 2 (2018): the resonator standing wave drives the feedline through the mutual capacitance and inductance of the parallel section, here starting at the open end. c<sub>m</sub> and l<sub>m</sub> come from an even/odd conformal map of two identical CPWs, either sharing a ground strip of width d or edge-coupled across a gap s<sub>c</sub>. Compare the model at ℓ<sub>c,ref</sub> with your measured Q<sub>c,ref</sub> to calibrate, and confirm the final layout with a two-port simulation.',
    plots: [
      {
        title: '<i>Q</i><sub>c</sub>(<i>ℓ</i><sub>c</sub>, <i>d</i>)',
        x: { label: '<i>ℓ</i><sub>c</sub> (µm)', log: true, domain: (c, q) => [50, Math.min(4000, at(c, q, 'ell4') * 1e6)], get: (c) => c.$.lc * 1e6 },
        z: {
          label: '<i>d</i>, <i>s</i><sub>c</sub> (µm)', domain: () => [1, 30],
          get: (c) => (c.$.cplType === 'edge' ? c.$.scCpl : c.$.dCpl) * 1e6,
        },
        y: { label: '<i>Q</i><sub>c</sub>', log: true },
        f: (c, q, x, z) => qcAt(c, q, x * 1e-6, z != null ? z * 1e-6 : null),
        hmarks: (c, q) => [{ y: at(c, q, 'frd') / c.$.kap, label: 'target <i>Q</i><sub>c</sub>' }, { y: c.$.QcRef, label: 'measured ref.', color: C[2], dash: '2 3' }],
        vmarks: (c) => [{ x: c.$.LcRef * 1e6, label: '<i>ℓ</i><sub>c,ref</sub>', color: C[2] }],
      },
      {
        title: '|<i>S</i><sub>21</sub>|', x: { label: '<i>f</i> − <i>f</i><sub>r</sub> (MHz)', domain: (c, q) => [-5 * at(c, q, 'kapd') / 1e6, 5 * at(c, q, 'kapd') / 1e6] },
        y: { label: '|<i>S</i><sub>21</sub>|' },
        f: (c, q, x) => { const a = at(c, q, 'Ql') / at(c, q, 'Qca'), u = 2 * at(c, q, 'Ql') * x * 1e6 / at(c, q, 'fra'), d = 1 + u * u; return Math.hypot(1 - a / d, a * u / d); },
        vmarks: (c, q) => [{ x: -Math.abs(at(c, q, 'chi')) / 1e6, label: '|0⟩', color: C[0] }, { x: Math.abs(at(c, q, 'chi')) / 1e6, label: '|1⟩', color: C[2] }],
      },
      { title: 'IQ circle', type: 'iq' },
    ],
  },
  {
    id: 's7', step: 7, section: 'readout', tag: 'litho', perQubit: true, title: 'Readout coupling g',
    lede: 'With κ fixed, choose g so that 2χ = κ at the nominal detuning: the largest IQ separation.',
    inputs: ['mode', 'xT', 'Cc'],
    uses: [{ key: 'kapa_Q', label: '<i>κ</i>/2π', unit: 'MHz', conv: U.MHz, step: 6 }, { key: 'Delta_Q', label: 'Δ/2π', unit: 'GHz', conv: U.GHz, step: 5 }, { key: 'alpha_Q', label: '<i>α</i>/2π', unit: 'MHz', conv: U.MHz, step: 1 }],
    primary: { key: 'ga_Q', label: 'Readout coupling <i>g</i>/2π', unit: 'MHz', conv: U.MHz },
    outputs: [
      { key: 'Ccd_Q', label: 'Claw <i>C</i><sub>c</sub> (draw)', unit: 'fF', conv: U.fF, sig: 3, sum: true },
      { key: 'chi_Q', label: 'Dispersive shift <i>χ</i>/2π', unit: 'MHz', conv: U.MHz, sig: 3, sum: true },
      { key: 'xa_Q', label: '2<i>χ</i>/<i>κ</i>', unit: '', conv: U.one, sig: 3 },
      { key: 'sep_Q', label: 'IQ separation (of max)', unit: '%', conv: U.pct, sig: 3 },
      { key: 'gOverD_Q', label: '<i>g</i>/|Δ|', unit: '', conv: U.one, sig: 3 },
      { key: 'gMis_Q', label: '<i>g</i> misread by <i>χ</i> = <i>g</i>²/Δ', unit: 'MHz', conv: U.MHz, sig: 3 },
    ],
    formulas: [
      'g = \\frac{C_c}{2}\\sqrt{\\frac{\\omega_q\\,\\omega_r}{C_\\Sigma\\,C_r}} \\;\\Longleftrightarrow\\; C_c = 2g\\sqrt{\\frac{C_\\Sigma\\,C_r}{\\omega_q\\,\\omega_r}}',
      '\\chi = \\frac{g^2}{\\Delta} - \\frac{g^2}{\\Delta + \\alpha} = \\frac{g^2\\,\\alpha}{\\Delta\\,(\\Delta + \\alpha)},\\qquad \\Delta = \\omega_q - \\omega_r',
      'g = \\sqrt{\\frac{x\\,\\kappa\\,\\left|\\Delta\\,(\\Delta + \\alpha)\\right|}{2\\,|\\alpha|}},\\qquad x = 2\\chi/\\kappa',
      '\\left|S_{21}^{(0)} - S_{21}^{(1)}\\right| = \\frac{Q_l}{Q_c}\\,\\frac{2x}{1 + x^2}',
    ],
    subst: (n, q) => `\\chi = \\frac{${tx(at(n, q, 'ga') / 1e6, 3)}^2 \\times (${tx(at(n, q, 'alpha') / 1e6, 3)})}{(${tx(at(n, q, 'Delta') / 1e6, 4)})(${tx((at(n, q, 'Delta') + at(n, q, 'alpha')) / 1e6, 4)})} = ${tx(at(n, q, 'chi') / 1e6, 3)}\\ \\mathrm{MHz}`,
    notes: 'g is solved at the design point and the claw is frozen; the windows then move Δ, α and κ. Past 2χ/κ = 1 extra χ buys no signal but costs Purcell decay, n<sub>crit</sub> and spread sensitivity. Never fit a measured χ with g²/Δ: it misses the factor α/(Δ + α).',
    plots: [
      {
        title: '<i>χ</i>(Δ, <i>g</i>, <i>α</i>)',
        x: { label: 'Δ/2π (GHz)', domain: (c, q) => { const D = at(c, q, 'Delta') / 1e9; return D < 0 ? [D * 1.8, D * 0.5] : [D * 0.5, D * 1.8]; }, get: (c, q) => at(c, q, 'Delta') / 1e9 },
        z: { label: '<i>g</i>/2π (MHz)', domain: (c, q) => [at(c, q, 'ga') / 1e6 * 0.5, at(c, q, 'ga') / 1e6 * 1.5], get: (c, q) => at(c, q, 'ga') / 1e6 },
        w: { label: '<i>α</i>', get: (c, q) => at(c, q, 'alpha') / 1e6 },
        y: { label: '<i>χ</i>/2π (MHz)' },
        f: (c, q, x, z, w) => {
          const g = z != null ? z : at(c, q, 'ga') / 1e6, a = w != null ? w : at(c, q, 'alpha') / 1e6, D = x * 1e3;
          return g * g * a / (D * (D + a));
        },
        hmarks: (c, q) => [{ y: -at(c, q, 'kapa') / 2e6, label: '2|<i>χ</i>| = <i>κ</i>' }],
      },
      {
        title: 'Separation', x: { label: '2<i>χ</i>/<i>κ</i>', domain: () => [0, 3], get: (c, q) => at(c, q, 'xa') },
        y: { label: 'separation / (<i>Q</i><sub>l</sub>/<i>Q</i><sub>c</sub>)', domain: () => [0, 1.08] },
        f: (c, q, x) => 2 * x / (1 + x * x),
      },
    ],
  },
  {
    id: 's8', step: 8, section: 'readout', tag: 'derived', perQubit: true, title: 'Photons and Purcell',
    lede: 'Read out well below n<sub>crit</sub>; a Purcell filter lifts the qubit lifetime limit.',
    inputs: ['nbar', 'filt', 'kF'],
    uses: [{ key: 'ga_Q', label: '<i>g</i>/2π', unit: 'MHz', conv: U.MHz, step: 7 }, { key: 'chi_Q', label: '<i>χ</i>/2π', unit: 'MHz', conv: U.MHz, step: 7 }],
    primary: { key: 'ncrit_Q', label: 'Critical photon number <i>n</i><sub>crit</sub>', unit: '', conv: U.one, sig: 3 },
    outputs: [
      { key: 'nRatio_Q', label: '<i>n̄</i> / <i>n</i><sub>crit</sub>', unit: '', conv: U.one, sig: 3 },
      { key: 'Pin_Q', label: 'Power at chip for <i>n̄</i>', unit: 'dBm', conv: U.one, sig: 4 },
      { key: 'chiN_Q', label: '<i>χ</i>(<i>n̄</i>)/2π', unit: 'MHz', conv: U.MHz, sig: 3 },
      { key: 'T1u_Q', label: 'Purcell <i>T</i><sub>1</sub>, unfiltered', unit: 'µs', conv: U.us, sig: 3 },
      { key: 'T1f_Q', label: 'Purcell <i>T</i><sub>1</sub>, filtered', unit: 'ms', conv: U.ms, sig: 3, sum: true },
      { key: 'kn_Q', label: '<i>κ</i>·<i>n̄</i>', unit: 'MHz', conv: U.MHz, sig: 3 },
    ],
    formulas: [
      'n_\\mathrm{crit} = \\left(\\frac{\\Delta}{2g}\\right)^2,\\qquad \\chi(n) \\approx \\chi(0)\\left[1 - \\frac{n+1}{2\\,n_\\mathrm{crit}}\\right]',
      '\\bar n = \\frac{2\\,Q_l^2}{Q_c}\\,\\frac{P}{\\hbar\\,\\omega_r^2}',
      'T_{1,P} = \\frac{1}{\\kappa}\\left(\\frac{\\Delta}{g}\\right)^2,\\qquad \\text{filter: } \\times\\left(\\frac{2\\Delta}{\\kappa_F}\\right)^2',
      '\\kappa\\,\\bar n\\big|_{2\\chi=\\kappa,\\ \\bar n = n_\\mathrm{crit}/3} = \\frac{|\\alpha|\\,|\\Delta|}{6\\,|\\Delta+\\alpha|}',
    ],
    subst: (n, q) => `n_\\mathrm{crit} = \\left(\\frac{${tx(at(n, q, 'Delta') / 1e6, 4)}}{2 \\times ${tx(at(n, q, 'ga') / 1e6, 3)}}\\right)^2 = ${tx(at(n, q, 'ncrit'), 3)},\\quad T_{1,P} = ${tx(at(n, q, 'T1u') * 1e6, 3)}\\ \\mu\\mathrm{s}`,
    notes: 'n<sub>crit</sub> is not a hard wall: χ drifts well below it, and near n ≈ 70 a branch crossing starts flipping the qubit. Work at n̄ ≈ n<sub>crit</sub>/3 to n<sub>crit</sub>/5. Confirm the Purcell limit with a driven simulation at the qubit port, T<sub>1</sub> = C<sub>Σ</sub>/Re[Y(ω<sub>q</sub>)].',
    plots: [
      {
        title: '<i>χ</i>(<i>n̄</i>)', x: { label: '<i>n̄</i>', domain: (c, q) => [0, Math.max(2.1 * at(c, q, 'ncrit'), c.$.nbar * 1.3)], get: (c) => c.$.nbar },
        y: { label: '<i>χ</i>/2π (MHz)' },
        f: (c, q, x) => at(c, q, 'chi') * (1 - (x + 1) / (2 * at(c, q, 'ncrit'))) / 1e6,
        vmarks: (c, q) => [{ x: at(c, q, 'ncrit'), label: '<i>n</i><sub>crit</sub>', color: C[2] }, { x: at(c, q, 'ncrit') / 3, label: '<i>n</i><sub>crit</sub>/3' }],
      },
      {
        title: 'Purcell <i>T</i><sub>1</sub>(Δ, <i>g</i>)',
        x: { label: 'Δ/2π (GHz)', domain: (c, q) => { const D = at(c, q, 'Delta') / 1e9; return D < 0 ? [D * 1.8, D * 0.5] : [D * 0.5, D * 1.8]; }, get: (c, q) => at(c, q, 'Delta') / 1e9 },
        z: { label: '<i>g</i>/2π (MHz)', domain: (c, q) => [at(c, q, 'ga') / 1e6 * 0.5, at(c, q, 'ga') / 1e6 * 1.5], get: (c, q) => at(c, q, 'ga') / 1e6 },
        y: { label: '<i>T</i><sub>1,P</sub> (µs)', log: true },
        f: (c, q, x, z) => {
          const g = (z != null ? z : at(c, q, 'ga') / 1e6) * 1e6, D = x * 1e9;
          let T = Math.pow(D / g, 2) / (2 * Math.PI * at(c, q, 'kapa'));
          if (c.$.filt === 'on') T *= Math.pow(2 * D / c.$.kF, 2);
          return T * 1e6;
        },
        hmarks: () => [{ y: 1000, label: '1 ms' }],
      },
    ],
  },
  {
    id: 's9', step: 9, section: 'coupler', tag: 'litho', title: 'Coupler couplings',
    lede: 'All three links stay physically on; the coupler path cancels the direct g<sub>12</sub> at the off point.',
    inputs: ['gqc', 'g12', 'Ccpl'],
    uses: [{ key: 'fq_1', label: '<i>f</i><sub>1</sub>', unit: 'GHz', conv: U.GHz, step: 4 }, { key: 'fq_2', label: '<i>f</i><sub>2</sub>', unit: 'GHz', conv: U.GHz, step: 4 }, { key: 'CS_d', label: '<i>C</i><sub>Σ</sub>', unit: 'fF', conv: U.fF, step: 1 }],
    primary: { key: 'Cqc_Q', label: 'Qubit–coupler capacitance <i>C</i><sub>qc</sub>', unit: 'fF', conv: U.fF, sig: 3 },
    outputs: [
      { key: 'C12', label: '<i>C</i><sub>12,eff</sub>', unit: 'fF', conv: U.fF, sig: 3, sum: true },
      { key: 'Cvia', label: 'via coupler island <i>C</i><sub>qc</sub>²/<i>C</i><sub>cpl</sub>', unit: 'fF', conv: U.fF, sig: 3 },
      { key: 'Cdir', label: 'Direct pad gap', unit: 'fF', conv: U.fF, sig: 3 },
      { key: 'ECc_a', label: 'Coupler <i>E</i><sub>C</sub>/<i>h</i>', unit: 'MHz', conv: U.MHz },
      { key: 'Jmax', label: '<i>J</i><sub>net</sub> at coupler <i>f</i><sub>max</sub>', unit: 'MHz', conv: U.MHz, sig: 3 },
    ],
    formulas: [
      'J_\\mathrm{net}(\\omega_c) = g_{12} + \\frac{g_{1c}\\,g_{2c}}{2}\\left(\\frac{1}{\\omega_1 - \\omega_c} + \\frac{1}{\\omega_2 - \\omega_c} - \\frac{1}{\\omega_1 + \\omega_c} - \\frac{1}{\\omega_2 + \\omega_c}\\right)',
      'C_{qc} = 2g_{qc}\\sqrt{\\frac{C_\\Sigma\\,C_\\mathrm{cpl}}{\\omega_q\\,\\omega_c}},\\qquad C_{12,\\mathrm{eff}} = C_{12} + \\frac{C_{1c}\\,C_{2c}}{C_\\mathrm{cpl}} = \\frac{2\\,g_{12}\\,C_\\Sigma}{\\sqrt{\\omega_1\\omega_2}}',
    ],
    subst: (n) => `C_{12,\\mathrm{eff}} = \\frac{2 \\times ${tx(n.$.g12 / 1e6, 3)}\\,\\mathrm{MHz} \\times ${tx(n.CS_d * 1e15, 3)}\\,\\mathrm{fF}}{\\sqrt{${tx(n.fT_1 / 1e9, 3)} \\times ${tx(n.fT_2 / 1e9, 3)}}\\,\\mathrm{GHz}} = ${tx(n.C12 * 1e15, 3)}\\ \\mathrm{fF}`,
    notes: 'With the coupler above both qubits the bracket is negative, so the coupler path subtracts from g<sub>12</sub> and can cancel it. A bare 0.15 fF gap is at stray level; building most of it from two ≈ 2 fF pads and a 69 fF island makes it a ratio of larger, reproducible capacitances. C<sub>qc</sub> is evaluated at the design off point.',
    plots: [{
      title: '<i>J</i><sub>net</sub>(<i>f</i><sub>c</sub>)',
      x: { label: '<i>f</i><sub>c</sub> (GHz)', domain: (c) => [Math.max(c.fq_1, c.fq_2) / 1e9 + 0.3, Math.max(c.fcm_a / 1e9 + 0.5, 9.5)], get: (c) => c.fc_off_a / 1e9 },
      z: { label: '<i>g</i><sub>qc</sub>/2π (MHz)', domain: (c) => [c.$.gqc / 1e6 * 0.5, c.$.gqc / 1e6 * 1.5], get: (c) => c.$.gqc / 1e6 },
      w: { label: '<i>g</i><sub>12</sub>', get: (c) => c.$.g12 / 1e6 },
      y: { label: '<i>J</i><sub>net</sub>/2π (MHz)', domain: (c) => [-3 * c.$.Jg / 1e6 - 4, 2 * c.$.g12 / 1e6 + 3] },
      f: (c, q, x, z, w) => {
        const J = P.Jnet(x * 1e9, c.fq_1, c.fq_2, (z != null ? z : c.$.gqc / 1e6) * 1e6, (w != null ? w : c.$.g12 / 1e6) * 1e6) / 1e6;
        return Math.max(-60, Math.min(60, J));
      },
      hmarks: (c) => [{ y: 0, label: '<i>J</i> = 0', dash: '2 2' }, { y: -c.$.Jg / 1e6, label: '|<i>J</i><sub>gate</sub>|', color: C[2] }],
      vmarks: (c) => [{ x: c.fcm_a / 1e9, label: '<i>f</i><sub>max</sub>', color: C[3] }],
    }],
  },
  {
    id: 's10', step: 10, section: 'coupler', tag: 'junction', title: 'Coupler junction',
    lede: 'Symmetric SQUID for the full range; f<sub>max</sub> must clear the off point with margin.',
    inputs: ['fcm', 'Jg'],
    uses: [{ key: 'ECc_d', label: '<i>E</i><sub>C</sub>/<i>h</i>', unit: 'MHz', conv: U.MHz, step: 9 }, { key: 'alpha_1', label: '<i>α</i><sub>1</sub>', unit: 'MHz', conv: U.MHz, step: 1 }],
    primary: { key: 'fc_off_a', label: 'Coupler off point (<i>J</i> = 0)', unit: 'GHz', conv: U.GHz },
    outputs: [
      { key: 'EJc_d', label: '<i>E</i><sub>J</sub>/<i>h</i> (total)', unit: 'GHz', conv: U.GHz },
      { key: 'RnJa', label: '<i>R</i><sub>n</sub> per junction', unit: 'kΩ', conv: U.kOhm },
      { key: 'fcm_a', label: '<i>f</i><sub>max</sub> after fab', unit: 'GHz', conv: U.GHz },
      { key: 'offMargin', label: '<i>f</i><sub>max</sub> − off point', unit: 'GHz', conv: U.GHz, sig: 3, sum: true },
      { key: 'fc_gate', label: 'Gate point for |<i>J</i><sub>gate</sub>|', unit: 'GHz', conv: U.GHz, sum: true },
      { key: 'phiOff', label: 'Flux at off point', unit: 'Φ₀', conv: U.one, sig: 3 },
      { key: 'tCZ', label: 'CZ time 1/(2√2 <i>J</i>)', unit: 'ns', conv: U.ns, sig: 3 },
      { key: 'zz', label: 'Static ZZ at <i>J</i> = <i>g</i><sub>12</sub>', unit: 'kHz', conv: U.kHz, sig: 3 },
    ],
    formulas: [
      '\\frac{E_J}{h} = \\frac{\\left(f_{c,\\max} + E_C/h\\right)^2}{8\\,E_C/h},\\qquad E_J(\\Phi) = E_{J\\Sigma}\\left|\\cos\\frac{\\pi\\Phi}{\\Phi_0}\\right|',
      '|\\Delta_\\mathrm{off}| \\approx \\frac{g_{qc}^2}{g_{12}},\\qquad \\frac{\\delta\\Delta_\\mathrm{off}}{\\Delta_\\mathrm{off}} \\approx \\sqrt{\\left(2\\,\\frac{\\delta g_{qc}}{g_{qc}}\\right)^2 + \\left(\\frac{\\delta g_{12}}{g_{12}}\\right)^2}',
      't_\\mathrm{CZ} = \\frac{1}{2\\sqrt{2}\\,J},\\qquad \\zeta = \\frac{2J^2(\\alpha_1 + \\alpha_2)}{(\\Delta_{12} + \\alpha_1)(\\Delta_{12} - \\alpha_2)}',
    ],
    subst: (n) => `J_\\mathrm{net}(${tx(n.fc_off_a / 1e9, 4)}\\,\\mathrm{GHz}) = 0,\\quad t_\\mathrm{CZ} = \\frac{1}{2\\sqrt2 \\times ${tx(n.$.Jg / 1e6, 3)}\\,\\mathrm{MHz}} = ${tx(n.tCZ * 1e9, 3)}\\ \\mathrm{ns}`,
    notes: 'A high critical-current density raises both f<sub>max</sub> and the off point (via the qubits), so the two windows are correlated and the margin is larger than the independent sum suggests. Park the coupler at the ZZ minimum, a few hundred MHz from J = 0, and find both in situ by sweeping coupler flux.',
    plots: [
      {
        title: '<i>f</i><sub>c</sub>(Φ)', x: { label: 'Φ/Φ<sub>0</sub>', domain: () => [0, 0.5], get: (c) => c.phiOff },
        y: { label: '<i>f</i><sub>c</sub> (GHz)', domain: (c) => [Math.min(c.fq_2 / 1e9 - 0.6, 5), c.fcm_a / 1e9 + 0.4] },
        f: (c, q, x) => P.f01(c.EJc_a * Math.abs(Math.cos(Math.PI * x)), c.ECc_a) / 1e9,
        hmarks: (c) => [
          { y: c.fc_off_a / 1e9, label: 'off point', color: C[3] },
          { y: c.fc_gate / 1e9, label: 'gate point', color: C[2] },
          { y: c.fq_1 / 1e9, label: 'Q1', color: C[0], dash: '2 2' },
          { y: c.fq_2 / 1e9, label: 'Q2', color: C[0], dash: '2 2' },
        ],
      },
      {
        title: '<i>t</i><sub>CZ</sub>(<i>J</i>)', x: { label: '|<i>J</i>|/2π (MHz)', domain: () => [2, 16], get: (c) => c.$.Jg / 1e6 },
        y: { label: '<i>t</i><sub>CZ</sub> (ns)' }, f: (c, q, x) => 1e3 / (2 * Math.SQRT2 * x),
      },
    ],
  },
];

const SECTIONS = [
  { id: 'constraints', no: '0', title: 'Constraints', blurb: 'Fixed before any value is chosen.' },
  { id: 'qubit', no: 'A', title: 'Qubit', blurb: 'Capacitance first, then the frequency plan, junction targets and SQUID.' },
  { id: 'readout', no: 'B', title: 'Readout', blurb: 'Resonator placement, linewidth, coupling and photon budget.' },
  { id: 'coupler', no: 'C', title: 'Coupler', blurb: 'Couplings, then the coupler junction and its off point.' },
];

// After fab: what to measure, in dependency order
const BRINGUP = [
  { step: 2, what: 'Test-junction <i>R</i><sub>n</sub> (room temperature)', key: 'Rna_Q', unit: 'kΩ', conv: U.kOhm, how: 'Probe qubit- and coupler-size arrays; convert with your process’s low-temperature factor.' },
  { step: 5, what: 'Resonator <i>f</i><sub>r</sub>, low power', key: 'fra_Q', unit: 'GHz', conv: U.GHz, how: 'Find each dip; step power up to see the bend and punch-out.' },
  { step: 5, what: 'Low-power − bare = <i>g</i>²/|Δ|', key: 'push_Q', unit: 'MHz', conv: U.MHz, how: 'Difference between low-power and punched-out resonance.' },
  { step: 4, what: 'Qubit sweet spot <i>f</i><sub>max</sub>', key: 'fq_Q', unit: 'GHz', conv: U.GHz, how: 'Two-tone spectroscopy versus flux; fixes Δ and the actual asymmetry.' },
  { step: 7, what: '2<i>χ</i>', key: 'chi_Q', unit: 'MHz', conv: (v) => 2 * Math.abs(v) / 1e6, how: 'Resonator spectroscopy with and without a π-pulse; fit g with the transmon formula.' },
  { step: 8, what: 'Readout power for <i>n̄</i>', key: 'Pin_Q', unit: 'dBm', conv: U.one, how: 'AC-Stark shift 2χ·n̄ calibrates power to photons; compare n<sub>crit</sub>.' },
  { step: 10, what: 'Coupler off point', key: 'fc_off_a', unit: 'GHz', conv: U.GHz, how: 'Sweep coupler flux; record J = 0, the ZZ minimum and the gate flux.' },
  { step: 4, what: 'CZ point of Q1', key: 'fCZ', unit: 'GHz', conv: U.GHz, how: 'Pulse Q1 to f<sub>2</sub> + |α<sub>1</sub>|; calibrate time and conditional phase π.' },
];
export {  CARDS, SECTIONS, BRINGUP, U, tx  };

