import { useEffect, useRef, useState } from 'react';

// Atlassian Design System palette — 5 tone rows × 10 hue columns + grayscale.
// Ported from docs/html/colorpicker.html (the user supplied this file as the
// design source for the picker UI).
const ROWS: { label: string; colors: string[] }[] = [
  {
    label: '가장 진한',
    colors: ['#172B4D', '#5D1F1A', '#702E00', '#533F04', '#37471F', '#164B35', '#164555', '#09326C', '#50253F', '#352C63'],
  },
  {
    label: '더 진한',
    colors: ['#44546F', '#AE2E24', '#A54800', '#946F00', '#4C6B1F', '#216E4E', '#206A83', '#0055CC', '#943D73', '#5E4DB2'],
  },
  {
    label: '중간',
    colors: ['#626F86', '#C9372C', '#C25100', '#CF9F02', '#5B7F24', '#1F845A', '#227D9B', '#0C66E4', '#AE4787', '#6E5DC6'],
  },
  {
    label: '연한',
    colors: ['#8590A2', '#F87168', '#FEA362', '#F5CD47', '#6A9A23', '#22A06B', '#2898BD', '#1D7AFC', '#CD519D', '#8270DB'],
  },
  {
    label: '가장 연한',
    colors: ['#FFFFFF', '#FFD5D2', '#FEDEC8', '#F8E6A0', '#D3F1A7', '#BAF3DB', '#C6EDFB', '#CCE0FF', '#FDD0EC', '#DFD8FD'],
  },
];

const HEX_RE = /^#?([0-9a-fA-F]{6})$/;

function normalizeHex(input: string): string | null {
  const m = HEX_RE.exec(input.trim());
  return m ? `#${m[1].toUpperCase()}` : null;
}

type Props = {
  value: string | null;
  onChange: (hex: string | null) => void;
  // Some contexts (text color, overlay bg) want the "no color" option;
  // others (a slot that always must have a color) can hide it.
  allowNone?: boolean;
};

// Inline popover. Caller is responsible for showing/hiding.
export function ColorPickerPopover({ value, onChange, allowNone = true }: Props) {
  const [hexDraft, setHexDraft] = useState(() => (value ?? '').replace('#', ''));

  useEffect(() => {
    setHexDraft((value ?? '').replace('#', ''));
  }, [value]);

  const handleHex = (raw: string) => {
    const cleaned = raw.replace(/[^0-9a-fA-F]/g, '').slice(0, 6);
    setHexDraft(cleaned);
    if (cleaned.length === 6) {
      const hex = normalizeHex(cleaned);
      if (hex) onChange(hex);
    }
  };

  return (
    <div className="rounded-md border border-editor-border bg-[#0F0F13] p-3 shadow-2xl">
      <div className="space-y-1.5">
        {ROWS.map((row) => (
          <div key={row.label} className="flex items-center gap-1">
            <span className="w-12 truncate text-[9px] uppercase tracking-wider text-editor-dim">
              {row.label}
            </span>
            <div className="grid flex-1 grid-cols-10 gap-1">
              {row.colors.map((c) => {
                const active = value && c.toUpperCase() === value.toUpperCase();
                return (
                  <button
                    key={c}
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      onChange(c);
                    }}
                    onMouseDown={(e) => e.preventDefault()}
                    title={c}
                    className={`aspect-square rounded transition hover:scale-110 ${
                      active ? 'ring-2 ring-white/70' : 'ring-0'
                    } ${c === '#FFFFFF' ? 'border border-editor-border' : ''}`}
                    style={{ background: c }}
                  />
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-3 flex items-center gap-2 border-t border-editor-border pt-3">
        <span className="font-mono text-xs text-editor-dim">#</span>
        <input
          type="text"
          maxLength={6}
          value={hexDraft}
          placeholder="172B4D"
          onChange={(e) => handleHex(e.target.value)}
          onMouseDown={(e) => e.stopPropagation()}
          className="flex-1 rounded border border-editor-border bg-[#0F0F13] px-2 py-1 font-mono text-xs text-editor-text outline-none focus:border-editor-accent"
        />
        {allowNone ? (
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              onChange(null);
            }}
            onMouseDown={(e) => e.preventDefault()}
            className="rounded border border-editor-border px-2 py-1 text-[10px] uppercase tracking-wider text-editor-dim hover:border-editor-accent hover:text-editor-accent"
          >
            None
          </button>
        ) : null}
      </div>
    </div>
  );
}

type SwatchButtonProps = {
  value: string | null;
  onChange: (hex: string | null) => void;
  label: string;
  allowNone?: boolean;
};

// Convenience wrapper — a swatch button that toggles the popover beneath it.
export function ColorSwatchButton({ value, onChange, label, allowNone = true }: SwatchButtonProps) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  return (
    <div ref={wrapRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((s) => !s)}
        onMouseDown={(e) => e.preventDefault()}
        className="flex w-full items-center gap-2 rounded border border-editor-border bg-editor-bg px-2 py-1.5 text-xs text-editor-text hover:border-editor-accent"
        title={label}
      >
        <span
          className="h-4 w-4 rounded border border-editor-border"
          style={{
            background: value ?? 'transparent',
            backgroundImage: value
              ? undefined
              : 'linear-gradient(45deg, #555 25%, transparent 25%, transparent 75%, #555 75%), linear-gradient(45deg, #555 25%, transparent 25%, transparent 75%, #555 75%)',
            backgroundSize: '6px 6px',
            backgroundPosition: '0 0, 3px 3px',
          }}
        />
        <span className="flex-1 truncate text-left">{value ?? '없음'}</span>
        <span className="text-[10px] text-editor-dim">{open ? '▴' : '▾'}</span>
      </button>
      {open ? (
        <div className="absolute right-0 top-full z-30 mt-1 w-64">
          <ColorPickerPopover value={value} onChange={onChange} allowNone={allowNone} />
        </div>
      ) : null}
    </div>
  );
}
