import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { generateWithRetry } from '../src/generator/retry';
import type { Template } from '../src/generator/pipeline';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

type SampleSpec = { filename: string; template: Template };

const SAMPLES: SampleSpec[] = [
  { filename: 'SEO_GUIDE.md', template: 'presentation' },
  { filename: '디자인패턴.md', template: 'presentation' },
  { filename: 'npm 배포 셋업 가이드.md', template: 'presentation' },
];

const ROOT = resolve(__dirname, '..');
const SAMPLES_DIR = resolve(ROOT, 'docs/sample');
const OUT_ROOT = resolve(ROOT, '.quality-runs');

const THEME_CSS_PATHS = [
  'src/canvas/themes/brewnet-dark.css',
  'src/canvas/themes/code-blocks.css',
];

// Strip the editor-iframe override block at the tail of brewnet-dark.css.
// That block forces body { overflow: hidden; display: block } so the editor
// can render exactly one slide at a time inside its iframe — for a
// standalone PPT we want body to stay flex-column with the original gap so
// slides stack vertically and the page scrolls.
function stripEditorOverrides(css: string): string {
  const marker = css.indexOf('body {\n  margin: 0 !important;');
  if (marker === -1) return css;
  return css.slice(0, marker).trimEnd() + '\n';
}

function loadInlineCss(): string {
  return THEME_CSS_PATHS.map((p) => {
    try {
      const raw = readFileSync(resolve(ROOT, p), 'utf8');
      const cleaned = p.endsWith('brewnet-dark.css') ? stripEditorOverrides(raw) : raw;
      return `/* === ${p} === */\n${cleaned}`;
    } catch {
      return `/* ${p} (missing) */`;
    }
  }).join('\n\n');
}

function tsStamp(): string {
  return new Date()
    .toISOString()
    .replace(/[-:]/g, '')
    .replace(/\..+$/, '')
    .replace('T', '-');
}

function safeName(name: string): string {
  return name
    .replace(/\.md$/i, '')
    .replace(/\s+/g, '-')
    .replace(/[^A-Za-z0-9가-힣\-_.]/g, '');
}

// Build a standalone PPT — same shape as docs/html/presentation/brewnet-presentation.html.
// Body holds .slide elements directly so the original brewnet-dark.css
// `body { display:flex; flex-direction:column; gap:48px; align-items:center; }`
// stacks them as a real presentation deck.
function buildStandalonePpt(opts: {
  title: string;
  css: string;
  slides: Array<{ html: string }>;
}): string {
  const slidesHtml = opts.slides.map((s) => s.html).join('\n\n');
  return `<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${opts.title}</title>
<link href="https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@300;400;500;700;900&amp;family=JetBrains+Mono:wght@400;600&amp;display=swap" rel="stylesheet">
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&amp;family=JetBrains+Mono:wght@400;600;700&amp;display=swap" rel="stylesheet">
<style>
${opts.css}
</style>
</head>
<body>
${slidesHtml}
</body>
</html>`;
}

async function main() {
  const stamp = tsStamp();
  const outDir = resolve(OUT_ROOT, stamp);
  mkdirSync(outDir, { recursive: true });
  const css = loadInlineCss();

  type Row = {
    filename: string;
    template: Template;
    slides: number;
    attempts: number;
    timing: Record<string, number>;
    gates: Array<{ id: string; passed: boolean; detail: string }>;
    gatesAllPassed: boolean;
    score: {
      passed: boolean;
      ratio: number;
      earned: number;
      presentMax: number;
      items: Array<{ id: string; score: number | null; presentInMd: boolean; detail: string }>;
    };
    previewHtmlPath: string;
  };

  const rows: Row[] = [];
  let allPassed = true;

  for (const sample of SAMPLES) {
    const md = readFileSync(resolve(SAMPLES_DIR, sample.filename), 'utf8');
    const out = await generateWithRetry({ source: md, template: sample.template });
    const gateRows = out.gates.results.map((r) => ({ id: r.id, passed: r.passed, detail: r.detail }));
    const gatesAllPassed = gateRows.every((g) => g.passed);
    const ok = out.score.passed && gatesAllPassed;
    if (!ok) allPassed = false;

    const fileBase = safeName(sample.filename);
    const previewName = `${fileBase}.html`;

    const html = buildStandalonePpt({
      title: sample.filename.replace(/\.md$/i, ''),
      css,
      slides: out.slides,
    });
    writeFileSync(resolve(outDir, previewName), html);

    rows.push({
      filename: sample.filename,
      template: sample.template,
      slides: out.slides.length,
      attempts: out.attempts,
      timing: out.timing,
      gates: gateRows,
      gatesAllPassed,
      score: {
        passed: out.score.passed,
        ratio: out.score.ratio,
        earned: out.score.earned,
        presentMax: out.score.presentMax,
        items: out.score.items.map((it) => ({
          id: it.id,
          score: it.score,
          presentInMd: it.presentInMd,
          detail: it.detail,
        })),
      },
      previewHtmlPath: previewName,
    });
  }

  const summary = {
    generatedAt: new Date().toISOString(),
    allPassed,
    rows,
  };

  writeFileSync(resolve(outDir, 'summary.json'), JSON.stringify(summary, null, 2));
  writeFileSync(resolve(outDir, 'summary.md'), renderSummaryMd(rows, allPassed));

  if (allPassed) {
    writeFileSync(resolve(OUT_ROOT, 'PASSED.flag'), `${stamp}\n`);
  }

  console.log(`\n[quality-loop] output → ${outDir}`);
  for (const r of rows) {
    const verdict = r.score.passed && r.gatesAllPassed ? 'PASS' : 'FAIL';
    const failedGates = r.gates.filter((g) => !g.passed).map((g) => g.id);
    const gateNote = failedGates.length === 0 ? 'gates ✓' : `gates ✗ [${failedGates.join(',')}]`;
    console.log(`  ${verdict} ${r.score.earned}/${r.score.presentMax} (${(r.score.ratio * 100).toFixed(1)}%) ${gateNote}  ${r.filename}  → ${r.previewHtmlPath}`);
  }
  console.log(`  summary.json + summary.md written`);
  if (allPassed) console.log(`  PASSED.flag written → /.quality-runs/PASSED.flag`);

  process.exit(allPassed ? 0 : 1);
}

