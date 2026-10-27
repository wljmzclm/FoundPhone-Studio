import type { Work } from "../schema";
import "./introduction.css";

const chapterNames = [
  "第一章",
  "第二章",
  "第三章",
  "第四章",
  "第五章",
  "第六章",
];
export function Introduction({
  work,
  onStart,
}: {
  work: Work;
  onStart: () => void;
}) {
  const info = work.phone.introduction;
  if (!info) return null;
  return (
    <div className="story-introduction">
      <div className="introduction-inner">
        <header className="introduction-hero">
          <span className="introduction-kicker">橹穆 · 手机里的故事</span>
          <h1>{info.title}</h1>
          <span className="introduction-tagline">♡ {info.tagline}</span>
        </header>
        <section className="introduction-guide" aria-labelledby="guide-title">
          <h2 id="guide-title">玩法说明</h2>
          <p>{info.guide}</p>
          <div className="introduction-note">
            <strong>PS</strong>
            <p>{info.note}</p>
          </div>
        </section>
        <section
          aria-labelledby="chapters-title"
          className="introduction-chapters"
        >
          <div className="introduction-section-heading">
            <h2 id="chapters-title">故事章节</h2>
            <span>共 {info.chapters.length} 章</span>
          </div>
          <div className="introduction-chapter-grid">
            {info.chapters.map((chapter, index) => (
              <button
                key={chapter.title}
                disabled={index !== 0}
                aria-label={`进入${chapterNames[index] || `第${index + 1}章`}：${chapter.title}`}
                onClick={onStart}
                className={index === 0 ? "available" : "upcoming"}
              >
                <span className="introduction-chapter-number">
                  {String(index + 1).padStart(2, "0")}
                  <small>{chapterNames[index]}</small>
                </span>
                <strong>{chapter.title}</strong>
                {chapter.subtitle && (
                  <span className="introduction-chapter-subtitle">
                    {chapter.subtitle}
                  </span>
                )}
                <span className="introduction-chapter-status">
                  {index === 0 ? "进入故事 ↗" : "待开启"}
                </span>
              </button>
            ))}
          </div>
        </section>
        <footer>蓝色与粉色之间，是关于你和我的故事。</footer>
      </div>
    </div>
  );
}
