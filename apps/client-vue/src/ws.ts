import type { RoomSnapshot, WsMessage } from "./types";

export type ClientEvent =
  | { type: "room"; room: RoomSnapshot }
  | { type: "phase"; phase: string; day: number; virtualTime?: string; durationMs?: number }
  | { type: "error"; code: string; message: string }
  | { type: "open" }
  | { type: "close" };

export class GameSocket {
  private socket: WebSocket | undefined;
  private readonly queuedMessages: WsMessage[] = [];

  constructor(
    private readonly url: string,
    private readonly onEvent: (event: ClientEvent) => void
  ) {}

  get connected(): boolean {
    return this.socket?.readyState === WebSocket.OPEN;
  }

  connect(): void {
    if (this.socket !== undefined && this.socket.readyState <= WebSocket.OPEN) {
      return;
    }

    const socket = new WebSocket(this.url);
    this.socket = socket;

    socket.addEventListener("open", () => {
      this.onEvent({ type: "open" });
      while (this.queuedMessages.length > 0) {
        const message = this.queuedMessages.shift();
        if (message !== undefined) {
          socket.send(JSON.stringify(message));
        }
      }
    });

    socket.addEventListener("close", () => {
      this.onEvent({ type: "close" });
    });

    socket.addEventListener("message", (event) => {
      this.handleMessage(event.data);
    });
  }

  disconnect(): void {
    this.socket?.close();
    this.socket = undefined;
  }

  send(type: string, payload: Record<string, unknown> = {}): void {
    const message: WsMessage = {
      type,
      requestId: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      payload
    };

    if (this.connected && this.socket !== undefined) {
      this.socket.send(JSON.stringify(message));
      return;
    }

    this.queuedMessages.push(message);
    this.connect();
  }

  private handleMessage(raw: unknown): void {
    const message = JSON.parse(String(raw)) as WsMessage;

    if (
      message.type === "room:updated" ||
      message.type === "game:started" ||
      message.type === "game:stateUpdated"
    ) {
      const payload = message.payload as { room?: RoomSnapshot };
      if (payload.room !== undefined) {
        this.onEvent({ type: "room", room: payload.room });
      }
      return;
    }

    if (message.type === "game:phaseChanged") {
      const payload = message.payload as {
        day?: number;
        phase?: string;
        virtualTime?: string;
        durationMs?: number;
      };
      this.onEvent({
        type: "phase",
        phase: payload.phase ?? "",
        day: payload.day ?? 0,
        ...(payload.virtualTime === undefined ? {} : { virtualTime: payload.virtualTime }),
        ...(payload.durationMs === undefined ? {} : { durationMs: payload.durationMs })
      });
      return;
    }

    if (message.type === "danmaku:updated") {
      return;
    }

    if (message.type === "error") {
      const payload = message.payload as { code?: string; message?: string };
      this.onEvent({
        type: "error",
        code: payload.code ?? "UNKNOWN",
        message: payload.message ?? "服务端返回了未知错误。"
      });
    }
  }
}
