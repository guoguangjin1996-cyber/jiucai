import type { StockMarketState } from "../types";

export interface BoardStrengthMetrics {
  sealBuyDepth: number;
  dailyLiquidity: number;
  sellPressure: number;
  boardDurationSec: number;
  expectedBoardDurationSec: number;
  refillSpeed: number;
  sectorResonance: number;
  cancelRate: number;
}

export interface DanmakuHeatMetrics {
  totalCount: number;
  bullishCount: number;
  bearishCount: number;
  uniqueSpeakerCount: number;
  activePlayerCount: number;
  mainForceHypeCount: number;
  repeatRate: number;
  emotionWordScore: number;
}

export interface T1CrowdednessMetrics {
  lockedHolderCount: number;
  activePlayerCount: number;
  lockedCapital: number;
  dailyLiquidity: number;
  todayBuyCount: number;
  totalHolderCount: number;
  avgEntryPrice: number;
  currentPrice: number;
  lowLiquidityRisk: number;
}

export interface OverheatRiskInput {
  boardStrength: number;
  danmakuHeat: number;
  t1Crowdedness: number;
  lowLiquidityRisk: number;
  crowdedness: number;
  volatilityRisk: number;
  mainForceTrace: number;
  boardBreakRisk: number;
}

export interface OverheatRiskMetrics extends OverheatRiskInput {
  overheatRisk: number;
  quantAttention: number;
  regulationAttention: number;
  riskFlags: string[];
  nextDayLowOpenRisk: number;
}

export interface OverheatRiskViewModel {
  stockId: string;
  stockName: string;
  boardStrength: number;
  boardStrengthLabel: string;
  danmakuHeat: number;
  danmakuHeatLabel: string;
  t1Crowdedness: number;
  t1CrowdednessLabel: string;
  overheatRisk: number;
  quantAttention: number;
  regulationAttention: number;
  nextDayLowOpenRisk: number;
  riskFlags: string[];
}

export function clamp(value: number, min = 0, max = 100): number {
  if (Number.isNaN(value)) return min;
  if (value === Number.POSITIVE_INFINITY) return max;
  if (value === Number.NEGATIVE_INFINITY) return min;
  return Math.min(Math.max(value, min), max);
}

export function calculateBoardStrength(metrics: BoardStrengthMetrics): number {
  const sealCoverageScore = clamp(safeRatio(metrics.sealBuyDepth, metrics.dailyLiquidity) * 100);
  const sellPressureScore = clamp(safeRatio(metrics.sellPressure, metrics.dailyLiquidity) * 100);
  const durationScore = clamp(safeRatio(metrics.boardDurationSec, metrics.expectedBoardDurationSec) * 100);

  return roundScore(
    clamp(
      sealCoverageScore * 0.35 +
        durationScore * 0.2 +
        clamp(metrics.refillSpeed) * 0.15 +
        clamp(metrics.sectorResonance) * 0.15 -
        clamp(metrics.cancelRate) * 0.1 -
        sellPressureScore * 0.15
    )
  );
}

export function getBoardStrengthLabel(value: number): string {
  const score = clamp(value);
  if (score >= 80) return "封单很硬";
  if (score >= 55) return "封单尚稳";
  if (score >= 30) return "封单摇晃";
  return "封单松散";
}

export function calculateDanmakuHeat(metrics: DanmakuHeatMetrics, baselineDanmakuCount: number): number {
  const totalCount = Math.max(metrics.totalCount, 0);
  const volumeScore = clamp(safeRatio(totalCount, baselineDanmakuCount) * 100);
  const bullishRatio = metrics.bullishCount / Math.max(totalCount, 1);
  const bearishRatio = metrics.bearishCount / Math.max(totalCount, 1);
  const consensusScore = clamp(Math.abs(bullishRatio - bearishRatio) * 100);
  const participationScore = clamp(safeRatio(metrics.uniqueSpeakerCount, Math.max(metrics.activePlayerCount, 1)) * 100);
  const mainForceHypeScore = clamp(safeRatio(metrics.mainForceHypeCount, Math.max(totalCount, 1)) * 100);

  return roundScore(
    clamp(
      volumeScore * 0.3 +
        consensusScore * 0.25 +
        participationScore * 0.15 +
        clamp(metrics.repeatRate) * 0.1 +
        mainForceHypeScore * 0.1 +
        clamp(metrics.emotionWordScore) * 0.1
    )
  );
}

export function getDanmakuHeatLabel(value: number): string {
  const score = clamp(value);
  if (score >= 80) return "弹幕爆棚";
  if (score >= 55) return "弹幕升温";
  if (score >= 30) return "零星讨论";
  return "安静观望";
}

export function calculateT1Crowdedness(metrics: T1CrowdednessMetrics): number {
  const holderCrowdScore = clamp(safeRatio(metrics.lockedHolderCount, Math.max(metrics.activePlayerCount, 1)) * 100);
  const capitalCrowdScore = clamp(safeRatio(metrics.lockedCapital, Math.max(metrics.dailyLiquidity, 1)) * 100);
  const buyConcentrationScore = clamp(safeRatio(metrics.todayBuyCount, Math.max(metrics.totalHolderCount, 1)) * 100);
  const entryPressureScore =
    metrics.avgEntryPrice > metrics.currentPrice
      ? clamp(((metrics.avgEntryPrice - metrics.currentPrice) / metrics.avgEntryPrice) * 300)
      : 0;

  return roundScore(
    clamp(
      holderCrowdScore * 0.3 +
        capitalCrowdScore * 0.25 +
        buyConcentrationScore * 0.15 +
        clamp(metrics.lowLiquidityRisk) * 0.15 +
        entryPressureScore * 0.15
    )
  );
}

