import { test, expect, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";
import { compileStory } from "../src/story-engine/compiler";
const raw = JSON.parse(readFileSync("stories/template/story.json", "utf8"));
async function unlock(page: Page, pin = "2711") {
  await page
    .locator(".story-introduction, .lock-screen")
    .first()
    .waitFor({ state: "visible" });
  const start = page.getByRole("button", {
    name: "进入第一章：短信爱",
    exact: true,
  });
  if (await start.isVisible()) await start.click();
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
  await page
    .getByRole("button", { name: "进入第一章：短信爱", exact: true })
    .click();
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
  for (const name of ["微信", "短信", "微博", "抖音", "相册"]) {
    await page
      .getByRole("button", { name: "打开" + name, exact: true })
      .click();
    await expect(page.locator(".app-screen:not([inert])")).toBeVisible();
    await page.getByRole("button", { name: "返回桌面", exact: true }).click();
  }
  for (const name of [
    "备忘录",
    "浏览器",
    "哔哩哔哩",
    "App Store",
    "设置",
    "相机",
  ])
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
  ).toHaveCount(1);
});
test("album stays available after ending while deleted apps remain absent", async ({
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
  for (const name of ["相册"])
    await expect(
      page.getByRole("button", { name: "打开" + name, exact: true }),
    ).toHaveCount(1);
  for (const name of ["设置", "文件", "备忘录", "浏览器", "哔哩哔哩"])
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
  await expect(
    page.getByRole("button", { name: "通知中心", exact: true }),
  ).toHaveText("11:27");
  for (const [date, count] of [
    ["0709", 5],
    ["0601", 7],
    ["0320", 6],
  ] as const) {
    const images = page.locator(
      `[data-post-id="wang-lujie-weibo-${date}"] .story-gallery img`,
    );
    await expect(images).toHaveCount(count);
    await expect(images.first()).toHaveAttribute(
      "src",
      `./story-assets/weibo-${date}-original-01.jpg`,
    );
    await expect(images.last()).toHaveAttribute(
      "src",
      `./story-assets/weibo-${date}-original-${String(count).padStart(2, "0")}.jpg`,
    );
  }

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
    "rgb(255, 255, 255)",
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
    "rgb(237, 237, 237)",
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
  for (const name of ["相册"])
    await expect(
      page.getByRole("button", { name: "打开" + name, exact: true }),
    ).toHaveCount(1);
  for (const name of ["设置", "文件", "备忘录", "浏览器", "哔哩哔哩"])
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
  ).toHaveCount(0);
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
    events: [
      { ...ending, type: "start", conditions: [] },
      ...raw.events.filter((e) =>
        [
          "qq-opens-wechat-invite",
          "qq-wechat-invite-delay",
          "add-wang-wechat-friend",
        ].includes(e.id),
      ),
    ],
  });
  await page.route("**/work.json", (route) => route.fulfill({ json: work }));
  await page.goto("/");
  await unlock(page);
  await page.getByRole("button", { name: "继续探索手机", exact: true }).click();
  await page.getByRole("button", { name: "打开微信", exact: true }).click();
  await expect(
    page.locator(".wx-chat-row").filter({ hasText: "王橹杰" }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "返回桌面", exact: true }).click();
  await page.getByRole("button", { name: "打开QQ", exact: true }).click();
  await page.waitForTimeout(5500);
  await page.getByRole("button", { name: "返回桌面", exact: true }).click();
  await page.getByRole("button", { name: "打开微信", exact: true }).click();
  await page.getByRole("button", { name: "微信菜单", exact: true }).click();
  await page.getByRole("menuitem", { name: "添加朋友", exact: true }).click();
  await page
    .getByRole("textbox", { name: "输入微信号" })
    .fill("reflection2711");
  await page.getByRole("button", { name: "添加到通讯录", exact: true }).click();
  await page.getByRole("button", { name: "返回", exact: true }).click();
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

