/* d3 plots in the thesis style: serif type, full box, inward major/minor ticks on all four sides.
   Modes: curve (nominal + envelope + window), map (filled contours), surface (isometric), spans, iq. */
import * as d3 from 'd3';

const COLORS = ['#185adb', '#f9813a', '#da0037', '#206a5d', '#444444', '#c4fb6d', '#e84a5f', '#3edbf0', '#ff847c', '#ffc947'];
const FONT = "KaTeX_Main, 'Latin Modern Roman', 'CMU Serif', 'Times New Roman', serif";
const LW = 1.2, MAJOR = 6, MINOR = 3;

function theme() {
  const cs = getComputedStyle(document.documentElement);
  const g = (k) => cs.getPropertyValue(k).trim();
  return {
    fg: g('--plot-fg'), bg: g('--plot-bg'), muted: g('--plot-muted'), grid: g('--plot-grid'),
    accent: g('--brand'), upper: g('--upper'), lower: g('--lower'), band: g('--plot-band'),
  };
}

// Minimal rich text: <i>, <sub>, <sup> → tspans.
function rich(text, str) {
  text.text(null);
  const parts = String(str).split(/(<\/?(?:i|sub|sup)>)/);
  let italic = false, shift = 0;
  for (const p of parts) {
    if (!p) continue;
    if (p === '<i>') { italic = true; continue; }
    if (p === '</i>') { italic = false; continue; }
    if (p === '<sub>' || p === '<sup>') { const s = p === '<sub>' ? 0.32 : -0.42; text.append('tspan').attr('dy', s + 'em').attr('font-size', '0.72em').attr('class', 'shift').text(''); shift = s; continue; }
    if (p === '</sub>' || p === '</sup>') { text.append('tspan').attr('dy', -shift + 'em').text(''); shift = 0; continue; }
    const t = text.append('tspan').text(p).attr('font-style', italic ? 'italic' : null);
    if (shift) t.attr('font-size', '0.72em');
  }
  return text;
}

function fmtTick(scale, log) {
  if (!log) {
    const f = scale.tickFormat(6);
    return (v) => f(v);
  }
  return (v) => {
    const k = Math.round(Math.log10(v));
    if (Math.abs(v - Math.pow(10, k)) / v > 1e-9) return null;
    if (k >= 0 && k <= 3) return String(Math.pow(10, k));
    if (k === -1) return '0.1';
    return '10<sup>' + String(k).replace('-', '−') + '</sup>';
  };
}

function minorTicks(scale, log, majors) {
  const [a, b] = scale.domain().slice().sort((p, q) => p - q);
  const out = [];
  if (log) {
    for (let k = Math.floor(Math.log10(a)); k <= Math.ceil(Math.log10(b)); k++) {
      for (let m = 2; m <= 9; m++) { const v = m * Math.pow(10, k); if (v >= a && v <= b) out.push(v); }
    }
    return out;
  }
  if (majors.length < 2) return out;
  const step = (majors[1] - majors[0]) / 5;
  const start = Math.ceil((a - 1e-12) / step) * step;
  for (let v = start; v <= b + 1e-12; v += step) {
    if (!majors.some((m) => Math.abs(m - v) < step * 1e-3)) out.push(v);
  }
  return out;
}

/** Box, inward ticks on four sides, labels. */
function frame(g, xs, ys, W, H, o, T) {
  const nx = Math.max(3, Math.floor(W / 90)), ny = Math.max(3, Math.floor(H / 50));
  const xMaj = o.xlog ? xs.ticks().filter((v) => fmtTick(xs, true)(v)) : xs.ticks(nx);
  const yMaj = o.ylog ? ys.ticks().filter((v) => fmtTick(ys, true)(v)) : (o.noY ? [] : ys.ticks(ny));
  const xMin = minorTicks(xs, o.xlog, xMaj), yMin = o.noY ? [] : minorTicks(ys, o.ylog, yMaj);
  const ax = g.append('g').attr('stroke', T.fg).attr('fill', 'none');
  const tick = (x1, y1, x2, y2, w) => ax.append('line').attr('x1', x1).attr('y1', y1).attr('x2', x2).attr('y2', y2).attr('stroke-width', w);
  for (const v of xMaj) { const x = xs(v); tick(x, H, x, H - MAJOR, LW); tick(x, 0, x, MAJOR, LW); }
  for (const v of xMin) { const x = xs(v); tick(x, H, x, H - MINOR, 1); tick(x, 0, x, MINOR, 1); }
  for (const v of yMaj) { const y = ys(v); tick(0, y, MAJOR, y, LW); tick(W, y, W - MAJOR, y, LW); }
  for (const v of yMin) { const y = ys(v); tick(0, y, MINOR, y, 1); tick(W, y, W - MINOR, y, 1); }
  ax.append('rect').attr('width', W).attr('height', H).attr('stroke-width', LW);

  const lab = g.append('g').attr('font-family', FONT).attr('fill', T.fg);
  const fx = fmtTick(xs, o.xlog), fy = fmtTick(ys, o.ylog);
  for (const v of xMaj) {
    const s = fx(v); if (s == null) continue;
    rich(lab.append('text').attr('x', xs(v)).attr('y', H + 19).attr('text-anchor', 'middle').attr('font-size', 13), s);
  }
  for (const v of yMaj) {
    const s = fy(v); if (s == null) continue;
    rich(lab.append('text').attr('x', -6).attr('y', ys(v) + 4).attr('text-anchor', 'end').attr('font-size', 13), s);
  }
  if (o.xlabel) rich(lab.append('text').attr('x', W / 2).attr('y', H + 45).attr('text-anchor', 'middle').attr('font-size', 15), o.xlabel);
  if (o.ylabel) rich(lab.append('text').attr('transform', `translate(${-o.ylabelOffset || -55},${H / 2}) rotate(-90)`).attr('text-anchor', 'middle').attr('font-size', 15), o.ylabel);
}

