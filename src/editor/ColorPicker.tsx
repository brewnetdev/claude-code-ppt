import { useEffect, useRef, useState } from 'react';
import { parseHexColorInput } from './hexColor';

// Standard editor palette: row 1 is grayscale (pure black → pure white), and
// rows 2-5 are saturated primary hues at four intensities. The previous
// Atlassian-style ramp lacked pure #000 / #FFF and tinted everything toward
// navy, which made plain text recoloring feel off.
const ROWS: { label: string; colors: string[] }[] = [
  {
    label: '무채',
    colors: ['#000000', '#18181B', '#27272A', '#3F3F46', '#52525B', '#71717A', '#A1A1AA', '#D4D4D8', '#E4E4E7', '#FFFFFF'],
  },
  {
    label: '진함',
    colors: ['#7F1D1D', '#9A3412', '#92400E', '#854D0E', '#166534', '#115E59', '#1E40AF', '#312E81', '#6B21A8', '#9D174D'],
  },
  {
    label: '기본',
    colors: ['#DC2626', '#EA580C', '#D97706', '#CA8A04', '#16A34A', '#0F766E', '#2563EB', '#4338CA', '#9333EA', '#BE185D'],
  },
  {
    label: '중간',
    colors: ['#EF4444', '#F97316', '#F59E0B', '#EAB308', '#22C55E', '#14B8A6', '#3B82F6', '#6366F1', '#A855F7', '#EC4899'],
  },
  {
    label: '연함',
    colors: ['#FCA5A5', '#FDBA74', '#FCD34D', '#FDE047', '#86EFAC', '#5EEAD4', '#93C5FD', '#A5B4FC', '#D8B4FE', '#F9A8D4'],
  },
];

// Seed the hex draft from a value, but only when it's a real hex color — a
// non-hex value (e.g. an imported `rgb(0,0,0)`) must not dump junk into the box.
function hexDraftFromValue(value: string | null): string {
  const parsed = value ? parseHexColorInput(value) : null;
  return parsed ? parsed.replace('#', '') : '';
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
  const [hexDraft, setHexDraft] = useState(() => hexDraftFromValue(value));

  useEffect(() => {
    setHexDraft(hexDraftFromValue(value));
  }, [value]);

  const handleHex = (raw: string) => {
    // Display: keep only hex chars (max 6) so the box never shows junk.
    setHexDraft(raw.replace(/[^0-9a-fA-F]/g, '').slice(0, 6));
    // Commit: validate the ORIGINAL input. Cleaning-then-accepting would turn a
    // pasted "rgb(255,0,0)" into "#B25500"; parseHexColorInput rejects non-hex
    // and accepts complete 3/6-digit hex only.
    const parsed = parseHexColorInput(raw);
    if (parsed) onChange(parsed);
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
            backgroundColor: value ?? 'transparent',
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
