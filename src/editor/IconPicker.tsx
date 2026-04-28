import { useEffect, useRef, useState } from 'react';

type IconCategory = {
  label: string;
  icons: string[];
};

const CATEGORIES: IconCategory[] = [
  {
    label: '컬러 라벨',
    icons: ['🟢', '🔵', '🟣', '🟡', '🟠', '🔴', '🟤', '⚪', '⚫'],
  },
  {
    label: '레벨/단계',
    icons: ['🚀', '🪐', '🔬', '🎯', '🏁', '🏆', '⭐', '✨', '🌟', '💫'],
  },
  {
    label: '데이터/차트',
    icons: ['📊', '📈', '📉', '🗺', '📌', '📍', '🧭', '📋', '📁', '📂', '🗂', '📚'],
  },
  {
    label: '강조/주의',
    icons: ['⚡', '🔥', '💡', '⚠️', '❗', '❓', '✅', '❌', '🚫', '👉', '✋', '🛑'],
  },
  {
    label: '도구/링크',
    icons: ['🔗', '🔧', '🛠', '⚙️', '🧩', '🔑', '🔒', '📎', '✏️', '📝', '🖊', '🧠'],
  },
  {
    label: '커뮤니케이션',
    icons: ['💬', '💭', '📣', '📢', '🔔', '👀', '👍', '👎', '🤝', '🙌', '👏', '🙏'],
  },
];

type Props = {
  className?: string;
};

// Find the editable host node currently focused inside .slide-canvas-host.
// We need to restore selection there after the popover closes, since clicking
// the popover button can move focus out of contenteditable.
function captureCanvasSelection(): Range | null {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) return null;
  const range = sel.getRangeAt(0);
  const node =
    range.commonAncestorContainer.nodeType === Node.ELEMENT_NODE
      ? (range.commonAncestorContainer as Element)
      : range.commonAncestorContainer.parentElement;
  if (!node || !node.closest('.slide-canvas-host')) return null;
  return range.cloneRange();
}

function insertEmojiAtRange(range: Range, emoji: string): void {
  range.deleteContents();
  const text = document.createTextNode(emoji);
  range.insertNode(text);
  range.setStartAfter(text);
  range.collapse(true);
  const sel = window.getSelection();
  if (sel) {
    sel.removeAllRanges();
    sel.addRange(range);
  }
  const target =
    text.parentElement ?? (range.commonAncestorContainer as HTMLElement | null);
  target?.dispatchEvent(new InputEvent('input', { bubbles: true }));
}

export function IconPicker({ className }: Props) {
  const [open, setOpen] = useState(false);
  const savedRangeRef = useRef<Range | null>(null);
  const popoverRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const onDocMouseDown = (e: MouseEvent) => {
      const target = e.target as Node | null;
      if (!target) return;
      if (popoverRef.current?.contains(target)) return;
      setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', onDocMouseDown);
    window.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDocMouseDown);
      window.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const handleTriggerMouseDown = () => {
    // Capture selection BEFORE the click moves focus out of the editable.
    savedRangeRef.current = captureCanvasSelection();
  };

  const handlePick = (emoji: string) => {
    const range = savedRangeRef.current;
    if (!range) {
      setOpen(false);
      return;
    }
    insertEmojiAtRange(range, emoji);
    savedRangeRef.current = null;
    setOpen(false);
  };

  return (
    <div className={`relative ${className ?? ''}`}>
      <button
        type="button"
        onMouseDown={handleTriggerMouseDown}
        onClick={() => setOpen((v) => !v)}
        title="아이콘/심볼 삽입 (커서 위치에 입력)"
        className="rounded border border-editor-border px-2.5 py-1 text-xs font-medium text-editor-text transition hover:border-editor-accent hover:text-editor-accent"
      >
        ✨ Icons
      </button>
      {open ? (
        <div
          ref={popoverRef}
          className="absolute right-0 top-full z-50 mt-1 w-[320px] rounded-md border border-editor-border bg-editor-panel p-3 shadow-2xl"
        >
          <div className="mb-2 flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-editor-dim">
              아이콘 삽입
            </span>
            {savedRangeRef.current ? null : (
              <span className="text-[10px] text-red-300">
                먼저 텍스트 위치에 커서를 두세요
              </span>
            )}
          </div>
          <div className="max-h-[360px] space-y-3 overflow-y-auto pr-1">
            {CATEGORIES.map((cat) => (
              <div key={cat.label}>
                <div className="mb-1 text-[10px] font-medium uppercase tracking-wide text-editor-dim">
                  {cat.label}
                </div>
                <div className="grid grid-cols-9 gap-1">
                  {cat.icons.map((icon) => (
                    <button
                      key={icon}
                      type="button"
                      // preventDefault on mousedown so the canvas selection
                      // we captured at trigger-time isn't blown away by the
                      // popover button stealing focus.
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => handlePick(icon)}
                      title={icon}
                      className="flex h-7 w-7 items-center justify-center rounded text-base hover:bg-editor-border/40"
                    >
                      {icon}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
