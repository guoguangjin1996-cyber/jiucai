import { describe, expect, it } from "vitest";
import {
  calculateDanmakuPowerMetrics,
  createLimitPrices,
  getInitialRetailTools,
  canUseRetailTool,
  consumeRetailToolUse,
  shouldTriggerAuction920Alarm,
  shouldTriggerCoolDownConfirm,
  shouldTriggerTPlusOneBelt,
  useCoreThermometer,
  useFakeOrderMirror,
  useQuantSniffer,
  useWarningDanmaku,
  type ElementSectorState,
  type GameRoom,
  type PlayerState,
  type StockMarketState
} from "../src";

function stock(overrides: Partial<StockMarketState> = {}): StockMarketState {
  return {
    id: "stock-1",
    templateId: "stock-1",
    name: "山下火",
    element: "火",
    currentPrice: 100,
    previousClose: 100,
    changePercent: 0,
    danmakuHeat: 40,
    viewCountScore: 50,
    holderCountScore: 50,
    moneyFlowScore: 50,
    crowdedness: 50,
    tPlusOneCrowdedness: 50,
    quantAttention: 50,
    regulationAttention: 50,
    liquidity: 50,
    volatility: 50,
    sectorBeta: 50,
    isLimitUp: false,
    isLimitDown: false,
    boardStrength: 50,
    boardBreakRisk: 50,
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
    risk: 50,
    popularityScore: 50,
    strengthScore: 50,
    moneyFlowScore: 50,
    riskScore: 50,
    resonanceScore: 50,
    statusTags: [],
    stocks
  };
}

function room(stocks: StockMarketState[]): GameRoom {
  const { limitUpPrice, limitDownPrice } = createLimitPrices(100, 0.1);
  return {
    id: "room-1",
    roomType: "STANDARD_20",
    status: "playing",
    players: [],
    institution: {
      playerId: "institution-1",
      controlPoints: 5,
      fakeNewsCount: 2,
      exposure: 0,
      harvestScore: 0,
      washScore: 0,
      usedActions: []
    },
    market: {
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
    },
    day: 1,
    maxDays: 5,
    phase: "MORNING_TRADING",
    logs: []
  };
}

function player(overrides: Partial<PlayerState> = {}): PlayerState {
  return {
    id: "player-1",
    nickname: "虚构玩家",
    isBot: false,
    role: "retail",
    alive: true,
    capital: 100,
    confidence: 3,
    score: 0,
    position: { hasPosition: false, amountLevel: "none", sellable: false },
    positions: [],
    suspicion: 0,
    votedToday: false,
    ...overrides
  };
}

describe("retail tools", () => {
  it("gives LEEK_RADAR two daily uses by default", () => {
    const radar = getInitialRetailTools("player-1").find((tool) => tool.toolType === "LEEK_RADAR");
    expect(radar?.remainingUses).toBe(2);
  });

  it("triggers T_PLUS_ONE_BELT before buying crowded T+1 stocks", () => {
    expect(shouldTriggerTPlusOneBelt(player(), stock({ tPlusOneCrowdedness: 75, tags: ["T+1拥挤"] }), "MORNING_TRADING")).toBe(true);
  });

  it("triggers AUCTION_920_ALARM near the end of AUCTION_FREE", () => {
    expect(shouldTriggerAuction920Alarm("AUCTION_FREE", 8)).toBe(true);
  });

  it("lets WARNING_DANMAKU raise retailWarningPower", () => {
    const result = useWarningDanmaku(room([stock({ retailWarningPower: 5 })]), "player-1", "stock-1", "WARN_RISK");
    const updated = result.room?.market.sectors?.[0]?.stocks[0];
    expect(updated?.retailWarningPower).toBeGreaterThan(5);
    expect(calculateDanmakuPowerMetrics({ stockId: "stock-1", danmakuHeat: 60, warningType: "WARN_RISK" }).retailWarningPower).toBeGreaterThan(0);
  });

  it("returns fakeOrderRisk from FAKE_ORDER_MIRROR", () => {
    const result = useFakeOrderMirror(room([stock({ boardStrength: 90, boardBreakRisk: 80, isLimitUp: true })]), "player-1", "stock-1");
    expect(result.payload?.fakeOrderRisk).toBeGreaterThan(70);
  });

  it("returns quantAttention from QUANT_SNIFFER", () => {
    const result = useQuantSniffer(room([stock({ quantAttention: 88 })]), "player-1", "stock-1");
    expect(result.payload?.quantAttention).toBe(88);
  });

  it("reduces back-row chase heat when the center force dives", () => {
    const core = stock({ id: "core", tags: ["中军"], changePercent: -4 });
    const backRow = stock({ id: "back", tags: ["后排"], danmakuHeat: 80, crowdedness: 80 });
    const result = useCoreThermometer(room([core, backRow]), "player-1", "火");
    const updatedBackRow = result.room?.market.sectors?.[0]?.stocks.find((item) => item.id === "back");
    expect(result.triggered).toBe(true);
    expect(updatedBackRow?.danmakuHeat).toBeLessThan(80);
  });

  it("triggers COOL_DOWN_CONFIRM on high-risk buys", () => {
    expect(shouldTriggerCoolDownConfirm(player(), stock({ overheatRisk: 85, riskFlags: ["高危收割区"] }), "MORNING_TRADING")).toBe(true);
  });

  it("blocks active tools after uses are exhausted", () => {
    const tool = { ...getInitialRetailTools("player-1").find((item) => item.toolType === "FAKE_ORDER_MIRROR")!, remainingUses: 0 };
    expect(canUseRetailTool(tool, room([stock()]), "MORNING_TRADING")).toBe(false);
  });

  it("does not consume passive tools", () => {
    const tool = getInitialRetailTools("player-1").find((item) => item.toolType === "T_PLUS_ONE_BELT")!;
    expect(consumeRetailToolUse(tool, room([stock()]))).toMatchObject({
      toolType: "T_PLUS_ONE_BELT",
      remainingUses: 0,
      passive: true
    });
  });
});
