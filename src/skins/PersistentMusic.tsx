import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import { ChevronLeft, Pause, Play, Repeat } from "lucide-react";
import { safeMedia, type Item } from "../schema";

export type PersistentMusicHandle = { play: () => void };
const clock = (seconds: number) =>
  `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, "0")}`;

// The Phone owns the audio element, so switching apps preserves playback.
export const PersistentMusic = forwardRef<
  PersistentMusicHandle,
  { item: Item; active: boolean; onBack: () => void }
>(function PersistentMusic({ item, active, onBack }, ref) {
  const audio = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);
  const [error, setError] = useState("");
  const play = useCallback(() => {
    setError("");
    void audio.current?.play().catch(() => setError("请点击播放按钮开始播放"));
  }, []);
  useImperativeHandle(ref, () => ({ play }), [play]);
  useEffect(() => {
    const element = audio.current;
    return () => {
      element?.pause();
    };
  }, []);
  return (
    <section
      className={`persistent-music ${active ? "active" : "background"}`}
      aria-hidden={!active}
      inert={!active}
    >
      <audio
        ref={audio}
        src={safeMedia(item.media)}
        loop
        preload="metadata"
        aria-label={`播放${item.title}`}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onLoadedMetadata={(e) =>
          setDuration(
            Number.isFinite(e.currentTarget.duration)
              ? e.currentTarget.duration
              : 0,
          )
        }
        onTimeUpdate={(e) => setPosition(e.currentTarget.currentTime)}
        onError={() => setError("音乐暂时无法加载，请重试")}
      />
      <header className="app-nav">
        <button onClick={onBack} aria-label="返回桌面">
          <ChevronLeft size={22} />
        </button>
        <strong>音乐</strong>
        <Repeat size={20} aria-label="单曲循环" />
      </header>
      <div className="local-music-content">
        <img
          className="local-music-cover"
          src={safeMedia(item.meta.cover)}
          alt={`${item.title}封面`}
        />
        <h1>{item.title}</h1>
        <p className="local-music-artist">{item.sender}</p>
        <input
          type="range"
          aria-label="音乐播放进度"
          min={0}
          max={duration || 1}
          step={0.1}
          value={Math.min(position, duration || 1)}
          onChange={(e) => {
            if (audio.current && duration)
              audio.current.currentTime = Number(e.target.value);
          }}
        />
        <div className="local-music-times">
          <span>{clock(position)}</span>
          <span>{clock(duration)}</span>
        </div>
        <button
          className="local-music-toggle"
          aria-label={playing ? "暂停音乐" : "播放音乐"}
          onClick={() => (playing ? audio.current?.pause() : play())}
        >
          {playing ? (
            <Pause size={34} fill="currentColor" />
          ) : (
            <Play size={34} fill="currentColor" />
          )}
        </button>
        <span className="local-music-loop">
          <Repeat size={15} />
          单曲循环
        </span>
        <p className="local-music-hint">返回桌面后继续播放</p>
        {error && <p role="status">{error}</p>}
      </div>
    </section>
  );
});
