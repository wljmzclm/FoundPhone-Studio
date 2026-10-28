import raw from "../../stories/template/story.json";
import { expect, it } from "vitest";
import { compileStory } from "./compiler";
import { initialRuntime } from "../schema";
import { dispatch, advance } from "../engine";

it("allows exploring the reset chapter without activating retired plot callbacks", () => {
  const { work } = compileStory(raw);
  let state = dispatch(work, initialRuntime(work), "password", "2711");
  for (const app of work.phone.appAccess!.duringStory) {
    state = dispatch(work, state, "openApp", app);
    state = advance(work, state, 6000);
  }
  state = dispatch(work, state, "sendMessage", "mu-sms-shot");
  state = dispatch(work, state, "variable", "ui:wechat:friendAccount");
  state = advance(work, state, 60000);
  expect(state.notifications).toEqual([]);
  expect(state.scheduled ?? []).toEqual([]);
  expect(state.endings).toEqual([]);
  expect(state.unlocked).toEqual([]);
  expect(state.visited).toEqual(
    expect.arrayContaining(work.phone.appAccess!.duringStory),
  );
});
