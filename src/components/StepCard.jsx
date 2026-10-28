import { memo, useState } from 'react';
import { ArrowDown, ArrowUp, ChartSpline, CircleAlert, RotateCcw, Sigma, TriangleAlert } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Field } from '@/components/Field';
import { Formula } from '@/components/Formula';
import { Plot } from '@/components/Plot';
import { Rich, stripTags } from '@/components/Rich';
import { INPUT } from '@/lib/model';
import { fmt, relSpread, resolveKey, sigmaText, triple } from '@/lib/format';
import { cn } from '@/lib/utils';

const TAGS = {
  litho: { label: 'Capacitance / length', cls: 'bg-litho' },
  junction: { label: 'Junction E<sub>J</sub>', cls: 'bg-junction' },
  derived: { label: 'Derived', cls: 'bg-muted-foreground/60' },
  fixed: { label: 'Fixed constraints', cls: 'bg-foreground' },
};

export const pad2 = (n) => String(n).padStart(2, '0');

function IconAction({ label, pressed, onClick, children }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button variant="ghost" size="icon-sm" aria-label={label} aria-pressed={pressed} onClick={onClick}
          className={cn(pressed && 'bg-primary/10 text-primary hover:bg-primary/15 hover:text-primary')}>
          {children}
        </Button>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}

function StatusChip({ problems }) {
  const err = problems.filter((p) => p.sev === 'error').length;
  const warn = problems.filter((p) => p.sev === 'warn').length;
  if (!err && !warn) return null;
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className={cn('inline-flex items-center gap-1 text-xs font-medium', err ? 'text-destructive' : 'text-warn')}>
          {err ? <CircleAlert className="size-3.5" /> : <TriangleAlert className="size-3.5" />}
          {err ? `${err} error${err > 1 ? 's' : ''}` : `${warn} warning${warn > 1 ? 's' : ''}`}
        </span>
      </TooltipTrigger>
      <TooltipContent className="max-w-sm">
        <ul className="grid gap-1">{problems.filter((p) => p.sev !== 'info').map((p, i) => <li key={i}>{p.msg}</li>)}</ul>
      </TooltipContent>
    </Tooltip>
  );
}

function CardHead({ spec, q, problems, children }) {
  const tag = TAGS[spec.tag];
  const perQ = spec.perQubit || [spec.primary, ...(spec.outputs || [])].some((o) => o.key.endsWith('_Q'));
  return (
    <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] gap-x-3 px-4 pb-2.5 pt-3.5">
      <div className="tnum text-[28px] font-semibold leading-none tracking-tight text-muted-foreground/70">{pad2(spec.step)}</div>
      <div className="min-w-0">
        <h3 className="text-base font-semibold leading-tight tracking-tight">{spec.title}</h3>
        <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1">
          <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
            <i className={cn('inline-block size-2', tag.cls)} /><Rich html={tag.label} />
          </span>
          {perQ ? <Badge variant="outline" className="h-5 px-1.5 py-0 text-[11.5px]">Q{q}</Badge> : null}
          <StatusChip problems={problems} />
        </div>
      </div>
      <div className="flex items-start gap-0.5">{children}</div>
    </div>
  );
}

// Keyboard- and mouse-activatable wrapper for a value that can be traced back to its inputs
function traceProps(key, label, trace, onTrace) {
  const on = trace?.key === key;
  return {
    role: 'button',
    tabIndex: 0,
    'aria-pressed': on,
    title: 'Show the inputs behind this value',
    onClick: () => onTrace(key, label),
    onKeyDown: (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onTrace(key, label); } },
    className: cn('cursor-pointer transition-colors hover:bg-accent/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring',
      on && 'bg-primary/[0.07] shadow-[inset_3px_0_0_hsl(var(--primary))] hover:bg-primary/10'),
  };
}

