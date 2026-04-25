import { useEffect, useRef, useState } from 'react';
import type { TextOverlay } from '../canvas/OverlayLayer';
import { SLIDE_HEIGHT, SLIDE_WIDTH } from '../scene/constants';
import { useDeckStore } from '../scene/store';
import { ColorSwatchButton } from './ColorPicker';

const PRESETS: { value: NonNullable<TextOverlay['preset']>; label: string }[] = [
  { value: 'h1', label: 'H1' },
  { value: 'h2', label: 'H2' },
  { value: 'h3', label: 'H3' },
  { value: 'p', label: 'P' },
];

const ALIGNS: { value: NonNullable<TextOverlay['align']>; label: string }[] = [
  { value: 'left', label: '좌' },
  { value: 'center', label: '중앙' },
  { value: 'right', label: '우' },
];

type Padding = NonNullable<TextOverlay['padding']>;

function setSide(prev: Padding | undefined, side: keyof Padding, value: number): Padding {
  const base: Padding = prev ?? { t: 0, r: 0, b: 0, l: 0 };
  return { ...base, [side]: Math.max(0, Math.round(value)) };
}

type Props = {
  slideId: string;
  overlay: TextOverlay;
};

export function TextOverlayPropertiesSection({ slideId, overlay }: Props) {
  const updateOverlay = useDeckStore((s) => s.updateOverlay);
  const removeOverlay = useDeckStore((s) => s.removeOverlay);

  const patch = (p: Partial<TextOverlay>) => updateOverlay(slideId, overlay.id, p);

  return (
    <div className="space-y-4">
      <div>
        <div className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-editor-dim">
          Overlay · Text
        </div>
        <div className="truncate text-[10px] text-editor-dim" title={overlay.id}>
          id: {overlay.id}
        </div>
      </div>

      <Section title="Position">
        <NumberField
          label="X"
          value={overlay.x}
          min={0}
          max={SLIDE_WIDTH}
          onChange={(v) => patch({ x: v })}
        />
        <NumberField
          label="Y"
          value={overlay.y}
          min={0}
          max={SLIDE_HEIGHT}
          onChange={(v) => patch({ y: v })}
        />
      </Section>

      <Section title="Size">
        <NumberField
          label="W"
          value={overlay.w}
          min={20}
          max={SLIDE_WIDTH}
          onChange={(v) => patch({ w: v })}
        />
        <NumberField
          label="H"
          value={overlay.h}
          min={20}
          max={SLIDE_HEIGHT}
          onChange={(v) => patch({ h: v })}
        />
      </Section>

      <Section title="Padding (px)">
        <NumberField
          label="T"
          value={overlay.padding?.t ?? 0}
          min={0}
          max={400}
          onChange={(v) => patch({ padding: setSide(overlay.padding, 't', v) })}
        />
        <NumberField
          label="R"
          value={overlay.padding?.r ?? 0}
          min={0}
          max={400}
          onChange={(v) => patch({ padding: setSide(overlay.padding, 'r', v) })}
        />
        <NumberField
          label="B"
          value={overlay.padding?.b ?? 0}
          min={0}
          max={400}
          onChange={(v) => patch({ padding: setSide(overlay.padding, 'b', v) })}
        />
        <NumberField
          label="L"
          value={overlay.padding?.l ?? 0}
          min={0}
          max={400}
          onChange={(v) => patch({ padding: setSide(overlay.padding, 'l', v) })}
        />
      </Section>

      <div>
        <div className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-editor-dim">
          Background
        </div>
        <ColorSwatchButton
          label="Background"
          value={overlay.bg}
          onChange={(hex) => patch({ bg: hex })}
        />
      </div>

      <div>
        <div className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-editor-dim">
          Align
        </div>
        <div className="grid grid-cols-3 gap-1">
          {ALIGNS.map((a) => (
            <SegButton
              key={a.value}
              active={(overlay.align ?? 'left') === a.value}
              onClick={() => patch({ align: a.value })}
            >
              {a.label}
            </SegButton>
          ))}
        </div>
      </div>

      <div>
        <div className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-editor-dim">
          Size preset
        </div>
        <div className="grid grid-cols-4 gap-1">
          {PRESETS.map((p) => (
            <SegButton
              key={p.value}
              active={overlay.preset === p.value}
              onClick={() => patch({ preset: p.value })}
            >
              {p.label}
            </SegButton>
          ))}
        </div>
        <div className="mt-2">
          <NumberField
            label="px"
            value={overlay.fontSizePx ?? 0}
            min={0}
            max={200}
            onChange={(v) => patch({ fontSizePx: v > 0 ? v : undefined })}
          />
          <p className="mt-1 text-[10px] text-editor-dim">
            0 = 프리셋 기본 크기. 양수 입력 시 해당 px로 덮어씁니다.
          </p>
        </div>
      </div>

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
  const rounded = Math.round(value);
  // Local draft so backspace can clear the field without snapping back to "0",
  // and so external updates (drag, undo) don't fight the user's typing.
  const [draft, setDraft] = useState<string>(() => String(rounded));
  const focusedRef = useRef(false);
  useEffect(() => {
    if (!focusedRef.current) setDraft(String(rounded));
  }, [rounded]);
  return (
    <label className="flex items-center gap-1.5 rounded border border-editor-border bg-editor-bg px-1.5 py-1 text-xs">
      <span className="w-6 font-mono text-editor-dim">{label}</span>
      <input
        type="number"
        value={draft}
        min={min}
        max={max}
        onFocus={(e) => {
          focusedRef.current = true;
          // setTimeout: focus fires before mouseup positions the caret, which
          // would otherwise deselect immediately. Deferring lets select() win.
          setTimeout(() => e.target.select(), 0);
        }}
        onBlur={() => {
          focusedRef.current = false;
          if (draft.trim() === '' || !Number.isFinite(Number(draft))) {
            setDraft(String(Math.round(value)));
          }
        }}
        onChange={(e) => {
          const v = e.target.value;
          setDraft(v);
          if (v === '') return;
          const n = Number(v);
          if (Number.isFinite(n)) onChange(n);
        }}
        className="w-full bg-transparent text-editor-text outline-none"
      />
    </label>
  );
}

function SegButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded border px-2 py-1 text-[11px] font-medium transition ${
        active
          ? 'border-editor-accent bg-editor-accent/10 text-editor-accent'
          : 'border-editor-border text-editor-text hover:border-editor-accent'
      }`}
    >
      {children}
    </button>
  );
}
