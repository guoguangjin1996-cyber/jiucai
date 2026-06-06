import type {
  DanmakuItem,
  ElementSectorState,
  MarketPhase,
  MarketRankings,
  PlayerRole
} from "@jiucai-defense/shared";
import { WsClient, type WsMessage } from "../net/WsClient";

export interface ClientPlayer {
  id: string;
  nickname: string;
  isBot: boolean;
  role?: PlayerRole;
  alive: boolean;
  capital: number;
  confidence: number;
  suspicion: number;
  ready: boolean;
  titles: string[];
  position: {
    hasPosition: boolean;
    sellable: boolean;
    lockedReason?: "T+1" | "limit_down" | "suspended";
  };
  positions?: Array<{
    stockId?: string;
    stockName?: string;
    hasPosition: boolean;
    sellable: boolean;
    lockedReason?: "T+1" | "limit_down" | "suspended";
  }>;
  initialCapital?: number;
  finalCapital?: number;
  roi?: number;
}

export interface ClientRoom {
  id: string;
  status: "lobby" | "playing" | "finished";
  day: number;
  phase: MarketPhase;
  players: ClientPlayer[];
  market?: {
    regulationHeat: number;
    regulationState: string;
    auctionPressure: number;
    isLimitUp: boolean;
    isLimitDown: boolean;
    boardStrength: number;
    boardBreakRisk: number;
    sectors?: ElementSectorState[];
    rankings?: MarketRankings;
    quant?: {
      enabled: boolean;
      alertLevel: number;
      targetStockId?: string;
      strategy?: string;
    };
  };
  danmaku: DanmakuItem[];
  voiceLines: Array<{ text: string }>;
  finalSettlement?: {
    winnerRole: PlayerRole;
    institutionPlayerId: string;
    championPlayerId?: string;
    roiRankings?: Array<{
      playerId: string;
      nickname: string;
      role: PlayerRole;
      roi: number;
      finalCapital: number;
    }>;
  };
}

export class ClientGameStore {
  readonly ws = new WsClient("ws://localhost:8787");
  room?: ClientRoom;
  nickname = `韭菜${Math.floor(Math.random() * 1000)}`;
  private readonly listeners = new Set<() => void>();

  constructor() {
    this.ws.connect((message) => this.handleMessage(message));
  }

  subscribe(listener: () => void): void {
    this.listeners.add(listener);
  }

  createRoom(): void {
    this.send("room:create", { nickname: this.nickname });
  }

  addBot(): void {
    this.send("room:addBot", this.room === undefined ? {} : { roomId: this.room.id });
  }

  startGame(): void {
    this.send("game:start", this.room === undefined ? {} : { roomId: this.room.id });
  }

  submitAction(action: string, targetPlayerId?: string): void {
    const actionType = this.resolveActionType(action);
    this.send("game:submitAction", {
      actionType,
      action,
      ...(targetPlayerId === undefined ? {} : { targetPlayerId })
    });
  }

  sendDanmaku(text: string, sentiment: string, targetPlayerId?: string): void {
    this.send("danmaku:send", {
      text,
      sentiment,
      ...(targetPlayerId === undefined ? {} : { targetPlayerId })
    });
  }

  vote(targetPlayerId: string): void {
    this.send("game:submitAction", { actionType: "vote", action: "vote", targetPlayerId });
  }

  private send(type: string, payload: Record<string, unknown>): void {
    this.ws.sendOrQueue({ type, payload });
  }

  private handleMessage(message: WsMessage): void {
    if (
      message.type === "room:updated" ||
      message.type === "game:started" ||
      message.type === "game:stateUpdated"
    ) {
      const payload = message.payload as { room?: ClientRoom };
      if (payload.room !== undefined) {
        this.room = payload.room;
        this.emit();
      }
      return;
    }

    if (message.type === "game:phaseChanged" && this.room !== undefined) {
      const payload = message.payload as { day?: number; phase?: MarketPhase };
      this.room = {
        ...this.room,
        day: payload.day ?? this.room.day,
        phase: payload.phase ?? this.room.phase
      };
      this.emit();
      return;
    }

    if (message.type === "danmaku:updated" && this.room !== undefined) {
      const payload = message.payload as { danmaku?: DanmakuItem[] };
      this.room = {
        ...this.room,
        danmaku: payload.danmaku ?? this.room.danmaku
      };
      this.emit();
    }
  }

  private resolveActionType(action: string): string {
    if (
      action === "CANCEL_AUCTION_ORDER" ||
      action.includes("BUY") ||
      action.includes("SELL") ||
      action === "FLAT"
    ) {
      return "auction";
    }

    return "intraday";
  }

  private emit(): void {
    for (const listener of this.listeners) listener();
  }
}
