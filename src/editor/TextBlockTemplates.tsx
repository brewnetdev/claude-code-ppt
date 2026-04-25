import type { TextOverlay } from '../canvas/OverlayLayer';
import { SLIDE_HEIGHT, SLIDE_WIDTH } from '../scene/constants';
import { useDeckStore } from '../scene/store';

// 20 identity colors from docs/html/color-personal-card.html. The first card
// (null) is the default transparent text box; clicking it inserts an overlay
// with no background fill.
type Template = { name: string; en: string; bg: string | null };

const TEMPLATES: Template[] = [
  { name: '무색', en: 'Transparent', bg: null },
  { name: '흰색', en: 'White', bg: '#FFFFFF' },
  { name: '실버', en: 'Silver', bg: '#E5E7EB' },
  { name: '그레이', en: 'Gray', bg: '#9CA3AF' },
  { name: '딥그레이', en: 'Dark Gray', bg: '#4B5563' },
  { name: '차콜', en: 'Charcoal', bg: '#1F2937' },
  { name: '크림슨', en: 'Crimson Red', bg: '#E8392A' },
  { name: '탠저린', en: 'Tangerine', bg: '#F5671A' },
  { name: '앰버', en: 'Amber', bg: '#F5A008' },
  { name: '골드', en: 'Gold', bg: '#F0C800' },
  { name: '라임', en: 'Lime', bg: '#7AB518' },
  { name: '포레스트', en: 'Forest', bg: '#279957' },
  { name: '에메랄드', en: 'Emerald', bg: '#18A870' },
  { name: '틸', en: 'Teal', bg: '#0F9DA0' },
  { name: '스카이', en: 'Sky', bg: '#19A3D4' },
  { name: '코발트', en: 'Cobalt', bg: '#2B72D8' },
  { name: '인디고', en: 'Indigo', bg: '#4B52DB' },
  { name: '바이올렛', en: 'Violet', bg: '#7048D8' },
  { name: '퍼플', en: 'Purple', bg: '#9030C4' },
  { name: '마젠타', en: 'Magenta', bg: '#B825B8' },
  { name: '로즈', en: 'Rose', bg: '#E82C7A' },
  { name: '시에나', en: 'Sienna', bg: '#B5521C' },
  { name: '올리브', en: 'Olive', bg: '#8A9B18' },
  { name: '스틸블루', en: 'Steel Blue', bg: '#3B7EA0' },
  { name: '슬레이트', en: 'Slate', bg: '#5A5898' },
  { name: '딥로즈', en: 'Hot Pink', bg: '#F0324A' },
];

const DEFAULT_W = 320;
const DEFAULT_H = 96;

let textOverlaySeq = 0;
const makeTextOverlayId = () => `text-${Date.now()}-${++textOverlaySeq}`;

// White vs near-black text picked by perceived luminance, matching the
// rule from the source palette so dark cards keep light text and light
// cards (gold/lime) flip to dark.
function contrastFg(hex: string | null): string {
  if (!hex) return '#F1F5F9';
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return lum > 0.55 ? '#1A1A1A' : '#FFFFFF';
}

export function TextBlockTemplates() {
  const slideId = useDeckStore((s) => s.slides[s.currentIndex]?.id ?? null);
  const addOverlay = useDeckStore((s) => s.addOverlay);
  const setSelectedOverlayId = useDeckStore((s) => s.setSelectedOverlayId);

  const insert = (tpl: Template) => {
    if (!slideId) return;
    const id = makeTextOverlayId();
    const fg = contrastFg(tpl.bg);
    // Center-ish drop spot — leaves room to be repositioned on the canvas.
    const x = Math.round((SLIDE_WIDTH - DEFAULT_W) / 2);
    const y = Math.round((SLIDE_HEIGHT - DEFAULT_H) / 2);
    const item: TextOverlay = {
      id,
      kind: 'text',
      x,
      y,
      w: DEFAULT_W,
      h: DEFAULT_H,
      bg: tpl.bg,
      align: 'left',
      preset: 'p',
      html: `<div style="color:${fg}">텍스트 입력</div>`,
    };
    addOverlay(slideId, item);
    setSelectedOverlayId(id);
  };

  return (
    <div>
      <div className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-editor-dim">
        Text Block Templates
      </div>
      <div className="grid grid-cols-6 gap-1">
        {TEMPLATES.map((t) => {
          const fg = contrastFg(t.bg);
          const isNone = t.bg === null;
          return (
            <button
              key={t.en}
              type="button"
              onClick={() => insert(t)}
              title={`${t.name} · ${t.en}${t.bg ? ` · ${t.bg}` : ''}`}
              className="flex aspect-[4/3] flex-col items-center justify-center overflow-hidden rounded border border-editor-border transition hover:scale-[1.04] hover:border-editor-accent"
              style={{
                background: t.bg ?? 'transparent',
                backgroundImage: isNone
                  ? 'linear-gradient(45deg, #2a2a30 25%, transparent 25%, transparent 75%, #2a2a30 75%), linear-gradient(45deg, #2a2a30 25%, transparent 25%, transparent 75%, #2a2a30 75%)'
                  : undefined,
                backgroundSize: isNone ? '8px 8px' : undefined,
                backgroundPosition: isNone ? '0 0, 4px 4px' : undefined,
                color: fg,
              }}
            >
              <span className="text-[7px] font-bold leading-none">{t.name}</span>
            </button>
          );
        })}
      </div>
      <p className="mt-2 text-[10px] leading-relaxed text-editor-dim">
        클릭하면 슬라이드 중앙에 자유 위치 텍스트 박스가 생깁니다. 박스를 드래그/리사이즈해 배치하세요.
      </p>
    </div>
  );
}
