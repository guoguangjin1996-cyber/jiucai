import { afterEach, describe, expect, it } from "vitest";
import { WebSocket } from "ws";
import type { AddressInfo } from "node:net";
import { createAppServer } from "../src/index";
import type { RoomUpdatedPayload, WsMessage } from "../src/messages";

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
    expect(room.players).toHaveLength(8);
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
