import type { Code, Heading, List, ListItem, Paragraph, PhrasingContent, RootContent, Table } from 'mdast';
import { toString as mdToString } from 'mdast-util-to-string';
import { highlightCode } from '../../highlight/highlighter';
import type { ParsedSlide } from '../../importer/parsePresentation';
import type { SlideGroup } from '../blockify';
import { classifyCodeBlock, inferLang } from '../detectTerminal';
import { escapeHtml, makeBlockId, wrapSlide } from './shared';

// Render a phrasing chain (paragraph children, list-item paragraph children,
// heading children) preserving inline emphasis. We don't go through any
// generic mdast→hast pipeline because we need exact class names that
// brewnet-dark.css ships with (t-body has its own `<a>` styling, etc.).
function renderPhrasing(children: readonly PhrasingContent[]): string {
  let out = '';
  for (const node of children) {
    if (node.type === 'text') {
      out += escapeHtml(node.value);
    } else if (node.type === 'strong') {
      out += `<strong>${renderPhrasing(node.children)}</strong>`;
    } else if (node.type === 'emphasis') {
      out += `<em>${renderPhrasing(node.children)}</em>`;
    } else if (node.type === 'inlineCode') {
      out += `<code>${escapeHtml(node.value)}</code>`;
    } else if (node.type === 'link') {
      out += `<a href="${escapeHtml(node.url)}" target="_blank" rel="noreferrer">${renderPhrasing(node.children)}</a>`;
    } else if (node.type === 'break') {
      out += '<br>';
    } else if (node.type === 'delete') {
      out += `<del>${renderPhrasing(node.children)}</del>`;
    } else if (node.type === 'image') {
      out += `<img src="${escapeHtml(node.url)}" alt="${escapeHtml(node.alt ?? '')}">`;
    } else {
      // Fallback: flatten unknown phrasing.
      out += escapeHtml(mdToString(node));
    }
  }
  return out;
}

function renderListItems(items: readonly ListItem[]): string {
  return items
    .map((li) => {
      const parts: string[] = [];
      for (const child of li.children) {
        if (child.type === 'paragraph') {
          parts.push(renderPhrasing((child as Paragraph).children));
        } else if (child.type === 'list') {
          parts.push(renderList(child as List));
        } else {
          parts.push(escapeHtml(mdToString(child)));
        }
      }
      return `    <li>${parts.join(' ')}</li>`;
    })
    .join('\n');
}

function renderList(node: List): string {
  const tag = node.ordered ? 'ol' : 'ul';
  const id = makeBlockId('list');
  return [
    `  <${tag} class="t-bullets" data-slot="bullets" data-block-id="${id}">`,
    renderListItems(node.children),
    `  </${tag}>`,
  ].join('\n');
}

function renderTable(node: Table): string {
  const [header, ...rows] = node.children;
  const head = header
    ? `    <thead><tr>${header.children
        .map((c) => `<th>${renderPhrasing(c.children as readonly PhrasingContent[])}</th>`)
        .join('')}</tr></thead>`
    : '';
  const body =
    rows.length === 0
      ? ''
      : `    <tbody>${rows
          .map(
            (r) =>
              `<tr>${r.children
                .map((c) => `<td>${renderPhrasing(c.children as readonly PhrasingContent[])}</td>`)
                .join('')}</tr>`,
          )
          .join('')}</tbody>`;
  const id = makeBlockId('table');
  return [`  <table class="t-table" data-slot="table" data-block-id="${id}">`, head, body, `  </table>`]
    .filter(Boolean)
    .join('\n');
}

async function renderCodeBlock(node: Code): Promise<string> {
  const kind = classifyCodeBlock(node);
  const lang = kind === 'terminal' ? 'bash' : inferLang(node);
  const source = node.value ?? '';
  const inner = await highlightCode(source, lang);
  const id = makeBlockId(kind === 'terminal' ? 'term' : 'code');
  const enc = encodeURIComponent(source);

  if (kind === 'terminal') {
    return [
      `  <div class="terminal" data-slot="code" data-block-id="${id}" data-code-source="${enc}" data-code-lang="bash">`,
      `    <div class="terminal-header">`,
      `      <div class="code-dots"><span class="dot-r"></span><span class="dot-y"></span><span class="dot-g"></span></div>`,
      `      <span class="terminal-title">Terminal</span>`,
      `    </div>`,
      `    <pre><code>${inner}</code></pre>`,
      `  </div>`,
    ].join('\n');
  }
  return [
    `  <div class="code-block" data-slot="code" data-block-id="${id}" data-code-source="${enc}" data-code-lang="${lang}">`,
    `    <div class="code-dots"><span class="dot-r"></span><span class="dot-y"></span><span class="dot-g"></span></div>`,
    `    <pre><code>${inner}</code></pre>`,
    `  </div>`,
  ].join('\n');
}

