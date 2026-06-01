// Single HTML-export action. (Previously a dropdown with PDF/PNG; PDF was
// removed as non-working and PNG export was dropped — HTML export is the only
// export path now, so a plain button is clearer than a one-item menu.)
type Props = {
  busy: null | 'html';
  disabled?: boolean;
  onExportHtml: () => void;
};

export function ExportDropdown({ busy, disabled, onExportHtml }: Props) {
  return (
    <button
      type="button"
      onClick={onExportHtml}
      disabled={disabled}
      title="단일 HTML 번들 다운로드"
      className="rounded border border-editor-accent/50 px-2.5 py-1 text-xs font-medium text-editor-accent transition hover:bg-editor-accent/10 disabled:cursor-not-allowed disabled:opacity-40"
    >
      {busy === 'html' ? 'Exporting…' : 'Export HTML'}
    </button>
  );
}
