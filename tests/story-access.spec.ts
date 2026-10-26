import { test, expect, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";
import { compileStory } from "../src/story-engine/compiler";
const raw = JSON.parse(readFileSync("stories/template/story.json", "utf8"));
async function unlock(page: Page, pin = "2711") {
  await page.getByRole("button", { name: "轻触解锁" }).click();
  for (const digit of pin)
    await page
      .getByRole("button", { name: "密码键" + digit, exact: true })
      .click();
}
test("Mu phone: wallpaper, four-digit passcode and four allowed story apps", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.locator(".lock-screen")).toBeVisible();
  expect(
    await page
      .locator(".phone-screen")
      .evaluate((el) => getComputedStyle(el).backgroundImage),
  ).toContain("/story-assets/lock-wallpaper.png");
  await page
    .locator(".phone-screen")
    .screenshot({ path: "outputs/mu-phone/lock.png" });
  await unlock(page, "0000");
  await expect(
    page.getByRole("status").filter({ hasText: "密码不正确" }),
  ).toBeVisible();
  await expect(page.locator(".lock-screen")).toBeVisible();
  // A new attempt starts with a cleared keypad.
  await page.getByRole("button", { name: "取消", exact: true }).click();
  await unlock(page);
  await expect(page.locator(".lock-screen")).toHaveCount(0);
  for (const name of ["微信", "短信", "微博", "抖音"]) {
    await page
      .getByRole("button", { name: "打开" + name, exact: true })
      .click();
    await expect(page.locator(".app-screen:not([inert])")).toBeVisible();
    await page.getByRole("button", { name: "返回桌面", exact: true }).click();
  }
  for (const name of ["备忘录", "相册", "浏览器", "App Store", "设置", "相机"])
    await expect(
      page.getByRole("button", { name: "打开" + name, exact: true }),
    ).toHaveCount(0);
  await page
    .locator(".phone-screen")
    .screenshot({ path: "outputs/mu-phone/home.png" });
  await page.reload();
  await unlock(page);
  await expect(
    page.getByRole("button", { name: "打开相册", exact: true }),
  ).toHaveCount(0);
});
test("only a completed ending opens two extras; continuation and save survive reload", async ({
  page,
}) => {
  // Synthetic completion verifies the gate without inventing the author's main plot.
  const { work } = compileStory({
    ...raw,
    events: [
      {
        id: "test-complete",
        label: "权限回归测试",
        type: "event",
        event: "openApp",
        target: "douyin",
        actions: [{ type: "ending", key: "", value: "权限测试完成" }],
      },
    ],
  });
  await page.route("**/work.json", (route) => route.fulfill({ json: work }));
  await page.goto("/");
  await unlock(page);
  await page.getByRole("button", { name: "打开抖音", exact: true }).click();
  await page.getByRole("button", { name: "继续探索手机", exact: true }).click();
  await expect(page.locator(".story-overlay.ending")).toHaveCount(0);
  await page.getByRole("button", { name: "打开相册", exact: true }).click();
  await expect(page.locator(".app-screen:not([inert])")).toBeVisible();
  await page.getByRole("button", { name: "返回桌面", exact: true }).click();
  for (const name of ["相册", "浏览器"])
    await expect(
      page.getByRole("button", { name: "打开" + name, exact: true }),
    ).toHaveCount(1);
  for (const name of ["设置", "电话", "文件", "哔哩哔哩", "网易云", "备忘录"])
    await expect(
      page.getByRole("button", { name: "打开" + name, exact: true }),
    ).toHaveCount(0);
  await page.reload();
  await unlock(page);
  await expect(page.locator(".story-overlay.ending")).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "打开相册", exact: true }),
  ).toHaveCount(1);
});

