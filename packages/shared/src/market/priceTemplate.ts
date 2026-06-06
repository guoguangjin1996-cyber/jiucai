import type { GameRoomType, NayinPersonality, NayinStockTemplate } from "../types";

export type PriceTemplateType =
  | "LEADER_STREAK"
  | "BOARD_BREAK"
  | "CORE_TREND"
  | "HIDDEN_START"
  | "ONE_DAY_HYPE"
  | "DRAWDOWN"
  | "DEFENSIVE_RANGE"
  | "HIGH_LEVEL_DIVERGENCE";

export interface PriceTemplate {
  id: string;
  templateType: PriceTemplateType;
  source: "historical" | "synthetic";
  anonymized: boolean;
  days: PriceTemplateDay[];
  features: {
    volatility: number;
    trendStrength: number;
    maxDrawdown: number;
    limitUpCount: number;
    limitDownCount: number;
    turnoverLevel: number;
    boardBreakCount: number;
  };
}

export interface PriceTemplateDay {
  openPct: number;
  highPct: number;
  lowPct: number;
  closePct: number;
  volumeRatio: number;
  intradayShape?: number[];
}

export interface StockPriceEngineInput {
  templateReturn: number;
  sectorModifier: number;
  institutionModifier: number;
  retailCrowdModifier: number;
  quantModifier: number;
  regulationModifier: number;
  randomNoise: number;
}

export interface RawOHLCV {
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  name?: string;
  code?: string;
  symbol?: string;
  date?: string;
  tradedAt?: string;
}

export interface NormalizeHistoricalTemplateOptions {
  id?: string;
  templateType?: PriceTemplateType;
  intradayShapes?: number[][];
}

export interface PriceTemplateCandidate {
  templateType: PriceTemplateType;
  weight: number;
}

export interface BackgroundMarketFunds {
  passiveLiquidity: number;
  npcRetailFlow: number;
  hotMoneyFlow: number;
  sectorRotationFlow: number;
  quantFlow: number;
}

export interface RetailCrowdModifierInput {
  playerTradePressure: number;
  crowdedness: number;
  danmakuSentiment: number;
  holderMood?: number;
}

export const PRICE_ENGINE_WEIGHTS: Record<GameRoomType, Record<keyof StockPriceEngineInput, number>> = {
  QUICK_10: {
    templateReturn: 0.3,
    sectorModifier: 0.2,
    institutionModifier: 0.2,
    retailCrowdModifier: 0.15,
    quantModifier: 0.05,
    regulationModifier: 0.05,
    randomNoise: 0.05
  },
  STANDARD_20: {
    templateReturn: 0.35,
    sectorModifier: 0.2,
    institutionModifier: 0.18,
    retailCrowdModifier: 0.12,
    quantModifier: 0.05,
    regulationModifier: 0.05,
    randomNoise: 0.05
  },
  LONG_30: {
    templateReturn: 0.4,
    sectorModifier: 0.2,
    institutionModifier: 0.15,
    retailCrowdModifier: 0.1,
    quantModifier: 0.05,
    regulationModifier: 0.05,
    randomNoise: 0.05
  }
};

