// 에디터 충실 렌더: 덱 HTML의 인라인 <style>을 걷어내고 테마 CSS를 주입해 슬라이드별 PNG 캡처.
// usage: node _l6render.mjs <deck.html> <outdir> [idx,idx,...]
import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const [, , deckPath, outDir, idxArg] = process.argv;
const themes = ['brewnet-dark.css', 'report.css', 'code-blocks.css']
  .map(f => fs.readFileSync(path.join('src/canvas/themes', f), 'utf8')).join('\n');

let html = fs.readFileSync(deckPath, 'utf8');
// 덱 <head> 의 인라인 스타일만 제거한다. 본문 인라인 SVG 안의 <style> 은
// 다이어그램의 fill/stroke 정의라 지우면 도형이 전부 검게 렌더된다.
html = html.replace(/<head>[\s\S]*?<\/head>/, h => h.replace(/<style>[\s\S]*?<\/style>/g, ''));
html = html.replace('</head>', `<style>${themes}
  body{background:#666;margin:0;padding:0}
  .export-slide{margin:0}
  .export-stage{width:1280px;height:720px;overflow:hidden}
</style></head>`);

fs.mkdirSync(outDir, { recursive: true });
const tmp = path.join(outDir, '_render.html');
fs.writeFileSync(tmp, html);

const b = await chromium.launch();
const p = await b.newPage({ viewportSize: { width: 1280, height: 720 } });
await p.goto('file://' + path.resolve(tmp));
await p.waitForTimeout(1500);

const slides = await p.locator('section.export-slide').all();
const want = idxArg ? new Set(idxArg.split(',').map(Number)) : null;
const overflow = [];
for (let i = 0; i < slides.length; i++) {
  if (want && !want.has(i)) continue;
  // 넘침 검사: slide-inner 실제 높이 vs 컨테이너
  // 마지막 콘텐츠 블록의 아래 끝이 푸터 위쪽 경계를 넘는지 실측
  const ov = await slides[i].evaluate(el => {
    const inner = el.querySelector('.slide-inner');
    const foot = el.querySelector('.slide-footer');
    if (!inner || !inner.lastElementChild) return null;
    const kids = [...inner.children];
    const bottom = Math.max(...kids.map(k => k.getBoundingClientRect().bottom));
    const limit = foot ? foot.getBoundingClientRect().top : el.getBoundingClientRect().bottom;
    return { over: Math.round(bottom - limit) };
  });
  if (ov && ov.over > 0) {
    const detail = await slides[i].evaluate(el => {
      const t = el.querySelector('.t-title');
      return [...el.querySelector('.slide-inner').children]
        .map(k => `${k.className || k.tagName}:${Math.round(k.getBoundingClientRect().height)}`)
        .join(' | ') + '   « ' + (t ? t.textContent.slice(0, 30) : '');
    });
    overflow.push(`${i}: +${ov.over}px  [${detail}]`);
  }
  await slides[i].screenshot({ path: path.join(outDir, `s${String(i).padStart(2, '0')}.png`) });
}
await b.close();
fs.writeFileSync(path.join(outDir, 'overflow.txt'), overflow.join('\n'));
console.log(`captured ${want ? want.size : slides.length} slides`);
console.log(overflow.length ? `OVERFLOW ${overflow.length}장:\n` + overflow.join('\n') : 'overflow 없음');
