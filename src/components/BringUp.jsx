import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Rich } from '@/components/Rich';
import { pad2 } from '@/components/StepCard';
import { BRINGUP } from '@/lib/cards';
import { fmt, resolveKey, sigmaText, triple } from '@/lib/format';
import { cn } from '@/lib/utils';

export function BringUp({ res, q, checked, setChecked, onNavigate }) {
  return (
    <Card className="overflow-hidden">
      <div className="px-5 pb-3 pt-4">
        <h3 className="text-[15px] font-semibold tracking-tight">Measure in dependency order</h3>
        <p className="mt-1 text-[13px] text-muted-foreground">Set every operating point from measurement, not from the design table. Predicted values for Q{q} with the current windows.</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] border-t text-[13px]">
          <thead>
            <tr className="text-left text-[11px] uppercase tracking-[0.06em] text-muted-foreground">
              <th className="w-10 px-5 py-2 font-medium" />
              <th className="w-16 py-2 font-medium">Step</th>
              <th className="py-2 pr-4 font-medium">Quantity</th>
              <th className="py-2 pr-4 text-right font-medium">Predicted</th>
              <th className="py-2 pr-4 text-right font-medium">Window</th>
              <th className="py-2 pr-5 font-medium">How</th>
            </tr>
          </thead>
          <tbody className="divide-y border-t">
            {BRINGUP.map((b, i) => {
              const t = triple(res, resolveKey(b.key, q), b.conv, b.unit);
              const st = sigmaText(t);
              const done = !!checked[i];
              return (
                <tr key={i} className={cn('align-top transition-colors', done && 'bg-muted/50 text-muted-foreground')}>
                  <td className="px-5 py-2.5"><Checkbox checked={done} onCheckedChange={(v) => setChecked(i, !!v)} aria-label="Done" /></td>
                  <td className="py-2.5">
                    <button type="button" onClick={() => onNavigate(b.step)} className="tnum text-muted-foreground hover:text-primary">{pad2(b.step)}</button>
                  </td>
                  <td className="py-2.5 pr-4"><Rich html={b.what} className={cn(done && 'line-through')} /></td>
                  <td className="tnum whitespace-nowrap py-2.5 pr-4 text-right font-medium">{fmt(t.nom, 4)} <span className="text-xs font-normal text-muted-foreground">{t.unit}</span>
                    {st ? <div className="text-[11.5px] font-normal text-muted-foreground">{st}</div> : null}</td>
                  <td className="tnum whitespace-nowrap py-2.5 pr-4 text-right text-xs">
                    {t.wide ? (<><span className="text-lower">{fmt(t.lo, 4, t.nom)}</span> – <span className="text-upper">{fmt(t.hi, 4, t.nom)}</span></>) : <span className="text-muted-foreground">—</span>}
                  </td>
                  <td className="py-2.5 pr-5 text-[12.5px] text-muted-foreground"><Rich html={b.how} /></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