test("uploaded images, avatars and album work with the final app restrictions", async ({
  page,
}) => {
  const ending = raw.events.find(
    (node: { id: string }) => node.id === "messages-complete-to-explore",
  );
  const { work } = compileStory({
    ...raw,
    id: "uploaded-media-browser-check",
    events: [
      { ...ending, type: "start", conditions: [] },
      ...raw.events.filter((e) =>
        [
          "qq-opens-wechat-invite",
          "qq-wechat-invite-delay",
          "add-wang-wechat-friend",
        ].includes(e.id),
      ),
    ],
  });
  await page.route("**/work.json", (route) => route.fulfill({ json: work }));
  await page.goto("/");
  await unlock(page);
  await page.getByRole("button", { name: "继续探索手机", exact: true }).click();
  for (const name of ["文件", "哔哩哔哩", "网易云", "备忘录"])
    await expect(
      page.getByRole("button", { name: "打开" + name, exact: true }),
    ).toHaveCount(0);
  await page.getByRole("button", { name: "打开相册", exact: true }).click();
  await expect(page.locator(".photo-mosaic button")).toHaveCount(40);
  await page
    .getByRole("button", { name: "查看2023年照片 1", exact: true })
    .click();
  await expect(page.locator(".native-detail-photos img")).toHaveAttribute(
    "src",
    "./story-assets/album-2023-01.jpg",
  );
  await expect
    .poll(() =>
      page
        .locator(".native-detail-photos img")
        .evaluate((el: HTMLImageElement) => el.naturalWidth),
    )
    .toBeGreaterThan(0);
  await page
    .locator(".phone-screen")
    .screenshot({ path: "outputs/mu-phone/album-original.png" });
  await page.getByRole("button", { name: "返回桌面", exact: true }).click();
  await page.getByRole("button", { name: "打开微信", exact: true }).click();
  await expect(
    page.locator(".wx-chat-row").filter({ hasText: "穆之友" }).locator("img"),
  ).toHaveAttribute("src", "./story-assets/mu-zhiyou-avatar.jpg");
  await expect(
    page.locator(".wx-chat-row").filter({ hasText: "王橹杰" }),
  ).toHaveCount(0);
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
  await expect(page.locator(".weibo-post .story-gallery img")).toHaveCount(22);
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
    events: [
      { ...ending, type: "start", conditions: [] },
      ...raw.events.filter((e) =>
        [
          "qq-opens-wechat-invite",
          "qq-wechat-invite-delay",
          "add-wang-wechat-friend",
        ].includes(e.id),
      ),
    ],
  });
  await page.route("**/work.json", (route) => route.fulfill({ json: work }));
  await page.goto("/");
  await page
    .getByRole("button", { name: "进入第一章：短信爱", exact: true })
    .click();
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
  await page.getByRole("button", { name: "打开QQ", exact: true }).click();
  await page.waitForTimeout(5500);
  await page.getByRole("button", { name: "返回桌面", exact: true }).click();
  await page.getByRole("button", { name: "打开微信", exact: true }).click();
  await page.getByRole("button", { name: "微信菜单", exact: true }).click();
  await page.getByRole("menuitem", { name: "添加朋友", exact: true }).click();
  await page
    .getByRole("textbox", { name: "输入微信号" })
    .fill("reflection2711");
  await page.getByRole("button", { name: "添加到通讯录", exact: true }).click();
  await page.getByRole("button", { name: "返回", exact: true }).click();
  for (const name of ["穆之友", "王橹杰"])
    await expect(
      page.locator(".wx-chat-row").filter({ hasText: name }).locator("strong"),
    ).toHaveCSS("color", "rgb(17, 17, 17)");
  await expect(page.locator(".wechat-ui")).toHaveAttribute(
    "data-chat-appearance",
    "light",
  );
  await expect(page.locator(".wechat-ui")).toHaveCSS(
    "background-color",
    "rgb(237, 237, 237)",
  );
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

test("Netease opens after unlock and keeps the same player when leaving", async ({
  page,
}) => {
  let loads = 0;
  await page.route("https://music.163.com/outchain/**", (route) => {
    loads++;
    return route.fulfill({
      contentType: "text/html; charset=utf-8",
      body: '<button id="play">播放</button><script>document.querySelector("button").onclick=()=>document.body.dataset.playing="true"</script>',
    });
  });
  await page.goto("/");
  await unlock(page);
  await page
    .getByRole("button", { name: "打开网易云音乐", exact: true })
    .click();
  const player = page.frameLocator('iframe[title="网易云官方音乐播放器"]');
  await player.getByRole("button", { name: "播放", exact: true }).click();
  await page
    .locator(".persistent-netease")
    .getByRole("button", { name: "返回桌面", exact: true })
    .click();
  await expect(page.locator(".persistent-netease")).toHaveClass(/background/);
  await expect(player.locator("body")).toHaveAttribute("data-playing", "true");
  await page.getByRole("button", { name: "打开微信", exact: true }).click();
  await expect(player.locator("body")).toHaveAttribute("data-playing", "true");
  await page.getByRole("button", { name: "返回桌面", exact: true }).click();
  await page
    .getByRole("button", { name: "打开网易云音乐", exact: true })
    .click();
  await expect(page.locator(".persistent-netease")).toHaveClass(/active/);
  expect(loads).toBe(1);
});