function Primary({ spec, res, q, trace, onTrace }) {
  const p = spec.primary;
  const t = triple(res, resolveKey(p.key, q), p.conv, p.unit);
  const st = sigmaText(t);
  const sig = p.sig || 4;
  const tp = traceProps(p.key, p.label, trace, onTrace);
  return (
    <div {...tp} className={cn('px-4 pb-4 pt-1', tp.className)}>
      <Rich html={p.label} className="block text-[13.5px] font-medium text-muted-foreground" />
      <div className="mt-2 flex items-baseline gap-2">
        <span className={cn('tnum text-[48px] font-medium leading-[0.95] tracking-[-0.04em]', !isFinite(t.nom) && 'text-destructive')}>
          {fmt(t.nom, sig)}
        </span>
        {t.unit ? <span className="text-lg text-muted-foreground">{t.unit}</span> : null}
      </div>
      <div className="mt-2 flex min-h-5 flex-wrap items-center gap-x-4 gap-y-1 text-[15px]">
        {t.wide ? (
          <>
            <span className="tnum inline-flex items-center gap-1 font-medium text-upper"><ArrowUp className="size-3.5" />{fmt(t.hi, sig, t.nom)}</span>
            <span className="tnum inline-flex items-center gap-1 font-medium text-lower"><ArrowDown className="size-3.5" />{fmt(t.lo, sig, t.nom)}</span>
            <span className="tnum text-[13px] text-muted-foreground">{relSpread(t)}</span>
          </>
        ) : (
          <span className="text-[13px] text-muted-foreground">Single value · widen an input window to spread it</span>
        )}
      </div>
      {st ? (
        <div className="tnum mt-1 text-[12.5px] text-muted-foreground" title="1σ fab uncertainty from the process σ's (linear propagation, summed in quadrature)">
          1σ fab {st}
        </div>
      ) : null}
    </div>
  );
}

function Outputs({ spec, res, q, trace, onTrace }) {
  const n = spec.outputs.length;
  return (
    <dl className="grid grid-cols-2">
      {spec.outputs.map((o, i) => {
        const t = triple(res, resolveKey(o.key, q), o.conv, o.unit);
        const sig = o.sig || 4;
        const st = o.noSigma ? '' : sigmaText(t);
        const lastAlone = i === n - 1 && i % 2 === 0;
        const tp = traceProps(o.key, o.label, trace, onTrace);
        return (
          <div key={o.key} {...tp} className={cn('min-w-0 border-b px-4 py-2.5', i % 2 === 0 && !lastAlone && 'border-r', lastAlone && 'col-span-2', tp.className)}>
            <dt className="text-[12.5px] leading-snug text-muted-foreground" title={stripTags(o.label)}><Rich html={o.label} /></dt>
            <dd className="mt-0.5">
              <span className={cn('tnum text-[19px] font-medium leading-tight tracking-tight', !isFinite(t.nom) && 'text-destructive')}>{fmt(t.nom, sig)}</span>
              {t.unit ? <span className="ml-1 text-[13px] text-muted-foreground">{t.unit}</span> : null}
              {st ? <div className="tnum text-[11.5px] leading-tight text-muted-foreground">{st}</div> : null}
              {t.wide ? (
                <div className="tnum text-[12px] leading-tight">
                  <span className="text-lower">{fmt(t.lo, sig, t.nom)}</span>
                  <span className="text-muted-foreground"> – </span>
                  <span className="text-upper">{fmt(t.hi, sig, t.nom)}</span>
                </div>
              ) : null}
            </dd>
          </div>
        );
      })}
    </dl>
  );
}

function Inherited({ spec, res, q, onNavigate }) {
  if (!spec.uses?.length) return null;
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="mr-0.5 text-xs text-muted-foreground">From</span>
      {spec.uses.map((u) => {
        const t = triple(res, resolveKey(u.key, q), u.conv, u.unit);
        return (
          <button key={u.key} type="button" onClick={() => onNavigate(u.step)}
            className="inline-flex items-center gap-1.5 rounded border bg-card px-1.5 py-0.5 text-[12px] transition-colors hover:border-primary/60 hover:text-primary">
            <Rich html={u.label} />
            <span className="tnum font-medium">{fmt(t.nom, 3)}</span>
            {t.unit ? <span className="text-muted-foreground">{t.unit}</span> : null}
            <span className="tnum text-muted-foreground/70">· {pad2(u.step)}</span>
          </button>
        );
      })}
    </div>
  );
}

function Inputs({ ids, inputs, onChange, onCommit, className, compact, traced, q }) {
  return (
    <div className={cn('grid grid-cols-2 gap-x-3 gap-y-3', className)}>
      {ids.map((id) => {
        const def = INPUT[id];
        if (def.showIf && !def.showIf(inputs, q)) return null;
        return <Field key={id} def={def} s={inputs[id]} onChange={onChange} onCommit={onCommit} compact={compact} hit={traced?.has(id)}
          locked={def.lockActive && def.qubit === q} />;
      })}
    </div>
  );
}

