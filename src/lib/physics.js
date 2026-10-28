/* Transmon physics: constants, exact charge-basis levels and closed-form circuit relations.
   SI units throughout (Hz, F, H, A, Ω, s). Frequencies are ordinary frequencies (f = ω/2π). */

const K = {
  h: 6.62607015e-34,
  hbar: 1.054571817e-34,
  e: 1.602176634e-19,
  kB: 1.380649e-23,
  c: 299792458,
  eps0: 8.8541878128e-12,
  mu0: 1.25663706212e-6,
};
K.Phi0 = K.h / (2 * K.e);

// Lowest three levels of H/E_C = 4(n − n_g)² − (r/2) Σ (|n⟩⟨n+1| + h.c.), r = E_J/E_C,
// tabulated once on a log grid. n_g = 1/4 is the zero crossing of the charge
// dispersion, so these are the charge-averaged levels.
const TABLE = (function build() {
  const N = 20, size = 2 * N + 1, ng = 0.25;
  const uMin = Math.log(0.5), uMax = Math.log(8000), M = 1200;
  const du = (uMax - uMin) / (M - 1);
  const diag = new Float64Array(size);
  for (let k = 0; k < size; k++) { const q = k - N - ng; diag[k] = 4 * q * q; }
  const G = new Float64Array(M), A = new Float64Array(M);
  for (let i = 0; i < M; i++) {
    const r = Math.exp(uMin + i * du);
    const off2 = (r / 2) * (r / 2);
    // Sturm sequence: number of eigenvalues below lam
    const below = (lam) => {
      let count = 0, q = 1;
      for (let k = 0; k < size; k++) {
        q = diag[k] - lam - (k ? off2 / q : 0);
        if (q === 0) q = -1e-300;
        if (q < 0) count++;
      }
      return count;
    };
    const E = [0, 0, 0];
    for (let j = 0; j < 3; j++) {
      let lo = -r - 1, hi = 4 * (N + 1) * (N + 1) + r;
      for (let it = 0; it < 90; it++) {
        const mid = 0.5 * (lo + hi);
        if (below(mid) > j) hi = mid; else lo = mid;
      }
      E[j] = 0.5 * (lo + hi);
    }
    const e01 = E[1] - E[0], e12 = E[2] - E[1];
    G[i] = e01 - (Math.sqrt(8 * r) - 1);   // correction to the asymptotic f01
    A[i] = e12 - e01;                      // α / E_C
  }
  return { uMin, du, M, G, A, rMin: Math.exp(uMin), rMax: Math.exp(uMax) };
})();

function lookup(arr, r) {
  const x = (Math.log(r) - TABLE.uMin) / TABLE.du;
  if (!(x >= 0 && x <= TABLE.M - 1)) return NaN;
  const i = Math.min(Math.floor(x), TABLE.M - 2), t = x - i;
  return arr[i] * (1 - t) + arr[i + 1] * t;
}

/** Exact 0–1 transition frequency (Hz) for E_J/h, E_C/h in Hz. */
function f01(EJ, EC) {
  const r = EJ / EC;
  return EC * (Math.sqrt(8 * r) - 1 + lookup(TABLE.G, r));
}

/** Exact anharmonicity f12 − f01 (Hz, negative). */
function anharmonicity(EJ, EC) {
  return EC * lookup(TABLE.A, EJ / EC);
}

/** Invert f01 for E_J/h (Hz) at fixed E_C/h. */
function EJfromF01(f, EC) {
  const t = f / EC;
  if (!(t > 0) || !isFinite(t)) return NaN;
  let r = (t + 1) * (t + 1) / 8;
  for (let it = 0; it < 10; it++) {
    const F = Math.sqrt(8 * r) - 1 + lookup(TABLE.G, r);
    if (!isFinite(F)) return NaN;
    r -= (F - t) / (Math.SQRT2 / Math.sqrt(r));
    if (!(r > 0)) return NaN;
  }
  return r * EC;
}

/** Asymptotic inverse used in the design note: E_J = (f + E_C)² / 8E_C. */
function EJasymptotic(f, EC) {
  return (f + EC) * (f + EC) / (8 * EC);
}

/** Peak-to-peak charge dispersion of the 0–1 transition (Hz), Koch et al. */
function chargeDispersion01(EJ, EC) {
  const x = EJ / EC, damp = Math.exp(-Math.sqrt(8 * x));
  const eps = (m, fact) => EC * Math.pow(2, 4 * m + 5) / fact * Math.sqrt(2 / Math.PI) *
    Math.pow(x / 2, m / 2 + 0.75) * damp;
  return eps(0, 1) + eps(1, 1);
}

/** SQUID E_J(Φ)/E_JΣ for asymmetry d and reduced flux φ = Φ/Φ0. */
function squid(phi, d) {
  const c = Math.cos(Math.PI * phi), s = Math.sin(Math.PI * phi);
  return Math.sqrt(c * c + d * d * s * s);
}

