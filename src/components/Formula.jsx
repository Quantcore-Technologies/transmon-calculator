import { useMemo } from 'react';
import katex from 'katex';
import { cn } from '@/lib/utils';

// Inline mode (with \displaystyle) lets KaTeX break long equations at relations and binary
// operators, so they wrap inside narrow cards instead of being clipped.
export function Formula({ tex, className }) {
  const html = useMemo(() => {
    try {
      return katex.renderToString(`\\displaystyle ${tex}`, { displayMode: false, throwOnError: false, strict: 'ignore' });
    } catch (err) {
      return `<code>${tex}</code>`;
    }
  }, [tex]);
  return <div className={cn('katex-wrap min-w-0', className)} dangerouslySetInnerHTML={{ __html: html }} />;
}
