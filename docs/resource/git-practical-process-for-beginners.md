# 비전공자를 위한 git 실전 프로세스
## — 실제 파일을 바꿔가며 따라하기

> 방금 만든 `git-simple` 저장소(README.md를 init → add → commit → push 완료)에서 **이어서** 진행합니다.
> 모든 출력 예시는 환경에 따라 조금씩 다를 수 있습니다.

---

## 이 문서에서 익히는 것

비전공자가 실제로 매일 부딪히는 6가지 상황을, **진짜 파일을 바꿔가며** 한 번씩 경험합니다.

| 에피소드 | 상황 | 핵심 명령 |
|---|---|---|
| 1 | 문서 내용을 고쳐서 깃허브에 올리기 | `status` → `diff` → `add` → `commit` → `push` |
| 2 | 새 파일을 추가해서 올리기 | `add .` → `commit` → `push` |
| 3 | 잘못 고친 걸 되돌리기 | `git restore` |
| 4 | 실수로 add한 걸 취소하기 | `git restore --staged` |
| 5 | 지금까지 한 작업 돌아보기 | `git log --oneline` |
| 6 | 다른 곳의 최신본 가져오기 | `git pull` |

> 시작 전 현재 폴더가 `git-simple`인지 확인하세요.
> ```bash
> pwd        # .../git-simple 로 끝나야 함
> ```

---

## 에피소드 1 — 문서를 고쳐서 깃허브에 올리기 (핵심 루프)

가장 자주 하는 작업입니다. **자기소개 한 줄을 README에 추가**해 봅니다.

### ① 파일 수정 (실제 변경)

```bash
echo "안녕하세요, 저는 git을 배우는 중입니다." >> README.md
```

### ② 내가 뭘 바꿨는지 확인

```bash
git status
```
출력 예시:
```
변경 사항이 스테이지되지 않음:
  수정함:        README.md
```

```bash
git diff
```
출력 예시(추가된 줄이 `+`로 표시됨):
```
+안녕하세요, 저는 git을 배우는 중입니다.
```

> 💡 `git diff`는 "정확히 어느 줄을 고쳤는지"를 보여줍니다. 올리기 전 점검용.

### ③ 기록(commit)하고 ④ 올리기(push)

```bash
git add README.md
git commit -m "자기소개 문구 추가"
git push
```

**무슨 일이 일어났나:**
수정(작업) → `add`(올릴 목록에 담기) → `commit`(내 PC에 기록) → `push`(깃허브에 업로드).
이제 GitHub 웹사이트에서 새로고침하면 추가한 문장이 보입니다. → [스크린샷 영역: GitHub 웹에서 README 변경 확인]

---

## 에피소드 2 — 새 파일을 추가해서 올리기

README 외에 **새 파일**을 만들면 어떻게 되는지 봅니다. "독서 기록" 파일을 만들어 봅니다.

### ① 새 파일 생성

```bash
echo "# 나의 독서 기록" > reading-log.md
echo "- 클로드 코드 마스터" >> reading-log.md
```

### ② 상태 확인 — '추적 안 함' 파일 등장

```bash
git status
```
출력 예시:
```
추적하지 않는 파일:
  reading-log.md
```

> 💡 새로 만든 파일은 처음엔 git이 **추적하지 않습니다(untracked).** `add`를 해야 git이 관리하기 시작합니다.

### ③ 한꺼번에 담아서 올리기

```bash
git add .
git commit -m "독서 기록 파일 추가"
git push
```

**핵심:** `git add .` 는 **변경·추가된 모든 파일**을 한 번에 담습니다. 파일이 여러 개일 때 편리합니다.

---

## 에피소드 3 — 잘못 고친 걸 되돌리기 (안심 장치 ①)

실수로 파일을 망쳤을 때 **마지막 커밋 상태로 되돌리는** 법입니다.

### ① 일부러 잘못 수정

```bash
echo "이 줄은 실수로 넣은 잘못된 내용입니다" >> reading-log.md
```

### ② 되돌리기 전 확인

```bash
git status        # "수정함: reading-log.md"
```

### ③ 되돌리기

```bash
git restore reading-log.md
```

이제 파일을 열어보면 **잘못 넣은 줄이 사라지고** 마지막으로 커밋한 상태로 돌아옵니다.