function svgFor(el, height, m) {
  const width = Math.max(260, el.clientWidth || 420);
  d3.select(el).selectAll('*').remove();
  const svg = d3.select(el).append('svg').attr('width', width).attr('height', height)
    .attr('viewBox', `0 0 ${width} ${height}`).attr('class', 'plot-svg');
  const W = width - m.l - m.r, H = height - m.t - m.b;
  const g = svg.append('g').attr('transform', `translate(${m.l},${m.t})`);
  const id = 'clip' + Math.random().toString(36).slice(2, 8);
  svg.append('defs').append('clipPath').attr('id', id).append('rect').attr('width', W).attr('height', H);
  return { svg, g, W, H, clip: `url(#${id})` };
}

const finite = (v) => typeof v === 'number' && isFinite(v);
function extent(arrs, log) {
  let a = Infinity, b = -Infinity;
  for (const arr of arrs) for (const v of arr) if (finite(v) && (!log || v > 0)) { if (v < a) a = v; if (v > b) b = v; }
  return a <= b ? [a, b] : [0, 1];
}
function pad([a, b], log, f) {
  if (log) { const k = Math.pow(b / a, f || 0.08); return [a / k, b * k]; }
  if (a === b) { const d = Math.abs(a) * 0.05 || 1; return [a - d, b + d]; }
  const d = (b - a) * (f || 0.08);
  return [a - d, b + d];
}
const sample = (a, b, N, log) => d3.range(N).map((i) => (log ? a * Math.pow(b / a, i / (N - 1)) : a + (b - a) * i / (N - 1)));

function windowOf(get, D) {
  const x0 = get(D.res.nom, D.q);
  let lo = x0, hi = x0;
  for (const c of D.res.ctx) { const v = get(c, D.q); if (finite(v)) { if (v < lo) lo = v; if (v > hi) hi = v; } }
  return { x0, lo, hi, wide: hi - lo > Math.abs(x0) * 1e-6 + 1e-15 };
}

const fmtVal = (v) => {
  if (!finite(v)) return '—';
  const a = Math.abs(v);
  if (a !== 0 && (a < 1e-3 || a >= 1e5)) return v.toExponential(2).replace('-', '−');
  return d3.format(a >= 100 ? ',.1f' : a >= 1 ? '.3f' : '.4f')(v).replace('-', '−');
};