export function getT1CrowdednessLabel(value: number): string {
  const score = clamp(value);
  if (score >= 80) return "锁仓拥堵";
  if (score >= 70) return "T+1拥挤";
  if (score >= 40) return "锁仓偏多";
  return "锁仓清淡";
}

export function calculateOverheatRisk(input: OverheatRiskInput): OverheatRiskMetrics {
  const boardStrength = clamp(input.boardStrength);
  const danmakuHeat = clamp(input.danmakuHeat);
  const t1Crowdedness = clamp(input.t1Crowdedness);
  const lowLiquidityRisk = clamp(input.lowLiquidityRisk);
  const crowdedness = clamp(input.crowdedness);
  const volatilityRisk = clamp(input.volatilityRisk);
  const mainForceTrace = clamp(input.mainForceTrace);
  const baseBoardBreakRisk = clamp(input.boardBreakRisk);

  const overheatRisk = roundScore(
    clamp(boardStrength * 0.25 + danmakuHeat * 0.25 + t1Crowdedness * 0.3 + lowLiquidityRisk * 0.2)
  );
  const highHarvestZone = boardStrength >= 80 && danmakuHeat >= 80 && t1Crowdedness >= 70;
  const boardBreakRisk = clamp(baseBoardBreakRisk + (highHarvestZone ? 20 : 0));
  const quantAttention = roundScore(
    clamp(
      overheatRisk * 0.45 +
        crowdedness * 0.25 +
        volatilityRisk * 0.15 +
        mainForceTrace * 0.15 +
        (highHarvestZone ? 15 : 0)
    )
  );
  const regulationAttention = roundScore(
    clamp(boardStrength * 0.3 + danmakuHeat * 0.25 + baseBoardBreakRisk * 0.25 + mainForceTrace * 0.2)
  );
  const nextDayLowOpenRisk = roundScore(clamp(overheatRisk * 0.65 + boardBreakRisk * 0.2 + (highHarvestZone ? 15 : 0)));
  const metrics: OverheatRiskMetrics = {
    boardStrength,
    danmakuHeat,
    t1Crowdedness,
    lowLiquidityRisk,
    crowdedness,
    volatilityRisk,
    mainForceTrace,
    boardBreakRisk,
    overheatRisk,
    quantAttention,
    regulationAttention,
    riskFlags: [],
    nextDayLowOpenRisk
  };

  return {
    ...metrics,
    riskFlags: resolveOverheatRiskTags(metrics)
  };
}

export function resolveOverheatRiskTags(metrics: Pick<OverheatRiskMetrics, "quantAttention" | "t1Crowdedness" | "regulationAttention" | "boardStrength" | "danmakuHeat">): string[] {
  const tags: string[] = [];
  if (clamp(metrics.quantAttention) >= 80) tags.push("量化盯上");
  if (clamp(metrics.t1Crowdedness) >= 70) tags.push("T+1拥挤");
  if (clamp(metrics.regulationAttention) >= 70) tags.push("监管关注");
  if (clamp(metrics.boardStrength) >= 80 && clamp(metrics.danmakuHeat) >= 80 && clamp(metrics.t1Crowdedness) >= 70) {
    tags.push("高危收割区");
  }
  return tags;
}

export function buildOverheatRiskViewModel(stock: StockMarketState): OverheatRiskViewModel {
  const metrics = calculateOverheatRisk({
    boardStrength: stock.boardStrength,
    danmakuHeat: stock.danmakuHeat,
    t1Crowdedness: stock.tPlusOneCrowdedness,
    lowLiquidityRisk: 100 - stock.liquidity,
    crowdedness: stock.crowdedness,
    volatilityRisk: stock.volatility,
    mainForceTrace: stock.mainForceHypePower ?? 0,
    boardBreakRisk: stock.boardBreakRisk
  });
  const overheatRisk = stock.overheatRisk ?? metrics.overheatRisk;
  const riskFlags = uniqueStrings([...(stock.riskFlags ?? []), ...metrics.riskFlags]);

  return {
    stockId: stock.id,
    stockName: stock.name,
    boardStrength: clamp(stock.boardStrength),
    boardStrengthLabel: getBoardStrengthLabel(stock.boardStrength),
    danmakuHeat: clamp(stock.danmakuHeat),
    danmakuHeatLabel: getDanmakuHeatLabel(stock.danmakuHeat),
    t1Crowdedness: clamp(stock.tPlusOneCrowdedness),
    t1CrowdednessLabel: getT1CrowdednessLabel(stock.tPlusOneCrowdedness),
    overheatRisk,
    quantAttention: stock.quantAttention,
    regulationAttention: stock.regulationAttention,
    nextDayLowOpenRisk: stock.nextDayLowOpenRisk ?? metrics.nextDayLowOpenRisk,
    riskFlags
  };
}

function safeRatio(numerator: number, denominator: number): number {
  if (denominator <= 0) return 0;
  return numerator / denominator;
}

function roundScore(value: number): number {
  return Math.round(clamp(value) * 100) / 100;
}

function uniqueStrings(values: string[]): string[] {
  return Array.from(new Set(values));
}
