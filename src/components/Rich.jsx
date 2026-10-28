import { cn } from '@/lib/utils';

// Labels in the model are short, trusted HTML strings (<i>, <sub>, <sup>).
export function Rich({ html, className, as: Tag = 'span' }) {
  return <Tag className={cn('rich', className)} dangerouslySetInnerHTML={{ __html: html }} />;
}

export const stripTags = (html) => String(html).replace(/<[^>]+>/g, '');
