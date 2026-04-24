import type { ReactNode } from 'react';
import { useEffect, useRef, useState } from 'react';
import { SLIDE_HEIGHT, SLIDE_WIDTH } from '../scene/types';

const FIT_PADDING = 64;

type Props = {
  children: ReactNode;
};

export function SlideCanvas({ children }: Props) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const el = wrapperRef.current;
    if (!el) return;

    const compute = () => {
      const { width, height } = el.getBoundingClientRect();
      const sx = (width - FIT_PADDING) / SLIDE_WIDTH;
      const sy = (height - FIT_PADDING) / SLIDE_HEIGHT;
      setScale(Math.min(sx, sy, 1.5));
    };

    compute();
    const ro = new ResizeObserver(compute);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    <div
      ref={wrapperRef}
      className="flex h-full w-full items-center justify-center overflow-hidden bg-[#020617]"
    >
      <div
        className="slide-canvas-host relative shadow-[0_24px_64px_rgba(0,0,0,0.6)]"
        style={{
          width: SLIDE_WIDTH,
          height: SLIDE_HEIGHT,
          transform: `scale(${scale})`,
          transformOrigin: 'center center',
        }}
      >
        {children}
      </div>
    </div>
  );
}
