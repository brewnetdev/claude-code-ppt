import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { ImageOverlay, Overlay, TextOverlay } from '../canvas/OverlayLayer';
import { linkifyHtml } from '../exporter/linkify';
import { SLIDE_HEIGHT, SLIDE_WIDTH } from '../scene/constants';
import { useDeckStore } from '../scene/store';

// ── 이어지는 장의 진입 모션 캐리오버 ────────────────────────────────
// 덱에는 같은 눈썹(.kicker) + 같은 제목으로 2~3장에 걸쳐 내용을 점진적으로
// 채우는 묶음이 있다. 이 뷰는 현재 장만 innerHTML로 새로 그리므로, 장을 넘길
// 때마다 앞 장에 이미 있던 내용까지 다시 날아온다. 그러면 청중은 이어지는
// 한 장이 아니라 "각각 만들어진 별개의 장"으로 읽는다.
//
// 아래 두 함수가 직전 장과 DOM을 대조해, 실제로 달라진 요소에만 `.enter`를
// 붙인다. 나머지는 harness.css의 `.cont *{animation:none}`으로 정지한다.

/** 묶음 판별 키 — 눈썹과 제목이 모두 같으면 한 장을 나눠 놓은 것으로 본다. */
function groupKey(slide: Element): string {
  const kicker = slide.querySelector('.kicker')?.textContent?.trim() ?? '';
  const title = slide.querySelector('h1, h2')?.textContent?.trim() ?? '';
  return kicker || title ? `${kicker}|${title}` : '';
}

// 장마다 값이 달라지지만 화면에는 안 보이는 속성들. 에디터 덱은 블록마다
// 슬라이드별로 새로 발급된 `data-block-id`를 달고 있어서, 이걸 지우지 않으면
// 겉보기가 완전히 같은 요소도 매번 "바뀐 것"으로 잡혀 장 전체가 다시 날아온다.
// 빈 class/style(`class=""`)도 함께 지운다 — 에디터가 편집 흔적으로 남기는데,
// 한쪽 장에만 붙어 있으면 같은 제목이 서로 다른 것으로 잡힌다(실측: p84 제목).
const VOLATILE_ATTRS =
  /\s(?:data-block-id|spellcheck|contenteditable)="[^"]*"|\s(?:class|style)=""/g;

/** 비교용 지문 — 눈에 보이는 것만 남긴다. */
function signature(el: Element): string {
  return el.outerHTML.replace(VOLATILE_ATTRS, '');
}

/**
 * 직전 장에 없던 요소에만 `.enter`를 붙인다.
 * 위치로 짝을 맞추지 않고 "직전 장 어딘가에 같은 내용이 있었나"로 판정한다 —
 * 마지막 장에서 캡션이 요약 박스로 바뀌는 등 자식 수가 달라지는 묶음이 많다.
 * 컨테이너가 다르면 자식으로 내려가, 바뀐 최소 단위에만 건다.
 * @returns 이 서브트리에 변화가 있었는가
 */
function markChanged(el: Element, seen: Set<string>): boolean {
  // 푸터는 페이지 번호가 매 장 바뀌는 크롬이라 내용 변화로 치지 않는다.
  if (el.classList.contains('slide-footer')) return false;
  if (seen.has(signature(el))) return false;
  const kids = Array.from(el.children);
  if (kids.length > 0) {
    let deeper = false;
    for (const kid of kids) {
      if (markChanged(kid, seen)) deeper = true;
    }
    if (deeper) return true;
  }
  el.classList.add('enter');
  return true;
}

const PRESET_CLASS: Record<NonNullable<TextOverlay['preset']>, string> = {
  h1: 't-title',
  h2: 't-h2',
  h3: 't-h3',
  p: 't-body',
};

type Props = {
  onExit: () => void;
};

