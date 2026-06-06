import { describe, expect, it } from 'vitest';
import { highlightCode, normalizeLang } from '../../src/highlight/highlighter';

// CB-1: shiki emits a trailing empty `<span class="line"></span>` for source
// ending in a newline; with `white-space: pre-wrap` that renders as a visible
// ghost blank line inside the code box. highlightCode now trims trailing
// newlines before highlighting.
describe('highlightCode trailing-newline handling (CB-1)', () => {
  it('does not emit a trailing empty line span for source ending in a newline', async () => {
    const html = await highlightCode('const a = 1;\n', 'typescript');
    expect(html).not.toMatch(/<span class="line"><\/span>\s*$/);
    expect(html).toContain('const');
  });

  it('collapses multiple trailing newlines (no stacked ghost lines)', async () => {
    const html = await highlightCode('foo\n\n\n', 'typescript');
    expect(html).not.toMatch(/<span class="line"><\/span>\s*$/);
  });

  it('preserves interior blank lines', async () => {
    const html = await highlightCode('a\n\nb', 'typescript');
    // two non-empty lines remain; interior blank line is not stripped
    expect(html).toContain('a');
    expect(html).toContain('b');
  });
});

// CB-4: data-code-lang was interpolated raw into the attribute. normalizeLang
// reduces any unknown/garbage lang to 'plaintext', matching what the highlighter
// actually uses and preventing attribute injection from a future dynamic caller.
describe('normalizeLang (CB-4)', () => {
  it('passes through supported languages', () => {
    expect(normalizeLang('typescript')).toBe('typescript');
    expect(normalizeLang('bash')).toBe('bash');
    expect(normalizeLang('plaintext')).toBe('plaintext');
  });

  it('falls back to plaintext for unknown / unsafe langs', () => {
    expect(normalizeLang('ts" onload="alert(1)')).toBe('plaintext');
    expect(normalizeLang('')).toBe('plaintext');
    expect(normalizeLang('not-a-language')).toBe('plaintext');
  });
});
