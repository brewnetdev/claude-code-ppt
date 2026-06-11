// Shared renderer: HTML diagram -> transparent PNG via Chromium (loads Google
// Fonts so Korean renders). Usage: node _viz_render.mjs <html> <png> <W> <H>
import { chromium } from 'playwright';
import { resolve } from 'node:path';

const [, , htmlArg, outArg, wArg, hArg] = process.argv;
const w = Number(wArg) || 1280;
const h = Number(hArg) || 720;

const browser = await chromium.launch();
try {
  const page = await browser.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 2 });
  await page.goto('file://' + resolve(htmlArg), { waitUntil: 'networkidle' });
  await page.evaluate(async () => {
    if (document.fonts?.ready) await document.fonts.ready;
  });
  await page.waitForTimeout(200);
  const el = await page.$('.frame');
  if (el) await el.screenshot({ path: resolve(outArg), omitBackground: true });
  else await page.screenshot({ path: resolve(outArg), omitBackground: true, clip: { x: 0, y: 0, width: w, height: h } });
  console.log('OK', outArg);
} finally {
  await browser.close();
}
