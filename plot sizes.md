Here's the single, complete reference. Everything below obeys one rule, and once you accept it there's nothing else to track:

> **Golden rule:** figure width (inches) = (fraction of textwidth it occupies) × 6.0. Then `s = 1`, LaTeX does no scaling, and **the matplotlib font size = the size printed on the page.** (Assumes textwidth = 6.0″ — verify with `\the\textwidth`, ÷ 72.27 for inches; adjust as noted at the end.)

Fonts shrink as panels get narrower — that's deliberate and conventional, not a defect. I've grouped them into four tiers; the exact sizes are in the legend below each table.

## A. Single plot = one image

| Layout | figsize | LaTeX width | Font tier |
|---|---|---|---|
| Default single plot (3:2) | (6.0, 4.0) | `\textwidth` | **1** |
| Wide single (3:1) | (6.0, 2.0) | `\textwidth` | **1** |
| Timetrace (8:3) | (6.0, 2.25) | `\textwidth` | **1** |
| Big square, centred | (4.5, 4.5) | `0.75\textwidth` | **1** |
| Medium square, centred | (3.6, 3.6) | `0.6\textwidth` | **1** |

## B. Multi-panel built as ONE figure — recommended

One `plt.subplots(...)` canvas, always 6″ wide, always included at `\textwidth`. Panel count never changes `s`; it only changes how much room the data gets. Shared axis labels reduce clutter.

| Layout | figsize | LaTeX width | Font tier |
|---|---|---|---|
| 2 panels 50:50, 3:2 each | (6.0, 2.5) | `\textwidth` | **2** |
| 2 panels 50:50, square each | (6.0, 3.2) | `\textwidth` | **2** |
| Re(ρ) + Im(ρ) pair (+colorbars) | (6.0, 2.8) | `\textwidth` | **2** |
| 2×2 grid | (6.0, 5.0) | `\textwidth` | **2** |
| 3 in a row, 4:3 each | (6.0, 2.0) | `\textwidth` | **3** |
| 3 in a row, square each (+colorbars) | (6.0, 2.6) | `\textwidth` | **3** |
| 4 in a row, square each | (6.0, 1.9) | `\textwidth` | **4** |
| 3 stacked, shared-x | (6.0, 6.5) | `\textwidth` | **1** |

Note the stacked case is tier 1: each panel is the full 6″ wide, so there's room for 12 pt.

## C. Multi-panel as SEPARATE image files (only if you must)

Each file is its own `\includegraphics`, so each must individually satisfy the golden rule. Avoid this for rows of 3–4 — you pay y-label + tick overhead once per file, so the data columns end up narrower than the single-figure version at the same page width.

| Layout | each figsize | LaTeX width (each) | Font tier |
|---|---|---|---|
| 2 side-by-side (50:50) | (2.9, 2.2) | `0.49\textwidth` | **2** |
| 3 in a row, 4:3 | (1.9, 1.45) | `0.32\textwidth` | **3** |
| 3 in a row, square | (1.9, 1.9) | `0.32\textwidth` | **3** |
| 4 in a row, square | (1.45, 1.45) | `0.24\textwidth` | **4** |
| General, fraction *f* | (*f*·6.0, *h*) | `f\textwidth` | by width |

## Font tiers (these ARE the printed point sizes, since s = 1)

| Tier | Use when | font.size / label / title | tick | legend |
|---|---|---|---|---|
| **1** | full-width or ≥4.5″ panels | 12 | 10 | 10 |
| **2** | 2 panels across (~3″ each) | 11 | 9 | 10 |
| **3** | 3 panels across (~1.9″ each) | 10 | 8.5 | 9 |
| **4** | 4 panels across (~1.5″ each) | 9 | 8 | 8 |

```python
TIERS = {
    1: {"font.size":12,"axes.labelsize":12,"axes.titlesize":12,
        "xtick.labelsize":10,"ytick.labelsize":10,"legend.fontsize":10},
    2: {"font.size":11,"axes.labelsize":11,"axes.titlesize":11,
        "xtick.labelsize":9, "ytick.labelsize":9, "legend.fontsize":10},
    3: {"font.size":10,"axes.labelsize":10,"axes.titlesize":10,
        "xtick.labelsize":8.5,"ytick.labelsize":8.5,"legend.fontsize":9},
    4: {"font.size":9, "axes.labelsize":9, "axes.titlesize":9,
        "xtick.labelsize":8, "ytick.labelsize":8, "legend.fontsize":8},
}
def use_tier(n):
    plt.rcParams.update(TIERS[n])   # call before building the figure
```

Then any figure is just: pick the row, set `figsize` and `use_tier(...)` from it, include at the listed width. Done — fonts are uniform within each tier and printed at exactly the listed pt.

## Two cautions

1. The skill's `savefig.bbox="tight"` trims whitespace, so the saved file is a few percent narrower than the nominal figsize; `width=\textwidth` then scales it back up by that few percent, breaking `s = 1` slightly and unevenly across figures. For exact fidelity, use `fig = plt.subplots(..., layout="constrained")` and drop `bbox="tight"` (or include each at its true trimmed width). For most theses the drift is invisible.

2. **textwidth ≠ 6.0″?** Multiply every figsize by `your_textwidth / 6.0` (fractions and font tiers stay the same). E.g. at 6.3″: default plot → (6.3, 4.2), half-panel file → (3.05, 2.3). The font sizes don't change because the include fractions don't.