const TEMPLATE_DAYS = 5;
const TEMPLATE_LIBRARY: PriceTemplate[] = [
  createSyntheticTemplate("synthetic-leader-streak", "LEADER_STREAK", [
    day(0, 10, -1, 10, 1.8, [0, 2, 6, 10, 10]),
    day(10, 21, 9, 21, 2.2, [10, 13, 17, 21, 21]),
    day(21, 33, 19, 33, 2.8, [21, 23, 28, 33, 33]),
    day(33, 46, 30, 40, 3.2, [33, 40, 46, 43, 40]),
    day(39, 52, 35, 50, 3.6, [39, 42, 47, 45, 50])
  ]),
  createSyntheticTemplate("synthetic-board-break", "BOARD_BREAK", [
    day(0, 9, -2, 8, 1.6, [0, 3, 8, 9, 8]),
    day(8, 19, 7, 18, 2.4, [8, 12, 18, 19, 18]),
    day(18, 31, 12, 15, 3.4, [18, 25, 31, 22, 15]),
    day(14, 18, 3, 5, 2.9, [14, 18, 10, 7, 5]),
    day(5, 12, -3, 1, 2.1, [5, 8, 12, 4, 1])
  ]),
  createSyntheticTemplate("synthetic-core-trend", "CORE_TREND", [
    day(0, 4, -1, 3, 1.1, [0, 1, 2, 3, 3]),
    day(3, 8, 2, 6, 1.25, [3, 4, 6, 8, 6]),
    day(6, 11, 5, 10, 1.35, [6, 7, 9, 10, 10]),
    day(10, 15, 8, 13, 1.45, [10, 11, 14, 12, 13]),
    day(13, 19, 12, 18, 1.6, [13, 14, 16, 17, 18])
  ]),
  createSyntheticTemplate("synthetic-hidden-start", "HIDDEN_START", [
    day(0, 2, -2, 1, 0.8, [0, -1, 0, 1, 1]),
    day(1, 3, -1, 2, 0.9, [1, 0, 2, 1, 2]),
    day(2, 7, 1, 6, 1.25, [2, 3, 4, 6, 6]),
    day(6, 16, 5, 15, 2.1, [6, 8, 12, 16, 15]),
    day(15, 24, 12, 22, 2.4, [15, 14, 18, 20, 22])
  ]),
  createSyntheticTemplate("synthetic-one-day-hype", "ONE_DAY_HYPE", [
    day(0, 3, -1, 2, 0.9, [0, 1, 2, 1, 2]),
    day(2, 15, 1, 12, 2.7, [2, 6, 15, 14, 12]),
    day(12, 13, 1, 3, 2.2, [12, 13, 8, 5, 3]),
    day(3, 5, -6, -4, 1.5, [3, 4, 0, -3, -4]),
    day(-4, 1, -8, -6, 1.2, [-4, -2, 1, -5, -6])
  ]),
  createSyntheticTemplate("synthetic-drawdown", "DRAWDOWN", [
    day(0, 1, -4, -3, 1.1, [0, 1, -1, -2, -3]),
    day(-3, -1, -8, -7, 1.3, [-3, -2, -4, -6, -7]),
    day(-7, -5, -13, -11, 1.4, [-7, -6, -10, -13, -11]),
    day(-11, -8, -18, -16, 1.5, [-11, -9, -14, -17, -16]),
    day(-16, -14, -24, -22, 1.6, [-16, -14, -18, -21, -22])
  ]),
  createSyntheticTemplate("synthetic-defensive-range", "DEFENSIVE_RANGE", [
    day(0, 2, -2, 1, 0.75, [0, 1, 2, 0, 1]),
    day(1, 3, -1, 0, 0.8, [1, 2, 3, 1, 0]),
    day(0, 2, -3, -1, 0.85, [0, -1, -3, 1, -1]),
    day(-1, 2, -2, 1, 0.78, [-1, 0, 2, 1, 1]),
    day(1, 4, 0, 2, 0.9, [1, 2, 3, 4, 2])
  ]),
  createSyntheticTemplate("synthetic-high-level-divergence", "HIGH_LEVEL_DIVERGENCE", [
    day(0, 8, -1, 7, 1.7, [0, 3, 7, 8, 7]),
    day(7, 18, 5, 15, 2.4, [7, 12, 18, 16, 15]),
    day(15, 24, 9, 11, 3.0, [15, 20, 24, 16, 11]),
    day(11, 20, 4, 18, 2.8, [11, 8, 14, 20, 18]),
    day(18, 23, 0, 4, 3.3, [18, 23, 14, 8, 4])
  ])
];

export const PriceTemplateLibrary = {
  all(): PriceTemplate[] {
    return TEMPLATE_LIBRARY.map(cloneTemplate);
  },

  getByType(templateType: PriceTemplateType): PriceTemplate {
    const found = TEMPLATE_LIBRARY.find((template) => template.templateType === templateType);
    if (found === undefined) {
      throw new Error(`Unknown price template type: ${templateType}`);
    }
    return cloneTemplate(found);
  },

  getById(id: string): PriceTemplate | undefined {
    const found = TEMPLATE_LIBRARY.find((template) => template.id === id);
    return found === undefined ? undefined : cloneTemplate(found);
  }
};

export function getTemplateCandidatesForNayinStock(
  stock: Pick<NayinStockTemplate, "personality">
): PriceTemplateCandidate[] {
  const weights: Record<PriceTemplateType, number> = {
    LEADER_STREAK: 8,
    BOARD_BREAK: 8,
    CORE_TREND: 8,
    HIDDEN_START: 8,
    ONE_DAY_HYPE: 8,
    DRAWDOWN: 6,
    DEFENSIVE_RANGE: 6,
    HIGH_LEVEL_DIVERGENCE: 6
  };

  for (const templateType of preferredTemplateTypes(stock.personality)) {
    weights[templateType] += 22;
  }

  return (Object.keys(weights) as PriceTemplateType[]).map((templateType) => ({
    templateType,
    weight: weights[templateType]
  }));
}

