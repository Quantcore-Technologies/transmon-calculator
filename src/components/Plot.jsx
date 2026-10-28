import { useEffect, useRef, useState } from 'react';
import { draw } from '@/lib/plots';

/**
 * d3 plot host. Height follows the width at the given aspect (height/width), so plots fill a
 * 4:3 area at any card width; aspect null lets the plot size itself (frequency map).
 * Draws only while on screen and active.
 */
export function Plot({ spec, res, q, mode, slice, theme, aspect = 0.75, active = true, onError }) {
  const ref = useRef(null);
  const view = useRef({ az: -0.75 });
  const [visible, setVisible] = useState(false);
  const [width, setWidth] = useState(0);
  const height = aspect ? Math.round(Math.min(560, Math.max(220, width * aspect))) : null;

  useEffect(() => {
    const el = ref.current;
    const io = new IntersectionObserver(([e]) => setVisible(e.isIntersecting), { rootMargin: '300px 0px' });
    const ro = new ResizeObserver(([e]) => setWidth(Math.round(e.contentRect.width)));
    io.observe(el);
    ro.observe(el);
    return () => { io.disconnect(); ro.disconnect(); };
  }, []);

  useEffect(() => {
    if (!active || !visible || !width || !res) return;
    const D = { res, q, mode, slice, height, view: view.current };
    draw(ref.current, spec, D, onError);
    view.current = D.view;
  }, [active, visible, width, res, q, mode, slice, spec, theme, height, onError]);

  return <div ref={ref} className="w-full" style={height ? { height } : undefined} />;
}
