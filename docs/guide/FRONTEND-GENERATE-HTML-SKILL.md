# Frontend Design Constraints — Anti-AI-Slop

당신은 절제된 프로덕션 UI를 만든다. "예쁘게 보이려는" 장식이 아니라
정보 위계·여백·정렬·타이포로 품질을 만든다. 아래 규칙은 강제(MUST)다.

## 금지 (MUST NOT)
- 그라데이션 배경/채움 금지: linear-gradient, radial-gradient, conic-gradient.
  특히 보라/핑크 계열, 흰 배경 위 컬러 그라데이션 절대 금지.
- 글로우/컬러 그림자 금지: 색이 들어간 box-shadow, inset 광택 링,
  blur 20px 이상의 큰 그림자. backdrop-filter: blur (글래스모피즘) 금지.
- 모션 장식 금지: hover 시 transform: translate/scale, 로드 시 fade/stagger,
  pulse·shimmer·float·glow 키프레임. transition은 색·투명도 등
  기능적 상태 변화에만, 150ms 이하로 한정.
- 그라데이션 텍스트(background-clip:text) 금지.
- 배경 워터마크(거대 반투명 글자/아이콘), 닷·그리드 배경, 페이드 마스크 금지.
- 카드 상단 컬러 액센트 바(border-top: Npx solid color) 금지.
- 이모지를 불릿·장식으로 사용 금지. 뱃지/pill 남발 금지.
- 마케팅 보일러플레이트 단어 금지: Seamlessly, Elevate, Unlock, Empower,
  Supercharge, ✨ 등.

## 강제 (MUST)
- 색: 무채색(흰/회/검) 베이스 + 액센트 1색. 색은 의미(상태·위계)에만 쓴다.
- 그림자: 쓰더라도 중성 회색 1단계만 (예: 0 1px 2px rgba(0,0,0,.06)). 없어도 좋다.
- 구분: 효과 대신 1px solid border와 여백으로 구획한다.
- border-radius는 0~8px로 제한한다.
- 폰트: Inter·Roboto·Arial·system-ui·Space Grotesk로 기본 수렴하지 말 것.
  목적에 맞는 폰트를 의도적으로 선택하고 그 이유를 한 줄로 밝힌다.
- 위계는 크기·굵기·여백·정렬로 만든다. 색·효과로 만들지 않는다.
- 모든 시각 요소는 "이게 어떤 정보를 전달하는가"를 답할 수 있어야 한다.
  답할 수 없으면 삭제한다.

## 자가 점검 (출력 전 통과 필수)
출력 직전 다음을 점검하고, 하나라도 YES면 제거 후 재작성한다.
- [ ] gradient(any)가 있는가?
- [ ] 색이 들어간 그림자 또는 blur≥20px 그림자가 있는가?
- [ ] hover/load에 transform·fade·키프레임 애니메이션이 있는가?
- [ ] 콘텐츠와 무관한 배경 장식(워터마크/그리드/광선)이 있는가?
- [ ] 정보를 전달하지 않는 순수 장식 요소가 있는가?
- [ ] 폰트가 Inter/Roboto/Arial/system 기본값으로 수렴했는가?