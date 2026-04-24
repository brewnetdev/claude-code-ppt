import type { DragEvent } from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useDeckStore } from '../scene/store';
import { OverlayLayer, type OverlayImage } from './OverlayLayer';
import { SlideRenderer } from './SlideRenderer';
import { SLIDE_HEIGHT, SLIDE_WIDTH } from '../scene/constants';
import './spike.css';

const FIT_PADDING = 64;

let nextId = 1;
const makeId = () => `ovl-${nextId++}`;

export function SlideCanvas() {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const hostRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [dropActive, setDropActive] = useState(false);

  const slideId = useDeckStore((s) => s.slides[s.currentIndex]?.id ?? null);
  const overlays = useDeckStore((s) => (slideId ? s.overlaysBySlide[slideId] ?? [] : []));
  const addOverlay = useDeckStore((s) => s.addOverlay);
  const updateOverlayInStore = useDeckStore((s) => s.updateOverlay);

  useEffect(() => {
    setSelectedId(null);
  }, [slideId]);

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

  const onDragOver = useCallback((e: DragEvent<HTMLDivElement>) => {
    if (Array.from(e.dataTransfer.types).includes('Files')) {
      e.preventDefault();
      setDropActive(true);
    }
  }, []);

  const onDragLeave = useCallback((e: DragEvent<HTMLDivElement>) => {
    if (e.currentTarget === e.target) setDropActive(false);
  }, []);

  const onDrop = useCallback(
    (e: DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setDropActive(false);
      if (!slideId) return;
      const file = Array.from(e.dataTransfer.files).find((f) => f.type.startsWith('image/'));
      if (!file) return;

      const host = hostRef.current;
      if (!host) return;
      const rect = host.getBoundingClientRect();
      const sc = rect.width / SLIDE_WIDTH;
      const dropX = (e.clientX - rect.left) / sc;
      const dropY = (e.clientY - rect.top) / sc;

      const w = 360;
      const h = 240;
      const url = URL.createObjectURL(file);
      const id = makeId();
      const item: OverlayImage = {
        id,
        src: url,
        x: Math.max(0, Math.min(dropX - w / 2, SLIDE_WIDTH - w)),
        y: Math.max(0, Math.min(dropY - h / 2, SLIDE_HEIGHT - h)),
        w,
        h,
      };
      addOverlay(slideId, item);
      setSelectedId(id);
    },
    [slideId, addOverlay],
  );

  const updateOverlay = useCallback(
    (id: string, patch: Partial<OverlayImage>) => {
      if (!slideId) return;
      updateOverlayInStore(slideId, id, patch);
    },
    [slideId, updateOverlayInStore],
  );

  if (!slideId) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-[#020617] text-editor-dim">
        No slide loaded
      </div>
    );
  }

  return (
    <div
      ref={wrapperRef}
      className={`flex h-full w-full items-center justify-center overflow-hidden bg-[#020617] ${
        dropActive ? 'overlay-drop-active' : ''
      }`}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      onMouseDown={() => setSelectedId(null)}
    >
      <div
        ref={hostRef}
        className="slide-canvas-host relative shadow-[0_24px_64px_rgba(0,0,0,0.6)]"
        style={{
          width: SLIDE_WIDTH,
          height: SLIDE_HEIGHT,
          transform: `scale(${scale})`,
          transformOrigin: 'center center',
        }}
      >
        <SlideRenderer key={slideId} slideId={slideId} />
        <OverlayLayer
          items={overlays}
          selectedId={selectedId}
          onSelect={setSelectedId}
          onUpdate={updateOverlay}
        />
      </div>
    </div>
  );
}
