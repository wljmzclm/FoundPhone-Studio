import { useState } from "react";
import {
  ChevronLeft,
  Heart,
  MessageCircle,
  Star,
  Share2,
  Search,
} from "lucide-react";
import { useSkinState } from "../skinState";
import { MessageEvidence } from "./MessageEvidence";
import type { Item } from "../schema";
import type { Props } from "./shared";
import "./douyin-story.css";
export function DouyinStory({ p, item }: { p: Props; item: Item }) {
  const [liked, setLiked] = useSkinState<boolean>(p, "liked-" + item.id, false);
  const [saved, setSaved] = useSkinState<boolean>(p, "saved-" + item.id, false);
  const [panel, setPanel] = useState("");
  return (
    <div className="douyin-story">
      <header>
        <button aria-label="返回" onClick={p.onBack}>
          <ChevronLeft />
        </button>
        <span>
          <Search size={17} />
          短信爱 <b>搜索</b>
        </span>
      </header>
      <div className="douyin-story-scroll">
        <MessageEvidence item={item} />
        <aside>
          <button
            aria-label="喜欢该抖音"
            aria-pressed={liked}
            onClick={() => setLiked(!liked)}
          >
            <Heart fill={liked ? "#fa2854" : "white"} />
            {7806 + (liked ? 1 : 0)}
          </button>
          <button
            aria-label="查看抖音评论"
            onClick={() => setPanel("评论 330")}
          >
            <MessageCircle fill="white" />
            330
          </button>
          <button
            aria-label="收藏该抖音"
            aria-pressed={saved}
            onClick={() => setSaved(!saved)}
          >
            <Star fill={saved ? "#ffd13b" : "white"} />
            {991 + (saved ? 1 : 0)}
          </button>
          <button aria-label="分享该抖音" onClick={() => setPanel("分享")}>
            <Share2 fill="white" />
            2193
          </button>
        </aside>
        <p className="douyin-recommendations">♥ 共455人推荐</p>
        <div className="douyin-story-caption">
          <span>▣ 图文</span>
          <p>{item.meta.caption}</p>
        </div>
        <p className="douyin-story-related">
          ⌕ 相关搜索：聊天记录里嘴贱的分手话术 ›
        </p>
        <footer>
          <strong>
            # 短信爱<small>2.9万人参与</small>
          </strong>
          <button
            aria-label="关注短信爱话题"
            onClick={() => setPanel("短信爱 · 2.9万人参与")}
          >
            立即参与
          </button>
        </footer>
      </div>
      {panel && (
        <div className="douyin-story-panel">
          <button onClick={() => setPanel("")}>关闭</button>
          <h3>{panel}</h3>
          <p>{panel === "评论 330" ? "暂无可展开的评论内容" : "作品内图文"}</p>
        </div>
      )}
    </div>
  );
}
