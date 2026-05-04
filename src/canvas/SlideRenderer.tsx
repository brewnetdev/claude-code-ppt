import { useCallback, useEffect, useMemo, useRef } from 'react';
import { applyBackgroundToElement, stripBackgroundFromElement } from '../scene/applySlideBackground';
import { registerPendingFlush } from '../scene/pendingCommit';
import { useDeckStore } from '../scene/store';
import { useSlideEditing } from './useSlideEditing';
import './themes/brewnet-dark.css';
import './themes/code-blocks.css';
import './themes/portfolio.css';
import './themes/report.css';

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
    clone.querySelectorAll('.block-drag-handle').forEach((n) => n.remove());
    clone.querySelectorAll('[contenteditable]').forEach((n) => {
      (n as HTMLElement).removeAttribute('contenteditable');
    });
    clone
      .querySelectorAll('.sortable-chosen, .sortable-ghost, .sortable-drag, .selected-block')
      .forEach((n) => {
        n.classList.remove(
          'sortable-chosen',
          'sortable-ghost',
          'sortable-drag',
          'selected-block',
        );
      });

    // Strip Sortable's transient inline transform/transition on drop animation.
    // onEnd fires while the 150ms drop transition is still running, so the live
    // children of .slide-inner have inline transforms that would otherwise
    // bake into the persisted html and cause visual jitter on next remount.
    clone.querySelectorAll<HTMLElement>('.slide-inner > *').forEach((el) => {
      el.style.removeProperty('transform');
      el.style.removeProperty('transition');
      if (el.getAttribute('style') === '') el.removeAttribute('style');
    });

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

  // Drains a pending typing-debounce only if one is queued. Used by
  // undo/redo to flush in-flight edits before the store revert. We do NOT
  // commit when the timer is idle — re-committing the live DOM after a
  // drag-reorder (which already committed atomically) would push a
  // duplicate snapshot and break undo's ability to reach the pre-reorder
  // state in one step.
  const flushIfPending = useCallback(() => {
    if (timerRef.current === null) return;
    window.clearTimeout(timerRef.current);
    timerRef.current = null;
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

  useEffect(() => registerPendingFlush(flushIfPending), [flushIfPending]);

  // On unmount, only drain a pending typing-debounce. Do NOT unconditionally
  // commit: when the slide remounts due to undo/redo (revision bump), the
  // old DOM still holds the *pre-undo* html, and committing it here would
  // re-push that pre-undo state on top of the just-applied undo, silently
  // reverting the undo. Sortable / Moveable already commit atomically so
  // there's nothing else to flush at unmount time.
  useEffect(() => {
    return () => {
      if (timerRef.current === null) return;
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
      commitFromDom();
    };
  }, [commitFromDom]);

  return <div ref={ref} dangerouslySetInnerHTML={{ __html: initialHtml }} />;
}
