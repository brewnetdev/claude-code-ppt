export function Toolbar() {
  return (
    <header className="flex h-12 items-center justify-between border-b border-editor-border bg-editor-panel px-4">
      <div className="flex items-center gap-3">
        <span className="text-sm font-bold tracking-wide text-editor-accent">
          claude-code-ppt
        </span>
        <span className="text-xs text-editor-dim">Phase 0 — Scaffold preview</span>
      </div>
      <div className="flex items-center gap-2 text-xs text-editor-dim">
        <span>1280×720 (1.5× → 1920×1080 export)</span>
      </div>
    </header>
  );
}
