// SlidePlan — the JSON contract that the LLM author emits and the deterministic
// renderer consumes. The shape mirrors the patterns in design-patterns.html so
// renderPlan() can compile each node into the same editor-compatible HTML
// without the LLM ever touching markup.

export type Template = 'presentation' | 'portfolio' | 'report';

export type SupportedLang =
  | 'java'
  | 'typescript'
  | 'javascript'
  | 'tsx'
  | 'jsx'
  | 'python'
  | 'bash'
  | 'shell'
  | 'json'
  | 'yaml'
  | 'html'
  | 'css'
  | 'markdown'
  | 'plaintext';

export type CalloutTone = 'amber' | 'blue' | 'green';
export type BadgeTone = 'amber' | 'blue' | 'green' | 'red' | 'gray';

export type MetaItem = { label?: string; icon?: string; value: string };
export type Callout = { tone: CalloutTone; icon?: string; title?: string; body: string };

export type Block =
  | { kind: 'paragraph'; text: string }
  | { kind: 'h3'; text: string }
  | { kind: 'bullets'; items: BulletItem[] }
  | { kind: 'numbered'; items: BulletItem[] }
  | { kind: 'code'; lang: SupportedLang; source: string }
  | { kind: 'terminal'; source: string }
  | { kind: 'callout'; tone: CalloutTone; icon?: string; title?: string; body: string }
  | { kind: 'badges'; items: { label: string; tone: BadgeTone }[] }
  | { kind: 'table'; headers: string[]; rows: string[][] };

// Bullet items support an optional sub-line ("description under the headline")
// matching the brewnet `<span class="sub">` pattern observed in design-patterns.html.
export type BulletItem = { text: string; sub?: string };

export type SlideNode =
  | {
      type: 'cover';
      title: string;
      subtitle?: string;
      chapter?: string;
      deco?: string;
      meta?: MetaItem[];
      caption?: string;
    }
  | {
      type: 'section';
      num: string;
      title: string;
      label?: string;
      subtitle?: string;
      caption?: string;
      pageTag?: string;
    }
  | {
      type: 'title-body';
      title: string;
      label?: string;
      subtitle?: string;
      caption?: string;
      blocks: Block[];
    }
  | {
      type: 'title-bullets';
      title: string;
      label?: string;
      subtitle?: string;
      caption?: string;
      bullets: BulletItem[];
      callout?: Callout;
    }
  | {
      type: 'title-code';
      title: string;
      label?: string;
      subtitle?: string;
      caption?: string;
      code: { lang: SupportedLang; source: string };
      callout?: Callout;
    }
  | {
      type: 'two-col-code';
      title: string;
      label?: string;
      subtitle?: string;
      caption?: string;
      ratio?: '6-4' | '4-6' | '5-5';
      left: Block[];
      right: Block[];
    }
  | {
      type: 'comparison-table';
      title: string;
      label?: string;
      caption?: string;
      headers: string[];
      rows: string[][];
      lead?: string;
      callout?: Callout;
    }
  | {
      type: 'callout-summary';
      title: string;
      label?: string;
      caption?: string;
      lead?: string;
      callouts: Callout[];
      bullets?: BulletItem[];
    }
  | {
      type: 'references';
      title: string;
      label?: string;
      caption?: string;
      links: { text: string; href: string; sub?: string }[];
      callout?: Callout;
    };

export type SlidePlan = {
  meta: {
    title: string;
    subtitle?: string;
    chapter?: string;
    deco?: string;
    sourceFile: string;
  };
  template: Template;
  slides: SlideNode[];
};

const SUPPORTED_LANGS = new Set<SupportedLang>([
  'java',
  'typescript',
  'javascript',
  'tsx',
  'jsx',
  'python',
  'bash',
  'shell',
  'json',
  'yaml',
  'html',
  'css',
  'markdown',
  'plaintext',
]);
const TEMPLATES = new Set<Template>(['presentation', 'portfolio', 'report']);
const CALLOUT_TONES = new Set<CalloutTone>(['amber', 'blue', 'green']);
const BADGE_TONES = new Set<BadgeTone>(['amber', 'blue', 'green', 'red', 'gray']);
const SLIDE_TYPES = new Set([
  'cover',
  'section',
  'title-body',
  'title-bullets',
  'title-code',
  'two-col-code',
  'comparison-table',
  'callout-summary',
  'references',
]);
const BLOCK_KINDS = new Set([
  'paragraph',
  'h3',
  'bullets',
  'numbered',
  'code',
  'terminal',
  'callout',
  'badges',
  'table',
]);

export type ValidateResult =
  | { ok: true; plan: SlidePlan }
  | { ok: false; errors: string[] };