// ── Curve ───────────────────────────────────────────────────────────────────────────────
function curve(el, spec, D) {
  const T = theme();
  const m = { l: 72, r: 16, t: 12, b: 58 };
  const { svg, g, W, H, clip } = svgFor(el, D.height || 250, m);
  const c0 = D.res.nom, q = D.q;
  const [xa, xb] = spec.x.domain(c0, q);
  const xsv = sample(xa, xb, 200, spec.x.log);
  const f = (c, x) => spec.f(c, q, x);
  const nomY = xsv.map((x) => f(c0, x));
  const lo = [], hi = [];
  for (let i = 0; i < xsv.length; i++) {
    let a = nomY[i], b = nomY[i];
    for (const c of D.res.ctx) { const y = f(c, xsv[i]); if (finite(y)) { if (!(y >= a)) a = y; if (!(y <= b)) b = y; } }
    lo.push(a); hi.push(b);
  }
  const win = spec.x.get ? windowOf(spec.x.get, D) : null;
  // Output window over the x window (or at x0 when x is fixed)
  let region = null;
  if (win) {
    const rx = win.wide ? sample(win.lo, win.hi, 60, spec.x.log) : [win.x0];
    const rlo = [], rhi = [];
    for (const x of rx) {
      let a = f(c0, x), b = a;
      for (const c of D.res.ctx) { const y = f(c, x); if (finite(y)) { if (!(y >= a)) a = y; if (!(y <= b)) b = y; } }
      rlo.push(a); rhi.push(b);
    }
    region = { rx, rlo, rhi, ymin: d3.min(rlo.filter(finite)), ymax: d3.max(rhi.filter(finite)) };
  }
  const hm = spec.hmarks ? spec.hmarks(c0, q) : [];
  let yd = spec.y.domain ? spec.y.domain(c0, q) : pad(extent([lo, hi, nomY], spec.y.log), spec.y.log);
  if (spec.y.clip) yd = [Math.max(yd[0], spec.y.clip[0]), Math.min(yd[1], spec.y.clip[1])];
  const xs = (spec.x.log ? d3.scaleLog() : d3.scaleLinear()).domain([xa, xb]).range([0, W]);
  const ys = (spec.y.log ? d3.scaleLog() : d3.scaleLinear()).domain(yd).range([H, 0]);
  const okY = (y) => finite(y) && (!spec.y.log || y > 0);
  const P = g.append('g').attr('clip-path', clip);

  // Envelope over the other windows
  const env = d3.area().defined((_, i) => okY(lo[i]) && okY(hi[i])).x((_, i) => xs(xsv[i])).y0((_, i) => ys(lo[i])).y1((_, i) => ys(hi[i]));
  P.append('path').attr('d', env(xsv)).attr('fill', T.band).attr('opacity', 0.14);

  // Shaded window region
  if (region && win.wide) {
    const ar = d3.area().defined((_, i) => okY(region.rlo[i]) && okY(region.rhi[i])).x((_, i) => xs(region.rx[i])).y0((_, i) => ys(region.rlo[i])).y1((_, i) => ys(region.rhi[i]));
    P.append('rect').attr('x', xs(win.lo)).attr('width', Math.max(1, xs(win.hi) - xs(win.lo))).attr('y', 0).attr('height', H).attr('fill', T.accent).attr('opacity', 0.06);
    P.append('path').attr('d', ar(region.rx)).attr('fill', T.accent).attr('opacity', 0.28);
  }

  for (const mk of spec.vmarks ? spec.vmarks(c0, q) : []) {
    if (!finite(mk.x)) continue;
    P.append('line').attr('x1', xs(mk.x)).attr('x2', xs(mk.x)).attr('y1', 0).attr('y2', H).attr('stroke', mk.color || T.muted).attr('stroke-width', 1).attr('stroke-dasharray', '4 3');
    rich(P.append('text').attr('x', xs(mk.x) + 4).attr('y', 14).attr('font-family', FONT).attr('font-size', 13).attr('fill', mk.color || T.muted), mk.label);
  }
  for (const mk of hm) {
    if (!okY(mk.y)) continue;
    P.append('line').attr('x1', 0).attr('x2', W).attr('y1', ys(mk.y)).attr('y2', ys(mk.y)).attr('stroke', mk.color || T.muted).attr('stroke-width', 1).attr('stroke-dasharray', mk.dash || '4 3');
    if (mk.label) rich(P.append('text').attr('x', 8).attr('y', ys(mk.y) - 4).attr('font-family', FONT).attr('font-size', 13).attr('fill', mk.color || T.muted), mk.label);
  }

  const line = d3.line().defined((d) => okY(d[1])).x((d) => xs(d[0])).y((d) => ys(d[1]));
  (spec.series || []).forEach((s, i) => {
    const ys2 = xsv.map((x) => s.f(c0, q, x));
    P.append('path').attr('d', line(xsv.map((x, j) => [x, ys2[j]]))).attr('fill', 'none')
      .attr('stroke', s.color || COLORS[(i + 1) % COLORS.length]).attr('stroke-width', 1.6).attr('stroke-dasharray', s.dash || null);
  });
  P.append('path').attr('d', line(xsv.map((x, i) => [x, nomY[i]]))).attr('fill', 'none').attr('stroke', COLORS[0]).attr('stroke-width', 2.2);

  if (region) {
    if (win.wide) {
      const seg = sample(win.lo, win.hi, 60, spec.x.log).map((x) => [x, f(c0, x)]);
      P.append('path').attr('d', line(seg)).attr('fill', 'none').attr('stroke', T.accent).attr('stroke-width', 5.5).attr('stroke-linecap', 'round');
    }
    if (okY(region.ymax) && okY(region.ymin) && region.ymax - region.ymin > Math.abs(region.ymax) * 1e-6) {
      const guide = (y, color, label, dy) => {
        P.append('line').attr('x1', 0).attr('x2', W).attr('y1', ys(y)).attr('y2', ys(y)).attr('stroke', color).attr('stroke-width', 1.1).attr('stroke-dasharray', '6 3');
        P.append('text').attr('x', W - 8).attr('y', ys(y) + dy).attr('text-anchor', 'end').attr('font-family', FONT).attr('font-size', 13).attr('fill', color).text(label + ' ' + fmtVal(y));
      };
      guide(region.ymax, T.upper, 'max', -4);
      guide(region.ymin, T.lower, 'min', 12);
    }
    const y0 = f(c0, win.x0);
    if (okY(y0) && win.x0 >= Math.min(xa, xb) && win.x0 <= Math.max(xa, xb)) {
      P.append('circle').attr('cx', xs(win.x0)).attr('cy', ys(y0)).attr('r', 4.2).attr('fill', T.bg).attr('stroke', T.fg).attr('stroke-width', 1.4);
    }
  }
  frame(g, xs, ys, W, H, { xlabel: spec.x.label, ylabel: spec.y.label, xlog: spec.x.log, ylog: spec.y.log }, T);
  hover(svg, g, W, H, m, (px) => {
    const x = xs.invert(px);
    const y = f(c0, x);
    let a = y, b = y;
    for (const c of D.res.ctx) { const v = f(c, x); if (finite(v)) { if (v < a) a = v; if (v > b) b = v; } }
    return { x: xs(x), y: okY(y) ? ys(y) : null, text: `x = ${fmtVal(x)}   y = ${fmtVal(y)}` + (b - a > Math.abs(y) * 1e-6 ? `   [${fmtVal(a)}, ${fmtVal(b)}]` : '') };
  }, T);
}

