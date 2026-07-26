// Identity of a deck's HTML, used to tell "the source file changed since this
// cache was written" from "they're the same revision". Shared by the registry
// (which reads decks off disk) and the export bundler (which stamps the value
// into the file it writes) so both sides agree on what a revision is.
//
// ponytail: samples the string instead of hashing every character. Decks run to
// several MB once images are inlined, and hashing all of them at boot costs
// hundreds of ms. Length is folded in, so any edit that changes the document
// size is caught even when it lands between samples.
export function contentFingerprint(html: string): string {
  let h = 0x811c9dc5;
  const step = Math.max(1, Math.floor(html.length / 65536));
  for (let i = 0; i < html.length; i += step) {
    h ^= html.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  h ^= html.length;
  return (h >>> 0).toString(16);
}

export const SOURCE_HASH_META = 'deck-source-hash';

export function extractSourceHash(html: string): string | null {
  const m = html.match(
    new RegExp(`<meta\\s+name=["']${SOURCE_HASH_META}["']\\s+content=["']([^"']*)["']`, 'i'),
  );
  const v = m?.[1]?.trim();
  return v ? v : null;
}
