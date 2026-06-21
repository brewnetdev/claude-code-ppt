# 클로드 코드로 커밋 메시지 작성하기

## 핵심 (결론)

- 클로드 코드는 **별도 기능이 아니라**, "커밋해줘"라고 시키면 그 시점에 `git diff`(스테이징된 변경)와 최근 `git log`를 읽어 **메시지를 직접 작성하고 커밋**한다. 기본적으로 **저장소의 기존 커밋 스타일을 따라간다.**
- 기본값으로 커밋 끝에 **공동작성자 트레일러**가 붙는다 → `includeCoAuthoredBy: false`로 끈다.
- 우리 **프리픽스 문서 규칙**대로 쓰게 하려면 → ① `CLAUDE.md`에 규칙 명시 + 문서 `@import`, ② 커스텀 `/commit` 슬래시 커맨드, 둘 중 하나(또는 둘 다).
- 작성은 클로드가, **형식 강제는 commitlint(husky)** 가 맡는다 — 생성과 검증은 보완 관계.

---

## 1. 클로드 코드의 커밋 메시지 생성 동작

내부 동작 순서(커밋을 요청했을 때):

1. `git status` · `git diff --staged` 로 **무엇이 바뀌었는지** 파악
2. `git log` 로 **저장소의 기존 메시지 스타일**을 참고
3. 변경 성격에 맞는 메시지를 작성하고 `git commit` 실행

기본 출력 형태(끄지 않으면 자동 부착):

```text
fix: resolve logout on session timeout

Generated with Claude Code
Co-Authored-By: Claude <noreply@anthropic.com>
```

> 즉, 프리픽스 규칙을 **알려주지 않으면** 저장소 이력에서 추론한 임의 스타일로 작성한다. 우리 규칙을 따르게 하려면 2장처럼 지시해야 한다.

---

## 2. 문서를 참고해서 작성하게 하는 방법

전제: 프리픽스 규칙 문서를 저장소 안 고정 경로에 둔다. 예) `docs/commit-prefix-guide.md`

### 방법 A — `CLAUDE.md`에 규칙 명시 (상시 적용, 권장)

`CLAUDE.md`는 세션 시작 시 자동 주입되므로, 매번 시키지 않아도 적용된다.

```markdown
<!-- CLAUDE.md -->
## 커밋 규칙
커밋 메시지는 반드시 @docs/commit-prefix-guide.md 의 프리픽스 표와 형식을 따른다.
- 형식: `<type>(<scope>): <subject>` (subject는 영문 명령형, 72자 이내, 마침표 없음)
- 허용 type: feature, fix, bug, refactor, database, api, ui, test, documentation
- Co-Authored-By 라인은 추가하지 않는다.
```

> `@docs/commit-prefix-guide.md` 는 해당 파일을 컨텍스트로 불러오는 import 문법이다. 규칙이 길면 본문에 다 넣지 말고 이렇게 참조만 건다.

### 방법 B — 커스텀 `/commit` 슬래시 커맨드 (필요할 때 호출)

`.claude/commands/commit.md` 파일을 만들면 `/commit` 으로 실행된다.

```markdown
<!-- .claude/commands/commit.md -->
@docs/commit-prefix-guide.md 의 규칙에 따라 커밋한다.

1. `git status` 와 `git diff --staged` 로 변경 내용을 파악한다.
2. 변경 성격에 맞는 type 을 위 문서의 표에서 고른다.
3. `<type>(<scope>): <subject>` 형식으로 메시지를 작성한다.
   - subject: 영문 명령형·현재형, 72자 이내, 마침표 없음
   - 필요 시 본문(왜 바꿨는지)과 푸터(`Closes #번호`)를 추가
4. Co-Authored-By 라인 없이 `git commit` 한다.
```

사용:

```bash
/commit
```

> 팀과 공유하려면 `.claude/commands/`(프로젝트), 나만 쓰려면 `~/.claude/commands/`(개인)에 둔다.

### 방법 C — 즉석 프롬프트

문서를 항상 적용할 필요가 없을 때:

```text
@docs/commit-prefix-guide.md 규칙대로 스테이징된 변경을 커밋해줘
```

---

## 3. 공동작성자(Co-Authored-By) 트레일러 끄기

`settings.json`에 추가 (전역 `~/.claude/settings.json` 또는 프로젝트 `.claude/settings.json`):

```json
{
  "includeCoAuthoredBy": false
}
```

> ⚠️ 이 설정이 **간헐적으로 적용되지 않는 사례**가 보고된 적 있다(Bash 도구로 직접 커밋할 때 등). 확실히 막으려면 위처럼 `CLAUDE.md`에도 "Co-Authored-By 라인 추가 금지"를 함께 적어두는 것이 안전하다.

---

## 4. commitlint과의 관계

| 역할 | 담당 |
|---|---|
| 커밋 메시지 **작성** | 클로드 코드 (문서 규칙 참조) |
| 형식 **검증·거부** | commitlint + husky `commit-msg` 훅 |

클로드가 규칙을 어겨도 commitlint 훅이 커밋을 막아주므로, **둘을 함께** 두면 사람이 직접 쓰든 클로드가 쓰든 형식이 보장된다.

---

> 참고 (2026-06 기준, 강의 녹화 시 재확인 권장)
> - Claude Code 설정: https://code.claude.com/docs/en/settings
> - 슬래시 커맨드: https://code.claude.com/docs/en/commands
> - 기본 Co-Authored-By 동작 / `includeCoAuthoredBy`: Claude Code 공식 settings + anthropics/claude-code 이슈 트래커에서 확인