// Hand-rolled validator (avoiding a Zod dependency). Returns ALL errors so the
// retry prompt can correct them in one shot rather than play whack-a-mole.
export function validateSlidePlan(raw: unknown): ValidateResult {
  const errors: string[] = [];
  if (!isObj(raw)) return { ok: false, errors: ['plan is not an object'] };

  const meta = (raw as Record<string, unknown>).meta;
  if (!isObj(meta)) errors.push('meta missing');
  else {
    if (typeof meta.title !== 'string' || meta.title.trim().length === 0)
      errors.push('meta.title must be a non-empty string');
    if (typeof meta.sourceFile !== 'string' || meta.sourceFile.trim().length === 0)
      errors.push('meta.sourceFile must be a non-empty string');
  }

  const template = (raw as Record<string, unknown>).template;
  if (typeof template !== 'string' || !TEMPLATES.has(template as Template))
    errors.push(`template must be one of ${[...TEMPLATES].join('|')}`);

  const slides = (raw as Record<string, unknown>).slides;
  if (!Array.isArray(slides) || slides.length === 0)
    errors.push('slides must be a non-empty array');

  if (Array.isArray(slides) && slides.length > 0) {
    if (!isObj(slides[0]) || (slides[0] as { type?: unknown }).type !== 'cover')
      errors.push('slides[0].type must be "cover"');

    const sectionNums = new Set<string>();
    slides.forEach((s, i) => {
      const slideErrors = validateSlide(s, i);
      errors.push(...slideErrors);
      if (isObj(s) && s.type === 'section' && typeof s.num === 'string') {
        if (sectionNums.has(s.num)) errors.push(`slides[${i}]: duplicate section.num "${s.num}"`);
        sectionNums.add(s.num);
      }
    });
  }

  if (errors.length > 0) return { ok: false, errors };
  return { ok: true, plan: raw as SlidePlan };
}

