import { afterEach, describe, expect, it } from "vitest";
import { WebSocket } from "ws";
import type { AddressInfo } from "node:net";
import { getRoomTypeConfig } from "@jiucai-defense/shared";
import { createAppServer } from "../src/index";
import type { RoomUpdatedPayload, WsMessage } from "../src/messages";
import { RoomError, RoomManager } from "../src/roomManager";

function listen(app: ReturnType<typeof createAppServer>): Promise<number> {
  return new Promise((resolve) => {
    app.server.listen(0, "127.0.0.1", () => {
      resolve((app.server.address() as AddressInfo).port);
    });
  });
}

function openSocket(port: number): Promise<WebSocket> {
  return new Promise((resolve, reject) => {
    const socket = new WebSocket(`ws://127.0.0.1:${port}`);
    socket.once("open", () => resolve(socket));
    socket.once("error", reject);
  });
}

function send(socket: WebSocket, message: WsMessage): void {
  socket.send(JSON.stringify(message));
}

function waitForMessage<T>(
  socket: WebSocket,
  predicate: (message: WsMessage) => message is WsMessage<T>,
  timeoutMs = 5000
): Promise<WsMessage<T>> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      cleanup();
      reject(new Error("Timed out waiting for WebSocket message."));
    }, timeoutMs);
    const onMessage = (raw: WebSocket.RawData) => {
      const message = JSON.parse(raw.toString()) as WsMessage;
      if (predicate(message)) {
        cleanup();
        resolve(message);
      }
    };
    const onError = (error: Error) => {
      cleanup();
      reject(error);
    };
    const cleanup = () => {
      clearTimeout(timeout);
      socket.off("message", onMessage);
      socket.off("error", onError);
    };

    socket.on("message", onMessage);
    socket.on("error", onError);
  });
}

function waitForClose(socket: WebSocket): Promise<void> {
  return new Promise((resolve) => {
    if (socket.readyState === WebSocket.CLOSED) {
      resolve();
      return;
    }
    socket.once("close", () => resolve());
    socket.close();
  });
}

describe("front-back WebSocket integration", () => {
  const apps: ReturnType<typeof createAppServer>[] = [];
  const sockets: WebSocket[] = [];

  afterEach(async () => {
    await Promise.all(sockets.splice(0).map((socket) => waitForClose(socket)));
    for (const app of apps.splice(0)) {
      app.wss.close();
      app.server.close();
    }
  });

  it("drives the client flow from room creation to full-market game start", async () => {
    const app = createAppServer();
    apps.push(app);
    const port = await listen(app);
    const socket = await openSocket(port);
    sockets.push(socket);

    send(socket, {
      type: "room:create",
      payload: { nickname: "联调员" }
    });
    const created = await waitForMessage<RoomUpdatedPayload>(
      socket,
      (message): message is WsMessage<RoomUpdatedPayload> => message.type === "room:updated"
    );
    const roomId = created.payload.room.id;
    expect(created.payload.room.status).toBe("lobby");
    expect(created.payload.room.players).toHaveLength(1);

    send(socket, {
      type: "room:addBot",
      payload: { roomId }
    });
    const botAdded = await waitForMessage<RoomUpdatedPayload>(
      socket,
      (message): message is WsMessage<RoomUpdatedPayload> =>
        message.type === "room:updated" && message.payload.room.players.length === 2
    );
    expect(botAdded.payload.room.players.some((player) => player.isBot)).toBe(true);

    send(socket, {
      type: "game:start",
      payload: { roomId }
    });
    const started = await waitForMessage<RoomUpdatedPayload>(
      socket,
      (message): message is WsMessage<RoomUpdatedPayload> =>
        (message.type === "game:started" || message.type === "room:updated") &&
        message.payload.room.status === "playing" &&
        message.payload.room.market?.sectors !== undefined
    );

    const room = started.payload.room;
    const config = getRoomTypeConfig("STANDARD_20");
    expect(room.players).toHaveLength(config.maxPlayers);
    expect(room.players.filter((player) => player.role === "institution").length).toBeLessThanOrEqual(1);
    expect(room.players.filter((player) => player.role === "retail").length).toBeLessThanOrEqual(1);
    expect(room.market?.sectors).toHaveLength(5);
    expect(room.market?.sectors?.flatMap((sector) => sector.stocks)).toHaveLength(30);
    expect(room.market?.rankings?.stockPopularityRank).toHaveLength(30);
    expect(room.market?.quant?.enabled).toBe(true);

    send(socket, {
      type: "danmaku:send",
      payload: { text: "火系点燃了，韭菜开始上头。", sentiment: "bullish" }
    });
    const danmakuUpdated = await waitForMessage(
      socket,
      (message): message is WsMessage<{ roomId: string; danmaku: unknown[] }> =>
        message.type === "danmaku:updated"
    );
    expect(danmakuUpdated.payload.danmaku).toHaveLength(1);
  });
});

