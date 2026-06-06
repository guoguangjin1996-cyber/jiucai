# 韭菜保卫战：大A生存局

《韭菜保卫战：大A生存局》是一款虚构娱乐模拟的多人隐藏身份盘面生存 MVP。项目不接入真实股票行情，不使用真实股票代码或真实上市公司名称，不提供投资建议；所有本金值、信心值、操盘点、收割值、ROI 和走势均为局内虚构参数，无现金价值。

本游戏为虚构娱乐模拟，不接入真实股票行情，不涉及真实证券交易，不构成任何投资建议。游戏内所有板块、股票、资金和收益率均为虚构参数。

## 技术栈

- pnpm workspace
- Vue 3 + Vite + TypeScript 客户端：`apps/client-vue`
- Node.js + TypeScript + 原生 WebSocket 服务端：`apps/server`
- 共享规则包：`packages/shared`
- 历史 Cocos 骨架：`apps/client-cocos`，当前仅保留为参考
- Vitest 测试

## 本地启动

安装依赖：

```bash
pnpm install
```

启动服务端：

```bash
pnpm dev:server
```

服务端默认地址：

```text
http://localhost:8787
ws://localhost:8787
```

启动 Vue 客户端：

```bash
pnpm dev:client
```

客户端默认地址：

```text
http://localhost:5173
```

快速演示可以让服务端使用短阶段：

```bash
$env:FAST_MODE="1"; pnpm dev:server
```

## Vue MVP 玩法入口

`apps/client-vue` 当前支持：

- 创建房间、加入房间
- Bot 补位
- 开始游戏
- 展示交易日、阶段、倒计时、虚构盘面、玩家列表
- 集合竞价动作
- 分时/尾盘动作
- 主力视角动作
- 分时弹幕
- 龙虎榜关注投票和监管问询投票
- 局后 ROI 复盘

客户端只提交动作和展示状态，不自行结算身份、胜负、随机事件或关键资源。

## WebSocket 协议摘要

所有消息均为 JSON：

```ts
interface WsMessage<T = unknown> {
  type: string;
  requestId?: string;
  payload: T;
}
```

常用客户端消息：

```json
{ "type": "room:create", "payload": { "nickname": "房主", "roomType": "STANDARD_20" } }
{ "type": "room:join", "payload": { "roomId": "room_xxx", "nickname": "玩家" } }
{ "type": "room:addBot", "payload": { "roomId": "room_xxx" } }
{ "type": "room:ready", "payload": { "ready": true } }
{ "type": "game:start", "payload": { "roomId": "room_xxx" } }
{ "type": "game:submitAction", "payload": { "actionType": "auction", "action": "TOP_LIMIT_BUY" } }
{ "type": "danmaku:send", "payload": { "text": "虚构盘面先观察一手。", "sentiment": "neutral" } }
```

常用服务端事件：

```json
{ "type": "room:updated", "payload": { "room": {} } }
{ "type": "game:started", "payload": { "room": {} } }
{ "type": "game:phaseChanged", "payload": { "roomId": "room_xxx", "day": 1, "phase": "PRE_NEWS" } }
{ "type": "game:stateUpdated", "payload": { "room": {} } }
{ "type": "error", "payload": { "code": "ROOM_FULL", "message": "房间人数已满。" } }
```

## 验证

运行全部构建：

```bash
pnpm build
```

运行测试：

```bash
pnpm test
```

服务端协议联调测试：

```bash
pnpm --filter @jiucai-defense/server exec vitest run tests/wsIntegration.test.ts
```
