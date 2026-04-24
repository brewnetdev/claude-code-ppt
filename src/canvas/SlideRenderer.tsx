import { useEffect, useRef } from 'react';
import { useDeckStore } from '../scene/store';
import { useSlideEditing } from './useSlideEditing';
import './themes/brewnet-dark.css';

type Props = {
  slideId: string;
  html: string;
};

export function SlideRenderer({ slideId, html }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const commitSlideHtml = useDeckStore((s) => s.commitSlideHtml);
  useSlideEditing(ref);

  useEffect(() => {
    const host = ref.current;
    return () => {
      const slide = host?.querySelector<HTMLElement>('div.slide');
      if (slide) commitSlideHtml(slideId, slide.outerHTML);
    };
  }, [slideId, commitSlideHtml]);

  return <div ref={ref} dangerouslySetInnerHTML={{ __html: html }} />;
}
