import { useEffect, useRef, useState } from "react";
import { safeMedia, type Item } from "../schema";
import type { Props } from "./shared";
import { Header } from "./shared";
import { DouyinStory } from "./DouyinStory";

function UploadedVideo({ item }: { item: Item }) {
  const element = useRef<HTMLVideoElement>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    const video = element.current;
    if (!video) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.intersectionRatio < 0.5) video.pause();
      },
      { root: video.closest(".douyin-link-scroll"), threshold: [0, 0.5] },
    );
    observer.observe(video);
    return () => {
      observer.disconnect();
      video.pause();
    };
  }, []);
  return (
    <>
      <video
        ref={element}
        controls
        playsInline
        preload="metadata"
        aria-label={`播放${item.sender}的视频`}
        src={safeMedia(item.media)}
        poster={safeMedia(item.meta.poster || "")}
        onError={() => setFailed(true)}
        onPlay={() => {
          element.current
            ?.closest(".douyin-link-scroll")
            ?.querySelectorAll("video")
            .forEach((video) => {
              if (video !== element.current) video.pause();
            });
        }}
      />
      {failed && (
        <small role="status">视频加载失败，可尝试刷新或打开原视频。</small>
      )}
    </>
  );
}

export function DouyinLinks({ p }: { p: Props }) {
  const [history, setHistory] = useState(false);
  const story = p.items.find((i) => i.meta.view === "sms-story");
  const videos = p.items.filter(
    (i) =>
      (i.kind === "video" && !!safeMedia(i.media)) ||
      /^https:\/\/v\.douyin\.com\/[A-Za-z0-9_-]+\/$/.test(
        i.meta.douyinUrl || "",
      ),
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
            {item.kind === "video" && safeMedia(item.media) ? (
              <UploadedVideo item={item} />
            ) : (
              <div className="douyin-link-symbol" aria-hidden="true">
                ♪
              </div>
            )}
            <strong>@{item.sender}</strong>
            <p>{item.body}</p>
            {/^https:\/\/v\.douyin\.com\/[A-Za-z0-9_-]+\/$/.test(
              item.meta.douyinUrl || "",
            ) && (
              <a
                href={item.meta.douyinUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                {item.media ? "在抖音查看原视频 ↗" : "打开抖音观看 ↗"}
              </a>
            )}
            {!item.media && <small>此视频通过原链接在抖音中播放</small>}
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
