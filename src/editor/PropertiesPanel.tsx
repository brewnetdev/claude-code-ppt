import { SLIDE_HEIGHT, SLIDE_WIDTH } from '../scene/constants';
import { useDeckStore } from '../scene/store';
import { BlockFormatPanel } from './BlockFormatPanel';
import { CodeBlockEditPanel, isCodeBlock } from './CodeBlockEditPanel';
import { CodeBlockTemplates } from './CodeBlockTemplates';
import { TextBlockTemplates } from './TextBlockTemplates';
import { TextFormatPanel } from './TextFormatPanel';
import { TextOverlayPropertiesSection } from './TextOverlayPropertiesSection';

export function PropertiesPanel() {
  const slideId = useDeckStore((s) => s.slides[s.currentIndex]?.id ?? null);
  const selectedId = useDeckStore((s) => s.selectedOverlayId);
  const selectedBlockId = useDeckStore((s) => s.selectedBlockId);
  const overlay = useDeckStore((s) =>
    slideId && s.selectedOverlayId
      ? (s.overlaysBySlide[slideId] ?? []).find((o) => o.id === s.selectedOverlayId) ?? null
      : null,
  );
  const updateOverlay = useDeckStore((s) => s.updateOverlay);
  const removeOverlay = useDeckStore((s) => s.removeOverlay);

  return (
    <aside className="flex h-full w-72 flex-col border-l border-editor-border bg-editor-panel">
      <div className="border-b border-editor-border px-3 py-2 text-xs font-semibold uppercase tracking-wider text-editor-dim">
        Properties
      </div>
      <div className="flex-1 space-y-4 overflow-y-auto p-3">
        <TextFormatPanel />
        {selectedBlockId && !overlay ? (
          <div className="space-y-4">
            {isCodeBlock(selectedBlockId) ? (
              <CodeBlockEditPanel blockId={selectedBlockId} />
            ) : null}
            <BlockFormatPanel blockId={selectedBlockId} />
          </div>
        ) : !overlay || !slideId ? (
          <div className="space-y-4">
            <TextBlockTemplates />
            <CodeBlockTemplates />
            <p className="text-[11px] leading-relaxed text-editor-dim">
              이미지를 드롭한 뒤 캔버스에서 클릭하면 크기/위치를 여기서 수정할 수 있습니다. 슬라이드의 텍스트 블록을 클릭하면 정렬/배경/사이즈 프리셋을 조정할 수 있습니다.
            </p>
          </div>
        ) : overlay.kind === 'image' ? (
          <div className="space-y-4">
            <div>
              <div className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-editor-dim">
                Overlay · Image
              </div>
              <div className="overflow-hidden rounded border border-editor-border bg-black/40">
                <img
                  src={overlay.src}
                  alt=""
                  className="block h-20 w-full object-contain"
                />
              </div>
              <div className="mt-1 truncate text-[10px] text-editor-dim" title={selectedId ?? ''}>
                id: {selectedId}
              </div>
            </div>

            <Section title="Position">
              <NumberField
                label="X"
                value={overlay.x}
                min={0}
                max={SLIDE_WIDTH}
                onChange={(v) => updateOverlay(slideId, overlay.id, { x: v })}
              />
              <NumberField
                label="Y"
                value={overlay.y}
                min={0}
                max={SLIDE_HEIGHT}
                onChange={(v) => updateOverlay(slideId, overlay.id, { y: v })}
              />
            </Section>

            <Section title="Size">
              <NumberField
                label="W"
                value={overlay.w}
                min={10}
                max={SLIDE_WIDTH}
                onChange={(v) => updateOverlay(slideId, overlay.id, { w: v })}
              />
              <NumberField
                label="H"
                value={overlay.h}
                min={10}
                max={SLIDE_HEIGHT}
                onChange={(v) => updateOverlay(slideId, overlay.id, { h: v })}
              />
            </Section>

            <button
              type="button"
              onClick={() => removeOverlay(slideId, overlay.id)}
              className="w-full rounded border border-red-500/40 px-2 py-1.5 text-xs text-red-300 transition hover:border-red-500 hover:bg-red-500/10"
            >
              Delete
            </button>

            <p className="text-[10px] leading-relaxed text-editor-dim">
              좌표는 1280×720 원본 기준입니다 (내보내기 시 1920×1080로 확대).
            </p>
          </div>
        ) : (
          <TextOverlayPropertiesSection slideId={slideId} overlay={overlay} />
        )}
      </div>
    </aside>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-editor-dim">
        {title}
      </div>
      <div className="grid grid-cols-2 gap-2">{children}</div>
    </div>
  );
}

type NumberFieldProps = {
  label: string;
  value: number;
  min?: number;
  max?: number;
  onChange: (v: number) => void;
};

function NumberField({ label, value, min, max, onChange }: NumberFieldProps) {
  return (
    <label className="flex items-center gap-1.5 rounded border border-editor-border bg-editor-bg px-1.5 py-1 text-xs">
      <span className="w-4 font-mono text-editor-dim">{label}</span>
      <input
        type="number"
        value={Math.round(value)}
        min={min}
        max={max}
        onFocus={(e) => e.target.select()}
        onChange={(e) => {
          const n = Number(e.target.value);
          if (Number.isFinite(n)) onChange(n);
        }}
        className="w-full bg-transparent text-editor-text outline-none"
      />
    </label>
  );
}
