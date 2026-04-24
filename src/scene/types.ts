export type Theme = 'dark' | 'light';

export type SourceFamily = 'presentation' | 'manual' | 'portfolio' | 'report';

export type InlineStyle = {
  color?: string;
  fontWeight?: 'normal' | 'bold';
  italic?: boolean;
};

export type BulletItem = {
  text: string;
  sub?: string;
  highlight?: 'amber' | 'blue' | 'green';
};

export type ContentBlock =
  | { id: string; kind: 'title' | 'subtitle' | 'label' | 'caption' | 'body' | 'quote'; text: string; style?: InlineStyle }
  | { id: string; kind: 'bullets'; items: BulletItem[] }
  | { id: string; kind: 'table'; columns: string[]; rows: string[][]; emphasisRow?: number }
  | { id: string; kind: 'code'; lang?: string; code: string }
  | { id: string; kind: 'callout'; tone: 'amber' | 'blue' | 'green'; icon?: string; body: string };

export type OverlayItem = {
  id: string;
  kind: 'image' | 'textbox' | 'shape';
  x: number;
  y: number;
  w: number;
  h: number;
  rotation?: number;
  payload: ImagePayload | TextboxPayload | ShapePayload;
};

export type ImagePayload = { src: string; alt?: string; objectFit?: 'cover' | 'contain' };
export type TextboxPayload = { text: string; style?: InlineStyle };
export type ShapePayload = { shape: 'rect' | 'circle'; fill?: string; stroke?: string };

export type Slide = {
  id: string;
  layout: string;
  blocks: ContentBlock[];
  overlays: OverlayItem[];
  bgImage?: string;
  footer?: { left?: string; right?: string };
};

export type Deck = {
  id: string;
  meta: {
    title: string;
    theme: Theme;
    sourceFamily: SourceFamily;
  };
  slides: Slide[];
};

export const SLIDE_WIDTH = 1280;
export const SLIDE_HEIGHT = 720;
export const TARGET_WIDTH = 1920;
export const TARGET_HEIGHT = 1080;
export const EXPORT_SCALE = TARGET_WIDTH / SLIDE_WIDTH;
