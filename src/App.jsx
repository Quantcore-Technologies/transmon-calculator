import { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Button } from '@/components/ui/button';
import { Header } from '@/components/Header';
import { Sidebar } from '@/components/Sidebar';
import { StatusBar } from '@/components/StatusBar';
import { StepCard } from '@/components/StepCard';
import { BringUp } from '@/components/BringUp';
import { Rich, stripTags } from '@/components/Rich';
import { pad2 } from '@/components/StepCard';
import { INPUTS, INPUT, checks, defaults, dependencies, run } from '@/lib/model';
import { CARDS, SECTIONS } from '@/lib/cards';
import { fmt, resolveKey } from '@/lib/format';

const STORE = 'tde-state-v2';

function load() {
  try {
    const o = JSON.parse(localStorage.getItem(STORE) || '{}');
    const inputs = defaults();
    for (const id in o.inputs || {}) {
      const s = o.inputs[id], d = INPUT[id];
      if (!d || !s) continue;
      if (d.type === 'select') { if (d.options.some(([v]) => v === s.nom)) inputs[id] = { nom: s.nom }; continue; }
      if ([s.nom, s.lo, s.hi].every(Number.isFinite) && s.lo <= s.nom && s.nom <= s.hi) inputs[id] = { nom: s.nom, lo: s.lo, hi: s.hi };
    }
    return { inputs, q: o.q === '1' ? '1' : '2', ui: o.ui && typeof o.ui === 'object' ? o.ui : {}, checked: o.checked || {} };
  } catch (e) {
    return { inputs: defaults(), q: '2', ui: {}, checked: {} };
  }
}

const SCATTER = INPUTS.filter((d) => d.kind === 'scatter');
// Stable identity for a problem, ignoring the numbers in its message
const problemKey = (p) => `${p.sev}|${p.step}|${p.q}|${p.msg.replace(/[−\-]?[\d.,]+/g, '#')}`;

