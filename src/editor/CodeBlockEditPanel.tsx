import { useEffect, useRef, useState } from 'react';
import { highlightCode, SUPPORTED_LANGS } from '../highlight/highlighter';
import { DATA_BLOCK_ID } from '../scene/blockId';
import { useDeckStore } from '../scene/store';

const HIGHLIGHT_DEBOUNCE_MS = 300;

function findBlock(blockId: string): HTMLElement | null {
  return document.querySelector<HTMLElement>(
    `.slide-canvas-host [${DATA_BLOCK_ID}="${blockId}"]`,
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

// Returns true iff the given block is one of our shiki-driven code blocks.
// Detection is by `data-code-source` attribute, which both templates set —
// using the attribute (not class) keeps detection independent of brewnet's
// container class choices (.code-block / .terminal / future variants).
export function isCodeBlock(blockId: string): boolean {
  const el = findBlock(blockId);
  return !!el && el.hasAttribute('data-code-source');
}

type Props = {
  blockId: string;
};

export function CodeBlockEditPanel({ blockId }: Props) {
  const revision = useDeckStore((s) => s.revision);
  const slideId = useDeckStore((s) => s.slides[s.currentIndex]?.id ?? null);

  // Re-read live DOM on every (blockId | slideId | revision) change so undo,
  // slide switch, or external mutations re-seed the editor with the right
  // source + language.
  const [source, setSource] = useState('');
  const [lang, setLang] = useState('plaintext');
  const sourceRef = useRef(source);
  const langRef = useRef(lang);

  useEffect(() => {
    const el = findBlock(blockId);
    if (!el) return;
    const nextSource = readSource(el);
    const nextLang = readLang(el);
    sourceRef.current = nextSource;
    langRef.current = nextLang;
    setSource(nextSource);
    setLang(nextLang);
  }, [blockId, slideId, revision]);

  // Debounced re-highlight + DOM patch. We patch the live `<code>` directly
  // — same uncontrolled-DOM pattern the rest of the editor uses — and
  // dispatch a synthetic `input` so SlideRenderer's debounce captures the
  // change for persistence.
  useEffect(() => {
    sourceRef.current = source;
    langRef.current = lang;
    const t = window.setTimeout(async () => {
      const el = findBlock(blockId);
      if (!el) return;
      const code = el.querySelector('pre > code');
      if (!code) return;
      el.setAttribute('data-code-source', encodeURIComponent(source));
      el.setAttribute('data-code-lang', lang);
      const html = await highlightCode(source, lang);
      // Stale-write guard: if the user edited again while shiki was loading,
      // discard this paint — the next debounce will catch up with fresh state.
      if (sourceRef.current !== source || langRef.current !== lang) return;
      code.innerHTML = html;
      el.dispatchEvent(new InputEvent('input', { bubbles: true }));
    }, HIGHLIGHT_DEBOUNCE_MS);
    return () => window.clearTimeout(t);
  }, [source, lang, blockId]);

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
          rows={10}
          className="w-full resize-y rounded border border-editor-border bg-editor-bg p-2 font-mono text-[11px] leading-relaxed text-editor-text outline-none"
        />
        <p className="mt-1 text-[10px] text-editor-dim">
          편집 후 ~300ms 뒤에 자동으로 신택스 하이라이팅이 다시 적용됩니다.
        </p>
      </div>
    </div>
  );
}
