import type {
  ElementSectorState,
  ElementType,
  MarketRankings,
  DanmakuPowerMetrics,
  RetailWarningDanmakuType,
  SectorStatusTag,
  StockMarketState,
  StockPopularityMetrics,
  StockTag
} from "../types";

export interface PopularityScoreInput {
  danmakuHeat: number;
  viewCountScore: number;
  holderCountScore: number;
  changeHeatScore: number;
  focusVoteScore: number;
  mainForceHypeScore: number;
}

export interface LeadershipScoreInput {
  changePercentScore: number;
  boardStrengthScore: number;
  sectorHeatContributionScore: number;
  earlyRiseScore: number;
  peerBoostScore: number;
}

export interface RiskScoreInput {
  quantAttention: number;
  tPlusOneCrowdedness: number;
  regulationAttention: number;
  lowLiquidityRisk: number;
  tailRisk: number;
}

export interface DanmakuPowerInput {
  stockId: string;
  danmakuHeat: number;
  riskWarningCount?: number;
  fakeOrderCalloutCount?: number;
  tPlusOneWarningCount?: number;
  quantWarningCount?: number;
  coreDiveWarningCount?: number;
  hypeCount?: number;
  repeatHypeCount?: number;
  fakeWarningCount?: number;
  warningType?: RetailWarningDanmakuType;
  noisePower?: number;
}

export function calculatePopularityScore(input: PopularityScoreInput): number {
  return roundScore(
    input.danmakuHeat * 0.3 +
      input.viewCountScore * 0.15 +
      input.holderCountScore * 0.2 +
      input.changeHeatScore * 0.15 +
      input.focusVoteScore * 0.1 +
      input.mainForceHypeScore * 0.1
  );
}

export function calculateLeadershipScore(input: LeadershipScoreInput): number {
  return roundScore(
    input.changePercentScore * 0.3 +
      input.boardStrengthScore * 0.25 +
      input.sectorHeatContributionScore * 0.2 +
      input.earlyRiseScore * 0.15 +
      input.peerBoostScore * 0.1
  );
}

export function calculateRiskScore(input: RiskScoreInput): number {
  return roundScore(
    input.quantAttention * 0.3 +
      input.tPlusOneCrowdedness * 0.25 +
      input.regulationAttention * 0.2 +
      input.lowLiquidityRisk * 0.15 +
      input.tailRisk * 0.1
  );
}

export function calculateDanmakuPowerMetrics(input: DanmakuPowerInput): DanmakuPowerMetrics {
  const warningBoost = warningTypeCountBoost(input.warningType);
  const riskWarningCount = (input.riskWarningCount ?? 0) + (input.warningType === "WARN_RISK" ? warningBoost : 0);
  const fakeOrderCalloutCount =
    (input.fakeOrderCalloutCount ?? 0) + (input.warningType === "CALLOUT_FAKE_ORDER" ? warningBoost : 0);
  const tPlusOneWarningCount =
    (input.tPlusOneWarningCount ?? 0) + (input.warningType === "WARN_T_PLUS_ONE" ? warningBoost : 0);
  const quantWarningCount = (input.quantWarningCount ?? 0) + (input.warningType === "WARN_QUANT" ? warningBoost : 0);
  const coreDiveWarningCount =
    (input.coreDiveWarningCount ?? 0) + (input.warningType === "WARN_CORE_DIVE" ? warningBoost : 0);
  const hypeCount = (input.hypeCount ?? 0) + (input.warningType === "QUESTION_HYPE" ? warningBoost : 0);
  const repeatHypeCount = input.repeatHypeCount ?? 0;
  const fakeWarningCount = input.fakeWarningCount ?? 0;
  const riskWarningScore = clampScore(riskWarningCount * 12);
  const fakeOrderCalloutScore = clampScore(fakeOrderCalloutCount * 14);
  const tPlusOneWarningScore = clampScore(tPlusOneWarningCount * 12);
  const quantWarningScore = clampScore(quantWarningCount * 12);
  const coreDiveWarningScore = clampScore(coreDiveWarningCount * 12);
  const retailWarningPower = roundScore(
    riskWarningScore * 0.3 +
      fakeOrderCalloutScore * 0.25 +
      tPlusOneWarningScore * 0.2 +
      quantWarningScore * 0.15 +
      coreDiveWarningScore * 0.1
  );
  const mainForceHypePower = roundScore(clampScore(hypeCount * 12 + repeatHypeCount * 8));
  const noisePower = roundScore(clampScore(input.noisePower ?? fakeWarningCount * 10));
  const netDanmakuEffect = roundScore(
    clampScore(input.danmakuHeat) - retailWarningPower * 0.6 + mainForceHypePower * 0.4 + noisePower * 0.2
  );

  return {
    stockId: input.stockId,
    danmakuHeat: clampScore(input.danmakuHeat),
    retailWarningPower,
    mainForceHypePower,
    noisePower,
    riskWarningCount,
    fakeOrderCalloutCount,
    tPlusOneWarningCount,
    quantWarningCount,
    coreDiveWarningCount,
    hypeCount,
    repeatHypeCount,
    fakeWarningCount,
    netDanmakuEffect
  };
}

