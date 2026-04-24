import { useEffect, useRef } from 'react';
import Moveable, { type OnDrag, type OnResize } from 'moveable';

export type OverlayImage = {
  id: string;
  src: string;
  x: number;
  y: number;
  w: number;
  h: number;
};

type Props = {
  items: OverlayImage[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onUpdate: (id: string, patch: Partial<OverlayImage>) => void;
};

export function OverlayLayer({ items, selectedId, onSelect, onUpdate }: Props) {
  const layerRef = useRef<HTMLDivElement>(null);
  const moveableRef = useRef<Moveable | null>(null);
  const selected = items.find((it) => it.id === selectedId) ?? null;

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onSelect(null);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onSelect]);

  useEffect(() => {
    if (!selectedId) return;
    const layer = layerRef.current;
    if (!layer) return;
    const target = layer.querySelector<HTMLElement>(`[data-overlay-id="${selectedId}"]`);
    if (!target) return;

    const moveable = new Moveable(document.body, {
      target,
      draggable: true,
      resizable: true,
      keepRatio: false,
      origin: false,
      edge: false,
      throttleDrag: 0,
      throttleResize: 0,
    });
    moveableRef.current = moveable;

    moveable.on('drag', ({ left, top, target: t }: OnDrag) => {
      (t as HTMLElement).style.left = `${left}px`;
      (t as HTMLElement).style.top = `${top}px`;
    });

    moveable.on('dragEnd', ({ target: t }) => {
      const el = t as HTMLElement;
      onUpdate(selectedId, { x: parseFloat(el.style.left), y: parseFloat(el.style.top) });
    });

    moveable.on('resize', ({ width, height, drag, target: t }: OnResize) => {
      const el = t as HTMLElement;
      el.style.width = `${width}px`;
      el.style.height = `${height}px`;
      el.style.left = `${drag.left}px`;
      el.style.top = `${drag.top}px`;
    });

    moveable.on('resizeEnd', ({ target: t }) => {
      const el = t as HTMLElement;
      onUpdate(selectedId, {
        x: parseFloat(el.style.left),
        y: parseFloat(el.style.top),
        w: parseFloat(el.style.width),
        h: parseFloat(el.style.height),
      });
    });

    return () => {
      moveable.destroy();
      if (moveableRef.current === moveable) moveableRef.current = null;
    };
  }, [selectedId, onUpdate]);

  // Keep Moveable handles in sync when the selected overlay's geometry is
  // edited from the properties panel instead of via drag handles.
  useEffect(() => {
    moveableRef.current?.updateRect();
  }, [selected?.x, selected?.y, selected?.w, selected?.h]);

  return (
    <div ref={layerRef} className="overlay-layer">
      {items.map((it) => (
        <div
          key={it.id}
          data-overlay-id={it.id}
          className={`overlay-item ${selectedId === it.id ? 'selected' : ''}`}
          style={{ left: it.x, top: it.y, width: it.w, height: it.h }}
          onMouseDown={(e) => {
            e.stopPropagation();
            onSelect(it.id);
          }}
        >
          <img src={it.src} alt="" draggable={false} />
        </div>
      ))}
    </div>
  );
}
