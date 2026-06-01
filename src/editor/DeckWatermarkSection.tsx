import { useEffect, useState } from 'react';
import { useDeckStore } from '../scene/store';
import {
  extractWatermarkLines,
  slideHasWatermark,
  WATERMARK_DEFAULT_LINES,
} from '../watermark/watermark';
import { WatermarkControls } from './WatermarkControls';

// Deck-mode brand watermark control (shown in the no-selection Properties view).
// Toggling applies/removes the watermark across every slide; the text is
// editable (one line per row, repeated diagonally — same spec as the document
// watermark and the `watermark` skill).
export function DeckWatermarkSection() {
  const slides = useDeckStore((s) => s.slides);
  const setWatermark = useDeckStore((s) => s.setWatermarkAllSlides);
  const [enabled, setEnabled] = useState(false);
  const [text, setText] = useState(WATERMARK_DEFAULT_LINES.join('\n'));

  // Reflect the deck's current state (and re-seed after apply/undo).
  useEffect(() => {
    const on = slides.some((s) => slideHasWatermark(s.html));
    setEnabled(on);
    if (on) {
      const first = slides.find((s) => slideHasWatermark(s.html));
      if (first) setText(extractWatermarkLines(first.html).join('\n'));
    }
  }, [slides]);

  const lines = () => text.split('\n').map((l) => l.trim()).filter(Boolean);

  return (
    <div>
      <div className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-editor-dim">
        Watermark (워터마크)
      </div>
      <WatermarkControls
        enabled={enabled}
        text={text}
        toggleLabel="모든 슬라이드에 워터마크 표시"
        onToggle={(next) => {
          setEnabled(next);
          setWatermark(next, lines());
        }}
        onTextChange={setText}
        onTextBlur={() => {
          if (enabled) setWatermark(true, lines());
        }}
        onApply={() => setWatermark(true, lines())}
      />
    </div>
  );
}
