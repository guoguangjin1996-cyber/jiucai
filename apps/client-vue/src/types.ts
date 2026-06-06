export type PlayerRole = "institution" | "retail";

export type GameRoomType = "QUICK_10" | "STANDARD_20" | "LONG_30";

export type MarketPhase =
  | "PRE_NEWS"
  | "MUTATION"
  | "INSTITUTION_PRIVATE_ROOM"
  | "AUCTION_FREE"
  | "AUCTION_LOCKED"
  | "OPEN_PRICE"
  | "MORNING_TRADING"
  | "MIDDAY_ROTATION"
  | "AFTERNOON_TRADING"
  | "CLOSING_RUSH"
  | "CLOSE"
  | "FOCUS_VOTE"
  | "DAY_RECAP"
  | "CONTINUOUS_TRADING"
  | "LIMIT_BOARD"
  | "VOTE"
  | "REGULATION_INQUIRY"
  | "DAY_RESULT";

export type DanmakuSentiment = "bullish" | "bearish" | "suspicious" | "panic" | "neutral";

export type PositionAmountLevel = "light" | "normal" | "heavy";

export type RetailToolType =
  | "LEEK_RADAR"
  | "T_PLUS_ONE_BELT"
  | "AUCTION_920_ALARM"
  | "WARNING_DANMAKU"
  | "FAKE_ORDER_MIRROR"
  | "QUANT_SNIFFER"
  | "CORE_THERMOMETER"
  | "COOL_DOWN_CONFIRM";

export type RetailWarningDanmakuType =
  | "WARN_RISK"
  | "CALLOUT_FAKE_ORDER"
  | "WARN_T_PLUS_ONE"
  | "WARN_QUANT"
  | "WARN_CORE_DIVE"
  | "QUESTION_HYPE";

export type InstitutionMarketAction =
  | "FAKE_SEAL_BOARD"
  | "REAL_SEAL_BOARD"
  | "JOINT_SEAL_BOARD"
  | "IGNITE_TAIL"
  | "STABILIZE_CORE"
  | "SMASH_LEADER"
  | "BREAK_BOARD"
  | "PRY_FLOOR";

export type OffMarketActionType =
  | "BUY_RUMOR"
  | "BUY_INTEL"
  | "KOL_PROMOTION"
  | "STORY_POST"
  | "WATER_ARMY_DANMAKU"
  | "REGULATION_PR"
  | "MISLEAD_QUANT";

export interface SubmitActionClientPayload extends Record<string, unknown> {
  actionType: string;
  action: string;
  targetPlayerId?: string;
  stockId?: string;
  amountLevel?: PositionAmountLevel;
  toolType?: RetailToolType;
  warningType?: RetailWarningDanmakuType;
}

export interface InstitutionState {
  playerId: string;
  controlPoints: number;
  fakeNewsCount: number;
  exposure: number;
  harvestScore: number;
  washScore: number;
  usedActions: string[];
}

export interface InstitutionPlayerState {
  playerId: string;
  initialCapital: number;
  capital: number;
  finalCapital: number;
  roi: number;
  managedCapital: number;
  dailyOperationCredit: number;
  usedOperationCredit: number;
  influenceBudget: number;
  influenceSpent: number;
  controlPoints: number;
  maxControlPoints: number;
  fakeNewsCount: number;
  personalHarvestScore: number;
  exposed: boolean;
  focused: boolean;
  hiddenDays: number;
}

export interface WsMessage<T = unknown> {
  type: string;
  requestId?: string;
  payload: T;
}

