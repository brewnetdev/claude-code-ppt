import { WATERMARK_DEFAULT_LINES } from '../watermark/watermark';

// Shared presentational watermark controls (checkbox + multi-line textarea +
// apply). Used by both the document editor (DocumentPropertiesSection) and the
// deck editor (DeckWatermarkSection); each owns its state and wires its own
// apply target (a flowing-doc layer vs. per-slide spans).
type Props = {
  enabled: boolean;
  text: string;
  toggleLabel: string;
  onToggle: (enabled: boolean) => void;
  onTextChange: (text: string) => void;
  onTextBlur?: () => void;
  onApply: () => void;
};

export function WatermarkControls({
  enabled,
  text,
  toggleLabel,
  onToggle,
  onTextChange,
  onTextBlur,
  onApply,
}: Props) {
  return (
    <>
      <label className="mb-2 flex cursor-pointer items-center gap-2 text-xs text-editor-text">
        <input type="checkbox" checked={enabled} onChange={(e) => onToggle(e.target.checked)} />
        {toggleLabel}
      </label>
      <textarea
        value={text}
        onChange={(e) => onTextChange(e.target.value)}
        onBlur={onTextBlur}
        rows={2}
        placeholder={WATERMARK_DEFAULT_LINES.join('\n')}
        className="w-full resize-y rounded border border-editor-border bg-editor-bg px-2 py-1 text-[11px] text-editor-text outline-none"
      />
      <div className="mt-1 flex items-center gap-2">
        <button
          type="button"
          disabled={!enabled}
          onClick={onApply}
          className="rounded border border-editor-border px-2 py-1 text-[11px] text-editor-dim transition hover:border-editor-accent hover:text-editor-accent disabled:opacity-40"
        >
          텍스트 적용
        </button>
        <span className="text-[10px] text-editor-dim">한 줄에 하나씩 (대각선)</span>
      </div>
    </>
  );
}
