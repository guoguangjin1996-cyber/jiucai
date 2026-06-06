export type PlayerRole = "institution" | "retail";

export type ElementType = "金" | "木" | "水" | "火" | "土";

export type GameMode = "BEGINNER" | "STANDARD" | "FULL_MARKET";

export type GameRoomType = "QUICK_10" | "STANDARD_20" | "LONG_30";

export type QuantLevel = "simplified" | "standard" | "enhanced";

export type RegulationIntensity = "weakened" | "standard" | "enhanced";

export type NayinPersonality =
  | "潜伏"
  | "龙头"
  | "中军"
  | "后排"
  | "妖股"
  | "防守"
  | "暗线"
  | "轮动"
  | "趋势"
  | "横盘"
  | "高位"
  | "启动"
  | "弱转强"
  | "跟风"
  | "信息";

export type StockTag =
  | "人气龙"
  | "领涨龙"
  | "弹幕龙"
  | "卡位龙"
  | "中军"
  | "暗线"
  | "后排"
  | "退潮"
  | "量化盯上"
  | "T+1拥挤"
  | "监管关注";

export type SectorStatusTag =
  | "五行人气王"
  | "主线王"
  | "轮动先锋"
  | "防守吸血"
  | "退潮预警"
  | "量化重灾区"
  | "弹幕爆区";

export interface NayinStockTemplate {
  id: string;
  name: string;
  element: ElementType;
  personality: NayinPersonality;
  baseVolatility: number;
  baseLiquidity: number;
  baseRegulationSensitivity: number;
  baseSectorBeta: number;
}

export interface ElementSectorTemplate {
  element: ElementType;
  name: string;
  description: string;
  styleTags: string[];
  nayinPool: NayinStockTemplate[];
}

export type PositionAmountLevel = "none" | "light" | "normal" | "heavy";

export type PositionLockedReason = "T+1" | "limit_down" | "suspended";

export type RetailChoice = "buy" | "sell" | "hold" | "watch";

export type AuctionSide = "buy" | "sell" | "neutral";

export type AuctionLevel = "limit" | "aggressive" | "normal" | "weak";

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

export type RegulationState =
  | "normal"
  | "risk_warning"
  | "key_monitoring"
  | "suspension_warning"
  | "black_room";

export type DanmakuSource = "player" | "bot" | "institution" | "system";

export type DanmakuSentiment = "bullish" | "bearish" | "suspicious" | "panic" | "neutral";

export interface PositionState {
  stockId?: string;
  stockName?: string;
  element?: ElementType;
  hasPosition: boolean;
  buyDay?: number;
  costPrice?: number;
  currentPrice?: number;
  amountLevel: PositionAmountLevel;
  sellable: boolean;
  lockedReason?: PositionLockedReason;
}

export interface AuctionOrder {
  playerId: string;
  side: AuctionSide;
  level: AuctionLevel;
  cancellable: boolean;
  cancelled: boolean;
  lockedAt?: number;
  isFake?: boolean;
}

export interface PlayerState {
  id: string;
  nickname: string;
  isBot: boolean;
  role: PlayerRole;
  alive: boolean;
  initialCapital?: number;
  finalCapital?: number;
  roi?: number;
  capital: number;
  confidence: number;
  score: number;
  position: PositionState;
  positions?: PositionState[];
  dailyActionCount?: number;
  maxDailyActionCount?: number;
  suspicion: number;
  votedToday: boolean;
  dailyChoice?: RetailChoice;
  auctionOrder?: AuctionOrder;
  eliminatedDay?: number;
  eliminatedReason?: string;
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
  controlPoints: number;
  fakeNewsCount: number;
  personalHarvestScore: number;
  exposed: boolean;
  focused: boolean;
  hiddenDays: number;
}

