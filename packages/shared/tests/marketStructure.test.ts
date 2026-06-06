import { describe, expect, it } from "vitest";
import {
  calculateLeadershipScore,
  calculatePopularityScore,
  calculateRiskScore,
  createFullMarketSectors,
  ELEMENT_SECTOR_TEMPLATES,
  getInstitutionInitialResources,
  getRoomTypeConfig,
  getNayinStockTemplates,
  getStockCardTags,
  hasForbiddenRealMarketText,
  INSTITUTION_COUNT,
  MAX_PLAYERS,
  RETAIL_COUNT,
  rankPlayersByROI,
  resetDailyOperationCredit,
  resolveChampion,
  resolveMarketRankings,
  resolveSectorStatusTags,
  resolveStockTags,
  type ElementSectorState,
  type InstitutionPlayerState,
  type PlayerState
} from "../src/index";

function tunedMarket(): ElementSectorState[] {
  return createFullMarketSectors().map((sector, sectorIndex) => ({
    ...sector,
    heat: sectorIndex === 3 ? 80 : 30 + sectorIndex,
    flow: sectorIndex === 3 ? 75 : 20 + sectorIndex,
    resonance: sectorIndex === 3 ? 70 : 20,
    risk: sectorIndex === 0 ? 90 : 20,
    popularityScore: sectorIndex === 3 ? 90 : 40 + sectorIndex,
    strengthScore: sectorIndex === 3 ? 95 : 45 + sectorIndex,
    moneyFlowScore: sectorIndex === 4 ? 88 : 35 + sectorIndex,
    riskScore: sectorIndex === 0 ? 92 : 30 + sectorIndex,
    resonanceScore: sectorIndex === 2 ? 80 : 30,
    stocks: sector.stocks.map((stock, stockIndex) => ({
      ...stock,
      changePercent: stockIndex === 0 ? 10 + sectorIndex : stockIndex === 5 ? -8 : 1,
      danmakuHeat: sectorIndex === 3 && stockIndex === 2 ? 100 : 10 + sectorIndex * 5 + stockIndex,
      viewCountScore: sectorIndex === 3 && stockIndex === 2 ? 95 : 30,
      holderCountScore: sectorIndex === 3 && stockIndex === 2 ? 90 : 25,
      moneyFlowScore: stockIndex === 1 ? 70 : 35,
      crowdedness: stockIndex === 2 ? 85 : 20,
      tPlusOneCrowdedness: sectorIndex === 1 && stockIndex === 1 ? 75 : 20,
      quantAttention: sectorIndex === 0 && stockIndex === 3 ? 82 : 20,
      regulationAttention: sectorIndex === 2 && stockIndex === 2 ? 72 : 20,
      liquidity: stockIndex === 5 ? 30 : stock.liquidity,
      sectorBeta: stockIndex === 5 ? 90 : stock.sectorBeta,
      boardStrength: stockIndex === 0 ? 8 : 0,
      boardBreakRisk: stockIndex === 0 ? 15 : 0
    }))
  }));
}

function player(id: string, role: "institution" | "retail", initialCapital: number, capital: number): PlayerState {
  return {
    id,
    nickname: id,
    isBot: false,
    role,
    alive: true,
    initialCapital,
    finalCapital: capital,
    capital,
    roi: 0,
    confidence: 3,
    score: 0,
    position: { hasPosition: false, amountLevel: "none", sellable: false },
    positions: [],
    dailyActionCount: 0,
    maxDailyActionCount: 3,
    suspicion: 0,
    votedToday: false
  };
}

