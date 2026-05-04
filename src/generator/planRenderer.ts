// Deterministic SlidePlan → HTML renderer. Each `render*` mirrors a slide
// pattern from docs/html/presentation/design-patterns.html one-to-one so that
// any LLM-authored plan compiles to the same shape the editor expects.
//
// Anything user-visible (titles, body text, code source) is HTML-escaped at
// the renderer boundary. The classes, data-slot wiring, slide-topbar/footer
// chrome, and outer template attribute are coded as constants here — they
// cannot drift no matter what the LLM emits.

import type {
  Block,
  BulletItem,
  Callout,
  MetaItem,
  SlideNode,
  SlidePlan,
  SupportedLang,
} from './slidePlan';

export type RenderedSlide = { id: string; html: string; title: string };

// Page numbering follows design-patterns.html: cover gets "COVER", section
// dividers get "SECTION", everything else gets a 2-digit count starting at
// 01 (excluding cover and sections from the numeric sequence).
type PageTag = string;

export function renderPlan(plan: SlidePlan): RenderedSlide[] {
  const tags = computePageTags(plan.slides);
  return plan.slides.map((node, i) => {
    const html = renderSlide(node, plan, tags[i]);
    const title = extractTitle(node);
    return { id: `${plan.template}-slide-${i + 1}`, html, title };
  });
}

function computePageTags(slides: SlideNode[]): PageTag[] {
  let counter = 0;
  return slides.map((s) => {
    if (s.type === 'cover') return 'COVER';
    if (s.type === 'section') return s.pageTag ?? 'SECTION';
    counter += 1;
    return String(counter).padStart(2, '0');
  });
}

function extractTitle(node: SlideNode): string {
  switch (node.type) {
    case 'cover':
      return node.title;
    case 'section':
      return `${node.num} · ${node.title}`;
    default:
      return node.title;
  }
}

function renderSlide(node: SlideNode, plan: SlidePlan, pageTag: PageTag): string {
  const template = plan.template;
  switch (node.type) {
    case 'cover':
      return wrapCover(node, plan, pageTag);
    case 'section':
      return wrapSection(node, pageTag, template);
    case 'title-body':
      return wrapStandard(renderTitleBody(node), node.caption ?? node.title, pageTag, template);
    case 'title-bullets':
      return wrapStandard(renderTitleBullets(node), node.caption ?? node.title, pageTag, template);
    case 'title-code':
      return wrapStandard(renderTitleCode(node), node.caption ?? node.title, pageTag, template);
    case 'two-col-code':
      return wrapStandard(renderTwoColCode(node), node.caption ?? node.title, pageTag, template);
    case 'comparison-table':
      return wrapStandard(renderComparisonTable(node), node.caption ?? node.title, pageTag, template);
    case 'callout-summary':
      return wrapStandard(renderCalloutSummary(node), node.caption ?? node.title, pageTag, template);
    case 'references':
      return wrapStandard(renderReferences(node), node.caption ?? node.title, pageTag, template);
  }
}

// ── outer chrome ──────────────────────────────────────────────

function wrapStandard(
  innerHtml: string,
  footerCaption: string,
  pageTag: PageTag,
  template: SlidePlan['template'],
): string {
  return [
    `<div class="slide" data-template="${escapeAttr(template)}">`,
    '  <div class="slide-topbar"></div>',
    '  <div class="slide-inner">',
    indent(innerHtml, '    '),
    '  </div>',
    '  <div class="slide-footer">',
    `    <span class="slide-footer-left" data-slot="caption">${escapeHtml(footerCaption)}</span>`,
    `    <span class="slide-footer-right" data-slot="page-num">${escapeHtml(pageTag)}</span>`,
    '  </div>',
    '</div>',
  ].join('\n');
}