// Fullscreen, edit-free render of the current deck. Arrow keys (and Space)
// advance/retreat slides; Escape exits. Calls the browser's Fullscreen API
// best-effort and listens to `fullscreenchange` so the user can also exit
// natively (Esc / F11) and stay in sync with our state.
export function PresentationView({ onExit }: Props) {
  const slides = useDeckStore((s) => s.slides);
  const currentIndex = useDeckStore((s) => s.currentIndex);
  const overlaysBySlide = useDeckStore((s) => s.overlaysBySlide);
  const setCurrentIndex = useDeckStore((s) => s.setCurrentIndex);

  const [scale, setScale] = useState(1);

  useEffect(() => {
    const recompute = () => {
      const sx = window.innerWidth / SLIDE_WIDTH;
      const sy = window.innerHeight / SLIDE_HEIGHT;
      setScale(Math.min(sx, sy));
    };
    recompute();
    window.addEventListener('resize', recompute);
    return () => window.removeEventListener('resize', recompute);
  }, []);

  useEffect(() => {
    // Best-effort fullscreen — some browsers require a user gesture; the
    // toolbar click that triggers presentation already counts as one.
    const root = document.documentElement;
    if (root.requestFullscreen && !document.fullscreenElement) {
      root.requestFullscreen().catch(() => undefined);
    }
    return () => {
      if (document.fullscreenElement && document.exitFullscreen) {
        document.exitFullscreen().catch(() => undefined);
      }
    };
  }, []);

  useEffect(() => {
    const onFsChange = () => {
      // If the user exited fullscreen via Esc/F11, drop presentation mode too.
      if (!document.fullscreenElement) onExit();
    };
    document.addEventListener('fullscreenchange', onFsChange);
    return () => document.removeEventListener('fullscreenchange', onFsChange);
  }, [onExit]);

  // Capture-phase click interceptor on document — links inside the slide
  // would otherwise navigate the editor SPA away (losing in-flight state)
  // and `href="#"` would just no-op. Open real URLs in a new tab; ignore
  // empty / hash-only anchors so they don't accidentally exit presentation.
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const t = e.target as HTMLElement | null;
      const a = t?.closest('a');
      if (!a) return;
      e.preventDefault();
      e.stopPropagation();
      const href = a.getAttribute('href');
      if (!href || href === '#' || href.startsWith('#')) return;
      window.open(href, '_blank', 'noopener,noreferrer');
    };
    document.addEventListener('click', onClick, true);
    return () => document.removeEventListener('click', onClick, true);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onExit();
        return;
      }
      const { slides: cur, currentIndex: i, setCurrentIndex: set } = useDeckStore.getState();
      if (cur.length === 0) return;
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown' || e.key === ' ' || e.key === 'PageDown') {
        e.preventDefault();
        set(Math.min(cur.length - 1, i + 1));
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp' || e.key === 'PageUp' || e.key === 'Backspace') {
        e.preventDefault();
        set(Math.max(0, i - 1));
      } else if (e.key === 'Home') {
        e.preventDefault();
        set(0);
      } else if (e.key === 'End') {
        e.preventDefault();
        set(cur.length - 1);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onExit]);

  const slide = slides[currentIndex];
  // Reuse the export pipeline's linkifier so bare `https://…` text becomes
  // real anchors here too (the editor DOM is intentionally left un-linkified).
  // Existing <a> tags also get target/rel stamped. The capture-phase click
  // handler above then opens every resulting anchor in a new tab.
  const slideHtml = useMemo(
    () => (slide ? linkifyHtml(slide.html, document) : ''),
    [slide],
  );

  // 캐리오버 적용 — innerHTML 교체 직후, 페인트 전에 클래스를 심어야 첫 프레임이
  // 깜빡이지 않으므로 useLayoutEffect를 쓴다.
  const hostRef = useRef<HTMLDivElement>(null);
  const prevRef = useRef<{ index: number; html: string } | null>(null);
  useLayoutEffect(() => {
    const host = hostRef.current;
    const prev = prevRef.current;
    prevRef.current = { index: currentIndex, html: slideHtml };
    const cur = host?.querySelector('.slide');
    if (!cur) return;

    // 인접 이동 + 같은 묶음일 때만 캐리오버. 목차나 썸네일로 건너뛰어 들어오면
    // 청중이 앞 장을 못 봤으므로 평소대로 장 전체에 모션을 준다.
    if (!prev || Math.abs(currentIndex - prev.index) !== 1) return;
    const key = groupKey(cur);
    if (!key) return;
    const prevSlide = new DOMParser()
      .parseFromString(prev.html, 'text/html')
      .querySelector('.slide');
    if (!prevSlide || groupKey(prevSlide) !== key) return;

    const seen = new Set<string>();
    for (const el of Array.from(prevSlide.querySelectorAll('*'))) {
      seen.add(signature(el));
    }
    for (const child of Array.from(cur.children)) markChanged(child, seen);
    cur.classList.add('cont');
  }, [currentIndex, slideHtml]);

  if (!slide) return null;
  const overlays = overlaysBySlide[slide.id] ?? [];

  return (
    <div
      className="fixed inset-0 z-[2000] flex items-center justify-center bg-black"
      role="presentation"
      data-testid="presentation-overlay"
      data-presenting
      onClick={(e) => {
        // Click on the dark backdrop — not the slide — exits.
        if (e.target === e.currentTarget) onExit();
      }}
    >
      <div
        style={{
          width: SLIDE_WIDTH,
          height: SLIDE_HEIGHT,
          transform: `scale(${scale})`,
          transformOrigin: 'center center',
          position: 'relative',
        }}
      >
        <div
          ref={hostRef}
          className="slide-canvas-host"
          style={{ width: SLIDE_WIDTH, height: SLIDE_HEIGHT, position: 'relative' }}
          dangerouslySetInnerHTML={{ __html: slideHtml }}
        />
        <PresentationOverlays overlays={overlays} />
      </div>

      <div className="fixed bottom-4 right-6 z-[2200] select-none rounded bg-black/60 px-3 py-1 font-mono text-xs text-white/80 opacity-0 transition-opacity duration-200 hover:opacity-100">
        {currentIndex + 1} / {slides.length} · ← → 이동 · Esc 종료
      </div>

      <button
        type="button"
        onClick={onExit}
        className="fixed top-4 left-4 z-[2200] rounded border border-white/30 bg-black/60 px-3 py-1 text-xs text-white/80 opacity-0 transition-opacity duration-200 hover:bg-white/10 hover:opacity-100"
        title="Exit presentation (Esc)"
      >
        ✕ 종료
      </button>

      {currentIndex > 0 ? (
        <button
          type="button"
          onClick={() => setCurrentIndex(Math.max(0, currentIndex - 1))}
          className="fixed left-4 top-1/2 z-[2200] -translate-y-1/2 rounded-full border border-white/20 bg-black/60 px-3 py-2 text-white/70 transition hover:bg-white/10"
          aria-label="Previous slide"
        >
          ‹
        </button>
      ) : null}
      {currentIndex < slides.length - 1 ? (
        <button
          type="button"
          onClick={() => setCurrentIndex(Math.min(slides.length - 1, currentIndex + 1))}
          className="fixed right-4 top-1/2 z-[2200] -translate-y-1/2 rounded-full border border-white/20 bg-black/60 px-3 py-2 text-white/70 transition hover:bg-white/10"
          aria-label="Next slide"
        >
          ›
        </button>
      ) : null}
    </div>
  );
}

