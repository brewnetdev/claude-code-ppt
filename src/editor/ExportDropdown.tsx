import { useEffect, useRef, useState } from 'react';

type Busy = null | 'html' | 'pdf' | 'png';

type Props = {
  busy: Busy;
  disabled?: boolean;
  onExportHtml: () => void;
  // Optional: flowing-document mode has no slides, so PNG export is omitted.
  onExportPng?: () => void;
};

export function ExportDropdown({
  busy,
  disabled,
  onExportHtml,
  onExportPng,
}: Props) {
  const [open, setOpen] = useState(false);
  const popoverRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const onDocMouseDown = (e: MouseEvent) => {
      const target = e.target as Node | null;
      if (!target) return;
      if (popoverRef.current?.contains(target)) return;
      setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', onDocMouseDown);
    window.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDocMouseDown);
      window.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const label =
    busy === 'html'
      ? 'Exporting…'
      : busy === 'pdf'
        ? 'Opening…'
        : busy === 'png'
          ? 'Rendering…'
          : 'Export ▾';

  const wrap = (fn: () => void) => () => {
    setOpen(false);
    fn();
  };

  return (
    <div ref={popoverRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        disabled={disabled}
        className="rounded border border-editor-accent/50 px-2.5 py-1 text-xs font-medium text-editor-accent transition hover:bg-editor-accent/10 disabled:cursor-not-allowed disabled:opacity-40"
      >
        {label}
      </button>
      {open ? (
        <div className="absolute right-0 top-full z-50 mt-1 w-44 overflow-hidden rounded-md border border-editor-border bg-editor-panel shadow-2xl">
          <ExportItem
            onClick={wrap(onExportHtml)}
            label="Export HTML"
            hint="단일 HTML 번들 다운로드"
          />
          {onExportPng ? (
            <ExportItem
              onClick={wrap(onExportPng)}
              label="PNG (all)"
              hint="모든 슬라이드를 PNG로"
            />
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function ExportItem({
  onClick,
  label,
  hint,
}: {
  onClick: () => void;
  label: string;
  hint: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full flex-col items-start gap-0.5 px-3 py-2 text-left text-xs text-editor-text transition hover:bg-editor-border/40 hover:text-editor-accent"
    >
      <span className="font-medium">{label}</span>
      <span className="text-[10px] text-editor-dim">{hint}</span>
    </button>
  );
}
