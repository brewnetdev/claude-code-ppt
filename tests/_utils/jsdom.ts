import { JSDOM } from 'jsdom';

// Shared JSDOM wiring for vitest (Node) unit tests. parsePresentationHTML and
// applyBackgroundToHtml use the global DOMParser, which Node lacks. Call
// installDomParser() in a beforeAll(). Previously this 3-line setup was
// duplicated across tests/library/builtinDecks.test.ts and
// tests/scene/applySlideBackground.test.ts — keep it in one place so future
// importer/exporter unit tests can opt in without re-deriving the trick.
export function installDomParser(): void {
  const dom = new JSDOM('<!doctype html><html><body></body></html>');
  (globalThis as { DOMParser?: typeof DOMParser }).DOMParser = dom.window.DOMParser;
}
