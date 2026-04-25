import presentationHtml from '../../docs/html/presentation/brewnet-presentation.html?raw';
import { parsePresentationHTML } from '../importer/parsePresentation';

export type SlideTemplate = {
  id: string;
  label: string;
  description: string;
  html: string;
  title: string;
};

// Manual catalog overlay — names/descriptions tuned for picker UI.
// Order mirrors the brewnet sample's narrative arc (cover → section →
// body → table → two-col → diagram → link list → step → blank).
const META: Array<{ label: string; description: string }> = [
  { label: '커버', description: '히어로 타이틀 + 메타 정보 (강의 시작 표지)' },
  { label: '섹션 헤더', description: '대형 챕터 번호 + 부제 (장 구분자)' },
  { label: '본문 · 불릿', description: 'amber 강조 + 설명형 불릿 5개' },
  { label: '비교표', description: '컬러 헤더 비교표 + amber callout' },
  { label: '2열 · 코드', description: '좌: 텍스트박스 / 우: 터미널 코드 (6:4)' },
  { label: '다이어그램', description: '인라인 SVG 아키텍처 영역 (전체 폭)' },
  { label: '링크 리스트', description: '2열 참고자료 모음 (URL 강조)' },
  { label: '단계 흐름', description: '원형 step circle 4단계 + callout 행' },
  { label: '빈 슬라이드', description: '제목 placeholder만 있는 미니멀 시작점' },
];

let cache: SlideTemplate[] | null = null;

export function getSlideTemplates(): SlideTemplate[] {
  if (cache) return cache;
  const { slides } = parsePresentationHTML(presentationHtml);
  cache = slides.map((s, i) => {
    const meta = META[i] ?? { label: s.title, description: '' };
    return {
      id: `tpl-${i + 1}`,
      label: meta.label,
      description: meta.description,
      html: s.html,
      title: meta.label,
    };
  });
  return cache;
}