function PlotBlock({ spec, res, q, ui, setUi, theme, onPlotError, open }) {
  const tab = Math.min(ui.tab ?? 0, spec.plots.length - 1);
  const ps = spec.plots[tab];
  const mode = ps.z ? ui.mode?.[tab] || 'curve' : 'curve';
  const slice = ui.slice?.[tab] || 'nom';
  const set = (k, v) => setUi(spec.id, (u) => ({ ...u, [k]: { ...(u[k] || {}), [tab]: v } }));
  return (
    <div className={cn('collapse-rows', !open && 'is-closed')} aria-hidden={!open}>
    <div>
    <div className="px-4 pb-3 pt-3">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        {spec.plots.length > 1 ? (
          <Tabs value={String(tab)} onValueChange={(v) => setUi(spec.id, (u) => ({ ...u, tab: Number(v) }))}>
            <TabsList>
              {spec.plots.map((p, i) => <TabsTrigger key={i} value={String(i)}><Rich html={p.title} /></TabsTrigger>)}
            </TabsList>
          </Tabs>
        ) : (
          <Rich html={ps.title} className="text-[13px] font-medium text-muted-foreground" />
        )}
        <div className="flex flex-wrap items-center gap-2">
          {ps.w && mode !== 'curve' ? (
            <ToggleGroup type="single" value={slice} onValueChange={(v) => set('slice', v)} aria-label="Slice of the third variable">
              <span className="px-1.5 text-xs text-muted-foreground"><Rich html={ps.w.label} /> slice</span>
              <ToggleGroupItem value="lo" className="data-[state=on]:text-lower">lower</ToggleGroupItem>
              <ToggleGroupItem value="nom">nom</ToggleGroupItem>
              <ToggleGroupItem value="hi" className="data-[state=on]:text-upper">upper</ToggleGroupItem>
            </ToggleGroup>
          ) : null}
          {ps.z ? (
            <ToggleGroup type="single" value={mode} onValueChange={(v) => set('mode', v)} aria-label="Plot view">
              <ToggleGroupItem value="curve">Curve</ToggleGroupItem>
              <ToggleGroupItem value="map">Map</ToggleGroupItem>
              <ToggleGroupItem value="surface">3D</ToggleGroupItem>
            </ToggleGroup>
          ) : null}
        </div>
      </div>
      <Plot spec={ps} res={res} q={q} mode={mode} slice={slice} theme={theme} active={open}
        aspect={ps.type === 'spans' ? null : mode === 'surface' ? 0.85 : 0.75} onError={onPlotError} />
      {ps.type !== 'spans' && ps.type !== 'iq' && mode === 'curve' ? (
        <div className="mt-1.5 flex flex-wrap gap-x-3.5 gap-y-1 text-[12px] text-muted-foreground">
          <span className="inline-flex items-center gap-1.5"><i className="inline-block h-[2px] w-4 bg-litho" />nominal</span>
          <span className="inline-flex items-center gap-1.5"><i className="inline-block h-1.5 w-4 rounded-full bg-primary" />input window</span>
          <span className="inline-flex items-center gap-1.5"><i className="inline-block h-2.5 w-4 bg-litho opacity-20" />other windows</span>
          <span className="inline-flex items-center gap-1.5"><i className="inline-block w-4 border-t border-dashed border-upper" />max</span>
          <span className="inline-flex items-center gap-1.5"><i className="inline-block w-4 border-t border-dashed border-lower" />min</span>
        </div>
      ) : null}
    </div>
    </div>
    </div>
  );
}

const splitTex = (tex) => tex.split(/,\s*\\q?quad\s*/).filter(Boolean);

function Back({ spec, res, q, onFlip }) {
  return (
    <Card className="flex flex-1 flex-col overflow-hidden">
      <div className="flex items-start justify-between gap-4 px-4 pb-3 pt-3.5">
        <div>
          <div className="text-xs font-medium uppercase tracking-[0.06em] text-muted-foreground">Step {pad2(spec.step)} · formulas</div>
          <h3 className="mt-1 text-base font-semibold tracking-tight">{spec.title}</h3>
        </div>
        <IconAction label="Back to result" onClick={onFlip}><RotateCcw /></IconAction>
      </div>
      <div className="grid gap-2 px-4">
        {spec.formulas.map((f, i) => (
          <div key={i} className="border-l-2 border-foreground/80 pl-3">{splitTex(f).map((p, j) => <Formula key={j} tex={p} />)}</div>
        ))}
      </div>
      {spec.subst ? (
        <div className="mx-4 mt-4 rounded-md border border-primary/30 bg-primary/5 px-3 py-2">
          <div className="text-xs font-medium uppercase tracking-[0.06em] text-primary">With current values · Q{q}</div>
          {splitTex(spec.subst(res.nom, q)).map((p, j) => <Formula key={j} tex={p} />)}
        </div>
      ) : null}
      <Rich as="p" html={spec.notes} className="px-4 pb-4 pt-4 text-[14px] leading-relaxed text-muted-foreground" />
    </Card>
  );
}