> ⚠️ 주의: `git restore`는 **아직 commit하지 않은** 변경만 되돌립니다. 이미 commit/push한 내용은 대상이 아닙니다.

---

## 에피소드 4 — 실수로 add한 걸 취소하기 (안심 장치 ②)

`add`까지 했는데 "이건 아직 올릴 게 아니었다" 싶을 때입니다.

### ① 수정하고 실수로 add

```bash
echo "- 작성 중인 책 (아직 미완성)" >> reading-log.md
git add reading-log.md
```

### ② 상태 확인 — 스테이징됨

```bash
git status
```
출력 예시:
```
커밋할 변경 사항:
  수정함:        reading-log.md
```

### ③ 스테이징만 취소 (파일 내용은 유지)

```bash
git restore --staged reading-log.md
```

이제 `add`만 취소되고, **고친 내용 자체는 그대로 남습니다.** (`git status`로 다시 확인하면 "스테이지되지 않음" 상태로 바뀜)

> 💡 `restore`(파일 내용 되돌리기) vs `restore --staged`(올릴 목록에서만 빼기) — 헷갈리면 일단 `git status`. 화면에 어떤 명령을 쓰면 되는지 안내해 줍니다.

---

## 에피소드 5 — 지금까지 한 작업 돌아보기

```bash
git log --oneline
```
출력 예시:
```
a1b2c3d 독서 기록 파일 추가
e4f5g6h 자기소개 문구 추가
i7j8k9l first commit
```

각 줄이 하나의 "저장 지점(커밋)"입니다. **언제 무엇을 했는지** 기록이 남아, 나중에 추적·복구의 기준이 됩니다.

> 종료: `git log`가 길어 화면을 꽉 채우면 `q` 키를 눌러 빠져나옵니다.

---

## 에피소드 6 — 다른 곳의 최신본 가져오기

집 PC와 회사 PC를 오가거나, 협업자가 변경을 올렸을 때 **내 PC를 최신으로 맞추는** 명령입니다.

```bash
git pull
```

- 변경이 있으면 → 내려받아 내 파일을 최신으로 갱신
- 변경이 없으면 → `이미 업데이트 상태입니다` 메시지

> ⚠️ 같은 파일을 양쪽에서 동시에 고치면 "충돌(conflict)"이 날 수 있습니다. 혼자 한 대로만 쓸 때는 거의 발생하지 않으니, 충돌 처리는 별도 심화 주제로 다룹니다.

---

## 전체 흐름 한눈에 보기

```
[파일 수정]
   │
   ▼
git status   ── "내가 뭘 바꿨지?" 확인
   │
   ▼
git diff     ── "어느 줄을 바꿨지?" 확인 (선택)
   │
   ▼
git add .    ── 올릴 목록에 담기  ←─ 취소: git restore --staged
   │
   ▼
git commit   ── 내 PC에 기록      ←─ 수정 취소: git restore (commit 전)
   │
   ▼
git push     ── 깃허브에 업로드
```

---

## 비전공자용 치트시트 (한 장 요약)

| 하고 싶은 것 | 명령어 |
|---|---|
| 상태 확인 | `git status` |
| 바뀐 내용 보기 | `git diff` |
| 올릴 목록에 담기 | `git add .` |
| 기록(저장) | `git commit -m "메시지"` |
| 깃허브에 올리기 | `git push` |
| 최신본 받기 | `git pull` |
| 작업 기록 보기 | `git log --oneline` |
| 수정 되돌리기(커밋 전) | `git restore 파일` |
| add 취소 | `git restore --staged 파일` |

> **막히면 무조건 `git status`** — git이 현재 상태와 다음에 할 일을 알려줍니다.

---

### 검증 노트
- ✅ 모든 명령(`status`/`diff`/`add`/`commit -m`/`push`/`pull`/`log --oneline`/`restore`/`restore --staged`) — 표준 문법·동작 정확
- ✅ `git restore 파일`=작업 디렉터리 변경 취소, `git restore --staged 파일`=스테이징 취소 — git 2.23+ 공식 명령
- ✅ 새 파일은 untracked 상태로 시작, `add` 후 추적 시작 — git 표준
- ⚠️ git 출력 메시지(한글/영문)는 git 로케일 설정에 따라 다름 → 본 문서는 한글 로케일 기준 예시
- ⚠️ `git pull` 충돌 가능성은 단독 사용 시 드묾 → 심화 주제로 분리 권장
