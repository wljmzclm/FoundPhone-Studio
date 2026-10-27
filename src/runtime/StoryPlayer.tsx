import { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { Phone } from "../Phone";
import { Introduction } from "./Introduction";
import { validateWork, type Work } from "../schema";
import "../styles.css";
import "./player.css";
function StoryPlayer() {
  const [started, setStarted] = useState(false);
  const [work, setWork] = useState<Work | null>(null),
    [error, setError] = useState("");
  useEffect(() => {
    const abort = new AbortController();
    fetch(
      new URLSearchParams(location.search).get("preview") === "test"
        ? "./test-work.json"
        : new URLSearchParams(location.search).get("template") === "blank"
          ? "./blank-work.json"
          : "./work.json",
      { signal: abort.signal },
    )
      .then((r) => {
        if (!r.ok) throw Error("缺少作品文件，请运行 npm run story:build");
        return r.json();
      })
      .then((x) => {
        const w = validateWork(x);
        document.title =
          w.phone.introduction?.title ||
          (w.title === "捡手机" ? "捡手机" : w.title + " · 捡手机");
        setWork(w);
      })
      .catch((e) => {
        if (e.name !== "AbortError") setError(String(e));
      });
    return () => abort.abort();
  }, []);
  return (
    <main
      className={`story-runtime${work?.phone.introduction && !started ? " introduction-open" : ""}`}
    >
      {work ? (
        work.phone.introduction && !started ? (
          <Introduction work={work} onStart={() => setStarted(true)} />
        ) : (
          <>
            <Phone work={work} />
            {work.phone.introduction && (
              <button
                className="player-introduction-back"
                onClick={() => setStarted(false)}
              >
                返回说明与章节
              </button>
            )}
          </>
        )
      ) : (
        <p role="status">{error || "正在打开手机…"}</p>
      )}
    </main>
  );
}
createRoot(document.getElementById("root")!).render(<StoryPlayer />);
