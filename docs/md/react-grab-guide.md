# React Grab — UI 수정용 개발 도구 가이드

React Grab은 브라우저에서 UI 요소를 가리키면 해당 요소의 **파일 경로, 컴포넌트명, HTML 소스**를 클립보드에 복사해주는 개발자 도구다.
Claude Code, Cursor, Copilot 같은 AI 코딩 에이전트에 컨텍스트를 직접 전달해서 검색 단계를 줄여준다.

---

## 왜 쓰는가

AI 에이전트에 "이 버튼 색상 바꿔줘"라고 하면, 에이전트는 어느 파일인지 찾는 데 시간을 쓴다.
React Grab으로 해당 버튼을 클릭하면 `components/Button.tsx:42:5` 같은 정보가 바로 복사된다.

| 항목 | 미사용 | 사용 | 개선 |
|------|--------|------|------|
| 평균 소요 시간 | 16.8초 | 5.8초 | **3배 빠름** |
| 도구 호출 횟수 | 5회 | 1회 | **80% 감소** |
| 토큰 사용량 | 41,800 | 28,100 | **33% 절약** |

---

## 설치

### 자동 설치 (권장)

프로젝트 루트(`next.config.ts` 또는 `vite.config.ts`가 있는 위치)에서 실행:

```bash
npx -y grab@latest init
```

### MCP 연동 추가

```bash
npx -y grab@latest add mcp
```

---

## 수동 설치

### Next.js App Router (tika 프로젝트)

`app/layout.tsx`의 `<head>` 안에 추가:

```jsx
import Script from "next/script";

export default function RootLayout({ children }) {
  return (
    <html>
      <head>
        {process.env.NODE_ENV === "development" && (
          <Script
            src="//unpkg.com/react-grab/dist/index.global.js"
            crossOrigin="anonymous"
            strategy="beforeInteractive"
          />
        )}
      </head>
      <body>{children}</body>
    </html>
  );
}
```

> `process.env.NODE_ENV === "development"` 조건 덕분에 **프로덕션 빌드에는 포함되지 않는다.**

### Next.js Pages Router

`pages/_document.tsx`에 추가:

```jsx
import { Html, Head, Main, NextScript } from "next/document";

export default function Document() {
  return (
    <Html lang="en">
      <Head>
        {process.env.NODE_ENV === "development" && (
          <Script
            src="//unpkg.com/react-grab/dist/index.global.js"
            crossOrigin="anonymous"
            strategy="beforeInteractive"
          />
        )}
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
```

### Vite

`index.html`의 `<head>`에 추가:

```html
<script type="module">
  if (import.meta.env.DEV) {
    import("react-grab");
  }
</script>
```

### Webpack

```bash
npm install react-grab
```

메인 엔트리 파일(`src/index.tsx`) 최상단에 추가:

```tsx
if (process.env.NODE_ENV === "development") {
  import("react-grab");
}
```

---

## 기본 사용법

1. 개발 서버 실행 (`npm run dev`)
2. 브라우저에서 수정하고 싶은 UI 요소 위에 마우스 올리기
3. 단축키로 컨텍스트 복사:
   - **Mac:** `⌘C`
   - **Windows/Linux:** `Ctrl+C`
4. Claude Code(또는 다른 AI 에이전트)에 그대로 붙여넣기

**복사되는 내용 예시:**

```
<a class="ml-auto inline-block text-sm" href="#">
  Forgot your password?
</a>
in LoginForm at components/login-form.tsx:46:19
```

이 텍스트를 Claude Code에 붙여넣으면 에이전트가 파일과 위치를 즉시 파악한다.

---

## 플러그인

React Grab은 플러그인으로 기능을 확장할 수 있다.

### 기본 플러그인 등록

```js
window.__REACT_GRAB__.registerPlugin({
  name: "my-plugin",
  hooks: {
    onElementSelect: (element) => {
      console.log("Selected:", element.tagName);
    },
  },
});
```

### React 컴포넌트에서 등록

```jsx
useEffect(() => {
  const api = window.__REACT_GRAB__;
  if (!api) return;

  api.registerPlugin({
    name: "my-plugin",
    actions: [
      {
        id: "my-action",
        label: "My Action",
        shortcut: "M",
        onAction: (context) => {
          console.log("Action on:", context.element);
          context.hideContextMenu();
        },
      },
    ],
  });

  return () => api.unregisterPlugin("my-plugin");
}, []);
```

### 액션 위치 지정

`target` 필드로 액션이 표시되는 위치를 결정한다:

| `target` 값 | 표시 위치 |
|-------------|-----------|
| 생략 또는 `"context-menu"` | 우클릭 컨텍스트 메뉴 |
| `"toolbar"` | 툴바 드롭다운 |

```js
actions: [
  {
    id: "inspect",
    label: "Inspect",
    shortcut: "I",
    onAction: (ctx) => console.dir(ctx.element),
    // target 생략 → 컨텍스트 메뉴
  },
  {
    id: "toggle-freeze",
    label: "Freeze",
    target: "toolbar",          // 툴바에 표시
    isActive: () => isFrozen,
    onAction: () => toggleFreeze(),
  },
],
```

---

## Primitives (고급)

