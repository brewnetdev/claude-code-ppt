import { useCallback, useEffect, useRef, useState } from 'react';
import { DATA_BLOCK_ID } from '../scene/blockId';
import { SLIDE_WIDTH } from '../scene/constants';
import { useDeckStore } from '../scene/store';
import { FONT_GROUPS, loadGoogleFont } from './fontList';

// Block-level font/case targeting.
//
// font-family: code/terminal blocks have a `.code-block pre` / `.terminal pre`
// theme rule (specificity 0,1,1 + 0,2,1) that beats any inline style on the
// outer block via the descendant-rule-vs-inheritance cascade — setting
// fontFamily on the parent .code-block silently does nothing. Target the
// inner <pre> directly so the inline style wins by specificity tie-break.
// Other blocks (.t-title, .t-body, …) carry their font rule on the block
// element itself; inline style there overrides via specificity tie-break.
//
// text-transform: inherited; setting on the block propagates to descendants
// (including shiki's color-coded spans inside code blocks) without overriding
// per-token color, so we always target the block itself.
function firstFontFamilyName(stack: string): string {
  const first = stack.split(',')[0]?.trim() ?? '';
  return first.replace(/^["']|["']$/g, '').toLowerCase();
}

function findFontTarget(block: HTMLElement): HTMLElement {
  if (block.matches('.code-block, .terminal')) {
    const pre = block.querySelector(':scope > pre') as HTMLElement | null;
    if (pre) return pre;
  }
  return block;
}

function readBlockFontKey(block: HTMLElement | null): string {
  if (!block) return '';
  const target = findFontTarget(block);
  const cs = getComputedStyle(target).fontFamily;
  if (!cs) return '';
  const tgt = firstFontFamilyName(cs);
  for (const g of FONT_GROUPS) {
    for (const f of g.entries) {
      if (firstFontFamilyName(f.cssStack) === tgt) {
        return `${f.cssStack}||${f.google ?? ''}`;
      }
    }
  }
  return '';
}

type CaseValue = 'none' | 'lowercase' | 'uppercase';
function readBlockCase(block: HTMLElement | null): CaseValue {
  if (!block) return 'none';
  const tt = block.style.textTransform;
  if (tt === 'lowercase' || tt === 'uppercase') return tt;
  return 'none';
}

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

  // X/Y edit: switch the live element to inline absolute positioning so the
  // block's wrapper class + style (font-size, color, JetBrains Mono on
  // .section-num, etc.) are 100% preserved. Promoting to a TextOverlay would
  // strip the outer class — `clone.innerHTML` drops it — and turn 96px
  // section numbers into 16px default-styled text, which is what the
  // "X/Y not applying" report actually was.
  const handlePositionChange = (override: Partial<{ x: number; y: number }>) => {
    if (!el) return;
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

  // Sample slides ship a variety of inline sizing constraints —
  // `flex:1` on table/two-col wrappers, `max-width:780px` on hero titles,
  // `min-height:120px` on architecture boxes, etc. Setting only `style.width`
  // / `style.height` is silently capped by these, which surfaces as
  // "W/H 입력이 안 먹는다" repeatedly. Centralize the policy here:
  // when the user pins an explicit value, that value is the binding
  // constraint — clear the opposing inline min/max for the same axis (we
  // don't override class-rule constraints). When the user clears (0/blank),
  // remove the inline value but keep the original min/max alone — they may
  // come from the source HTML and we don't have the original to restore.
  const applyDimension = (axis: 'width' | 'height', next: number) => {
    if (!el) return;
    if (next > 0) {
      el.style[axis] = `${next}px`;
      if (axis === 'width') {
        el.style.maxWidth = '';
        el.style.minWidth = '';
      } else {
        el.style.maxHeight = '';
        el.style.minHeight = '';
      }
    } else {
      el.style[axis] = '';
    }
    reconcileFlexLock();
    notifyInput(el);
    refresh();
  };

  const setW = (next: number) => applyDimension('width', next);
  const setH = (next: number) => applyDimension('height', next);

  const applyBlockFont = (value: string) => {
    if (!el) return;
    const target = findFontTarget(el);
    if (value === '') {
      target.style.fontFamily = '';
    } else {
      const [stack, google] = value.split('||');
      if (google) loadGoogleFont(google);
      target.style.fontFamily = stack;
    }
    notifyInput(el);
    refresh();
  };

  const applyBlockCase = (next: CaseValue) => {
    if (!el) return;
    // CSS text-transform handles the visual layer (inherits to descendants —
    // including text typed AFTER the toggle was set). The data-force-case
    // attribute marks the block for the beforeinput interceptor in
    // useSlideEditing, which substitutes the data on every `insertText` so
    // the underlying source text actually matches what the user sees. Two
    // layers guard against the "I typed a capital letter and it stayed
    // capital" bug that users hit when only the visual transform is in place.
    if (next === 'none') {
      el.style.textTransform = '';
      el.removeAttribute('data-force-case');
    } else {
      el.style.textTransform = next;
      el.setAttribute('data-force-case', next);
    }
    notifyInput(el);
    refresh();
  };

  const fontKey = readBlockFontKey(el);
  const caseValue = readBlockCase(el);

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
            testId="block-format-w"
          />
          <NumberField
            label="H"
            value={size.h ?? box?.h ?? 0}
            disabled={disabled}
            onChange={setH}
            testId="block-format-h"
          />
        </div>
        <p className="mt-1 text-[10px] text-editor-dim">0 = 자동 (인라인 스타일 제거).</p>
      </div>

      <div>
        <div className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-editor-dim">
          Font
        </div>
        <select
          data-testid="block-format-font"
          value={fontKey}
          disabled={disabled}
          onChange={(e) => applyBlockFont(e.target.value)}
          className="w-full rounded border border-editor-border bg-editor-bg px-1.5 py-1 text-xs text-editor-text outline-none focus:border-editor-accent disabled:cursor-not-allowed disabled:opacity-50"
        >
          <option value="">기본 (해제)</option>
          {FONT_GROUPS.map((g) => (
            <optgroup key={g.label} label={g.label}>
              {g.entries.map((f) => {
                const v = `${f.cssStack}||${f.google ?? ''}`;
                return (
                  <option key={v} value={v}>
                    {f.name}
                  </option>
                );
              })}
            </optgroup>
          ))}
        </select>
        <p className="mt-1 text-[10px] leading-relaxed text-editor-dim">
          선택한 블록 전체에 폰트 적용. 코드/터미널은 내부 <code>&lt;pre&gt;</code>에 적용해 테마 규칙을 덮어씁니다.
        </p>
      </div>

      <div>
        <div className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-editor-dim">
          Case · 대소문자
        </div>
        <div className="grid grid-cols-3 gap-1">
          {([
            { v: 'none', label: 'Aa', title: '원본 유지' },
            { v: 'lowercase', label: 'a', title: '모두 소문자' },
            { v: 'uppercase', label: 'A', title: '모두 대문자' },
          ] as const).map(({ v, label, title }) => (
            <button
              key={v}
              type="button"
              onClick={() => applyBlockCase(v)}
              disabled={disabled}
              title={title}
              data-testid={`block-format-case-${v}`}
              className={`rounded border px-1 py-1.5 text-[12px] transition disabled:cursor-not-allowed disabled:opacity-40 ${
                caseValue === v
                  ? 'border-editor-accent bg-editor-accent/15 text-editor-accent'
                  : 'border-editor-border text-editor-text hover:border-editor-accent hover:bg-editor-accent/10'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <p className="mt-1 text-[10px] leading-relaxed text-editor-dim">
          CSS <code>text-transform</code> 으로 시각 변환. 원문 텍스트와 코드 토큰 색상은 그대로 보존됩니다.
        </p>
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
  testId?: string;
};

function NumberField({ label, value, disabled, onChange, testId }: NumberFieldProps) {
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
        data-testid={testId}
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
