import { useEffect, useState } from 'react';
import { Shrink } from 'lucide-react';
import { Slider } from '@/components/ui/slider';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Button } from '@/components/ui/button';
import { Rich } from '@/components/Rich';
import { fmt } from '@/lib/format';
import { cn } from '@/lib/utils';

const clamp = (x, a, b) => Math.min(b, Math.max(a, x));

function sliderDomain(def, s) {
  const half = def.spanAbs != null ? def.spanAbs : def.span * Math.abs(s.nom) || 1;
  let a = Math.max(def.min, s.nom - half), b = Math.min(def.max, s.nom + half);
  return [Math.min(a, s.lo), Math.max(b, s.hi)];
}

const roundTo = (x, step) => {
  const d = Math.max(0, Math.min(8, -Math.floor(Math.log10(step)) + 1));
  return Number(x.toFixed(d));
};

/** A number box that lets you type freely and commits on blur or Enter. */
function NumberBox({ value, onCommit, className, inputClassName, suffix, invalid, ariaLabel, dp, readOnly }) {
  const show = (v) => (isFinite(v) ? String(Number(v.toFixed(Math.max(dp ?? 4, 0) + 2))) : '');
  const [text, setText] = useState(show(value));
  const [focused, setFocused] = useState(false);
  useEffect(() => { if (!focused) setText(show(value)); }, [value, focused]);
  const commit = () => {
    const v = parseFloat(text);
    if (isFinite(v)) onCommit(v); else setText(show(value));
  };
  return (
    <label className={cn(
      'flex h-8 items-center rounded-md border border-input bg-card px-2.5 shadow-sm transition-colors focus-within:ring-2 focus-within:ring-ring',
      invalid && 'border-destructive', readOnly && 'bg-muted text-muted-foreground shadow-none focus-within:ring-0', className,
    )} title={readOnly ? 'Set by the junction (02) and C_Σ (01)' : undefined}>
      <input
        type="number" step="any" inputMode="decimal" aria-label={ariaLabel}
        className={cn('no-spin tnum w-full min-w-0 bg-transparent text-sm outline-none', inputClassName)}
        value={text}
        readOnly={readOnly}
        onFocus={() => setFocused(true)}
        onChange={(e) => {
          setText(e.target.value);
          const v = parseFloat(e.target.value);
          if (isFinite(v)) onCommit(v, true);
        }}
        onBlur={() => { setFocused(false); commit(); }}
        onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur(); }}
      />
      {suffix ? <span className="ml-1.5 shrink-0 text-xs text-muted-foreground">{suffix}</span> : null}
    </label>
  );
}

function FieldLabel({ def, locked }) {
  const hint = locked ? 'Set by the junction (02) and C<sub>Σ</sub> (01) · window only' : def.hint;
  return (
    <div className="min-w-0">
      <Rich html={def.label} className="block text-[14px] font-medium leading-tight" />
      {hint ? <Rich html={hint} className={cn('mt-0.5 block text-[12.5px] leading-snug', locked ? 'text-primary' : 'text-muted-foreground')} /> : null}
    </div>
  );
}