저수준 API로 직접 엘리먼트 선택기를 구현할 수 있다.

```bash
npm install react-grab@latest
```

```tsx
import {
  getElementContext,
  freeze,
  unfreeze,
  openFile,
  type ReactGrabElementContext,
} from "react-grab/primitives";
```

### 커스텀 엘리먼트 선택기 예제

```tsx
import { useState } from "react";
import {
  getElementContext,
  freeze,
  unfreeze,
  openFile,
  type ReactGrabElementContext,
} from "react-grab/primitives";

const useElementSelector = (onSelect: (context: ReactGrabElementContext) => void) => {
  const [isActive, setIsActive] = useState(false);

  const startSelecting = () => {
    setIsActive(true);

    // 호버 하이라이트 오버레이 생성
    const highlightOverlay = document.createElement("div");
    Object.assign(highlightOverlay.style, {
      position: "fixed",
      pointerEvents: "none",
      zIndex: "999999",
      border: "2px solid #3b82f6",
      transition: "all 75ms ease-out",
      display: "none",
    });
    document.body.appendChild(highlightOverlay);

    // 마우스 이동 시 하이라이트
    const handleMouseMove = ({ clientX, clientY }: MouseEvent) => {
      highlightOverlay.style.display = "none";
      const target = document.elementFromPoint(clientX, clientY);
      if (!target) return;
      const { top, left, width, height } = target.getBoundingClientRect();
      Object.assign(highlightOverlay.style, {
        top: `${top}px`,
        left: `${left}px`,
        width: `${width}px`,
        height: `${height}px`,
        display: "block",
      });
    };

    // 클릭 시 컨텍스트 추출
    const handleClick = async ({ clientX, clientY }: MouseEvent) => {
      highlightOverlay.style.display = "none";
      const target = document.elementFromPoint(clientX, clientY);
      teardown();
      if (!target) return;
      freeze();
      onSelect(await getElementContext(target));
      unfreeze();
    };

    const teardown = () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("click", handleClick, true);
      highlightOverlay.remove();
      setIsActive(false);
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("click", handleClick, true);
  };

  return { isActive, startSelecting };
};

// 사용 예시 컴포넌트
const ElementSelector = () => {
  const [context, setContext] = useState<ReactGrabElementContext | null>(null);
  const selector = useElementSelector(setContext);

  return (
    <div>
      <button onClick={selector.startSelecting} disabled={selector.isActive}>
        {selector.isActive ? "Selecting..." : "Select Element"}
      </button>
      {context && (
        <div>
          <p>Component: {context.componentName}</p>
          <p>Selector: {context.selector}</p>
          <pre>{context.stackString}</pre>
          <button
            onClick={() => {
              const frame = context.stack[0];
              if (frame?.fileName) openFile(frame.fileName, frame.lineNumber);
            }}
          >
            Open in Editor
          </button>
        </div>
      )}
    </div>
  );
};
```

### Primitives API 요약

| 함수 | 설명 |
|------|------|
| `getElementContext(el)` | DOM 엘리먼트의 컨텍스트 추출 (컴포넌트명, 파일 경로, 스택 등) |
| `freeze()` | React Grab 일시 중지 |
| `unfreeze()` | React Grab 재개 |
| `openFile(fileName, lineNumber)` | 에디터에서 파일 열기 |

---

## 유의사항

- **개발 환경 전용** — `NODE_ENV === "development"` 조건으로 감싸야 프로덕션 번들에 포함되지 않는다.
- **React DevTools 필요** — 컴포넌트명과 파일 경로 추출은 React DevTools 훅에 의존하므로, `NODE_ENV=production` 빌드에서는 동작하지 않는다.
- **`⌘C` 충돌 주의** — 텍스트 선택 후 `⌘C`를 누르면 텍스트가 아닌 엘리먼트 컨텍스트가 복사될 수 있다. 텍스트를 복사할 때는 React Grab 오버레이가 뜨지 않는 곳에서 복사하거나, 툴바에서 일시 비활성화한다.
- **SSR 환경** — `window.__REACT_GRAB__` 참조 시 서버 사이드에서는 `undefined`이므로 클라이언트 전용으로 호출해야 한다.
- **프레임워크 버전** — React 16.8 이상에서만 컴포넌트 스택 추출이 지원된다.

---

## Claude Code 연동 워크플로우

1. `npm run dev`로 개발 서버 시작
2. 브라우저에서 수정할 UI 요소에 마우스 올리기
3. `⌘C`로 컨텍스트 복사
4. Claude Code 프롬프트에 붙여넣고 수정 요청:
   ```
   <button class="btn-primary" ...>
   in TicketForm at src/components/ticket/TicketForm.tsx:215:8

   이 버튼의 배경색을 #629584로 바꿔줘
   ```
5. Claude Code가 파일 검색 없이 바로 해당 위치를 수정

---

## 참고 링크

- [공식 데모](https://react-grab.com)
- [GitHub 저장소](https://github.com/aidenybai/react-grab)
- [Plugin/Hooks 타입 정의](https://github.com/aidenybai/react-grab/blob/main/packages/react-grab/src/types.ts)
- [Primitives API](https://github.com/aidenybai/react-grab/blob/main/packages/react-grab/src/primitives.ts)