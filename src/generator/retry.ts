import type { BlockifyHint } from './blockify';
import { generateOnce, type GenerateInput, type GenerateOutput } from './pipeline';
import type { RubricItemScore } from './quality/rubric';

export type RetryResult = GenerateOutput & {
  attempts: number;
  hintsApplied: BlockifyHint[];
};

const MAX_ATTEMPTS = 3;

// Map a missing/low-scoring rubric item to an adapter hint that might
// rescue it. This is intentionally conservative — most failures should
// be fixed by the first hint, not by accidentally pancaking the deck.
function hintForMissed(items: RubricItemScore[]): BlockifyHint | null {
  const low = items.find((i) => i.presentInMd && (i.score ?? 0) < 7);
  if (!low) return null;
  if (low.id === 'h2' && (low.score ?? 0) < 7) {
    // Symptom: too few slides have a title. Likely cause: H1 used as
    // chapter heading (디자인패턴.md case). Splitting on every H1 surfaces
    // each chapter as its own titled slide.
    return { splitOnEveryH1: true };
  }
  if (low.id === 'text' && (low.score ?? 0) < 7) {
    // Symptom: prose got dropped. Cause: over-aggressive H3 splits broke
    // a section across many tiny slides and the scorer's probe missed.
    return { relaxH3: true };
  }
  return null;
}

function mergeHint(a: BlockifyHint | undefined, b: BlockifyHint | null): BlockifyHint | undefined {
  if (!b) return a;
  return { ...(a ?? {}), ...b };
}

export async function generateWithRetry(input: GenerateInput): Promise<RetryResult> {
  const hintsApplied: BlockifyHint[] = [];
  let hint = input.hint;
  let last: GenerateOutput | null = null;
  let lastAttempt = 0;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    lastAttempt = attempt;
    const out = await generateOnce({ ...input, hint });
    last = out;
    if (out.score.passed) {
      return { ...out, attempts: attempt, hintsApplied };
    }
    const next = hintForMissed(out.score.items);
    if (!next) break; // No actionable hint — stop retrying.
    hintsApplied.push(next);
    hint = mergeHint(hint, next);
  }
  return { ...(last as GenerateOutput), attempts: lastAttempt, hintsApplied };
}
