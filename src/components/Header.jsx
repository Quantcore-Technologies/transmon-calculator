import { Download, Moon, PanelLeft, RotateCcw, Sun } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { fmt } from '@/lib/format';

function IconButton({ label, onClick, children, className }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button variant="ghost" size="icon" aria-label={label} onClick={onClick} className={className}>{children}</Button>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}

export function Header({ res, q, setQ, sigma, setSigma, theme, toggleTheme, onExport, onReset, onToggleSidebar }) {
  const n = res.nom;
  return (
    <header className="sticky top-0 z-40 flex h-14 items-center justify-between gap-4 border-b bg-card/90 px-4 backdrop-blur supports-[backdrop-filter]:bg-card/75 sm:px-5">
      <div className="flex min-w-0 items-center gap-3">
        <IconButton label="Design summary" onClick={onToggleSidebar} className="-ml-2 lg:hidden"><PanelLeft /></IconButton>
        <img src="./Logo_Black.png" alt="Quantcore" className="h-[17px] w-auto shrink-0 dark:hidden" />
        <img src="./Logo_White.png" alt="Quantcore" className="hidden h-[17px] w-auto shrink-0 dark:block" />
        <Separator orientation="vertical" className="mx-1 hidden h-6 sm:block" />
        <div className="hidden min-w-0 sm:block">
          <div className="truncate text-[15px] font-semibold leading-tight tracking-tight">Transmon Design Estimator</div>
          <div className="truncate text-[11px] text-muted-foreground">Tunable-transmon pair · readout · tunable coupler</div>
        </div>
      </div>
      <div className="flex items-center gap-2 sm:gap-3">
        <div className="hidden items-center gap-2 md:flex">
          <span className="text-[11px] font-medium uppercase tracking-[0.06em] text-muted-foreground">Qubit</span>
          <ToggleGroup type="single" value={q} onValueChange={setQ} aria-label="Active qubit">
            <ToggleGroupItem value="2">Q2 <span className="tnum font-normal text-muted-foreground">{fmt(n.fT_2 / 1e9, 3)}</span></ToggleGroupItem>
            <ToggleGroupItem value="1">Q1 <span className="tnum font-normal text-muted-foreground">{fmt(n.fT_1 / 1e9, 3)}</span></ToggleGroupItem>
          </ToggleGroup>
        </div>
        <ToggleGroup type="single" value={q} onValueChange={setQ} aria-label="Active qubit" className="md:hidden">
          <ToggleGroupItem value="2">Q2</ToggleGroupItem>
          <ToggleGroupItem value="1">Q1</ToggleGroupItem>
        </ToggleGroup>
        <div className="hidden items-center gap-2 lg:flex">
          <span className="text-[11px] font-medium uppercase tracking-[0.06em] text-muted-foreground">Fab window</span>
          <ToggleGroup type="single" value={sigma} onValueChange={(v) => setSigma(Number(v))} aria-label="Fab-scatter window">
            {['0', '1', '2', '3'].map((k) => (
              <ToggleGroupItem key={k} value={k}>{k === '0' ? 'Off' : `${k}σ`}</ToggleGroupItem>
            ))}
          </ToggleGroup>
        </div>
        <Separator orientation="vertical" className="hidden h-6 sm:block" />
        <div className="flex items-center">
          <IconButton label="Export inputs and results (JSON)" onClick={onExport}><Download /></IconButton>
          <IconButton label="Reset to design-note values" onClick={onReset}><RotateCcw /></IconButton>
          <IconButton label={theme === 'dark' ? 'Light theme' : 'Dark theme'} onClick={toggleTheme}>{theme === 'dark' ? <Sun /> : <Moon />}</IconButton>
        </div>
      </div>
    </header>
  );
}
