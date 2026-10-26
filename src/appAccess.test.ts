import { describe, expect, it } from "vitest";
import { canOpenApp } from "./appAccess";
import { compileStory } from "./story-engine/compiler";
import { initialRuntime } from "./schema";

const setup = () => {
  const { work } = compileStory({
    scriptVersion: 1,
    id: "restricted-phone",
    title: "权限测试",
    phone: {
      owner: "机主",
      appAccess: {
        duringStory: ["wechat"],
        afterEnding: ["notes"],
      },
    },
    installedApps: ["wechat", "notes", "settings", "appstore"],
  });
  return { work, state: initialRuntime(work) };
};
describe("story app access", () => {
  it("blocks installed apps outside the author list and gates extras until an ending", () => {
    const { work, state } = setup();
    expect(canOpenApp(work, state, "wechat")).toBe(true);
    expect(canOpenApp(work, state, "notes")).toBe(false);
    for (const id of ["settings", "appstore", "camera"])
      expect(canOpenApp(work, state, id)).toBe(false);
    state.endings.push("测试结局");
    expect(canOpenApp(work, state, "notes")).toBe(true);
    expect(canOpenApp(work, state, "settings")).toBe(false);
    const restored = JSON.parse(JSON.stringify(state));
    expect(canOpenApp(work, restored, "notes")).toBe(true);
    expect(canOpenApp(work, initialRuntime(work), "notes")).toBe(false);
  });
  it("keeps unrestricted stories compatible and rejects missing apps in policy", () => {
    const { work, state } = setup();
    delete work.phone.appAccess;
    expect(canOpenApp(work, state, "settings")).toBe(true);
    expect(canOpenApp(work, state, "camera")).toBe(false);
    expect(() =>
      compileStory({
        scriptVersion: 1,
        id: "invalid-policy",
        title: "无效权限",
        phone: {
          owner: "机主",
          appAccess: { duringStory: ["missing"], afterEnding: [] },
        },
        installedApps: [],
      }),
    ).toThrow("未安装");
  });
});
