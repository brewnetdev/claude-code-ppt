import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { generateWithRetry } from '../../src/generator/retry';
import type { Template } from '../../src/generator/pipeline';

type SampleCase = {
  filename: string;
  template: Template;
  // Min slides we'd expect after blockify. Flexible — exact count depends
  // on adapter heuristics; tighten once stable.
  minSlides: number;
};

const SAMPLES: SampleCase[] = [
  { filename: 'SEO_GUIDE.md', template: 'presentation', minSlides: 5 },
  { filename: '디자인패턴.md', template: 'presentation', minSlides: 10 },
  { filename: 'npm 배포 셋업 가이드.md', template: 'presentation', minSlides: 4 },
];

const SAMPLES_DIR = resolve(__dirname, '../../docs/sample');

describe('MD → presentation HTML quality gate', () => {
  for (const sample of SAMPLES) {
    it(`generates ${sample.filename} above 90% present-only score`, async () => {
      const md = readFileSync(resolve(SAMPLES_DIR, sample.filename), 'utf8');
      const out = await generateWithRetry({ source: md, template: sample.template });

      const lines = [
        `--- ${sample.filename} (${sample.template}) ---`,
        `slides: ${out.slides.length}`,
        `attempts: ${out.attempts}`,
        `timing: ${JSON.stringify(out.timing)}`,
        `score: ${out.score.earned}/${out.score.presentMax} (${(out.score.ratio * 100).toFixed(1)}%) ${out.score.passed ? 'PASS' : 'FAIL'}`,
        `items:`,
        ...out.score.items.map(
          (i) => `  ${i.id.padEnd(5)} ${i.score === null ? 'N/A' : `${i.score}/10`}  — ${i.detail}`,
        ),
      ];
      console.log(lines.join('\n'));

      expect(out.slides.length).toBeGreaterThanOrEqual(sample.minSlides);
      expect(out.score.passed, `score ${(out.score.ratio * 100).toFixed(1)}% < 90%`).toBe(true);
    });
  }
});
