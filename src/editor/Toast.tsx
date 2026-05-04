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
  info: 'border-editor-accent/50 bg-editor-accent/10 text-editor-text',
  warn: 'border-amber-500/50 bg-amber-500/10 text-amber-200',
  error: 'border-red-500/50 bg-red-500/10 text-red-200',
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
    <div className="pointer-events-none fixed bottom-6 left-1/2 z-[1000] flex -translate-x-1/2 flex-col items-center gap-2">
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
