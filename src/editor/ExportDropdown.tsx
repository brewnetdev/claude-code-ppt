// Export actions: HTML bundle (always) + current-slide PNG (deck mode only —
// passed via onExportPng; omitted in document mode where there are no slides).
type Props = {
  busy: null | 'html' | 'png';
  disabled?: boolean;
  onExportHtml: () => void;
  onExportPng?: () => void;
};

const BTN =
  'rounded border border-editor-accent/50 px-2.5 py-1 text-xs font-medium text-editor-accent transition hover:bg-editor-accent/10 disabled:cursor-not-allowed disabled:opacity-40';

export function ExportDropdown({ busy, disabled, onExportHtml, onExportPng }: Props) {
  return (
    <div className="flex items-center gap-1.5">
      {onExportPng ? (
        <button
          type="button"
          onClick={onExportPng}
          disabled={disabled}
          title="현재 슬라이드를 1920×1080 PNG로 저장 (영상 삽입용)"
          className={BTN}
        >
          {busy === 'png' ? 'Exporting…' : '현재 슬라이드 PNG'}
        </button>
      ) : null}
      <button
        type="button"
        onClick={onExportHtml}
        disabled={disabled}
        title="단일 HTML 번들 다운로드"
        className={BTN}
      >
        {busy === 'html' ? 'Exporting…' : 'Export HTML'}
      </button>
    </div>
  );
}