export function assignTemplateToNayinStock(
  stock: Pick<NayinStockTemplate, "id" | "personality">,
  seed = stock.id
): PriceTemplate {
  const candidates = getTemplateCandidatesForNayinStock(stock);
  const selected = weightedPick(candidates, seed);
  return PriceTemplateLibrary.getByType(selected.templateType);
}

export function normalizeHistoricalTemplate(
  rawOHLCV: RawOHLCV[],
  options: NormalizeHistoricalTemplateOptions = {}
): PriceTemplate {
  if (rawOHLCV.length === 0) {
    throw new Error("Cannot normalize an empty OHLCV series.");
  }

  const baseOpen = positiveNumber(rawOHLCV[0]?.open, "base open");
  const averageVolume =
    rawOHLCV.reduce((sum, item) => sum + positiveNumber(item.volume, "volume"), 0) / rawOHLCV.length;
  const days = rawOHLCV.map((item, index) => {
    const openPct = toPct(positiveNumber(item.open, "open"), baseOpen);
    const closePct = toPct(positiveNumber(item.close, "close"), baseOpen);
    const highPct = Math.max(toPct(positiveNumber(item.high, "high"), baseOpen), openPct, closePct);
    const lowPct = Math.min(toPct(positiveNumber(item.low, "low"), baseOpen), openPct, closePct);

    return normalizeDay({
      openPct,
      highPct,
      lowPct,
      closePct,
      volumeRatio: round(positiveNumber(item.volume, "volume") / averageVolume),
      ...(options.intradayShapes?.[index] !== undefined ? { intradayShape: [...options.intradayShapes[index]] } : {})
    });
  });

  return createTemplate({
    id: options.id ?? "historical-anonymous-template",
    templateType: options.templateType ?? inferTemplateType(days),
    source: "historical",
    anonymized: true,
    days
  });
}

export function perturbTemplate(template: PriceTemplate, seed: string | number): PriceTemplate {
  const rng = createSeededRng(seed);
  const scale = 0.7 + rng() * 0.7;
  const tailShift = randomBetween(rng, -1.2, 1.2);
  const days = template.days.map((sourceDay, index) => {
    const closeTail = index === template.days.length - 1 ? tailShift : randomBetween(rng, -0.35, 0.35);
    const openPct = sourceDay.openPct * scale + randomBetween(rng, -0.45, 0.45);
    const closePct = sourceDay.closePct * scale + closeTail;
    const highPct = sourceDay.highPct * scale + randomBetween(rng, 0, 0.8);
    const lowPct = sourceDay.lowPct * scale - randomBetween(rng, 0, 0.8);
    const volumeRatio = sourceDay.volumeRatio * randomBetween(rng, 0.8, 1.25);
    const intradayShape = sourceDay.intradayShape?.map((point, pointIndex, points) => {
      const isTail = pointIndex === points.length - 1;
      return round(point * scale + (isTail ? closeTail : randomBetween(rng, -0.4, 0.4)));
    });

    return normalizeDay({
      openPct,
      highPct,
      lowPct,
      closePct,
      volumeRatio,
      ...(intradayShape !== undefined ? { intradayShape } : {})
    });
  });

  return createTemplate({
    id: `${template.id}-perturbed-${hashSeed(seed).toString(16)}`,
    templateType: template.templateType,
    source: template.source,
    anonymized: true,
    days
  });
}

export function getTemplateDayReturn(template: PriceTemplate, dayIndex: number): number {
  if (template.days.length === 0) {
    return 0;
  }
  const index = Math.max(0, Math.min(template.days.length - 1, dayIndex));
  const current = template.days[index] ?? template.days[0];
  if (current === undefined) {
    return 0;
  }
  if (index === 0) {
    return round(current.closePct - current.openPct);
  }

  const previousCloseIndex = 100 + (template.days[index - 1]?.closePct ?? current.openPct);
  const currentCloseIndex = 100 + current.closePct;
  return round(((currentCloseIndex - previousCloseIndex) / previousCloseIndex) * 100);
}

