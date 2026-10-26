import { useState } from "react";
import { safeMedia, type Item } from "../schema";
import "./story-gallery.css";
export function StoryGallery({
  item,
  interactive = false,
}: {
  item: Item;
  interactive?: boolean;
}) {
  const [opened, setOpened] = useState("");
  let urls: string[] = [];
  try {
    const parsed: unknown = JSON.parse(item.meta.gallery || "[]");
    if (Array.isArray(parsed))
      urls = parsed
        .filter((v): v is string => typeof v === "string" && !!safeMedia(v))
        .map((v) => safeMedia(v));
  } catch {
    /* A missing gallery falls back to the primary image. */
  }
  if (!urls.length && safeMedia(item.media)) urls = [safeMedia(item.media)];
  const top = Number(item.meta.mediaCropTop),
    height = Number(item.meta.mediaCropHeight),
    sourceWidth = Number(item.meta.mediaSourceWidth),
    sourceHeight = Number(item.meta.mediaSourceHeight);
  const crop =
    [top, height, sourceWidth, sourceHeight].every(Number.isFinite) &&
    top >= 0 &&
    height > 0 &&
    sourceWidth > 0 &&
    sourceHeight >= top + height;
  const content = (
    <span
      className={
        "story-gallery " + (urls.length > 1 ? "story-gallery-grid" : "")
      }
    >
      {urls.map((url, index) => (
        <span
          key={url}
          className={crop ? "story-gallery-crop" : "story-gallery-photo"}
          style={
            crop ? { aspectRatio: `${sourceWidth} / ${height}` } : undefined
          }
        >
          <img
            loading="lazy"
            src={url}
            alt={item.sender + "微博配图" + (index + 1)}
            style={
              crop
                ? { transform: `translateY(-${(top / sourceHeight) * 100}%)` }
                : undefined
            }
          />
        </span>
      ))}
    </span>
  );
  return (
    <>
      {interactive ? (
        <button
          className="story-gallery-open"
          aria-label="查看微博原图"
          onClick={() => setOpened(urls[0] || "")}
        >
          {content}
        </button>
      ) : (
        content
      )}
      {opened && (
        <div
          className="story-gallery-viewer"
          role="dialog"
          aria-label="微博原图"
        >
          <button onClick={() => setOpened("")}>关闭原图</button>
          {urls.length > 1 && (
            <nav>
              {urls.map((url, index) => (
                <button key={url} onClick={() => setOpened(url)}>
                  图片 {index + 1}
                </button>
              ))}
            </nav>
          )}
          <img src={opened} alt={item.sender + "微博原图"} />
        </div>
      )}
    </>
  );
}