function hover(svg, g, W, H, m, at, T) {
  const layer = g.append('g').attr('pointer-events', 'none').style('display', 'none');
  const vl = layer.append('line').attr('y1', 0).attr('y2', H).attr('stroke', T.muted).attr('stroke-width', 0.8);
  const dot = layer.append('circle').attr('r', 3).attr('fill', T.fg);
  const bgR = layer.append('rect').attr('fill', T.bg).attr('opacity', 0.9).attr('stroke', T.grid);
  const tx = layer.append('text').attr('x', 8).attr('y', 17).attr('font-family', FONT).attr('font-size', 13).attr('fill', T.fg);
  g.append('rect').attr('width', W).attr('height', H).attr('fill', 'transparent')
    .on('pointermove', (ev) => {
      const [px, py] = d3.pointer(ev);
      const r = at(px, py);
      if (!r) return;
      layer.style('display', null);
      vl.attr('x1', r.x).attr('x2', r.x);
      dot.style('display', r.y == null ? 'none' : null).attr('cx', r.x).attr('cy', r.y || 0);
      tx.text(r.text);
      const bb = tx.node().getBBox();
      bgR.attr('x', bb.x - 4).attr('y', bb.y - 2).attr('width', bb.width + 8).attr('height', bb.height + 4);
    })
    .on('pointerleave', () => layer.style('display', 'none'));
}

// ── Map: filled contours over two variables ─────────────────────────────────────────────
function sliceValue(spec, D) {
  if (!spec.w) return undefined;
  const w = windowOf(spec.w.get, D);
  return D.slice === 'lo' ? w.lo : D.slice === 'hi' ? w.hi : w.x0;
}

function grid(spec, D, nx, nz) {
  const c0 = D.res.nom, q = D.q;
  const [xa, xb] = spec.x.domain(c0, q), [za, zb] = spec.z.domain(c0, q);
  const wv = sliceValue(spec, D);
  const X = sample(xa, xb, nx, spec.x.log), Z = sample(za, zb, nz, spec.z.log);
  const vals = new Float64Array(nx * nz);
  for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) {
    let y = spec.f(c0, q, X[i], Z[j], wv);
    if (spec.y.log) y = y > 0 ? Math.log10(y) : NaN;
    vals[j * nx + i] = y;
  }
  return { X, Z, vals, xa, xb, za, zb, wv };
}

