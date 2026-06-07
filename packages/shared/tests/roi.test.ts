import { describe, expect, it } from "vitest";
import {
  calculatePortfolioValue,
  calculateROI,
  createLimitPrices,
  markToMarketAllPlayers,
  rankPlayersByROI,
  type ElementSectorState,
  type MarketState,
  type PlayerState,
  type StockMarketState
} from "../src";

function stock(overrides: Partial<StockMarketState> = {}): StockMarketState {
  return {
    id: "stock-1",
    templateId: "stock-1",
    name: "山下火",
    element: "火",
    currentPrice: 120,
    previousClose: 100,
    changePercent: 20,
    danmakuHeat: 20,
    viewCountScore: 20,
    holderCountScore: 20,
    moneyFlowScore: 20,
    crowdedness: 20,
    tPlusOneCrowdedness: 20,
    quantAttention: 20,
    regulationAttention: 20,
    liquidity: 70,
    volatility: 40,
    sectorBeta: 50,
    isLimitUp: false,
    isLimitDown: false,
    boardStrength: 0,
    boardBreakRisk: 0,
    tags: [],
    ...overrides
  };
}

function sector(stocks: StockMarketState[]): ElementSectorState {
  return {
    element: "火",
    name: "火系板块",
    heat: 50,
    flow: 50,
    resonance: 50,
    risk: 30,
    popularityScore: 50,
    strengthScore: 50,
    moneyFlowScore: 50,
    riskScore: 30,
    resonanceScore: 50,
    statusTags: [],
    stocks
  };
}

function market(stocks: StockMarketState[]): MarketState {
  const { limitUpPrice, limitDownPrice } = createLimitPrices(100, 0.1);
  return {
    day: 1,
    previousClose: 100,
    openPrice: 100,
    currentPrice: 100,
    closePrice: 100,
    limitRate: 0.1,
    limitUpPrice,
    limitDownPrice,
    isLimitUp: false,
    isLimitDown: false,
    boardStrength: 0,
    boardBreakRisk: 0,
    auctionPressure: 0,
    bullishHeat: 0,
    bearishHeat: 0,
    regulationHeat: 0,
    regulationState: "normal",
    sectors: [sector(stocks)]
  };
}

function player(overrides: Partial<PlayerState> = {}): PlayerState {
  return {
    id: "player-1",
    nickname: "虚构玩家",
    isBot: false,
    role: "retail",
    alive: true,
    initialCapital: 100,
    capital: 20,
    confidence: 3,
    score: 0,
    position: { hasPosition: false, amountLevel: "none", sellable: false },
    positions: [],
    suspicion: 0,
    votedToday: false,
    ...overrides
  };
}

describe("portfolio ROI", () => {
  it("calculates portfolio value from cash plus holding market value", () => {
    const currentMarket = market([stock()]);
    const holder = player({
      positions: [{ stockId: "stock-1", hasPosition: true, amount: 50, investedCapital: 50, costPrice: 100, currentPrice: 100, amountLevel: "normal", sellable: true }]
    });

    expect(calculatePortfolioValue(holder, currentMarket)).toBe(80);
    expect(calculateROI(holder, currentMarket)).toBe(-0.2);
  });

  it("ranks players by final capital after marking holdings to market", () => {
    const currentMarket = market([stock({ id: "winner-stock", currentPrice: 150 })]);
    const cashOnly = player({ id: "cash", capital: 110 });
    const holder = player({
      id: "holder",
      capital: 20,
      positions: [{ stockId: "winner-stock", hasPosition: true, amount: 80, investedCapital: 80, costPrice: 100, currentPrice: 100, amountLevel: "heavy", sellable: true }]
    });
    const marked = markToMarketAllPlayers([cashOnly, holder], currentMarket);
    const ranked = rankPlayersByROI(marked, currentMarket);

    expect(marked.find((item) => item.id === "holder")?.finalCapital).toBe(140);
    expect(ranked[0]?.id).toBe("holder");
  });
});