test("post-story Douyin links appear in supplied order and preserve story graphic", async ({
  page,
}) => {
  await page.goto("/");
  await unlock(page);
  await page.getByRole("button", { name: "打开抖音", exact: true }).click();
  await expect(page.locator(".douyin-link-feed")).toHaveCount(0);
  const ending = raw.events.find(
    (node: { id: string }) => node.id === "messages-complete-to-explore",
  );
  const { work } = compileStory({
    ...raw,
    id: "douyin-explore-check",
    events: [
      {
        ...ending,
        type: "start",
        conditions: [],
        actions: [
          { type: "unlock", key: "douyin-sms-love", value: true },
          ...ending.actions,
        ],
      },
    ],
  });
  await page.route("**/work.json", (route) => route.fulfill({ json: work }));
  await page.reload();
  await unlock(page);
  await page.getByRole("button", { name: "继续探索手机", exact: true }).click();
  await page.getByRole("button", { name: "打开抖音", exact: true }).click();
  const cards = page.locator(".douyin-link-scroll article");
  await expect(cards).toHaveCount(3);
  await expect(cards.nth(0).locator("strong")).toHaveText("@TF家族");
  await expect(cards.nth(0).locator("a")).toHaveAttribute(
    "href",
    "https://v.douyin.com/_F2ZpBJw3UM/",
  );
  await expect(cards.nth(1).locator("strong")).toHaveText("@TF家族");
  const firstVideo = cards.nth(0).locator("video");
  const secondVideo = cards.nth(1).locator("video");
  await expect(firstVideo).toHaveAttribute(
    "src",
    "./story-assets/douyin-night-dance.mp4",
  );
  await expect(secondVideo).toHaveAttribute(
    "src",
    "./story-assets/douyin-tf-9255.mp4",
  );
  await firstVideo.evaluate((el: HTMLVideoElement) => el.play());
  await expect
    .poll(() => firstVideo.evaluate((el: HTMLVideoElement) => el.currentTime))
    .toBeGreaterThan(0);
  expect(
    await firstVideo.evaluate((el: HTMLVideoElement) => el.duration),
  ).toBeGreaterThan(40);
  await cards.nth(1).scrollIntoViewIfNeeded();
  await expect
    .poll(() => firstVideo.evaluate((el: HTMLVideoElement) => el.paused))
    .toBe(true);
  await secondVideo.evaluate((el: HTMLVideoElement) => el.play());
  await expect
    .poll(() => secondVideo.evaluate((el: HTMLVideoElement) => el.currentTime))
    .toBeGreaterThan(0);
  expect(
    await secondVideo.evaluate((el: HTMLVideoElement) => el.duration),
  ).toBeGreaterThan(16);
  await secondVideo.evaluate((el: HTMLVideoElement) => {
    el.currentTime = 5;
    el.pause();
  });
  await expect
    .poll(() => secondVideo.evaluate((el: HTMLVideoElement) => el.currentTime))
    .toBeGreaterThanOrEqual(5);
  await cards.nth(2).scrollIntoViewIfNeeded();
  const thirdVideo = cards.nth(2).locator("video");
  await expect(thirdVideo).toHaveAttribute(
    "src",
    "./story-assets/douyin-tf-9256.mp4",
  );
  await thirdVideo.evaluate((el: HTMLVideoElement) => el.play());
  await expect
    .poll(() => thirdVideo.evaluate((el: HTMLVideoElement) => el.currentTime))
    .toBeGreaterThan(0);
  expect(
    await thirdVideo.evaluate((el: HTMLVideoElement) => el.duration),
  ).toBeGreaterThan(17);
  await expect(page.locator('video[src*="hello-mask"]')).toHaveCount(0);

  await page.getByRole("button", { name: "查看剧情图文", exact: true }).click();
  await expect(page.locator(".douyin-story")).toBeVisible();
  await page
    .locator(".douyin-story")
    .getByRole("button", { name: "返回", exact: true })
    .click();
  await expect(cards).toHaveCount(3);
  await page.reload();
  await unlock(page);
  await page.getByRole("button", { name: "打开抖音", exact: true }).click();
  await expect(cards).toHaveCount(3);
});