export function RangeField({ def, s, onChange, onCommit, compact, hit, locked }) {
  const [a, b] = sliderDomain(def, s);
  const step = (b - a) / 1000 || 1e-6;
  const wide = s.hi > s.nom || s.lo < s.nom;
  const pos = (x) => `${((x - a) / (b - a || 1)) * 100}%`;
  const invalid = !(s.nom >= def.min && s.nom <= def.max);

  const setNom = (v, live) => {
    const nom = clamp(v, def.min, def.max);
    const lo = clamp(nom - (s.nom - s.lo), def.min, nom), hi = clamp(nom + (s.hi - s.nom), nom, def.max);
    onChange(def.id, { nom, lo, hi });
    if (!live) onCommit(def.id);
  };
  const setLo = (v) => { onChange(def.id, { lo: clamp(Math.min(v, s.nom), def.min, s.nom) }); onCommit(def.id); };
  const setHi = (v) => { onChange(def.id, { hi: clamp(Math.max(v, s.nom), s.nom, def.max) }); onCommit(def.id); };

  const unit = def.unit === '%' ? ' %' : def.unit ? ` ${def.unit}` : '';
  const relUp = s.nom ? ((s.hi - s.nom) / Math.abs(s.nom)) * 100 : null;
  const relDn = s.nom ? ((s.nom - s.lo) / Math.abs(s.nom)) * 100 : null;

  const sliderBlock = (
    <div className="min-w-0 pt-0.5">
      <Slider
        min={a} max={b} step={step} value={[s.lo, s.hi]}
        minStepsBetweenThumbs={0}
        aria-label={`${def.id} window`}
        thumbClassNames={['border-lower', 'border-upper']}
        onValueChange={([x, y]) => onChange(def.id, { lo: roundTo(Math.min(x, s.nom), step), hi: roundTo(Math.max(y, s.nom), step) })}
        onValueCommit={() => onCommit(def.id)}
      >
        <span className="pointer-events-none absolute top-1/2 h-3 w-0.5 -translate-x-1/2 -translate-y-1/2 bg-foreground" style={{ left: pos(s.nom) }} />
      </Slider>
      <div className="mt-1.5 flex items-center justify-between gap-2 text-[12px] leading-none">
        <NumberBox value={s.lo} dp={def.dp} onCommit={(v, live) => !live && setLo(v)} ariaLabel={`${def.id} lower bound`}
          className="h-5 w-[84px] min-w-0 border-transparent bg-transparent px-0 shadow-none hover:border-input"
          inputClassName="text-[12px] font-medium text-lower" />
        <span className="tnum truncate text-muted-foreground">
          {wide ? (s.nom ? (Math.abs(relUp - relDn) < 1e-6 ? `±${fmt(relUp, 2)} %` : `+${fmt(relUp, 2)} / −${fmt(relDn, 2)} %`) : `${fmt(s.lo, 3)} … +${fmt(s.hi, 3)}${unit}`) : ''}
        </span>
        <NumberBox value={s.hi} dp={def.dp} onCommit={(v, live) => !live && setHi(v)} ariaLabel={`${def.id} upper bound`}
          className="h-5 w-[84px] min-w-0 border-transparent bg-transparent px-0 shadow-none hover:border-input"
          inputClassName="text-right text-[12px] font-medium text-upper" />
      </div>
    </div>
  );

  return (
    <div id={`field-${def.id}`} className={cn('col-span-full grid scroll-mt-28 gap-1.5', hit && 'trace-hit')}>
      <FieldLabel def={def} locked={locked} />
      <div className={cn('grid items-center gap-x-3 gap-y-2', compact ? 'grid-cols-[minmax(0,1fr)_auto]' : 'grid-cols-[104px_minmax(0,1fr)_auto]')}>
        <NumberBox value={s.nom} dp={def.dp} suffix={def.unit} invalid={invalid} ariaLabel={`${def.id} nominal`}
          readOnly={locked} onCommit={(v, live) => { if (!locked) setNom(v, live); }} />
        {compact ? null : sliderBlock}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon-sm" disabled={!wide} aria-label="Collapse window"
              onClick={() => { onChange(def.id, { lo: s.nom, hi: s.nom }); onCommit(def.id); }}>
              <Shrink />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Collapse to a single value</TooltipContent>
        </Tooltip>
        {compact ? <div className="col-span-2">{sliderBlock}</div> : null}
      </div>
    </div>
  );
}

export function PlainField({ def, s, onChange, onCommit, hit }) {
  const invalid = !(s.nom >= def.min && s.nom <= def.max);
  return (
    <div id={`field-${def.id}`} className={cn('grid min-w-0 scroll-mt-28 content-between gap-1.5', hit && 'trace-hit')}>
      <FieldLabel def={def} />
      <NumberBox value={s.nom} dp={def.dp} suffix={def.unit} invalid={invalid} ariaLabel={def.id}
        onCommit={(v, live) => {
          const nom = clamp(v, def.min, def.max);
          onChange(def.id, { nom, lo: nom, hi: nom });
          if (!live) onCommit(def.id);
        }} />
    </div>
  );
}

export function SelectField({ def, s, onChange, onCommit, hit }) {
  return (
    <div id={`field-${def.id}`} className={cn('col-span-full flex scroll-mt-28 flex-wrap items-center justify-between gap-2', hit && 'trace-hit')}>
      <Rich html={def.label} className="text-[14px] font-medium" />
      <ToggleGroup type="single" value={s.nom} onValueChange={(v) => { onChange(def.id, { nom: v }); onCommit(def.id); }}>
        {def.options.map(([v, label]) => (
          <ToggleGroupItem key={v} value={v}><Rich html={label} /></ToggleGroupItem>
        ))}
      </ToggleGroup>
    </div>
  );
}

export function Field(props) {
  const { def } = props;
  if (def.type === 'select') return <SelectField {...props} />;
  if (def.range === false) return <PlainField {...props} />;
  return <RangeField {...props} />;
}