// Standalone HEAD-style elements (label, hero, title, h2, h3) all need a
// stable data-block-id so the editor's PropertiesPanel can target them.
function emitTextBlock(opts: {
  cls: string;
  slot: string;
  prefix: string;
  text: string;
  inner?: string;
}): string {
  const id = makeBlockId(opts.prefix);
  const body = opts.inner ?? escapeHtml(opts.text);
  return `  <div class="${opts.cls}" data-slot="${opts.slot}" data-block-id="${id}">${body}</div>`;
}

function renderHeadingAsTitle(h: Heading, kind: 'cover' | 'section' | 'content'): string {
  const text = mdToString(h).trim();
  if (kind === 'cover') {
    return [
      emitTextBlock({ cls: 't-chapter', slot: 'label', prefix: 'label', text: 'DOC' }),
      emitTextBlock({ cls: 't-hero', slot: 'title', prefix: 'title', text }),
    ].join('\n');
  }
  if (h.depth === 1 || h.depth === 2) {
    return emitTextBlock({ cls: 't-title', slot: 'title', prefix: 'title', text });
  }
  if (h.depth === 3) {
    return emitTextBlock({ cls: 't-h3', slot: 'subtitle', prefix: 'subtitle', text });
  }
  return emitTextBlock({ cls: 't-h3', slot: 'subtitle', prefix: 'subtitle', text });
}

async function renderGroup(g: SlideGroup, idx: number): Promise<{ html: string; title: string }> {
  const parts: string[] = [];
  let title = g.title ?? '';
  let primaryHeadingConsumed = false;
  let coverHeroEmitted = false;

  // Cover slide without a heading (heading-less MD) gets the t-chapter banner
  // up front so shape detection sees it before we encounter any paragraph.
  if (g.kind === 'cover' && !g.title) {
    parts.push(emitTextBlock({ cls: 't-chapter', slot: 'label', prefix: 'label', text: 'DOC' }));
  }

  for (const node of g.nodes) {
    if (node.type === 'heading') {
      const h = node as Heading;
      const isPrimary = !primaryHeadingConsumed && h.depth === g.depth;
      if (isPrimary) {
        parts.push(renderHeadingAsTitle(h, g.kind));
        primaryHeadingConsumed = true;
      } else if (h.depth === 3) {
        parts.push(emitTextBlock({ cls: 't-h3', slot: 'subtitle', prefix: 'subtitle', text: mdToString(h) }));
      } else if (h.depth === 2) {
        parts.push(emitTextBlock({ cls: 't-h2', slot: 'subtitle', prefix: 'subtitle', text: mdToString(h) }));
      } else {
        parts.push(emitTextBlock({ cls: 't-h3', slot: 'subtitle', prefix: 'subtitle', text: mdToString(h) }));
      }
      continue;
    }
    if (node.type === 'paragraph') {
      const html = renderPhrasing((node as Paragraph).children);
      if (!html.trim()) continue;
      // Heading-less cover: first paragraph becomes the synthetic hero title.
      if (g.kind === 'cover' && !g.title && !coverHeroEmitted) {
        const txt = mdToString(node).trim();
        title = txt;
        coverHeroEmitted = true;
        parts.push(emitTextBlock({ cls: 't-hero', slot: 'title', prefix: 'title', text: txt }));
        continue;
      }
      const cls = g.kind === 'cover' && !title ? 't-caption' : 't-body';
      const slot = g.kind === 'cover' && !title ? 'subtitle' : 'body';
      const prefix = slot === 'subtitle' ? 'subtitle' : 'body';
      parts.push(emitTextBlock({ cls, slot, prefix, text: '', inner: html }));
      continue;
    }
    if (node.type === 'list') {
      parts.push(renderList(node as List));
      continue;
    }
    if (node.type === 'code') {
      parts.push(await renderCodeBlock(node as Code));
      continue;
    }
    if (node.type === 'table') {
      parts.push(renderTable(node as Table));
      continue;
    }
    if (node.type === 'blockquote') {
      const inner = (node.children as RootContent[])
        .map((c) => (c.type === 'paragraph' ? renderPhrasing((c as Paragraph).children) : escapeHtml(mdToString(c))))
        .join(' ');
      parts.push(emitTextBlock({ cls: 't-quote', slot: 'quote', prefix: 'quote', text: '', inner }));
      continue;
    }
    if (node.type === 'thematicBreak') {
      parts.push(`  <hr class="t-hr">`);
      continue;
    }
  }

  if (!title) title = `Slide ${idx + 1}`;
  return { html: parts.join('\n'), title };
}

export async function renderPresentation(groups: SlideGroup[]): Promise<ParsedSlide[]> {
  const slides: ParsedSlide[] = [];
  const inners = await Promise.all(groups.map((g, i) => renderGroup(g, i)));
  inners.forEach((inner, idx) => {
    const wrapped = wrapSlide({
      template: 'presentation',
      innerHtml: inner.html,
      pageNum: idx + 1,
      totalPages: groups.length,
    });
    slides.push({
      id: `presentation-slide-${idx + 1}`,
      html: wrapped,
      title: inner.title,
    });
  });
  return slides;
}
