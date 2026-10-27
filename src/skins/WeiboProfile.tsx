import {
  ChevronLeft,
  MoreHorizontal,
  Search,
  Share2,
  MessageCircle,
  ThumbsUp,
  Crown,
  FileText,
  Headphones,
  Layers,
} from "lucide-react";
import { useState } from "react";
import { safeMedia, type Item } from "../schema";
import { useSkinState } from "../skinState";
import { Avatar, meta, type Props } from "./shared";
import { StoryGallery } from "./StoryGallery";
import "./weibo-profile.css";
const wan = (n: number) =>
  n >= 10000 ? (n / 10000).toFixed(1).replace(/\.0$/, "") + "万" : String(n);
export function WeiboAccounts({ p }: { p: Props }) {
  const profiles = p.items.filter((i) => i.meta.view === "profile");
  const [selected, setSelected] = useState(profiles[0]?.id || "");
  const profile = profiles.find((i) => i.id === selected) || profiles[0];
  if (!profile) return null;
  return (
    <div className="weibo-accounts">
      <nav aria-label="微博账号" className="weibo-account-switcher">
        {profiles.map((item) => (
          <button
            key={item.id}
            aria-pressed={profile.id === item.id}
            onClick={() => setSelected(item.id)}
          >
            {item.sender}
          </button>
        ))}
      </nav>
      {profile.meta.simpleProfile === "true" ? (
        <div className="catalog-skin weibo-ui weibo-author-page">
          <header className="app-nav">
            <button aria-label="返回" onClick={p.onBack}>
              <ChevronLeft />
            </button>
            <strong>{profile.sender}</strong>
            <span />
          </header>
          <div className="catalog-scroll">
            <section className="weibo-simple-profile">
              <Avatar name={profile.sender} />
              <h2>{profile.sender}</h2>
              <p>
                微博{" "}
                {
                  p.items.filter(
                    (i) =>
                      i.sender === profile.sender && i.meta.view !== "profile",
                  ).length
                }
              </p>
            </section>
            {p.items
              .filter(
                (i) => i.sender === profile.sender && i.meta.view !== "profile",
              )
              .map((item) => (
                <ProfilePost key={item.id} p={p} item={item} />
              ))}
          </div>
        </div>
      ) : (
        <WeiboProfile key={profile.id} p={p} profile={profile} />
      )}
    </div>
  );
}
function ProfilePost({ p, item }: { p: Props; item: Item }) {
  const [liked, setLiked] = useSkinState<boolean>(p, "liked-" + item.id, false);
  return (
    <article className="weibo-post" data-post-id={item.id}>
      <button className="social-author" onClick={() => p.onItem(item)}>
        <Avatar
          name={item.sender}
          src={item.avatar}
          crop={item.meta.avatarCrop}
        />
        <span>
          <strong>
            {item.sender} <Crown size={13} />
          </strong>
          <small>
            {item.time} {meta(item, "location")}
          </small>
        </span>
      </button>
      <button
        className="social-body"
        onClick={() => p.onItem(item)}
        aria-label={"查看微博：" + item.title}
      >
        <p>{item.body}</p>
        {item.media && <StoryGallery item={item} />}
      </button>
      <div className="social-actions weibo-actions">
        <button onClick={() => p.onItem(item)} aria-label={"转发" + item.title}>
          <Share2 size={17} />
          {meta(item, "reposts", "转发")}
        </button>
        <button onClick={() => p.onItem(item)} aria-label={"评论" + item.title}>
          <MessageCircle size={17} />
          {meta(item, "commentCount", String(item.comments.length))}
        </button>
        <button
          onClick={() => setLiked(!liked)}
          aria-label={"喜欢" + item.title}
          aria-pressed={liked}
        >
          <ThumbsUp size={17} fill={liked ? "currentColor" : "none"} />
          {wan(item.likes + (liked ? 1 : 0))}
        </button>
      </div>
    </article>
  );
}
export function WeiboProfile({ p, profile }: { p: Props; profile: Item }) {
  const [tab, setTab] = useState("微博");
  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [menu, setMenu] = useState(false);
  const [followed, setFollowed] = useSkinState<boolean>(
    p,
    "followed-" + profile.sender,
    true,
  );
  const posts = p.items.filter(
    (i) =>
      i.meta.view !== "profile" &&
      i.sender === profile.sender &&
      (i.body + i.title).includes(query),
  );
  const list =
    tab === "视频"
      ? posts.filter((i) => i.kind === "video")
      : tab === "相册"
        ? posts.filter((i) => i.media)
        : ["微博", "动态"].includes(tab)
          ? posts
          : [];
  return (
    <div className="catalog-skin weibo-ui weibo-author-page">
      <div className="catalog-scroll">
        <div
          className="weibo-author-cover"
          data-reference={profile.meta.profileScreenshot === "true"}
          style={
            safeMedia(profile.media)
              ? {
                  backgroundImage: `url("${safeMedia(profile.media)}")`,
                  ...(profile.meta.profileScreenshot === "true"
                    ? {
                        backgroundSize: "100% auto",
                        backgroundPosition: "center top",
                      }
                    : {}),
                }
              : undefined
          }
        >
          <header>
            <button aria-label="返回" onClick={p.onBack}>
              <ChevronLeft />
            </button>
            <span />
            <button
              aria-label="搜索该博主微博"
              onClick={() => setSearching(!searching)}
            >
              <Search />
            </button>
            <button aria-label="博主更多选项" onClick={() => setMenu(!menu)}>
              <MoreHorizontal />
            </button>
          </header>
        </div>
        <section className="weibo-author-info" aria-label="王橹杰的微博主页">
          <div className="weibo-author-name">
            <Avatar
              name={profile.sender}
              src={profile.avatar}
              crop={profile.meta.avatarCrop}
            />
            <h2>
              {profile.title}
              <small>
                ♂ <em>{meta(profile, "vip")}</em>
              </small>
            </h2>
          </div>
          <div className="weibo-author-stats">
            <span>
              <b>{meta(profile, "followers")}</b> 粉丝
            </span>
            <span>
              <b>{meta(profile, "following")}</b> 关注
            </span>
            <span>
              <b>{meta(profile, "engagement")}</b> 转评赞
            </span>
          </div>
          <div className="weibo-author-badges">
            <span>演员影响力指数 {meta(profile, "influence")}</span>
            <span>本月互动人数{meta(profile, "monthlyInteractions")}</span>
          </div>
          <p className="weibo-author-bio">
            <FileText size={15} />
            {profile.body}
          </p>
          <button className="weibo-super-topic" onClick={() => setTab("超话")}>
            <strong>◇ 超话</strong>
            <small>{meta(profile, "superTopicFollowers")}</small>
          </button>
          <nav className="weibo-author-tabs">
            {["动态", "微博", "视频", "超话", "音频", "相册"].map((t) => (
              <button
                key={t}
                aria-pressed={tab === t}
                onClick={() => setTab(t)}
              >
                {t}
              </button>
            ))}
          </nav>
        </section>
        {menu && (
          <div className="weibo-profile-menu">
            <button onClick={() => setFollowed(!followed)}>
              {followed ? "取消关注" : "关注博主"}
            </button>
            <button onClick={() => setMenu(false)}>关闭</button>
          </div>
        )}
        {searching && (
          <input
            className="weibo-profile-search"
            aria-label="搜索该博主微博内容"
            placeholder="搜索该博主微博"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        )}
        <div className="weibo-author-filters">
          <span>
            全部微博 ({meta(profile, "totalPosts", String(posts.length))})
          </span>
          <small>筛选</small>
          <div>
            <span>
              <Layers size={14} />
              原创
            </span>
            <span>
              <Headphones size={14} />
              热门音频
            </span>
            <span>近期热门</span>
          </div>
        </div>
        {list.map((item) => (
          <ProfilePost key={item.id} p={p} item={item} />
        ))}
        {!list.length && (
          <p className="catalog-empty">
            {tab === "超话"
              ? meta(profile, "superTopic") +
                "超话 · " +
                meta(profile, "superTopicFollowers")
              : "暂无内容"}
          </p>
        )}
      </div>
    </div>
  );
}
