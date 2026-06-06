export interface WsMessage<T = unknown> {
  type: string;
  requestId?: string;
  payload: T;
}

export class WsClient {
  private socket?: WebSocket;
  private messageHandler?: (message: WsMessage) => void;
  private readonly pendingMessages: WsMessage[] = [];

  constructor(private readonly url: string) {}

  connect(onMessage: (message: WsMessage) => void): void {
    this.messageHandler = onMessage;

    if (
      this.socket !== undefined &&
      (this.socket.readyState === WebSocket.OPEN || this.socket.readyState === WebSocket.CONNECTING)
    ) {
      return;
    }

    this.socket = new WebSocket(this.url);
    this.socket.onmessage = (event) => {
      const data = JSON.parse(String(event.data)) as WsMessage;
      this.messageHandler?.(data);
    };
    this.socket.onopen = () => {
      for (const message of this.pendingMessages.splice(0)) {
        this.socket?.send(JSON.stringify(message));
      }
    };
  }

  send(message: WsMessage): void {
    if (this.socket?.readyState !== WebSocket.OPEN) {
      return;
    }

    this.socket.send(JSON.stringify(message));
  }

  sendOrQueue(message: WsMessage): void {
    if (this.socket?.readyState === WebSocket.OPEN) {
      this.send(message);
      return;
    }

    this.pendingMessages.push(message);
    if (this.messageHandler !== undefined) {
      this.connect(this.messageHandler);
    }
  }

  close(): void {
    this.socket?.close();
  }
}
