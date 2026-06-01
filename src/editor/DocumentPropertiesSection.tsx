import { useEffect, useRef, useState } from 'react';
import {
  applyDocImageStyle,
  clearDocImageSelection,
  createDocLink,
  deleteSelectedDocCodeBlock,
  deleteSelectedDocImage,
  execDocCommand,
  getDocImageState,
  getDocSelectionState,
  getDocWatermark,
  getSelectedDocCodeBlock,
  insertDocChecklist,
  insertDocCodeBlock,
  insertDocImage,
  setDocWatermark,
  wrapSelectionStyle,
  type DocImageState,
  type DocSelectionState,
} from '../canvas/documentEditingBridge';
import { DOC_SELECTION_EVENT } from '../canvas/useDocumentEditing';
import { useResourceStore } from '../scene/resourceStore';
import { WATERMARK_DEFAULT_LINES } from '../watermark/watermark';
import { buildCodeBlockHtml, CODE_BLOCK_DEFAULT_SOURCE } from './codeBlockHtml';
import { CodeBlockEditPanel } from './CodeBlockEditPanel';
import { FONT_GROUPS, loadGoogleFont } from './fontList';
import { WatermarkControls } from './WatermarkControls';

// Rich-text controls for flowing-document (DocumentCanvas) editing. Everything
// drives the iframe's own contenteditable via execCommand / range wrapping
// (see documentEditingBridge). Overlay free-positioning (X/Y/W/H) is omitted —
// it has no meaning in a scrolling document.
//
// Buttons call preventDefault on mousedown so focus never leaves the iframe;
// otherwise the selection would collapse before the command runs.

const FONT_SIZES = [12, 14, 16, 18, 20, 24, 28, 32, 40, 48];

const MIN_WIDTH = 320;
const MAX_WIDTH = 4000;

const IMG_ALIGN_LABEL = { left: '좌', center: '중', right: '우' } as const;
const IMG_ALIGN_TITLE = { left: '왼쪽 정렬', center: '가운데 정렬', right: '오른쪽 정렬' } as const;

