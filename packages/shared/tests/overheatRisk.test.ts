import { describe, expect, it } from "vitest";
import {
  buildOverheatRiskViewModel,
  calculateBoardStrength,
  calculateDanmakuHeat,
  calculateOverheatRisk,
  calculateT1Crowdedness,
  clamp,
  type StockMarketState
} from "../src";

function highBoard() {
  return {
    sealBuyDepth: 9000,
    dailyLiquidity: 10000,
    sellPressure: 800,
    boardDurationSec: 5400,
    expectedBoardDurationSec: 5400,
    refillSpeed: 85,
    sectorResonance: 90,
    cancelRate: 5
  };
}

function stock(overrides: Partial<StockMarketState> = {}): StockMarketState {
  return {
    id: "fiction-stock-1",
    templateId: "fiction-stock-1",
    name: "山下火",
    element: "火",
    currentPrice: 100,
    previousClose: 100,
    changePercent: 0,
    danmakuHeat: 80,
    viewCountScore: 50,
    holderCountScore: 50,
    moneyFlowScore: 50,
    crowdedness: 80,
    tPlusOneCrowdedness: 75,
    quantAttention: 80,
    regulationAttention: 75,
    liquidity: 30,
    volatility: 80,
    sectorBeta: 60,
    isLimitUp: false,
    isLimitDown: false,
    boardStrength: 85,
    boardBreakRisk: 70,
    tags: [],
    ...overrides
  };
}

describe("overheat risk metrics", () => {
  it("raises boardStrength when seal coverage is high and board duration is long", () => {
    expect(calculateBoardStrength(highBoard())).toBeGreaterThan(70);
  });

  it("lowers boardStrength when cancel rate is high", () => {
    const strong = calculateBoardStrength(highBoard());
    const cancelled = calculateBoardStrength({ ...highBoard(), cancelRate: 95 });
    expect(cancelled).toBeLessThan(strong);
  });

  it("raises danmakuHeat when volume is high and direction is consistent", () => {
    expect(
      calculateDanmakuHeat(
        {
          totalCount: 100,
          bullishCount: 92,
          bearishCount: 2,
          uniqueSpeakerCount: 8,
          activePlayerCount: 8,
          mainForceHypeCount: 2,
          repeatRate: 40,
          emotionWordScore: 60
        },
        50
      )
    ).toBeGreaterThan(70);
  });

  it("increases danmakuHeat when main-force hype appears", () => {
    const base = calculateDanmakuHeat(
      {
        totalCount: 80,
        bullishCount: 60,
        bearishCount: 10,
        uniqueSpeakerCount: 6,
        activePlayerCount: 8,
        mainForceHypeCount: 0,
        repeatRate: 20,
        emotionWordScore: 40
      },
      80
    );
    const hyped = calculateDanmakuHeat(
      {
        totalCount: 80,
        bullishCount: 60,
        bearishCount: 10,
        uniqueSpeakerCount: 6,
        activePlayerCount: 8,
        mainForceHypeCount: 40,
        repeatRate: 20,
        emotionWordScore: 40
      },
      80
    );
    expect(hyped).toBeGreaterThan(base);
  });

  it("raises t1Crowdedness when many holders are locked", () => {
    expect(
      calculateT1Crowdedness({
        lockedHolderCount: 7,
        activePlayerCount: 8,
        lockedCapital: 5000,
        dailyLiquidity: 10000,
        todayBuyCount: 6,
        totalHolderCount: 8,
        avgEntryPrice: 110,
        currentPrice: 100,
        lowLiquidityRisk: 60
      })
    ).toBeGreaterThan(45);
  });

  it("raises t1Crowdedness when locked capital dominates daily liquidity", () => {
    expect(
      calculateT1Crowdedness({
        lockedHolderCount: 6,
        activePlayerCount: 8,
        lockedCapital: 10000,
        dailyLiquidity: 10000,
        todayBuyCount: 4,
        totalHolderCount: 4,
        avgEntryPrice: 120,
        currentPrice: 100,
        lowLiquidityRisk: 85
      })
    ).toBeGreaterThan(65);
  });

  it("assigns quant, T+1, regulation, and harvest-zone flags", () => {
    const metrics = calculateOverheatRisk({
      boardStrength: 95,
      danmakuHeat: 95,
      t1Crowdedness: 90,
      lowLiquidityRisk: 90,
      crowdedness: 95,
      volatilityRisk: 90,
      mainForceTrace: 95,
      boardBreakRisk: 90
    });

    expect(metrics.quantAttention).toBeGreaterThanOrEqual(80);
    expect(metrics.riskFlags).toContain("量化盯上");
    expect(metrics.riskFlags).toContain("T+1拥挤");
    expect(metrics.riskFlags).toContain("监管关注");
    expect(metrics.riskFlags).toContain("高危收割区");
    expect(metrics.nextDayLowOpenRisk).toBeGreaterThan(0);
  });

  it("clamps scores to 0..100 and avoids NaN with zero divisors", () => {
    const values = [
      clamp(999),
      clamp(-99),
      calculateBoardStrength({ ...highBoard(), dailyLiquidity: 0, expectedBoardDurationSec: 0 }),
      calculateDanmakuHeat(
        {
          totalCount: 0,
          bullishCount: 0,
          bearishCount: 0,
          uniqueSpeakerCount: 0,
          activePlayerCount: 0,
          mainForceHypeCount: 0,
          repeatRate: 0,
          emotionWordScore: 0
        },
        0
      ),
      calculateT1Crowdedness({
        lockedHolderCount: 0,
        activePlayerCount: 0,
        lockedCapital: 0,
        dailyLiquidity: 0,
        todayBuyCount: 0,
        totalHolderCount: 0,
        avgEntryPrice: 0,
        currentPrice: 0,
        lowLiquidityRisk: 0
      })
    ];

    for (const value of values) {
      expect(Number.isNaN(value)).toBe(false);
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThanOrEqual(100);
    }
  });

  it("builds a compatible overheat view model from stock state", () => {
    const viewModel = buildOverheatRiskViewModel(stock({ riskFlags: ["高危收割区"] }));
    expect(viewModel.stockName).toBe("山下火");
    expect(viewModel.riskFlags).toContain("高危收割区");
  });
});
