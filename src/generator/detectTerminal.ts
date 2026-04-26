import type { Code } from 'mdast';

const TERMINAL_LANGS = new Set(['bash', 'sh', 'shell', 'zsh', 'console']);
const TERMINAL_PROMPTS = /^\s*(?:\$|>|#)\s+/m;
const TERMINAL_COMMANDS =
  /^\s*(?:git|npm|npx|yarn|pnpm|bun|cd|ls|cat|curl|wget|docker|kubectl|brew|apt|pip|python|node|deno)\b/m;

// Two MD authoring conventions for shell sessions:
//  1) fenced ```bash blocks  → trivial, look at lang
//  2) commands written inline as indented plain text (npm 가이드.md)
//     → arrive as `code` nodes with no `lang` set; we sniff the body
//
// Returns 'terminal' for shell sessions, 'code' for everything else.
export function classifyCodeBlock(node: Code): 'terminal' | 'code' {
  const lang = (node.lang ?? '').toLowerCase();
  if (TERMINAL_LANGS.has(lang)) return 'terminal';
  if (lang) return 'code';

  // No language tag — apply heuristic on the body. Strong signal: a `$ ` or
  // `> ` prompt anywhere. Weaker signal: command-like first token.
  const body = node.value ?? '';
  if (TERMINAL_PROMPTS.test(body)) return 'terminal';
  if (TERMINAL_COMMANDS.test(body)) return 'terminal';
  return 'code';
}

// Best-effort language hint for shiki. Falls back to plaintext when the MD
// fence had no lang (we can't infer Java vs JS reliably from a snippet).
export function inferLang(node: Code): string {
  const lang = (node.lang ?? '').toLowerCase();
  if (TERMINAL_LANGS.has(lang)) return 'bash';
  if (lang === 'jsx') return 'jsx';
  if (lang === 'tsx') return 'tsx';
  if (lang === 'ts' || lang === 'typescript') return 'typescript';
  if (lang === 'js' || lang === 'javascript') return 'javascript';
  if (lang === 'py' || lang === 'python') return 'python';
  if (lang === 'java') return 'plaintext'; // shiki bundle excludes Java; fall back
  if (lang === 'json') return 'json';
  if (lang === 'yaml' || lang === 'yml') return 'yaml';
  if (lang === 'html') return 'html';
  if (lang === 'css') return 'css';
  if (lang === 'md' || lang === 'markdown') return 'markdown';
  return 'plaintext';
}
