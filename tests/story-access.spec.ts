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
  for (const name of [
    "备忘录",
    "相册",
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
  ).toHaveCount(0);
});
test("only a completed ending opens exploration apps; continuation and save survive reload", async ({
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
  await page.route("https://player.bilibili.com/**", (route) =>
    route.fulfill({
      contentType: "text/html; charset=utf-8",
      body: "<button>播放视频</button>",
    }),
  );
  await page.getByRole("button", { name: "打开哔哩哔哩", exact: true }).click();
  await expect(
    page.locator('iframe[title="哔哩哔哩官方视频播放器"]'),
  ).toHaveAttribute(
    "src",
    "https://player.bilibili.com/player.html?bvid=BV1h1kcBfEuJ&page=1&autoplay=0",
  );
  await expect(
    page
      .frameLocator('iframe[title="哔哩哔哩官方视频播放器"]')
      .getByRole("button", { name: "播放视频" }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "在哔哩哔哩打开 ↗" }),
  ).toHaveAttribute("href", "https://www.bilibili.com/video/BV1h1kcBfEuJ/");
  await page.getByRole("button", { name: "返回桌面", exact: true }).click();
  await page.getByRole("button", { name: "打开相册", exact: true }).click();
  await expect(page.locator(".app-screen:not([inert])")).toBeVisible();
  await page.getByRole("button", { name: "返回桌面", exact: true }).click();
  for (const name of ["相册", "浏览器", "哔哩哔哩"])
    await expect(
      page.getByRole("button", { name: "打开" + name, exact: true }),
    ).toHaveCount(1);
  for (const name of ["设置", "电话", "文件", "备忘录"])
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
  for (const name of ["相册", "浏览器", "哔哩哔哩"])
    await expect(
      page.getByRole("button", { name: "打开" + name, exact: true }),
    ).toHaveCount(1);
  for (const name of ["设置", "电话", "文件", "备忘录"])
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
  await expect(cards).toHaveCount(2);
  await expect(cards.nth(0).locator("strong")).toHaveText("@TF家族");
  await expect(cards.nth(0).locator("a")).toHaveAttribute(
    "href",
    "https://v.douyin.com/_F2ZpBJw3UM/",
  );
  await expect(cards.nth(1).locator("strong")).toHaveText("@穆祉丞");
  await expect(cards.nth(1).locator("a")).toHaveAttribute(
    "href",
    "https://v.douyin.com/UGtriLMpDd8/",
  );
  const firstVideo = cards.nth(0).locator("video");
  const secondVideo = cards.nth(1).locator("video");
  await expect(firstVideo).toHaveAttribute(
    "src",
    "./story-assets/douyin-night-dance.mp4",
  );
  await expect(secondVideo).toHaveAttribute(
    "src",
    "./story-assets/douyin-hello-mask.mp4",
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
  ).toBeGreaterThan(11);
  await secondVideo.evaluate((el: HTMLVideoElement) => {
    el.currentTime = 5;
    el.pause();
  });
  await expect
    .poll(() => secondVideo.evaluate((el: HTMLVideoElement) => el.currentTime))
    .toBeGreaterThanOrEqual(5);
  await expect(cards.nth(1).locator("a")).toBeVisible();
  await page.getByRole("button", { name: "查看剧情图文", exact: true }).click();
  await expect(page.locator(".douyin-story")).toBeVisible();
  await page
    .locator(".douyin-story")
    .getByRole("button", { name: "返回", exact: true })
    .click();
  await expect(cards).toHaveCount(2);
  await page.reload();
  await unlock(page);
  await page.getByRole("button", { name: "打开抖音", exact: true }).click();
  await expect(cards).toHaveCount(2);
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
    events: [{ ...ending, type: "start", conditions: [] }],
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
