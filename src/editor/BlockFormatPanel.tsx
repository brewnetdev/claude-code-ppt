import { useCallback, useEffect, useRef, useState } from 'react';
import type { TextOverlay } from '../canvas/OverlayLayer';
import { DATA_BLOCK_ID } from '../scene/blockId';
import { SLIDE_WIDTH } from '../scene/constants';
import { useDeckStore } from '../scene/store';

const PRESET_TO_OVERLAY: Record<string, NonNullable<TextOverlay['preset']>> = {
  't-title': 'h1',
  't-h2': 'h2',
  't-h3': 'h3',
  't-body': 'p',
};

let floatSeq = 0;
const makeFloatId = () => `ovl-float-${Date.now()}-${++floatSeq}`;

// Scope to the main canvas only. Sidebar thumbnails reuse `.slide-canvas-host`
// with the same data-block-id values, and they appear earlier in DOM order;
// querying by class would resolve to a thumbnail instead of the live editor.
function findBlock(id: string | null): HTMLElement | null {
  if (!id) return null;
  const host = document.querySelector<HTMLElement>('[data-canvas-role="main"]');
  if (!host) return null;
  return host.querySelector<HTMLElement>(`[${DATA_BLOCK_ID}="${id}"]`);
}

function notifyInput(el: HTMLElement): void {
  el.dispatchEvent(new InputEvent('input', { bubbles: true }));
}

function readSize(el: HTMLElement): { w: number | null; h: number | null } {
  const w = el.style.width ? parseFloat(el.style.width) : null;
  const h = el.style.height ? parseFloat(el.style.height) : null;
  return {
    w: Number.isFinite(w as number) ? (w as number) : null,
    h: Number.isFinite(h as number) ? (h as number) : null,
  };
}

type Props = {
  blockId: string;
};

