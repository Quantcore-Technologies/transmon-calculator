// Physics building blocks against analytic limits and independent formulas.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as P from '../src/lib/physics.js';
import { close } from './helpers.js';

const { K } = P;
const um = 1e-6;

test('complete elliptic integral K(k)', () => {
  close(P.ellipK(0), Math.PI / 2, 1e-12, 'K(0) = π/2');
  close(P.ellipK(Math.SQRT1_2), 1.8540746773013719, 1e-12, 'K(1/√2)');
  close(P.kRatio(Math.SQRT1_2), 1, 1e-12, 'K(k)/K(k′) = 1 at k = 1/√2');
});

test('transmon levels: design-note point E_J/E_C ≈ 116 → 6.0 GHz, α ≈ −1.09 E_C', () => {
  const EC = 19370e6 / 95;
  const EJ = 23.65e9;
  close(P.f01(EJ, EC), 6.0e9, 2e-3, 'f01');
  close(P.anharmonicity(EJ, EC) / EC, -1.09, 1e-2, 'α/E_C');
});

test('transmon levels approach the asymptotic form for E_J ≫ E_C', () => {
  const EC = 200e6, EJ = 1000 * EC;
  close(P.f01(EJ, EC), Math.sqrt(8 * EJ * EC) - EC, 1e-3, 'f01 → √(8E_JE_C) − E_C');
  const a = P.anharmonicity(EJ, EC) / EC;
  assert.ok(a < -1 && a > -1.03, `α/E_C → −1 from below, got ${a}`);
});

test('E_J inversion round-trips through the exact f01', () => {
  for (const EC of [150e6, 200e6, 300e6]) {
    for (const f of [4e9, 5.5e9, 6e9, 8e9]) {
      close(P.f01(P.EJfromF01(f, EC), EC), f, 1e-9, `f=${f} EC=${EC}`);
    }
  }
});

test('charge dispersion is below 1 Hz at E_J/E_C ≈ 116 (note, step 1)', () => {
  const d = P.chargeDispersion01(23.65e9, 203.9e6);
  assert.ok(d > 0 && d < 1, `got ${d} Hz`);
});

test('SQUID E_J(Φ): full at Φ = 0, d·E_JΣ at Φ0/2', () => {
  close(P.squid(0, 0.8), 1, 1e-12, 'Φ = 0');
  close(P.squid(0.5, 0.8), 0.8, 1e-12, 'Φ = Φ0/2');
});

test('net coupling tends to g12 for a far-detuned coupler and changes sign at the off point', () => {
  const [f1, f2, g, g12] = [6.4e9, 6.0e9, 100e6, 5e6];
  close(P.Jnet(1e15, f1, f2, g, g12), g12, 1e-4, 'J(∞)');
  assert.ok(P.Jnet(7e9, f1, f2, g, g12) < 0 && P.Jnet(10e9, f1, f2, g, g12) > 0);
  close(P.findRoot((x) => x * x - 2, 0, 2), Math.SQRT2, 1e-12, 'bisection');
});

test('thermal photons at 7.2 GHz, 50 mK ≈ 1.0 × 10⁻³ (note, step 6)', () => {
  close(P.nth(7.2e9, 0.05), 1.0e-3, 2e-2, 'n_th');
});

test('CPW: thick-substrate and air limits', () => {
  const thick = P.cpwLine({ w: 10 * um, s: 6 * um, h: 1, epsR: 11.45, t: 0, lam: 0 });
  close(thick.epsGeo, (11.45 + 1) / 2, 1e-6, 'ε_eff → (ε_r + 1)/2');
  // In air with k0 = 1/√2, K(k0) = K(k0′) so Z0 = η0/4 exactly and v = c
  const w = 10 * um, s = (w * (Math.SQRT2 - 1)) / 2;
  const air = P.cpwLine({ w, s, h: 1, epsR: 1, t: 0, lam: 0 });
  close(air.Z, Math.sqrt(K.mu0 / K.eps0) / 4, 1e-9, 'Z0 in air');
  close(air.v, K.c, 1e-9, 'v = c');
});

