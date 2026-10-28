import * as React from 'react';
import * as SliderPrimitive from '@radix-ui/react-slider';
import { cn } from '@/lib/utils';

// thumbClassNames styles each thumb (e.g. lower and upper bound); children render inside the track.
const Slider = React.forwardRef(({ className, thumbClassNames = [], children, ...props }, ref) => {
  const count = (props.value || props.defaultValue || [0]).length;
  return (
    <SliderPrimitive.Root ref={ref} className={cn('relative flex w-full touch-none select-none items-center', className)} {...props}>
      <SliderPrimitive.Track className="relative h-1 w-full grow overflow-visible rounded-full bg-muted-foreground/20">
        <SliderPrimitive.Range className="absolute h-full rounded-full bg-primary" />
        {children}
      </SliderPrimitive.Track>
      {Array.from({ length: count }, (_, i) => (
        <SliderPrimitive.Thumb
          key={i}
          className={cn(
            'block h-3.5 w-3.5 rounded-full border-2 border-primary bg-card shadow transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none',
            thumbClassNames[i],
          )}
        />
      ))}
    </SliderPrimitive.Root>
  );
});
Slider.displayName = SliderPrimitive.Root.displayName;

export { Slider };