export function DocumentPropertiesSection() {
  const resource = useResourceStore((s) => s.resource);
  const docWidth = useResourceStore((s) => s.docWidth);
  const setDocWidth = useResourceStore((s) => s.setDocWidth);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const [sel, setSel] = useState<DocSelectionState>({
    hasSelection: false,
    bold: false,
    italic: false,
    underline: false,
    strike: false,
  });
  const [wmEnabled, setWmEnabled] = useState(false);
  const [wmText, setWmText] = useState(WATERMARK_DEFAULT_LINES.join('\n'));
  // True once the user edits the watermark textarea, so live-state syncing
  // stops overwriting what they're typing.
  const wmTextDirty = useRef(false);
  const [img, setImg] = useState<DocImageState>({
    selected: false,
    width: 0,
    height: 0,
    align: 'none',
    marginTop: 0,
    marginBottom: 0,
  });
  // data-block-id of the currently selected code block (null = none). Doubles as
  // the CodeBlockEditPanel seedKey so it re-seeds when the selection changes.
  const [codeBlockId, setCodeBlockId] = useState<string | null>(null);

  useEffect(() => {
    const sync = () => {
      setSel(getDocSelectionState());
      setImg(getDocImageState());
      setCodeBlockId(getSelectedDocCodeBlock()?.getAttribute('data-block-id') ?? null);
      // Keep the checkbox honest with the live document (handles the iframe not
      // being ready at first mount, and baked-in watermarks). Don't clobber the
      // textarea once the user has started editing it.
      const wm = getDocWatermark();
      setWmEnabled(wm.enabled);
      if (!wmTextDirty.current && wm.enabled) setWmText(wm.lines.join('\n'));
    };
    window.addEventListener(DOC_SELECTION_EVENT, sync);
    return () => window.removeEventListener(DOC_SELECTION_EVENT, sync);
  }, []);

  // Seed watermark controls from the live document when it (re)opens.
  useEffect(() => {
    wmTextDirty.current = false;
    const wm = getDocWatermark();
    setWmEnabled(wm.enabled);
    if (wm.enabled) setWmText(wm.lines.join('\n'));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resource?.id]);

  const wmLines = () => wmText.split('\n').map((l) => l.trim()).filter(Boolean);
  const applyWatermark = (enabled: boolean) => {
    setWmEnabled(enabled);
    setDocWatermark(enabled, wmLines());
  };

  const run = (command: string, value?: string) => {
    execDocCommand(command, value);
    setSel(getDocSelectionState());
  };

  const onImagePicked = async (files: FileList | null) => {
    const file = files?.[0];
    if (!file) return;
    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => reject(reader.error ?? new Error('read failed'));
        reader.readAsDataURL(file);
      });
      insertDocImage(dataUrl);
    } finally {
      if (imageInputRef.current) imageInputRef.current.value = '';
    }
  };

  if (!resource) return null;

  return (
    <div className="space-y-4">
      {img.selected ? (
        <Group label="Image (선택됨)">
          <div className="grid grid-cols-2 gap-1">
            <label className="flex items-center gap-1 rounded border border-editor-border bg-editor-bg px-1.5 py-1 text-xs">
              <span className="w-3 font-mono text-editor-dim">W</span>
              <input
                type="number"
                min={10}
                value={img.width || ''}
                onFocus={(e) => e.target.select()}
                onChange={(e) => {
                  const n = Number(e.target.value);
                  applyDocImageStyle({ width: Number.isFinite(n) && n > 0 ? n : null });
                  setImg(getDocImageState());
                }}
                className="w-full bg-transparent text-editor-text outline-none"
              />
            </label>
            <label className="flex items-center gap-1 rounded border border-editor-border bg-editor-bg px-1.5 py-1 text-xs">
              <span className="w-3 font-mono text-editor-dim">H</span>
              <input
                type="number"
                min={10}
                value={img.height || ''}
                onFocus={(e) => e.target.select()}
                onChange={(e) => {
                  const n = Number(e.target.value);
                  applyDocImageStyle({ height: Number.isFinite(n) && n > 0 ? n : null });
                  setImg(getDocImageState());
                }}
                className="w-full bg-transparent text-editor-text outline-none"
              />
            </label>
          </div>
          <div className="mt-1 grid grid-cols-2 gap-1">
            <label className="flex items-center gap-1 rounded border border-editor-border bg-editor-bg px-1.5 py-1 text-xs" title="위 여백 (0이면 위 간격 제거)">
              <span className="font-mono text-editor-dim">↑여백</span>
              <input
                type="number"
                value={img.marginTop}
                onFocus={(e) => e.target.select()}
                onChange={(e) => {
                  const n = Number(e.target.value);
                  applyDocImageStyle({ marginTop: Number.isFinite(n) ? n : null });
                  setImg(getDocImageState());
                }}
                className="w-full bg-transparent text-editor-text outline-none"
              />
            </label>
            <label className="flex items-center gap-1 rounded border border-editor-border bg-editor-bg px-1.5 py-1 text-xs" title="아래 여백 (0이면 아래 간격 제거)">
              <span className="font-mono text-editor-dim">↓여백</span>
              <input
                type="number"
                value={img.marginBottom}
                onFocus={(e) => e.target.select()}
                onChange={(e) => {
                  const n = Number(e.target.value);
                  applyDocImageStyle({ marginBottom: Number.isFinite(n) ? n : null });
                  setImg(getDocImageState());
                }}
                className="w-full bg-transparent text-editor-text outline-none"
              />
            </label>
          </div>
          <div className="mt-1 grid grid-cols-3 gap-1">
            {(['left', 'center', 'right'] as const).map((align) => (
              <Btn
                key={align}
                active={img.align === align}
                onRun={() => {
                  applyDocImageStyle({ align });
                  setImg(getDocImageState());
                }}
                label={IMG_ALIGN_LABEL[align]}
                title={IMG_ALIGN_TITLE[align]}
              />
            ))}
          </div>
          <div className="mt-1 flex items-center gap-2">
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => { applyDocImageStyle({ width: null, height: null }); setImg(getDocImageState()); }}
              className="rounded border border-editor-border px-2 py-1 text-[11px] text-editor-dim transition hover:border-editor-accent hover:text-editor-accent"
            >
              크기 초기화
            </button>
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => { clearDocImageSelection(); setImg(getDocImageState()); }}
              className="rounded border border-editor-border px-2 py-1 text-[11px] text-editor-dim transition hover:border-editor-accent hover:text-editor-accent"
            >
              선택 해제
            </button>
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => { deleteSelectedDocImage(); setImg(getDocImageState()); }}
              className="ml-auto rounded border border-red-500/40 px-2 py-1 text-[11px] text-red-300 transition hover:border-red-500 hover:bg-red-500/10"
            >
              삭제
            </button>
          </div>
          <p className="mt-1 text-[10px] text-editor-dim">
            W만 입력하면 비율 유지(H 비움). ↑/↓여백을 0으로 하면 위/아래 간격이 닫힙니다(키로 못 지우는
            CSS 여백). 캔버스에서 이미지를 클릭해 선택합니다.
          </p>
        </Group>
      ) : null}

      {codeBlockId ? (
        <Group label="Code (선택됨)">
          {/* Same editor component the slide deck uses — resolves the selected
              iframe code block. */}
          <CodeBlockEditPanel getEl={() => getSelectedDocCodeBlock()} seedKey={codeBlockId} />
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => { deleteSelectedDocCodeBlock(); setCodeBlockId(null); }}
            className="mt-2 w-full rounded border border-red-500/40 px-2 py-1.5 text-[11px] text-red-300 transition hover:border-red-500 hover:bg-red-500/10"
          >
            코드 블록 삭제
          </button>
        </Group>
      ) : null}

      <Group label="Width (문서 폭)">
        <div className="flex items-center gap-2">
          <input
            type="number"
            min={MIN_WIDTH}
            max={MAX_WIDTH}
            step={10}
            value={docWidth ?? ''}
            placeholder="auto"
            onFocus={(e) => e.target.select()}
            onChange={(e) => {
              const n = Number(e.target.value);
              if (Number.isFinite(n) && n > 0) {
                setDocWidth(Math.max(MIN_WIDTH, Math.min(n, MAX_WIDTH)));
              }
            }}
            className="w-20 rounded border border-editor-border bg-editor-bg px-2 py-1 text-xs text-editor-text outline-none"
          />
          <span className="text-[11px] text-editor-dim">px</span>
          <span className="ml-auto text-[10px] text-editor-dim">캔버스 핸들 드래그로도 조절</span>
        </div>
      </Group>

      <Group label="Text">
        <div className="grid grid-cols-4 gap-1">
          <Btn active={sel.bold} onRun={() => run('bold')} label="B" bold title="굵게 (Bold)" />
          <Btn active={sel.italic} onRun={() => run('italic')} label="I" italic title="기울임 (Italic)" />
          <Btn active={sel.underline} onRun={() => run('underline')} label="U" underline title="밑줄 (Underline)" />
          <Btn active={sel.strike} onRun={() => run('strikeThrough')} label="S" strike title="취소선 (Strikethrough)" />
        </div>
      </Group>

      <Group label="Font">
        <div className="grid grid-cols-2 gap-1">
          <select
            defaultValue=""
            title="글자 크기"
            onMouseDown={(e) => e.stopPropagation()}
            onChange={(e) => {
              if (e.target.value) wrapSelectionStyle('font-size', `${e.target.value}px`);
              e.target.value = '';
            }}
            className="rounded border border-editor-border bg-editor-bg px-1 py-1 text-[11px] text-editor-text outline-none"
          >
            <option value="">크기…</option>
            {FONT_SIZES.map((s) => (
              <option key={s} value={s}>
                {s}px
              </option>
            ))}
          </select>
          {/* Reuses the shared FONT_GROUPS list (same as the deck's
              BlockFormatPanel) — value encodes `${cssStack}||${google}`. */}
          <select
            defaultValue=""
            title="폰트 패밀리"
            onChange={(e) => {
              const v = e.target.value;
              if (v) {
                const [stack, google] = v.split('||');
                if (google) loadGoogleFont(google);
                run('fontName', stack);
              }
              e.target.value = '';
            }}
            className="rounded border border-editor-border bg-editor-bg px-1 py-1 text-[11px] text-editor-text outline-none"
          >
            <option value="">폰트…</option>
            {FONT_GROUPS.map((g) => (
              <optgroup key={g.label} label={g.label}>
                {g.entries.map((f) => {
                  const v = `${f.cssStack}||${f.google ?? ''}`;
                  return (
                    <option key={v} value={v}>
                      {f.name}
                    </option>
                  );
                })}
              </optgroup>
            ))}
          </select>
        </div>
      </Group>

      <Group label="Block (단락/제목)">
        <div className="grid grid-cols-5 gap-1">
          <Btn onRun={() => run('formatBlock', 'p')} label="P" title="본문 문단 (p)" />
          <Btn onRun={() => run('formatBlock', 'h1')} label="H1" title="제목 1" />
          <Btn onRun={() => run('formatBlock', 'h2')} label="H2" title="제목 2" />
          <Btn onRun={() => run('formatBlock', 'h3')} label="H3" title="제목 3" />
          <Btn onRun={() => run('formatBlock', 'h4')} label="H4" title="제목 4" />
        </div>
      </Group>

      <Group label="Insert">
        <div className="grid grid-cols-3 gap-1">
          <Btn
            onRun={() => {
              const url = window.prompt('링크 URL을 입력하세요', 'https://');
              if (url && url.trim()) createDocLink(url.trim());
            }}
            label="🔗 링크"
            title="링크 삽입 (선택한 텍스트에 적용)"
          />
          <Btn
            onRun={() => imageInputRef.current?.click()}
            label="🖼 이미지"
            title="이미지 업로드 (커서 위치에 삽입)"
            noPreventDefault
          />
          <Btn
            onRun={async () => {
              // Same shiki code block as the slide deck (macOS dots + syntax).
              const html = await buildCodeBlockHtml(CODE_BLOCK_DEFAULT_SOURCE, 'typescript');
              insertDocCodeBlock(html);
            }}
            label="</> 코드"
            title="코드 블록 (슬라이드와 동일 · 선택 후 우측에서 언어/소스 편집)"
          />
          <Btn onRun={() => run('formatBlock', 'blockquote')} label="❝ 인용" title="인용구 (blockquote)" />
          <Btn onRun={() => run('insertHorizontalRule')} label="― 구분선" title="구분선 삽입 (hr)" />
        </div>
        <input
          ref={imageInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => void onImagePicked(e.target.files)}
        />
      </Group>

      <Group label="List & Align">
        <div className="grid grid-cols-3 gap-1">
          <Btn onRun={() => run('insertUnorderedList')} label="• 목록" title="글머리 기호 목록" />
          <Btn onRun={() => run('insertOrderedList')} label="1. 목록" title="번호 매기기 목록" />
          <Btn
            onRun={() => {
              insertDocChecklist();
              setSel(getDocSelectionState());
            }}
            label="☑ 체크"
            title="체크리스트 (체크하면 텍스트에 취소선)"
          />
          <Btn onRun={() => run('justifyLeft')} label="좌" title="왼쪽 정렬" />
          <Btn onRun={() => run('justifyCenter')} label="중" title="가운데 정렬" />
          <Btn onRun={() => run('justifyRight')} label="우" title="오른쪽 정렬" />
        </div>
      </Group>

      <Group label="Color">
        <div className="flex items-center gap-2">
          {/* No onMouseDown preventDefault here: a color <input> must take focus
              to open the native picker, and blocking mousedown prevents it from
              opening at all. The iframe's selection range survives the focus
              change, and execDocCommand applies to the iframe document's
              selection regardless of where focus currently is. */}
          <label className="flex items-center gap-1 text-[11px] text-editor-dim">
            글자
            <input
              type="color"
              defaultValue="#1f2328"
              onChange={(e) => run('foreColor', e.target.value)}
              className="h-6 w-8 cursor-pointer rounded border border-editor-border bg-transparent"
            />
          </label>
          <label className="flex items-center gap-1 text-[11px] text-editor-dim">
            배경
            <input
              type="color"
              defaultValue="#fff3a3"
              onChange={(e) => run('hiliteColor', e.target.value)}
              className="h-6 w-8 cursor-pointer rounded border border-editor-border bg-transparent"
            />
          </label>
          <button
            type="button"
            title="서식 지우기"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => run('removeFormat')}
            className="ml-auto rounded border border-editor-border px-2 py-1 text-[11px] text-editor-dim transition hover:border-editor-accent hover:text-editor-accent"
          >
            서식 지우기
          </button>
        </div>
      </Group>

      <Group label="Watermark (워터마크)">
        <WatermarkControls
          enabled={wmEnabled}
          text={wmText}
          toggleLabel="워터마크 표시"
          onToggle={applyWatermark}
          onTextChange={(next) => {
            wmTextDirty.current = true;
            setWmText(next);
          }}
          onTextBlur={() => {
            if (wmEnabled) setDocWatermark(true, wmLines());
          }}
          onApply={() => setDocWatermark(true, wmLines())}
        />
      </Group>

      <p className="text-[10px] leading-relaxed text-editor-dim">
        본문을 클릭해 직접 편집하세요. 텍스트를 선택한 뒤 서식을 적용합니다. 이미지·구분선은 커서
        위치에 삽입됩니다. 변경은 자동 저장됩니다.
      </p>
    </div>
  );
}

function Group({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-editor-dim">
        {label}
      </div>
      {children}
    </div>
  );
}

function Btn({
  label,
  onRun,
  active,
  bold,
  italic,
  underline,
  strike,
  title,
  noPreventDefault,
}: {
  label: string;
  onRun: () => void;
  active?: boolean;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  strike?: boolean;
  title?: string;
  // Image picker needs a real focus change to open the file dialog, so it opts
  // out of mousedown preventDefault.
  noPreventDefault?: boolean;
}) {
  return (
    <button
      type="button"
      title={title}
      onMouseDown={noPreventDefault ? undefined : (e) => e.preventDefault()}
      onClick={onRun}
      className={`rounded border px-1 py-1.5 text-[11px] transition ${
        active
          ? 'border-editor-accent bg-editor-accent/10 text-editor-accent'
          : 'border-editor-border text-editor-text hover:border-editor-accent hover:bg-editor-accent/10'
      } ${bold ? 'font-bold' : ''} ${italic ? 'italic' : ''} ${underline ? 'underline' : ''} ${
        strike ? 'line-through' : ''
      }`}
    >
      {label}
    </button>
  );
}
