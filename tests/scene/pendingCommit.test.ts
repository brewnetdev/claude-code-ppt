import { afterEach, describe, expect, it, vi } from 'vitest';
import { registerPendingFlush, flushPendingCommit } from '../../src/scene/pendingCommit';

// Registrations live in a module-level Set; clean up after each test.
const cleanups: Array<() => void> = [];
afterEach(() => {
  while (cleanups.length) cleanups.pop()!();
});
function reg(fn: () => void) {
  const off = registerPendingFlush(fn);
  cleanups.push(off);
  return off;
}

describe('pendingCommit — multi-register flush (M1)', () => {
  it('flushes every registered fn so slide AND overlay both drain', () => {
    const slide = vi.fn();
    const overlay = vi.fn();
    reg(slide);
    reg(overlay);
    flushPendingCommit();
    expect(slide).toHaveBeenCalledTimes(1);
    expect(overlay).toHaveBeenCalledTimes(1);
  });

  it('a second register does not evict the first (the single-slot bug)', () => {
    const first = vi.fn();
    reg(first);
    reg(vi.fn());
    flushPendingCommit();
    expect(first).toHaveBeenCalled();
  });

  it('unregister removes only that fn', () => {
    const a = vi.fn();
    const b = vi.fn();
    const offA = registerPendingFlush(a);
    cleanups.push(offA);
    reg(b);
    offA();
    flushPendingCommit();
    expect(a).not.toHaveBeenCalled();
    expect(b).toHaveBeenCalledTimes(1);
  });

  it('a flush that unregisters itself mid-iteration is safe (snapshot)', () => {
    const a = vi.fn();
    let offSelf: () => void = () => {};
    const self = vi.fn(() => offSelf());
    offSelf = registerPendingFlush(self);
    cleanups.push(offSelf);
    reg(a);
    expect(() => flushPendingCommit()).not.toThrow();
    expect(self).toHaveBeenCalledTimes(1);
    expect(a).toHaveBeenCalledTimes(1);
  });
});