test("unlock notification opens Wang Lujie profile with five ordered posts", async ({
  page,
}) => {
  await page.goto("/");
  await unlock(page);
  await page
    .locator(".device-banner")
    .filter({ hasText: "TF家族-王橹杰LJW发送了新的微博" })
    .click();
  await expect(page.locator(".weibo-author-info h2")).toContainText(
    "TF家族-王橹杰LJW",
  );
  await expect(page.locator(".weibo-author-stats")).toContainText("365.5万");
  await expect(page.locator(".weibo-author-stats")).toContainText("14.3亿");
  await expect(page.locator(".weibo-post")).toHaveCount(5);
  expect(
    await page
      .locator(".weibo-post")
      .evaluateAll((els) => els.map((el) => el.getAttribute("data-post-id"))),
  ).toEqual([
    "wang-lujie-weibo-0817",
    "wang-lujie-weibo-0709",
    "wang-lujie-weibo-0623",
    "wang-lujie-weibo-0601",
    "wang-lujie-weibo-0320",
  ]);
  await page
    .locator(".phone-screen")
    .screenshot({ path: "outputs/mu-phone/weibo-profile.png" });
  await page.locator(".weibo-post").first().locator(".social-body").click();
  await expect(page.getByText("微博正文", { exact: true })).toBeVisible();
  await expect(page.locator(".post-detail-body")).toContainText("顷刻间出发");
  await expect(page.locator(".weibo-detail-tabs")).toContainText("7.3万");
  await page.getByRole("button", { name: "返回帖子列表", exact: true }).click();
  await expect(page.locator(".weibo-author-info h2")).toBeVisible();
});

test("five-second SMS banner routes to SMS and immediately offers WeChat", async ({
  page,
}) => {
  await page.goto("/");
  await unlock(page);
  await page
    .locator(".device-banner")
    .filter({ hasText: "TF家族-王橹杰LJW发送了新的微博" })
    .click();
  const sms = page.locator(".device-banner").filter({ hasText: "短信" });
  await expect(sms).toBeVisible({ timeout: 8000 });
  await sms.click();
  await expect(page.locator(".phone-screen")).toHaveAttribute(
    "data-app",
    "messages",
  );
  const wechat = page
    .locator(".device-banner")
    .filter({ hasText: "有信息需发送" });
  await expect(wechat).toBeVisible();
  await wechat.click();
  await expect(page.locator(".phone-screen")).toHaveAttribute(
    "data-app",
    "wechat",
  );
  await expect(page.locator(".home-indicator")).toHaveCSS(
    "background-color",
    "rgba(0, 0, 0, 0)",
  );
  await page.reload();
  await unlock(page);
  await expect(page.locator(".device-banner")).toHaveCount(0);
});

