export function PropertiesPanel() {
  return (
    <aside className="flex h-full w-72 flex-col border-l border-editor-border bg-editor-panel">
      <div className="border-b border-editor-border px-3 py-2 text-xs font-semibold uppercase tracking-wider text-editor-dim">
        Properties
      </div>
      <div className="flex-1 overflow-y-auto p-3">
        <p className="text-[11px] leading-relaxed text-editor-dim">
          Phase 2에서 선택된 블록의 속성(텍스트 스타일, 위치/크기, 이미지
          소스 등)을 여기서 편집합니다.
        </p>
      </div>
    </aside>
  );
}