function renderSummaryMd(rows: Array<{
  filename: string;
  template: Template;
  slides: number;
  attempts: number;
  timing: Record<string, number>;
  gates: Array<{ id: string; passed: boolean; detail: string }>;
  gatesAllPassed: boolean;
  score: {
    passed: boolean;
    ratio: number;
    earned: number;
    presentMax: number;
    items: Array<{ id: string; score: number | null; presentInMd: boolean; detail: string }>;
  };
}>, allPassed: boolean): string {
  const rubricNotes = `\n## 채점 규약 (V2 — Editor-Integration)\n\n각 카테고리는 **정적 HTML 점수**와 **에디터 통합 게이트**를 모두 통과해야 만점이 인정된다. 게이트가 한 개라도 실패하면 해당 카테고리 점수는 강제로 **0**이 된다 (\`gate-blocked\` 표시).\n\n### Binary Gates\n\n- **A — Round-trip parse**: 생성된 HTML을 \`parsePresentationHTML\`로 다시 파싱했을 때 슬라이드 수가 일치하고 모든 \`<div class="slide">\`에 \`data-template\` 속성이 있고 슬라이드 id가 unique\n- **B — Sidebar list**: 모든 슬라이드의 \`.slide-inner\`가 비어있지 않고 모든 슬라이드의 \`title\`이 비어있지 않음 (좌측 리스트가 정상 표시되는지)\n- **C-code/term/text/list/table/heading — Block addressability**: 각 콘텐츠 블록(코드, 터미널, 본문, 리스트, 표, 헤딩)이 \`data-block-id\`를 가지고 있어야 우측 PropertiesPanel이 querySelector로 찾을 수 있음\n- **D — Properties panel addressability**: 모든 \`data-block-id\`가 deck 전체에서 유일하고 단일 element를 반환해야 함\n- **E — Cover decoration**: 첫 슬라이드(커버)에 템플릿 고유 장식 element(.t-hero/.t-chapter/.outline-num/.s-section-divider/.cover-title 등)가 존재\n\n### Pass Run Rate\n\n- 게이트 모두 통과 + 정적 점수 \`earned/presentMax >= 0.9\` 일 때만 해당 샘플은 \`PASS\`\n- 3개 샘플 모두 \`PASS\` 일 때만 \`PASSED.flag\` 가 생성되고 /loop 사이클이 종료\n`;

  const head = `# Quality Loop Summary\n\nGenerated: ${new Date().toISOString()}\n\nOverall: **${allPassed ? 'PASSED ✓' : 'FAILED ✗'}**\n${rubricNotes}\n\n| 파일 | 템플릿 | 슬라이드 | 점수 | 게이트 | 결과 | 시도 | 총 ms |\n|---|---|---|---|---|---|---|---|\n`;
  const tableRows = rows
    .map((r) => {
      const failed = r.gates.filter((g) => !g.passed).map((g) => g.id);
      const gateCell = failed.length === 0 ? '✓' : `✗ ${failed.join(',')}`;
      const verdict = r.score.passed && r.gatesAllPassed ? 'PASS' : 'FAIL';
      return `| \`${r.filename}\` | ${r.template} | ${r.slides} | ${r.score.earned}/${r.score.presentMax} (${(r.score.ratio * 100).toFixed(1)}%) | ${gateCell} | ${verdict} | ${r.attempts} | ${r.timing.total_ms} |`;
    })
    .join('\n');

  const detail = rows
    .map((r) => {
      const gateLines = r.gates
        .map((g) => `  - **${g.id}** ${g.passed ? '✓' : '✗'} — ${g.detail}`)
        .join('\n');
      const lines = r.score.items
        .map((it) => {
          const sc = it.score === null ? 'N/A' : `${it.score}/10`;
          return `  - **${it.id}** \`${sc}\` present=${it.presentInMd} — ${it.detail}`;
        })
        .join('\n');
      const verdict = r.score.passed && r.gatesAllPassed ? 'PASS' : 'FAIL';
      return `\n## ${r.filename}\n\n- 템플릿: ${r.template}\n- 슬라이드: ${r.slides}\n- timing: ${JSON.stringify(r.timing)}\n- gates: **${r.gatesAllPassed ? 'ALL PASS' : 'FAIL'}**\n- score: **${r.score.earned}/${r.score.presentMax} (${(r.score.ratio * 100).toFixed(1)}%) — ${verdict}**\n\n### Gates\n${gateLines}\n\n### Rubric\n${lines}\n`;
    })
    .join('\n');

  return head + tableRows + '\n' + detail;
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
