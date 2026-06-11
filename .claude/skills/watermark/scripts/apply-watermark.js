#!/usr/bin/env node
// Apply / remove the brand watermark (cc-watermark) on HTML documents & decks.
//
// Usage:
//   node apply-watermark.js <file.html> [<file2.html> ...] [options]
//   options:
//     --off                 remove the watermark instead of adding it
//     --lines "a|b|c"       custom watermark lines (pipe-separated)
//                           default: https://run-ai.kr | brewnet.dev@gmail.com
//
// Detection: files containing <div class="slide"> get per-slide absolute spans
// (1280×720 deck convention). Other HTML gets one fixed full-viewport layer
// that stays visible while scrolling. Idempotent — existing cc-watermark is
// stripped first, so re-running never stacks duplicates.
//
// Canonical look (keep in sync with src/watermark/watermark.ts):
//   JetBrains Mono · 44px · rgba(148,163,184,0.24) · rotate(-26deg)

import fs from 'node:fs';
import path from 'node:path';
import { JSDOM } from 'jsdom';

const WATERMARK_CLASS = 'cc-watermark';
const WATERMARK_LAYER_CLASS = 'cc-watermark-layer';
const DEFAULT_LINES = ['https://run-ai.kr', 'brewnet.dev@gmail.com'];
const COLOR = 'rgba(148,163,184,0.24)';
const FONT_SIZE = 44;
const TOPS = [40, 66];

function topFor(i) {
  return TOPS[i % TOPS.length] + Math.floor(i / TOPS.length) * 26;
}
function spanStyle(top) {
  return (
    `position:absolute; left:50%; top:${top}%; ` +
    `transform:translate(calc(-50% + 200px),-50%) rotate(-26deg); white-space:nowrap; ` +
    `font-family:'JetBrains Mono',monospace; font-size:${FONT_SIZE}px; letter-spacing:0.10em; ` +
    `color:${COLOR}; pointer-events:none; user-select:none; z-index:5;`
  );
}

function parseArgs(argv) {
  const files = [];
  let off = false;
  let lines = DEFAULT_LINES;
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--off') off = true;
    else if (a === '--lines') {
      lines = String(argv[++i] || '').split('|').map((s) => s.trim()).filter(Boolean);
      if (!lines.length) lines = DEFAULT_LINES;
    } else files.push(a);
  }
  return { files, off, lines };
}

function makeSpans(doc, lines) {
  return lines.map((line, i) => {
    const span = doc.createElement('span');
    span.className = WATERMARK_CLASS;
    span.setAttribute('aria-hidden', 'true');
    span.setAttribute('style', spanStyle(topFor(i)));
    span.textContent = line;
    return span;
  });
}

function processHtml(html, off, lines) {
  const dom = new JSDOM(html);
  const doc = dom.window.document;

  // Always strip existing watermark first (idempotent).
  doc.querySelectorAll(`.${WATERMARK_CLASS}, .${WATERMARK_LAYER_CLASS}`).forEach((el) => el.remove());

  if (!off) {
    const slides = doc.querySelectorAll('div.slide');
    if (slides.length > 0) {
      slides.forEach((slide) => makeSpans(doc, lines).forEach((s) => slide.appendChild(s)));
    } else if (doc.body) {
      const layer = doc.createElement('div');
      layer.className = WATERMARK_LAYER_CLASS;
      layer.setAttribute('contenteditable', 'false');
      layer.setAttribute('aria-hidden', 'true');
      layer.setAttribute('style', 'position:fixed; inset:0; pointer-events:none; z-index:9999;');
      makeSpans(doc, lines).forEach((s) => layer.appendChild(s));
      doc.body.appendChild(layer);
    }
  }
  return dom.serialize();
}

function main() {
  const { files, off, lines } = parseArgs(process.argv.slice(2));
  if (files.length === 0) {
    console.error('usage: node apply-watermark.js <file.html> [...] [--off] [--lines "a|b"]');
    process.exit(1);
  }
  for (const file of files) {
    const abs = path.resolve(file);
    const html = fs.readFileSync(abs, 'utf8');
    const out = processHtml(html, off, lines);
    fs.writeFileSync(abs, out, 'utf8');
    console.log(`${off ? 'removed' : 'applied'} watermark: ${file}`);
  }
}

main();