test("MUahahaha has one dated post during and after the main story", async ({
  page,
}) => {
  await page.goto("/");
  await unlock(page);
  await page.getByRole("button", { name: "打开微博", exact: true }).click();
  await page
    .getByRole("navigation", { name: "微博账号" })
    .getByRole("button", { name: "MUahahaha", exact: true })
    .click();
  await expect(page.locator(".weibo-post")).toHaveCount(1);
  await expect(page.locator(".weibo-post .social-body")).toHaveText(
    "因为觉得有点der，所以隔了半个月才发出去一张",
  );
  await expect(page.locator(".weibo-post .social-author small")).toContainText(
    "2024-12-19",
  );
  await expect(page.locator(".mu-weibo-cover header")).toContainText(
    "访问量 2711",
  );
  await expect(page.locator(".mu-weibo-stats")).toHaveText(
    "1 粉丝1 关注1 转评赞",
  );
  await expect(page.locator(".weibo-simple-profile .lucide-crown")).toHaveCount(
    0,
  );
  await expect(page.locator(".weibo-post .lucide-crown")).toHaveCount(0);
  await expect(page.locator(".weibo-super-topic")).toHaveCount(0);
  await page.getByRole("button", { name: "查看关注", exact: true }).click();
  await expect(page.locator(".mu-weibo-follow-row")).toHaveCount(1);
  await expect(page.locator(".mu-weibo-follow-row")).toContainText(
    "TF家族-王橹杰LJW",
  );
  await page.locator(".mu-weibo-follow-row").click();
  await expect(page.locator(".weibo-post")).toHaveCount(5);
  await page
    .getByRole("navigation", { name: "微博账号" })
    .getByRole("button", { name: "MUahahaha", exact: true })
    .click();
  const photo = page.locator(".weibo-post .story-gallery img");
  await expect(photo).toHaveAttribute(
    "src",
    "./story-assets/muahahaha-20241219.jpg",
  );
  await expect
    .poll(() => photo.evaluate((el: HTMLImageElement) => el.naturalWidth))
    .toBe(3600);
  await page
    .getByRole("button", { name: "查看微博：因为觉得有点der", exact: true })
    .click();
  await page.getByRole("button", { name: "查看微博原图", exact: true }).click();
  await expect(
    page.getByRole("dialog", { name: "微博原图" }).locator("img"),
  ).toHaveAttribute("src", "./story-assets/muahahaha-20241219.jpg");
  await page.getByRole("button", { name: "关闭原图", exact: true }).click();
  await page
    .locator(".weibo-post-detail")
    .getByRole("button", { name: "返回帖子列表", exact: true })
    .click();
  await expect(page.locator(".mu-weibo-cover > img")).toHaveAttribute(
    "src",
    "./story-assets/muahahaha-cover.jpg",
  );
  await page.locator(".weibo-author-page .catalog-scroll").evaluate((el) => {
    el.scrollTop = 0;
  });
  await page
    .locator(".phone-screen")
    .screenshot({ path: "outputs/mu-phone/muahahaha-weibo.png" });

  await page
    .getByRole("navigation", { name: "微博账号" })
    .getByRole("button", { name: "TF家族-王橹杰LJW", exact: true })
    .click();
  await expect(page.locator(".weibo-post")).toHaveCount(5);
  const ending = raw.events.find(
    (node: { id: string }) => node.id === "messages-complete-to-explore",
  );
  const { work } = compileStory({
    ...raw,
    id: "mu-weibo-explore",
    events: [
      { ...ending, type: "start", conditions: [] },
      ...raw.events.filter((e) =>
        [
          "qq-opens-wechat-invite",
          "qq-wechat-invite-delay",
          "add-wang-wechat-friend",
        ].includes(e.id),
      ),
    ],
  });
  await page.route("**/work.json", (route) => route.fulfill({ json: work }));
  await page.reload();
  await unlock(page);
  await page.getByRole("button", { name: "继续探索手机", exact: true }).click();
  await page.getByRole("button", { name: "打开微博", exact: true }).click();
  await page
    .getByRole("navigation", { name: "微博账号" })
    .getByRole("button", { name: "MUahahaha", exact: true })
    .click();
  await expect(page.locator(".weibo-post")).toHaveCount(1);
});

