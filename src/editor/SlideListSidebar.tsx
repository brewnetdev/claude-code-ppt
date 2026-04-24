export function SlideListSidebar() {
  return (
    <aside className="flex h-full w-56 flex-col border-r border-editor-border bg-editor-panel">
      <div className="border-b border-editor-border px-3 py-2 text-xs font-semibold uppercase tracking-wider text-editor-dim">
        Slides
      </div>
      <div className="flex-1 overflow-y-auto p-2">
        <button
          type="button"
          className="flex w-full items-center gap-2 rounded border border-editor-accent/40 bg-editor-accent/10 px-2 py-2 text-left text-xs text-editor-text"
        >
          <span className="font-mono text-[10px] text-editor-accent">01</span>
          <span className="truncate">Kent Beck 증강코딩 5원칙</span>
        </button>
        <p className="px-2 py-3 text-[11px] text-editor-dim">
          Phase 1에서 Importer가 슬라이드 목록을 채웁니다.
        </p>
      </div>
    </aside>
  );
}