function wrapCover(node: Extract<SlideNode, { type: 'cover' }>, plan: SlidePlan, pageTag: PageTag): string {
  const deco = node.deco ?? plan.meta.deco ?? '';
  const chapter = node.chapter ?? plan.meta.chapter ?? '';
  const subtitle = node.subtitle ?? plan.meta.subtitle ?? '';
  const caption = node.caption ?? plan.meta.subtitle ?? plan.meta.title;
  const inner = [
    deco ? `<div class="cover-deco" data-slot="number">${escapeHtml(deco)}</div>` : '',
    chapter ? `<div class="cover-level" data-slot="label">${escapeHtml(chapter)}</div>` : '',
    `<div class="t-hero" data-slot="title">${escapeHtml(node.title)}</div>`,
    subtitle
      ? `<div class="cover-subtitle" data-slot="subtitle">${escapeHtml(subtitle)}</div>`
      : '',
    node.meta && node.meta.length > 0 ? renderCoverMeta(node.meta) : '',
  ]
    .filter(Boolean)
    .join('\n');
  return [
    `<div class="slide slide-cover" data-template="${escapeAttr(plan.template)}">`,
    '  <div class="slide-topbar"></div>',
    '  <div class="slide-inner">',
    indent(inner, '    '),
    '  </div>',
    '  <div class="slide-footer">',
    `    <span class="slide-footer-left" data-slot="caption">${escapeHtml(caption)}</span>`,
    `    <span class="slide-footer-right" data-slot="page-num">${escapeHtml(pageTag)}</span>`,
    '  </div>',
    '</div>',
  ].join('\n');
}

function renderCoverMeta(items: MetaItem[]): string {
  const lis = items
    .map((m) => {
      const icon = m.icon ? `${escapeHtml(m.icon)} ` : '';
      const label = m.label ? `<strong>${escapeHtml(m.label)}</strong> ` : '';
      return `  <div class="cover-meta-item">${icon}${label}${escapeHtml(m.value)}</div>`;
    })
    .join('\n');
  return `<div class="cover-meta" data-slot="body">\n${lis}\n</div>`;
}

function wrapSection(
  node: Extract<SlideNode, { type: 'section' }>,
  pageTag: PageTag,
  template: SlidePlan['template'],
): string {
  const label = node.label ?? `PATTERN ${node.num}`;
  const caption = node.caption ?? `${node.num} · ${node.title}`;
  const inner = [
    `<div class="section-num" data-slot="number">${escapeHtml(node.num)}</div>`,
    `<div class="t-chapter" data-slot="label">${escapeHtml(label)}</div>`,
    `<div class="t-title" data-slot="title" style="font-size:48px; max-width:780px; line-height:1.2;">${escapeHtml(node.title)}</div>`,
    node.subtitle
      ? `<div data-slot="subtitle" style="margin-top:22px; font-size:17px; color:var(--muted); max-width:620px; line-height:1.7;">${escapeHtml(node.subtitle)}</div>`
      : '',
  ]
    .filter(Boolean)
    .join('\n');
  return [
    `<div class="slide slide-section" data-template="${escapeAttr(template)}">`,
    '  <div class="slide-topbar"></div>',
    '  <div class="slide-inner" style="justify-content:center; gap:0;">',
    indent(inner, '    '),
    '  </div>',
    '  <div class="slide-footer">',
    `    <span class="slide-footer-left" data-slot="caption">${escapeHtml(caption)}</span>`,
    `    <span class="slide-footer-right" data-slot="page-num">${escapeHtml(pageTag)}</span>`,
    '  </div>',
    '</div>',
  ].join('\n');
}

// ── slide bodies ──────────────────────────────────────────────

function renderHeader(node: { title: string; label?: string; subtitle?: string }): string {
  const out: string[] = [];
  if (node.label) out.push(`<div class="t-chapter" data-slot="label">${escapeHtml(node.label)}</div>`);
  out.push(`<div class="t-title" data-slot="title">${escapeHtml(node.title)}</div>`);
  if (node.subtitle)
    out.push(
      `<div class="t-caption" data-slot="subtitle" style="margin-bottom:14px;">${escapeHtml(node.subtitle)}</div>`,
    );
  return out.join('\n');
}