function map(el, spec, D) {
  const T = theme();
  const m = { l: 72, r: 88, t: 12, b: 58 };
  const { svg, g, W, H, clip } = svgFor(el, D.height || 260, m);
  const nx = 80, nz = 60;
  const G = grid(spec, D, nx, nz);
  const [vmin, vmax] = extent([G.vals]);
  const filled = Float64Array.from(G.vals, (v) => (finite(v) ? v : vmin - 1));
  const th = d3.ticks(vmin, vmax, 12);
  const color = d3.scaleSequential(d3.interpolateCividis).domain([vmin, vmax]);
  const xs = (spec.x.log ? d3.scaleLog() : d3.scaleLinear()).domain([G.xa, G.xb]).range([0, W]);
  const zs = (spec.z.log ? d3.scaleLog() : d3.scaleLinear()).domain([G.za, G.zb]).range([H, 0]);
  const proj = d3.geoTransform({
    point(px, py) { this.stream.point((px - 0.5) / (nx - 1) * W, H - (py - 0.5) / (nz - 1) * H); },
  });
  const path = d3.geoPath(proj);
  const P = g.append('g').attr('clip-path', clip);
  P.append('rect').attr('width', W).attr('height', H).attr('fill', color(vmin));
  const cs = d3.contours().size([nx, nz]).thresholds(th)(filled);
  P.selectAll('path.c').data(cs).join('path').attr('d', path).attr('fill', (d) => color(d.value))
    .attr('stroke', 'rgba(0,0,0,0.28)').attr('stroke-width', 0.6);

  const wx = windowOf(spec.x.get, D), wz = windowOf(spec.z.get, D);
  if (wx.wide || wz.wide) {
    P.append('rect').attr('x', xs(wx.lo)).attr('y', zs(wz.hi))
      .attr('width', Math.max(2, xs(wx.hi) - xs(wx.lo))).attr('height', Math.max(2, zs(wz.lo) - zs(wz.hi)))
      .attr('fill', T.accent).attr('fill-opacity', 0.18).attr('stroke', T.accent).attr('stroke-width', 2.2);
  }
  P.append('circle').attr('cx', xs(wx.x0)).attr('cy', zs(wz.x0)).attr('r', 4.2).attr('fill', '#fff').attr('stroke', '#000').attr('stroke-width', 1.4);

  frame(g, xs, zs, W, H, { xlabel: spec.x.label, ylabel: spec.z.label, xlog: spec.x.log, ylog: spec.z.log }, T);

  // Colour bar
  const cb = g.append('g').attr('transform', `translate(${W + 14},0)`);
  const gid = 'cg' + Math.random().toString(36).slice(2, 8);
  const lg = svg.select('defs').append('linearGradient').attr('id', gid).attr('x1', 0).attr('x2', 0).attr('y1', 1).attr('y2', 0);
  d3.range(11).forEach((i) => lg.append('stop').attr('offset', i / 10).attr('stop-color', color(vmin + (vmax - vmin) * i / 10)));
  cb.append('rect').attr('width', 10).attr('height', H).attr('fill', `url(#${gid})`);
  const cbs = d3.scaleLinear().domain([vmin, vmax]).range([H, 0]);
  const cbt = cbs.ticks(5);
  cb.selectAll('line').data(cbt).join('line').attr('x1', 0).attr('x2', 3).attr('y1', cbs).attr('y2', cbs).attr('stroke', T.fg);
  cb.append('rect').attr('width', 10).attr('height', H).attr('fill', 'none').attr('stroke', T.fg).attr('stroke-width', 1);
  cb.selectAll('text').data(cbt).join('text').attr('x', 14).attr('y', (v) => cbs(v) + 4).attr('font-family', FONT).attr('font-size', 12).attr('fill', T.fg)
    .each(function (v) { rich(d3.select(this), spec.y.log ? '10<sup>' + d3.format('~g')(v).replace('-', '−') + '</sup>' : d3.format('~g')(v).replace('-', '−')); });
  rich(cb.append('text').attr('transform', `translate(${66},${H / 2}) rotate(90)`).attr('text-anchor', 'middle').attr('font-family', FONT).attr('font-size', 14).attr('fill', T.fg), spec.y.label);

  hover(svg, g, W, H, m, (px, py) => {
    const x = xs.invert(px), z = zs.invert(py);
    const y = spec.f(D.res.nom, D.q, x, z, G.wv);
    return { x: px, y: py, text: `x = ${fmtVal(x)}   z = ${fmtVal(z)}   y = ${fmtVal(y)}` };
  }, T);
}

