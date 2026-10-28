/* Number formatting for the UI: significant digits, thin-space grouping, true minus sign. */

const SUP = { '-': '⁻', 0: '⁰', 1: '¹', 2: '²', 3: '³', 4: '⁴', 5: '⁵', 6: '⁶', 7: '⁷', 8: '⁸', 9: '⁹' };

function decimalsFor(ref, sig) {
  const a = Math.abs(ref);
  if (!isFinite(a) || a === 0) return Math.max(0, sig - 1);
  return Math.max(0, Math.min(6, sig - 1 - Math.floor(Math.log10(a))));
}

/** Format v with `sig` significant digits; `ref` fixes the decimals so bounds align with the nominal. */
export function fmt(v, sig = 4, ref = v) {
  if (v == null || !isFinite(v)) return '—';
  const a = Math.abs(v), r = Math.abs(ref);
  if (a === 0 && r === 0) return '0';
  if (r >= 1e6 || (r < 1e-3 && r !== 0)) {
    const d = Math.max(1, sig - 2);
    let e = Math.floor(Math.log10(r || a));
    // Rounding can carry the mantissa to 10 (9.98 → "10.0"); move it into the exponent
    if (Number(Math.abs((r || a) / Math.pow(10, e)).toFixed(d)) >= 10) e += 1;
    const m = (v / Math.pow(10, e)).toFixed(d);
    return `${m.replace('-', '−')}×10${String(e).split('').map((c) => SUP[c]).join('')}`;
  }
  let s = a.toFixed(decimalsFor(ref, sig));
  if (a >= 1e4) {
    const [i, f] = s.split('.');
    s = i.replace(/\B(?=(\d{3})+(?!\d))/g, ' ') + (f ? '.' + f : '');
  }
  return (v < 0 && Number(s.replace(/ /g, '')) !== 0 ? '−' : '') + s;
}

// SI prefix families. A display unit from one of these is re-chosen from the nominal value so
// the mantissa sits in [1, 1000); composite units (pF/m, GHz/Φ₀, %, dBm …) stay as given.
const FAMILIES = [
  ['Hz', [[0, 'Hz'], [3, 'kHz'], [6, 'MHz'], [9, 'GHz'], [12, 'THz']]],
  ['s', [[-12, 'ps'], [-9, 'ns'], [-6, 'µs'], [-3, 'ms'], [0, 's']]],
  ['F', [[-18, 'aF'], [-15, 'fF'], [-12, 'pF'], [-9, 'nF']]],
  ['H', [[-12, 'pH'], [-9, 'nH'], [-6, 'µH'], [-3, 'mH']]],
  ['A', [[-12, 'pA'], [-9, 'nA'], [-6, 'µA'], [-3, 'mA'], [0, 'A']]],
  ['Ω', [[-3, 'mΩ'], [0, 'Ω'], [3, 'kΩ'], [6, 'MΩ']]],
  ['m', [[-9, 'nm'], [-6, 'µm'], [-3, 'mm'], [0, 'm']]],
  ['V', [[-9, 'nV'], [-6, 'µV'], [-3, 'mV'], [0, 'V']]],
];
const PREFIXED = new Map();
for (const [, list] of FAMILIES) for (const [e, u] of list) PREFIXED.set(u, list.map(([x, l]) => ({ e: x, u: l, from: e })));

/** Pick the prefix for a unit given the SI nominal; returns null when the unit is not auto-scaled. */
function autoUnit(unit, conv, si) {
  const fam = PREFIXED.get(unit);
  if (!fam || !conv || !isFinite(si) || si === 0) return null;
  const e0 = fam[0].from;
  // Only rescale plain power-of-ten conversions (skip e.g. 2|χ|)
  if (Math.abs(conv(1) * Math.pow(10, e0) - 1) > 1e-9 || Math.abs(conv(-1) + conv(1)) > 1e-12) return null;
  const mag = Math.log10(Math.abs(si));
  let pick = fam[0];
  for (const f of fam) if (mag >= f.e - 1e-9) pick = f;
  return { unit: pick.u, conv: (v) => v / Math.pow(10, pick.e) };
}

/**
 * Display values for a node: nominal, window bounds (conv may reorder them), the 1σ fab
 * uncertainty and the unit, with the SI prefix chosen automatically where possible.
 */
export function triple(res, key, conv, unit) {
  const n = res.nom[key];
  const auto = autoUnit(unit, conv, n);
  const c = auto ? auto.conv : conv || ((x) => x);
  const u = auto ? auto.unit : unit;
  const nom = c(n);
  const s = res.S && res.S[key];
  const sigma = s > 0 ? Math.abs(c(n + s) - nom) : 0;
  const sig = { sigma, sigmaRel: nom ? sigma / Math.abs(nom) : 0 };
  const R = res.R[key];
  if (!R) return { nom, lo: nom, hi: nom, wide: false, unit: u, ...sig };
  const a = c(R.lo), b = c(R.hi);
  const lo = Math.min(a, b), hi = Math.max(a, b);
  const wide = isFinite(lo) && isFinite(hi) && hi - lo > Math.abs(nom) * 1e-6 + 1e-300;
  return { nom, lo, hi, wide, bad: R.bad, unit: u, ...sig };
}

/** "±0.18 GHz" style 1σ label, or '' when the node carries no fab uncertainty. */
export function sigmaText(t) {
  if (!(t.sigma > 0) || !(t.sigmaRel > 1e-5) || !isFinite(t.sigma)) return '';
  const rel = t.sigmaRel * 100;
  return `±${fmt(t.sigma, 2)}${t.unit ? ' ' + t.unit : ''} · ${rel >= 10 ? rel.toFixed(0) : rel.toFixed(1)} %`;
}

/** Relative spread as "+a / −b %". */
export function relSpread(t) {
  if (!t.wide || !t.nom) return '';
  const up = ((t.hi - t.nom) / Math.abs(t.nom)) * 100;
  const dn = ((t.nom - t.lo) / Math.abs(t.nom)) * 100;
  const f = (x) => (x >= 10 ? x.toFixed(0) : x.toFixed(1));
  return Math.abs(up - dn) < 0.05 * Math.max(up, dn) ? `±${f(up)} %` : `+${f(up)} / −${f(dn)} %`;
}

export const resolveKey = (key, q) => (key.endsWith('_Q') ? key.slice(0, -1) + q : key);
