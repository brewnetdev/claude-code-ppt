// Build book-author badge GIF from book-author.html.
// Usage: node docs/images/inflearn/build-book-author.mjs   (repo root; needs playwright + python3/PIL)
// v2: 20 frames x 50ms = 1.0s pulse cycle (v1 was 24x80ms = 1.92s).
import { chromium } from 'playwright';
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const DIR = 'docs/images/inflearn';
const N = 20;
const OUT = 'book-author-v.2.gif';
const framesDir = '/tmp/book-author-frames';

fs.rmSync(framesDir, { recursive: true, force: true });
fs.mkdirSync(framesDir, { recursive: true });

const browser = await chromium.launch();
const pg = await browser.newPage({ viewport: { width: 960, height: 66 }, deviceScaleFactor: 2 });
await pg.goto('file://' + path.resolve(`${DIR}/book-author.html`));
await pg.waitForTimeout(300);
for (let i = 0; i < N; i++) {
  await pg.evaluate(([i, N]) => window.setFrame(i, N), [i, N]);
  await pg.waitForTimeout(20);
  await pg.screenshot({ path: `${framesDir}/f${String(i).padStart(2, '0')}.png` });
}
await browser.close();

execSync(`python3 - <<'PY'
from PIL import Image
import glob
rgb = [Image.open(f).convert('RGB') for f in sorted(glob.glob('${framesDir}/f*.png'))]
pal = [f.quantize(colors=96, method=Image.MEDIANCUT, dither=Image.NONE) for f in rgb]
pal[0].save('${DIR}/${OUT}', save_all=True, append_images=pal[1:], duration=50, loop=0, optimize=False)
print('${OUT}', len(pal), 'frames')
PY`, { stdio: 'inherit' });
