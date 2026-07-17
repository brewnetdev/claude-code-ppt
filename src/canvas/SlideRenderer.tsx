import { useCallback, useEffect, useMemo, useRef } from 'react';
import { applyBackgroundToElement, stripBackgroundFromElement } from '../scene/applySlideBackground';
import { stripEditorChrome } from '../scene/stripEditorChrome';
import { usePendingFlush } from '../scene/pendingCommit';
import { useDeckStore } from '../scene/store';
import { useSlideEditing } from './useSlideEditing';
import './themes/brewnet-dark.css';
import './themes/code-blocks.css';
import './themes/portfolio.css';
import './themes/report.css';
import './themes/harness.css';

const COMMIT_DEBOUNCE_MS = 300;

type Props = {
  slideId: string;
};

export function SlideRenderer({ slideId }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const commitSlideHtml = useDeckStore((s) => s.commitSlideHtml);
  // Subscribe to bg only — html/style edits keep flowing through the
  // dangerouslySetInnerHTML mount + DOM-debounced commit path.
  const background = useDeckStore(
    (s) => s.slides.find((slide) => slide.id === slideId)?.background ?? null,
  );

  // Read html once per slideId. We never rebind the DOM on store updates —
  // re-rendering dangerouslySetInnerHTML would nuke contenteditable focus mid-type.
  const initialHtml = useMemo(
    () => useDeckStore.getState().slides.find((s) => s.id === slideId)?.html ?? '',
    [slideId],
  );

  const commitFromDom = useCallback(() => {
    const slide = ref.current?.querySelector<HTMLElement>('div.slide');
    if (!slide) return;

    const clone = slide.cloneNode(true) as HTMLElement;
    // Strip every editor-only affordance (drag/col-resize handles,
    // contenteditable, transient Sortable classes + drop transforms, ZWSP
    // placeholders) via the shared helper so both commit paths agree.
    stripEditorChrome(clone);

    // Background is owned by ParsedSlide.background (a structured field),
    // not by the html string. Strip the runtime-applied bg style before
    // serializing so the canonical html stays clean and bg toggles can be
    // undone independently of textual edits.
    stripBackgroundFromElement(clone);

    commitSlideHtml(slideId, clone.outerHTML);
  }, [slideId, commitSlideHtml]);

  const timerRef = useRef<number | null>(null);
  const scheduleCommit = useCallback(() => {
    if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => {
      commitFromDom();
      timerRef.current = null;
    }, COMMIT_DEBOUNCE_MS);
  }, [commitFromDom]);

  // Reorder needs an atomic commit: cancel any pending typing-debounce
  // (otherwise it would commit again on top with the same DOM and produce
  // a no-op snapshot) and write the post-drag DOM straight to the store.
  const commitNow = useCallback(() => {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    commitFromDom();
  }, [commitFromDom]);

  useSlideEditing(ref, scheduleCommit, commitNow);

  // Apply background imperatively — mutating .slide style avoids a remount
  // (which would nuke focus mid-edit) and keeps bg state independent of the
  // html string. Re-runs whenever the slide changes or the user picks a new
  // color/image.
  useEffect(() => {
    const slide = ref.current?.querySelector<HTMLElement>('div.slide');
    if (!slide) return;
    applyBackgroundToElement(slide, background);
  }, [background, slideId]);

  usePendingFlush(timerRef, commitFromDom);

  return <div ref={ref} dangerouslySetInnerHTML={{ __html: initialHtml }} />;
}
