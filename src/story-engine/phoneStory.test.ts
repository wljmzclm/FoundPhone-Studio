import raw from "../../stories/template/story.json";
import { expect, it } from "vitest";
import { compileStory } from "./compiler";
import { initialRuntime } from "../schema";
import { dispatch, advance, visible } from "../engine";

it("delivers the first SMS after 5000ms, then WeChat only on entering SMS, and enforces completion order", () => {
  const { work } = compileStory(raw);
  let state = dispatch(work, initialRuntime(work), "password", "2711");
  expect(state.notifications).toEqual(["微博：TF家族-王橹杰LJW发送了新的微博"]);
  state = dispatch(work, state, "openApp", "messages");
  expect(state.notifications).toHaveLength(1);
  state = dispatch(work, state, "openApp", "weibo");
  state = advance(work, state, 4999);
  expect(state.notifications).toHaveLength(1);
  state = advance(work, state, 1);
  expect(state.notifications.at(-1)).toBe("短信：你收到了一条新信息");
  expect(state.notifications).toHaveLength(2);
  state = dispatch(work, state, "openApp", "messages");
  expect(state.notifications.at(-1)).toBe("微信：有信息需发送");
  state = dispatch(work, state, "openApp", "messages");
  state = dispatch(work, state, "openApp", "weibo");
  state = advance(work, state, 10000);
  expect(state.notifications).toHaveLength(3);
  state = dispatch(work, state, "storyComplete", "messages");
  expect(state.endings).toEqual([]);
  state = dispatch(work, state, "sendMessage", "mu-sms-shot");
  state = advance(work, state, 2499);
  expect(state.unlocked).not.toContain("friend-who");
  state = advance(work, state, 1);
  expect(state.unlocked).toContain("friend-who");
  expect(state.unlocked).not.toContain("mu-dont-know");
  state = dispatch(work, state, "sendMessage", "mu-dont-know");
  state = advance(work, state, 5000);
  expect(state.variables.storyPhase).toBe("douyin");
  state = dispatch(work, state, "openApp", "douyin");
  expect(state.variables.storyPhase).toBe("wechat-continued");
  expect(state.notifications.at(-1)).toBe("微信：穆之友有信息需发送");
});

it("requires the QQ five-second invite and exact friend account before showing Wang history, including older saves", () => {
  const { work } = compileStory(raw);
  let state = initialRuntime(work);
  state.unlocked.push("wang-post-story-thread"); // Earlier releases unlocked this on completion.
  const history = work.data.wechat.find((i) => i.id === "wang-history-01")!;
  expect(visible(history, state)).toBe(false);
  const submit = (account: string) => {
    state = dispatch(
      work,
      { ...state, ui: { ...state.ui, wechat: { friendAccount: account } } },
      "variable",
      "ui:wechat:friendAccount",
    );
  };
  submit("reflection2711");
  expect(visible(history, state)).toBe(false);
  state = dispatch(work, state, "openApp", "qq");
  state = advance(work, state, 4999);
  expect(state.variables["qq-wechat-invite-ready"]).not.toBe(true);
  state = advance(work, state, 1);
  expect(state.notifications.at(-1)).toContain("reflection2711");
  submit("wrong");
  expect(visible(history, state)).toBe(false);
  submit("reflection2711");
  expect(visible(history, state)).toBe(true);
  expect(state.unlocked).toContain("wang-wechat-added");
  const count = state.notifications.length;
  state = dispatch(work, state, "openApp", "qq");
  state = advance(work, state, 5000);
  expect(state.notifications).toHaveLength(count);
});
