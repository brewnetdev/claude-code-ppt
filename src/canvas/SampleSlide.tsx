import './themes/brewnet-dark.css';

const SAMPLE_HTML = `
<div class="slide">
  <div class="slide-topbar"></div>
  <div class="slide-logo">
    <a class="slide-logo-url" href="https://brewnet.dev">brewnet.dev</a>
    <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="4 6 38 38" fill="none" stroke="#f5a623" stroke-linecap="round" stroke-linejoin="round">
      <path d="M8 26H32V34C32 36.8 29.8 39 27 39H13C10.2 39 8 36.8 8 34V26Z" stroke-width="3.5"></path>
      <path d="M32 28.5C35.5 28.5 37 30.5 37 32.5C37 34.5 35.5 36.5 32 36.5" stroke-width="3.5"></path>
      <circle cx="20" cy="30" r="2.2" fill="#f5a623" stroke="none"></circle>
      <path d="M16.5 20a5 5 0 0 1 7 0" stroke-width="3.5"></path>
      <path d="M13.5 15.5a10 10 0 0 1 13 0" stroke-width="3.5"></path>
      <path d="M10.5 11a15 15 0 0 1 19 0" stroke-width="3.5"></path>
    </svg>
    <span class="slide-logo-text">BREWNET</span>
  </div>
  <div class="slide-inner">
    <div class="t-chapter" data-slot="label">CH.5 · 방법론 비교</div>
    <div class="t-title" data-slot="title">Kent Beck의 증강코딩 5원칙</div>
    <div class="t-caption" data-slot="subtitle" style="margin-bottom:20px;">
      TDD 창시자 · XP 창시자 · 애자일 선언문 공동 저자 — <a class="link" href="https://kentbeck.com">kentbeck.com</a>
    </div>
    <ul class="bullet-list" data-slot="bullets" style="margin-top:0;">
      <li><div><span class="hl-amber">Constrain Context</span> — 컨텍스트 제한<span class="sub">AI에게 다음 단계에 필요한 것만 알려줄 것. 전체 코드베이스를 한 번에 던지지 말 것.</span></div></li>
      <li><div><span class="hl-amber">Preserve Optionality</span> — 씨앗 옥수수를 먹지 마라<span class="sub">나중에 바꿀 수 없는 설계 결정은 인간이 직접. AI가 미래 선택지를 닫게 두지 말 것.</span></div></li>
      <li><div><span class="hl-amber">Balance Expansion &amp; Contraction</span> — 확장-수축 균형<span class="sub">AI는 팽창만 하려는 경향. 리팩토링 사이클로 인간이 축소 역할을 담당.</span></div></li>
      <li><div><span class="hl-amber">Maintain Human Judgment</span> — 인간 판단 유지<span class="sub">AI 출력을 주니어 코드처럼 리뷰. "AI 에이전트는 예측 불가능한 지니다" — Kent Beck</span></div></li>
      <li><div><span class="hl-amber">Warning Signs</span> — 경고 신호 인식<span class="sub">불필요한 루프 / 스펙 외 기능 추가 / 테스트 삭제 통과 시도 → 즉시 중단·개입</span></div></li>
    </ul>
  </div>
  <div class="slide-footer">
    <span class="slide-footer-left" data-slot="caption">CH.5 · Kent Beck — Augmented Coding 5 Principles</span>
    <span class="slide-footer-right" data-slot="page-num">03</span>
  </div>
</div>
`;

export function SampleSlide() {
  return <div dangerouslySetInnerHTML={{ __html: SAMPLE_HTML }} />;
}
