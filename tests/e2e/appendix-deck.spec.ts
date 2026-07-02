import { test, expect, type Page } from '@playwright/test';

// E2E coverage for the appendix deck (docs/html/report/appendix-claude-code-advanced.html):
//   1) Content slides (pages 7, 8, …) render the unified beige #F0EDE8 in the
//      EDITOR — not the app report theme's near-white #FAFAF8. This exercises
//      the real SlideRenderer path, where the deck's inlined <style> is ignored
//      and only the slide markup (inline background) wins.
//   2) The stale-cache banner surfaces when the cached payload's sourceHash
//      differs from the registry's current sourceHash.

const DECK_ID = 'appendix-claude-code-advanced';
const DECK_CARD = /부록[\s\S]*심화 6강[\s\S]*편집 열기/;
const BEIGE = 'rgb(240, 237, 232)'; // #F0EDE8 (image background)
const DARK = 'rgb(15, 23, 42)'; // #0F172A (presentation base)
const NEAR_WHITE = ['rgb(255, 255, 255)', 'rgb(250, 250, 248)']; // the bug

async function clearStorage(page: Page) {
  await page.evaluate(async () => {
    localStorage.clear();
    await new Promise<void>((resolve) => {
      const req = indexedDB.deleteDatabase('claude-code-ppt');
      req.onsuccess = () => resolve();
      req.onerror = () => resolve();
      req.onblocked = () => resolve();
    });
  });
}

async function openAppendixDeck(page: Page) {
  const card = page.getByRole('button', { name: DECK_CARD });
  await card.waitFor({ state: 'visible', timeout: 15_000 });
  await card.click();
  await page.waitForSelector('[data-canvas-role="main"] .slide');
  await page.waitForTimeout(200);
}

// Sidebar slide rows, in deck order. Mirrors the selector used in editor.spec.ts.
function slideRows(page: Page) {
  return page.locator('.slide-row-grip').locator('xpath=..').locator('button');
}

async function gotoSlide(page: Page, index: number) {
  await slideRows(page).nth(index).click();
  await page.waitForTimeout(150);
}

async function slideBg(page: Page): Promise<string> {
  return page
    .locator('[data-canvas-role="main"] .slide')
    .first()
    .evaluate((el) => getComputedStyle(el).backgroundColor);
}

async function slideTitle(page: Page): Promise<string> {
  const t = page.locator('[data-canvas-role="main"] [data-slot="title"], [data-canvas-role="main"] .t-title').first();
  return ((await t.count()) > 0 ? (await t.textContent()) ?? '' : '').trim();
}

test.describe('appendix deck — background + banner', () => {
  test('content slides 7 and 8 render beige (#F0EDE8), not white, in the editor', async ({ page }) => {
    await page.goto('/');
    await clearStorage(page);
    await page.reload();
    await openAppendixDeck(page);

    // Desensitized (M0): assert a sane floor, not an exact count, so editing
    // the deck content doesn't break the background regression test.
    const total = await slideRows(page).count();
    expect(total).toBeGreaterThanOrEqual(40);

    // Page 7 (deck index 6) — "왜 이 명령들인가"
    await gotoSlide(page, 6);
    expect(await slideTitle(page)).toContain('왜 이 명령들인가');
    const bg7 = await slideBg(page);
    expect(bg7, 'page 7 background').toBe(BEIGE);
    expect(NEAR_WHITE, 'page 7 must not be white').not.toContain(bg7);

    // Page 8 (deck index 7) — "핵심 명령 한 줄 실습"
    await gotoSlide(page, 7);
    expect(await slideTitle(page)).toContain('핵심 명령');
    const bg8 = await slideBg(page);
    expect(bg8, 'page 8 background').toBe(BEIGE);
    expect(NEAR_WHITE, 'page 8 must not be white').not.toContain(bg8);

    // Sanity: cover (index 0) stays dark, an image slide (index 3) is beige —
    // confirms the mixed theming is intact, not a blanket recolor.
    await gotoSlide(page, 0);
    expect(await slideBg(page), 'cover stays dark').toBe(DARK);

    await gotoSlide(page, 3);
    expect(await slideBg(page), 'image slide is beige').toBe(BEIGE);

    // Sweep every content (non-dark, non-cover) slide: none may be white.
    const darkIdx = new Set([0, 1, 2, 8, 14, 20, 26, 34]); // cover, toc, 6 dividers
    for (let i = 0; i < total; i++) {
      if (darkIdx.has(i)) continue;
      await gotoSlide(page, i);
      const bg = await slideBg(page);
      expect(NEAR_WHITE, `slide index ${i} must not be white`).not.toContain(bg);
      expect(bg, `slide index ${i} should be beige`).toBe(BEIGE);
    }
  });

  test('stale-cache banner appears when cached sourceHash differs from registry', async ({ page }) => {
    await page.goto('/');
    await clearStorage(page);
    await page.reload();
    await openAppendixDeck(page);

    // Trigger an autosave so a cache record exists (with the CURRENT registry
    // hash): edit a content slide's title. Auto-save commits (300ms) then
    // persists to IndexedDB (debounced), so wait generously.
    await gotoSlide(page, 6);
    const title = page.locator('[data-canvas-role="main"] [data-slot="title"]').first();
    await title.click();
    await page.keyboard.type('X');
    await page.waitForTimeout(2000);

    // Corrupt the cached record's sourceHash so the next open sees a mismatch.
    const result = await page.evaluate(async (deckId) => {
      return await new Promise<{ found: boolean; keys: string[] }>((resolve) => {
        const open = indexedDB.open('claude-code-ppt');
        open.onsuccess = () => {
          const db = open.result;
          const tx = db.transaction('decks', 'readwrite');
          const store = tx.objectStore('decks');
          const keysReq = store.getAllKeys();
          keysReq.onsuccess = () => {
            const keys = (keysReq.result as IDBValidKey[]).map(String);
            const get = store.get(deckId);
            get.onsuccess = () => {
              const rec = get.result;
              if (!rec) return resolve({ found: false, keys });
              rec.sourceHash = 'STALE_TEST_HASH';
              store.put(rec, deckId);
              tx.oncomplete = () => resolve({ found: true, keys });
            };
            get.onerror = () => resolve({ found: false, keys });
          };
        };
        open.onerror = () => resolve({ found: false, keys: [] });
      });
    }, DECK_ID);
    expect(result.found, `cache record patched (idb keys: ${result.keys.join(', ')})`).toBe(true);

    // Reload and re-open the deck → openDeck compares hashes → stale → banner.
    await page.reload();
    if ((await page.locator('[data-canvas-role="main"] .slide').count()) === 0) {
      await openAppendixDeck(page);
    }

    const banner = page.getByText('원본 HTML 이 갱신되었습니다');
    await expect(banner).toBeVisible({ timeout: 10_000 });
    await expect(page.getByRole('button', { name: /원본으로 갱신/ })).toBeVisible();
  });
});