// ── Surface: isometric wireframe, drag to rotate ────────────────────────────────────────
function surface(el, spec, D) {
  const T = theme();
  const height = D.height || 280;
  const width = Math.max(260, el.clientWidth || 420);
  d3.select(el).selectAll('*').remove();
  const svg = d3.select(el).append('svg').attr('width', width).attr('height', height).attr('class', 'plot-svg surface');
  const n = 30;
  const G = grid(spec, D, n, n);
  const [vmin, vmax] = extent([G.vals]);
  const color = d3.scaleSequential(d3.interpolateCividis).domain([vmin, vmax]);
  const st = D.view || (D.view = { az: -0.75 });
  const el3 = 0.6155;
  // The projected box spans ±0.661·S vertically; leave room for the title above and axis labels below
  const S = Math.min(width * 0.6, (height - 78) / 1.322), cx = width / 2, cy = 34 + 0.661 * S, Hs = 0.62;
  const hN = (v) => (finite(v) ? (v - vmin) / (vmax - vmin || 1) : 0);
  const prj = (u, v, h) => {
    const X0 = u - 0.5, Y0 = v - 0.5;
    const xr = X0 * Math.cos(st.az) - Y0 * Math.sin(st.az);
    const yr = X0 * Math.sin(st.az) + Y0 * Math.cos(st.az);
    return [cx + xr * S, cy + yr * S * Math.sin(el3) - (h - 0.5) * S * Hs * Math.cos(el3), yr];
  };
  const g = svg.append('g');
  const draw = () => {
    g.selectAll('*').remove();
    // Floor and back walls
    const corners = [[0, 0], [1, 0], [1, 1], [0, 1]];
    const floor = corners.map(([u, v]) => prj(u, v, 0));
    g.append('path').attr('d', 'M' + floor.map((p) => p[0] + ',' + p[1]).join('L') + 'Z').attr('fill', T.grid).attr('fill-opacity', 0.35).attr('stroke', T.muted).attr('stroke-width', 0.8);
    const back = corners.map(([u, v]) => ({ u, v, d: prj(u, v, 0)[2] })).sort((a, b) => a.d - b.d).slice(0, 3);
    for (const c of back) {
      const a = prj(c.u, c.v, 0), b = prj(c.u, c.v, 1);
      g.append('line').attr('x1', a[0]).attr('y1', a[1]).attr('x2', b[0]).attr('y2', b[1]).attr('stroke', T.muted).attr('stroke-width', 0.8).attr('stroke-dasharray', '3 3');
    }
    const quads = [];
    for (let j = 0; j < n - 1; j++) for (let i = 0; i < n - 1; i++) {
      const idx = [[i, j], [i + 1, j], [i + 1, j + 1], [i, j + 1]];
      const vals = idx.map(([a, b]) => G.vals[b * n + a]);
      if (!vals.every(finite)) continue;
      const pts = idx.map(([a, b], k) => prj(a / (n - 1), b / (n - 1), hN(vals[k])));
      quads.push({ pts, depth: d3.mean(pts, (p) => p[2]), val: d3.mean(vals) });
    }
    quads.sort((a, b) => a.depth - b.depth);
    g.selectAll('path.q').data(quads).join('path').attr('class', 'q')
      .attr('d', (d) => 'M' + d.pts.map((p) => p[0].toFixed(1) + ',' + p[1].toFixed(1)).join('L') + 'Z')
      .attr('fill', (d) => color(d.val)).attr('stroke', 'rgba(0,0,0,0.22)').attr('stroke-width', 0.4);

    // Window outline on the surface
    const wx = windowOf(spec.x.get, D), wz = windowOf(spec.z.get, D);
    const ux = (x) => (spec.x.log ? Math.log(x / G.xa) / Math.log(G.xb / G.xa) : (x - G.xa) / (G.xb - G.xa));
    const vz = (z) => (spec.z.log ? Math.log(z / G.za) / Math.log(G.zb / G.za) : (z - G.za) / (G.zb - G.za));
    const valAt = (x, z) => { let y = spec.f(D.res.nom, D.q, x, z, G.wv); if (spec.y.log) y = Math.log10(y); return y; };
    const P3 = (x, z) => prj(ux(x), vz(z), hN(valAt(x, z)));
    if (wx.wide || wz.wide) {
      const ring = [];
      const s = (a, b, k) => a + (b - a) * k / 24;
      for (let k = 0; k <= 24; k++) ring.push(P3(s(wx.lo, wx.hi, k), wz.lo));
      for (let k = 0; k <= 24; k++) ring.push(P3(wx.hi, s(wz.lo, wz.hi, k)));
      for (let k = 0; k <= 24; k++) ring.push(P3(s(wx.hi, wx.lo, k), wz.hi));
      for (let k = 0; k <= 24; k++) ring.push(P3(wx.lo, s(wz.hi, wz.lo, k)));
      g.append('path').attr('d', 'M' + ring.map((p) => p[0] + ',' + p[1]).join('L') + 'Z').attr('fill', T.accent).attr('fill-opacity', 0.25).attr('stroke', T.accent).attr('stroke-width', 2.4);
    }
    const p0 = P3(wx.x0, wz.x0);
    g.append('circle').attr('cx', p0[0]).attr('cy', p0[1]).attr('r', 4).attr('fill', '#fff').attr('stroke', '#000').attr('stroke-width', 1.3);

    // Edge labels on the front edges
    const L = g.append('g').attr('font-family', FONT).attr('fill', T.fg);
    const front = corners.map(([u, v]) => ({ u, v, d: prj(u, v, 0)[2] })).sort((a, b) => b.d - a.d)[0];
    const ex = prj(0.5, front.v, 0), ez = prj(front.u, 0.5, 0);
    rich(L.append('text').attr('x', ex[0]).attr('y', ex[1] + 24).attr('text-anchor', 'middle').attr('font-size', 14), spec.x.label);
    rich(L.append('text').attr('x', ez[0]).attr('y', ez[1] + 24).attr('text-anchor', 'middle').attr('font-size', 14), spec.z.label);
    // Ends meeting at the front corner are stacked so they do not collide
      const endLabel = (u, v, txt, dy) => { const p = prj(u, v, 0); L.append('text').attr('x', p[0]).attr('y', p[1] + (u === front.u && v === front.v ? dy : 12)).attr('text-anchor', 'middle').attr('font-size', 12).attr('fill', T.muted).text(txt); };
    endLabel(0, front.v, fmtVal(G.xa), 12); endLabel(1, front.v, fmtVal(G.xb), 12);
    endLabel(front.u, 0, fmtVal(G.za), 23); endLabel(front.u, 1, fmtVal(G.zb), 23);
    rich(L.append('text').attr('x', 10).attr('y', 18).attr('font-size', 14), spec.y.label);
    L.append('text').attr('x', 10).attr('y', 32).attr('font-size', 12).attr('fill', T.muted)
      .text(`${spec.y.log ? 'log₁₀ ' : ''}${fmtVal(vmin)} … ${fmtVal(vmax)}  ·  drag to rotate`);
  };
  draw();
  svg.call(d3.drag().on('drag', (ev) => { st.az += ev.dx * 0.012; draw(); }));
}

