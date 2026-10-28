import { ScrollArea } from '@/components/ui/scroll-area';
import { Rich } from '@/components/Rich';
import { pad2 } from '@/components/StepCard';
import { CARDS, SECTIONS } from '@/lib/cards';
import { fmt, resolveKey, sigmaText, triple } from '@/lib/format';
import { cn } from '@/lib/utils';

const SEV_RANK = { error: 3, warn: 2, info: 1 };
const DOT = { 3: 'bg-destructive', 2: 'bg-warn', 1: 'bg-primary', 0: 'bg-primary/40' };

function Row({ o, res, q }) {
  const t = triple(res, resolveKey(o.key, q), o.conv, o.unit);
  const st = o.noSigma ? '' : sigmaText(t);
  const sig = o.sig || 4;
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-x-3 py-[3px]">
      <Rich html={o.label} className="text-[13px] leading-snug text-muted-foreground" />
      <span className="text-right">
        <span className={cn('tnum text-[13.5px] font-medium', !isFinite(t.nom) && 'text-destructive')}>{fmt(t.nom, sig)}</span>
        {t.unit ? <span className="ml-1 text-[12px] text-muted-foreground">{t.unit}</span> : null}
        {st ? <span className="tnum block text-[11px] leading-tight text-muted-foreground">{st}</span> : null}
        {t.wide ? (
          <span className="tnum block text-[11.5px] leading-tight">
            <span className="text-lower">{fmt(t.lo, sig, t.nom)}</span>
            <span className="text-muted-foreground"> – </span>
            <span className="text-upper">{fmt(t.hi, sig, t.nom)}</span>
          </span>
        ) : null}
      </span>
    </div>
  );
}

export function Sidebar({ res, q, problems, onNavigate }) {
  const worst = (step) => problems.filter((p) => p.step === step).reduce((m, p) => Math.max(m, SEV_RANK[p.sev]), 0);
  const counts = { error: 0, warn: 0 };
  problems.forEach((p) => { if (p.sev in counts) counts[p.sev]++; });
  return (
    <ScrollArea className="h-full">
      <div className="px-4 pb-8 pt-5">
        <div className="flex items-baseline justify-between">
          <h2 className="text-[13px] font-semibold uppercase tracking-[0.08em]">Design summary</h2>
          <span className="tnum text-[12px] text-muted-foreground">Q{q}</span>
        </div>
        <p className="mt-1 text-[11.5px] leading-snug text-muted-foreground">
          {counts.error ? <span className="font-medium text-destructive">{counts.error} error{counts.error > 1 ? 's' : ''}</span> : 'No errors'}
          {' · '}
          {counts.warn ? <span className="font-medium text-warn">{counts.warn} warning{counts.warn > 1 ? 's' : ''}</span> : 'no warnings'}
        </p>
        {SECTIONS.map((sec) => (
          <section key={sec.id} className="mt-6">
            <div className="flex items-center gap-2 border-t-2 border-foreground pt-1.5">
              <span className="tnum text-[12px] font-semibold">{sec.no}</span>
              <span className="text-[11px] font-semibold uppercase tracking-[0.08em]">{sec.title}</span>
            </div>
            {CARDS.filter((c) => c.section === sec.id).map((c) => {
              const rows = [{ ...c.primary }, ...c.outputs.filter((o) => o.sum)];
              return (
                <button key={c.id} type="button" onClick={() => onNavigate(c.step)}
                  className="group mt-1 block w-full rounded-md px-2 py-2 text-left transition-colors hover:bg-accent">
                  <div className="mb-1 flex items-center gap-2">
                    <span className="tnum text-[12px] font-semibold text-muted-foreground">{pad2(c.step)}</span>
                    <span className="flex-1 text-[13.5px] font-medium leading-snug group-hover:text-primary">{c.title}</span>
                    <i className={cn('inline-block size-[7px]', DOT[worst(c.step)])} aria-hidden />
                  </div>
                  {rows.map((o) => <Row key={o.key} o={o} res={res} q={q} />)}
                </button>
              );
            })}
          </section>
        ))}
        <p className="mt-8 text-[11px] leading-relaxed text-muted-foreground">
          Exact transmon levels from a 41-state charge basis. Windows are propagated over every corner of the input box.
        </p>
      </div>
    </ScrollArea>
  );
}
