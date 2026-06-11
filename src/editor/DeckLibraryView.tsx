import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { type Template } from '../generator/mdToSlides';
import { detectResourceKind } from '../importer/detectResource';
import {
  BUILTIN_DECKS,
  COURSE_OUTLINE,
  countSlides,
  OUTLINE_DECK_IDS,
  type CourseLevel,
  type DeckRegistryEntry,
} from '../library/deckRegistry';
import { type ResourceEntry, type ResourceKind } from '../library/resourceRegistry';
import {
  addHiddenDeckId,
  clearDeckFromLocalStorage,
  getHiddenDeckIds,
  removeHiddenDeckId,
} from '../persistence/localStore';
import {
  listRecentResources,
  removeRecentResource,
  type RecentResource,
} from '../persistence/recentResources';
import { showToast } from './Toast';

type DeckLibraryViewProps = {
  onOpen: (deck: DeckRegistryEntry) => void;
  onOpenResource: (entry: ResourceEntry, template?: Template) => void;
  onOpenRecent: (id: string) => void;
  // Tab to open on (so returning from an editor lands on the right section).
  initialTab?: LibraryTab;
};

type LibraryTab = 'decks' | 'resources';

export function DeckLibraryView({ onOpen, onOpenResource, onOpenRecent, initialTab = 'decks' }: DeckLibraryViewProps) {
  const [tab, setTab] = useState<LibraryTab>(initialTab);

  return (
    <div className="flex h-full flex-col bg-editor-bg text-editor-text">
      <header className="flex h-12 items-center gap-4 border-b border-editor-border bg-editor-panel px-4">
        <span className="text-sm font-bold tracking-wide text-editor-accent">claude-code-ppt</span>
        <nav className="flex items-center gap-1">
          <TabButton active={tab === 'decks'} onClick={() => setTab('decks')}>
            발표 데크
          </TabButton>
          <TabButton active={tab === 'resources'} onClick={() => setTab('resources')}>
            리소스 편집
          </TabButton>
        </nav>
      </header>
      <main className="flex-1 overflow-auto px-8 py-10">
        <div className="mx-auto max-w-[1144px]">
          {tab === 'decks' ? (
            <DeckGrid onOpen={onOpen} />
          ) : (
            <ResourcePanel onOpenResource={onOpenResource} onOpenRecent={onOpenRecent} />
          )}
        </div>
      </main>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded px-3 py-1 text-xs font-medium transition ${
        active
          ? 'bg-editor-accent/15 text-editor-accent'
          : 'text-editor-dim hover:text-editor-text'
      }`}
    >
      {children}
    </button>
  );
}

// ── Deck grid (원래 카드 그리드 + 카테고리 태그) ─────────────────────────────

function DeckGrid({ onOpen }: { onOpen: (deck: DeckRegistryEntry) => void }) {
  const [hiddenIds, setHiddenIds] = useState<string[]>(() => getHiddenDeckIds());
  const [showHidden, setShowHidden] = useState(false);

  const decksWithMeta = useMemo(
    () => BUILTIN_DECKS.map((d) => ({ ...d, slideCount: countSlides(d.html) })),
    [],
  );
  // Level cards (Lv.1~Lv.10) in course-outline order, each tagged with its
  // stage category. Levels with no backing deck render as a non-clickable
  // "발표자료 준비 중" card so the full curriculum (목차) is always visible.
  const levelItems = useMemo(() => {
    // Resolve each level's backing deck + slide count ONCE here (reusing the
    // already-memoized decksWithMeta) so LevelCard never re-runs countSlides —
    // a regex scan over multi-MB deck HTML — on every render.
    const byId = new Map(decksWithMeta.map((d) => [d.id, d]));
    return COURSE_OUTLINE.flatMap((s) =>
      s.levels.map((l) => {
        const deck = l.deckId ? byId.get(l.deckId) : undefined;
        return { ...l, category: s.name, deck, slideCount: deck?.slideCount ?? 0 };
      }),
    );
  }, [decksWithMeta]);
  // Non-level decks (커리큘럼 리포트 · 발표 소개 등) — kept in a separate section.
  const visibleOther = useMemo(
    () => decksWithMeta.filter((d) => !OUTLINE_DECK_IDS.has(d.id) && !hiddenIds.includes(d.id)),
    [decksWithMeta, hiddenIds],
  );
  const hiddenDecks = useMemo(
    () => decksWithMeta.filter((d) => hiddenIds.includes(d.id)),
    [decksWithMeta, hiddenIds],
  );

  const hideDeck = useCallback((deckId: string, deckTitle: string) => {
    const ok = window.confirm(
      `"${deckTitle}" 데크를 라이브러리에서 숨길까요?\n저장된 편집 내용도 함께 삭제됩니다.\n원본 슬라이드는 보존되며 "숨긴 데크 보기"에서 복원할 수 있습니다.`,
    );
    if (!ok) return;
    addHiddenDeckId(deckId);
    void clearDeckFromLocalStorage(deckId);
    setHiddenIds(getHiddenDeckIds());
    showToast({ message: `"${deckTitle}"을(를) 라이브러리에서 숨겼습니다.`, tone: 'info' });
  }, []);

  const restoreDeck = useCallback((deckId: string, deckTitle: string) => {
    removeHiddenDeckId(deckId);
    setHiddenIds(getHiddenDeckIds());
    showToast({ message: `"${deckTitle}"을(를) 복원했습니다.`, tone: 'info' });
  }, []);

  return (
    <>
      <div className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight">발표 데크 선택</h1>
        <p className="mt-1 text-sm text-editor-dim">
          🗺 강의 흐름 — 6단계 학습 여정 (Lv.1~Lv.10). 발표자료가 있는 레벨은 클릭해서 편집할 수
          있고, 준비 중인 레벨은 카드로만 표시됩니다. 편집 내용은 데크별로 자동 저장됩니다.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {levelItems.map((item) => (
          <LevelCard
            key={item.level}
            item={item}
            onOpen={onOpen}
            onHide={item.deck ? () => hideDeck(item.deck!.id, item.deck!.title) : undefined}
          />
        ))}
      </div>

      {visibleOther.length > 0 ? (
        <div className="mt-12">
          <h2 className="mb-1 text-sm font-semibold text-editor-text">참고 자료 · 기타 데크</h2>
          <p className="mb-4 text-xs text-editor-dim">
            커리큘럼 리포트·발표 소개 등 레벨 목차에 속하지 않는 데크입니다.
          </p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {visibleOther.map((deck) => (
              <DeckCard
                key={deck.id}
                deck={deck}
                onOpen={() => onOpen(deck)}
                onHide={() => hideDeck(deck.id, deck.title)}
              />
            ))}
          </div>
        </div>
      ) : null}

      {hiddenDecks.length > 0 ? (
        <div className="mt-10 border-t border-editor-border pt-6">
          <button
            type="button"
            className="text-xs text-editor-dim transition hover:text-editor-text"
            onClick={() => setShowHidden((v) => !v)}
          >
            {showHidden ? '▼' : '▶'} 숨긴 데크 {hiddenDecks.length}개 {showHidden ? '숨기기' : '보기'}
          </button>
          {showHidden ? (
            <ul className="mt-4 divide-y divide-editor-border rounded-md border border-editor-border bg-editor-panel/40">
              {hiddenDecks.map((deck) => (
                <li
                  key={deck.id}
                  className="flex items-center justify-between gap-3 px-4 py-3 text-sm"
                >
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-editor-text">{deck.title}</div>
                    <div className="truncate text-[11px] text-editor-dim">
                      {deck.template} · {deck.slideCount} slides
                    </div>
                  </div>
                  <button
                    type="button"
                    className="rounded border border-editor-border px-3 py-1 text-xs text-editor-dim transition hover:border-editor-accent hover:text-editor-accent"
                    onClick={() => restoreDeck(deck.id, deck.title)}
                  >
                    복원
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}
    </>
  );
}

// ── Level card (강의 목차 Lv.1~Lv.10) ───────────────────────────────────────

function LevelCard({
  item,
  onOpen,
  onHide,
}: {
  item: CourseLevel & {
    category: string;
    deck?: DeckRegistryEntry & { slideCount: number };
    slideCount: number;
  };
  onOpen: (deck: DeckRegistryEntry) => void;
  onHide?: () => void;
}) {
  const { deck, slideCount } = item;

  const header = (
    <div className={`mb-3 flex items-center justify-between gap-2 ${deck ? 'pr-7' : ''}`}>
      <div className="flex min-w-0 flex-wrap items-center gap-1.5">
        <span className="rounded bg-editor-accent/10 px-2 py-0.5 text-[10px] font-bold tracking-wider text-editor-accent">
          LV.{item.level}
        </span>
        <span className="truncate rounded border border-editor-border px-2 py-0.5 text-[10px] font-medium text-editor-dim">
          {item.category}
        </span>
      </div>
      {deck ? (
        <span className="shrink-0 text-[11px] text-editor-dim">{slideCount} slides</span>
      ) : (
        <span className="shrink-0 rounded border border-editor-border px-2 py-0.5 text-[10px] text-editor-dim">
          준비 중
        </span>
      )}
    </div>
  );

  const body = (
    <div className="flex-1">
      <h3 className="text-base font-semibold leading-snug text-editor-text">{item.label}</h3>
      <p className="mt-1 text-xs leading-relaxed text-editor-dim">{item.topic}</p>
    </div>
  );

  if (!deck) {
    // 발표자료 없는 레벨 — 클릭 불가 카드.
    return (
      <div className="flex h-full flex-col rounded-lg border border-dashed border-editor-border bg-editor-panel/40 p-5">
        {header}
        {body}
        <div className="mt-4 text-right text-xs text-editor-dim">발표자료 준비 중</div>
      </div>
    );
  }

  return (
    <div className="group relative flex h-full flex-col rounded-lg border border-editor-border bg-editor-panel transition hover:border-editor-accent hover:bg-editor-panel/80">
      {onHide ? (
        <button
          type="button"
          onClick={onHide}
          aria-label={`${deck.title} 숨기기`}
          title="라이브러리에서 숨김 (편집 캐시도 비워짐 — 복원하면 원본 HTML이 다시 반영됨)"
          className="absolute right-2 top-2 z-10 flex h-7 w-7 items-center justify-center rounded border border-editor-border bg-editor-bg text-base leading-none text-editor-dim shadow-sm transition hover:border-red-400 hover:bg-red-500/10 hover:text-red-300 focus:outline-none focus:ring-1 focus:ring-editor-accent"
        >
          ×
        </button>
      ) : null}
      <button
        type="button"
        onClick={() => onOpen(deck)}
        className="flex h-full flex-1 flex-col items-stretch p-5 text-left"
      >
        {header}
        {body}
        <div className="mt-4 flex items-center justify-end text-xs text-editor-dim transition group-hover:text-editor-accent">
          편집 열기 →
        </div>
      </button>
    </div>
  );
}

type DeckCardProps = {
  deck: DeckRegistryEntry & { slideCount: number };
  onOpen: () => void;
  onHide: () => void;
};

function DeckCard({ deck, onOpen, onHide }: DeckCardProps) {
  return (
    <div className="group relative flex h-full flex-col rounded-lg border border-editor-border bg-editor-panel transition hover:border-editor-accent hover:bg-editor-panel/80">
      <button
        type="button"
        onClick={onHide}
        aria-label={`${deck.title} 삭제`}
        title="라이브러리에서 삭제 (편집 내용도 함께 비워짐)"
        className="absolute right-2 top-2 z-10 flex h-7 w-7 items-center justify-center rounded border border-editor-border bg-editor-bg text-base leading-none text-editor-dim shadow-sm transition hover:border-red-400 hover:bg-red-500/10 hover:text-red-300 focus:outline-none focus:ring-1 focus:ring-editor-accent"
      >
        ×
      </button>
      <button
        type="button"
        onClick={onOpen}
        className="flex h-full flex-1 flex-col items-stretch p-5 text-left"
      >
        <div className="mb-3 flex items-center justify-between pr-6">
          <span className="rounded bg-editor-accent/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-editor-accent">
            {deck.template}
          </span>
          <span className="text-[11px] text-editor-dim">{deck.slideCount} slides</span>
        </div>
        <div className="flex-1">
          <h3 className="text-base font-semibold leading-snug text-editor-text">{deck.title}</h3>
          {deck.subtitle ? (
            <p className="mt-1 text-xs leading-relaxed text-editor-dim">{deck.subtitle}</p>
          ) : null}
        </div>
        <div className="mt-4 flex items-center justify-end text-xs text-editor-dim transition group-hover:text-editor-accent">
          편집 열기 →
        </div>
      </button>
    </div>
  );
}

// ── Resource panel (new) ────────────────────────────────────────────────────

const KIND_LABEL: Record<ResourceKind, string> = {
  'slide-html': '슬라이드 HTML',
  'flow-html': 'HTML 문서',
  md: 'Markdown',
};

function ResourcePanel({
  onOpenResource,
  onOpenRecent,
}: {
  onOpenResource: (entry: ResourceEntry, template?: Template) => void;
  onOpenRecent: (id: string) => void;
}) {
  const [template, setTemplate] = useState<Template>('presentation');
  const [dragging, setDragging] = useState(false);
  const [busy, setBusy] = useState(false);
  const [recents, setRecents] = useState<RecentResource[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    void listRecentResources().then(setRecents);
  }, []);

  const refreshRecents = useCallback(() => {
    void listRecentResources().then(setRecents);
  }, []);

  const handleFiles = useCallback(
    async (files: FileList | null) => {
      const file = files?.[0];
      if (!file) return;
      setBusy(true);
      try {
        const content = await file.text();
        const kind = detectResourceKind(file.name, content);
        const id = file.name.replace(/\.(html?|md|markdown)$/i, '');
        const entry: ResourceEntry = {
          id,
          title: id,
          path: file.name,
          kind,
          origin: 'upload',
          raw: content,
        };
        onOpenResource(entry, template);
      } catch (err) {
        console.error('resource upload failed', err);
        showToast({ message: '파일을 읽지 못했습니다.', tone: 'error' });
      } finally {
        setBusy(false);
      }
    },
    [onOpenResource, template],
  );

  return (
    <>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">리소스 편집</h1>
        <p className="mt-1 text-sm text-editor-dim">
          HTML 또는 Markdown을 업로드해 편집하세요. 슬라이드형 HTML과 Markdown은 발표 데크
          에디터로, 그 외 HTML 문서는 문서 편집 캔버스로 열립니다. 편집한 리소스는 아래 목록에서
          다시 열 수 있습니다.
        </p>
      </div>

      <div className="mb-3 flex items-center gap-2 text-xs text-editor-dim">
        <span>MD → 슬라이드 템플릿:</span>
        {(['presentation', 'portfolio', 'report'] as Template[]).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTemplate(t)}
            title="Markdown 업로드 시 적용 (HTML 업로드에는 영향 없음)"
            className={`rounded border px-2 py-0.5 transition ${
              template === t
                ? 'border-editor-accent text-editor-accent'
                : 'border-editor-border hover:border-editor-accent hover:text-editor-accent'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          void handleFiles(e.dataTransfer.files);
        }}
        onClick={() => fileRef.current?.click()}
        className={`mb-8 cursor-pointer rounded-lg border-2 border-dashed px-6 py-10 text-center text-sm transition ${
          dragging
            ? 'border-editor-accent bg-editor-accent/5 text-editor-accent'
            : 'border-editor-border bg-editor-panel/40 text-editor-dim hover:border-editor-accent'
        }`}
      >
        {busy ? '여는 중…' : 'HTML · MD 파일을 끌어다 놓거나 클릭해서 업로드'}
        <input
          ref={fileRef}
          type="file"
          accept=".html,.htm,.md,.markdown"
          className="hidden"
          onChange={(e) => void handleFiles(e.target.files)}
        />
      </div>

      {recents.length > 0 ? (
        <div className="mb-8">
          <h2 className="mb-3 text-sm font-semibold text-editor-text">
            최근 / 업로드 리소스 {recents.length}개
          </h2>
          <ul className="divide-y divide-editor-border rounded-md border border-editor-border bg-editor-panel/40">
            {recents.map((r) => (
              <li
                key={`recent:${r.id}`}
                className="flex items-center justify-between gap-3 px-4 py-3 text-sm"
              >
                <div className="min-w-0 flex-1">
                  <div className="truncate text-editor-text">{r.title}</div>
                  <div className="truncate text-[11px] text-editor-dim">
                    {r.origin === 'upload' ? '업로드' : r.path}
                  </div>
                </div>
                <span className="shrink-0 rounded bg-editor-accent/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-editor-accent">
                  {KIND_LABEL[r.kind]}
                </span>
                <button
                  type="button"
                  className="shrink-0 rounded border border-editor-border px-3 py-1 text-xs text-editor-dim transition hover:border-editor-accent hover:text-editor-accent"
                  onClick={() => onOpenRecent(r.id)}
                >
                  편집 열기 →
                </button>
                <button
                  type="button"
                  title="목록에서 제거"
                  className="shrink-0 rounded border border-editor-border px-2 py-1 text-xs text-editor-dim transition hover:border-red-400 hover:text-red-300"
                  onClick={() => {
                    void removeRecentResource(r.id).then(refreshRecents);
                  }}
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <div className="rounded-lg border border-dashed border-editor-border bg-editor-panel/40 px-6 py-8 text-center text-sm text-editor-dim">
          아직 편집한 리소스가 없습니다. 위에서 HTML·MD 파일을 업로드하세요.
        </div>
      )}
    </>
  );
}