// ── Spans: horizontal frequency map ─────────────────────────────────────────────────────
function spans(el, spec, D) {
  const T = theme();
  const rows = spec.rows(D.res, D.q);
  const m = { l: 120, r: 16, t: 10, b: 54 };
  const { g, W, H, clip } = svgFor(el, rows.length * 27 + m.t + m.b + 8, m);
  const xd = spec.domain ? spec.domain(D.res, D.q) : pad(extent([rows.flatMap((r) => [r.tlo ?? r.lo, r.thi ?? r.hi])]), false, 0.05);
  const xs = d3.scaleLinear().domain(xd).range([0, W]);
  const ys = d3.scaleBand().domain(rows.map((_, i) => i)).range([0, H]).padding(0.2);
  const P = g.append('g').attr('clip-path', clip);
  for (const mk of spec.vmarks ? spec.vmarks(D.res, D.q) : []) {
    P.append('line').attr('x1', xs(mk.x)).attr('x2', xs(mk.x)).attr('y1', 0).attr('y2', H).attr('stroke', mk.color || T.muted).attr('stroke-dasharray', '4 3');
    rich(P.append('text').attr('x', xs(mk.x) - 4).attr('y', H - 6).attr('text-anchor', 'end').attr('font-family', FONT).attr('font-size', 13).attr('fill', mk.color || T.muted), mk.label);
  }
  rows.forEach((r, i) => {
    const y = ys(i) + ys.bandwidth() / 2;
    if (r.tlo != null) {
      P.append('line').attr('x1', xs(r.tlo)).attr('x2', xs(r.thi)).attr('y1', y).attr('y2', y).attr('stroke', T.fg).attr('stroke-width', 1.2);
      for (const v of [r.tlo, r.thi]) P.append('line').attr('x1', xs(v)).attr('x2', xs(v)).attr('y1', y - 4).attr('y2', y + 4).attr('stroke', T.fg).attr('stroke-width', 1.2);
    }
    const w = Math.max(3, xs(r.hi) - xs(r.lo));
    P.append('rect').attr('x', xs(r.lo) - (w === 3 ? 1.5 : 0)).attr('width', w).attr('y', y - 5).attr('height', 10).attr('fill', r.color).attr('opacity', 0.85);
    P.append('circle').attr('cx', xs(r.nom)).attr('cy', y).attr('r', 3.6).attr('fill', T.bg).attr('stroke', T.fg).attr('stroke-width', 1.3);
    rich(g.append('text').attr('x', -8).attr('y', y + 4).attr('text-anchor', 'end').attr('font-family', FONT).attr('font-size', 14).attr('fill', T.fg), r.label);
  });
  frame(g, xs, d3.scaleLinear().domain([0, 1]).range([H, 0]), W, H, { xlabel: spec.xlabel, noY: true }, T);
}

