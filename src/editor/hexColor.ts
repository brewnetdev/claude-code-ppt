// Pure hex-color input parsing for the ColorPicker. Extracted so the validation
// can be unit-tested without rendering React.
//
// The previous inline handler did `raw.replace(/[^0-9a-fA-F]/g, '')` and then
// accepted any 6-char remnant — so a pasted `rgb(255,0,0)` became `b25500` and
// committed `#B25500` (a brown). It also rejected valid 3-digit shorthand.
// This validates the ORIGINAL input: it accepts only a complete 3- or 6-digit
// hex (optional leading `#`), expands shorthand, and returns a normalized
// uppercase `#RRGGBB`, or null for anything else.
export function parseHexColorInput(input: string): string | null {
  const s = input.trim().replace(/^#/, '');
  if (/^[0-9a-fA-F]{6}$/.test(s)) return `#${s.toUpperCase()}`;
  if (/^[0-9a-fA-F]{3}$/.test(s)) {
    return `#${s
      .split('')
      .map((c) => c + c)
      .join('')
      .toUpperCase()}`;
  }
  return null;
}