function renderTitleBody(node: Extract<SlideNode, { type: 'title-body' }>): string {
  return [renderHeader(node), ...node.blocks.map((b) => renderBlock(b))].join('\n');
}

function renderTitleBullets(node: Extract<SlideNode, { type: 'title-bullets' }>): string {
  const out = [renderHeader(node), renderBullets(node.bullets, 'bullet-list', 'bullets')];
  if (node.callout) out.push(renderCalloutEl(node.callout, '20'));
  return out.join('\n');
}

function renderTitleCode(node: Extract<SlideNode, { type: 'title-code' }>): string {
  const out = [renderHeader(node), renderCodeBlock(node.code.lang, node.code.source)];
  if (node.callout) out.push(renderCalloutEl(node.callout, '14'));
  return out.join('\n');
}

function renderTwoColCode(node: Extract<SlideNode, { type: 'two-col-code' }>): string {
  const ratioCls = node.ratio && node.ratio !== '5-5' ? ` ratio-${node.ratio}` : '';
  const left = node.left.map((b) => renderBlock(b)).join('\n');
  const right = node.right.map((b) => renderBlock(b)).join('\n');
  return [
    renderHeader(node),
    `<div class="two-col${ratioCls}" style="margin-top:14px;">`,
    '  <div>',
    indent(left, '    '),
    '  </div>',
    '  <div>',
    indent(right, '    '),
    '  </div>',
    '</div>',
  ].join('\n');
}

function renderComparisonTable(node: Extract<SlideNode, { type: 'comparison-table' }>): string {
  const ths = node.headers.map((h) => `<th>${escapeHtml(h)}</th>`).join('');
  const trs = node.rows
    .map((row) => `<tr>${row.map((c) => `<td>${escapeInlineHtml(c)}</td>`).join('')}</tr>`)
    .join('\n          ');
  const out = [renderHeader(node)];
  if (node.lead) out.push(`<div class="t-body" data-slot="body">${escapeHtml(node.lead)}</div>`);
  out.push(
    `<div data-slot="table" style="flex:1; margin-top:14px;">
  <table class="tbl">
    <thead>
      <tr>${ths}</tr>
    </thead>
    <tbody>
      ${trs}
    </tbody>
  </table>
</div>`,
  );
  if (node.callout) out.push(renderCalloutEl(node.callout, '14'));
  return out.join('\n');
}

function renderCalloutSummary(node: Extract<SlideNode, { type: 'callout-summary' }>): string {
  const out = [renderHeader(node)];
  if (node.lead) out.push(`<div class="t-body" data-slot="body">${escapeHtml(node.lead)}</div>`);
  for (const c of node.callouts) out.push(renderCalloutEl(c, '14'));
  if (node.bullets && node.bullets.length > 0)
    out.push(renderBullets(node.bullets, 'bullet-list', 'bullets'));
  return out.join('\n');
}

function renderReferences(node: Extract<SlideNode, { type: 'references' }>): string {
  const items: BulletItem[] = node.links.map((l) => ({
    text: l.text,
    sub: l.sub
      ? `<a class="link" href="${escapeAttr(l.href)}">${escapeHtml(l.href)}</a> — ${escapeHtml(l.sub)}`
      : `<a class="link" href="${escapeAttr(l.href)}">${escapeHtml(l.href)}</a>`,
  }));
  const out = [renderHeader({ title: node.title, label: node.label })];
  out.push(renderBullets(items, 'bullet-list', 'bullets', /* allowSubHtml= */ true));
  if (node.callout) out.push(renderCalloutEl(node.callout, '24'));
  return out.join('\n');
}

// ── blocks ─────────────────────────────────────────────────────

