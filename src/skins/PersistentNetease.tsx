import type { Item } from "../schema";

// Keep the official player mounted when navigating away so playback can continue.
export function PersistentNetease({
  item,
  active,
  onBack,
}: {
  item: Item;
  active: boolean;
  onBack: () => void;
}) {
  const id = item.meta?.neteaseSongId;
  if (!id || !/^\d{1,20}$/.test(id)) return null;
  return (
    <section
      className={`persistent-netease ${active ? "active" : "background"}`}
      aria-hidden={!active}
      inert={!active}
    >
      <div className="app-nav">
        <button onClick={onBack} aria-label="返回桌面">
          ‹ 返回
        </button>
        <strong>网易云音乐</strong>
        <span />
      </div>
      <div className="netease-online-content">
        <div className="netease-online-cover">♫</div>
        <h2>我的音乐</h2>
        <p>点击播放器开始播放</p>
        <iframe
          title="网易云官方音乐播放器"
          src={`https://music.163.com/outchain/player?type=2&id=${id}&auto=0&height=66`}
          allow="autoplay"
          referrerPolicy="strict-origin-when-cross-origin"
        />
        <p>返回桌面后继续播放，暂停请回到这里操作。</p>
        <small>如播放器无法加载或歌曲不支持外链，可前往网易云收听。</small>
        <a
          href={`https://music.163.com/song?id=${id}`}
          target="_blank"
          rel="noopener noreferrer"
        >
          在网易云打开歌曲 ↗
        </a>
      </div>
    </section>
  );
}