export function createBackgroundMarketFunds(seed: string | number): BackgroundMarketFunds {
  const rng = createSeededRng(seed);
  return {
    passiveLiquidity: round(randomBetween(rng, -1.5, 1.5)),
    npcRetailFlow: round(randomBetween(rng, -4, 4)),
    hotMoneyFlow: round(randomBetween(rng, -6, 6)),
    sectorRotationFlow: round(randomBetween(rng, -5, 5)),
    quantFlow: round(randomBetween(rng, -3.5, 3.5))
  };
}

export function resolveBackgroundMarketFundsModifier(funds: BackgroundMarketFunds): number {
  return round(
    funds.passiveLiquidity * 0.15 +
      funds.npcRetailFlow * 0.2 +
      funds.hotMoneyFlow * 0.25 +
      funds.sectorRotationFlow * 0.25 +
      funds.quantFlow * 0.15
  );
}

export function resolveRetailCrowdModifier(input: RetailCrowdModifierInput): number {
  const crowdedPenalty = Math.max(0, input.crowdedness - 60) * -0.03;
  const holderMood = input.holderMood ?? 0;
  return round(input.playerTradePressure * 0.45 + input.danmakuSentiment * 0.35 + holderMood * 0.15 + crowdedPenalty);
}

export function resolveStockReturn(input: StockPriceEngineInput, roomType: GameRoomType): number {
  const weights = PRICE_ENGINE_WEIGHTS[roomType];
  const raw =
    input.templateReturn * weights.templateReturn +
    input.sectorModifier * weights.sectorModifier +
    input.institutionModifier * weights.institutionModifier +
    input.retailCrowdModifier * weights.retailCrowdModifier +
    input.quantModifier * weights.quantModifier +
    input.regulationModifier * weights.regulationModifier +
    input.randomNoise * weights.randomNoise;

  return round(clamp(raw, -20, 20));
}

function createSyntheticTemplate(id: string, templateType: PriceTemplateType, days: PriceTemplateDay[]): PriceTemplate {
  if (days.length !== TEMPLATE_DAYS) {
    throw new Error(`Synthetic template ${id} must contain ${TEMPLATE_DAYS} days.`);
  }
  return createTemplate({
    id,
    templateType,
    source: "synthetic",
    anonymized: true,
    days
  });
}

function createTemplate(params: Omit<PriceTemplate, "features">): PriceTemplate {
  const days = params.days.map(normalizeDay);
  return {
    ...params,
    anonymized: params.anonymized === true,
    days,
    features: calculateTemplateFeatures(days)
  };
}

function day(
  openPct: number,
  highPct: number,
  lowPct: number,
  closePct: number,
  volumeRatio: number,
  intradayShape: number[]
): PriceTemplateDay {
  return normalizeDay({ openPct, highPct, lowPct, closePct, volumeRatio, intradayShape });
}

function normalizeDay(source: PriceTemplateDay): PriceTemplateDay {
  const openPct = round(source.openPct);
  const closePct = round(source.closePct);
  const highPct = round(Math.max(source.highPct, openPct, closePct));
  const lowPct = round(Math.min(source.lowPct, openPct, closePct));
  return {
    openPct,
    highPct,
    lowPct,
    closePct,
    volumeRatio: round(Math.max(0.01, source.volumeRatio)),
    ...(source.intradayShape !== undefined ? { intradayShape: source.intradayShape.map(round) } : {})
  };
}

function calculateTemplateFeatures(days: PriceTemplateDay[]): PriceTemplate["features"] {
  const firstDay = days[0];
  const lastDay = days[days.length - 1];
  if (firstDay === undefined || lastDay === undefined) {
    return {
      volatility: 0,
      trendStrength: 0,
      maxDrawdown: 0,
      limitUpCount: 0,
      limitDownCount: 0,
      turnoverLevel: 0,
      boardBreakCount: 0
    };
  }

  const returns = days.map((item, index) => {
    if (index === 0) {
      return item.closePct - item.openPct;
    }
    const previous = 100 + (days[index - 1]?.closePct ?? item.openPct);
    const current = 100 + item.closePct;
    return ((current - previous) / previous) * 100;
  });
  const volatility = standardDeviation(returns);
  const closes = days.map((item) => 100 + item.closePct);
  const maxDrawdown = calculateMaxDrawdown(closes);
  const trendStrength = Math.abs(lastDay.closePct - firstDay.openPct) / Math.max(1, volatility);
  const limitUpCount = returns.filter((item) => item >= 9.5).length;
  const limitDownCount = returns.filter((item) => item <= -9.5).length;
  const turnoverLevel = days.reduce((sum, item) => sum + item.volumeRatio, 0) / days.length;
  const boardBreakCount = days.filter((item) => item.highPct - item.closePct >= 5 && item.volumeRatio >= 2).length;

  return {
    volatility: round(volatility),
    trendStrength: round(trendStrength),
    maxDrawdown: round(maxDrawdown),
    limitUpCount,
    limitDownCount,
    turnoverLevel: round(turnoverLevel),
    boardBreakCount
  };
}

