import { highlightCode } from '../highlight/highlighter';
import type { ParsedSlide } from './parsePresentation';

let blockSeq = 0;
const stampId = () => `code-${Date.now()}-${++blockSeq}`;

// One-shot upgrade pass: walks each slide's HTML, finds `.code-block` and
// `.terminal` containers that are missing the editor wiring, then bakes in
// shiki-highlighted output, the macOS-dot chrome, and the `data-code-source`
// / `data-code-lang` attributes the PropertiesPanel relies on.
//
// We deliberately skip elements that already look "wired" (have data-code-source)
// or already use the brewnet-style manual <span class="green"> coloring — those
// are intentional and must not be flattened by shiki.
export async function upgradeSlideCodeBlocks(slides: ParsedSlide[]): Promise<ParsedSlide[]> {
  const out: ParsedSlide[] = [];
  for (const s of slides) {
    out.push({ ...s, html: await upgradeHtml(s.html) });
  }
  return out;
}

async function upgradeHtml(html: string): Promise<string> {
  const parser = new DOMParser();
  const doc = parser.parseFromString(
    `<!doctype html><body><div id="__upgrade_root">${html}</div></body>`,
    'text/html',
  );
  const root = doc.getElementById('__upgrade_root');
  if (!root) return html;
  const targets = Array.from(
    root.querySelectorAll<HTMLElement>('.code-block, .terminal'),
  );
  for (const el of targets) {
    if (el.hasAttribute('data-code-source')) continue;
    const pre = el.querySelector(':scope > pre') as HTMLPreElement | null;
    if (!pre) continue;
    // brewnet-style manual coloring (`<span class="green">$</span>`) — keep as-is.
    if (pre.querySelector('span')) continue;
    const codeEl = pre.querySelector(':scope > code') as HTMLElement | null;
    const source = (codeEl?.textContent ?? pre.textContent ?? '').replace(/\n+$/, '');
    if (!source) continue;

    const isTerminal = el.classList.contains('terminal');
    const langHint = el.getAttribute('data-code-lang');
    const lang = langHint && langHint.length > 0 ? langHint : isTerminal ? 'bash' : 'plaintext';
    const inner = await highlightCode(source, lang);

    el.setAttribute('data-code-source', encodeURIComponent(source));
    el.setAttribute('data-code-lang', lang);
    if (!el.getAttribute('data-block-id')) {
      el.setAttribute('data-block-id', stampId());
    }
    if (!el.getAttribute('data-slot')) {
      el.setAttribute('data-slot', 'code');
    }

    if (isTerminal) {
      if (!el.querySelector(':scope > .terminal-header')) {
        const header = doc.createElement('div');
        header.className = 'terminal-header';
        header.innerHTML =
          '<div class="code-dots"><span class="dot-r"></span><span class="dot-y"></span><span class="dot-g"></span></div><span class="terminal-title">Terminal</span>';
        el.insertBefore(header, pre);
      }
    } else if (!el.querySelector(':scope > .code-dots')) {
      const dots = doc.createElement('div');
      dots.className = 'code-dots';
      dots.innerHTML =
        '<span class="dot-r"></span><span class="dot-y"></span><span class="dot-g"></span>';
      el.insertBefore(dots, pre);
    }

    pre.innerHTML = `<code>${inner}</code>`;
  }
  return root.innerHTML;
}
