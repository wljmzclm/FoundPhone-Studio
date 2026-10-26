import type { Item } from "../schema";
export function MessageEvidence({ item }: { item: Item }) {
  const douyin = item.meta.attachment === "douyin";
  return (
    <span
      className={
        "message-evidence " + (douyin ? "evidence-douyin" : "evidence-sms")
      }
      role="img"
      aria-label={douyin ? "穆之友分享的抖音短信截图" : "蜜雪冰城短信截图"}
    >
      {douyin && <span className="evidence-search">⌕ 短信爱</span>}
      <span className="evidence-person">●</span>
      <span className="evidence-number">未知号码</span>
      <span className="evidence-encryption">
        iMessage 信息
        <br />♙ 已加密
      </span>
      <span
        className={"evidence-bubble " + (douyin ? "evidence-outgoing" : "")}
      >
        {item.meta.originalSms || item.body}
      </span>
      {douyin && (
        <>
          <span className="evidence-encryption">
            信息 · 短信
            <br />
            未加密
          </span>
          <span className="evidence-bubble">{item.body}</span>
        </>
      )}
      {!douyin && (
        <span className="evidence-spam">
          若未预期会收到来自未知发件人的这则信息，其可能为垃圾信息。
          <br />
          <span>报告垃圾信息</span>
        </span>
      )}
    </span>
  );
}
