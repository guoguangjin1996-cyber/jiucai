# 韭菜保卫战：大A生存局

《韭菜保卫战：大A生存局》是一款虚构娱乐模拟微信小游戏 MVP。当前服务端已提供 WebSocket 房间、交易日状态机、集合竞价、盘中结算、涨跌停/T+1、监管问询、龙虎榜关注投票与 ROI 收益率结算；Cocos 客户端提供可连接本地服务端的程序化 MVP UI。

最终规则一句话：谁收益率最高，谁赢；谁带节奏最成功，谁出名；谁接盘最惨，谁截图发群。

## 技术栈

- pnpm workspace
- TypeScript strict mode
- Node.js + 原生 WebSocket 服务端
- Cocos Creator 3.8+ TypeScript 客户端脚本
- Vitest 测试

## 本地启动

推荐在 WSL 中进入项目目录：

```bash
cd /mnt/e/code/test/jiucai-defense
pnpm install
pnpm test
pnpm dev:server
```

服务端默认监听：

```text
http://localhost:8787
ws://localhost:8787
```

健康检查：

```bash
curl http://localhost:8787/health
```

构建全部 workspace：

```bash
pnpm build
```

## WebSocket 消息

所有消息均为 JSON：

```ts
interface WsMessage<T = unknown> {
  type: string;
  requestId?: string;
  payload: T;
}
```

创建房间：

```json
{
  "type": "room:create",
  "requestId": "req-1",
  "payload": {
    "nickname": "房主"
  }
}
```

加入房间：

```json
{
  "type": "room:join",
  "requestId": "req-2",
  "payload": {
    "roomId": "room_xxx",
    "nickname": "新玩家"
  }
}
```

添加 Bot：

```json
{
  "type": "room:addBot",
  "requestId": "req-3",
  "payload": {
    "roomId": "room_xxx"
  }
}
```

准备、离开与心跳：

```json
{ "type": "room:ready", "payload": { "ready": true } }
{ "type": "room:leave", "payload": {} }
{ "type": "ping", "payload": { "now": 1234567890 } }
```

开始游戏：

```json
{
  "type": "game:start",
  "requestId": "req-4",
  "payload": {
    "roomId": "room_xxx"
  }
}
```

提交局内动作：

```json
{
  "type": "game:submitAction",
  "requestId": "req-5",
  "payload": {
    "actionType": "auction",
    "action": "buy_limit",
    "targetPlayerId": "player_xxx"
  }
}
```

集合竞价动作：

```json
{ "type": "game:submitAction", "payload": { "actionType": "auction", "action": "TOP_LIMIT_BUY" } }
{ "type": "game:submitAction", "payload": { "actionType": "auction", "action": "HIGH_OPEN_BUY" } }
{ "type": "game:submitAction", "payload": { "actionType": "auction", "action": "FLAT" } }
{ "type": "game:submitAction", "payload": { "actionType": "auction", "action": "LIMIT_SELL" } }
{ "type": "game:submitAction", "payload": { "actionType": "auction", "action": "CANCEL_AUCTION_ORDER" } }
```

主力可在集合竞价自由阶段提交：

```json
{ "type": "game:submitAction", "payload": { "actionType": "auction", "action": "FAKE_LIMIT_BUY" } }
{ "type": "game:submitAction", "payload": { "actionType": "auction", "action": "FAKE_LIMIT_SELL" } }
{ "type": "game:submitAction", "payload": { "actionType": "auction", "action": "REAL_LIMIT_BUY" } }
{ "type": "game:submitAction", "payload": { "actionType": "auction", "action": "REAL_LIMIT_SELL" } }
```

`AUCTION_FREE` 阶段可撤单；进入 `AUCTION_LOCKED` 后新单会锁定，已有订单不可撤销。

盘中动作：

```json
{ "type": "game:submitAction", "payload": { "actionType": "intraday", "action": "TAKE_OFF" } }
{ "type": "game:submitAction", "payload": { "actionType": "intraday", "action": "BURY" } }
{ "type": "game:submitAction", "payload": { "actionType": "intraday", "action": "PLAY_DEAD" } }
{ "type": "game:submitAction", "payload": { "actionType": "intraday", "action": "RUN_AWAY" } }
{ "type": "game:submitAction", "payload": { "actionType": "intraday", "action": "HOLD" } }
```

