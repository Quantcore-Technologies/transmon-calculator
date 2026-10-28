import { ChevronUp, CircleX, Info, Terminal, TriangleAlert, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { pad2 } from '@/components/StepCard';
import { cn } from '@/lib/utils';

const SEV = {
  error: { icon: CircleX, cls: 'text-destructive', label: 'Error' },
  warn: { icon: TriangleAlert, cls: 'text-warn', label: 'Warning' },
  info: { icon: Info, cls: 'text-primary', label: 'Note' },
  debug: { icon: Terminal, cls: 'text-muted-foreground', label: 'Log' },
};
const time = (t) => new Date(t).toLocaleTimeString([], { hour12: false });

function Item({ onClick, children, className, active }) {
  return (
    <button type="button" onClick={onClick}
      className={cn('flex h-full items-center gap-1.5 border-r px-3 transition-colors hover:bg-accent', active && 'bg-accent', className)}>
      {children}
    </button>
  );
}

export function StatusBar({ problems, logs, res, q, panel, setPanel, onNavigate, onClearLog }) {
  const count = (s) => problems.filter((p) => p.sev === s).length;
  const last = logs[logs.length - 1];
  const toggle = (p) => setPanel(panel === p ? null : p);
  return (
    <>
      {panel ? (
        <section className="fixed inset-x-0 bottom-7 z-40 flex h-[min(300px,50vh)] flex-col border-t bg-card shadow-[0_-8px_24px_-12px_rgba(0,0,0,0.25)]" aria-label="Problems and log">
          <div className="flex items-center justify-between gap-2 border-b px-3 py-1.5">
            <Tabs value={panel} onValueChange={setPanel}>
              <TabsList>
                <TabsTrigger value="problems">Problems <span className="tnum text-muted-foreground">{problems.length}</span></TabsTrigger>
                <TabsTrigger value="log">Log <span className="tnum text-muted-foreground">{logs.length}</span></TabsTrigger>
              </TabsList>
            </Tabs>
            <div className="flex items-center gap-1">
              {panel === 'log' ? <Button variant="ghost" size="xs" onClick={onClearLog}>Clear log</Button> : null}
              <Button variant="ghost" size="icon-sm" aria-label="Close panel" onClick={() => setPanel(null)}><X /></Button>
            </div>
          </div>
          <ScrollArea className="min-h-0 flex-1">
            {panel === 'problems' ? (
              problems.length ? (
                <ul className="divide-y">
                  {problems.map((p, i) => {
                    const S = SEV[p.sev];
                    return (
                      <li key={i}>
                        <button type="button" onClick={() => p.step != null && onNavigate(p.step)}
                          className="grid w-full grid-cols-[18px_64px_minmax(0,1fr)] items-start gap-2 px-4 py-2 text-left text-[12.5px] hover:bg-accent">
                          <S.icon className={cn('mt-0.5 size-3.5', S.cls)} />
                          <span className="tnum text-muted-foreground">{p.step != null ? `Step ${pad2(p.step)}` : 'Model'}</span>
                          <span>{p.msg}</span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              ) : <p className="px-4 py-6 text-sm text-muted-foreground">No problems at the nominal point or across the windows.</p>
            ) : (
              <ul className="divide-y font-mono text-[11.5px]">
                {logs.slice().reverse().map((l) => {
                  const S = SEV[l.level] || SEV.debug;
                  return (
                    <li key={l.id} className="grid grid-cols-[64px_18px_minmax(0,1fr)] items-start gap-2 px-4 py-1.5">
                      <span className="tnum text-muted-foreground">{time(l.t)}</span>
                      <S.icon className={cn('mt-0.5 size-3.5', S.cls)} />
                      <span className="break-words">{l.msg}</span>
                    </li>
                  );
                })}
              </ul>
            )}
          </ScrollArea>
        </section>
      ) : null}
      <footer className="fixed inset-x-0 bottom-0 z-40 flex h-7 items-stretch border-t bg-card text-[11.5px]">
        <Item onClick={() => toggle('problems')} active={panel === 'problems'}>
          <CircleX className={cn('size-3.5', count('error') ? 'text-destructive' : 'text-muted-foreground')} />
          <span className="tnum">{count('error')}</span>
          <TriangleAlert className={cn('ml-1.5 size-3.5', count('warn') ? 'text-warn' : 'text-muted-foreground')} />
          <span className="tnum">{count('warn')}</span>
          <Info className="ml-1.5 size-3.5 text-primary" />
          <span className="tnum">{count('info')}</span>
        </Item>
        <Item onClick={() => toggle('log')} active={panel === 'log'}>
          <Terminal className="size-3.5" /> Log <span className="tnum text-muted-foreground">{logs.length}</span>
          <ChevronUp className={cn('size-3.5 text-muted-foreground transition-transform', panel && 'rotate-180')} />
        </Item>
        <div className="flex min-w-0 flex-1 items-center gap-1.5 px-3 text-muted-foreground">
          {last ? (
            <>
              <span className="tnum hidden sm:inline">{time(last.t)}</span>
              <span className={cn('truncate', SEV[last.level]?.cls)}>{last.msg}</span>
            </>
          ) : null}
        </div>
        <div className="hidden items-center border-l px-3 text-muted-foreground md:flex">
          <span className="tnum">{res.evals} evaluations · {res.ms.toFixed(1)} ms</span>
        </div>
        <div className="hidden items-center border-l px-3 text-muted-foreground lg:flex">Exact charge-basis transmon</div>
        <div className="flex items-center border-l px-3 font-medium">Q{q}</div>
      </footer>
    </>
  );
}
