import { useState } from "react";
import type { Props } from "./shared";
import { Header } from "./shared";
import { DouyinStory } from "./DouyinStory";

export function DouyinLinks({ p }: { p: Props }) {
  const [history, setHistory] = useState(false);
  const story = p.items.find((i) => i.meta.view === "sms-story");
  const videos = p.items.filter((i) =>
    /^https:\/\/v\.douyin\.com\/[A-Za-z0-9_-]+\/$/.test(i.meta.douyinUrl || ""),
  );
  if (history && story)
    return (
      <DouyinStory p={{ ...p, onBack: () => setHistory(false) }} item={story} />
    );
  return (
    <div className="catalog-skin douyin-link-feed">
      <Header p={p} />
      <div className="douyin-link-scroll">
        {videos.map((item, index) => (
          <article key={item.id}>
            <span className="douyin-link-number">
              {index + 1} / {videos.length}
            </span>
            <div className="douyin-link-symbol" aria-hidden="true">
              ♪
            </div>
            <strong>@{item.sender}</strong>
            <p>{item.body}</p>
            <a
              href={item.meta.douyinUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              打开抖音观看 ↗
            </a>
            <small>此视频通过原链接在抖音中播放</small>
          </article>
        ))}
      </div>
      {story && (
        <button
          className="douyin-link-history"
          onClick={() => setHistory(true)}
        >
          查看剧情图文
        </button>
      )}
    </div>
  );
}