export function calculateQuantAttention(params: {
  crowdedness: number;
  volatilityRisk: number;
  liquidityRisk: number;
  danmakuHeat: number;
  mainForceTrace: number;
  tPlusOneLockedCount: number;
}): number {
  return roundScore(
    params.crowdedness * 0.35 +
      params.volatilityRisk * 0.2 +
      params.liquidityRisk * 0.2 +
      params.danmakuHeat * 0.1 +
      params.mainForceTrace * 0.1 +
      params.tPlusOneLockedCount * 0.05
  );
}

export function calculateStockMetrics(
  stock: StockMarketState,
  sector: ElementSectorState,
  focusVoteScore = 0,
  mainForceHypeScore = 0
): StockPopularityMetrics {
  const changeHeatScore = Math.min(100, Math.abs(stock.changePercent) * 5);
  const changePercentScore = Math.max(0, Math.min(100, stock.changePercent * 5 + 50));
  const lowLiquidityRisk = Math.max(0, 100 - stock.liquidity);
  const tailRisk = stock.sectorBeta > 75 && stock.liquidity < 45 ? 80 : Math.max(0, stock.volatility - 20);
  const popularityScore = calculatePopularityScore({
    danmakuHeat: stock.danmakuHeat,
    viewCountScore: stock.viewCountScore,
    holderCountScore: stock.holderCountScore,
    changeHeatScore,
    focusVoteScore,
    mainForceHypeScore
  });
  const leadershipScore = calculateLeadershipScore({
    changePercentScore,
    boardStrengthScore: stock.boardStrength * 10,
    sectorHeatContributionScore: sector.heat,
    earlyRiseScore: stock.changePercent > 3 ? 70 : 30,
    peerBoostScore: sector.resonance
  });
  const riskScore = calculateRiskScore({
    quantAttention: stock.quantAttention,
    tPlusOneCrowdedness: stock.tPlusOneCrowdedness,
    regulationAttention: stock.regulationAttention,
    lowLiquidityRisk,
    tailRisk
  });

  return {
    stockId: stock.id,
    popularityScore,
    leadershipScore,
    riskScore,
    danmakuScore: stock.danmakuHeat,
    tPlusOneCrowdedness: stock.tPlusOneCrowdedness,
    quantAttention: stock.quantAttention,
    regulationAttention: stock.regulationAttention,
    globalPopularityRank: 0,
    sectorPopularityRank: 0,
    sectorLeadershipRank: 0,
    tags: [...stock.tags]
  };
}

export function resolveStockTags(sectors: ElementSectorState[]): ElementSectorState[] {
  const metricsByStock = new Map<string, StockPopularityMetrics>();
  for (const sector of sectors) {
    for (const stock of sector.stocks) {
      metricsByStock.set(stock.id, calculateStockMetrics(stock, sector));
    }
  }

  const allStocks = sectors.flatMap((sector) => sector.stocks);
  const popularityRank = sortByScore(allStocks, (stock) => metricsByStock.get(stock.id)?.popularityScore ?? 0);
  const danmakuTop3 = new Set(sortByScore(allStocks, (stock) => stock.danmakuHeat).slice(0, 3).map((stock) => stock.id));
  const globalPopularityLeader = popularityRank[0]?.id;

  return sectors.map((sector) => {
    const sectorLeadershipLeader = sortByScore(
      sector.stocks,
      (stock) => metricsByStock.get(stock.id)?.leadershipScore ?? 0
    )[0]?.id;
    const stableCenter = sortByScore(
      sector.stocks,
      (stock) => stock.liquidity + stock.moneyFlowScore - stock.volatility
    )[0]?.id;

    return {
      ...sector,
      stocks: sector.stocks.map((stock) => {
        const metrics = metricsByStock.get(stock.id);
        const tags = new Set<StockTag>();

        if (stock.id === globalPopularityLeader) tags.add("人气龙");
        if (stock.id === sectorLeadershipLeader) tags.add("领涨龙");
        if (danmakuTop3.has(stock.id)) tags.add("弹幕龙");
        if (metrics !== undefined && metrics.leadershipScore >= 75 && stock.boardBreakRisk < 30) tags.add("卡位龙");
        if (stock.id === stableCenter) tags.add("中军");
        if (stock.moneyFlowScore >= 60 && stock.changePercent < 3 && stock.danmakuHeat >= 35) tags.add("暗线");
        if (stock.liquidity < 45 && stock.changePercent > 5 && stock.sectorBeta > 70) tags.add("后排");
        if (stock.changePercent < -5 && sector.heat < 40) tags.add("退潮");
        if (stock.quantAttention >= 80) tags.add("量化盯上");
        if (stock.tPlusOneCrowdedness >= 70) tags.add("T+1拥挤");
        if (stock.regulationAttention >= 70) tags.add("监管关注");

        return {
          ...stock,
          tags: Array.from(tags)
        };
      })
    };
  });
}

