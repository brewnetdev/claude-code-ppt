import { useEffect, useState } from 'react';

// Tiny event-bus toast. We dispatch on `window` so the call site doesn't need
// to be a React component (e.g., useSlideEditing can fire from a keydown
// listener), and the host component subscribes and renders.

type ToastTone = 'info' | 'warn' | 'error';

type ToastEventDetail = {
  message: string;
  tone?: ToastTone;
  durationMs?: number;
};

type ActiveToast = ToastEventDetail & { id: number };

const EVENT_NAME = 'cc-ppt:toast';

let seq = 0;

export function showToast(detail: ToastEventDetail): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent<ToastEventDetail>(EVENT_NAME, { detail }));
}

const TONE_CLASS: Record<ToastTone, string> = {
  info: 'border-2 border-blue-500 bg-slate-900 text-white',
  warn: 'border-2 border-orange-500 bg-slate-900 text-white',
  error: 'border-2 border-red-500 bg-slate-900 text-white',
};

export function ToastHost() {
  const [toasts, setToasts] = useState<ActiveToast[]>([]);

  useEffect(() => {
    const onToast = (ev: Event) => {
      const detail = (ev as CustomEvent<ToastEventDetail>).detail;
      if (!detail?.message) return;
      const id = ++seq;
      const duration = detail.durationMs ?? 3500;
      setToasts((current) => {
        // Coalesce identical messages currently on screen — typing inside a
        // code block fires keydown rapidly, and we'd otherwise paint a stack
        // of duplicate banners.
        if (current.some((t) => t.message === detail.message)) return current;
        return [...current, { ...detail, id }];
      });
      window.setTimeout(() => {
        setToasts((current) => current.filter((t) => t.id !== id));
      }, duration);
    };
    window.addEventListener(EVENT_NAME, onToast);
    return () => window.removeEventListener(EVENT_NAME, onToast);
  }, []);

  if (toasts.length === 0) return null;

  return (
    <div className="pointer-events-none fixed right-4 top-14 z-[2100] flex flex-col items-end gap-2">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`pointer-events-auto rounded-md border px-4 py-2 text-xs leading-relaxed shadow-2xl ${
            TONE_CLASS[t.tone ?? 'info']
          }`}
        >
          {t.message}
        </div>
      ))}
    </div>
  );
}
