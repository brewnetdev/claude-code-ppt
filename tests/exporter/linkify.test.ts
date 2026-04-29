import { JSDOM } from 'jsdom';
import { beforeEach, describe, expect, it } from 'vitest';
import { linkifyHtml } from '../../src/exporter/linkify';

let dom: JSDOM;
let document: Document;

beforeEach(() => {
  dom = new JSDOM('<!doctype html><html><body></body></html>');
  document = dom.window.document;
  // linkifyHtml uses NodeFilter.SHOW_TEXT — pull it from JSDOM so the call
  // resolves without polluting globalThis (the function takes its Document
  // by argument explicitly).
  const g = globalThis as Record<string, unknown>;
  g.NodeFilter = dom.window.NodeFilter;
});

describe('linkifyHtml', () => {
  it('wraps a bare https URL in a new-window anchor', () => {
    const out = linkifyHtml('see https://example.com for more', document);
    expect(out).toContain(
      '<a href="https://example.com" target="_blank" rel="noopener noreferrer">https://example.com</a>',
    );
    expect(out.startsWith('see ')).toBe(true);
    expect(out.endsWith(' for more')).toBe(true);
  });

  it('strips trailing sentence punctuation off the URL', () => {
    const out = linkifyHtml('see https://example.com.', document);
    // The "." stays as a sibling text node, not part of the href.
    expect(out).toContain('href="https://example.com"');
    expect(out).not.toContain('href="https://example.com."');
    expect(out.endsWith('.')).toBe(true);
  });

  it('stamps existing http(s) anchors with target/rel', () => {
    const out = linkifyHtml(
      '<a class="link" href="https://anthropic.com">site</a>',
      document,
    );
    expect(out).toContain('target="_blank"');
    expect(out).toContain('rel="noopener noreferrer"');
    expect(out).toContain('class="link"');
  });

  it('does not stamp non-http hrefs (mailto, relative, anchor)', () => {
    const out = linkifyHtml(
      [
        '<a href="mailto:hi@example.com">email</a>',
        '<a href="#section">anchor</a>',
        '<a href="/relative">rel</a>',
      ].join(''),
      document,
    );
    expect(out).not.toMatch(/mailto:[^"]+"\s+target="_blank"/);
    expect(out).not.toMatch(/href="#section"\s+target="_blank"/);
    expect(out).not.toMatch(/href="\/relative"\s+target="_blank"/);
  });

  it('does not double-wrap text already inside an <a>', () => {
    const out = linkifyHtml(
      '<a href="https://anthropic.com">https://anthropic.com</a>',
      document,
    );
    // Only one anchor, with the existing text intact (no nested <a>).
    const anchorCount = (out.match(/<a /g) ?? []).length;
    expect(anchorCount).toBe(1);
  });

  it('skips URLs inside <code> and <pre> (preserves syntax-highlight markup)', () => {
    const codeOut = linkifyHtml(
      '<code>visit https://example.com here</code>',
      document,
    );
    expect(codeOut).not.toContain('<a ');
    const preOut = linkifyHtml(
      '<pre>https://example.com</pre>',
      document,
    );
    expect(preOut).not.toContain('<a ');
  });

  it('handles multiple URLs in a single text node', () => {
    const out = linkifyHtml(
      'a https://one.com b https://two.com c',
      document,
    );
    expect(out).toContain('href="https://one.com"');
    expect(out).toContain('href="https://two.com"');
    expect((out.match(/<a /g) ?? []).length).toBe(2);
  });

  it('returns input unchanged when there are no URLs', () => {
    const html = '<p>no links here</p>';
    expect(linkifyHtml(html, document)).toBe(html);
  });
});
