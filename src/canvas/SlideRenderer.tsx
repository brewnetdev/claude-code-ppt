import { useCallback, useEffect, useMemo, useRef } from 'react';
import { useDeckStore } from '../scene/store';
import { useSlideEditing } from './useSlideEditing';
import './themes/brewnet-dark.css';

const COMMIT_DEBOUNCE_MS = 300;

type Props = {
  slideId: string;
};

export function SlideRenderer({ slideId }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const commitSlideHtml = useDeckStore((s) => s.commitSlideHtml);

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
      .querySelectorAll('.sortable-chosen, .sortable-ghost, .sortable-drag')
      .forEach((n) => {
        n.classList.remove('sortable-chosen', 'sortable-ghost', 'sortable-drag');
      });

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

  useEffect(() => {
    return () => {
      if (timerRef.current !== null) window.clearTimeout(timerRef.current);
      commitFromDom();
    };
  }, [commitFromDom]);

  return <div ref={ref} dangerouslySetInnerHTML={{ __html: initialHtml }} />;
}