主力盘中动作：

```json
{ "type": "game:submitAction", "payload": { "actionType": "intraday", "action": "DRAW_PIE" } }
{ "type": "game:submitAction", "payload": { "actionType": "intraday", "action": "SCARE" } }
{ "type": "game:submitAction", "payload": { "actionType": "intraday", "action": "IGNITE" } }
{ "type": "game:submitAction", "payload": { "actionType": "intraday", "action": "SMASH" } }
{ "type": "game:submitAction", "payload": { "actionType": "intraday", "action": "SHAKE_OUT" } }
{ "type": "game:submitAction", "payload": { "actionType": "intraday", "action": "SHIP" } }
{ "type": "game:submitAction", "payload": { "actionType": "intraday", "action": "PRY_FLOOR" } }
```

分时弹幕：

```json
{
  "type": "danmaku:send",
  "payload": {
    "text": "他一直在唱多，我怀疑他。",
    "sentiment": "suspicious",
    "targetPlayerId": "player_xxx"
  }
}
```

主力可消耗 `fakeNewsCount` 投放一条主力弹幕：

```json
{
  "type": "danmaku:send",
  "payload": {
    "text": "虚构娱乐模拟：盘面情绪正在升温。",
    "sentiment": "bullish",
    "asInstitution": true
  }
}
```

监管问询投票：

```json
{
  "type": "game:submitAction",
  "payload": {
    "actionType": "regulationVote",
    "action": "vote",
    "targetPlayerId": "player_xxx"
  }
}
```

交易日阶段会自动推进。默认阶段时长较短，便于 MVP 调试；测试或快速演示可使用：

```bash
FAST_MODE=1 pnpm dev:server
```

服务端事件：

```json
{ "type": "room:updated", "payload": { "room": {} } }
{ "type": "game:started", "payload": { "room": {} } }
{ "type": "game:phaseChanged", "payload": { "roomId": "room_xxx", "day": 1, "phase": "PRE_NEWS" } }
{ "type": "game:stateUpdated", "payload": { "room": {} } }
{ "type": "danmaku:updated", "payload": { "roomId": "room_xxx", "danmaku": [] } }
{ "type": "pong", "payload": { "now": 1234567890 } }
{ "type": "error", "payload": { "code": "ROOM_FULL", "message": "房间人数已满。" } }
```

开局后的 `room` 会按客户端玩家身份脱敏：主力本人可见自己的主力身份和主力资源，散户玩家不会看到主力玩家 ID。

## Workspace

```text
apps/server          Node.js HTTP + WebSocket 房间服务
apps/client-cocos    Cocos Creator 客户端脚本占位
packages/shared      客户端和服务端共享类型、常量、规则入口
```

## Cocos MVP UI 预览

`apps/client-cocos/assets/scripts` 已内置一套程序化 MVP UI。它连接 `ws://localhost:8787`，支持首页、房间页、游戏页、结算页，以及集合竞价、涨跌停/T+1、监管热度、龙虎榜投票、弹幕和播报展示。

## 前后端联调

先启动服务端：

```bash
cd /mnt/e/code/test/jiucai-defense
pnpm dev:server
```

然后用 Cocos Creator 3.8+ 打开 `apps/client-cocos`，在 Canvas 或根节点挂载 `assets/scripts/Main.ts` 的 `Main` 组件并点击 Preview。

联调主路径：

```text
LandingScreen 创建房间
RoomScreen Bot补位
RoomScreen 开始游戏
GameScreen 接收 game:started / game:stateUpdated
GameScreen 展示五行热力图、股票卡、榜单、监管、量化与弹幕
ResultScreen 展示 ROI 冠军与收益率榜
```

协议级自动化联调：

```bash
pnpm --filter @jiucai-defense/server exec vitest run tests/wsIntegration.test.ts
```

该测试会真实启动 HTTP + WebSocket 服务，并验证 `room:create -> room:addBot -> game:start -> danmaku:send`，同时确认客户端可收到 `FULL_MARKET` 的 5 个五行板块、30 只纳音股票、市场榜单与系统量化状态。

Cocos Creator 3.8+ 预览步骤：