export interface RoomPlayer {
  id: string;
  nickname: string;
  isBot: boolean;
  isHost: boolean;
  ready: boolean;
  role?: PlayerRole;
  alive: boolean;
  capital: number;
  confidence: number;
  score: number;
  suspicion: number;
  votedToday: boolean;
  titles: string[];
  initialCapital?: number;
  finalCapital?: number;
  roi?: number;
  intradayChoice?: string;
  position?: {
    stockName?: string;
    hasPosition: boolean;
    amountLevel: string;
    sellable: boolean;
    lockedReason?: "T+1" | "limit_down" | "suspended";
  };
  positions?: Array<{
    stockName?: string;
    hasPosition: boolean;
    amountLevel: string;
    sellable: boolean;
    lockedReason?: "T+1" | "limit_down" | "suspended";
  }>;
  auctionOrder?: {
    side: "buy" | "sell" | "neutral";
    level: "limit" | "aggressive" | "normal" | "weak";
    cancellable: boolean;
    cancelled: boolean;
  };
}

export interface MarketStock {
  id: string;
  name: string;
  element: string;
  currentPrice: number;
  changePercent: number;
  tags: string[];
  danmakuHeat?: number;
  isLimitUp: boolean;
  isLimitDown: boolean;
  boardStrength: number;
  boardBreakRisk: number;
  tPlusOneCrowdedness: number;
  quantAttention: number;
  regulationAttention: number;
  overheatRisk?: number;
  riskFlags?: string[];
  retailWarningPower?: number;
  mainForceHypePower?: number;
  noisePower?: number;
  nextDayLowOpenRisk?: number;
}

export interface MarketSector {
  element: string;
  name: string;
  heat: number;
  flow: number;
  risk: number;
  strengthScore: number;
  statusTags: string[];
  stocks: MarketStock[];
}

export interface RoomSnapshot {
  id: string;
  status: "lobby" | "playing" | "finished";
  roomType: GameRoomType;
  roomTypeConfig: {
    displayName: string;
    targetMinutes: number;
    maxPlayers: number;
    institutionCount: number;
    retailCount: number;
    maxDays: number;
    maxPositions: number;
    maxDailyActions: number;
    suitableFor: string;
  };
  hostPlayerId: string;
  players: RoomPlayer[];
  institutionState?: InstitutionState;
  institutions?: InstitutionPlayerState[];
  day: number;
  maxDays: number;
  phase: MarketPhase;
  submittedPlayerIds: string[];
  phaseStartedAt?: number;
  phaseEndsAt?: number;
  virtualTime?: string;
  market?: {
    previousClose: number;
    openPrice: number;
    currentPrice: number;
    closePrice: number;
    limitUpPrice: number;
    limitDownPrice: number;
    isLimitUp: boolean;
    isLimitDown: boolean;
    boardStrength: number;
    boardBreakRisk: number;
    news?: string;
    mutation?: string;
    auctionPressure: number;
    bullishHeat: number;
    bearishHeat: number;
    regulationHeat: number;
    regulationState: string;
    sectors?: MarketSector[];
    quant?: {
      enabled: boolean;
      alertLevel: number;
      targetStockId?: string;
      strategy?: string;
      visibility: number;
    };
  };
  logs: Array<{
    id: string;
    timestamp: number;
    day: number;
    phase: MarketPhase;
    type: string;
    message: string;
  }>;
  voiceLines: Array<{
    id: string;
    day: number;
    phase: MarketPhase;
    text: string;
    createdAt: number;
  }>;
  danmaku: Array<{
    id: string;
    playerId?: string;
    source: "player" | "bot" | "institution" | "system";
    text: string;
    sentiment: DanmakuSentiment;
    targetPlayerId?: string;
    createdAt: number;
  }>;
  institutionIntradayActions: string[];
  regulationVotes: Record<string, string>;
  leaderboardVotes: Record<string, string>;
  dailyTrend: Array<{
    day: number;
    result: string;
    closePrice: number;
    regulationHeat: number;
  }>;
  finalSettlement?: {
    winnerRole: PlayerRole;
    reason: string;
    championPlayerId?: string;
    institutionPlayerId: string;
    institutionPlayerIds?: string[];
    roiRankings?: Array<{
      playerId: string;
      nickname: string;
      role: PlayerRole;
      roi: number;
      finalCapital: number;
    }>;
    playerTitles: Array<{
      playerId: string;
      nickname: string;
      titles: string[];
    }>;
  };
}
