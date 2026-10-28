import raw from "../../stories/template/story.json";
import { expect, it } from "vitest";
import { compileStory } from "./compiler";
import { initialRuntime } from "../schema";
import { dispatch, advance } from "../engine";

it("delivers Mom then friend one second later, without the removed work notification or replays", () => {
  const { work } = compileStory(raw);
  let state = dispatch(work, initialRuntime(work), "start");
  expect(state.notifications).toEqual([
    "微信：妈妈：儿子什么时候放假回重庆呀？",
  ]);
  state = advance(work, state, 999);
  expect(state.notifications).toHaveLength(1);
  state = dispatch(work, structuredClone(state), "start");
  state = advance(work, state, 1);
  expect(state.notifications).toEqual([
    "微信：妈妈：儿子什么时候放假回重庆呀？",
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