/** Net qubit–qubit coupling through a tunable coupler at fc (all Hz). */
function Jnet(fc, f1, f2, gqc, g12) {
  return g12 + 0.5 * gqc * gqc * (1 / (f1 - fc) + 1 / (f2 - fc) - 1 / (f1 + fc) - 1 / (f2 + fc));
}

/** Bisection root of fn on [a, b]; NaN without a sign change. */
function findRoot(fn, a, b, iters) {
  let fa = fn(a), fb = fn(b);
  if (!isFinite(fa) || !isFinite(fb) || fa * fb > 0) return NaN;
  for (let i = 0; i < (iters || 80); i++) {
    const m = 0.5 * (a + b), fm = fn(m);
    if (fa * fm <= 0) { b = m; fb = fm; } else { a = m; fa = fm; }
  }
  return 0.5 * (a + b);
}

/** Bose–Einstein occupation at frequency f (Hz) and temperature T (K). */
function nth(f, T) {
  return 1 / Math.expm1(K.h * f / (K.kB * T));
}
// ── Coplanar waveguide ────────────────────────────────────────────────────────────────────

/** Complete elliptic integral of the first kind K(k), modulus k, by the AGM. */
function ellipK(k) {
  let a = 1, b = Math.sqrt(1 - k * k);
  for (let i = 0; i < 40 && Math.abs(a - b) > 1e-15 * a; i++) {
    const m = 0.5 * (a + b);
    b = Math.sqrt(a * b);
    a = m;
  }
  return Math.PI / (2 * a);
}

/** K(k)/K(k′), the ratio every conformal-mapping capacitance reduces to. */
function kRatio(k) {
  return ellipK(k) / ellipK(Math.sqrt(1 - k * k));
}

/** Kinetic inductance per length of a CPW centre strip and grounds (Watanabe et al., JJAP 33, 5708, 1994). */
function kineticInductance(w, s, t, lam) {
  const k = w / (w + 2 * s);
  const A = -t / Math.PI + 0.5 * Math.sqrt(Math.pow(2 * t / Math.PI, 2) + w * w);
  const B = w * w / (4 * A);
  const C = B - t / Math.PI + Math.sqrt(Math.pow(t / Math.PI, 2) + s * s);
  const D = 2 * t / Math.PI + C;
  const Kk = ellipK(k);
  return K.mu0 * lam * C / (4 * A * D * Kk * Kk) *
    (1.7 / Math.sinh(t / (2 * lam)) + 0.4 / Math.sqrt((Math.pow(B / A, 2) - 1) * (1 - Math.pow(B / D, 2))));
}

/**
 * CPW on a substrate of finite thickness (conformal mapping), with kinetic inductance.
 * w centre width, s gap, h substrate thickness, t film thickness, lam London depth (all m).
 * epsEffFixed overrides the geometric ε_eff (e.g. a measured fit).
 */
function cpwLine({ w, s, h, epsR, t, lam, epsEffFixed }) {
  const k0 = w / (w + 2 * s);
  const k1 = Math.sinh(Math.PI * w / (4 * h)) / Math.sinh(Math.PI * (w + 2 * s) / (4 * h));
  const epsGeo = 1 + 0.5 * (epsR - 1) * kRatio(k1) / kRatio(k0);
  const epsEff = epsEffFixed > 0 ? epsEffFixed : epsGeo;
  const Cl = 4 * K.eps0 * epsEff * kRatio(k0);
  const Lg = K.mu0 / (4 * kRatio(k0));
  const Lk = t > 0 && lam > 0 ? kineticInductance(w, s, t, lam) : 0;
  const L = Lg + Lk;
  return {
    k0, epsGeo, epsEff, Cl, Lg, Lk, L,
    Z: Math.sqrt(L / Cl), Zgeo: Math.sqrt(Lg / Cl),
    v: 1 / Math.sqrt(L * Cl), alphaK: Lk / L,
    LkSq: lam > 0 ? K.mu0 * lam / Math.tanh(t / lam) : 0,
  };
}

/**
 * Mutual capacitance and inductance per length of two identical, edge-coupled CPW centre strips
 * separated by a coupling gap sc (no ground strip between), outer gaps s to ground.
 * Even/odd modes by the z² mapping of each half; epsEff weights the substrate half-space.
 */
function coupledCPW(w, s, sc, epsEff) {
  const a = Math.pow(sc / 2, 2), b = Math.pow(sc / 2 + w, 2), c = Math.pow(sc / 2 + w + s, 2);
  const ke = Math.sqrt((b - a) / (c - a));            // even: strip (a,b), ground (c,∞), open elsewhere
  const R = b * (c - a) / ((b - a) * c);              // odd: cross-ratio of (0, a, b, c) onto a CPW
  const ko = 2 * R - 1 - Math.sqrt(Math.pow(2 * R - 1, 2) - 1);
  const qe = K.eps0 * kRatio(ke), qo = 2 * K.eps0 * kRatio(ko);   // per quadrant, in air
  const Ce = 2 * epsEff * qe, Co = 2 * epsEff * qo;
  const Le = K.mu0 * K.eps0 / (2 * qe), Lo = K.mu0 * K.eps0 / (2 * qo);
  return { cm: (Co - Ce) / 2, lm: (Le - Lo) / 2, Ce, Co, ke, ko };
}

