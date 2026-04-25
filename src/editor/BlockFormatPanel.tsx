import { useCallback, useEffect, useRef, useState } from 'react';
import { DATA_BLOCK_ID } from '../scene/blockId';
import { useDeckStore } from '../scene/store';
import { ColorSwatchButton } from './ColorPicker';

const PRESETS = [
  { value: 't-title', label: 'H1' },
  { value: 't-h2', label: 'H2' },
  { value: 't-h3', label: 'H3' },
  { value: 't-body', label: 'P' },
] as const;

type PresetClass = (typeof PRESETS)[number]['value'];
const PRESET_SET = new Set<string>(PRESETS.map((p) => p.value));

const ALIGNS = [
  { value: 'left', label: '좌' },
  { value: 'center', label: '중앙' },
  { value: 'right', label: '우' },
] as const;
type AlignValue = (typeof ALIGNS)[number]['value'];

// Brewnet flex-container classes use justify-content for visual alignment;
// text-align has no effect on flex containers, so we mirror onto both so
// nested text and the flex row both align consistently.
const FLEX_CONTAINER_CLASSES = new Set(['t-chapter', 't-h2']);

function findBlock(id: string | null): HTMLElement | null {
  if (!id) return null;
  const host = document.querySelector<HTMLElement>('.slide-canvas-host');
  if (!host) return null;
  return host.querySelector<HTMLElement>(`[${DATA_BLOCK_ID}="${id}"]`);
}

// Dispatch the synthetic input event on the block itself. SlideRenderer's
// listener is attached to the div that wraps the dangerouslySetInnerHTML
// content (i.e., a *descendant* of `.slide-canvas-host`), so bubbling from
// the host element would never reach it. Dispatching on `el` (which lives
// inside that wrapper) makes the event bubble correctly up through root.
function notifyInput(el: HTMLElement): void {
  el.dispatchEvent(new InputEvent('input', { bubbles: true }));
}

function readPreset(el: HTMLElement): PresetClass | null {
  for (const c of Array.from(el.classList)) {
    if (PRESET_SET.has(c)) return c as PresetClass;
  }
  return null;
}

function readAlign(el: HTMLElement): AlignValue {
  const inline = el.style.textAlign;
  if (inline === 'center' || inline === 'right' || inline === 'left') return inline;
  if (FLEX_CONTAINER_CLASSES.has(el.classList[0] ?? '')) {
    const j = el.style.justifyContent;
    if (j === 'center') return 'center';
    if (j === 'flex-end') return 'right';
  }
  return 'left';
}

function readBg(el: HTMLElement): string | null {
  const v = el.style.background || el.style.backgroundColor;
  if (!v || v === 'transparent' || v === 'rgba(0, 0, 0, 0)') return null;
  return v;
}

function readSize(el: HTMLElement): { w: number | null; h: number | null } {
  const w = el.style.width ? parseFloat(el.style.width) : null;
  const h = el.style.height ? parseFloat(el.style.height) : null;
  return {
    w: Number.isFinite(w as number) ? (w as number) : null,
    h: Number.isFinite(h as number) ? (h as number) : null,
  };
}

function readSidePx(value: string): number {
  if (!value) return 0;
  const n = parseFloat(value);
  return Number.isFinite(n) ? n : 0;
}

function readPadding(el: HTMLElement): { t: number; r: number; b: number; l: number } {
  return {
    t: readSidePx(el.style.paddingTop),
    r: readSidePx(el.style.paddingRight),
    b: readSidePx(el.style.paddingBottom),
    l: readSidePx(el.style.paddingLeft),
  };
}

function readLinks(el: HTMLElement): HTMLAnchorElement[] {
  return Array.from(el.querySelectorAll<HTMLAnchorElement>('a'));
}

type Props = {
  blockId: string;
};

