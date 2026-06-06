import { describe, expect, it } from 'vitest';
import { parseHexColorInput } from '../../src/editor/hexColor';

// BUG-1: the ColorPicker hex input stripped non-hex characters and then accepted
// any 6-char remnant, so pasting "rgb(255,0,0)" silently committed "#B25500".
// It also rejected valid 3-digit shorthand. parseHexColorInput validates the
// ORIGINAL input instead of cleaning it.
describe('parseHexColorInput', () => {
  it('accepts 6-digit hex (with/without #) and normalizes to uppercase #RRGGBB', () => {
    expect(parseHexColorInput('34d399')).toBe('#34D399');
    expect(parseHexColorInput('#34d399')).toBe('#34D399');
    expect(parseHexColorInput('  #abcdef ')).toBe('#ABCDEF');
  });

  it('expands 3-digit shorthand to #RRGGBB', () => {
    expect(parseHexColorInput('f00')).toBe('#FF0000');
    expect(parseHexColorInput('#0a3')).toBe('#00AA33');
  });

  it('rejects rgb()/named/partial/garbage rather than committing a wrong color', () => {
    expect(parseHexColorInput('rgb(255,0,0)')).toBeNull();
    expect(parseHexColorInput('red')).toBeNull();
    expect(parseHexColorInput('12')).toBeNull();
    expect(parseHexColorInput('1234')).toBeNull();
    expect(parseHexColorInput('12345')).toBeNull();
    expect(parseHexColorInput('zzzzzz')).toBeNull();
    expect(parseHexColorInput('')).toBeNull();
    expect(parseHexColorInput('#')).toBeNull();
  });

  it('does not let a stripped rgb() string masquerade as a valid 6-hex', () => {
    // Old behavior: "rgb(255,0,0)".replace(/[^0-9a-fA-F]/g,'') === "b25500".
    expect(parseHexColorInput('rgb(255,0,0)')).not.toBe('#B25500');
  });
});