describe("retail tool server handling", () => {
  function startRoomWithRetailPlayer(): { manager: RoomManager; roomId: string; stockId: string } {
    const manager = new RoomManager(() => 0);
    const lobby = manager.createRoom("conn-1", "主力位");
    manager.joinRoom("conn-2", lobby.id, "韭菜位");
    const started = manager.startGame("conn-1", lobby.id);
    const stockId = started.market?.sectors?.[0]?.stocks[0]?.id;
    if (stockId === undefined) {
      throw new Error("Expected started room to contain a stock.");
    }
    return { manager, roomId: started.id, stockId };
  }

  function mutateStoredRoom(manager: RoomManager, roomId: string, update: (room: NonNullable<ReturnType<RoomManager["getRoom"]>>) => void): void {
    const store = manager as unknown as { rooms: Map<string, NonNullable<ReturnType<RoomManager["getRoom"]>>> };
    const room = store.rooms.get(roomId);
    if (room === undefined) {
      throw new Error("Expected room to be stored.");
    }
    update(room);
  }

  it("rejects retail tools from institution players", () => {
    const { manager, stockId } = startRoomWithRetailPlayer();

    expect(() =>
      manager.recordPlayerAction("conn-1", {
        actionType: "retailTool",
        action: "QUANT_SNIFFER",
        stockId,
        toolType: "QUANT_SNIFFER"
      })
    ).toThrow(RoomError);
  });

  it("applies warning danmaku effects and writes a retail tool log", () => {
    const { manager, stockId } = startRoomWithRetailPlayer();

    const updated = manager.recordPlayerAction("conn-2", {
      actionType: "retailTool",
      action: "WARNING_DANMAKU",
      stockId,
      toolType: "WARNING_DANMAKU",
      warningType: "WARN_T_PLUS_ONE"
    });
    const stock = updated.market?.sectors?.flatMap((sector) => sector.stocks).find((item) => item.id === stockId);
    const log = updated.logs.at(-1);

    expect(stock?.retailWarningPower).toBeGreaterThan(0);
    expect(log?.type).toBe("retail:toolAction");
    expect(log?.payload).toMatchObject({
      playerId: expect.any(String),
      stockId,
      toolType: "WARNING_DANMAKU",
      warningType: "WARN_T_PLUS_ONE"
    });
  });

  it("records leek radar highest-risk stock summaries", () => {
    const { manager } = startRoomWithRetailPlayer();

    const updated = manager.recordPlayerAction("conn-2", {
      actionType: "retailTool",
      action: "LEEK_RADAR",
      toolType: "LEEK_RADAR"
    });
    const log = updated.logs.at(-1);

    expect(log?.type).toBe("retail:toolAction");
    expect(log?.payload).toMatchObject({
      toolType: "LEEK_RADAR",
      effects: {
        watchedStocks: expect.arrayContaining([
          expect.objectContaining({
            stockId: expect.any(String),
            overheatRisk: expect.any(Number),
            riskFlags: expect.any(Array)
          })
        ])
      }
    });
  });

  it("records quant sniffer readings without changing the target price", () => {
    const { manager, stockId } = startRoomWithRetailPlayer();
    const before = manager.getRoom(manager.getSession("conn-2")!.roomId)!;
    const beforeStock = before.market?.sectors?.flatMap((sector) => sector.stocks).find((item) => item.id === stockId);

    const updated = manager.recordPlayerAction("conn-2", {
      actionType: "retailTool",
      action: "QUANT_SNIFFER",
      stockId,
      toolType: "QUANT_SNIFFER"
    });
    const afterStock = updated.market?.sectors?.flatMap((sector) => sector.stocks).find((item) => item.id === stockId);
    const log = updated.logs.at(-1);

    expect(afterStock?.changePercent).toBe(beforeStock?.changePercent);
    expect(log?.type).toBe("retail:toolAction");
    expect(log?.payload).toMatchObject({
      toolType: "QUANT_SNIFFER",
      effects: {
        quantAttention: expect.any(Number),
        crowdedness: expect.any(Number),
        tPlusOneCrowdedness: expect.any(Number),
        overheatRisk: expect.any(Number)
      }
    });
  });

  it("records fake order mirror risk and raises warning power during auction", () => {
    const { manager, roomId, stockId } = startRoomWithRetailPlayer();
    mutateStoredRoom(manager, roomId, (room) => {
      room.phase = "AUCTION_FREE";
      const stock = room.market?.sectors?.[0]?.stocks[0];
      if (stock !== undefined) {
        stock.boardStrength = 90;
        stock.boardBreakRisk = 70;
        stock.regulationAttention = 60;
        stock.retailWarningPower = 0;
      }
    });

    const updated = manager.recordPlayerAction("conn-2", {
      actionType: "retailTool",
      action: "FAKE_ORDER_MIRROR",
      stockId,
      toolType: "FAKE_ORDER_MIRROR"
    });
    const stock = updated.market?.sectors?.flatMap((sector) => sector.stocks).find((item) => item.id === stockId);
    const log = updated.logs.at(-1);

    expect(stock?.retailWarningPower).toBeGreaterThan(0);
    expect(log?.type).toBe("retail:toolAction");
    expect(log?.payload).toMatchObject({
      toolType: "FAKE_ORDER_MIRROR",
      effects: {
        fakeOrderRisk: expect.any(Number),
        boardStrength: 90,
        boardBreakRisk: 70,
        regulationAttention: 60,
        auctionFakeOrderRisk: true
      }
    });
  });

  it("lets core thermometer cool back-row risk when the center force weakens", () => {
    const { manager, roomId } = startRoomWithRetailPlayer();
    let coreStockId = "";
    mutateStoredRoom(manager, roomId, (room) => {
      const stocks = room.market?.sectors?.[0]?.stocks;
      const core = stocks?.[0];
      const backRow = stocks?.[1];
      if (core !== undefined && backRow !== undefined) {
        coreStockId = core.id;
        core.tags = ["涓啗"];
        core.changePercent = -3;
        for (const stock of stocks ?? []) {
          stock.changePercent = -3;
          stock.boardBreakRisk = 80;
        }
        backRow.tags = ["鍚庢帓"];
        backRow.crowdedness = 80;
        backRow.overheatRisk = 80;
        backRow.retailWarningPower = 0;
      }
    });

    const updated = manager.recordPlayerAction("conn-2", {
      actionType: "retailTool",
      action: "CORE_THERMOMETER",
      stockId: coreStockId,
      toolType: "CORE_THERMOMETER"
    });
    const log = updated.logs.at(-1);

    expect(log?.type).toBe("retail:toolAction");
    expect(log?.payload).toMatchObject({
      toolType: "CORE_THERMOMETER",
      effects: {
        coreWeak: true,
        backRowCrowdednessDelta: -5,
        backRowOverheatRiskDelta: -5,
        retailWarningPowerDelta: 6
      }
    });
  });

  it("applies warning danmaku variants with observable effects", () => {
    const { manager, roomId, stockId } = startRoomWithRetailPlayer();
    mutateStoredRoom(manager, roomId, (room) => {
      room.phase = "AUCTION_FREE";
      const stock = room.market?.sectors?.[0]?.stocks[0];
      if (stock !== undefined) {
        stock.quantAttention = 80;
        stock.tPlusOneCrowdedness = 80;
        stock.crowdedness = 80;
        stock.overheatRisk = 80;
        stock.boardBreakRisk = 20;
        stock.regulationAttention = 20;
        stock.mainForceHypePower = 20;
        stock.noisePower = 20;
        stock.retailWarningPower = 0;
      }
    });

    for (const warningType of ["WARN_RISK", "WARN_QUANT", "CALLOUT_FAKE_ORDER", "QUESTION_HYPE"] as const) {
      const updated = manager.recordPlayerAction("conn-2", {
        actionType: "retailTool",
        action: "WARNING_DANMAKU",
        stockId,
        toolType: "WARNING_DANMAKU",
        warningType
      });
      const stock = updated.market?.sectors?.flatMap((sector) => sector.stocks).find((item) => item.id === stockId);
      expect(stock?.retailWarningPower).toBeGreaterThan(0);
      expect(updated.logs.at(-1)?.payload).toMatchObject({
        toolType: "WARNING_DANMAKU",
        warningType
      });
    }
  });

  it("records passive retail tools without changing price", () => {
    const { manager, roomId, stockId } = startRoomWithRetailPlayer();
    mutateStoredRoom(manager, roomId, (room) => {
      room.phase = "AUCTION_FREE";
      const stock = room.market?.sectors?.[0]?.stocks[0];
      if (stock !== undefined) {
        stock.changePercent = 1.25;
        stock.tPlusOneCrowdedness = 75;
      }
    });

    for (const toolType of ["T_PLUS_ONE_BELT", "AUCTION_920_ALARM", "COOL_DOWN_CONFIRM"] as const) {
      const updated = manager.recordPlayerAction("conn-2", {
        actionType: "retailTool",
        action: toolType,
        stockId,
        toolType
      });
      const stock = updated.market?.sectors?.flatMap((sector) => sector.stocks).find((item) => item.id === stockId);
      expect(stock?.changePercent).toBe(1.25);
      expect(updated.logs.at(-1)?.type).toBe("retail:toolAction");
    }
  });
});
