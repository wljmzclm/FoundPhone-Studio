import raw from "../../stories/template/story.json";
import { expect, it } from "vitest";
import { compileStory } from "./compiler";
import { initialRuntime } from "../schema";
import { dispatch, advance } from "../engine";

it("delivers Mom then friend one second later, without the removed work notification or replays", () => {
  const { work } = compileStory(raw);
  let state = dispatch(work, initialRuntime(work), "start");
  expect(state.notifications).toEqual([
    "微信：妈妈：儿子放假什么时候回重庆呀？",
  ]);
  state = advance(work, state, 999);
  expect(state.notifications).toHaveLength(1);
  state = dispatch(work, structuredClone(state), "start");
  state = advance(work, state, 1);
  expect(state.notifications).toEqual([
    "微信：妈妈：儿子放假什么时候回重庆呀？",
    "微信：穆之友：你真要去看他演唱会？",
  ]);
  expect(state.unlocked).toEqual(["opening-mom", "opening-friend"]);
  for (const app of work.phone.appAccess!.duringStory)
    state = dispatch(work, state, "openApp", app);
  state = advance(work, state, 60000);
  expect(state.notifications).toHaveLength(2);
  expect(state.scheduled ?? []).toEqual([]);
  expect(state.endings).toEqual([]);
});

it("keeps Mom's replies hidden until her chat is entered and waits for each player send", () => {
  const { work } = compileStory(raw);
  let state = dispatch(work, initialRuntime(work), "start");
  state = dispatch(work, state, "openApp", "wechat");
  expect(state.variables.storyPhase).toBe("wechat-main");
  expect(state.unlocked).not.toContain("mom-holiday-reply");
  state = advance(work, state, 10000);
  expect(state.unlocked).not.toContain("mom-received");
  state = dispatch(work, state, "sendMessage", "mom-holiday-reply");
  expect(state.unlocked).not.toContain("mom-holiday-reply");
  state = dispatch(work, state, "read", "opening-mom");
  state = dispatch(work, state, "sendMessage", "mom-holiday-reply");
  expect(state.unlocked).toContain("mom-holiday-reply");
  state = advance(work, state, 999);
  expect(state.unlocked).not.toContain("mom-received");
  state = advance(work, state, 1);
  expect(state.unlocked).toContain("mom-received");
  expect(state.unlocked).not.toContain("mom-duoduo");
  state = advance(work, state, 1000);
  expect(state.unlocked).toContain("mom-duoduo");
  expect(state.unlocked).not.toContain("mom-miss-you");
  state = dispatch(work, state, "sendMessage", "mom-miss-you");
  expect(state.unlocked).toContain("mom-miss-you");
  expect(state.variables.momConversationComplete).toBe(true);
  expect(state.endings).toEqual([]);
});
