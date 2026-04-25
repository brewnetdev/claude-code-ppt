import { useEffect, useRef, useState } from 'react';
import { highlightCode, SUPPORTED_LANGS } from '../highlight/highlighter';
import { DATA_BLOCK_ID } from '../scene/blockId';
import { useDeckStore } from '../scene/store';

// Scope to the main canvas only — sidebar thumbnails reuse `.slide-canvas-host`
// with the same data-block-id values, so a class-based selector would patch a
// thumbnail (and never the live editor) when the thumbnail appears earlier in
// DOM order.
function findBlock(blockId: string): HTMLElement | null {
  return document.querySelector<HTMLElement>(
    `[data-canvas-role="main"] [${DATA_BLOCK_ID}="${blockId}"]`,
  );
}

function readSource(el: HTMLElement): string {
  const enc = el.getAttribute('data-code-source') ?? '';
  try {
    return decodeURIComponent(enc);
  } catch {
    return enc;
  }
}

function readLang(el: HTMLElement): string {
  return el.getAttribute('data-code-lang') ?? 'plaintext';
}

// Identify shiki-driven blocks via the data-code-source attribute. Pre-existing
// brewnet blocks without this attribute are not source-editable here.
export function isCodeBlock(blockId: string): boolean {
  const el = findBlock(blockId);
  return !!el && el.hasAttribute('data-code-source');
}

type Status = 'idle' | 'applying' | 'applied' | 'error';

type Props = {
  blockId: string;
};

export function CodeBlockEditPanel({ blockId }: Props) {
  const revision = useDeckStore((s) => s.revision);
  const slideId = useDeckStore((s) => s.slides[s.currentIndex]?.id ?? null);

  // Draft state — what's in the inputs right now.
  const [source, setSource] = useState('');
  const [lang, setLang] = useState('plaintext');

  // Applied state — what we last successfully wrote to the live slide.
  // Drift between draft and applied is what `dirty` measures, so the user
  // always knows whether their edit has reached the canvas.
  const [appliedSource, setAppliedSource] = useState('');
  const [appliedLang, setAppliedLang] = useState('plaintext');

  const [status, setStatus] = useState<Status>('idle');
  const statusTimerRef = useRef<number | null>(null);

  // Re-seed both draft and applied from the live DOM when selection / slide /
  // revision changes. Without this, switching blocks would carry stale text
  // from the previous block into the editor.
  useEffect(() => {
    const el = findBlock(blockId);
    if (!el) return;
    const nextSource = readSource(el);
    const nextLang = readLang(el);
    setSource(nextSource);
    setLang(nextLang);
    setAppliedSource(nextSource);
    setAppliedLang(nextLang);
    setStatus('idle');
  }, [blockId, slideId, revision]);

  useEffect(() => {
    return () => {
      if (statusTimerRef.current !== null) window.clearTimeout(statusTimerRef.current);
    };
  }, []);

  const dirty = source !== appliedSource || lang !== appliedLang;

  const apply = async () => {
    const el = findBlock(blockId);
    if (!el) {
      setStatus('error');
      return;
    }
    const code = el.querySelector('pre > code');
    if (!code) {
      setStatus('error');
      return;
    }
    setStatus('applying');
    try {
      el.setAttribute('data-code-source', encodeURIComponent(source));
      el.setAttribute('data-code-lang', lang);
      const html = await highlightCode(source, lang);
      code.innerHTML = html;
      el.dispatchEvent(new InputEvent('input', { bubbles: true }));
      setAppliedSource(source);
      setAppliedLang(lang);
      setStatus('applied');
      if (statusTimerRef.current !== null) window.clearTimeout(statusTimerRef.current);
      statusTimerRef.current = window.setTimeout(() => setStatus('idle'), 1500);
    } catch {
      setStatus('error');
    }
  };

  const reset = () => {
    setSource(appliedSource);
    setLang(appliedLang);
    setStatus('idle');
  };

  return (
    <div className="space-y-3">
      <div>
        <div className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-editor-dim">
          Code · Language
        </div>
        <select
          value={lang}
          onChange={(e) => setLang(e.target.value)}
          className="w-full rounded border border-editor-border bg-editor-bg px-2 py-1 text-xs text-editor-text outline-none"
        >
          {SUPPORTED_LANGS.map((l) => (
            <option key={l.value} value={l.value}>
              {l.label}
            </option>
          ))}
        </select>
      </div>
      <div>
        <div className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-editor-dim">
          Source
        </div>
        <textarea
          value={source}
          onChange={(e) => setSource(e.target.value)}
          spellCheck={false}
          rows={8}
          className="w-full resize-y rounded border border-editor-border bg-editor-bg p-2 font-mono text-[11px] leading-relaxed text-editor-text outline-none"
        />
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={apply}
          disabled={!dirty || status === 'applying'}
          className="flex-1 rounded border border-editor-accent bg-editor-accent/10 px-2 py-1.5 text-xs font-medium text-editor-accent transition hover:bg-editor-accent/20 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-editor-accent/10"
        >
          {status === 'applying' ? 'Applying…' : 'Apply'}
        </button>
        <button
          type="button"
          onClick={reset}
          disabled={!dirty || status === 'applying'}
          className="rounded border border-editor-border px-2 py-1.5 text-xs text-editor-dim transition hover:border-editor-accent hover:text-editor-text disabled:cursor-not-allowed disabled:opacity-40"
        >
          Reset
        </button>
      </div>
      <div className="text-[10px] leading-relaxed">
        {status === 'applied' ? (
          <span className="text-emerald-400">✓ 슬라이드에 적용됨</span>
        ) : status === 'error' ? (
          <span className="text-red-400">⚠ 적용 실패 (블록 또는 코드 영역을 찾지 못함)</span>
        ) : status === 'applying' ? (
          <span className="text-editor-dim">하이라이팅 중…</span>
        ) : dirty ? (
          <span className="text-amber-400">● 수정됨 — Apply 버튼을 눌러 슬라이드에 반영</span>
        ) : (
          <span className="text-editor-dim">슬라이드와 동일한 상태</span>
        )}
      </div>
    </div>
  );
}