test("scripted Mu conversation: player taps sends, friend replies, Douyin returns to WeChat, then SMS reminder", async ({
  page,
}) => {
  test.setTimeout(180000);
  await page.goto("/");
  await unlock(page);
  await page
    .locator(".device-banner")
    .filter({ hasText: "TF家族-王橹杰LJW发送了新的微博" })
    .click();
  await page
    .locator(".device-banner")
    .filter({ hasText: "短信" })
    .waitFor({ timeout: 8000 });
  await page.locator(".device-banner").filter({ hasText: "短信" }).click();
  await expect(page.locator(".sms-story-dark")).toContainText(
    "本月应付 0.33 元",
  );
  await expect(page.locator(".sms-story-bubbles")).toHaveCSS(
    "background-color",
    "rgb(0, 0, 0)",
  );
  await page
    .locator(".phone-screen")
    .screenshot({ path: "outputs/mu-phone/first-sms.png" });
  await page
    .locator(".device-banner")
    .filter({ hasText: "有信息需发送" })
    .click();
  await expect(
    page.locator(".wx-chat-row").filter({ hasText: "王橹杰" }),
  ).toHaveCount(0);
  await page.locator(".wx-chat-row").filter({ hasText: "穆之友" }).click();
  const send = page.getByRole("button", {
    name: "发送下一条消息",
    exact: true,
  });
  await expect(page.locator(".wechat-ui")).toHaveCSS(
    "background-color",
    "rgb(17, 17, 17)",
  );
  await expect(
    page.getByRole("button", { name: "不知道", exact: true }),
  ).toHaveCount(0);
  await send.click();
  await expect(
    page.getByRole("button", { name: "？谁发的这么抽象", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "不知道", exact: true }),
  ).toHaveCount(0);
  await send.click();
  await expect(
    page.getByRole("button", { name: "不知道", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "我好像知道了", exact: true }),
  ).toBeVisible();
  await page.locator(".device-banner").filter({ hasText: "抖音" }).click();
  await expect(page.locator(".douyin-story")).toContainText(
    "不要再打扰我的生活",
  );
  await page
    .locator(".phone-screen")
    .screenshot({ path: "outputs/mu-phone/douyin.png" });
  await page
    .locator(".device-banner")
    .filter({ hasText: "穆之友有信息需发送" })
    .click();
  await page.locator(".wx-chat-row").filter({ hasText: "穆之友" }).click();
  for (const incoming of [
    "可能你的某个前任想你了",
    "不要再打扰我的生活",
    "帮你复制的文案",
    "再说了你不想知道他是谁嘛",
  ]) {
    await expect(send).toBeEnabled({ timeout: 20000 });
    await send.click();
    await expect(
      page
        .locator(".skin-message:not(.outgoing) .skin-bubble")
        .filter({ hasText: incoming })
        .last(),
    ).toBeVisible({ timeout: 10000 });
  }
  await expect(send).toBeEnabled({ timeout: 20000 });
  await send.click();
  await expect(
    page.getByRole("button", { name: "我其实好像知道是谁", exact: true }),
  ).toBeVisible();
  await expect(
    page.locator(".device-banner").filter({ hasText: "短信" }),
  ).toBeVisible();
  await page
    .locator(".phone-screen")
    .screenshot({ path: "outputs/mu-phone/wechat-complete.png" });
  await page.reload();
  await unlock(page);
  await page.getByRole("button", { name: "打开微信", exact: true }).click();
  await page.locator(".wx-chat-row").filter({ hasText: "穆之友" }).click();
  await expect(
    page.getByRole("button", { name: "我其实好像知道是谁", exact: true }),
  ).toBeVisible();
  await expect(send).toBeDisabled();
  await page.getByRole("button", { name: "返回桌面", exact: true }).click();
  await page.getByRole("button", { name: "打开短信", exact: true }).click();
  const outgoing = raw.content.messages.filter(
    (item: { outgoing?: boolean }) => item.outgoing,
  );
  for (const item of outgoing) {
    await expect(send).toBeEnabled({ timeout: 20000 });
    const bubble = page.locator('[data-message-id="' + item.id + '"]');
    await expect(bubble).toHaveCount(0);
    await send.click();
    await expect(bubble).toBeVisible();
  }
  await expect(page.locator(".story-overlay.ending")).toContainText(
    "主剧情已结束",
  );
  await page.getByRole("button", { name: "继续探索手机", exact: true }).click();
  for (const name of ["相册", "浏览器"])
    await expect(
      page.getByRole("button", { name: "打开" + name, exact: true }),
    ).toHaveCount(1);
  for (const name of ["设置", "电话", "文件", "哔哩哔哩", "网易云", "备忘录"])
    await expect(
      page.getByRole("button", { name: "打开" + name, exact: true }),
    ).toHaveCount(0);
  await page.reload();
  await unlock(page);
  await expect(page.locator(".story-overlay.ending")).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "打开相册", exact: true }),
  ).toHaveCount(1);
  await page.getByRole("button", { name: "打开微信", exact: true }).click();
  await expect(
    page.locator(".wx-chat-row").filter({ hasText: "王橹杰" }),
  ).toHaveCount(1);
  await page.locator(".wx-chat-row").filter({ hasText: "王橹杰" }).click();
  await expect(page.locator(".wx-nav strong")).toHaveText("王橹杰");
  await page
    .locator(".phone-screen")
    .screenshot({ path: "outputs/mu-phone/exploration.png" });
});

