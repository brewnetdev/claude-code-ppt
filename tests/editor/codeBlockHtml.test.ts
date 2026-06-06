import { describe, expect, it } from 'vitest';
import {
  buildCodeBlockHtml,
  buildTerminalHtml,
} from '../../src/editor/codeBlockHtml';

// CB-4: `data-code-lang` was interpolated raw. Validate that an unsupported /
// unsafe lang is reduced to plaintext (matching what shiki actually uses) and
// can never break out of the attribute.
describe('codeBlockHtml — data-code-lang safety (CB-4)', () => {
  it('reduces an unknown/unsafe lang to plaintext and does not break the attribute', async () => {
    const html = await buildCodeBlockHtml('const a = 1;', 'ts" onload="alert(1)');
    expect(html).not.toContain('onload=');
    expect(html).toContain('data-code-lang="plaintext"');
  });

  it('passes through a supported lang', async () => {
    const html = await buildCodeBlockHtml('x', 'typescript');
    expect(html).toContain('data-code-lang="typescript"');
  });

  it('terminal blocks are tagged bash', async () => {
    const html = await buildTerminalHtml('$ ls');
    expect(html).toContain('data-code-lang="bash"');
  });
});