export function BlockFormatPanel({ blockId }: Props) {
  // Tick is bumped after every mutation so we re-read live DOM into local state.
  const [tick, setTick] = useState(0);
  const refresh = useCallback(() => setTick((t) => t + 1), []);

  // We intentionally don't memo el — selection or DOM swap could move it,
  // so re-query on every render. Cost is negligible (single querySelector).
  const el = findBlock(blockId);

  // Re-read whenever selection changes or after our own mutations.
  useEffect(() => {
    refresh();
  }, [blockId, refresh]);

  // Mirror selection onto the live DOM so users get a visible ring on the
  // selected block. We toggle the class on the *current* block element each
  // render, and the cleanup of the matching effect strips it on unmount /
  // when blockId changes.
  useEffect(() => {
    const current = findBlock(blockId);
    if (!current) return;
    current.classList.add('selected-block');
    return () => {
      current.classList.remove('selected-block');
    };
  }, [blockId]);

  const removeSelectedBlock = () => {
    if (!el) return;
    // Capture the parent before detaching — el itself becomes orphaned and
    // events fired on it wouldn't bubble through the slide root anymore.
    // The parent (.slide-inner, etc.) lives inside SlideRenderer's root div,
    // so dispatching there bubbles correctly to trigger the debounced commit.
    const parent = el.parentElement;
    el.remove();
    useDeckStore.getState().setSelectedBlockId(null);
    parent?.dispatchEvent(new InputEvent('input', { bubbles: true }));
  };

  if (!el) {
    return (
      <p className="text-[11px] leading-relaxed text-editor-dim">
        선택된 블록을 찾을 수 없습니다. 슬라이드에서 블록을 다시 클릭해 주세요.
      </p>
    );
  }

  // Pull live values for the controls.
  const preset = readPreset(el);
  const align = readAlign(el);
  const bg = readBg(el);
  const { w, h } = readSize(el);
  const padding = readPadding(el);
  const links = readLinks(el);
  void tick;

  const updateLinkText = (anchor: HTMLAnchorElement, text: string) => {
    anchor.textContent = text;
    notifyInput(el);
    refresh();
  };

  const updateLinkHref = (anchor: HTMLAnchorElement, href: string) => {
    anchor.setAttribute('href', href);
    notifyInput(el);
    refresh();
  };

  const removeLink = (anchor: HTMLAnchorElement) => {
    anchor.remove();
    notifyInput(el);
    refresh();
  };

  const unwrapLink = (anchor: HTMLAnchorElement) => {
    const parent = anchor.parentNode;
    if (!parent) return;
    while (anchor.firstChild) parent.insertBefore(anchor.firstChild, anchor);
    parent.removeChild(anchor);
    notifyInput(el);
    refresh();
  };

  const setPreset = (next: PresetClass) => {
    PRESETS.forEach((p) => el.classList.remove(p.value));
    el.classList.add(next);
    notifyInput(el);
    refresh();
  };

  const setAlign = (next: AlignValue) => {
    el.style.textAlign = next;
    if (FLEX_CONTAINER_CLASSES.has(el.classList[0] ?? '')) {
      el.style.justifyContent = next === 'center' ? 'center' : next === 'right' ? 'flex-end' : 'flex-start';
    }
    notifyInput(el);
    refresh();
  };

  const setBg = (hex: string | null) => {
    if (hex) el.style.background = hex;
    else {
      el.style.background = '';
      el.style.backgroundColor = '';
    }
    notifyInput(el);
    refresh();
  };

  const setW = (next: number) => {
    if (next > 0) el.style.width = `${next}px`;
    else el.style.width = '';
    notifyInput(el);
    refresh();
  };

  const setH = (next: number) => {
    if (next > 0) el.style.height = `${next}px`;
    else el.style.height = '';
    notifyInput(el);
    refresh();
  };

  const setPadding = (side: 't' | 'r' | 'b' | 'l', next: number) => {
    const px = Math.max(0, Math.round(next));
    const prop = side === 't' ? 'paddingTop' : side === 'r' ? 'paddingRight' : side === 'b' ? 'paddingBottom' : 'paddingLeft';
    if (px > 0) el.style[prop] = `${px}px`;
    else el.style[prop] = '';
    notifyInput(el);
    refresh();
  };

  return (
    <div className="space-y-4">
      <div>
        <div className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-editor-dim">
          Block · {el.classList[0] ?? 'div'}
        </div>
        <div className="truncate text-[10px] text-editor-dim" title={blockId}>
          id: {blockId}
        </div>
      </div>

      <div>
        <div className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-editor-dim">
          Size
        </div>
        <div className="grid grid-cols-2 gap-2">
          <NumberField label="W" value={w ?? 0} onChange={setW} />
          <NumberField label="H" value={h ?? 0} onChange={setH} />
        </div>
        <p className="mt-1 text-[10px] text-editor-dim">0 = 자동 (인라인 스타일 제거).</p>
      </div>

      <div>
        <div className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-editor-dim">
          Padding (px)
        </div>
        <div className="grid grid-cols-2 gap-2">
          <NumberField label="T" value={padding.t} onChange={(v) => setPadding('t', v)} />
          <NumberField label="R" value={padding.r} onChange={(v) => setPadding('r', v)} />
          <NumberField label="B" value={padding.b} onChange={(v) => setPadding('b', v)} />
          <NumberField label="L" value={padding.l} onChange={(v) => setPadding('l', v)} />
        </div>
        <p className="mt-1 text-[10px] text-editor-dim">0 = 인라인 패딩 제거.</p>
      </div>

      <div>
        <div className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-editor-dim">
          Background
        </div>
        <ColorSwatchButton label="Background" value={bg} onChange={setBg} />
      </div>

      {links.length > 0 ? (
        <div>
          <div className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-editor-dim">
            Links ({links.length})
          </div>
          <div className="space-y-2">
            {links.map((a, i) => (
              <LinkRow
                key={i}
                anchor={a}
                onTextChange={(t) => updateLinkText(a, t)}
                onHrefChange={(h) => updateLinkHref(a, h)}
                onUnwrap={() => unwrapLink(a)}
                onRemove={() => removeLink(a)}
              />
            ))}
          </div>
        </div>
      ) : null}

      <div>
        <div className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-editor-dim">
          Align
        </div>
        <div className="grid grid-cols-3 gap-1">
          {ALIGNS.map((a) => (
            <SegButton key={a.value} active={align === a.value} onClick={() => setAlign(a.value)}>
              {a.label}
            </SegButton>
          ))}
        </div>
        {FLEX_CONTAINER_CLASSES.has(el.classList[0] ?? '') ? (
          <p className="mt-1 text-[10px] text-editor-dim">
            이 블록은 ::before 데코가 함께 정렬됩니다.
          </p>
        ) : null}
      </div>

      <div>
        <div className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-editor-dim">
          Size preset
        </div>
        <div className="grid grid-cols-4 gap-1">
          {PRESETS.map((p) => (
            <SegButton key={p.value} active={preset === p.value} onClick={() => setPreset(p.value)}>
              {p.label}
            </SegButton>
          ))}
        </div>
      </div>

      <button
        type="button"
        onClick={removeSelectedBlock}
        className="w-full rounded border border-red-500/40 px-2 py-1.5 text-xs text-red-300 transition hover:border-red-500 hover:bg-red-500/10"
      >
        Delete block
      </button>
    </div>
  );
}

