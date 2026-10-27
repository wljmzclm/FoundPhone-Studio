import type { Runtime, Work, UiValue } from "./schema";

export function ChapterEntry({
  work,
  state,
  onChange,
}: {
  work: Work;
  state: Runtime;
  onChange: (values: Record<string, UiValue>) => void;
}) {
  const chapter = work.phone.chapterTransition;
  if (
    !chapter ||
    !state.endings.length ||
    state.ui?.phone?.dismissedEndings !== state.endings.length ||
    !chapter.requiredApps.every((id) => state.visited.includes(id))
  )
    return null;
  const ui = state.ui?.phone;
  if (ui?.chapterPreviewOpen === true)
    return (
      <div
        className="story-overlay chapter-preview"
        role="dialog"
        aria-label={chapter.nextTitle}
      >
        <span className="eyebrow">{chapter.currentTitle}已完成</span>
        <h2>{chapter.nextTitle}</h2>
        <p>敬请期待</p>
        <button
          onClick={() =>
            onChange({ chapterPreviewOpen: false, chapterEntryDeferred: true })
          }
        >
          返回{chapter.currentTitle}
        </button>
      </div>
    );
  if (ui?.chapterEntryDeferred === true)
    return (
      <button
        className="chapter-entry-button"
        onClick={() => onChange({ chapterEntryDeferred: false })}
      >
        章节 · 进入{chapter.nextTitle}
      </button>
    );
  return (
    <div
      className="story-overlay chapter-entry"
      role="dialog"
      aria-label="章节选择"
    >
      <span className="eyebrow">{chapter.currentTitle}已完成</span>
      <h2>准备好继续了吗？</h2>
      <p>你已探索过所有可用应用。</p>
      <button onClick={() => onChange({ chapterPreviewOpen: true })}>
        进入{chapter.nextTitle}
      </button>
      <button onClick={() => onChange({ chapterEntryDeferred: true })}>
        继续探索{chapter.currentTitle}
      </button>
    </div>
  );
}