export function BlockFormatPanel({ blockId }: Props) {
  const [tick, setTick] = useState(0);
  const refresh = useCallback(() => setTick((t) => t + 1), []);

  // Subscribing to `revision` keeps `el` honest across SlideRenderer remounts.
  const revision = useDeckStore((s) => s.revision);
  // Subscribe to clipboard so Paste buttons disable/enable reactively.
  const clipboard = useDeckStore((s) => s.clipboard);
  const canPaste = clipboard?.kind === 'block';

  const el = findBlock(blockId);

  useEffect(() => {
    refresh();
  }, [blockId, refresh]);

  // Self-heal a transient `el = null` from a same-tick remount race.
  const RETRY_LIMIT = 4;
  useEffect(() => {
    if (el || tick >= RETRY_LIMIT) return;
    const raf = requestAnimationFrame(() => refresh());
    return () => cancelAnimationFrame(raf);
  }, [el, tick, refresh]);

  useEffect(() => {
    setTick(0);
  }, [blockId]);

  // Re-bind the selection ring on revision bumps so the highlight follows
  // remounted nodes.
  useEffect(() => {
    const current = findBlock(blockId);
    if (!current) return;
    current.classList.add('selected-block');
    return () => {
      current.classList.remove('selected-block');
    };
  }, [blockId, revision]);

  const currentSlideId = (): string | null => {
    const { slides, currentIndex } = useDeckStore.getState();
    return slides[currentIndex]?.id ?? null;
  };

  const handleCopy = () => {
    const slideId = currentSlideId();
    if (!slideId) return;
    useDeckStore.getState().copyBlock(slideId, blockId);
  };

  const handlePaste = (where: 'above' | 'below') => {
    const slideId = currentSlideId();
    if (!slideId) return;
    useDeckStore.getState().pasteBlock(slideId, blockId, where);
  };

  const handleDelete = () => {
    const slideId = currentSlideId();
    if (!slideId) return;
    useDeckStore.getState().removeBlock(slideId, blockId);
  };

  // Live block bounding box in 1280×720 authoring coordinates.
  const readBox = (): { x: number; y: number; w: number; h: number } | null => {
    if (!el) return null;
    const host = document.querySelector<HTMLElement>('[data-canvas-role="main"]');
    if (!host) return null;
    const hostRect = host.getBoundingClientRect();
    const scale = hostRect.width / SLIDE_WIDTH;
    if (!Number.isFinite(scale) || scale <= 0) return null;
    const r = el.getBoundingClientRect();
    return {
      x: Math.round((r.left - hostRect.left) / scale),
      y: Math.round((r.top - hostRect.top) / scale),
      w: Math.max(40, Math.round(r.width / scale)),
      h: Math.max(24, Math.round(r.height / scale)),
    };
  };

  // Promote in-flow block to a free-positioned text overlay. Editing X/Y/W/H
  // implicitly triggers this — flex children have no absolute coords.
  const floatBlockToOverlay = (
    override?: Partial<{ x: number; y: number; w: number; h: number }>,
  ) => {
    if (!el) return;
    const box = readBox();
    if (!box) return;

    const clone = el.cloneNode(true) as HTMLElement;
    clone.querySelectorAll('.block-drag-handle').forEach((n) => n.remove());
    const html = clone.innerHTML;

    const presetClass = Array.from(el.classList).find((c) => c in PRESET_TO_OVERLAY);
    const preset = presetClass ? PRESET_TO_OVERLAY[presetClass] : null;

    const inlineAlign = el.style.textAlign;
    const align: TextOverlay['align'] =
      inlineAlign === 'center' || inlineAlign === 'right' || inlineAlign === 'left'
        ? inlineAlign
        : 'left';

    const overlay: TextOverlay = {
      id: makeFloatId(),
      kind: 'text',
      x: override?.x ?? box.x,
      y: override?.y ?? box.y,
      w: override?.w ?? box.w,
      h: override?.h ?? box.h,
      html,
      bg: null,
      align,
      preset,
    };

    const { slides, currentIndex, floatBlock } = useDeckStore.getState();
    const slideId = slides[currentIndex]?.id;
    if (!slideId) return;

    floatBlock(slideId, blockId, overlay);
  };

  // Code/terminal wrappers carry their visual chrome (padding, border,
  // background) on the wrapper class and their editable source on
  // `data-code-*` attributes. Promoting them to a TextOverlay would
  // discard both — and would also flip selection from block→overlay,
  // unmounting the CodeBlockEditPanel mid-edit. For those blocks, keep
  // the live element in place and switch it to absolute positioning.
  const handlePositionChange = (override: Partial<{ x: number; y: number }>) => {
    if (!el) return;
    const isCodeLike =
      el.classList.contains('code-block') ||
      el.classList.contains('terminal') ||
      el.hasAttribute('data-code-source');
    if (!isCodeLike) {
      floatBlockToOverlay(override);
      return;
    }
    if (el.style.position !== 'absolute') {
      // First-time flex → absolute transition. Pin the rendered size and seed
      // both axes from the DOM box so the element stays where the user sees it.
      const b = readBox();
      if (!b) return;
      if (!el.style.width) el.style.width = `${b.w}px`;
      if (!el.style.height) el.style.height = `${b.h}px`;
      el.style.position = 'absolute';
      el.style.left = `${override.x ?? b.x}px`;
      el.style.top = `${override.y ?? b.y}px`;
    } else {
      // Subsequent edits: only touch the axis the user actually changed.
      // Re-reading the DOM box and rewriting the other axis caused 1-2px
      // drift per edit (Math.round on getBoundingClientRect / scale), which
      // surfaced as the unchanged field "moving proportionally".
      if (override.x !== undefined) el.style.left = `${override.x}px`;
      if (override.y !== undefined) el.style.top = `${override.y}px`;
    }
    notifyInput(el);
    refresh();
  };

  // Always render the X/Y/W/H form, even when the live block lookup is
  // pending. Showing nothing (or an opaque "block not found" message) is
  // worse than a disabled form: the user has no anchor for what's wrong.
  const size = el ? readSize(el) : { w: null, h: null };
  const box = el ? readBox() : null;
  const blockTag = el ? el.classList[0] ?? 'div' : 'pending';
  void tick;

  // When the user pins an explicit W/H, lock flex sizing so the value
  // wins against any source flex-grow (inline `style="flex:1"` is common
  // on table wrappers, and class rules like `.two-col { flex: 1 }` would
  // otherwise stretch the block beyond the typed height). When both
  // dimensions are cleared, drop the inline flex override so the original
  // CSS / class flow takes over again.
  const reconcileFlexLock = () => {
    if (!el) return;
    const hasExplicit = !!(el.style.width || el.style.height);
    if (hasExplicit) el.style.flex = '0 0 auto';
    else el.style.flex = '';
  };

  const setW = (next: number) => {
    if (!el) return;
    if (next > 0) el.style.width = `${next}px`;
    else el.style.width = '';
    reconcileFlexLock();
    notifyInput(el);
    refresh();
  };

  const setH = (next: number) => {
    if (!el) return;
    if (next > 0) el.style.height = `${next}px`;
    else el.style.height = '';
    reconcileFlexLock();
    notifyInput(el);
    refresh();
  };

  const disabled = !el;

  return (
    <div className="space-y-4">
      <div>
        <div className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-editor-dim">
          Block · {blockTag}
        </div>
        <div className="truncate text-[10px] text-editor-dim" title={blockId}>
          id: {blockId}
        </div>
      </div>

      {disabled ? (
        <div className="rounded border border-amber-500/30 bg-amber-500/5 px-2 py-1.5 text-[10px] leading-relaxed text-amber-300">
          블록을 찾는 중… 슬라이드에서 다시 클릭해 보세요. (자동 재시도 중)
        </div>
      ) : null}

      <div>
        <div className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-editor-dim">
          Position
        </div>
        <div className="grid grid-cols-2 gap-2">
          <NumberField
            label="X"
            value={box?.x ?? 0}
            disabled={disabled}
            onChange={(v) => handlePositionChange({ x: v })}
          />
          <NumberField
            label="Y"
            value={box?.y ?? 0}
            disabled={disabled}
            onChange={(v) => handlePositionChange({ y: v })}
          />
        </div>
        <p className="mt-1 text-[10px] leading-relaxed text-editor-dim">
          X · Y 편집 시 자동으로 자유 위치 모드로 전환됩니다 (flex 흐름 → 절대 좌표).
        </p>
      </div>

      <div>
        <div className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-editor-dim">
          Size
        </div>
        <div className="grid grid-cols-2 gap-2">
          <NumberField
            label="W"
            value={size.w ?? box?.w ?? 0}
            disabled={disabled}
            onChange={setW}
          />
          <NumberField
            label="H"
            value={size.h ?? box?.h ?? 0}
            disabled={disabled}
            onChange={setH}
          />
        </div>
        <p className="mt-1 text-[10px] text-editor-dim">0 = 자동 (인라인 스타일 제거).</p>
      </div>

      <div>
        <div className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-editor-dim">
          Actions
        </div>
        <div className="grid grid-cols-4 gap-1">
          <button
            type="button"
            onClick={handleCopy}
            disabled={disabled}
            title="Copy block (Cmd/Ctrl+C)"
            className="rounded border border-editor-border px-1 py-1.5 text-[11px] text-editor-text transition hover:border-editor-accent hover:bg-editor-accent/10 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Copy
          </button>
          <button
            type="button"
            onClick={() => handlePaste('above')}
            disabled={disabled || !canPaste}
            title="Paste above"
            className="rounded border border-editor-border px-1 py-1.5 text-[11px] text-editor-text transition hover:border-editor-accent hover:bg-editor-accent/10 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Paste ▲
          </button>
          <button
            type="button"
            onClick={() => handlePaste('below')}
            disabled={disabled || !canPaste}
            title="Paste below (Cmd/Ctrl+V)"
            className="rounded border border-editor-border px-1 py-1.5 text-[11px] text-editor-text transition hover:border-editor-accent hover:bg-editor-accent/10 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Paste ▼
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={disabled}
            title="Delete block (Del / Backspace)"
            className="rounded border border-red-500/40 px-1 py-1.5 text-[11px] text-red-300 transition hover:border-red-500 hover:bg-red-500/10 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

type NumberFieldProps = {
  label: string;
  value: number;
  disabled?: boolean;
  onChange: (v: number) => void;
};

function NumberField({ label, value, disabled, onChange }: NumberFieldProps) {
  const rounded = Math.round(value);
  const [draft, setDraft] = useState<string>(() => String(rounded));
  const focusedRef = useRef(false);
  useEffect(() => {
    if (!focusedRef.current) setDraft(String(rounded));
  }, [rounded]);
  return (
    <label
      className={`flex items-center gap-1.5 rounded border border-editor-border bg-editor-bg px-1.5 py-1 text-xs ${
        disabled ? 'opacity-50' : ''
      }`}
    >
      <span className="w-6 font-mono text-editor-dim">{label}</span>
      <input
        type="number"
        value={draft}
        min={0}
        disabled={disabled}
        onFocus={(e) => {
          focusedRef.current = true;
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
        className="w-full bg-transparent text-editor-text outline-none disabled:cursor-not-allowed"
      />
    </label>
  );
}