test("chapter choice waits for ending and all twelve apps, and can be deferred", async ({
  page,
}) => {
  const { work } = compileStory({
    ...raw,
    id: "chapter-entry-check",
    events: [
      {
        id: "chapter-test-ending",
        label: "章节入口测试",
        type: "event",
        event: "openApp",
        target: "douyin",
        actions: [{ type: "ending", key: "", value: "第一章主线结束" }],
      },
    ],
  });
  await page.route("**/work.json", (route) => route.fulfill({ json: work }));
  await page.route("https://music.163.com/**", (route) =>
    route.fulfill({ body: "player" }),
  );
  await page.route("https://player.bilibili.com/**", (route) =>
    route.fulfill({ body: "player" }),
  );
  await page.goto("/");
  await unlock(page);
  await expect(page.getByRole("dialog", { name: "章节选择" })).toHaveCount(0);
  await page.getByRole("button", { name: "打开抖音", exact: true }).click();
  await page.getByRole("button", { name: "继续探索手机", exact: true }).click();
  await expect(page.getByRole("dialog", { name: "章节选择" })).toHaveCount(0);
  for (const name of [
    "微信",
    "短信",
    "微博",
    "网易云音乐",
    "电话",
    "淘宝",
    "天气",
    "日历",
    "QQ",
    "提醒事项",
  ]) {
    await page
      .getByRole("button", { name: "打开" + name, exact: true })
      .click();
    await page
      .getByRole("button", { name: "返回桌面", exact: true })
      .last()
      .click();
    await expect(page.getByRole("dialog", { name: "章节选择" })).toHaveCount(0);
  }
  await page.getByRole("button", { name: "打开相册", exact: true }).click();
  await expect(page.getByRole("dialog", { name: "章节选择" })).toHaveCount(0);
  await page.getByRole("button", { name: "返回桌面", exact: true }).click();
  await expect(page.getByRole("dialog", { name: "章节选择" })).toBeVisible();
  await page
    .getByRole("button", { name: "继续探索第一章", exact: true })
    .click();
  await expect(page.getByRole("dialog", { name: "章节选择" })).toHaveCount(0);
  await page.reload();
  await unlock(page);
  await expect(page.getByRole("dialog", { name: "章节选择" })).toHaveCount(0);
  await page
    .getByRole("button", { name: "章节 · 进入第二章", exact: true })
    .click();
  await page.getByRole("button", { name: "进入第二章", exact: true }).click();
  await expect(
    page.getByRole("dialog", { name: "第二章", exact: true }),
  ).toContainText("敬请期待");
  await page.reload();
  await unlock(page);
  await expect(
    page.getByRole("dialog", { name: "第二章", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "返回第一章", exact: true }).click();
  await page.getByRole("button", { name: "打开微博", exact: true }).click();
  await expect(page.locator(".weibo-post")).toHaveCount(5);
});

test("phone replaces dock Douyin in saved layouts and plays the unavailable-number recording", async ({
  page,
}) => {
  const { work } = compileStory(raw);
  const oldLayout = {
    version: 1,
    workId: work.id,
    previewLayoutRevision: 0,
    apps: work.apps
      .filter((a) => a.id !== "phone")
      .map((a) =>
        a.id === "douyin"
          ? { ...a, dock: true }
          : ["taobao", "weather"].includes(a.id)
            ? { ...a, installed: false, visible: false }
            : a,
      ),
    widgets: [],
    order: [],
    cleared: [],
    positions: {},
  };
  await page.addInitScript((layout) => {
    const key = "foundphone-layout-v1:" + layout.workId;
    if (!localStorage.getItem(key))
      localStorage.setItem(key, JSON.stringify(layout));
  }, oldLayout);
  await page.goto("/");
  await unlock(page);
  const dock = page.locator(".interactive-home .dock");
  for (const name of ["淘宝", "天气"])
    await expect(
      page.getByRole("button", { name: "打开" + name, exact: true }),
    ).toBeVisible();
  await expect(
    dock.getByRole("button", { name: "打开抖音", exact: true }),
  ).toHaveCount(0);
  await expect(
    dock.getByRole("button", { name: "打开电话", exact: true }),
  ).toBeVisible();
  await expect(dock.locator("[data-app-id]").last()).toHaveAttribute(
    "data-app-id",
    "phone",
  );
  await expect(
    page.getByRole("button", { name: "打开抖音", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "打开电话", exact: true }).click();
  await page.getByRole("button", { name: "拨打王橹杰", exact: true }).click();
  await expect(page.locator(".unavailable-call h2")).toHaveText("王橹杰");
  await expect(page.locator(".unavailable-call")).toContainText(
    "您拨打的号码是空号",
  );
  const audio = page.locator('audio[aria-label="空号提示音"]');
  await expect
    .poll(() => audio.evaluate((el: HTMLAudioElement) => el.currentTime))
    .toBeGreaterThan(0);
  expect(
    await audio.evaluate((el: HTMLAudioElement) => el.duration),
  ).toBeGreaterThan(4);
  await page
    .locator(".phone-screen")
    .screenshot({ path: "outputs/mu-phone/unavailable-call.png" });
  await page.getByRole("button", { name: "静音", exact: true }).click();
  await expect
    .poll(() => audio.evaluate((el: HTMLAudioElement) => el.muted))
    .toBe(true);
  await page.getByRole("button", { name: "结束通话", exact: true }).click();
  await expect
    .poll(() => audio.evaluate((el: HTMLAudioElement) => el.paused))
    .toBe(true);
  await expect(
    page.getByRole("button", { name: "拨打王橹杰", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "返回桌面", exact: true }).click();
  await page.reload();
  await unlock(page);
  await expect(
    dock.getByRole("button", { name: "打开电话", exact: true }),
  ).toBeVisible();
  await expect(
    dock.getByRole("button", { name: "打开抖音", exact: true }),
  ).toHaveCount(0);
});

test("blue-pink introduction presents six chapters before the passcode", async ({
  page,
}) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", {
      level: 1,
      name: "命中注定我爱你",
      exact: true,
    }),
  ).toBeVisible();
  await expect(page).toHaveTitle("命中注定我爱你");
  await expect(page.locator(".lock-screen")).toHaveCount(0);
  await expect(page.locator(".introduction-guide")).toContainText(
    "需根据弹窗进行剧情，剧情结束后可继续探索手机，了解更多橹穆的故事。",
  );
  await expect(page.locator(".introduction-note")).toContainText(
    "大家进入新的章节需先点进网易云播放音乐",
  );
  await expect(page.locator(".introduction-tagline")).toContainText(
    "点进来默认橹穆99",
  );
  const chapters = page.locator(".introduction-chapter-grid button");
  await expect(chapters).toHaveCount(6);
  await expect(chapters.first()).toBeEnabled();
  for (let i = 1; i < 6; i++) await expect(chapters.nth(i)).toBeDisabled();
  await page.screenshot({
    path: "outputs/mu-phone/introduction-desktop.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          document.querySelector(".story-runtime")!.scrollWidth <=
          window.innerWidth,
      ),
    )
    .toBe(true);
  await page.screenshot({
    path: "outputs/mu-phone/introduction-mobile.png",
    fullPage: true,
  });
  await chapters.first().click();
  await expect(page.locator(".lock-screen")).toBeVisible();
  await unlock(page);
  await expect(
    page.getByRole("button", { name: "打开电话", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "返回说明与章节", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "命中注定我爱你", exact: true }),
  ).toBeVisible();
  await page.reload();
  await expect(page.locator(".story-introduction")).toBeVisible();
});

