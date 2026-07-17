// Built-in deck registry.
//
// Decks are HTML files committed under docs/html/<template>/<id>.html.
// Vite's `import.meta.glob` resolves them at build time so the library grid
// always reflects whatever ships in the repo — no hand-edit step. The
// `slideplan publish` CLI writes new decks straight into that tree.
//
// Stable IDs matter: localStorage edits are keyed by deck id. The
// override maps below let us pin a title/subtitle/priority for hand-curated
// decks (e.g. the Brewnet sample) without changing their on-disk filename.

// Restricted to the three template subdirs so unrelated reference HTML at
// docs/html/* and docs/html/manual/* (developer scratch files, not decks)
// stays out of the bundle and out of the library grid.
const eagerHtml = import.meta.glob(
  '../../docs/html/{presentation,portfolio,report}/**/*.html',
  { query: '?raw', import: 'default', eager: true },
) as Record<string, string>;

export type DeckTemplate = 'presentation' | 'portfolio' | 'report';
export type DeckSourceKind = 'builtin';

export type DeckRegistryEntry = {
  id: string;
  title: string;
  subtitle?: string;
  template: DeckTemplate;
  kind: DeckSourceKind;
  html: string;
  // sha256-truncated identity of the slides markup, emitted by `slideplan
  // publish` as `<meta name="deck-source-hash" content="...">`. Absent for
  // hand-authored decks (e.g. brewnet-presentation) — those never trigger
  // stale-cache detection.
  sourceHash?: string;
};

const KNOWN_TEMPLATES: ReadonlyArray<DeckTemplate> = ['presentation', 'portfolio', 'report'];

const TITLE_OVERRIDES: Record<string, string> = {
  'brewnet-presentation': 'Brewnet — Claude Code Master',
};

const SUBTITLE_OVERRIDES: Record<string, string> = {
  'brewnet-presentation': '브루넷 발표 데크 (샘플)',
};

// Lower priority sorts first. Anything not listed lands at the end in
// alphabetical id order, which gives a stable but unsurprising default.
const PRIORITY: Record<string, number> = {
  'brewnet-presentation': 10,
};

function inferTemplate(path: string): DeckTemplate | null {
  for (const t of KNOWN_TEMPLATES) {
    if (path.includes(`/docs/html/${t}/`)) return t;
  }
  return null;
}

function basename(path: string): string {
  const i = path.lastIndexOf('/');
  return i >= 0 ? path.slice(i + 1) : path;
}

function stem(filename: string): string {
  return filename.replace(/\.html$/i, '');
}

function extractTitle(html: string): string | null {
  const m = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  if (!m) return null;
  const decoded = m[1]
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim();
  return decoded.length > 0 ? decoded : null;
}

