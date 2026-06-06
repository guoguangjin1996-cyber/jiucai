export type PlayerRole = "institution" | "retail";

export type MarketPhase =
  | "LOBBY"
  | "ROLE_REVEAL"
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
  | "FOCUS_VOTE"
  | "DAY_RECAP"
  | "CONTINUOUS_TRADING"
  | "LIMIT_BOARD"
  | "CLOSE"
  | "VOTE"
  | "REGULATION_INQUIRY"
  | "DAY_RESULT";

export type DanmakuSentiment = "bullish" | "bearish" | "suspicious" | "panic" | "neutral";
export type DanmakuSource = "player" | "bot" | "institution" | "system";

export interface DanmakuItem {
  id: string;
  playerId?: string;
  source: DanmakuSource;
  text: string;
  sentiment: DanmakuSentiment;
  targetPlayerId?: string;
  createdAt: number;
}

export interface ElementSectorState {
  name: string;
  heat: number;
  flow: number;
  resonance: number;
  risk: number;
  statusTags: string[];
  popularityRank?: number;
  strengthRank?: number;
  riskRank?: number;
  stocks: StockMarketState[];
}

export interface StockMarketState {
  id: string;
  name: string;
  element: string;
  changePercent: number;
  tags: string[];
  danmakuHeat: number;
  quantAttention: number;
}

export interface MarketRankings {
  stockPopularityRank: string[];
  stockLeadershipRank: string[];
  sectorPopularityRank: string[];
  stockQuantRiskRank: string[];
  stockTPlusOneRank: string[];
}

export interface OrderBookLiquidity {
  stockId: string;
  stockName: string;
  buyDepth: number;
  sellDepth: number;
  liquidityLabel: "高" | "中" | "低";
  fillRateBuy: number;
  fillRateSell: number;
  riskTags: string[];
  queueLabel?: string;
}

export type GameRoomType = "QUICK_10" | "STANDARD_20" | "LONG_30";

export interface GameRoomTypeConfig {
  roomType: GameRoomType;
  type: GameRoomType;
  displayName: string;
  name: string;
  targetDurationMinutes: number;
  targetMinutes: number;
  maxPlayers: number;
  institutionCount: number;
  retailCount: number;
  maxDays: number;
  sectorCount: number;
  stockCount: number;
  stockPoolMode: "NINE_STOCKS" | "FULL_MARKET";
  maxPositionsPerPlayer: number;
  maxPositions: number;
  maxDailyActionsPerPlayer: number;
  maxDailyActions: number;
  quantStrength: "weak" | "standard" | "strong";
  regulationStrength: "weak" | "standard" | "strong";
  quantLevel: "simplified" | "standard" | "enhanced";
  regulationIntensity: "weakened" | "standard" | "enhanced";
  speedLabel: string;
  suitableFor: string;
}

export type PlayerTitle = string;

export interface PlayerResultExplanation {
  nickname: string;
  roi: number;
  rank: number;
  mainProfitSource: string;
  mainLossSource: string;
  touchedRules: string[];
  riskLessons: string[];
}

export interface GlossaryTerm {
  id: string;
  term: string;
  inGameMeaning: string;
  riskTip: string;
  example: string;
}

export interface LearningScenarioStep {
  id: string;
  title: string;
  phase: string;
  instruction: string;
  explanationAfterAction: string;
}

export interface LearningScenario {
  id: string;
  title: string;
  learningGoal: string;
  riskTip: string;
  summary: string;
  steps: LearningScenarioStep[];
}

export type VoiceLineEvent = "landing" | "auction" | "limitBoard" | "vote" | "result" | "panic";

export const GLOSSARY_TERMS: GlossaryTerm[] = [
  {
    id: "t_plus_one",
    term: "T+1锁仓",
    inGameMeaning: "今日获得的虚构持仓要等下一交易日才可卖出。",
    riskTip: "不要把局内规则理解成现实交易建议。",
    example: "刚冲进去就想跑路，系统说：明天再说。"
  },
  {
    id: "auction_trick",
    term: "集合竞价骗炮",
    inGameMeaning: "开盘前的虚构挂单会制造情绪波动。",
    riskTip: "这是游戏事件，不对应真实盘口。",
    example: "看起来要起飞，实际可能只是气球漏气。"
  },
  {
    id: "black_room",
    term: "监管小黑屋",
    inGameMeaning: "监管热度过高会触发问询与投票压力。",
    riskTip: "监管表达仅为喜剧化机制。",
    example: "系统拿着小本本：你刚才是不是太会演了？"
  }
];

export const LEARNING_SCENARIOS: LearningScenario[] = [
  {
    id: "auction-basic",
    title: "竞价别上头",
    learningGoal: "理解可撤单和锁单阶段的差异。",
    riskTip: "虚构娱乐模拟，不提供真实交易指引。",
    summary: "你学会了：按钮很大，后悔要趁早。",
    steps: [
      {
        id: "free",
        title: "9:20前",
        phase: "AUCTION_FREE",
        instruction: "尝试挂单，再观察撤单按钮。",
        explanationAfterAction: "此时还可以反悔，韭菜还有一点尊严。"
      },
      {
        id: "locked",
        title: "9:20后",
        phase: "AUCTION_LOCKED",
        instruction: "进入锁单阶段后观察按钮状态。",
        explanationAfterAction: "撤单幻想被系统收进抽屉。"
      }
    ]
  }
];

export function getLearningScenario(id: string): LearningScenario | undefined {
  return LEARNING_SCENARIOS.find((scenario) => scenario.id === id);
}

const VOICE_LINES: Record<VoiceLineEvent, string[]> = {
  landing: ["又想割我？没门！", "冲鸭，先保护本金值。"],
  auction: ["9:20前还能反悔，别把后悔药吃太快。"],
  limitBoard: ["封板像贴膏药，炸板像撕膏药。"],
  vote: ["龙虎榜开会，谁最会画饼？"],
  result: ["复盘开始，ROI榜单见真章。"],
  panic: ["深呼吸，这只是虚构娱乐模拟。"]
};

export function pickVoiceLine(event: VoiceLineEvent, counter: number): string {
  const lines = VOICE_LINES[event] ?? VOICE_LINES.panic;
  return lines[counter % lines.length] ?? VOICE_LINES.panic[0] ?? "虚构娱乐模拟。";
}