function inferTemplateType(days: PriceTemplateDay[]): PriceTemplateType {
  const features = calculateTemplateFeatures(days);
  const firstClose = days[0]?.closePct ?? 0;
  const lastClose = days[days.length - 1]?.closePct ?? firstClose;

  if (features.maxDrawdown >= 15 && lastClose < firstClose) return "DRAWDOWN";
  if (features.limitUpCount >= 2) return "LEADER_STREAK";
  if (features.boardBreakCount >= 1) return "BOARD_BREAK";
  if (features.volatility <= 3) return "DEFENSIVE_RANGE";
  if (lastClose - firstClose >= 12 && features.volatility <= 7) return "CORE_TREND";
  return "HIDDEN_START";
}

function preferredTemplateTypes(personality: NayinPersonality): PriceTemplateType[] {
  switch (personality) {
    case "龙头":
    case "妖股":
    case "高位":
    case "弱转强":
      return ["LEADER_STREAK", "BOARD_BREAK", "HIGH_LEVEL_DIVERGENCE"];
    case "中军":
    case "趋势":
    case "轮动":
      return ["CORE_TREND"];
    case "暗线":
    case "潜伏":
    case "启动":
    case "信息":
      return ["HIDDEN_START"];
    case "防守":
    case "横盘":
      return ["DEFENSIVE_RANGE"];
    case "后排":
    case "跟风":
      return ["ONE_DAY_HYPE", "BOARD_BREAK"];
    default:
      return ["CORE_TREND"];
  }
}

function weightedPick<T extends { weight: number }>(items: T[], seed: string | number): T {
  const totalWeight = items.reduce((sum, item) => sum + Math.max(0, item.weight), 0);
  const rng = createSeededRng(seed);
  let cursor = rng() * totalWeight;

  for (const item of items) {
    cursor -= Math.max(0, item.weight);
    if (cursor <= 0) {
      return item;
    }
  }

  const fallback = items[items.length - 1];
  if (fallback === undefined) {
    throw new Error("Cannot pick a weighted item from an empty list.");
  }

  return fallback;
}

function cloneTemplate(template: PriceTemplate): PriceTemplate {
  return {
    ...template,
    days: template.days.map((item) => ({
      ...item,
      ...(item.intradayShape !== undefined ? { intradayShape: [...item.intradayShape] } : {})
    })),
    features: { ...template.features }
  };
}

function createSeededRng(seed: string | number): () => number {
  let state = hashSeed(seed);
  return () => {
    state |= 0;
    state = (state + 0x6d2b79f5) | 0;
    let next = Math.imul(state ^ (state >>> 15), 1 | state);
    next = (next + Math.imul(next ^ (next >>> 7), 61 | next)) ^ next;
    return ((next ^ (next >>> 14)) >>> 0) / 4294967296;
  };
}

function hashSeed(seed: string | number): number {
  const text = String(seed);
  let hash = 2166136261;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function randomBetween(rng: () => number, min: number, max: number): number {
  return min + (max - min) * rng();
}

function toPct(value: number, base: number): number {
  return ((value - base) / base) * 100;
}

function positiveNumber(value: number | undefined, label: string): number {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
    throw new Error(`Invalid ${label} in OHLCV series.`);
  }
  return value;
}

function standardDeviation(values: number[]): number {
  if (values.length === 0) {
    return 0;
  }
  const average = values.reduce((sum, item) => sum + item, 0) / values.length;
  const variance = values.reduce((sum, item) => sum + (item - average) ** 2, 0) / values.length;
  return Math.sqrt(variance);
}

function calculateMaxDrawdown(values: number[]): number {
  let peak = values[0] ?? 0;
  let drawdown = 0;
  for (const value of values) {
    peak = Math.max(peak, value);
    if (peak > 0) {
      drawdown = Math.max(drawdown, ((peak - value) / peak) * 100);
    }
  }
  return drawdown;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function round(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}
