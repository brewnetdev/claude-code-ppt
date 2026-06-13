import { useEffect } from 'react';

type Props = {
  open: boolean;
  onClose: () => void;
};

type Row = { keys: string[]; desc: string };

const EDITING: Row[] = [
  { keys: ['클릭'], desc: '텍스트 인라인 편집 시작' },
  { keys: ['더블클릭'], desc: '해당 텍스트 요소 전체 선택 (즉시 덮어쓰기)' },
  { keys: ['⋮⋮ 드래그'], desc: '블록 순서 변경' },
  { keys: ['이미지 드롭'], desc: '오버레이 추가 (선택 시 핸들로 이동/리사이즈)' },
];

const NAVIGATION: Row[] = [
  { keys: ['↑', '↓'], desc: '슬라이드 이동' },
  { keys: ['Esc'], desc: '선택 해제 · 프레젠테이션 종료' },
  { keys: ['⛶ Present'], desc: '전체화면 프레젠테이션 (← →로 이동)' },
];

const SHORTCUTS: Row[] = [
  { keys: ['⌘Z', 'Ctrl+Z'], desc: 'Undo' },
  { keys: ['⇧⌘Z', 'Ctrl+Y'], desc: 'Redo' },
  { keys: ['⇧⌘S', 'Ctrl+Shift+S'], desc: '저장 (원본 HTML 덮어쓰기)' },
];

const VIEW: Row[] = [
  { keys: ['좌측 사이드바 줌'], desc: '썸네일 미리보기 크기 (50–200%)' },
  { keys: ['캔버스 우하단 줌'], desc: '슬라이드 미리보기 배율 (25–200%)' },
];

const EXPORT: Row[] = [
  { keys: ['Export HTML'], desc: '단일 HTML 번들 (오프라인 재생 가능)' },
  { keys: ['Export PDF'], desc: '브라우저 인쇄 미리보기 → PDF 저장' },
  { keys: ['현재 슬라이드 PNG'], desc: '현재 슬라이드 1920×1080 PNG (영상 삽입용)' },
];

export function HelpModal({ open, onClose }: Props) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[1500] flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-[min(680px,92vw)] max-h-[85vh] overflow-y-auto rounded-lg border border-editor-border bg-editor-panel p-6 text-sm text-editor-text shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-semibold tracking-wide text-editor-accent">
            도움말
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded px-2 py-1 text-editor-dim transition hover:bg-editor-bg hover:text-editor-text"
            aria-label="닫기"
          >
            ✕
          </button>
        </div>

        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          <Section title="편집" rows={EDITING} />
          <Section title="네비게이션" rows={NAVIGATION} />
          <Section title="단축키" rows={SHORTCUTS} />
          <Section title="뷰" rows={VIEW} />
          <Section title="내보내기" rows={EXPORT} />
        </div>

        <div className="mt-5 border-t border-editor-border pt-3 text-[11px] text-editor-dim">
          1280×720 작성 · 1920×1080 export · 자동 저장(localStorage)
        </div>
      </div>
    </div>
  );
}

function Section({ title, rows }: { title: string; rows: Row[] }) {
  return (
    <section>
      <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-editor-dim">
        {title}
      </h3>
      <ul className="space-y-1.5">
        {rows.map((r) => (
          <li key={r.desc} className="flex items-start gap-2 text-[12px]">
            <span className="flex shrink-0 flex-wrap gap-1">
              {r.keys.map((k) => (
                <kbd
                  key={k}
                  className="rounded border border-editor-border bg-editor-bg px-1.5 py-0.5 font-mono text-[10px] text-editor-text"
                >
                  {k}
                </kbd>
              ))}
            </span>
            <span className="text-editor-text/85">{r.desc}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