test("Taobao purchase records and every installed app are available before main story completion", async ({
  page,
}) => {
  await page.goto("/");
  await unlock(page);
  for (const name of [
    "微信",
    "短信",
    "微博",
    "抖音",
    "网易云音乐",
    "电话",
    "相册",
    "淘宝",
    "天气",
    "日历",
  ])
    await expect(
      page.getByRole("button", { name: "打开" + name, exact: true }),
    ).toBeVisible();
  for (const name of ["浏览器", "哔哩哔哩"])
    await expect(
      page.getByRole("button", { name: "打开" + name, exact: true }),
    ).toHaveCount(0);
  await expect(page.locator(".story-overlay.ending")).toHaveCount(0);
  await page.getByRole("button", { name: "打开淘宝", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "购买记录", exact: true }),
  ).toBeVisible();
  const records = page.locator(".taobao-purchase-record");
  await expect(records).toHaveCount(2);
  await expect(records.nth(0).locator("img")).toHaveAttribute(
    "src",
    "./story-assets/taobao-order-lights.jpg",
  );
  await expect(records.nth(0).locator("img")).toHaveAttribute("alt", /135.9/);
  await expect(records.nth(1).locator("img")).toHaveAttribute(
    "src",
    "./story-assets/taobao-order-sign.jpg",
  );
  await expect(records.nth(1).locator("img")).toHaveAttribute("alt", /355/);
  await expect
    .poll(() =>
      records
        .first()
        .locator("img")
        .evaluate((el: HTMLImageElement) => el.naturalWidth),
    )
    .toBe(1320);
  await page
    .locator(".phone-screen")
    .screenshot({ path: "outputs/mu-phone/taobao-records.png" });
  await records.nth(1).getByRole("button").click();
  await expect(page.locator(".app-screen")).toContainText("四字灯牌套餐");
});

test("August weather has daytime Chongqing Qingdao and Beijing before story ending", async ({
  page,
}) => {
  await page.goto("/");
  await unlock(page);
  await page.getByRole("button", { name: "打开天气", exact: true }).click();
  await expect(page.locator(".calibrated-weather")).toHaveAttribute(
    "data-daytime",
    "true",
  );
  await expect(page.locator(".weather-native-current h1")).toHaveText("重庆");
  await expect(page.locator(".weather-native-current output")).toHaveText(
    "34°",
  );
  await expect(page.locator(".weather-native-current")).toContainText(
    "8月 · 暑假天气",
  );
  await page
    .locator(".phone-screen")
    .screenshot({ path: "outputs/mu-phone/weather-chongqing.png" });
  await page.getByRole("button", { name: "切换城市青岛", exact: true }).click();
  await expect(page.locator(".weather-native-current h1")).toHaveText("青岛");
  await expect(page.locator(".weather-native-current output")).toHaveText(
    "28°",
  );
  await page.getByRole("button", { name: "城市列表", exact: true }).click();
  await expect(page.locator(".weather-city-row")).toHaveCount(3);
  await page.locator(".weather-city-row").filter({ hasText: "北京" }).click();
  await expect(page.locator(".weather-native-current h1")).toHaveText("北京");
  await expect(page.locator(".weather-native-current output")).toHaveText(
    "32°",
  );
  await page.reload();
  await unlock(page);
  await page.getByRole("button", { name: "打开天气", exact: true }).click();
  await expect(page.locator(".weather-native-current h1")).toHaveText("北京");
});

test("chapter one Messages and WeChat use readable daytime chat backgrounds", async ({
  page,
}) => {
  const intro = structuredClone(raw);
  const firstSms = intro.content.messages.find(
    (item: { id: string }) => item.id === "first-lemon-sms",
  );
  firstSms.hidden = false;
  const { work } = compileStory({
    ...intro,
    id: "daytime-chat-check",
    events: [],
  });
  await page.route("**/work.json", (route) => route.fulfill({ json: work }));
  await page.goto("/");
  await unlock(page);
  await page.getByRole("button", { name: "打开短信", exact: true }).click();
  const sms = page.locator(".native-messages");
  await expect(sms).toHaveAttribute("data-chat-appearance", "light");
  await expect(sms).toHaveCSS("background-color", "rgb(255, 255, 255)");
  await expect(
    sms.locator(".catalog-message:not(.outgoing) > button").first(),
  ).toHaveCSS("color", "rgb(17, 17, 17)");
  await page
    .locator(".phone-screen")
    .screenshot({ path: "outputs/mu-phone/daytime-messages.png" });
  await page.getByRole("button", { name: "返回桌面", exact: true }).click();
  await page.getByRole("button", { name: "打开微信", exact: true }).click();
  await expect(page.locator(".wx-chat-row strong").first()).toHaveCSS(
    "color",
    "rgb(17, 17, 17)",
  );
  await page.locator(".wx-chat-row").filter({ hasText: "穆之友" }).click();
  await expect(page.locator(".skin-messages")).toHaveCSS(
    "background-color",
    "rgb(237, 237, 237)",
  );
  await expect(page.locator(".wx-nav strong")).toHaveCSS(
    "color",
    "rgb(17, 17, 17)",
  );
  await page
    .locator(".phone-screen")
    .screenshot({ path: "outputs/mu-phone/daytime-wechat.png" });
});

