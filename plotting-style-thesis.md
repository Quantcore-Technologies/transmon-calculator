```python

pythonimport matplotlib.pyplot as plt
import numpy as np
from matplotlib.ticker import AutoMinorLocator

try:
    import scienceplots
    plt.style.use(['science'])
except ImportError:
    pass  # scienceplots not installed; rcParams below still apply

COLORS = [
    '#185adb', '#f9813a', '#da0037', '#206a5d', '#444444',
    '#c4fb6d', '#e84a5f', '#3edbf0', '#ff847c', '#ffc947',
]

plt.rcParams['axes.prop_cycle'] = plt.cycler('color', COLORS)
plt.rcParams.update({
    "font.size": 12,
    "axes.labelsize": 12,
    "axes.titlesize": 12,
    "xtick.labelsize": 10,
    "ytick.labelsize": 10,
    "legend.fontsize": 10,
    "text.usetex": True,
    "figure.titlesize": 12,
    "font.family": "serif",
    "axes.linewidth": 1.2,
    "axes.labelpad": 4.0,
    "axes.titlepad": 6.0,
    "lines.linewidth": 2.2,
    "lines.markersize": 4.0,
    "lines.markeredgewidth": 0.9,
    "xtick.major.size": 6,
    "ytick.major.size": 6,
    "xtick.minor.size": 3,
    "ytick.minor.size": 3,
    "xtick.major.width": 1.2,
    "ytick.major.width": 1.2,
    "xtick.minor.width": 1.0,
    "ytick.minor.width": 1.0,
    "xtick.major.pad": 3.5,
    "ytick.major.pad": 3.5,
    "figure.dpi": 120,
    "savefig.dpi": 300,
    "savefig.bbox": "tight",
    "savefig.pad_inches": 0.02,
    "pdf.fonttype": 42,
    "ps.fonttype": 42,
    "axes.grid": False,
})

# LaTeX smoke-test fallback
try:
    _fig, _ax = plt.subplots(figsize=(1, 1))
    _ax.set_title(r"$\alpha$")
    _fig.savefig("/tmp/_latex_test.png")
    plt.close(_fig)
except Exception:
    plt.rcParams.update({"text.usetex": False, "mathtext.fontset": "cm"})


def thesis_axes(ax, xminor=5, yminor=5):
    """Apply minor ticks and consistent spine widths. Call once per axis."""
    ax.xaxis.set_minor_locator(AutoMinorLocator(xminor))
    ax.yaxis.set_minor_locator(AutoMinorLocator(yminor))
    ax.tick_params(which="both", top=True, right=True)
    for s in ax.spines.values():
        s.set_linewidth(plt.rcParams["axes.linewidth"])
```