function extractMetaSubtitle(html: string): string | null {
  // `<meta name="subtitle" content="...">` — published decks may emit this so
  // the registry can pick up agent-authored subtitles without an overrides patch.
  const m = html.match(/<meta\s+name=["']subtitle["']\s+content=["']([^"']*)["']/i);
  if (!m) return null;
  const v = m[1].trim();
  return v.length > 0 ? v : null;
}

function extractMetaSourceHash(html: string): string | null {
  const m = html.match(/<meta\s+name=["']deck-source-hash["']\s+content=["']([^"']*)["']/i);
  if (!m) return null;
  const v = m[1].trim();
  return v.length > 0 ? v : null;
}

function buildRegistry(): DeckRegistryEntry[] {
  const out: DeckRegistryEntry[] = [];
  for (const [path, html] of Object.entries(eagerHtml)) {
    const template = inferTemplate(path);
    if (!template) continue;
    const id = stem(basename(path));
    const fileTitle = extractTitle(html);
    const title = TITLE_OVERRIDES[id] ?? fileTitle ?? id;
    const subtitle = SUBTITLE_OVERRIDES[id] ?? extractMetaSubtitle(html) ?? undefined;
    const sourceHash = extractMetaSourceHash(html) ?? undefined;
    out.push({ id, title, subtitle, template, kind: 'builtin', html, sourceHash });
  }
  out.sort((a, b) => {
    const pa = PRIORITY[a.id] ?? 1000;
    const pb = PRIORITY[b.id] ?? 1000;
    if (pa !== pb) return pa - pb;
    return a.id.localeCompare(b.id);
  });
  return out;
}

export const BUILTIN_DECKS: DeckRegistryEntry[] = buildRegistry();

export function getDeckById(id: string): DeckRegistryEntry | undefined {
  return BUILTIN_DECKS.find((d) => d.id === id);
}

// Approximate slide count for the library card without full DOMParser cost.
// Walks every <div class="..."> tag, splits the class string on whitespace,
// and counts those where `slide` appears as a complete token. The naive
// /<div\s+class="slide"/ regex misses real-world variants like
// `class="slide slide-cover"` or `class="slide s01"` that the live parser
// (`querySelector('div.slide')`) does pick up — this kept reported slide
// counts wrong for most hand-authored decks before the fix.
export function countSlides(html: string): number {
  const re = /<div\b[^>]*\sclass="([^"]*)"/g;
  let count = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    const tokens = m[1].split(/\s+/);
    if (tokens.includes('slide')) count++;
  }
  return count;
}

// ── Course outline (강의 목차) ───────────────────────────────────────────────
//
// The library "발표 데크" screen renders this curated outline instead of a flat
// grid — Level 1~10 grouped by the 6-stage learning journey, mirroring the
// curriculum report's "세부 주제와 프로젝트 설명" table (page 03).
//
// `deckId` points at a chapter deck (docs/html/report/*.html). After the
// 2026-06 curriculum renumber the on-disk files are 1:1 with the new level
// numbering (level2-chapter2 = L2, … level9-chapter9 = L9), so deckId == file
// stem — no topic indirection. The old LEVEL 2 was split into L2 (협업 원칙 +
// /init·CLAUDE.md) and L3 (증강코딩·TDD·SDD·실습); everything from the old L3
// shifted +1; 베스트 프렉티스 folded into L9 (하네스 합본). Levels with no
// dedicated 발표 덱 (L10 딥 다이브, L11 Local LLM) omit `deckId`.
export type CourseLevel = {
  level: number;
  label: string;
  topic: string;
  // Backing deck id (a BUILTIN_DECKS id). Absent → list-only ("발표자료 준비 중").
  deckId?: string;
};

export type CourseStage = {
  name: string;
  levels: CourseLevel[];
};

export const COURSE_OUTLINE: ReadonlyArray<CourseStage> = [
  {
    name: '강의 소개',
    levels: [
      {
        level: 0,
        label: '강의 소개 · 단계별 학습 가이드',
        topic: 'LEVEL 1–7 전체 지도 · 레벨별 PART 구성 · 저자 직강 소개',
        deckId: 'claude-code-course-intro',
      },
    ],
  },
  {
    name: '설치 · 개발 환경',
    levels: [
      {
        level: 1,
        label: '환경 구축 · 개발 환경 설정',
        topic: '터미널·Git 기초, Claude Code 개요·설치·환경설정',
        deckId: 'claude-code-level1-chapter1',
      },
    ],
  },
  {
    name: '기초 개념',
    levels: [
      {
        level: 2,
        label: 'AI 시대 개발 방법론',
        topic: '설계·쪼개기·명확한 지시·리뷰 · /init·CLAUDE.md 프로젝트 설정',
        deckId: 'claude-code-level2-chapter2',
      },
      {
        level: 3,
        label: 'TDD · SDD(SpecKit) 워크플로우',
        topic: '증강코딩·TDD·SDD·프로젝트 구조·Git · 32 UI 컴포넌트 실습',
        deckId: 'claude-code-level3-chapter3',
      },
      {
        level: 4,
        label: '스킬 · 커맨드 · Hook · MCP',
        topic: '슬래시 커맨드, Skill, Hook, MCP — Claude Code 확장과 자동화',
        deckId: 'claude-code-level4-chapter4',
      },
    ],
  },
  {
    name: '개발',
    levels: [
      {
        level: 5,
        label: '실전 워크플로우',
        topic: '기획·명세·SDD 풀스택, 디버깅·리팩토링·프론트엔드',
        deckId: 'claude-code-level5-chapter5',
      },
    ],
  },
  {
    name: '배포 · 운영',
    levels: [
      {
        level: 6,
        label: '빌드, 배포, 서비스 운영',
        topic: 'CI/CD·Vercel·Railway·Cloudflare 셀프호스팅·보안 점검·구글/네이버 검색 등록',
        deckId: 'claude-code-level7-chapter7',
      },
    ],
  },
  {
    name: '고급',
    levels: [
      {
        level: 7,
        label: '멀티 에이전트 & 워크플로우 오케스트레이션',
        topic: '서브에이전트 · Dynamic Workflows · Agent Teams · 선택 기준 · CI/CD 자동화',
        deckId: 'claude-code-level7-subagent',
      },
      {
        level: 8,
        label: '하네스 엔지니어링 · 베스트 프렉티스',
        topic: '하네스 정의·5레벨 구축·완성형 파이프라인·실증 사례·EDD',
        deckId: 'claude-code-level9-chapter9',
      },
      {
        level: 9,
        label: '하네스 엔지니어링 · Evaluator 제어',
        topic: '바이브→검증된 코딩 · 하네스 5단계 · Evaluator 설계 · EDD 평가 게이트',
        deckId: 'claude-code-harness-evaluator',
      },
      {
        level: 10,
        label: 'Local LLM 설치와 활용',
        topic: '로컬 LLM·Ollama·Qwen·Gemma 활용',
      },
    ],
  },
];

// Deck ids referenced by the outline — so the library can list every OTHER
// built-in deck (cover/report/sample decks) separately without duplication.
export const OUTLINE_DECK_IDS: ReadonlySet<string> = new Set(
  COURSE_OUTLINE.flatMap((s) => s.levels.map((l) => l.deckId).filter((id): id is string => !!id)),
);