test("first WeChat screenshot send shows and opens the daytime SMS picture", async ({
  page,
}) => {
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
  await page
    .locator(".device-banner")
    .filter({ hasText: "有信息需发送" })
    .click();
  await page.locator(".wx-chat-row").filter({ hasText: "穆之友" }).click();
  await expect(page.locator('[data-message-id="mu-sms-shot"]')).toHaveCount(0);
  await page
    .getByRole("button", { name: "发送下一条消息", exact: true })
    .click();
  const picture = page.locator(
    '[data-message-id="mu-sms-shot"] .skin-bubble img',
  );
  await expect(picture).toHaveAttribute(
    "src",
    "./story-assets/mu-shared-sms-day.png",
  );
  await expect
    .poll(() => picture.evaluate((el: HTMLImageElement) => el.naturalHeight))
    .toBeGreaterThan(1000);
  await picture.click();
  await expect(page.locator(".chat-evidence-overlay > img")).toHaveAttribute(
    "src",
    "./story-assets/mu-shared-sms-day.png",
  );
  await page.getByRole("button", { name: "关闭图片", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "？谁发的这么抽象", exact: true }),
  ).toBeVisible({ timeout: 6000 });
});

test("calendar repeats Wang birthdays from 2023 and marks only the 2025 public day", async ({
  page,
}) => {
  await page.goto("/");
  await unlock(page);
  await page.getByRole("button", { name: "打开日历", exact: true }).click();
  const input = page.locator('input[aria-label="跳转日期"]');
  await input.fill("2022-01-08");
  await expect(page.locator(".calendar-event")).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "2022-01-08", exact: true }).locator("i"),
  ).toHaveCount(0);
  for (const year of [2023, 2026, 2035]) {
    await input.fill(`${year}-01-08`);
    await expect(page.locator(".calendar-event")).toHaveCount(1);
    await expect(page.locator(".calendar-event")).toContainText("王橹杰生日");
    await expect(
      page
        .getByRole("button", { name: `${year}-01-08`, exact: true })
        .locator("i"),
    ).toHaveCount(1);
  }
  await input.fill("2025-10-06");
  await expect(page.locator(".calendar-event")).toHaveCount(1);
  await expect(page.locator(".calendar-event")).toContainText("王橹杰公开日");
  await page
    .locator(".phone-screen")
    .screenshot({ path: "outputs/mu-phone/calendar-public-day.png" });
  await input.fill("2026-10-06");
  await expect(page.locator(".calendar-event")).toHaveCount(0);
  await page
    .getByRole("button", { name: "王橹杰生日 每年1月8日 · 2023年起" })
    .click();
  await expect(page.locator(".calendar-event")).toContainText("王橹杰生日");
});