test("post-story Wang history is immediately readable, dated, failed and requires no sends", async ({
  page,
}) => {
  const ending = raw.events.find(
    (node: { id: string }) => node.id === "messages-complete-to-explore",
  );
  const { work } = compileStory({
    ...raw,
    id: "wang-history-browser-check",
    events: [{ ...ending, type: "start", conditions: [] }],
  });
  await page.route("**/work.json", (route) => route.fulfill({ json: work }));
  await page.goto("/");
  await unlock(page);
  await page.getByRole("button", { name: "继续探索手机", exact: true }).click();
  await page.getByRole("button", { name: "打开微信", exact: true }).click();
  await page.locator(".wx-chat-row").filter({ hasText: "王橹杰" }).click();
  await expect(page.locator(".wechat-history .skin-message")).toHaveCount(19);
  await expect(page.locator(".history-send-failed")).toHaveCount(19);
  await expect(
    page.getByRole("button", { name: "发送下一条消息", exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "看了你最近的训练", exact: true }),
  ).toBeVisible();
  expect(await page.locator(".history-date").allTextContents()).toEqual([
    "7月27日 00:09",
    "8月13日 16:10",
    "8月17日 23:11",
    "9月27日 09:13",
    "04:41",
  ]);
  await expect(page.locator(".wechat-history .skin-messages")).toHaveCSS(
    "background-color",
    "rgb(237, 237, 237)",
  );
  await page
    .locator(".phone-screen")
    .screenshot({ path: "outputs/mu-phone/wang-history-first.png" });
  await page
    .getByRole("button", { name: "怎么办", exact: true })
    .scrollIntoViewIfNeeded();
  await expect(
    page.getByRole("button", { name: "不想和你分开", exact: true }),
  ).toBeVisible();
  await page
    .locator(".phone-screen")
    .screenshot({ path: "outputs/mu-phone/wang-history-last.png" });
  await page.reload();
  await unlock(page);
  await page.getByRole("button", { name: "打开微信", exact: true }).click();
  await page.locator(".wx-chat-row").filter({ hasText: "王橹杰" }).click();
  await expect(page.locator(".wechat-history .skin-message")).toHaveCount(19);
  await expect(
    page.getByRole("button", { name: "看了你最近的训练", exact: true }),
  ).toBeVisible();
});

test("uploaded images, avatars, album and ordered browser history work with the final app restrictions", async ({
  page,
}) => {
  const ending = raw.events.find(
    (node: { id: string }) => node.id === "messages-complete-to-explore",
  );
  const { work } = compileStory({
    ...raw,
    id: "uploaded-media-browser-check",
    events: [{ ...ending, type: "start", conditions: [] }],
  });
  await page.route("**/work.json", (route) => route.fulfill({ json: work }));
  await page.goto("/");
  await unlock(page);
  await page.getByRole("button", { name: "继续探索手机", exact: true }).click();
  for (const name of ["电话", "文件", "哔哩哔哩", "网易云", "备忘录"])
    await expect(
      page.getByRole("button", { name: "打开" + name, exact: true }),
    ).toHaveCount(0);
  await page.getByRole("button", { name: "打开浏览器", exact: true }).click();
  await expect(page.locator(".native-safari h1")).toHaveText("历史记录");
  expect(
    await page.locator(".safari-search-history strong").allTextContents(),
  ).toEqual(["蓝粉色应援", "王橹杰", "王橹杰舞台", "青岛的机票"]);
  await page.getByRole("button", { name: "返回桌面", exact: true }).click();
  await page.getByRole("button", { name: "打开相册", exact: true }).click();
  await expect(page.locator(".photo-mosaic button")).toHaveCount(11);
  await page.getByRole("button", { name: "查看照片 1", exact: true }).click();
  await expect(page.locator(".native-detail-photos img")).toHaveAttribute(
    "src",
    "./story-assets/album-01.jpg",
  );
  await expect
    .poll(() =>
      page
        .locator(".native-detail-photos img")
        .evaluate((el: HTMLImageElement) => el.naturalWidth),
    )
    .toBe(1448);
  await page
    .locator(".phone-screen")
    .screenshot({ path: "outputs/mu-phone/album-original.png" });
  await page.getByRole("button", { name: "返回桌面", exact: true }).click();
  await page.getByRole("button", { name: "打开微信", exact: true }).click();
  await expect(
    page.locator(".wx-chat-row").filter({ hasText: "穆之友" }).locator("img"),
  ).toHaveAttribute("src", "./story-assets/mu-zhiyou-avatar.jpg");
  await expect(
    page.locator(".wx-chat-row").filter({ hasText: "王橹杰" }).locator("img"),
  ).toHaveAttribute("src", "./story-assets/wang-lujie-avatar.jpg");
  await page
    .locator(".phone-screen")
    .screenshot({ path: "outputs/mu-phone/imported-avatars.png" });
  await page.getByRole("button", { name: "返回桌面", exact: true }).click();
  await page.getByRole("button", { name: "打开微博", exact: true }).click();
  await expect(page.locator(".weibo-author-cover")).toHaveCSS(
    "background-image",
    /story-assets\/weibo-profile\.jpg/,
  );
  await expect(page.locator(".weibo-post")).toHaveCount(5);
  await expect(page.locator(".weibo-post .story-gallery img")).toHaveCount(7);
  await page.locator(".weibo-post").first().locator(".social-body").click();
  await page.getByRole("button", { name: "查看微博原图", exact: true }).click();
  const viewer = page.getByRole("dialog", { name: "微博原图" });
  await expect(viewer.locator("img")).toHaveAttribute(
    "src",
    "./story-assets/weibo-0817-photo-1.jpg",
  );
  await page.getByRole("button", { name: "图片 2", exact: true }).click();
  await expect
    .poll(() =>
      viewer.locator("img").evaluate((el: HTMLImageElement) => el.naturalWidth),
    )
    .toBe(2000);
  await page.getByRole("button", { name: "关闭原图", exact: true }).click();
});

