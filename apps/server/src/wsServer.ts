import type { Server } from "node:http";
import { WebSocket, WebSocketServer } from "ws";
import { createId } from "./id";
import type {
  AddBotPayload,
  CreateRoomPayload,
  DanmakuSendPayload,
  DanmakuSystemPayload,
  JoinRoomPayload,
  PingPayload,
  ReadyPayload,
  RoomSnapshot,
  SanitizedRoomSnapshot,
  StartGamePayload,
  SubmitActionPayload,
  WsMessage
} from "./messages";
import { GameEngine } from "./gameEngine";
import { RoomError, RoomManager } from "./roomManager";

export interface WsServerApp {
  wss: WebSocketServer;
  roomManager: RoomManager;
}

export function createWsServer(server: Server, roomManager = new RoomManager()): WsServerApp {
  const wss = new WebSocketServer({ server });
  const sockets = new Map<string, WebSocket>();

  function send<T>(socket: WebSocket, message: WsMessage<T>): void {
    socket.send(JSON.stringify(message));
  }

  function sendError(socket: WebSocket, requestId: string | undefined, error: unknown): void {
    const payload =
      error instanceof RoomError
        ? { code: error.code, message: error.message }
        : { code: "INTERNAL_ERROR", message: "服务端处理消息失败。" };

    send(socket, {
      type: "error",
      ...(requestId === undefined ? {} : { requestId }),
      payload
    });
  }

  function broadcastRoom(room: RoomSnapshot): void {
    for (const connectionId of roomManager.getConnectionIdsForRoom(room.id)) {
      const targetSocket = sockets.get(connectionId);
      const session = roomManager.getSession(connectionId);
      if (targetSocket?.readyState === WebSocket.OPEN) {
        const sanitizedRoom = sanitizeForSession(room, session?.playerId);
        send(targetSocket, {
          type: "room:updated",
          payload: { room: sanitizedRoom }
        });
      }
    }
  }

  function broadcastGameStarted(room: RoomSnapshot): void {
    for (const connectionId of roomManager.getConnectionIdsForRoom(room.id)) {
      const targetSocket = sockets.get(connectionId);
      const session = roomManager.getSession(connectionId);
      if (targetSocket?.readyState !== WebSocket.OPEN) {
        continue;
      }

      const sanitizedRoom = sanitizeForSession(room, session?.playerId);
      send(targetSocket, {
        type: "game:started",
        payload: { room: sanitizedRoom }
      });
    }
  }

  function broadcastGameStateUpdated(room: RoomSnapshot): void {
    for (const connectionId of roomManager.getConnectionIdsForRoom(room.id)) {
      const targetSocket = sockets.get(connectionId);
      const session = roomManager.getSession(connectionId);
      if (targetSocket?.readyState !== WebSocket.OPEN) {
        continue;
      }

      send(targetSocket, {
        type: "game:stateUpdated",
        payload: { room: sanitizeForSession(room, session?.playerId) }
      });
    }
  }

  function broadcastPhaseChanged(room: RoomSnapshot): void {
    for (const connectionId of roomManager.getConnectionIdsForRoom(room.id)) {
      const targetSocket = sockets.get(connectionId);
      if (targetSocket?.readyState !== WebSocket.OPEN) {
        continue;
      }

      send(targetSocket, {
        type: "game:phaseChanged",
        payload: {
          roomId: room.id,
          day: room.day,
          phase: room.phase,
          durationMs:
            room.phaseStartedAt === undefined || room.phaseEndsAt === undefined
              ? undefined
              : Math.max(0, room.phaseEndsAt - room.phaseStartedAt),
          virtualTime: room.virtualTime
        }
      });
    }
  }

  function broadcastDanmakuUpdated(room: RoomSnapshot): void {
    for (const connectionId of roomManager.getConnectionIdsForRoom(room.id)) {
      const targetSocket = sockets.get(connectionId);
      if (targetSocket?.readyState !== WebSocket.OPEN) {
        continue;
      }

      send(targetSocket, {
        type: "danmaku:updated",
        payload: {
          roomId: room.id,
          danmaku: room.danmaku
        }
      });
    }
  }

  function sanitizeForSession(
    room: RoomSnapshot,
    playerId: string | undefined
  ): SanitizedRoomSnapshot {
    if (playerId === undefined) {
      return roomManager.sanitizeRoomForPlayer(room, "");
    }

    return roomManager.sanitizeRoomForPlayer(room, playerId);
  }

  const gameEngine = new GameEngine(roomManager, {
    callbacks: {
      onPhaseChanged: (room) => {
        broadcastPhaseChanged(room);
      },
      onStateUpdated: (room) => {
        broadcastGameStateUpdated(room);
      }
    }
  });

  function parseMessage(raw: WebSocket.RawData): WsMessage {
    const parsed: unknown = JSON.parse(raw.toString());
    if (typeof parsed !== "object" || parsed === null || !("type" in parsed)) {
      throw new RoomError("INVALID_MESSAGE", "消息必须包含 type 字段。");
    }

    const message = parsed as Partial<WsMessage>;
    if (typeof message.type !== "string") {
      throw new RoomError("INVALID_MESSAGE", "type 必须是字符串。");
    }

    const messageToHandle: WsMessage = {
      type: message.type,
      payload: message.payload
    };

    if (typeof message.requestId === "string") {
      messageToHandle.requestId = message.requestId;
    }

    return messageToHandle;
  }

  wss.on("connection", (socket) => {
    const connectionId = createId("conn");
    sockets.set(connectionId, socket);

    socket.on("message", (raw) => {
      let message: WsMessage;

      try {
        message = parseMessage(raw);
      } catch (error) {
        sendError(socket, undefined, error);
        return;
      }

      try {
        if (message.type === "ping") {
          send<PingPayload>(socket, {
            type: "pong",
            ...(message.requestId === undefined ? {} : { requestId: message.requestId }),
            payload: { now: Date.now() }
          });
          return;
        }

        if (message.type === "room:create") {
          const payload = message.payload as CreateRoomPayload;
          const room = roomManager.createRoom(connectionId, payload.nickname, payload.roomType);
          broadcastRoom(room);
          return;
        }

        if (message.type === "room:join") {
          const payload = message.payload as JoinRoomPayload;
          const room = roomManager.joinRoom(connectionId, payload.roomId, payload.nickname);
          broadcastRoom(room);
          return;
        }

        if (message.type === "room:leave") {
          const result = roomManager.leave(connectionId);
          if (result?.room !== undefined) {
            broadcastRoom(result.room);
          }
          return;
        }

        if (message.type === "room:addBot") {
          const payload = message.payload as AddBotPayload | undefined;
          const room = roomManager.addBot(connectionId, payload?.roomId);
          broadcastRoom(room);
          return;
        }

        if (message.type === "room:ready") {
          const payload = message.payload as ReadyPayload | undefined;
          const room = roomManager.setReady(connectionId, payload?.ready ?? true);
          broadcastRoom(room);
          return;
        }

        if (message.type === "game:start") {
          const payload = message.payload as StartGamePayload | undefined;
          const room = roomManager.startGame(connectionId, payload?.roomId, payload?.roomType);
          const startedRoom = gameEngine.startRoom(room.id);
          broadcastRoom(startedRoom);
          broadcastGameStarted(startedRoom);
          return;
        }

        if (message.type === "game:submitAction") {
          const payload = message.payload as SubmitActionPayload;
          gameEngine.submitAction(connectionId, payload);
          return;
        }

        if (message.type === "danmaku:send") {
          const payload = message.payload as DanmakuSendPayload;
          const room = roomManager.recordDanmakuSend(connectionId, payload);
          broadcastDanmakuUpdated(room);
          broadcastGameStateUpdated(room);
          return;
        }

        if (message.type === "danmaku:system") {
          const payload = message.payload as DanmakuSystemPayload;
          const room = roomManager.recordSystemDanmaku(connectionId, payload);
          broadcastDanmakuUpdated(room);
          broadcastGameStateUpdated(room);
          return;
        }

        throw new RoomError("UNKNOWN_MESSAGE", `未知消息类型：${message.type}`);
      } catch (error) {
        sendError(socket, message.requestId, error);
      }
    });

    socket.on("close", () => {
      sockets.delete(connectionId);
      const result = roomManager.leave(connectionId);
      if (result?.room !== undefined) {
        broadcastRoom(result.room);
      }
      if (result !== undefined && result.room === undefined) {
        gameEngine.stopRoom(result.roomId);
      }
    });
  });

  return { wss, roomManager };
}