// ∫_p^q h(t) / √((t − p)(q − t)) dt by Gauss–Chebyshev
function chebInt(p, q, h, N) {
  const m = 0.5 * (p + q), r = 0.5 * (q - p);
  let s = 0;
  for (let k = 1; k <= N; k++) s += h(m - r * Math.cos((2 * k - 1) * Math.PI / (2 * N)));
  return s * Math.PI / N;
}

/**
 * Two identical CPWs (centre w, gaps s) running side by side with a ground strip of width d between
 * them — the usual hanger coupler. Each half of the symmetric cross-section maps by t = z² onto a
 * half-plane with breakpoints 0, A, a, b, c. The odd mode is a 4-point (elliptic) problem; the even
 * mode, with the grounded strip and a magnetic wall, is a 5-point problem solved with
 * Ω′ ∝ (t − τ)/√∏(t − tᵢ), τ fixed by both grounds sitting at the same potential.
 */
function coupledCPWGround(w, s, d, epsEff) {
  const u = 1e6;                        // work in µm to keep t = z² well scaled
  const A = Math.pow(d * u / 2, 2), a = Math.pow((d / 2 + s) * u, 2);
  const b = Math.pow((d / 2 + s + w) * u, 2), c = Math.pow((d / 2 + 2 * s + w) * u, 2);
  const N = 400;
  const seg = (p, q, others, tau) => chebInt(p, q, (t) => {
    let prod = 1;
    for (const r of others) prod *= Math.abs(t - r);
    return (tau === null ? 1 : t - tau) / Math.sqrt(prod);
  }, N);
  // Even mode: ∫(t − τ)g over both slots must match, which is linear in τ
  const I0 = (p, q, o) => seg(p, q, o, null);
  const I1 = (p, q, o) => seg(p, q, o, 0);
  const oAa = [0, b, c], obc = [0, A, a], oab = [0, A, c];
  const tau = (I1(A, a, oAa) - I1(b, c, obc)) / (I0(A, a, oAa) - I0(b, c, obc));
  const qe = K.eps0 * seg(a, b, oab, tau) / seg(b, c, obc, tau);
  // Odd mode: ground on (−∞, A) ∪ (c, ∞)
  const qo = K.eps0 * seg(a, b, [A, c], null) / seg(b, c, [A, a], null);
  const Ce = 2 * epsEff * qe, Co = 2 * epsEff * qo;
  const Le = K.mu0 * K.eps0 / (2 * qe), Lo = K.mu0 * K.eps0 / (2 * qo);
  return { cm: (Co - Ce) / 2, lm: (Le - Lo) / 2, Ce, Co, tau };
}

/**
 * External Q of a hanger resonator coupled over a parallel section of length lc that starts at
 * the resonator's open end (weak coupling, matched feedline of impedance Zf).
 * The standing wave V = cos βx, I = −j sin βx / Zr drives shunt (c_m) and series (l_m) sources
 * on the feedline; Q_c = ωE / P with P the power radiated in both directions.
 */
function hangerQc({ f, v, Zr, Zf, Cr, lc, cm, lm }) {
  const w = 2 * Math.PI * f, beta = w / v;
  if (!(lc > 0) || lc > v / (4 * f) * 1.0001) return NaN;
  const N = 64, dx = lc / N;
  let fr = 0, fi = 0, br = 0, bi = 0;
  for (let i = 0; i < N; i++) {
    const x = (i + 0.5) * dx;
    const sv = -w * lm * Math.sin(beta * x) / Zr;    // series source, real
    const si = w * cm * Math.cos(beta * x);          // shunt source, imaginary part
    const c = Math.cos(beta * x), s = Math.sin(beta * x);
    // forward: e^{jβx}(sv + j Zf si); backward: e^{−jβx}(sv − j Zf si)
    fr += c * sv - s * Zf * si; fi += s * sv + c * Zf * si;
    br += c * sv - s * Zf * si; bi += -s * sv - c * Zf * si;
  }
  const P = (0.25 * dx * dx * (fr * fr + fi * fi + br * br + bi * bi)) / (2 * Zf);
  return w * 0.5 * Cr / P;
}

/** Coupling length that gives a target Q_c (bisection in log length); NaN if out of reach. */
function couplingLengthFor(Qtarget, p) {
  const lmax = p.v / (4 * p.f);
  const q = (u) => Math.log(hangerQc({ ...p, lc: Math.exp(u) })) - Math.log(Qtarget);
  const u = findRoot(q, Math.log(1e-7), Math.log(lmax), 50);
  return isFinite(u) ? Math.exp(u) : NaN;
}

export {
  K, TABLE, f01, anharmonicity, EJfromF01, EJasymptotic, chargeDispersion01, squid, Jnet, findRoot, nth,
  ellipK, kRatio, kineticInductance, cpwLine, coupledCPW, coupledCPWGround, hangerQc, couplingLengthFor,
};

