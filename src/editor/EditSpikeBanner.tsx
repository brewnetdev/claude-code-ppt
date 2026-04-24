export function EditSpikeBanner() {
  return (
    <div className="border-b border-editor-border bg-editor-panel/60 px-4 py-2 text-[11px] text-editor-dim">
      <span className="mr-3 rounded bg-editor-accent/20 px-1.5 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wider text-editor-accent">
        spike
      </span>
      <span className="mr-3">텍스트 클릭 → 인라인 편집</span>
      <span className="mr-3">·</span>
      <span className="mr-3">왼쪽 ⋮⋮ 그립 드래그 → 블록 순서 변경</span>
      <span className="mr-3">·</span>
      <span className="mr-3">이미지 파일 드롭 → 오버레이 추가 (선택 시 핸들로 이동/리사이즈)</span>
      <span className="mr-3">·</span>
      <span>Esc → 선택 해제</span>
    </div>
  );
}