export type QuantStrategy =
  | "SCAN_CROWD"
  | "BREAK_BOARD"
  | "DRAIN_LIQUIDITY"
  | "T_PLUS_ONE_KNIFE"
  | "REVERSE_CONSENSUS"
  | "ANTI_MAIN_FORCE";

export interface QuantState {
  enabled: boolean;
  harvestScore: number;
  alertLevel: number;
  targetStockId?: string;
  strategy?: QuantStrategy;
  cooldown: number;
  visibility: number;
  lastAttackDay?: number;
}

export interface StockMarketState {
  id: string;
  templateId: string;
  name: string;
  element: ElementType;
  currentPrice: number;
  previousClose: number;
  changePercent: number;
  danmakuHeat: number;
  viewCountScore: number;
  holderCountScore: number;
  moneyFlowScore: number;
  crowdedness: number;
  tPlusOneCrowdedness: number;
  quantAttention: number;
  regulationAttention: number;
  liquidity: number;
  volatility: number;
  sectorBeta: number;
  isLimitUp: boolean;
  isLimitDown: boolean;
  boardStrength: number;
  boardBreakRisk: number;
  tags: StockTag[];
}

export interface ElementSectorState {
  element: ElementType;
  name: string;
  heat: number;
  flow: number;
  resonance: number;
  risk: number;
  popularityScore: number;
  strengthScore: number;
  moneyFlowScore: number;
  riskScore: number;
  resonanceScore: number;
  popularityRank?: number;
  strengthRank?: number;
  riskRank?: number;
  statusTags: SectorStatusTag[];
  stocks: StockMarketState[];
}

export interface StockPopularityMetrics {
  stockId: string;
  popularityScore: number;
  leadershipScore: number;
  riskScore: number;
  danmakuScore: number;
  tPlusOneCrowdedness: number;
  quantAttention: number;
  regulationAttention: number;
  globalPopularityRank: number;
  sectorPopularityRank: number;
  sectorLeadershipRank: number;
  tags: StockTag[];
}

export interface SectorPopularityMetrics {
  element: ElementType;
  popularityScore: number;
  strengthScore: number;
  moneyFlowScore: number;
  riskScore: number;
  resonanceScore: number;
  popularityRank: number;
  strengthRank: number;
  riskRank: number;
  statusTags: SectorStatusTag[];
}

export interface MarketRankings {
  stockPopularityRank: string[];
  stockLeadershipRank: string[];
  stockDanmakuRank: string[];
  stockQuantRiskRank: string[];
  stockTPlusOneRank: string[];
  stockRegulationRank: string[];
  stockGainersRank: string[];
  stockLosersRank: string[];
  sectorPopularityRank: ElementType[];
  sectorStrengthRank: ElementType[];
  sectorRiskRank: ElementType[];
  sectorMoneyFlowRank: ElementType[];
}

export interface MarketState {
  day: number;
  previousClose: number;
  openPrice: number;
  currentPrice: number;
  closePrice: number;
  limitRate: number;
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
  regulationState: RegulationState;
  sectors?: ElementSectorState[];
  rankings?: MarketRankings;
  quant?: QuantState;
}

export interface DanmakuItem {
  id: string;
  playerId?: string;
  source: DanmakuSource;
  text: string;
  sentiment: DanmakuSentiment;
  targetPlayerId?: string;
  createdAt: number;
}

export interface GameLog {
  id: string;
  timestamp: number;
  day: number;
  phase: MarketPhase;
  type: string;
  message: string;
  payload?: unknown;
}

export interface GameRoom {
  id: string;
  roomType?: GameRoomType;
  status: "lobby" | "playing" | "finished";
  players: PlayerState[];
  institution: InstitutionState;
  market: MarketState;
  day: number;
  maxDays: number;
  phase: MarketPhase;
  logs: GameLog[];
  winnerRole?: PlayerRole;
  winnerPlayerId?: string;
}

export interface ServerHelloMessage {
  type: "server/hello";
  payload: {
    name: string;
    notice: string;
  };
}