// ── IQ: hanger resonance circle with the two dressed states ─────────────────────────────
function iq(el, spec, D) {
  const T = theme();
  const m = { l: 72, r: 16, t: 12, b: 58 };
  const height = D.height || 260;
  const { g, W, H, clip } = svgFor(el, height, m);
  const circle = (c) => {
    const a = c['Ql_' + D.q] / c['Qca_' + D.q];
    return d3.range(-89.5, 90, 1).map((deg) => {
      const u = Math.tan(deg * Math.PI / 180);
      const den = 1 + u * u;
      return [1 - a / den, a * u / den];
    });
  };
  const c0 = D.res.nom;
  const a0 = c0['Ql_' + D.q] / c0['Qca_' + D.q];
  let amax = a0;
  for (const c of D.res.ctx) amax = Math.max(amax, c['Ql_' + D.q] / c['Qca_' + D.q]);
  // Equal aspect
  const re = [1 - amax - 0.08, 1.06], imH = amax / 2 + 0.08;
  const k = Math.min(W / (re[1] - re[0]), H / (2 * imH));
  const cxp = W / 2 - k * (re[0] + re[1]) / 2;
  const xs = d3.scaleLinear().domain([(0 - cxp) / k, (W - cxp) / k]).range([0, W]);
  const ys = d3.scaleLinear().domain([-H / 2 / k, H / 2 / k]).range([H, 0]);
  const P = g.append('g').attr('clip-path', clip);
  const line = d3.line().x((d) => xs(d[0])).y((d) => ys(d[1]));
  for (const c of D.res.ctx.slice(1)) P.append('path').attr('d', line(circle(c))).attr('fill', 'none').attr('stroke', T.band).attr('stroke-opacity', 0.25).attr('stroke-width', 1);
  P.append('path').attr('d', line(circle(c0))).attr('fill', 'none').attr('stroke', T.fg).attr('stroke-width', 1.6);
  const x = c0['xa_' + D.q];
  const st = (sgn) => { const den = 1 + x * x; return [1 - a0 / den, sgn * a0 * x / den]; };
  const s0 = st(1), s1 = st(-1);
  P.append('line').attr('x1', xs(s0[0])).attr('y1', ys(s0[1])).attr('x2', xs(s1[0])).attr('y2', ys(s1[1])).attr('stroke', T.accent).attr('stroke-width', 2.2);
  [[s0, COLORS[0], '|0⟩'], [s1, COLORS[2], '|1⟩']].forEach(([p, col, lab]) => {
    P.append('circle').attr('cx', xs(p[0])).attr('cy', ys(p[1])).attr('r', 5).attr('fill', col);
    P.append('text').attr('x', xs(p[0]) + 9).attr('y', ys(p[1]) + 4).attr('font-family', FONT).attr('font-size', 15).attr('fill', col).text(lab);
  });
  P.append('text').attr('x', 8).attr('y', 16).attr('font-family', FONT).attr('font-size', 13).attr('fill', T.fg)
    .text(`2χ/κ = ${fmtVal(x)}   separation = ${fmtVal(2 * x / (1 + x * x))} · Q_l/Q_c`);
  frame(g, xs, ys, W, H, { xlabel: 'Re <i>S</i><sub>21</sub>', ylabel: 'Im <i>S</i><sub>21</sub>' }, T);
}

function draw(el, spec, D, onError) {
  try {
    if (spec.type === 'spans') return spans(el, spec, D);
    if (spec.type === 'iq') return iq(el, spec, D);
    if (D.mode === 'map' && spec.z) return map(el, spec, D);
    if (D.mode === 'surface' && spec.z) return surface(el, spec, D);
    return curve(el, spec, D);
  } catch (err) {
    d3.select(el).selectAll('*').remove();
    d3.select(el).append('div').attr('class', 'plot-error').text('Plot failed: ' + err.message);
    if (onError) onError(`Plot “${String(spec.title).replace(/<[^>]+>/g, "")}”: ${err.message}`);
  }
}
export {  draw, COLORS  };