describe("five-element full-market data system", () => {
  it("calibrates QUICK_10 to 8 players, 2 institutions, and 6 retail players", () => {
    expect(getRoomTypeConfig("QUICK_10")).toMatchObject({
      maxPlayers: 8,
      institutionCount: 2,
      retailCount: 6,
      maxDays: 3,
      stockPoolMode: "NINE_STOCKS"
    });
  });

  it("calibrates STANDARD_20 to 12 players, 2 institutions, and 10 retail players", () => {
    expect(getRoomTypeConfig("STANDARD_20")).toMatchObject({
      maxPlayers: 12,
      institutionCount: 2,
      retailCount: 10,
      maxDays: 5,
      stockPoolMode: "FULL_MARKET"
    });
  });

  it("calibrates LONG_30 to 16 players, 3 institutions, and 13 retail players", () => {
    expect(getRoomTypeConfig("LONG_30")).toMatchObject({
      maxPlayers: 16,
      institutionCount: 3,
      retailCount: 13,
      maxDays: 7,
      stockPoolMode: "FULL_MARKET"
    });
  });

  it("keeps legacy constants as compatibility defaults instead of room type sources", () => {
    expect(MAX_PLAYERS).toBe(8);
    expect(INSTITUTION_COUNT).toBe(2);
    expect(RETAIL_COUNT).toBe(6);
    expect(getRoomTypeConfig("LONG_30").maxPlayers).not.toBe(MAX_PLAYERS);
    expect(getRoomTypeConfig("STANDARD_20").retailCount).not.toBe(RETAIL_COUNT);
  });

  it("sets and resets institution operation resources without clearing off-market spend", () => {
    expect(getInstitutionInitialResources("STANDARD_20")).toMatchObject({
      initialCapital: 1000,
      managedCapital: 20000,
      dailyOperationCredit: 5000,
      influenceBudget: 120,
      maxControlPoints: 5
    });

    const institution: InstitutionPlayerState = {
      playerId: "main-force",
      initialCapital: 1000,
      capital: 1000,
      finalCapital: 1000,
      roi: 0,
      managedCapital: 20000,
      dailyOperationCredit: 5000,
      usedOperationCredit: 3500,
      influenceBudget: 120,
      influenceSpent: 30,
      controlPoints: 1,
      maxControlPoints: 5,
      fakeNewsCount: 2,
      personalHarvestScore: 0,
      exposed: false,
      focused: false,
      hiddenDays: 0
    };

    expect(resetDailyOperationCredit(institution)).toMatchObject({
      usedOperationCredit: 0,
      controlPoints: 5,
      influenceSpent: 30,
      managedCapital: 20000,
      influenceBudget: 120
    });
  });

  it("contains 5 element sectors, 30 Nayin stocks, and 6 stocks per sector", () => {
    expect(ELEMENT_SECTOR_TEMPLATES).toHaveLength(5);
    expect(getNayinStockTemplates()).toHaveLength(30);
    for (const sector of ELEMENT_SECTOR_TEMPLATES) {
      expect(sector.nayinPool).toHaveLength(6);
    }
  });

  it("calculates popularity, leadership, and risk scores", () => {
    expect(
      calculatePopularityScore({
        danmakuHeat: 100,
        viewCountScore: 80,
        holderCountScore: 70,
        changeHeatScore: 60,
        focusVoteScore: 50,
        mainForceHypeScore: 40
      })
    ).toBeGreaterThan(70);
    expect(
      calculateLeadershipScore({
        changePercentScore: 90,
        boardStrengthScore: 90,
        sectorHeatContributionScore: 80,
        earlyRiseScore: 70,
        peerBoostScore: 60
      })
    ).toBeGreaterThan(80);
    expect(
      calculateRiskScore({
        quantAttention: 90,
        tPlusOneCrowdedness: 80,
        regulationAttention: 70,
        lowLiquidityRisk: 60,
        tailRisk: 50
      })
    ).toBeGreaterThan(70);
  });

  it("assigns stock tags and keeps stock cards to 4 visible tags", () => {
    const tagged = resolveStockTags(tunedMarket());
    const allStocks = tagged.flatMap((sector) => sector.stocks);
    expect(allStocks.some((stock) => stock.tags.includes("人气龙"))).toBe(true);
    for (const sector of tagged) {
      expect(sector.stocks.some((stock) => stock.tags.includes("领涨龙"))).toBe(true);
    }
    expect(allStocks.filter((stock) => stock.tags.includes("弹幕龙")).length).toBe(3);
    expect(allStocks.some((stock) => stock.quantAttention >= 80 && stock.tags.includes("量化盯上"))).toBe(true);
    expect(allStocks.some((stock) => stock.tPlusOneCrowdedness >= 70 && stock.tags.includes("T+1拥挤"))).toBe(true);
    expect(allStocks.some((stock) => stock.regulationAttention >= 70 && stock.tags.includes("监管关注"))).toBe(true);
    expect(getStockCardTags(["人气龙", "领涨龙", "弹幕龙", "卡位龙", "中军"]).length).toBeLessThanOrEqual(4);
  });

  it("assigns sector status tags and ranks market lists", () => {
    const sectors = resolveSectorStatusTags(resolveStockTags(tunedMarket()));
    expect(sectors.some((sector) => sector.statusTags.includes("五行人气王"))).toBe(true);
    expect(sectors.some((sector) => sector.statusTags.includes("主线王"))).toBe(true);
    expect(sectors.some((sector) => sector.statusTags.includes("量化重灾区"))).toBe(true);
    const rankings = resolveMarketRankings(sectors);
    expect(rankings.stockPopularityRank[0]).toBeDefined();
    expect(rankings.stockQuantRiskRank[0]).toBe("metal-sha-zhong-jin");
    expect(rankings.sectorPopularityRank[0]).toBe("火");
  });

  it("uses ROI to decide the champion instead of raw capital", () => {
    const players = [
      player("main-force", "institution", 1000, 1100),
      player("retail-fire", "retail", 100, 160),
      player("retail-flat", "retail", 100, 105)
    ];
    const champion = resolveChampion(players);
    expect(champion?.id).toBe("retail-fire");
    expect(rankPlayersByROI(players)[0]?.id).not.toBe("main-force");
  });

  it("keeps generated market UI vocabulary fictional", () => {
    const texts = [
      ...ELEMENT_SECTOR_TEMPLATES.map((sector) => `${sector.name}${sector.description}${sector.styleTags.join("")}`),
      ...getNayinStockTemplates().map((stock) => stock.name)
    ];
    expect(texts.some((text) => hasForbiddenRealMarketText(text))).toBe(false);
  });
});
