// Shared code-block markup + apply helpers.
//
// Single source of truth for the shiki-highlighted `.code-block` / `.terminal`
// structure used by BOTH the slide deck (CodeBlockTemplates / CodeBlockEditPanel)
// and the flowing-document editor. Previously the deck owned this and the doc
// editor reinvented a plain <pre>; now both insert and edit the same block.

import { highlightCode, normalizeLang } from '../highlight/highlighter';

let codeBlockSeq = 0;
const makeCodeBlockId = () => `code-${Date.now()}-${++codeBlockSeq}`;

export const CODE_BLOCK_DEFAULT_SOURCE = `import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic();
const message = await client.messages.create({
  model: "claude-opus-4-7",
  max_tokens: 1024,
  messages: [{ role: "user", content: "Hello, Claude" }],
});
console.log(message.content);`;

export const TERMINAL_DEFAULT_SOURCE = `$ npm install -g @anthropic-ai/claude-code
added 142 packages in 8.3s
✓ claude-code 2.4.1 ready

$ claude --version
claude-code 2.4.1`;

function encodeSource(s: string): string {
  return encodeURIComponent(s);
}

export function readCodeSource(el: HTMLElement): string {
  const enc = el.getAttribute('data-code-source') ?? '';
  try {
    return decodeURIComponent(enc);
  } catch {
    return enc;
  }
}

export function readCodeLang(el: HTMLElement): string {
  return el.getAttribute('data-code-lang') ?? 'plaintext';
}

// A shiki-driven code block is identified by the data-code-source attribute.
export function isCodeBlockEl(el: HTMLElement | null): boolean {
  return !!el && el.hasAttribute('data-code-source');
}

export async function buildCodeBlockHtml(source: string, lang: string): Promise<string> {
  const id = makeCodeBlockId();
  const safeLang = normalizeLang(lang);
  const inner = await highlightCode(source, safeLang);
  return [
    `<div class="code-block" data-slot="code" data-block-id="${id}" data-code-source="${encodeSource(source)}" data-code-lang="${safeLang}">`,
    `  <div class="code-dots"><span class="dot-r"></span><span class="dot-y"></span><span class="dot-g"></span></div>`,
    `  <pre><code>${inner}</code></pre>`,
    `</div>`,
  ].join('\n');
}

export async function buildTerminalHtml(source: string): Promise<string> {
  const id = makeCodeBlockId();
  const inner = await highlightCode(source, 'bash');
  return [
    `<div class="terminal" data-slot="code" data-block-id="${id}" data-code-source="${encodeSource(source)}" data-code-lang="bash">`,
    `  <div class="terminal-header">`,
    `    <div class="code-dots"><span class="dot-r"></span><span class="dot-y"></span><span class="dot-g"></span></div>`,
    `    <span class="terminal-title">Terminal</span>`,
    `  </div>`,
    `  <pre><code>${inner}</code></pre>`,
    `</div>`,
  ].join('\n');
}

// Re-highlight a live code block in place and persist its source/lang on the
// element. Dispatches an `input` event so whichever editor owns the block
// (useSlideEditing for the deck, useDocumentEditing for the doc iframe) commits
// it. Returns false if the element has no <pre><code> to update.
export async function applyCodeBlockToEl(
  el: HTMLElement,
  source: string,
  lang: string,
): Promise<boolean> {
  const code = el.querySelector('pre > code');
  if (!code) return false;
  const safeLang = normalizeLang(lang);
  el.setAttribute('data-code-source', encodeSource(source));
  el.setAttribute('data-code-lang', safeLang);
  code.innerHTML = await highlightCode(source, safeLang);
  el.dispatchEvent(new InputEvent('input', { bubbles: true }));
  return true;
}