test("QQ records use supplied avatars and invite an exact WeChat friend after five seconds", async ({
  page,
}) => {
  const { work } = compileStory({
    ...raw,
    events: raw.events.filter((e) =>
      [
        "qq-opens-wechat-invite",
        "qq-wechat-invite-delay",
        "add-wang-wechat-friend",
      ].includes(e.id),
    ),
  });
  await page.route("**/work.json", (route) => route.fulfill({ json: work }));
  await page.goto("/");
  await unlock(page);
  await page.getByRole("button", { name: "打开微信", exact: true }).click();
  await expect(page.locator(".wx-chat-row")).toHaveCount(1);
  await expect(page.locator(".wx-chat-row")).toContainText("穆之友");
  await page.getByRole("button", { name: "微信菜单", exact: true }).click();
  await page.getByRole("menuitem", { name: "添加朋友", exact: true }).click();
  await page
    .getByRole("textbox", { name: "输入微信号" })
    .fill("reflection2711");
  await page.getByRole("button", { name: "添加到通讯录", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("暂未收到");
  await page.getByRole("button", { name: "返回桌面", exact: true }).click();
  await page.getByRole("button", { name: "打开QQ", exact: true }).click();
  await expect(page.locator(".qq-profile-bar img")).toHaveAttribute(
    "src",
    "./story-assets/qq-mu-avatar.jpg",
  );
  await page.locator(".catalog-chat").filter({ hasText: "困困" }).click();
  await expect(page.locator(".qq-native-message")).toHaveCount(12);
  await expect(
    page.locator(".qq-native-message:not(.outgoing) img").first(),
  ).toHaveAttribute("src", "./story-assets/qq-kunkun-avatar.jpg");
  await expect(
    page.locator(".qq-native-message.outgoing img").first(),
  ).toHaveAttribute("src", "./story-assets/qq-mu-avatar.jpg");
  await page
    .locator(".phone-screen")
    .screenshot({ path: "outputs/mu-phone/qq-kunkun.png" });
  await expect(
    page
      .locator(".device-banner")
      .filter({ hasText: "有好友需要添加，微信号 reflection2711" }),
  ).toBeVisible({ timeout: 8000 });
  await page
    .locator(".device-banner")
    .filter({ hasText: "reflection2711" })
    .click();
  await page.getByRole("button", { name: "微信菜单", exact: true }).click();
  await page.getByRole("menuitem", { name: "添加朋友", exact: true }).click();
  await page.getByRole("textbox", { name: "输入微信号" }).fill("wrong");
  await page.getByRole("button", { name: "添加到通讯录", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("未找到");
  await page
    .getByRole("textbox", { name: "输入微信号" })
    .fill("reflection2711");
  await page.getByRole("button", { name: "添加到通讯录", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("已添加王橹杰");
  await page
    .locator(".phone-screen")
    .screenshot({ path: "outputs/mu-phone/wechat-add-friend.png" });
  await page.getByRole("button", { name: "查看好友", exact: true }).click();
  await expect(page.locator(".wechat-history .skin-message")).toHaveCount(19);
  await page.reload();
  await unlock(page);
  await page.getByRole("button", { name: "打开微信", exact: true }).click();
  await expect(
    page.locator(".wx-chat-row").filter({ hasText: "王橹杰" }),
  ).toHaveCount(1);
});

test("album time sections replace all retired photos and preserve the forty originals by year", async ({
  page,
}) => {
  await page.goto("/");
  await unlock(page);
  await page.getByRole("button", { name: "打开相册", exact: true }).click();
  const counts = { "2023": 5, "2024": 6, "2025": 4, "2026": 25 };
  await expect(page.locator(".photo-year-section")).toHaveCount(4);
  await expect(page.locator(".photo-mosaic button")).toHaveCount(40);
  expect(
    await page.locator(".photo-year-section h2").allTextContents(),
  ).toEqual(["2023年", "2024年", "2025年", "2026年"]);
  for (const [year, count] of Object.entries(counts)) {
    const section = page.locator(`[data-photo-year="${year}"]`);
    await expect(section.locator(".photo-mosaic button")).toHaveCount(count);
    for (const src of await section
      .locator("img")
      .evaluateAll((imgs) => imgs.map((img) => img.getAttribute("src"))))
      expect(src).toContain(`album-${year}-`);
    await page
      .getByRole("navigation", { name: "按年份查看照片" })
      .getByRole("button", { name: year + "年", exact: true })
      .click();
    await expect(page.locator(".photo-year-section")).toHaveCount(1);
    await expect(page.locator(".photo-mosaic button")).toHaveCount(count);
    await page
      .getByRole("button", { name: `查看${year}年照片 1`, exact: true })
      .click();
    const original = page.locator(".native-detail-photos img");
    await expect(original).toHaveAttribute(
      "src",
      `./story-assets/album-${year}-01.jpg`,
    );
    await expect
      .poll(() =>
        original.evaluate((img: HTMLImageElement) => img.naturalWidth),
      )
      .toBeGreaterThan(0);
    await page.getByRole("button", { name: "返回", exact: true }).click();
    await page
      .getByRole("navigation", { name: "按年份查看照片" })
      .getByRole("button", { name: "全部", exact: true })
      .click();
  }
  await page
    .getByRole("navigation", { name: "按年份查看照片" })
    .getByRole("button", { name: "2024年", exact: true })
    .click();
  await page
    .getByRole("button", { name: "查看2024年照片 6", exact: true })
    .click();
  await expect(page.locator(".native-detail-photos img")).toHaveAttribute(
    "src",
    "./story-assets/album-2024-06.jpg",
  );
  await page.getByRole("button", { name: "返回", exact: true }).click();
  await page
    .locator(".phone-screen")
    .screenshot({ path: "outputs/mu-phone/album-2024.png" });
  await page
    .getByRole("navigation", { name: "按年份查看照片" })
    .getByRole("button", { name: "全部", exact: true })
    .click();
  await page
    .locator(".phone-screen")
    .screenshot({ path: "outputs/mu-phone/album-timeline.png" });
  await page.reload();
  await unlock(page);
  await page.getByRole("button", { name: "打开相册", exact: true }).click();
  await expect(page.locator(".photo-mosaic button")).toHaveCount(40);
});

test("concert reminders match the supplied completed states and persist player changes", async ({
  page,
}) => {
  await page.goto("/");
  await unlock(page);
  await page.getByRole("button", { name: "打开提醒事项", exact: true }).click();
  await expect(page.locator(".native-reminders h1")).toHaveText("重要‼");
  await expect(page.getByRole("checkbox")).toHaveCount(9);
  await expect(page.getByRole("checkbox", { checked: true })).toHaveCount(8);
  await expect(
    page.getByRole("checkbox", { name: "演唱会就是今天！", exact: true }),
  ).not.toBeChecked();
  for (const title of [
    "灯牌",
    "应援棒",
    "电池",
    "相机",
    "支架",
    "换洗衣服",
    "洗漱用品",
    "充电器",
  ]) {
    await expect(
      page.getByRole("checkbox", { name: title, exact: true }),
    ).toBeChecked();
  }
  await page
    .locator(".phone-screen")
    .screenshot({ path: "outputs/mu-phone/concert-reminders.png" });
  await page
    .getByRole("checkbox", { name: "演唱会就是今天！", exact: true })
    .click();
  await page.getByRole("checkbox", { name: "灯牌", exact: true }).click();
  await page.reload();
  await unlock(page);
  await page.getByRole("button", { name: "打开提醒事项", exact: true }).click();
  await expect(
    page.getByRole("checkbox", { name: "演唱会就是今天！", exact: true }),
  ).toBeChecked();
  await expect(
    page.getByRole("checkbox", { name: "灯牌", exact: true }),
  ).not.toBeChecked();
});