function renderBlock(b: Block): string {
  switch (b.kind) {
    case 'paragraph':
      return `<div class="t-body" data-slot="body">${escapeHtml(b.text)}</div>`;
    case 'h3':
      return `<div class="t-h3">${escapeHtml(b.text)}</div>`;
    case 'bullets':
      return renderBullets(b.items, 'bullet-list', 'bullets');
    case 'numbered':
      return renderBullets(b.items, 'num-list', 'bullets');
    case 'code':
      return renderCodeBlock(b.lang, b.source);
    case 'terminal':
      return renderTerminalBlock(b.source);
    case 'callout':
      return renderCalloutEl(b, '14');
    case 'badges':
      return renderBadges(b.items);
    case 'table': {
      const ths = b.headers.map((h) => `<th>${escapeHtml(h)}</th>`).join('');
      const trs = b.rows
        .map((row) => `<tr>${row.map((c) => `<td>${escapeInlineHtml(c)}</td>`).join('')}</tr>`)
        .join('\n      ');
      return `<div data-slot="table"><table class="tbl"><thead><tr>${ths}</tr></thead><tbody>${trs}</tbody></table></div>`;
    }
  }
}

function renderBullets(
  items: BulletItem[],
  cls: 'bullet-list' | 'num-list',
  slot: 'bullets',
  allowSubHtml = false,
): string {
  const lis = items
    .map((it) => {
      const sub = it.sub
        ? `<span class="sub">${allowSubHtml ? it.sub : escapeHtml(it.sub)}</span>`
        : '';
      return `  <li><div>${escapeHtml(it.text)}${sub}</div></li>`;
    })
    .join('\n');
  return `<ul class="${cls}" data-slot="${slot}">\n${lis}\n</ul>`;
}

function renderCodeBlock(lang: SupportedLang, source: string): string {
  // Plain shape — upgradeSlideCodeBlocks() at deck-load time injects shiki
  // output, .code-dots chrome, data-code-source, and data-block-id. Keeping
  // the source readable here makes static decks reviewable in git.
  return `<div class="code-block" data-slot="code" data-code-lang="${escapeAttr(lang)}">
<pre><code>${escapeHtml(source)}</code></pre>
</div>`;
}

function renderTerminalBlock(source: string): string {
  return `<div class="terminal" data-slot="code" data-code-lang="bash">
<pre><code>${escapeHtml(source)}</code></pre>
</div>`;
}

function renderCalloutEl(c: Callout, marginTop: string): string {
  const icon = c.icon ?? defaultIcon(c.tone);
  const titleEl = c.title ? `<strong>${escapeHtml(c.title)}</strong> ` : '';
  return `<div class="callout callout-${c.tone}" style="margin-top:${marginTop}px;">
  <div class="callout-icon">${escapeHtml(icon)}</div>
  <div class="callout-body">${titleEl}${escapeHtml(c.body)}</div>
</div>`;
}

function defaultIcon(tone: 'amber' | 'blue' | 'green'): string {
  if (tone === 'amber') return '💡';
  if (tone === 'blue') return '📘';
  return '✅';
}

function renderBadges(items: { label: string; tone: string }[]): string {
  return items
    .map((it) => `<span class="badge badge-${escapeAttr(it.tone)}">${escapeHtml(it.label)}</span>`)
    .join(' ');
}

// ── escaping ───────────────────────────────────────────────────

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function escapeAttr(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
}

// Comparison-table cells frequently include light formatting that the brewnet
// design relies on — `<strong>`, `<span class="badge ...">`, `<em>`. We keep
// those, but escape the rest. This is the single concession to "safe HTML"
// in the renderer; everywhere else we escape unconditionally.
function escapeInlineHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/<(?!\/?(strong|em|span|br|code)\b)/g, '&lt;');
}

function indent(text: string, prefix: string): string {
  return text
    .split('\n')
    .map((line) => (line.length === 0 ? line : prefix + line))
    .join('\n');
}
