// Curated font list shown in TextFormatPanel's font picker.
//
// "System": OS-bundled families that need no external download. We keep the
// brewnet sample's defaults (Pretendard, Apple SD Gothic Neo, Malgun Gothic)
// here too — they're effectively system on the platforms that ship them.
//
// "Developer-friendly": Google Fonts curated for code / technical material.
// Monospace family is the headline use case (JetBrains Mono is brewnet's
// default code font), but a few engineering-blog sans-serifs are included
// for body text. Google Fonts are fetched lazily on first selection so the
// dropdown itself is free.

export type FontEntry = {
  name: string;
  // Full font-family stack written to inline style on the wrapper span.
  cssStack: string;
  // If present, the family is fetched via Google Fonts on first selection.
  // Use the URL-friendly form ("JetBrains+Mono") consumed by /css2.
  google?: string;
};

export type FontGroup = {
  label: string;
  entries: FontEntry[];
};

export const SYSTEM_FONTS: FontEntry[] = [
  { name: '시스템 기본', cssStack: 'system-ui, -apple-system, "Segoe UI", sans-serif' },
  { name: 'Sans-serif', cssStack: 'sans-serif' },
  { name: 'Serif', cssStack: 'serif' },
  { name: 'Monospace', cssStack: 'ui-monospace, Menlo, Consolas, monospace' },
  { name: 'Pretendard', cssStack: '"Pretendard", system-ui, sans-serif' },
  { name: 'Apple SD Gothic Neo', cssStack: '"Apple SD Gothic Neo", sans-serif' },
  { name: '맑은 고딕', cssStack: '"Malgun Gothic", sans-serif' },
];

export const DEV_MONO_FONTS: FontEntry[] = [
  { name: 'JetBrains Mono', cssStack: '"JetBrains Mono", ui-monospace, monospace', google: 'JetBrains+Mono' },
  { name: 'Fira Code', cssStack: '"Fira Code", ui-monospace, monospace', google: 'Fira+Code' },
  { name: 'Source Code Pro', cssStack: '"Source Code Pro", ui-monospace, monospace', google: 'Source+Code+Pro' },
  { name: 'IBM Plex Mono', cssStack: '"IBM Plex Mono", ui-monospace, monospace', google: 'IBM+Plex+Mono' },
  { name: 'Roboto Mono', cssStack: '"Roboto Mono", ui-monospace, monospace', google: 'Roboto+Mono' },
  { name: 'Inconsolata', cssStack: '"Inconsolata", ui-monospace, monospace', google: 'Inconsolata' },
  { name: 'Space Mono', cssStack: '"Space Mono", ui-monospace, monospace', google: 'Space+Mono' },
  { name: 'Ubuntu Mono', cssStack: '"Ubuntu Mono", ui-monospace, monospace', google: 'Ubuntu+Mono' },
];

export const DEV_SANS_FONTS: FontEntry[] = [
  { name: 'Inter', cssStack: '"Inter", system-ui, sans-serif', google: 'Inter' },
  { name: 'Roboto', cssStack: '"Roboto", system-ui, sans-serif', google: 'Roboto' },
  { name: 'Open Sans', cssStack: '"Open Sans", system-ui, sans-serif', google: 'Open+Sans' },
  { name: 'Noto Sans KR', cssStack: '"Noto Sans KR", sans-serif', google: 'Noto+Sans+KR' },
  { name: 'Source Sans 3', cssStack: '"Source Sans 3", system-ui, sans-serif', google: 'Source+Sans+3' },
];

export const FONT_GROUPS: FontGroup[] = [
  { label: '시스템', entries: SYSTEM_FONTS },
  { label: '개발자 · Mono', entries: DEV_MONO_FONTS },
  { label: '개발자 · Sans', entries: DEV_SANS_FONTS },
];

const loaded = new Set<string>();

// Inject a single <link> per family on demand. Subsequent calls are no-ops.
export function loadGoogleFont(google: string | undefined): void {
  if (!google || loaded.has(google)) return;
  loaded.add(google);
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = `https://fonts.googleapis.com/css2?family=${google}:wght@400;500;700&display=swap`;
  document.head.appendChild(link);
}