export default function App() {
  const initial = useMemo(load, []);
  const [inputs, setInputs] = useState(initial.inputs);
  const [q, setQ] = useState(initial.q);
  const [ui, setUiState] = useState(initial.ui);
  const [checked, setCheckedState] = useState(initial.checked);
  const [theme, setTheme] = useState(() => (document.documentElement.classList.contains('dark') ? 'dark' : 'light'));
  const [panel, setPanel] = useState(null);
  const [drawer, setDrawer] = useState(false);
  const [logs, setLogs] = useState([]);
  const logId = useRef(0);

  const deferred = useDeferredValue(inputs);
  const res = useMemo(() => run(deferred, q), [deferred, q]);
  const problems = useMemo(() => checks(res), [res]);

  // Click a value to see the inputs it depends on (re-traced as inputs or the qubit change)
  const [trace, setTrace] = useState(null);
  const traced = useMemo(
    () => (trace ? new Set(dependencies(deferred, resolveKey(trace.key, q), q)) : EMPTY_SET),
    [trace, deferred, q],
  );
  const onTrace = useCallback((key, label) => setTrace((t) => (t && t.key === key ? null : { key, label })), []);
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') setTrace(null); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
  const goToField = (id) => {
    const el = document.getElementById(`field-${id}`);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  // The active qubit's f_max box shows the value its junction gives; the other qubit's R_n shows
  // the junction solved for its planned frequency. Writing both back keeps a qubit switch seamless.
  useEffect(() => {
    if (deferred !== inputs) return;
    const o = q === '2' ? '1' : '2';
    const fA = res.nom['fT_' + q] / 1e9, rO = res.nom['Rn_' + o] / 1e3;
    setInputs((prev) => {
      let next = prev;
      const f = prev['f' + q];
      if (Number.isFinite(fA) && Math.abs(f.nom - fA) > 1e-9 * Math.abs(fA)) {
        const d = fA - f.nom;
        next = { ...next, ['f' + q]: { nom: fA, lo: f.lo + d, hi: f.hi + d } };
      }
      const rn = prev['Rn' + o];
      if (Number.isFinite(rO) && Math.abs(rn.nom - rO) > 1e-9 * Math.abs(rO)) next = { ...next, ['Rn' + o]: { nom: rO, lo: rO, hi: rO } };
      return next;
    });
  }, [res, q, deferred, inputs]);

  const log = useCallback((level, msg) => {
    setLogs((l) => [...l.slice(-399), { id: ++logId.current, t: Date.now(), level, msg }]);
  }, []);

  // Persist
  useEffect(() => {
    try {
      const flat = Object.fromEntries(Object.entries(ui).map(([k, u]) => [k, { ...u, flipped: false }]));
      localStorage.setItem(STORE, JSON.stringify({ inputs, q, theme, ui: flat, checked }));
    } catch (e) { /* storage unavailable */ }
  }, [inputs, q, theme, ui, checked]);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);

  // Log new and resolved problems after each committed change
  const seen = useRef(null);
  const pending = useRef(true);
  useEffect(() => {
    if (!pending.current || deferred !== inputs) return;
    pending.current = false;
    const now = new Map(problems.map((p) => [problemKey(p), p]));
    if (seen.current === null) {
      log('info', `Model ready: ${Object.keys(res.nom).length} nodes, ${res.evals} evaluations over ${res.ranged.length} windows in ${res.ms.toFixed(1)} ms.`);
      problems.forEach((p) => log(p.sev, p.msg));
    } else {
      for (const [k, p] of now) if (!seen.current.has(k)) log(p.sev, p.msg);
      for (const [k, p] of seen.current) if (!now.has(k)) log('info', `Resolved: ${p.msg}`);
    }
    seen.current = now;
  }, [problems, deferred, inputs, res, log]);

  const onChange = useCallback((id, patch) => {
    setInputs((prev) => ({ ...prev, [id]: { ...prev[id], ...patch } }));
  }, []);

  const inputsRef = useRef(inputs);
  inputsRef.current = inputs;
  const onCommit = useCallback((id) => {
    pending.current = true;
    // Read after React applies the pending patch
    setTimeout(() => {
      const d = INPUT[id], s = inputsRef.current[id];
      const label = stripTags(d.label);
      if (d.type === 'select') { log('debug', `Step ${d.step} · ${label} → ${stripTags(d.options.find(([v]) => v === s.nom)?.[1] || s.nom)}`); return; }
      const u = d.unit ? ` ${d.unit}` : '';
      const w = s.hi > s.nom || s.lo < s.nom ? ` [${fmt(s.lo, 4, s.nom)}, ${fmt(s.hi, 4, s.nom)}]` : '';
      log('debug', `Step ${d.step} · ${label} → ${fmt(s.nom, 4)}${u}${w}`);
      if (!(s.nom >= d.min && s.nom <= d.max)) log('warn', `${label} outside its allowed range ${d.min}–${d.max}${u}.`);
    }, 0);
  }, [log]);

  const setUi = useCallback((id, fn) => setUiState((u) => ({ ...u, [id]: fn(u[id] || {}) })), []);
  const setChecked = useCallback((i, v) => setCheckedState((c) => ({ ...c, [i]: v })), []);

  const sigma = useMemo(() => {
    for (const k of [0, 1, 2, 3]) {
      if (SCATTER.every((d) => {
        const s = inputs[d.id], sg = inputs[d.sigma].nom * k;
        return Math.abs(s.lo - (s.nom - sg)) < 1e-9 && Math.abs(s.hi - (s.nom + sg)) < 1e-9;
      })) return String(k);
    }
    return '';
  }, [inputs]);

  const setSigma = useCallback((k) => {
    setInputs((prev) => {
      const next = { ...prev };
      for (const d of SCATTER) {
        const s = prev[d.id], sg = prev[d.sigma].nom * k;
        next[d.id] = { ...s, lo: s.nom - sg, hi: s.nom + sg };
      }
      return next;
    });
    pending.current = true;
    log('debug', k ? `Fab-scatter windows set to ±${k}σ.` : 'Fab-scatter windows off.');
  }, [log]);

  const onNavigate = useCallback((step) => {
    const el = document.getElementById(`step-${step}`);
    if (!el) return;
    setDrawer(false);
    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    el.classList.remove('flash');
    void el.offsetWidth;
    el.classList.add('flash');
  }, []);

  const onPlotError = useCallback((msg) => log('error', msg), [log]);

  const onExport = () => {
    const results = {};
    for (const k in res.nom) if (typeof res.nom[k] === 'number') results[k] = { nom: res.nom[k], lo: res.R[k].lo, hi: res.R[k].hi };
    const blob = new Blob([JSON.stringify({ generated: new Date().toISOString(), units: 'inputs in display units; results in SI', inputs, results, problems }, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'transmon-design.json';
    a.click();
    URL.revokeObjectURL(a.href);
    log('info', 'Exported inputs and results to transmon-design.json.');
  };

  const onReset = () => {
    if (!window.confirm('Reset every input to the design-note values?')) return;
    pending.current = true;
    setInputs(defaults());
    log('info', 'Inputs reset to the design-note values.');
  };

  const stepProblems = useMemo(() => {
    const m = {};
    for (const p of problems) (m[p.step] ||= []).push(p);
    return m;
  }, [problems]);

  return (
    <TooltipProvider delayDuration={300}>
      <div className="min-h-screen pb-7">
        <Header res={res} q={q} setQ={setQ} sigma={sigma} setSigma={setSigma} theme={theme}
          toggleTheme={() => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))}
          onExport={onExport} onReset={onReset} onToggleSidebar={() => setDrawer((d) => !d)} />

        <div className="lg:grid lg:grid-cols-[290px_minmax(0,1fr)] 2xl:grid-cols-[320px_minmax(0,1fr)]">
          <aside className="sticky top-14 hidden h-[calc(100vh-3.5rem-1.75rem)] border-r bg-card lg:block">
            <Sidebar res={res} q={q} problems={problems} onNavigate={onNavigate} />
          </aside>
          {drawer ? (
            <div className="fixed inset-0 top-14 z-30 lg:hidden">
              <div className="absolute inset-0 bg-background/70 backdrop-blur-sm" onClick={() => setDrawer(false)} />
              <aside className="absolute bottom-7 left-0 top-0 w-[min(340px,88vw)] border-r bg-card shadow-xl">
                <Button variant="ghost" size="icon-sm" className="absolute right-2 top-2 z-10" aria-label="Close summary" onClick={() => setDrawer(false)}><X /></Button>
                <Sidebar res={res} q={q} problems={problems} onNavigate={onNavigate} />
              </aside>
            </div>
          ) : null}

          <main className="min-w-0 px-4 pb-20 pt-8 sm:px-6 lg:px-7">
            <section>
              <div className="text-[11px] font-semibold uppercase tracking-[0.1em] text-primary">Lumped oscillator model · steps 0–10</div>
              <h1 className="mt-3 text-[30px] font-semibold leading-[1.1] tracking-[-0.025em] sm:text-[38px]">
                LOM-based transmon parameter estimator
              </h1>
              <p className="mt-4 text-[15px] leading-relaxed text-muted-foreground">
                A starting point for a flux-tunable transmon design: qubit, readout resonator and tunable coupler parameters from capacitances, lengths and junction energies. Each card computes one step from values fixed in earlier steps. Type a nominal value, then drag its window to spread it:
                every result shows its <span className="font-medium text-upper">upper</span> and <span className="font-medium text-lower">lower</span> bound,
                and plots shade the region the windows reach. Flip a card (Σ) for its formulas with the current numbers substituted.
              </p>
              <ul className="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-[12px] text-muted-foreground">
                <li className="inline-flex items-center gap-1.5"><i className="inline-block size-2 bg-litho" />Capacitance or length, ±2–3 %</li>
                <li className="inline-flex items-center gap-1.5"><i className="inline-block size-2 bg-junction" /><span>Junction <i>E</i><sub>J</sub>, ±5 %</span></li>
                <li className="inline-flex items-center gap-1.5"><i className="inline-block size-2 bg-muted-foreground/60" />Derived</li>
                <li className="inline-flex items-center gap-1.5"><i className="inline-block h-1.5 w-4 rounded-full bg-primary" />Window</li>
                <li className="inline-flex items-center gap-1.5"><i className="inline-block size-2 bg-upper" />Upper bound</li>
                <li className="inline-flex items-center gap-1.5"><i className="inline-block size-2 bg-lower" />Lower bound</li>
                <li className="inline-flex items-center gap-1.5"><span className="tnum font-medium text-foreground">±</span>1σ fab uncertainty (process σ in quadrature); bounds are the worst case over your windows</li>
              </ul>
            </section>

            {SECTIONS.map((sec) => (
              <section key={sec.id} className="mt-14" aria-labelledby={`sec-${sec.id}`}>
                <div className="mb-5 grid grid-cols-[auto_minmax(0,1fr)] items-end gap-x-5 border-t-2 border-foreground pt-3">
                  <div className="tnum text-[44px] font-semibold leading-[0.8] tracking-tight">{sec.no}</div>
                  <div className="min-w-0">
                    <h2 id={`sec-${sec.id}`} className="text-xl font-semibold leading-tight tracking-tight">{sec.title}</h2>
                    <p className="text-[13px] text-muted-foreground">{sec.blurb}</p>
                  </div>
                </div>
                <div className="grid items-start gap-4 [grid-template-columns:repeat(auto-fill,minmax(min(100%,350px),1fr))]">
                  {CARDS.filter((c) => c.section === sec.id).map((spec) => (
                    <StepCard key={spec.id} spec={spec} res={res} q={q} inputs={inputs}
                      problems={stepProblems[spec.step] || EMPTY} ui={ui[spec.id] || EMPTY_UI} setUi={setUi} theme={theme}
                      onChange={onChange} onCommit={onCommit} onNavigate={onNavigate} onPlotError={onPlotError}
                      trace={trace} traced={traced} onTrace={onTrace} />
                  ))}
                </div>
              </section>
            ))}

            <section className="mt-14" aria-labelledby="sec-after">
              <div className="mb-5 grid grid-cols-[auto_minmax(0,1fr)] items-end gap-x-5 border-t-2 border-foreground pt-3">
                <div className="tnum text-[44px] font-semibold leading-[0.8] tracking-tight">D</div>
                <div>
                  <h2 id="sec-after" className="text-xl font-semibold leading-tight tracking-tight">After fab</h2>
                  <p className="text-[13px] text-muted-foreground">Bring-up and calibration, in the order the quantities depend on each other.</p>
                </div>
              </div>
              <BringUp res={res} q={q} checked={checked} setChecked={setChecked} onNavigate={onNavigate} />
            </section>
          </main>
        </div>

        {trace ? (
          <div className="fixed inset-x-0 bottom-9 z-30 flex justify-center px-4" role="status">
            <div className="flex max-w-3xl flex-wrap items-center gap-1.5 rounded-lg border border-primary/40 bg-card/95 px-3 py-2 text-[12.5px] shadow-lg backdrop-blur">
              <Rich html={trace.label} className="font-medium" />
              <span className="text-muted-foreground">{traced.size ? 'depends on' : 'depends on no inputs here'}</span>
              {[...traced].map((id) => (
                <button key={id} type="button" onClick={() => goToField(id)}
                  className="inline-flex items-center gap-1 rounded border border-primary/40 bg-primary/10 px-1.5 py-0.5 hover:bg-primary/20">
                  <Rich html={INPUT[id].label} />
                  <span className="tnum text-muted-foreground">· {pad2(INPUT[id].step)}</span>
                </button>
              ))}
              <Button variant="ghost" size="icon-sm" className="ml-1" aria-label="Clear trace" onClick={() => setTrace(null)}><X /></Button>
            </div>
          </div>
        ) : null}

        <StatusBar problems={problems} logs={logs} res={res} q={q} panel={panel} setPanel={setPanel}
          onNavigate={(s) => { setPanel(null); onNavigate(s); }} onClearLog={() => setLogs([])} />
      </div>
    </TooltipProvider>
  );
}

const EMPTY = [];
const EMPTY_SET = new Set();
const EMPTY_UI = {};
