# Transmon Design Estimator

A browser tool for working out the parameters of a flux-tunable transmon pair with dispersive readout and a tunable coupler. 
note: each card is one design step, computed from values fixed in earlier steps.

## What it does

- **Steps 0–10, in design order.**
  - Constraints, CPW and process statistics.
  - Qubit: capacitance → junction targets → SQUID asymmetry → frequency plan.
  - Readout: resonator frequency → linewidth κ → coupling g → photons and Purcell.
  - Coupler: couplings → junction and off point.
  - An after-fab bring-up checklist at the end.
- **Physics.**
  - Exact transmon levels from the charge basis, not just √(8E_JE_C).
  - CPW ε_eff and Z₀ from ε_r and the cross-section by conformal mapping, with kinetic inductance.
  - Junctions from R_n and the superconducting gap (Ambegaokar–Baratoff).
  - Hanger Q_c from coupling length and spacing (coupled-line model).
  - The coupler off point and ZZ.
- **Spread and uncertainty.** Every input has a window slider.
  - Each result shows its upper and lower bound over those windows (worst case).
  - Fab-sensitive results also show a ±1σ uncertainty, propagated from the process σ's (junction, capacitance, resonator, Q_c, area ratio, couplings).
- **Plots** (d3, thesis style): curves with shaded windows, contour maps, slices and rotatable 3D surfaces.
- **Formulas.** Flip any card (Σ) for its formulas, with the current numbers substituted.
- **Tracing.** Click any value to highlight the inputs it depends on.
- **Design checks.** Warnings for straddling, band limits, collisions, n_crit, Purcell T₁ and coupler margins appear on each card and in the status bar log.

## Run locally

```bash
npm install
npm run dev       # development server
npm test          # model and physics test suite
npm run build     # production build in dist/
```

Built with React, Vite, Tailwind with shadcn/ui components, d3 and KaTeX. Pushing to `main` deploys to GitHub Pages through `.github/workflows/deploy.yml`.

## Caveats

These are estimates for a starting design. Confirm the final layout with electromagnetic simulation (capacitance matrix, two-port Q_c, admittance at the qubit port), and set operating points from measurement.
