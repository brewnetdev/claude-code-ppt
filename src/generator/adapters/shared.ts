import type { ParsedSlide } from '../../importer/parsePresentation';

export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

let blockSeq = 0;
const t0 = Date.now();
export function makeBlockId(prefix: string): string {
  return `${prefix}-${t0}-${++blockSeq}`;
}

let slideSeq = 0;
export function makeSlideId(template: string): string {
  return `${template}-${t0}-${++slideSeq}`;
}

// Wraps an inner slide-content fragment in the canonical .slide / .slide-inner
// chrome that SlideRenderer / parsePresentationHTML expect. The footer slot
// is mandatory — the rest of the editor wires drag-handle stamping and
// page-num updates off these data-slot attributes.
export function wrapSlide(opts: {
  template: 'presentation' | 'portfolio' | 'report';
  innerHtml: string;
  pageNum: number;
  totalPages: number;
  footerLeft?: string;
  topbarHtml?: string;
}): string {
  const { template, innerHtml, pageNum, totalPages, footerLeft, topbarHtml } = opts;
  const num = String(pageNum).padStart(2, '0');
  const total = String(totalPages).padStart(2, '0');
  const left = escapeHtml(footerLeft ?? `${num} / ${total}`);
  const topbar = topbarHtml ?? '';
  const captionId = makeBlockId('caption');
  const pageNumId = makeBlockId('page-num');
  return [
    `<div class="slide" data-template="${template}">`,
    `  <div class="slide-topbar">${topbar}</div>`,
    `  <div class="slide-inner">`,
    innerHtml,
    `  </div>`,
    `  <div class="slide-footer">`,
    `    <span class="slide-footer-left" data-slot="caption" data-block-id="${captionId}">${left}</span>`,
    `    <span class="slide-footer-right" data-slot="page-num" data-block-id="${pageNumId}">${num}</span>`,
    `  </div>`,
    `</div>`,
  ].join('\n');
}

export function toParsedSlide(idx: number, template: string, html: string, title: string): ParsedSlide {
  return { id: `${template}-slide-${idx + 1}`, html, title: title.trim() || `Slide ${idx + 1}` };
}