function PresentationOverlays({ overlays }: { overlays: Overlay[] }) {
  return (
    <>
      {overlays.map((o) => {
        const kind = (o as Partial<Overlay>).kind ?? 'image';
        if (kind === 'image') {
          const img = o as ImageOverlay;
          return (
            <img
              key={img.id}
              src={img.src}
              alt=""
              draggable={false}
              style={{
                position: 'absolute',
                left: img.x,
                top: img.y,
                width: img.w,
                height: img.h,
                zIndex: 100,
                pointerEvents: 'none',
                userSelect: 'none',
              }}
            />
          );
        }
        const t = o as TextOverlay;
        return (
          <div
            key={t.id}
            style={{
              position: 'absolute',
              left: t.x,
              top: t.y,
              width: t.w,
              height: t.h,
              background: t.bg ?? 'transparent',
              zIndex: 100,
              pointerEvents: 'none',
            }}
          >
            <div
              className={t.preset ? PRESET_CLASS[t.preset] : undefined}
              style={{
                textAlign: t.align ?? 'left',
                fontSize: t.fontSizePx ? `${t.fontSizePx}px` : undefined,
                width: '100%',
                height: '100%',
              }}
              dangerouslySetInnerHTML={{ __html: t.html }}
            />
          </div>
        );
      })}
    </>
  );
}
