import { highlightCode } from '../highlight/highlighter';
import { useDeckStore } from '../scene/store';

let codeBlockSeq = 0;
const makeCodeBlockId = () => `code-${Date.now()}-${++codeBlockSeq}`;

const CODE_BLOCK_DEFAULT_SOURCE = `import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic();
const message = await client.messages.create({
  model: "claude-opus-4-7",
  max_tokens: 1024,
  messages: [{ role: "user", content: "Hello, Claude" }],
});
console.log(message.content);`;

const TERMINAL_DEFAULT_SOURCE = `$ npm install -g @anthropic-ai/claude-code
added 142 packages in 8.3s
✓ claude-code 2.4.1 ready

$ claude --version
claude-code 2.4.1`;

function encodeSource(s: string): string {
  return encodeURIComponent(s);
}

async function buildCodeBlockHtml(source: string, lang: string): Promise<string> {
  const id = makeCodeBlockId();
  const inner = await highlightCode(source, lang);
  return [
    `<div class="code-block" data-slot="code" data-block-id="${id}" data-code-source="${encodeSource(source)}" data-code-lang="${lang}">`,
    `  <div class="code-dots"><span class="dot-r"></span><span class="dot-y"></span><span class="dot-g"></span></div>`,
    `  <pre><code>${inner}</code></pre>`,
    `</div>`,
  ].join('\n');
}

async function buildTerminalHtml(source: string): Promise<string> {
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

export function CodeBlockTemplates() {
  const slideId = useDeckStore((s) => s.slides[s.currentIndex]?.id ?? null);
  const insertBlock = useDeckStore((s) => s.insertBlock);
  const setSelectedBlockId = useDeckStore((s) => s.setSelectedBlockId);

  const insert = async (kind: 'code' | 'terminal') => {
    if (!slideId) return;
    const html =
      kind === 'code'
        ? await buildCodeBlockHtml(CODE_BLOCK_DEFAULT_SOURCE, 'typescript')
        : await buildTerminalHtml(TERMINAL_DEFAULT_SOURCE);
    insertBlock(slideId, html);
    const idMatch = html.match(/data-block-id="([^"]+)"/);
    if (idMatch) {
      // Defer selection until after the SlideRenderer remount paints — without
      // this, the BlockFormatPanel's `findBlock` lookup runs before the new
      // node is in the DOM and silently no-ops.
      setTimeout(() => setSelectedBlockId(idMatch[1]), 0);
    }
  };

  return (
    <div>
      <div className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-editor-dim">
        Code Block Templates
      </div>
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => insert('code')}
          className="rounded border border-editor-border bg-editor-bg px-2 py-2 text-left transition hover:border-editor-accent"
          title="Highlighted code block (TypeScript by default)"
        >
          <div className="text-xs text-editor-text">Code Block</div>
          <div className="mt-0.5 text-[10px] text-editor-dim">macOS dots · 신택스</div>
        </button>
        <button
          type="button"
          onClick={() => insert('terminal')}
          className="rounded border border-editor-border bg-editor-bg px-2 py-2 text-left transition hover:border-editor-accent"
          title="Terminal-styled code block (bash)"
        >
          <div className="text-xs text-editor-text">Terminal</div>
          <div className="mt-0.5 text-[10px] text-editor-dim">$ shell session</div>
        </button>
      </div>
      <p className="mt-2 text-[10px] leading-relaxed text-editor-dim">
        삽입 후 블록을 클릭하면 우측에서 언어와 원본 코드를 편집할 수 있습니다.
      </p>
    </div>
  );
}
