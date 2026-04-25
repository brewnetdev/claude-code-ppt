import { useEffect, useMemo } from 'react';
import { SLIDE_HEIGHT, SLIDE_WIDTH } from '../scene/constants';
import { getSlideTemplates, type SlideTemplate } from '../templates/slideTemplates';

const THUMB_W = 256;
const THUMB_H = (THUMB_W * SLIDE_HEIGHT) / SLIDE_WIDTH;
const THUMB_SCALE = THUMB_W / SLIDE_WIDTH;

type Props = {
  open: boolean;
  onClose: () => void;
  onSelect: (template: SlideTemplate) => void;
};

export function TemplatePicker({ open, onClose, onSelect }: Props) {
  const templates = useMemo(() => getSlideTemplates(), []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="flex max-h-[88vh] w-[92vw] max-w-[1100px] flex-col overflow-hidden rounded-lg border border-editor-border bg-editor-panel shadow-2xl">
        <header className="flex items-center justify-between border-b border-editor-border px-5 py-3">
          <div>
            <h2 className="text-sm font-semibold text-editor-text">슬라이드 템플릿</h2>
            <p className="text-[11px] text-editor-dim">
              사용할 디자인을 선택하세요. ESC 또는 바깥 클릭으로 닫기.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded border border-editor-border px-2 py-1 text-xs text-editor-dim hover:border-editor-accent hover:text-editor-accent"
          >
            닫기
          </button>
        </header>
        <div className="grid flex-1 grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-4 overflow-y-auto p-5">
          {templates.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => onSelect(t)}
              className="group flex flex-col gap-2 rounded-md border border-editor-border bg-[#0b1220] p-3 text-left transition hover:border-editor-accent"
            >
              <Thumbnail html={t.html} />
              <div>
                <div className="text-[13px] font-medium text-editor-text group-hover:text-editor-accent">
                  {t.label}
                </div>
                <div className="mt-0.5 line-clamp-2 text-[11px] leading-snug text-editor-dim">
                  {t.description}
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function Thumbnail({ html }: { html: string }) {
  return (
    <div
      className="overflow-hidden rounded border border-editor-border/60 bg-black"
      style={{ width: THUMB_W, height: THUMB_H }}
      aria-hidden
    >
      <div
        className="slide-canvas-host pointer-events-none"
        style={{
          width: SLIDE_WIDTH,
          height: SLIDE_HEIGHT,
          transform: `scale(${THUMB_SCALE})`,
          transformOrigin: 'top left',
        }}
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </div>
  );
}
