export type MockRole = "retail" | "institution";

export type MockPhase =
  | "PRE_NEWS"
  | "MUTATION"
  | "AUCTION_FREE"
  | "AUCTION_LOCKED"
  | "OPEN_PRICE"
  | "CONTINUOUS_TRADING"
  | "LIMIT_BOARD"
  | "CLOSE"
  | "VOTE"
  | "REGULATION_INQUIRY"
  | "DAY_RESULT";

export type DanmakuSentiment = "bullish" | "bearish" | "suspicious" | "panic" | "neutral";

export interface MockPlayer {
  id: string;
  nickname: string;
  isBot: boolean;
  roleVisible?: MockRole;
  capital: number;
  confidence: number;
  score: number;
  alive: boolean;
  suspicion: number;
  avatarType: "leek" | "boss" | "bot" | "regulator";
}

export interface MockGameState {
  roomId: string;
  day: number;
  maxDays: number;
  phase: MockPhase;
  countdown: number;
  role: MockRole;
  me: MockPlayer;
  players: MockPlayer[];
  market: {
    name: string;
    code: string;
    price: number;
    change: number;
    changePercent: number;
    openStatus: string;
    isLimitUp: boolean;
    isLimitDown: boolean;
    boardStrength: number;
    boardBreakRisk: number;
    regulationHeat: number;
    positionLockedReason?: "T+1" | "limit_down" | "suspended";
  };
  news: {
    title: string;
    desc: string;
  };
  mutation: {
    name: string;
    desc: string;
  };
  danmaku: Array<{
    id: string;
    text: string;
    sentiment: DanmakuSentiment;
  }>;
  logs: string[];
}

export type PageKey =
  | "BUY"
  | "SELL"
  | "CANCEL_ORDER"
  | "FULL_POSITION"
  | "HALF_POSITION"
  | "ONE_THIRD_POSITION"
  | "ONE_QUARTER_POSITION"
  | "FINAL_CONFIRM"
  | "MINUTE"
  | "TRADE_LIST"
  | "ORDER_BOOK"
  | "HOME"
  | "MARKET"
  | "HOLDING"
  | "COMMUNITY"
  | "MINE"
  | "MAIN_FORCE_CONSOLE"
  | "MARKET_MONITOR"
  | "FUND_MANAGEMENT"
  | "NETWORK"
  | "REGULATION_PR"
  | "POWER"
  | "MAIN_FORCE_FUND_CONTROL"
  | "CHIP_DISTRIBUTION"
  | "LIMIT_CONTROL"
  | "MESSAGE_PUBLISH"
  | "KOL_COOPERATION"
  | "REGULATOR_RELATION"
  | "BLACK_ROOM_RECORD";

