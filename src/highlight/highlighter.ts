// Lazy shiki singleton. The dynamic import keeps shiki out of the initial
// bundle — it only ships when the user actually inserts or edits a code
// block. We pin a single dark theme (github-dark) and a curated language
// list so the loaded chunk stays predictable.
import type { BundledLanguage, BundledTheme, Highlighter } from 'shiki';

const THEME: BundledTheme = 'github-dark';

// `plaintext` is a shiki builtin that never needs grammar loading, so we
// keep it out of `langs` (which has a stricter `BundledLanguage` type) and
// special-case it via LANG_SET membership for input validation only.
const LANGS: readonly BundledLanguage[] = [
  'bash',
  'shell',
  'typescript',
  'javascript',
  'tsx',
  'jsx',
  'json',
  'yaml',
  'markdown',
  'html',
  'css',
  'python',
  'java',
];

const LANG_SET = new Set<string>([...(LANGS as readonly string[]), 'plaintext']);

let highlighterPromise: Promise<Highlighter> | null = null;

async function getHighlighter(): Promise<Highlighter> {
  if (!highlighterPromise) {
    highlighterPromise = (async () => {
      const { createHighlighter } = await import('shiki');
      return createHighlighter({
        themes: [THEME],
        langs: LANGS as BundledLanguage[],
      });
    })();
  }
  return highlighterPromise;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

// Reduce any unsupported/unknown language to the safe builtin `plaintext`.
// Exported so callers that bake the language into markup (data-code-lang) use
// the SAME value shiki actually highlights with — and can't inject via the
// attribute when a future caller passes a dynamic/untrusted lang.
export function normalizeLang(lang: string): string {
  return LANG_SET.has(lang) ? lang : 'plaintext';
}

// Returns the inner HTML of shiki's `<code>` element so callers can drop it
// into their own `<pre><code>` wrapper. shiki normally produces a full
// `<pre class="shiki ..."><code>...</code></pre>`; we strip the outer pre
// because brewnet's `.code-block` and `.terminal` already provide the box.
export async function highlightCode(source: string, lang: string): Promise<string> {
  // Trim trailing newlines so shiki doesn't emit a trailing empty
  // `<span class="line"></span>`, which renders as a ghost blank line under the
  // box's `white-space: pre-wrap`. Interior blank lines are preserved.
  const src = source.replace(/\n+$/, '');
  try {
    const hl = await getHighlighter();
    const html = hl.codeToHtml(src, {
      lang: normalizeLang(lang) as BundledLanguage,
      theme: THEME,
    });
    const match = html.match(/<code[^>]*>([\s\S]*?)<\/code>/);
    return match ? match[1] : escapeHtml(src);
  } catch {
    return escapeHtml(src);
  }
}

export const SUPPORTED_LANGS: ReadonlyArray<{ value: string; label: string }> = [
  { value: 'plaintext', label: 'Plain Text' },
  { value: 'bash', label: 'Bash / Shell' },
  { value: 'typescript', label: 'TypeScript' },
  { value: 'javascript', label: 'JavaScript' },
  { value: 'tsx', label: 'TSX' },
  { value: 'jsx', label: 'JSX' },
  { value: 'json', label: 'JSON' },
  { value: 'yaml', label: 'YAML' },
  { value: 'markdown', label: 'Markdown' },
  { value: 'html', label: 'HTML' },
  { value: 'css', label: 'CSS' },
  { value: 'python', label: 'Python' },
  { value: 'java', label: 'Java' },
];