function StepCardImpl({ spec, res, q, inputs, problems, ui, setUi, theme, onChange, onCommit, onNavigate, onPlotError, trace, traced, onTrace }) {
  const flipped = !!ui.flipped;
  // The formula side is rendered on first flip only; KaTeX for every card at load is costly
  const [backReady, setBackReady] = useState(flipped);
  if (flipped && !backReady) setBackReady(true);
  const plotOn = ui.plot !== false && !!spec.plots?.length;
  const tr = { trace, onTrace };
  const toggleFlip = () => setUi(spec.id, (u) => ({ ...u, flipped: !u.flipped }));
  const actions = (
    <>
      {spec.plots?.length ? (
        <IconAction label={plotOn ? 'Hide plot' : 'Show plot'} pressed={!!plotOn} onClick={() => setUi(spec.id, (u) => ({ ...u, plot: u.plot === false }))}>
          <ChartSpline />
        </IconAction>
      ) : null}
      <IconAction label="Flip to formula" onClick={toggleFlip}><Sigma /></IconAction>
    </>
  );

  const front = spec.wide ? (
    <Card className="flex flex-1 flex-col overflow-hidden">
      <CardHead spec={spec} q={q} problems={problems}>{actions}</CardHead>
      <Rich as="p" html={spec.lede} className="-mt-0.5 px-4 pb-3 text-[13.5px] leading-snug text-muted-foreground" />
      <div className={cn('grid border-t', plotOn && 'lg:grid-cols-2')}>
        <div className="min-w-0 pt-3">
          <Primary spec={spec} res={res} q={q} {...tr} />
          <Outputs spec={spec} res={res} q={q} {...tr} />
        </div>
        {plotOn ? (
          <div className="min-w-0 border-t lg:border-l lg:border-t-0">
            <PlotBlock spec={spec} res={res} q={q} ui={ui} setUi={setUi} theme={theme} onPlotError={onPlotError} open />
          </div>
        ) : null}
      </div>
      {/* Each input group is its own panel, stacked in columns so short groups leave no gaps */}
      <div className="columns-1 gap-3 border-t bg-surface p-3 md:columns-2 xl:columns-3">
        {spec.groups.map((g) => (
          <section key={g.title} className="mb-3 break-inside-avoid rounded-md border bg-card px-3 pb-3.5 pt-2.5">
            <h4 className="mb-2.5 text-xs font-semibold uppercase tracking-[0.06em]">{g.title}</h4>
            <Inputs ids={g.ids} inputs={inputs} onChange={onChange} onCommit={onCommit} traced={traced} q={q} />
          </section>
        ))}
      </div>
    </Card>
  ) : (
    <Card className="flex flex-1 flex-col overflow-hidden">
      <CardHead spec={spec} q={q} problems={problems}>{actions}</CardHead>
      <Rich as="p" html={spec.lede} className="-mt-0.5 px-4 pb-3 text-[13.5px] leading-snug text-muted-foreground" />
      <Primary spec={spec} res={res} q={q} {...tr} />
      <div className="grid gap-3 border-y bg-surface px-4 py-3.5">
        <Inherited spec={spec} res={res} q={q} onNavigate={onNavigate} />
        <Inputs ids={spec.inputs} inputs={inputs} onChange={onChange} onCommit={onCommit} traced={traced} q={q} />
      </div>
      <Outputs spec={spec} res={res} q={q} {...tr} />
      {spec.plots?.length ? <PlotBlock spec={spec} res={res} q={q} ui={ui} setUi={setUi} theme={theme} onPlotError={onPlotError} open={plotOn} /> : null}
    </Card>
  );

  return (
    <article id={`step-${spec.step}`} className={cn('flip-scene scroll-mt-20 rounded-lg', spec.wide && 'col-span-full')}>
      <div className={cn('flip-inner', flipped && 'is-flipped')}>
        <div className={cn('flip-face flex flex-col', flipped && 'pointer-events-none')} aria-hidden={flipped}>{front}</div>
        <div className={cn('flip-face flip-back flex flex-col', !flipped && 'pointer-events-none')} aria-hidden={!flipped}>
          {backReady ? <Back spec={spec} res={res} q={q} onFlip={toggleFlip} /> : null}
        </div>
      </div>
    </article>
  );
}

export const StepCard = memo(StepCardImpl);
