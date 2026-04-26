import { useEffect, useRef, useState } from 'react';
import { ColorSwatchButton } from './ColorPicker';
import { useDeckStore } from '../scene/store';

const MAX_IMAGE_BYTES = 4 * 1024 * 1024;

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error ?? new Error('FileReader failed'));
    reader.readAsDataURL(file);
  });
}

// Slide-level background controls. Lives in the PropertiesPanel default
// landing view (no block / no overlay selected) — the canvas itself is the
// "selected target" then.
export function SlideBackgroundSection() {
  const slideId = useDeckStore((s) => s.slides[s.currentIndex]?.id ?? null);
  const background = useDeckStore(
    (s) => s.slides[s.currentIndex]?.background ?? null,
  );
  const setSlideBackground = useDeckStore((s) => s.setSlideBackground);

  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Clear stale error when the slide changes — the message belonged to the
  // previous slide and only confuses the user on the new one.
  useEffect(() => setError(null), [slideId]);

  if (!slideId) return null;

  const colorValue = background?.kind === 'color' ? background.value : null;
  const imageInfo = background?.kind === 'image' ? background : null;

  const setColor = (hex: string | null) => {
    setError(null);
    if (!hex) {
      setSlideBackground(slideId, null);
      return;
    }
    setSlideBackground(slideId, { kind: 'color', value: hex });
  };

  const setImageFile = async (file: File) => {
    setError(null);
    if (!file.type.startsWith('image/')) {
      setError('이미지 파일만 사용할 수 있습니다.');
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      setError(`이미지는 ${Math.floor(MAX_IMAGE_BYTES / 1024 / 1024)}MB 이하여야 합니다.`);
      return;
    }
    try {
      const dataUrl = await readFileAsDataUrl(file);
      // Preserve fit if the user already had an image bg; default to cover.
      const fit = imageInfo?.fit ?? 'cover';
      setSlideBackground(slideId, { kind: 'image', src: dataUrl, fit });
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  const setImageFit = (fit: 'cover' | 'contain') => {
    if (!imageInfo) return;
    setSlideBackground(slideId, { ...imageInfo, fit });
  };

  const reset = () => {
    setError(null);
    setSlideBackground(slideId, null);
  };

  return (
    <div className="rounded border border-editor-border bg-editor-bg/40 p-3">
      <div className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-editor-dim">
        Slide Background
      </div>

      <div className="mb-2">
        <div className="mb-1 text-[10px] uppercase tracking-wider text-editor-dim">Color</div>
        <ColorSwatchButton
          value={colorValue}
          onChange={setColor}
          label="Slide background color"
          allowNone
        />
      </div>

      <div
        className={`mb-2 rounded border border-dashed px-2 py-3 text-center text-[11px] transition ${
          dragOver
            ? 'border-editor-accent bg-editor-accent/10 text-editor-text'
            : 'border-editor-border text-editor-dim'
        }`}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          const file = e.dataTransfer.files?.[0];
          if (file) void setImageFile(file);
        }}
        onClick={() => fileInputRef.current?.click()}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            fileInputRef.current?.click();
          }
        }}
      >
        {imageInfo ? (
          <div className="flex items-center gap-2">
            <div
              className="h-10 w-16 shrink-0 rounded border border-editor-border bg-cover bg-center"
              style={{ backgroundImage: `url("${imageInfo.src}")` }}
            />
            <div className="flex-1 truncate text-left text-editor-text">이미지 설정됨</div>
          </div>
        ) : (
          <span>이미지 드롭하거나 클릭해서 업로드</span>
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void setImageFile(file);
            // Reset so picking the same file again still re-fires onChange.
            e.target.value = '';
          }}
        />
      </div>

      {imageInfo ? (
        <div className="mb-2 grid grid-cols-2 gap-1.5">
          {(['cover', 'contain'] as const).map((fit) => {
            const active = imageInfo.fit === fit;
            return (
              <button
                key={fit}
                type="button"
                onClick={() => setImageFit(fit)}
                className={`rounded border px-2 py-1 text-[11px] transition ${
                  active
                    ? 'border-editor-accent bg-editor-accent/10 text-editor-text'
                    : 'border-editor-border text-editor-dim hover:border-editor-accent hover:text-editor-text'
                }`}
              >
                {fit}
              </button>
            );
          })}
        </div>
      ) : null}

      {error ? (
        <div className="mb-2 rounded border border-red-500/40 bg-red-500/10 px-2 py-1 text-[11px] text-red-300">
          {error}
        </div>
      ) : null}

      {background ? (
        <button
          type="button"
          onClick={reset}
          className="w-full rounded border border-editor-border px-2 py-1 text-[11px] text-editor-dim transition hover:border-editor-accent hover:text-editor-accent"
        >
          배경 제거
        </button>
      ) : null}
    </div>
  );
}
