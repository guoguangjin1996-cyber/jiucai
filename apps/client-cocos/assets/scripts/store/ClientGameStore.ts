import type {
  DanmakuItem,
  ElementSectorState,
  GameRoomType,
  GameRoomTypeConfig,
  MarketPhase,
  MarketRankings,
  OrderBookLiquidity,
  PlayerRole
} from "./LocalShared";
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
  roomType: GameRoomType;
  roomTypeConfig: GameRoomTypeConfig;
  day: number;
  maxDays: number;
  phase: MarketPhase;
  submittedPlayerIds: string[];
  phaseStartedAt?: number;
  phaseEndsAt?: number;
  virtualTime?: string;
  targetMinutes?: number;
  maxPositions?: number;
  maxDailyActions?: number;
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
    orderBooks?: Record<string, OrderBookLiquidity>;
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
  private readonly useLocalPreview = true;
  nickname = `韭菜${Math.floor(Math.random() * 1000)}`;
  private readonly listeners = new Set<() => void>();

  constructor() {
    if (!this.useLocalPreview) {
      this.ws.connect((message) => this.handleMessage(message));
    }
  }

  subscribe(listener: () => void): void {
    this.listeners.add(listener);
  }

  createRoom(roomType: GameRoomType = "STANDARD_20"): void {
    this.room = this.createMockRoom(roomType, "lobby");
    this.emit();
    this.send("room:create", { nickname: this.nickname, roomType });
  }

  addBot(): void {
    if (this.room !== undefined && this.room.players.length < 8) {
      this.room = {
        ...this.room,
        players: [
          ...this.room.players,
          this.createMockPlayer(`bot-${this.room.players.length + 1}`, `Bot-0${this.room.players.length + 1}`, true)
        ]
      };
      this.emit();
    }
    this.send("room:addBot", this.room === undefined ? {} : { roomId: this.room.id });
  }

  startGame(roomType?: GameRoomType): void {
    if (this.room === undefined) {
      this.room = this.createMockRoom(roomType ?? "STANDARD_20", "playing");
    } else {
      this.room = {
        ...this.room,
        status: "playing",
        phase: "CONTINUOUS_TRADING"
      };
    }
    this.emit();
    this.send(
      "game:start",
      this.room === undefined
        ? roomType === undefined
          ? {}
          : { roomType }
        : { roomId: this.room.id, ...(roomType === undefined ? {} : { roomType }) }
    );
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
    this.send("game:submitAction", {
      actionType: this.room?.phase === "REGULATION_INQUIRY" ? "regulationVote" : "vote",
      action: "vote",
      targetPlayerId
    });
  }

  private send(type: string, payload: Record<string, unknown>): void {
    if (this.useLocalPreview) {
      return;
    }
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
      const payload = message.payload as {
        day?: number;
        phase?: MarketPhase;
        durationMs?: number;
        virtualTime?: string;
      };
      const phaseStartedAt = Date.now();
      const nextRoom: ClientRoom = {
        ...this.room,
        day: payload.day ?? this.room.day,
        phase: payload.phase ?? this.room.phase
      };
      if (payload.virtualTime !== undefined) nextRoom.virtualTime = payload.virtualTime;
      if (payload.durationMs !== undefined) {
        nextRoom.phaseStartedAt = phaseStartedAt;
        nextRoom.phaseEndsAt = phaseStartedAt + payload.durationMs;
      }
      this.room = nextRoom;
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
    if (action === "CANCEL_AUCTION_ORDER" || action.includes("BUY") || action.includes("SELL") || action === "FLAT") {
      return "auction";
    }
    return "intraday";
  }

  private emit(): void {
    for (const listener of this.listeners) listener();
  }

  private createMockRoom(roomType: GameRoomType, status: ClientRoom["status"]): ClientRoom {
    const config = this.createRoomTypeConfig(roomType);
    return {
      id: "666666",
      status,
      roomType,
      roomTypeConfig: config,
      day: 2,
      maxDays: config.maxDays,
      phase: status === "playing" ? "CONTINUOUS_TRADING" : "LOBBY",
      submittedPlayerIds: [],
      targetMinutes: config.targetMinutes,
      maxPositions: config.maxPositions,
      maxDailyActions: config.maxDailyActions,
      players: [
        this.createMockPlayer("p1", "韭菜王", false, "retail"),
        this.createMockPlayer("p2", "原来是韭", false, "retail"),
        this.createMockPlayer("p3", "主力一号", false, "institution"),
        this.createMockPlayer("p4", "格局打开", false, "retail"),
        this.createMockPlayer("p5", "割肉小能手", false, "institution"),
        this.createMockPlayer("p6", "绿油油", false, "retail"),
        this.createMockPlayer("p7", "Bot-06", true, "retail"),
        this.createMockPlayer("p8", "Bot-04", true, "retail")
      ],
      market: {
        regulationHeat: 76,
        regulationState: "risk_warning",
        auctionPressure: 76,
        isLimitUp: false,
        isLimitDown: false,
        boardStrength: 62,
        boardBreakRisk: 71,
        sectors: [],
        rankings: {
          stockPopularityRank: ["泡泡叶", "葱花能源", "月台股份"],
          stockLeadershipRank: ["泡泡叶", "纸箱科技", "云朵制造"],
          sectorPopularityRank: ["木", "火", "土", "金", "水"],
          stockQuantRiskRank: ["泡泡叶", "月台股份", "纸箱科技"],
          stockTPlusOneRank: ["泡泡叶", "葱花能源", "云朵制造"]
        }
      },
      danmaku: [
        { id: "d1", source: "system", text: "大佬带带我！冲冲冲！", sentiment: "bullish", createdAt: Date.now() },
        { id: "d2", source: "system", text: "完了完了，跳水了……", sentiment: "panic", createdAt: Date.now() }
      ],
      voiceLines: [{ text: "9:20已到，现在后悔躺平可就来不及咯~" }]
    };
  }

  private createRoomTypeConfig(roomType: GameRoomType): GameRoomTypeConfig {
    if (roomType === "QUICK_10") return this.config(roomType, "短线快跑房", 10, 3, 9, 2, 3, "快速体验");
    if (roomType === "LONG_30") return this.config(roomType, "全市场长盘房", 30, 7, 30, 4, 6, "深度对局");
    return this.config(roomType, "五日轮动房", 20, 5, 30, 3, 5, "标准体验");
  }

  private config(
    roomType: GameRoomType,
    name: string,
    targetMinutes: number,
    maxDays: number,
    stockCount: number,
    maxPositions: number,
    maxDailyActions: number,
    suitableFor: string
  ): GameRoomTypeConfig {
    return {
      roomType,
      type: roomType,
      displayName: name,
      name,
      targetDurationMinutes: targetMinutes,
      targetMinutes,
      maxPlayers: 8,
      institutionCount: 2,
      retailCount: 6,
      maxDays,
      sectorCount: roomType === "QUICK_10" ? 3 : 5,
      stockCount,
      stockPoolMode: roomType === "QUICK_10" ? "NINE_STOCKS" : "FULL_MARKET",
      maxPositionsPerPlayer: maxPositions,
      maxPositions,
      maxDailyActionsPerPlayer: maxDailyActions,
      maxDailyActions,
      quantStrength: roomType === "LONG_30" ? "strong" : roomType === "QUICK_10" ? "weak" : "standard",
      regulationStrength: roomType === "LONG_30" ? "strong" : roomType === "QUICK_10" ? "weak" : "standard",
      quantLevel: roomType === "LONG_30" ? "enhanced" : roomType === "QUICK_10" ? "simplified" : "standard",
      regulationIntensity: roomType === "LONG_30" ? "enhanced" : roomType === "QUICK_10" ? "weakened" : "standard",
      speedLabel: roomType === "QUICK_10" ? "约100倍速" : roomType === "LONG_30" ? "约80倍速" : "约86倍速",
      suitableFor
    };
  }

  private createMockPlayer(id: string, nickname: string, isBot: boolean, role: PlayerRole = "retail"): ClientPlayer {
    return {
      id,
      nickname,
      isBot,
      role,
      alive: true,
      capital: role === "institution" ? 987654 : 12345,
      confidence: role === "institution" ? 88 : 68,
      suspicion: role === "institution" ? 76 : 24,
      ready: true,
      titles: [],
      position: {
        hasPosition: true,
        sellable: false,
        lockedReason: "T+1"
      },
      roi: role === "institution" ? 0.32 : -0.08
    };
  }
}
