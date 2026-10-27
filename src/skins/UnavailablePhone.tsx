import { useEffect, useRef, useState } from "react";
import { Grid, MicOff, Phone, UserPlus, Video, Volume2 } from "lucide-react";
import { safeMedia, type Item } from "../schema";
import { Avatar, Header, type Props } from "./shared";
import "./unavailable-phone.css";

export function UnavailablePhone({ p, contact }: { p: Props; contact: Item }) {
  const [calling, setCalling] = useState(false);
  const [muted, setMuted] = useState(false);
  const [speaker, setSpeaker] = useState(true);
  const [failed, setFailed] = useState(false);
  const audio = useRef<HTMLAudioElement>(null);
  useEffect(() => {
    const element = audio.current;
    return () => element?.pause();
  }, []);
  const dial = () => {
    setCalling(true);
    setFailed(false);
    const element = audio.current;
    if (element) {
      element.currentTime = 0;
      void element.play().catch(() => setFailed(true));
    }
    p.onRead(contact.id);
  };
  return (
    <div className="catalog-skin native-phone unavailable-phone">
      <audio
        ref={audio}
        src={safeMedia(contact.media)}
        preload="metadata"
        aria-label="空号提示音"
        onError={() => setFailed(true)}
      />
      {calling ? (
        <section className="unavailable-call" aria-label="王橹杰的通话画面">
          <small>正在呼叫…</small>
          <h2>{contact.title}</h2>
          <p role="status">您拨打的号码是空号</p>
          {failed && <button onClick={dial}>重新播放提示音</button>}
          <div className="unavailable-call-actions">
            <button
              aria-pressed={speaker}
              onClick={() => {
                const next = !speaker;
                setSpeaker(next);
                if (audio.current) audio.current.volume = next ? 1 : 0.5;
              }}
            >
              <span>
                <Volume2 />
              </span>
              免提
            </button>
            <button disabled>
              <span>
                <Video />
              </span>
              FaceTime
            </button>
            <button
              aria-pressed={muted}
              onClick={() => {
                const next = !muted;
                setMuted(next);
                if (audio.current) audio.current.muted = next;
              }}
            >
              <span>
                <MicOff />
              </span>
              静音
            </button>
            <button disabled>
              <span>
                <UserPlus />
              </span>
              添加
            </button>
            <button
              className="call-end"
              aria-label="结束通话"
              onClick={() => {
                audio.current?.pause();
                setCalling(false);
              }}
            >
              <span>
                <Phone />
              </span>
              结束
            </button>
            <button disabled>
              <span>
                <Grid />
              </span>
              拨号键盘
            </button>
          </div>
        </section>
      ) : (
        <>
          <Header p={p} />
          <div className="catalog-scroll">
            <h1>通讯录</h1>
            <button
              className="unavailable-contact"
              aria-label={`拨打${contact.title}`}
              onClick={dial}
            >
              <Avatar name={contact.title} src={contact.avatar} />
              <span>
                <strong>{contact.title}</strong>
                <small>手机</small>
              </span>
              <Phone />
            </button>
          </div>
        </>
      )}
    </div>
  );
}
