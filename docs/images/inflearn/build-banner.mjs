// Build the inflearn course banners (960x540 + 1200x781) from their HTML sources.
// Usage: node docs/images/inflearn/build-banner.mjs   (run from repo root; needs playwright + python3/PIL)
// Steps: crop ../common/book.png -> ./book-crop.png, render N deterministic frames per size, assemble looping GIFs.
import { chromium } from 'playwright';
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const DIR = 'docs/images/inflearn';
const N = 28;
const TARGETS = [
  { html: 'course-banner.html',      w: 960,  h: 540, out: 'course-banner-960.gif'  },
  { html: 'course-banner-1200.html', w: 1200, h: 781, out: 'course-banner-1200.gif' },
];

// 1. crop the transparent book to its content bbox (beside the HTML so the src is repo-relative)
execSync(`python3 - <<'PY'
from PIL import Image
b=Image.open('docs/images/common/book.png').convert('RGBA')
b.crop(b.getbbox()).save('${DIR}/book-crop.png')
PY`, { stdio: 'inherit' });

const browser = await chromium.launch();
for (const t of TARGETS) {
  const framesDir = `/tmp/banner-frames-${t.w}`;
  fs.mkdirSync(framesDir, { recursive: true });
  const pg = await browser.newPage({ viewport: { width: t.w, height: t.h }, deviceScaleFactor: 1 });
  await pg.goto('file://' + path.resolve(`${DIR}/${t.html}`));
  await pg.waitForTimeout(300);
  for (let i = 0; i < N; i++) {
    await pg.evaluate(([i, N]) => window.setFrame(i, N), [i, N]);
    await pg.waitForTimeout(25);
    await pg.screenshot({ path: `${framesDir}/f${String(i).padStart(2, '0')}.png` });
  }
  await pg.close();
  // assemble looping GIF (96-color adaptive palette; faster reveal, settle + hold before loop restart)
  execSync(`python3 - <<'PY'
from PIL import Image
import glob
rgb=[Image.open(f).convert('RGB') for f in sorted(glob.glob('${framesDir}/f*.png'))]
fr=[im.convert('P',palette=Image.ADAPTIVE,colors=96) for im in rgb]
durs=[110]*len(fr); durs[14]=520; durs[-1]=900
fr[0].save('${DIR}/${t.out}',save_all=True,append_images=fr[1:],duration=durs,loop=0,optimize=True,disposal=2)
print('wrote ${DIR}/${t.out}', fr[0].size, len(fr),'frames')
PY`, { stdio: 'inherit' });
}
await browser.close();

// drop the intermediate crop (book.png is the source of truth)
fs.rmSync(`${DIR}/book-crop.png`, { force: true });
console.log('done');