```text
1. 用 Cocos Creator 打开 apps/client-cocos。
2. 打开 assets/scenes/Boot.scene。
3. 确认 Canvas/AppRoot 节点上已挂载 assets/scripts/Main.ts 的 Main 组件。
4. 点击 Preview。
```

本地 TypeScript 验证：

```bash
pnpm --filter @jiucai-defense/client-cocos build
```

客户端状态路径：

```text
WsClient -> ClientGameStore -> ScreenManager -> Landing/Room/Game/Result screens
```

`WsClient` 只负责原生 WebSocket JSON 收发，`ClientGameStore` 负责把服务端房间/交易日阶段机状态转换成前端 ViewModel。客户端继续只展示状态并提交动作，不自行结算胜负、身份、随机事件或关键资源。

## Web Mock Preview

如果只是想先在浏览器里看 UI 气质和按钮页面，可以打开纯静态 Web 预览：

```text
apps/client-cocos/web-preview/index.html
```

也可以启动本地静态服务：

```powershell
py -3 -m http.server 5173 -d apps/client-cocos/web-preview
```

然后访问：

```text
http://localhost:5173
```

这个 Web Preview 不接服务端、不替代 Cocos 客户端，只用于快速查看 Mock UI。它内置韭菜视角、主力视角、首页、房间、身份揭晓、游戏页、结算页，以及所有交易按钮、底部导航按钮、主力工具按钮的独立弹窗。

## 微信小游戏构建说明

第一版暂不接微信登录、支付、广告或分享 SDK。构建建议：

```text
1. 在 Cocos Creator 3.8+ 中打开 apps/client-cocos。
2. 确认场景根节点挂载 Main 组件。
3. 构建平台选择 WeChat Mini Game。
4. WebSocket 地址在内测时指向本地或测试服 ws://host:8787。
5. 构建后用微信开发者工具打开构建产物。
```

上线前需要把 `ws://localhost:8787` 替换为测试域名，并在微信后台配置合法 socket 域名。

## 游戏规则摘要

- 8 人房，开局自动补 Bot 到 8 人。
- 2 名隐藏主力，6 名韭菜身份。
- 主胜负是收益率 ROI 排名：`ROI = (最终资金 - 初始资金) / 初始资金`。
- 第 5 个交易日结束后，ROI 第一名获得本局冠军。
- 主力初始资金 `1000`，韭菜初始资金 `100`，绝对收益更高不代表排名更高。
- 交易日阶段：盘前公告、突发异动、集合竞价可撤、集合竞价锁单、开盘、分时博弈、涨跌停、收盘、龙虎榜投票、当日结算。
- 集合竞价在 `AUCTION_FREE` 可撤单，进入 `AUCTION_LOCKED` 后不可撤。
- 散户可起飞、埋人、装死、跑路、格局。
- 主力可画饼、吓人、点火、掀桌、甩人、收网等。
- T+1、跌停排队、炸板、地天板、小黑屋问询均为局内虚构娱乐机制。
- 投票不再是“抓主力即胜利”，而是市场共识、龙虎榜关注、监管问询和尾盘方向工具。
- 胜负、排名与称号仅为本局虚拟结算，无现金价值。

## Playtest

手动内测清单见 [PLAYTEST_CHECKLIST.md](./PLAYTEST_CHECKLIST.md)。

自动烟测：

```bash
pnpm --filter @jiucai-defense/server test -- autoBotGame.test.ts
```

该测试会创建 1 真人位 + 7 Bot，并推进一轮虚拟交易日，确认能够产生胜者占位。

## 后续计划

- 把 Cocos UI 从程序化 MVP 过渡到正式预制体与适配布局。
- 增加完整 5 日自动推进和断线重连视图恢复。
- 增加 Bot 策略差异和可复现 seed。
- 补充更多结算称号、分享卡模板和抽象播报。
- 在测试服验证微信小游戏 WebSocket 域名、包体和性能。

## 合规说明

本项目仅为虚构娱乐模拟，不接入真实股票行情，不使用真实股票代码或真实上市公司名称，不提供投资建议，不包含真钱下注、提现、房卡、金币交易、赔率、庄家或实物兑奖。所有本金值、信心值、操盘点、收割值等字段均为局内虚拟参数，无任何现金价值。
