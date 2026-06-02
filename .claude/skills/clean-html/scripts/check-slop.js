#!/usr/bin/env node

/**
 * check-slop.js — Anti-AI-Slop HTML/CSS linter.
 *
 * Scans an HTML (or CSS) file for the visual "AI slop" patterns banned by
 * docs/guide/FRONTEND-GENERATE-HTML-SKILL.md and reports each hit with a
 * file:line location. Deterministic, dependency-free (Node stdlib only).
 *
 * Usage:
 *   node check-slop.js <file> [<file> ...]
 *
 * Exit codes:
 *   0 — no MUST-NOT violations (warnings may still be printed)
 *   1 — at least one MUST-NOT violation found
 *   2 — bad invocation / file not readable
 *
 * Severities:
 *   ERROR — a MUST-NOT rule from the guide. Fails the run.
 *   WARN  — heuristic; needs human/agent judgement. Does not fail the run.
 */

import fs from 'fs';

const files = process.argv.slice(2).filter((a) => !a.startsWith('--'));
if (files.length === 0) {
  console.error('usage: node check-slop.js <file> [<file> ...]');
  process.exit(2);
}

// ── color helpers ──────────────────────────────────────────────
// A shadow/accent color is "chromatic" (banned) when its RGB channels are
// not roughly equal. Pure grey/black/white shadows are allowed.
function parseColor(tok) {
  tok = tok.trim();
  let m;
  if ((m = tok.match(/^#([0-9a-f]{3})$/i))) {
    const h = m[1];
    return [h[0], h[1], h[2]].map((c) => parseInt(c + c, 16));
  }
  if ((m = tok.match(/^#([0-9a-f]{6})$/i))) {
    const h = m[1];
    return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
  }
  if ((m = tok.match(/^rgba?\(([^)]+)\)$/i))) {
    const parts = m[1].split(/[,\s/]+/).filter(Boolean);
    return parts.slice(0, 3).map((p) => (p.endsWith('%') ? Math.round(parseFloat(p) * 2.55) : parseFloat(p)));
  }
  if ((m = tok.match(/^hsla?\(([^)]+)\)$/i))) {
    const parts = m[1].split(/[,\s/]+/).filter(Boolean);
    const s = parseFloat(parts[1]); // saturation %
    return s > 8 ? [255, 0, 0] : [128, 128, 128]; // chromatic iff saturated
  }
  return null;
}
function isChromatic(tok) {
  const rgb = parseColor(tok);
  if (!rgb) return false;
  const [r, g, b] = rgb;
  return Math.max(r, g, b) - Math.min(r, g, b) > 12;
}
function findColorTokens(value) {
  const out = [];
  const re = /#[0-9a-f]{3,6}\b|rgba?\([^)]*\)|hsla?\([^)]*\)/gi;
  let m;
  while ((m = re.exec(value))) out.push(m[0]);
  return out;
}

// Marketing boilerplate words (whole-word, case-insensitive).
const MARKETING = ['seamlessly', 'seamless', 'elevate', 'unlock', 'empower', 'supercharge', 'effortlessly', 'cutting-edge', 'game-changer', 'revolutionize', 'next-level'];

// Decorative emoji ranges (covers most pictographs; intentionally excludes
// plain symbols already in prose). Reported as WARN since emoji can be content.
const EMOJI_RE = /[☀-➿⬀-⯿\u{1F000}-\u{1FAFF}\u{FE0F}]/u;

const FONT_DEFAULTS = /\b(inter|roboto|arial|system-ui|-apple-system|segoe ui|space grotesk|helvetica neue)\b/i;

let totalErrors = 0;
let totalWarns = 0;

for (const file of files) {
  let text;
  try {
    text = fs.readFileSync(file, 'utf8');
  } catch (e) {
    console.error(`✗ cannot read ${file}: ${e.message}`);
    process.exit(2);
  }
  const lines = text.split(/\r?\n/);
  const findings = []; // { sev, rule, msg, line }

  const add = (sev, rule, msg, lineIdx) => {
    findings.push({ sev, rule, msg, line: lineIdx + 1 });
    if (sev === 'ERROR') totalErrors++;
    else totalWarns++;
  };

  // ── per-line scans ──────────────────────────────────────────
  lines.forEach((line, i) => {
    const low = line.toLowerCase();

    // gradients (incl. repeating)
    if (/\b(repeating-)?(linear|radial|conic)-gradient\s*\(/i.test(line)) {
      add('ERROR', 'gradient', 'gradient 함수 사용 (단색 + border로 대체)', i);
    }

    // gradient text
    if (/background-clip\s*:\s*text/i.test(low) || (/-webkit-text-fill-color\s*:\s*transparent/i.test(low))) {
      add('ERROR', 'gradient-text', 'background-clip:text / 투명 텍스트 채움 (그라데이션 텍스트)', i);
    }

    // glassmorphism
    if (/backdrop-filter\s*:\s*[^;]*blur/i.test(low)) {
      add('ERROR', 'glassmorphism', 'backdrop-filter: blur (글래스모피즘)', i);
    }

    // box-shadow analysis
    const sh = line.match(/box-shadow\s*:\s*([^;]+);?/i);
    if (sh && !/box-shadow\s*:\s*none/i.test(sh[0])) {
      const val = sh[1];
      const colored = findColorTokens(val).some(isChromatic);
      if (colored) add('ERROR', 'colored-shadow', '색이 들어간 box-shadow (글로우)', i);
      const lens = (val.match(/(\d+(?:\.\d+)?)px/g) || []).map((p) => parseFloat(p));
      if (lens.some((n) => n >= 20)) add('ERROR', 'big-shadow', 'blur/offset ≥ 20px 큰 그림자', i);
      if (/inset/i.test(val) && colored) add('ERROR', 'gloss-ring', 'inset 컬러 광택 링', i);
    }

    // top accent bar
    const bt = line.match(/border-top\s*:\s*(\d+(?:\.\d+)?)px\s+solid\s+([^;!]+)/i);
    if (bt && parseFloat(bt[1]) >= 2 && isChromatic(bt[2])) {
      add('ERROR', 'accent-bar', '카드 상단 컬러 액센트 바 (border-top)', i);
    }

    // transition duration > 150ms (functional state changes must be ≤150ms)
    const tr = low.match(/transition[^:]*:\s*([^;]+);?/);
    if (tr) {
      const durs = (tr[1].match(/(\d+(?:\.\d+)?)(ms|s)\b/g) || []).map((d) => {
        const n = parseFloat(d);
        return d.endsWith('ms') ? n : n * 1000;
      });
      if (durs.some((ms) => ms > 150)) add('ERROR', 'slow-transition', 'transition > 150ms', i);
      if (/transition\s*:\s*all\b/i.test(tr[0]) || /\btransform\b/.test(tr[1])) {
        add('WARN', 'transition-scope', 'transition이 all/transform에 적용 — 색·투명도 등 기능적 변화로 한정', i);
      }
    }

    // decorative animation names
    if (/(animation(-name)?\s*:[^;]*\b(pulse|shimmer|float|glow|fade(in|out)?|stagger|bounce|wiggle|spin)\b)/i.test(low)) {
      add('ERROR', 'motion-decor', '장식 모션 (pulse/shimmer/float/glow/fade/…)', i);
    }

    // marketing boilerplate
    for (const w of MARKETING) {
      if (new RegExp('\\b' + w.replace('-', '\\-') + '\\b', 'i').test(line)) {
        add('ERROR', 'marketing', `마케팅 보일러플레이트 단어: "${w}"`, i);
        break;
      }
    }
    // mask fade / dot-grid pattern
    if (/(-webkit-)?mask-image\s*:\s*[^;]*gradient/i.test(low)) {
      add('WARN', 'fade-mask', '페이드 마스크(mask-image gradient) — 콘텐츠 전달 목적인지 확인', i);
    }

    // huge faint watermark text: very large font-size on absolutely placed text
    const fs2 = line.match(/font-size\s*:\s*(\d+(?:\.\d+)?)px/i);
    if (fs2 && parseFloat(fs2[1]) >= 120 && /position\s*:\s*absolute/i.test(low)) {
      add('WARN', 'watermark', `거대 텍스트(${fs2[1]}px) + position:absolute — 배경 워터마크인지 확인`, i);
    }

    // emoji (could be content → WARN)
    if (EMOJI_RE.test(line)) {
      add('WARN', 'emoji', '이모지 사용 — 불릿/장식이면 제거, 의미 전달이면 유지', i);
    }

    // font convergence: first family is a generic default
    const ff = line.match(/font-family\s*:\s*([^;}{]+)/i);
    if (ff) {
      const first = ff[1].split(',')[0].replace(/['"]/g, '').trim();
      if (FONT_DEFAULTS.test(first)) {
        add('WARN', 'font-default', `폰트가 기본값으로 수렴(${first}) — 목적에 맞는 폰트를 의도적으로 선택`, i);
      }
    }
  });

  // ── whole-text scans (multi-line) ───────────────────────────
  // @keyframes (load/decoration animation)
  let km;
  const kmRe = /@(-webkit-)?keyframes\b/gi;
  while ((km = kmRe.exec(text))) {
    const lineNo = text.slice(0, km.index).split(/\r?\n/).length - 1;
    add('ERROR', 'keyframes', '@keyframes (모션 장식)', lineNo);
  }
  // :hover { ... transform: translate/scale ... }
  let hv;
  const hvRe = /:hover[^{}]*\{[^{}]*transform\s*:[^{}]*(translate|scale|rotate|skew)/gi;
  while ((hv = hvRe.exec(text))) {
    const lineNo = text.slice(0, hv.index).split(/\r?\n/).length - 1;
    add('ERROR', 'hover-transform', 'hover 시 transform: translate/scale (모션 장식)', lineNo);
  }

  // ── report ──────────────────────────────────────────────────
  findings.sort((a, b) => a.line - b.line);
  const errs = findings.filter((f) => f.sev === 'ERROR');
  const warns = findings.filter((f) => f.sev === 'WARN');

  console.log(`\n── ${file}`);
  if (findings.length === 0) {
    console.log('  ✓ clean — no AI-slop patterns detected');
  } else {
    for (const f of findings) {
      const tag = f.sev === 'ERROR' ? 'ERROR' : 'warn ';
      console.log(`  ${tag} L${String(f.line).padEnd(4)} [${f.rule}] ${f.msg}`);
    }
    console.log(`  ─ ${errs.length} error(s), ${warns.length} warning(s)`);
  }
}

console.log(`\n총계: ${totalErrors} error(s), ${totalWarns} warning(s) across ${files.length} file(s)`);
if (totalErrors > 0) {
  console.log('→ MUST-NOT 위반이 있습니다. 제거 후 재작성하세요.');
  process.exit(1);
}
process.exit(0);