type NumberFieldProps = {
  label: string;
  value: number;
  onChange: (v: number) => void;
};

function NumberField({ label, value, onChange }: NumberFieldProps) {
  const rounded = Math.round(value);
  // Local draft so backspace can clear the field without snapping back to "0",
  // and so live DOM reads don't fight the user's typing.
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
        min={0}
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
        className="w-full bg-transparent text-editor-text outline-none"
      />
    </label>
  );
}

type LinkRowProps = {
  anchor: HTMLAnchorElement;
  onTextChange: (text: string) => void;
  onHrefChange: (href: string) => void;
  onUnwrap: () => void;
  onRemove: () => void;
};

function LinkRow({ anchor, onTextChange, onHrefChange, onUnwrap, onRemove }: LinkRowProps) {
  const text = anchor.textContent ?? '';
  const href = anchor.getAttribute('href') ?? '';
  return (
    <div className="space-y-1.5 rounded border border-editor-border bg-editor-bg p-2">
      <label className="flex items-center gap-1.5 text-xs">
        <span className="w-10 shrink-0 font-mono text-[10px] text-editor-dim">텍스트</span>
        <input
          type="text"
          value={text}
          onChange={(e) => onTextChange(e.target.value)}
          className="w-full bg-transparent text-editor-text outline-none"
        />
      </label>
      <label className="flex items-center gap-1.5 text-xs">
        <span className="w-10 shrink-0 font-mono text-[10px] text-editor-dim">URL</span>
        <input
          type="url"
          value={href}
          onChange={(e) => onHrefChange(e.target.value)}
          className="w-full bg-transparent text-editor-text outline-none"
          placeholder="https://"
        />
      </label>
      <div className="grid grid-cols-2 gap-1">
        <button
          type="button"
          onClick={onUnwrap}
          className="rounded border border-editor-border px-2 py-0.5 text-[10px] text-editor-dim transition hover:border-editor-accent hover:text-editor-accent"
          title="링크만 제거하고 텍스트는 유지"
        >
          링크 해제
        </button>
        <button
          type="button"
          onClick={onRemove}
          className="rounded border border-red-500/30 px-2 py-0.5 text-[10px] text-red-300 transition hover:border-red-500 hover:bg-red-500/10"
          title="링크와 텍스트 모두 삭제"
        >
          삭제
        </button>
      </div>
    </div>
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