export function resolveSectorStatusTags(sectors: ElementSectorState[]): ElementSectorState[] {
  const popularityOrder = sortByScore(sectors, (sector) => sector.popularityScore);
  const strengthOrder = sortByScore(sectors, (sector) => sector.strengthScore);
  const riskOrder = sortByScore(sectors, (sector) => sector.riskScore);
  const danmakuOrder = sortByScore(sectors, (sector) =>
    sector.stocks.reduce((sum, stock) => sum + stock.danmakuHeat, 0)
  );
  const topDmkElement = danmakuOrder[0]?.element;

  return sectors.map((sector) => {
    const popularityRank = popularityOrder.findIndex((item) => item.element === sector.element) + 1;
    const strengthRank = strengthOrder.findIndex((item) => item.element === sector.element) + 1;
    const riskRank = riskOrder.findIndex((item) => item.element === sector.element) + 1;
    const tags = new Set<SectorStatusTag>();

    if (popularityRank === 1) tags.add("五行人气王");
    if (strengthRank === 1) tags.add("主线王");
    if (sector.resonanceScore >= 70 || sector.resonance >= 70) tags.add("轮动先锋");
    if (sector.riskScore <= 35 && sector.moneyFlowScore > 55) tags.add("防守吸血");
    if (sector.heat < 35 && sector.riskScore > 60) tags.add("退潮预警");
    if (riskRank === 1) tags.add("量化重灾区");
    if (sector.element === topDmkElement) tags.add("弹幕爆区");

    return {
      ...sector,
      popularityRank,
      strengthRank,
      riskRank,
      statusTags: Array.from(tags)
    };
  });
}

export function resolveMarketRankings(sectors: ElementSectorState[]): MarketRankings {
  const stocks = sectors.flatMap((sector) => sector.stocks);
  const metrics = new Map<string, StockPopularityMetrics>();
  for (const sector of sectors) {
    for (const stock of sector.stocks) {
      metrics.set(stock.id, calculateStockMetrics(stock, sector));
    }
  }

  return {
    stockPopularityRank: sortByScore(stocks, (stock) => metrics.get(stock.id)?.popularityScore ?? 0).map((stock) => stock.id),
    stockLeadershipRank: sortByScore(stocks, (stock) => metrics.get(stock.id)?.leadershipScore ?? 0).map((stock) => stock.id),
    stockDanmakuRank: sortByScore(stocks, (stock) => stock.danmakuHeat).map((stock) => stock.id),
    stockQuantRiskRank: sortByScore(stocks, (stock) => stock.quantAttention).map((stock) => stock.id),
    stockTPlusOneRank: sortByScore(stocks, (stock) => stock.tPlusOneCrowdedness).map((stock) => stock.id),
    stockRegulationRank: sortByScore(stocks, (stock) => stock.regulationAttention).map((stock) => stock.id),
    stockGainersRank: sortByScore(stocks, (stock) => stock.changePercent).map((stock) => stock.id),
    stockLosersRank: sortByScore(stocks, (stock) => -stock.changePercent).map((stock) => stock.id),
    sectorPopularityRank: sortByScore(sectors, (sector) => sector.popularityScore).map((sector) => sector.element),
    sectorStrengthRank: sortByScore(sectors, (sector) => sector.strengthScore).map((sector) => sector.element),
    sectorRiskRank: sortByScore(sectors, (sector) => sector.riskScore).map((sector) => sector.element),
    sectorMoneyFlowRank: sortByScore(sectors, (sector) => sector.moneyFlowScore).map((sector) => sector.element)
  };
}

export function getStockCardTags(tags: StockTag[], limit = 4): StockTag[] {
  const priority: StockTag[] = [
    "人气龙",
    "领涨龙",
    "卡位龙",
    "量化盯上",
    "T+1拥挤",
    "监管关注",
    "弹幕龙",
    "中军",
    "暗线",
    "后排",
    "退潮"
  ];
  return [...tags].sort((a, b) => priority.indexOf(a) - priority.indexOf(b)).slice(0, limit);
}

export function hasForbiddenRealMarketText(text: string): boolean {
  const forbiddenWords = [
    ["医", "药"],
    ["A", "I"],
    ["半", "导", "体"],
    ["白", "酒"],
    ["机", "器", "人"],
    ["光", "模", "块"]
  ].map((parts) => parts.join(""));
  return forbiddenWords.some((word) => text.includes(word));
}

function sortByScore<T>(items: T[], score: (item: T) => number): T[] {
  return [...items].sort((left, right) => score(right) - score(left));
}

function roundScore(value: number): number {
  return Math.round(value * 100) / 100;
}

function clampScore(value: number): number {
  if (Number.isNaN(value)) return 0;
  return Math.min(Math.max(value, 0), 100);
}

function warningTypeCountBoost(warningType: RetailWarningDanmakuType | undefined): number {
  return warningType === undefined ? 0 : 1;
}
