import { useEffect, useRef, useState } from 'react';
import { SUPPORTED_LANGS } from '../highlight/highlighter';
import { DATA_BLOCK_ID } from '../scene/blockId';
import { applyCodeBlockToEl, isCodeBlockEl, readCodeLang, readCodeSource } from './codeBlockHtml';

// Deck helpers (main-canvas resolution). Scope to the main canvas only —
// sidebar thumbnails reuse `.slide-canvas-host` with the same data-block-id
// values, so a class-based selector would patch a thumbnail.
export function findMainCanvasBlock(blockId: string): HTMLElement | null {
  return document.querySelector<HTMLElement>(
    `[data-canvas-role="main"] [${DATA_BLOCK_ID}="${blockId}"]`,
  );
}

export function isCodeBlock(blockId: string): boolean {
  return isCodeBlockEl(findMainCanvasBlock(blockId));
}

type Status = 'idle' | 'applying' | 'applied' | 'error';

type Props = {
  // Resolves the live code-block element to edit. Deck passes a main-canvas
  // lookup; the document editor passes its selected iframe code block.
  getEl: () => HTMLElement | null;
  // Changes whenever the target block changes (selection / slide / revision),
  // so drafts re-seed from the freshly resolved element.
  seedKey: string;
};

// Language + source editor for a shiki code block. Surface-agnostic: it edits
// whatever element getEl() returns and commits via an `input` event (caught by
// useSlideEditing on the deck, useDocumentEditing in the doc iframe).
export function CodeBlockEditPanel({ getEl, seedKey }: Props) {
  const [source, setSource] = useState('');
  const [lang, setLang] = useState('plaintext');
  const [appliedSource, setAppliedSource] = useState('');
  const [appliedLang, setAppliedLang] = useState('plaintext');
  const [status, setStatus] = useState<Status>('idle');
  const statusTimerRef = useRef<number | null>(null);

  useEffect(() => {
    const el = getEl();
    if (!el) return;
    const nextSource = readCodeSource(el);
    const nextLang = readCodeLang(el);
    setSource(nextSource);
    setLang(nextLang);
    setAppliedSource(nextSource);
    setAppliedLang(nextLang);
    setStatus('idle');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seedKey]);

  useEffect(() => {
    return () => {
      if (statusTimerRef.current !== null) window.clearTimeout(statusTimerRef.current);
    };
  }, []);

  const dirty = source !== appliedSource || lang !== appliedLang;

  const apply = async () => {
    const el = getEl();
    if (!el) {
      setStatus('error');
      return;
    }
    setStatus('applying');
    try {
      const ok = await applyCodeBlockToEl(el, source, lang);
      if (!ok) {
        setStatus('error');
        return;
      }
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
          <span className="text-emerald-400">✓ 적용됨</span>
        ) : status === 'error' ? (
          <span className="text-red-400">⚠ 적용 실패 (블록 또는 코드 영역을 찾지 못함)</span>
        ) : status === 'applying' ? (
          <span className="text-editor-dim">하이라이팅 중…</span>
        ) : dirty ? (
          <span className="text-amber-400">● 수정됨 — Apply 버튼을 눌러 반영</span>
        ) : (
          <span className="text-editor-dim">동일한 상태</span>
        )}
      </div>
    </div>
  );
}