function validateSlide(raw: unknown, idx: number): string[] {
  const here = `slides[${idx}]`;
  const errs: string[] = [];
  if (!isObj(raw)) return [`${here}: not an object`];
  const type = raw.type;
  if (typeof type !== 'string' || !SLIDE_TYPES.has(type)) {
    return [`${here}: type must be one of ${[...SLIDE_TYPES].join('|')}`];
  }

  // type-specific required fields
  switch (type) {
    case 'cover':
      if (typeof raw.title !== 'string' || raw.title.trim() === '')
        errs.push(`${here}.title required (cover)`);
      if (raw.meta !== undefined && !isMetaArray(raw.meta))
        errs.push(`${here}.meta must be MetaItem[]`);
      break;
    case 'section':
      if (typeof raw.num !== 'string' || raw.num.trim() === '')
        errs.push(`${here}.num required (section)`);
      if (typeof raw.title !== 'string' || raw.title.trim() === '')
        errs.push(`${here}.title required (section)`);
      break;
    case 'title-body':
      requireString(errs, here, 'title', raw.title);
      if (!Array.isArray(raw.blocks) || raw.blocks.length === 0)
        errs.push(`${here}.blocks must be a non-empty array`);
      else
        raw.blocks.forEach((b, j) => errs.push(...validateBlock(b, `${here}.blocks[${j}]`)));
      break;
    case 'title-bullets':
      requireString(errs, here, 'title', raw.title);
      if (!Array.isArray(raw.bullets) || raw.bullets.length === 0)
        errs.push(`${here}.bullets must be a non-empty array`);
      else
        raw.bullets.forEach((b, j) =>
          errs.push(...validateBullet(b, `${here}.bullets[${j}]`)),
        );
      if (raw.callout !== undefined) errs.push(...validateCallout(raw.callout, `${here}.callout`));
      break;
    case 'title-code':
      requireString(errs, here, 'title', raw.title);
      errs.push(...validateCode(raw.code, `${here}.code`));
      if (raw.callout !== undefined) errs.push(...validateCallout(raw.callout, `${here}.callout`));
      break;
    case 'two-col-code':
      requireString(errs, here, 'title', raw.title);
      if (raw.ratio !== undefined && !['6-4', '4-6', '5-5'].includes(raw.ratio as string))
        errs.push(`${here}.ratio must be 6-4|4-6|5-5`);
      if (!Array.isArray(raw.left) || raw.left.length === 0)
        errs.push(`${here}.left must be a non-empty array`);
      else raw.left.forEach((b, j) => errs.push(...validateBlock(b, `${here}.left[${j}]`)));
      if (!Array.isArray(raw.right) || raw.right.length === 0)
        errs.push(`${here}.right must be a non-empty array`);
      else raw.right.forEach((b, j) => errs.push(...validateBlock(b, `${here}.right[${j}]`)));
      // At least one side should carry a code block — that's the slide's
      // raison d'être. Otherwise an LLM might pick this type for prose-only
      // content where two-col-code would just look weird.
      const allBlocks = [...(raw.left as Block[]), ...(raw.right as Block[])];
      if (!allBlocks.some((b) => b && b.kind === 'code'))
        errs.push(`${here}.left/right must contain at least one code block`);
      break;
    case 'comparison-table':
      requireString(errs, here, 'title', raw.title);
      if (!Array.isArray(raw.headers) || raw.headers.length === 0)
        errs.push(`${here}.headers must be a non-empty array`);
      if (!Array.isArray(raw.rows) || raw.rows.length === 0)
        errs.push(`${here}.rows must be a non-empty array`);
      else if (Array.isArray(raw.headers))
        raw.rows.forEach((r, j) => {
          if (!Array.isArray(r) || r.length !== (raw.headers as unknown[]).length)
            errs.push(`${here}.rows[${j}] length must match headers`);
        });
      if (raw.callout !== undefined) errs.push(...validateCallout(raw.callout, `${here}.callout`));
      break;
    case 'callout-summary':
      requireString(errs, here, 'title', raw.title);
      if (!Array.isArray(raw.callouts) || raw.callouts.length === 0)
        errs.push(`${here}.callouts must be a non-empty array`);
      else
        raw.callouts.forEach((c, j) =>
          errs.push(...validateCallout(c, `${here}.callouts[${j}]`)),
        );
      break;
    case 'references':
      requireString(errs, here, 'title', raw.title);
      if (!Array.isArray(raw.links) || raw.links.length === 0)
        errs.push(`${here}.links must be a non-empty array`);
      else
        raw.links.forEach((l, j) => {
          if (!isObj(l)) {
            errs.push(`${here}.links[${j}] must be an object`);
            return;
          }
          if (typeof l.text !== 'string' || l.text.trim() === '')
            errs.push(`${here}.links[${j}].text required`);
          if (typeof l.href !== 'string' || !/^https?:\/\//.test(l.href))
            errs.push(`${here}.links[${j}].href must be http(s) URL`);
        });
      break;
  }
  return errs;
}

function validateBlock(raw: unknown, path: string): string[] {
  if (!isObj(raw)) return [`${path}: not an object`];
  const kind = raw.kind;
  if (typeof kind !== 'string' || !BLOCK_KINDS.has(kind))
    return [`${path}.kind must be one of ${[...BLOCK_KINDS].join('|')}`];
  const errs: string[] = [];
  switch (kind) {
    case 'paragraph':
    case 'h3':
      if (typeof raw.text !== 'string' || raw.text.trim() === '')
        errs.push(`${path}.text required`);
      break;
    case 'bullets':
    case 'numbered':
      if (!Array.isArray(raw.items) || raw.items.length === 0)
        errs.push(`${path}.items must be a non-empty array`);
      else
        raw.items.forEach((it, j) =>
          errs.push(...validateBullet(it, `${path}.items[${j}]`)),
        );
      break;
    case 'code':
      errs.push(...validateCode(raw, path));
      break;
    case 'terminal':
      if (typeof raw.source !== 'string' || raw.source.trim() === '')
        errs.push(`${path}.source required`);
      break;
    case 'callout':
      errs.push(...validateCallout(raw, path));
      break;
    case 'badges':
      if (!Array.isArray(raw.items) || raw.items.length === 0)
        errs.push(`${path}.items must be a non-empty array`);
      else
        raw.items.forEach((it, j) => {
          if (!isObj(it)) errs.push(`${path}.items[${j}] must be object`);
          else {
            if (typeof it.label !== 'string') errs.push(`${path}.items[${j}].label required`);
            if (typeof it.tone !== 'string' || !BADGE_TONES.has(it.tone as BadgeTone))
              errs.push(`${path}.items[${j}].tone must be one of ${[...BADGE_TONES].join('|')}`);
          }
        });
      break;
    case 'table':
      if (!Array.isArray(raw.headers) || raw.headers.length === 0)
        errs.push(`${path}.headers required`);
      if (!Array.isArray(raw.rows) || raw.rows.length === 0)
        errs.push(`${path}.rows required`);
      break;
  }
  return errs;
}

function validateBullet(raw: unknown, path: string): string[] {
  if (!isObj(raw)) return [`${path}: not an object`];
  const errs: string[] = [];
  if (typeof raw.text !== 'string' || raw.text.trim() === '')
    errs.push(`${path}.text required`);
  if (raw.sub !== undefined && typeof raw.sub !== 'string')
    errs.push(`${path}.sub must be a string when present`);
  return errs;
}

function validateCallout(raw: unknown, path: string): string[] {
  if (!isObj(raw)) return [`${path}: not an object`];
  const errs: string[] = [];
  if (typeof raw.tone !== 'string' || !CALLOUT_TONES.has(raw.tone as CalloutTone))
    errs.push(`${path}.tone must be one of ${[...CALLOUT_TONES].join('|')}`);
  if (typeof raw.body !== 'string' || raw.body.trim() === '')
    errs.push(`${path}.body required`);
  return errs;
}

function validateCode(raw: unknown, path: string): string[] {
  if (!isObj(raw)) return [`${path}: not an object`];
  const errs: string[] = [];
  if (typeof raw.lang !== 'string' || !SUPPORTED_LANGS.has(raw.lang as SupportedLang))
    errs.push(`${path}.lang must be one of ${[...SUPPORTED_LANGS].join('|')}`);
  if (typeof raw.source !== 'string' || raw.source.trim() === '')
    errs.push(`${path}.source required`);
  return errs;
}

function isMetaArray(v: unknown): v is MetaItem[] {
  return Array.isArray(v) && v.every((m) => isObj(m) && typeof m.value === 'string');
}

function requireString(errs: string[], here: string, field: string, value: unknown): void {
  if (typeof value !== 'string' || value.trim() === '')
    errs.push(`${here}.${field} required`);
}

function isObj(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}
