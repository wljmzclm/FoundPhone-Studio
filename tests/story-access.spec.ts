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
    name: "进入第一章：他来听我的演唱会",
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
    .getByRole("button", { name: "进入第一章：他来听我的演唱会", exact: true })
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

test("Weibo opens Wang Lujie profile with five ordered posts", async ({
  page,
}) => {
  await page.goto("/");
  await unlock(page);
  await page.getByRole("button", { name: "打开微博", exact: true }).click();
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

test("local music opens on gesture, plays in the background and loops the complete upload", async ({
  page,
}) => {
  await page.goto("/");
  await unlock(page);
  await expect(
    page.getByRole("button", { name: "打开网易云音乐", exact: true }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "打开音乐", exact: true }).click();
  const audio = page.locator(".persistent-music audio");
  await expect(page.locator(".persistent-music")).toHaveClass(/active/);
  await expect(page.locator(".persistent-music h1")).toHaveText(
    "多远都要在一起",
  );
  await expect(page.locator(".local-music-artist")).toHaveText("王橹杰");
  await expect(page.locator(".local-music-cover")).toHaveAttribute(
    "src",
    "./story-assets/wang-music-cover.jpg",
  );
  await expect
    .poll(() =>
      audio.evaluate((a: HTMLAudioElement) => !a.paused && a.currentTime > 0.2),
    )
    .toBe(true);
  await expect
    .poll(() => audio.evaluate((a: HTMLAudioElement) => a.duration))
    .toBeGreaterThan(210);
  await audio.evaluate((a) => {
    (a as HTMLAudioElement).dataset.identity = "same-player";
  });
  await page
    .locator(".phone-screen")
    .screenshot({ path: "outputs/mu-phone/local-music.png" });
  const before = await audio.evaluate((a: HTMLAudioElement) => a.currentTime);
  await page
    .locator(".persistent-music")
    .getByRole("button", { name: "返回桌面", exact: true })
    .click();
  await expect(page.locator(".persistent-music")).toHaveClass(/background/);
  await page.getByRole("button", { name: "打开微信", exact: true }).click();
  await expect
    .poll(() => audio.evaluate((a: HTMLAudioElement) => a.currentTime))
    .toBeGreaterThan(before + 0.4);
  await expect(audio).toHaveAttribute("data-identity", "same-player");
  await audio.evaluate((a: HTMLAudioElement) => {
    a.currentTime = a.duration - 0.2;
  });
  await expect
    .poll(() => audio.evaluate((a: HTMLAudioElement) => a.currentTime), {
      timeout: 5000,
    })
    .toBeLessThan(3);
  expect(
    await audio.evaluate((a: HTMLAudioElement) => a.loop && !a.paused),
  ).toBe(true);
  await page.getByRole("button", { name: "返回桌面", exact: true }).click();
  await page.getByRole("button", { name: "打开音乐", exact: true }).click();
  await expect(audio).toHaveAttribute("data-identity", "same-player");
  await page.getByRole("button", { name: "暂停音乐", exact: true }).click();
  expect(await audio.evaluate((a: HTMLAudioElement) => a.paused)).toBe(true);
});

test("Douyin exploration videos remain available without plot gates", async ({
  page,
}) => {
  await page.goto("/");
  await unlock(page);
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
  await expect(
    page.getByRole("button", {
      name: "进入第二章（时光倒流重返16岁）",
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", {
      name: "进入第二章（时光倒流重返16岁）",
      exact: true,
    }),
  ).toBeDisabled();
  await expect(page.getByRole("dialog", { name: "章节选择" })).toHaveCount(0);
  await page
    .locator(".phone-screen")
    .screenshot({ path: "outputs/mu-phone/chapter-two-entry-locked.png" });
  for (const name of [
    "微信",
    "短信",
    "微博",
    "音乐",
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
    .locator(".phone-screen")
    .screenshot({ path: "outputs/mu-phone/chapter-two-choice.png" });
  await page
    .getByRole("button", { name: "继续探索第一章", exact: true })
    .click();
  await expect(page.getByRole("dialog", { name: "章节选择" })).toHaveCount(0);
  await page.reload();
  await unlock(page);
  await expect(page.getByRole("dialog", { name: "章节选择" })).toHaveCount(0);
  await page
    .getByRole("button", {
      name: "章节 · 进入第二章（时光倒流重返16岁）",
      exact: true,
    })
    .click();
  await page
    .getByRole("button", {
      name: "进入第二章（时光倒流重返16岁）",
      exact: true,
    })
    .click();
  await expect(
    page.getByRole("dialog", {
      name: "第二章（时光倒流重返16岁）",
      exact: true,
    }),
  ).toContainText("敬请期待");
  await page.reload();
  await unlock(page);
  await expect(
    page.getByRole("dialog", {
      name: "第二章（时光倒流重返16岁）",
      exact: true,
    }),
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

test("blue-pink introduction presents five chapters before the passcode", async ({
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
    "推荐大家进入章节先点进音乐播放bgm",
  );
  await expect(page.locator(".introduction-tagline")).toContainText(
    "点进来默认橹穆99",
  );
  const chapters = page.locator(".introduction-chapter-grid button");
  await expect(chapters).toHaveCount(5);
  await expect(chapters.nth(1)).toContainText("第二章");
  await expect(chapters.nth(1)).toContainText("十六岁的愿望关于你");
  await expect(chapters.nth(1)).toContainText("王橹杰的手机");
  await expect(page.locator(".story-introduction")).not.toContainText(
    "只有我不知道的事",
  );
  await expect(page.locator(".introduction-guide")).toContainText(
    "人物设定：明星橹 × 素人穆",
  );
  await expect(page.locator(".introduction-guide")).toContainText(
    "橹2026年18岁，穆21岁",
  );
  await expect(page.locator(".introduction-guide")).not.toContainText("困丞");
  await expect(chapters.first()).toBeEnabled();
  for (let i = 1; i < 5; i++) await expect(chapters.nth(i)).toBeDisabled();
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
    "音乐",
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
    page.getByRole("checkbox", { name: "演唱会就是明天！", exact: true }),
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
    .getByRole("checkbox", { name: "演唱会就是明天！", exact: true })
    .click();
  await page.getByRole("checkbox", { name: "灯牌", exact: true }).click();
  await page.reload();
  await unlock(page);
  await page.getByRole("button", { name: "打开提醒事项", exact: true }).click();
  await expect(
    page.getByRole("checkbox", { name: "演唱会就是明天！", exact: true }),
  ).toBeChecked();
  await expect(
    page.getByRole("checkbox", { name: "灯牌", exact: true }),
  ).not.toBeChecked();
});

test("new chapter opens with three lock screen WeChat messages and keeps them in their chats", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .getByRole("button", { name: "进入第一章：他来听我的演唱会", exact: true })
    .click();
  const lock = page.locator(".lock-screen");
  await expect(lock).toBeVisible();
  await expect(lock.locator(".device-notice")).toContainText(
    "妈妈：儿子什么时候放假回重庆呀？",
  );
  await expect(lock.locator(".device-notice")).toContainText(
    "工作消息：@全体成员，下周一开组会。",
    { timeout: 3000 },
  );
  await expect(lock.locator(".device-notice")).toContainText(
    "穆之友：你真要去看他演唱会？",
    { timeout: 3000 },
  );
  await lock.getByRole("button", { name: "3 条通知", exact: true }).click();
  await expect(lock.locator(".device-notice")).toHaveCount(3);
  await page
    .locator(".phone-screen")
    .screenshot({ path: "outputs/mu-phone/lock-opening-messages.png" });
  await unlock(page);
  await page.getByRole("button", { name: "打开微信", exact: true }).click();
  const chats = [
    ["妈妈", "儿子什么时候放假回重庆呀？"],
    ["工作消息", "@全体成员，下周一开组会。"],
    ["穆之友", "你真要去看他演唱会？"],
  ];
  await expect(page.locator(".wx-chat-row")).toHaveCount(3);
  for (const [name, body] of chats) {
    await page.locator(".wx-chat-row").filter({ hasText: name }).click();
    await expect(page.locator(".skin-message .skin-bubble")).toContainText(
      body,
    );
    await page.getByRole("button", { name: "返回", exact: true }).click();
  }
  await page.reload();
  await page
    .getByRole("button", { name: "进入第一章：他来听我的演唱会", exact: true })
    .click();
  await page.getByRole("button", { name: "3 条通知", exact: true }).click();
  await expect(page.locator(".lock-screen .device-notice")).toHaveCount(3);
});
