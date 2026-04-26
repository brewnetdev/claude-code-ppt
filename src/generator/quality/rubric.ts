// 11 categories × 10 points = 110. Items absent from the source MD are
// reported as `null` and excluded from the gate denominator (present-only
// scoring agreed with user). Gate passes when earned / present_max ≥ 0.9.

export type RubricId =
  | 'h1'
  | 'h2'
  | 'h3'
  | 'text'
  | 'link'
  | 'hr'
  | 'font'
  | 'code'
  | 'term'
  | 'table'
  | 'shape';

export const RUBRIC_IDS: readonly RubricId[] = [
  'h1',
  'h2',
  'h3',
  'text',
  'link',
  'hr',
  'font',
  'code',
  'term',
  'table',
  'shape',
];

export const POINTS_PER_ITEM = 10;
export const PASS_RATIO = 0.9;

export const RUBRIC_LABELS: Record<RubricId, string> = {
  h1: '대타이틀',
  h2: '중타이틀',
  h3: '소타이틀',
  text: '내용',
  link: '링크',
  hr: '라인',
  font: '폰트',
  code: '코드',
  term: '터미널',
  table: '표',
  shape: '도형',
};

export type RubricItemScore = {
  id: RubricId;
  label: string;
  presentInMd: boolean;
  // null when presentInMd === false. Otherwise 0..10.
  score: number | null;
  // Diagnostic — what the detector saw vs what the scorer found.
  detail: string;
};

export type ScoreReport = {
  items: RubricItemScore[];
  presentMax: number;
  earned: number;
  ratio: number;
  passed: boolean;
};

export function summarize(items: RubricItemScore[]): ScoreReport {
  const present = items.filter((i) => i.presentInMd);
  const presentMax = present.length * POINTS_PER_ITEM;
  const earned = present.reduce((acc, i) => acc + (i.score ?? 0), 0);
  const ratio = presentMax === 0 ? 1 : earned / presentMax;
  return {
    items,
    presentMax,
    earned,
    ratio,
    passed: ratio >= PASS_RATIO,
  };
}