test('kinetic inductance: zero without a penetration depth, larger for thinner films', () => {
  const base = { w: 10 * um, s: 6 * um, h: 525 * um, epsR: 11.45 };
  assert.equal(P.cpwLine({ ...base, t: 200e-9, lam: 0 }).Lk, 0);
  const thin = P.cpwLine({ ...base, t: 50e-9, lam: 90e-9 }).alphaK;
  const thick = P.cpwLine({ ...base, t: 300e-9, lam: 90e-9 }).alphaK;
  assert.ok(thin > thick && thick > 0, `α_k thin ${thin} > thick ${thick}`);
  close(P.cpwLine({ ...base, t: 200e-9, lam: 90e-9 }).LkSq, K.mu0 * 90e-9 / Math.tanh(200 / 90), 1e-12, 'L_k,□');
});

test('coupled CPWs with a ground strip: odd mode matches the elliptic result, wide strip decouples', () => {
  const line = P.cpwLine({ w: 10 * um, s: 6 * um, h: 525 * um, epsR: 11.45, t: 0, lam: 0 });
  for (const d of [2, 9, 30]) {
    const r = P.coupledCPWGround(10 * um, 6 * um, d * um, line.epsEff);
    const A = (d / 2) ** 2, a = (d / 2 + 6) ** 2, b = (d / 2 + 16) ** 2, c = (d / 2 + 22) ** 2;
    const R = ((b - A) * (c - a)) / ((b - a) * (c - A));
    const k = 2 * R - 1 - Math.sqrt((2 * R - 1) ** 2 - 1);
    close(r.Co, 2 * line.epsEff * 2 * K.eps0 * P.kRatio(k), 1e-6, `odd mode, d = ${d} µm`);
    assert.ok(r.cm > 0 && r.lm > 0, 'mutuals positive');
  }
  const far = P.coupledCPWGround(10 * um, 6 * um, 3000 * um, line.epsEff);
  close(far.Ce, line.Cl, 1e-3, 'even → single line');
  close(far.Co, line.Cl, 1e-3, 'odd → single line');
  const near = P.coupledCPWGround(10 * um, 6 * um, 5 * um, line.epsEff).cm;
  const wide = P.coupledCPWGround(10 * um, 6 * um, 20 * um, line.epsEff).cm;
  assert.ok(near > wide, 'coupling falls with ground-strip width');
});

test('edge-coupled CPWs decouple as the gap grows', () => {
  const near = P.coupledCPW(10 * um, 6 * um, 5 * um, 6.2).cm;
  const far = P.coupledCPW(10 * um, 6 * um, 2000 * um, 6.2).cm;
  assert.ok(near > 100 * far && far >= 0);
});

test('hanger Q_c: short section equals the lumped-capacitor formula; Q_c ∝ C_r; length solve round-trips', () => {
  const line = P.cpwLine({ w: 10 * um, s: 6 * um, h: 525 * um, epsR: 11.45, t: 200e-9, lam: 90e-9 });
  const cp = P.coupledCPWGround(10 * um, 6 * um, 9 * um, line.epsEff);
  const f = 7.2e9, w = 2 * Math.PI * f, Cr = 1 / (8 * f * line.Z);
  const p = { f, v: line.v, Zr: line.Z, Zf: line.Z, Cr, cm: cp.cm, lm: cp.lm };
  const lc = 10 * um;
  close(P.hangerQc({ ...p, lc }), Math.PI / (2 * w * w * (cp.cm * lc) ** 2 * line.Z * line.Z), 1e-3, 'lumped limit');
  close(P.hangerQc({ ...p, Cr: 2 * Cr, lc: 500 * um }), 2 * P.hangerQc({ ...p, lc: 500 * um }), 1e-12, 'Q_c ∝ C_r');
  assert.ok(P.hangerQc({ ...p, lc: 400 * um }) > P.hangerQc({ ...p, lc: 800 * um }), 'longer section, lower Q_c');
  const l = P.couplingLengthFor(3600, p);
  close(P.hangerQc({ ...p, lc: l }), 3600, 1e-6, 'ℓ_c for Q_c = 3600');
  assert.ok(Number.isNaN(P.hangerQc({ ...p, lc: 1 })), 'section longer than λ/4 rejected');
});
