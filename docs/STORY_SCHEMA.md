# 剧情脚本 v1

机器可读规范：schemas/story.schema.json。权威校验器：src/story-engine/compiler.ts，输出继续使用现有 Work formatVersion1，不更换运行时结构。

|字段|用途|
|---|---|
|scriptVersion/id/title/revision|脚本版本1、稳定作品ID、标题、正整数内容修订号|
|description/phone|简介；机主owner、date、time、passcode、wallpaper、theme等|
|installedApps|注册 App ID，或完整 App 配置（名称、图标、文件夹、Dock、visible、installed）；顺序即桌面顺序|
|contacts|id、name、phone、avatar、bio；owner 保留给机主|
|chats|稳定会话id、app、title、participants、messages；消息需要id/body，可带senderId、time、media、kind等|
|content|按 App ID 保存 Item 数组；记录id/title/body/time、hidden、password、unlock、folder、meta等|
|variables|字符串/数字/布尔初值|
|events|节点id/label/type/event/target、conditions、actions、next、delayMs；参见原 WORK_FORMAT|
|tests|name、steps、ending、expectUnlocked；所有ending节点至少一个通过的实际引擎路径|

`phone.lockWallpaper` 可设置内嵌或作品内 PNG/JPEG/WebP 锁屏图片；不设置时沿用主题壁纸。`phone.appAccess` 可配置 `duringStory`（剧情中可用 App ID）与 `afterEnding`（到达结局后额外开放的 App ID）；两组中的 App 都应包含在 `installedApps`。未配置权限的旧故事保持原有自由安装与探索行为。

点击发送的预设消息使用 `hidden: true`、`outgoing: true`（聊天中可通过 `senderId: "owner"` 设置），并在 meta 中设置 `sendOnTap: "true"`、`sendPhase`（匹配变量 storyPhase）、可选的 `sendAfter`（前置消息 ID）。只有前置消息已解锁、阶段匹配时输入框才允许发送；点击发出 `sendMessage` 事件，target 为该消息 ID。事件节点须显式 unlock 该消息，并通过 delay 节点依次解锁自动回复。后续发送以最后一条自动回复为前置；读消息不会代替点击发送。剧情测试支持 `event: "sendMessage"`，并检查当前是否可发送，防止跳过对话顺序。

尚未写完的剧情片段可在 tests 中省略 ending，使用 `expectNotifications` 检查实际通知或 `expectUnlocked` 检查解锁内容。每个测试必须有至少一项结果断言；这不会取代已有结局的通关测试。通知格式如 `微博：某位博主发布了新的微博`，点击通知会打开匹配名称的 App。

各ID全局唯一且稳定；不要使用随机UUID。默认值由编译器补齐，未知字段拒绝，不会执行脚本。时间线使用 time 事件、delay节点及 date/time动作；来电使用call动作，接听callAnswered。条件使用变量以及 read:/visited:/unlocked:/completed:/clue:/ui: 等原引擎作用域。unlock动作解锁隐藏内容；password是内容密码，测试read前必须提供正确password。玩家选择用choice节点的next或choice动作关联目标节点。商店/账单/社交/通话/日历使用对应 App 的content与meta字段，详见APP_DEVELOPMENT.md。

测试step支持event/target、password、advanceMs、choose。测试是指定路径的可达性证据，不是对任意用户自定义条件的数学穷举证明。未知密码、隐藏内容、悬空引用、无测试结局会失败。

媒体支持 safeMedia 允许的内嵌 data URL，或 `./story-assets/文件名.jpg` 形式的作品内图片。作品图片放在 public/story-assets，文件名仅使用英文字母、数字、短横线或下划线，图片扩展名为 png/jpg/jpeg/webp/gif，视频扩展名为 mp4/webm，音频扩展名为 m4a（锁屏仍仅支持图片）；不允许路径穿越、查询参数、远程地址或 SVG。禁止HTML/JS脚本；富文本为安全结构化JSON。作品脚本是公开静态数据，谜题密码不属于安全保密机制。

默认空白模板：stories/blank/story.json。引擎回归样例位于tests/fixtures/story-example，不作为内置作品。自然语言原稿：tests/fixtures/story-example/STORY.md。只改故事数据就能改变手机内容。

`phone.chapterTransition` 可选配置 `currentTitle`、`nextTitle` 与 `requiredApps`。主线结局已关闭后，桌面显示章节入口（尚未访问全部指定 App 时禁用，并显示探索进度）；所有指定 App 均已访问后，回到桌面显示章节选择；暂缓选择后保留桌面入口。下一章尚未配置剧情时仅显示章节预告，不清空第一章存档。选择状态保存在手机 UI 存档中。

`phone.introduction` 可选配置开场说明页：`title`、`guide`、`note`、`tagline` 与 `chapters`（每项 `title`，可选 `subtitle`）。每次打开链接首先显示说明页，点击第一章进入原有手机和存档，后续章节暂标待开启。未配置的作品沿用直接打开手机的行为。

`phone.chatAppearance` 可选设为 `light`/`dark`，用于聊天应用的昼夜外观。第一章设置为 light，信息使用白底灰/蓝气泡，微信使用浅灰背景与白/绿气泡，不修改聊天内容或图文附件。

日历 Item 的 `meta.repeat="yearly"` 按 `time` 前10位的起始日期做年度重复，起始日期之前不出现；`meta.allDay="true"` 显示全天。`meta.anniversary="true"` 显示纪念日快捷入口。未设置重复规则的记录仅在指定日期出现。

`phone.wechatProfile` 可选配置微信个人页：`nickname`、`account`、`avatar`（安全媒体地址）。普通聊天首条消息的 `meta.dateLabel` 可指定日期/时间标签；`meta.unreadBadge: "dot"` 将该会话的未读数字显示为红点。机主真实姓名继续使用 `phone.owner`。
