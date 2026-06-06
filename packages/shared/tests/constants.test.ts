import { describe, expect, it } from "vitest";
import {
  DEFAULT_LIMIT_RATE,
  INITIAL_CAPITAL,
  INITIAL_CONFIDENCE,
  INSTITUTION_COUNT,
  MAX_DAYS,
  MAX_PLAYERS,
  RETAIL_COUNT,
  type MarketState,
  type PlayerState
} from "../src/index";

describe("shared core types", () => {
  it("creates a PlayerState", () => {
    const player: PlayerState = {
      id: "player-1",
      nickname: "测试韭菜",
      isBot: false,
      role: "retail",
      alive: true,
      capital: INITIAL_CAPITAL,
      confidence: INITIAL_CONFIDENCE,
      score: 0,
      position: {
        hasPosition: false,
        amountLevel: "none",
        sellable: false
      },
      suspicion: 0,
      votedToday: false
    };

    expect(player.role).toBe("retail");
    expect(player.capital).toBe(100);
    expect(player.position.amountLevel).toBe("none");
  });

  it("accepts a legal default MarketState", () => {
    const previousClose = 100;
    const market: MarketState = {
      day: 1,
      previousClose,
      openPrice: previousClose,
      currentPrice: previousClose,
      closePrice: previousClose,
      limitRate: DEFAULT_LIMIT_RATE,
      limitUpPrice: previousClose * (1 + DEFAULT_LIMIT_RATE),
      limitDownPrice: previousClose * (1 - DEFAULT_LIMIT_RATE),
      isLimitUp: false,
      isLimitDown: false,
      boardStrength: 0,
      boardBreakRisk: 0,
      auctionPressure: 0,
      bullishHeat: 0,
      bearishHeat: 0,
      regulationHeat: 0,
      regulationState: "normal"
    };

    expect(market.day).toBe(1);
    expect(market.limitRate).toBeGreaterThan(0);
    expect(market.limitDownPrice).toBeLessThan(market.previousClose);
    expect(market.limitUpPrice).toBeGreaterThan(market.previousClose);
    expect(market.regulationState).toBe("normal");
  });

  it("keeps the 8-player room constants correct", () => {
    expect(MAX_PLAYERS).toBe(8);
    expect(RETAIL_COUNT).toBe(6);
    expect(INSTITUTION_COUNT).toBe(2);
    expect(MAX_PLAYERS - RETAIL_COUNT).toBe(INSTITUTION_COUNT);
    expect(MAX_DAYS).toBe(5);
  });
});
