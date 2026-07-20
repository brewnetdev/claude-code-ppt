import { chromium } from 'playwright';
import { resolve } from 'node:path';
const browser = await chromium.launch();
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 }, deviceScaleFactor: 1 });
  const errs = [];
  page.on('pageerror', (e) => errs.push('PAGEERR: ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error') errs.push('CONSOLE: ' + m.text()); });
  await page.goto('file://' + resolve(process.argv[2]), { waitUntil: 'load' });
  await page.evaluate(async () => { if (document.fonts?.ready) await document.fonts.ready; });
  await page.waitForTimeout(400);
  const figs = await page.$$('figure');
  const last = figs[figs.length - 1];
  await last.scrollIntoViewIfNeeded(); await page.waitForTimeout(200);
  await last.screenshot({ path: '/tmp/n8-fig.png' });
  console.log('figures:', figs.length, '| errors:', errs.length ? errs.join(' | ') : 'none');
} finally { await browser.close(); }