test("matching home wallpaper, owner avatar, left-aligned Weibo names and legible WeChat names", async ({
  page,
}) => {
  const ending = raw.events.find(
    (node: { id: string }) => node.id === "messages-complete-to-explore",
  );
  const { work } = compileStory({
    ...raw,
    id: "visual-revisions-check",
    events: [{ ...ending, type: "start", conditions: [] }],
  });
  await page.route("**/work.json", (route) => route.fulfill({ json: work }));
  await page.goto("/");
  await page.getByRole("button", { name: "轻触解锁", exact: true }).waitFor();
  const background = await page
    .locator(".phone-screen")
    .evaluate((el) => getComputedStyle(el).backgroundImage);
  await unlock(page);
  await page.getByRole("button", { name: "继续探索手机", exact: true }).click();
  await expect(page.locator(".phone-screen")).toHaveCSS(
    "background-image",
    background,
  );
  await expect(page.locator(".wallpaper-orb")).toHaveCount(0);
  await page
    .locator(".phone-screen")
    .screenshot({ path: "outputs/mu-phone/matching-home-wallpaper.png" });
  await page.getByRole("button", { name: "打开微信", exact: true }).click();
  for (const name of ["穆之友", "王橹杰"])
    await expect(
      page.locator(".wx-chat-row").filter({ hasText: name }).locator("strong"),
    ).toHaveCSS("color", "rgb(255, 255, 255)");
  await page.locator(".wx-chat-row").filter({ hasText: "王橹杰" }).click();
  await expect(
    page.locator(".skin-message.outgoing .skin-avatar img").first(),
  ).toHaveAttribute("src", "./story-assets/mu-zhicheng-avatar.jpg");
  await page.getByRole("button", { name: "返回桌面", exact: true }).click();
  await page.getByRole("button", { name: "打开微博", exact: true }).click();
  const post = page.locator(".weibo-post").first();
  const avatar = await post
    .locator(".social-author .catalog-avatar")
    .boundingBox();
  const card = await post.boundingBox();
  expect(avatar && card && avatar.x - card.x).toBeLessThan(20);
  await expect(post.locator(".social-author")).toHaveCSS(
    "justify-content",
    "flex-start",
  );
});
