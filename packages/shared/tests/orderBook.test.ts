import { describe, expect, it } from "vitest";
import {
  createFullMarketSectors,
  createInitialOrderBook,
  createLimitPrices,
  createOrderBookViewModel,
  createOrderBooksForSectors,
  createOrderFillViewModel,
  getRoomTypeConfig,
  resolveOrderFill,
  applyOrderFill,
  updateOrderBookByMarketState,
  type ElementSectorState,
  type GameRoom,
  type OrderRequest,
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

function player(overrides: Partial<PlayerState> = {}): PlayerState {
  return {
    id: "player-1",
    nickname: "虚构玩家",
    isBot: false,
    role: "retail",
    alive: true,
    initialCapital: 1000,
    finalCapital: 1000,
    capital: 1000,
    confidence: 3,
    score: 0,
    position: { hasPosition: false, amountLevel: "none", sellable: false },
    positions: [],
    dailyActionCount: 0,
    maxDailyActionCount: 3,
    suspicion: 0,
    votedToday: false,
    ...overrides
  };
}

function room(stocks: StockMarketState[], overrides: Partial<GameRoom> = {}): GameRoom {
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
    logs: [],
    ...overrides
  };
}

function request(side: "buy" | "sell", amount = 1000): OrderRequest {
  return {
    playerId: "player-1",
    stockId: "stock-1",
    side,
    amount,
    orderType: "market",
    phase: "MORNING_TRADING"
  };
}

describe("room type player structures", () => {
  it("sets QUICK_10 as 8 players with 2 institutions and 6 retail players", () => {
    expect(getRoomTypeConfig("QUICK_10")).toMatchObject({
      maxPlayers: 8,
      institutionCount: 2,
      retailCount: 6
    });
  });

  it("sets STANDARD_20 as 12 players with 2 institutions and 10 retail players", () => {
    expect(getRoomTypeConfig("STANDARD_20")).toMatchObject({
      maxPlayers: 12,
      institutionCount: 2,
      retailCount: 10
    });
  });

  it("sets LONG_30 as 16 players with 3 institutions and 13 retail players", () => {
    expect(getRoomTypeConfig("LONG_30")).toMatchObject({
      maxPlayers: 16,
      institutionCount: 3,
      retailCount: 13
    });
  });
});

describe("background order book liquidity", () => {
  it("creates higher depth for leader stocks", () => {
    const leader = createInitialOrderBook(stock({ tags: ["人气龙", "领涨龙"], liquidity: 80 }));

    expect(leader.buyDepth).toBeGreaterThanOrEqual(3000);
    expect(leader.sellDepth).toBeGreaterThanOrEqual(3000);
  });

  it("creates lower depth for back-row stocks", () => {
    const backRow = createInitialOrderBook(stock({ tags: ["后排"], liquidity: 30, sectorBeta: 90 }));

    expect(backRow.buyDepth).toBeLessThan(2500);
    expect(backRow.sellDepth).toBeLessThan(2500);
  });

  it("gives normal stocks a high buy fill rate", () => {
    const normalStock = stock({ tags: ["中军"], liquidity: 85 });
    const fill = resolveOrderFill(request("buy"), createInitialOrderBook(normalStock), normalStock, player(), room([normalStock]));

    expect(fill.fillRate).toBeGreaterThanOrEqual(0.8);
  });

  it("gives normal stocks a high sell fill rate", () => {
    const normalStock = stock({ tags: ["中军"], liquidity: 85 });
    const seller = player({
      positions: [{ stockId: normalStock.id, hasPosition: true, amount: 1000, amountLevel: "normal", sellable: true }],
      position: { stockId: normalStock.id, hasPosition: true, amount: 1000, amountLevel: "normal", sellable: true }
    });
    const fill = resolveOrderFill(request("sell"), createInitialOrderBook(normalStock), normalStock, seller, room([normalStock]));

    expect(fill.fillRate).toBeGreaterThanOrEqual(0.8);
  });

  it("drops buy fill rate significantly on limit-up stocks", () => {
    const limitUpStock = stock({ isLimitUp: true, tags: ["人气龙"], liquidity: 80 });
    const currentRoom = room([limitUpStock]);
    const updatedBook = updateOrderBookByMarketState(createInitialOrderBook(limitUpStock), limitUpStock, sector([limitUpStock]), currentRoom);
    const fill = resolveOrderFill(request("buy"), updatedBook, limitUpStock, player(), currentRoom);

    expect(updatedBook.fillRateBuy).toBeLessThan(0.2);
    expect(fill.fillRate).toBeLessThan(0.2);
    expect(fill.reason).toBe("limit_up_queue");
  });

  it("drops sell fill rate significantly on limit-down stocks", () => {
    const limitDownStock = stock({ isLimitDown: true, liquidity: 80 });
    const seller = player({
      positions: [{ stockId: limitDownStock.id, hasPosition: true, amount: 1000, amountLevel: "normal", sellable: true }],
      position: { stockId: limitDownStock.id, hasPosition: true, amount: 1000, amountLevel: "normal", sellable: true }
    });
    const currentRoom = room([limitDownStock]);
    const updatedBook = updateOrderBookByMarketState(createInitialOrderBook(limitDownStock), limitDownStock, sector([limitDownStock]), currentRoom);
    const fill = resolveOrderFill(request("sell"), updatedBook, limitDownStock, seller, currentRoom);

    expect(updatedBook.fillRateSell).toBeLessThan(0.25);
    expect(fill.fillRate).toBeLessThan(0.25);
    expect(fill.reason).toBe("limit_down_queue");
  });

  it("makes back-row low-liquidity stocks fill lower than center-force stocks for the same order", () => {
    const backRow = stock({ tags: ["后排"], liquidity: 25, sectorBeta: 90 });
    const center = stock({ id: "center", tags: ["中军"], liquidity: 85 });
    const backFill = resolveOrderFill(request("buy", 3000), createInitialOrderBook(backRow), backRow, player({ capital: 5000 }), room([backRow]));
    const centerFill = resolveOrderFill(
      { ...request("buy", 3000), stockId: "center" },
      createInitialOrderBook(center),
      center,
      player({ capital: 5000 }),
      room([center])
    );

    expect(backFill.fillRate).toBeLessThan(centerFill.fillRate);
  });

  it("lowers fill rate after quant drains liquidity", () => {
    const calmStock = stock({ liquidity: 70, quantAttention: 20 });
    const drainedStock = stock({ liquidity: 70, quantAttention: 95, tags: ["量化盯上"] });
    const calmFill = resolveOrderFill(request("buy", 2000), createInitialOrderBook(calmStock), calmStock, player({ capital: 3000 }), room([calmStock]));
    const drainedFill = resolveOrderFill(
      request("buy", 2000),
      createInitialOrderBook(drainedStock),
      drainedStock,
      player({ capital: 3000 }),
      room([drainedStock], { phase: "CLOSING_RUSH" })
    );

    expect(drainedFill.fillRate).toBeLessThan(calmFill.fillRate);
    expect(drainedFill.reason).toBe("quant_drain");
  });

  it("sets fill rate to zero when suspended by black-room inquiry", () => {
    const target = stock();
    const suspendedRoom = room([target], {
      phase: "REGULATION_INQUIRY",
      market: { ...room([target]).market, regulationState: "black_room", sectors: [sector([target])] }
    });
    const fill = resolveOrderFill(request("buy"), createInitialOrderBook(target), target, player(), suspendedRoom);

    expect(fill.fillRate).toBe(0);
    expect(fill.status).toBe("unfilled");
    expect(fill.reason).toBe("suspended");
  });

  it("sets sell fill rate to zero when T+1 has not unlocked", () => {
    const target = stock();
    const lockedPlayer = player({
      positions: [{ stockId: target.id, hasPosition: true, amount: 1000, amountLevel: "normal", sellable: false, lockedReason: "T+1" }],
      position: { stockId: target.id, hasPosition: true, amount: 1000, amountLevel: "normal", sellable: false, lockedReason: "T+1" }
    });
    const fill = resolveOrderFill(request("sell"), createInitialOrderBook(target), target, lockedPlayer, room([target]));

    expect(fill.fillRate).toBe(0);
    expect(fill.reason).toBe("t_plus_one_locked");
  });

  it("lets 30 stocks trade through system order books without real player counterparties", () => {
    const sectors = createFullMarketSectors();
    const books = createOrderBooksForSectors(sectors);
    const fills = sectors.flatMap((item) =>
      item.stocks.map((itemStock) =>
        resolveOrderFill(
          { ...request("buy", 100), stockId: itemStock.id },
          books[itemStock.id]!,
          itemStock,
          player({ capital: 10000 }),
          room([itemStock])
        )
      )
    );

    expect(fills).toHaveLength(30);
    expect(fills.every((fill) => fill.filledAmount > 0)).toBe(true);
  });

  it("updates player capital and position after a partial fill", () => {
    const target = stock({ tags: ["后排"], liquidity: 30, sectorBeta: 90 });
    const fill = resolveOrderFill(request("buy", 4000), createInitialOrderBook(target), target, player({ capital: 5000 }), room([target]));
    const updated = applyOrderFill(player({ capital: 5000 }), fill, target, room([target]));

    expect(fill.status).toBe("partial");
    expect(updated.capital).toBeCloseTo(5000 - fill.filledAmount, 2);
    expect(updated.positions?.[0]?.amount).toBe(fill.filledAmount);
  });

  it("does not deduct player capital when unfilled", () => {
    const target = stock();
    const fill = resolveOrderFill(request("buy", 1000), createInitialOrderBook(target), target, player({ capital: 0 }), room([target]));
    const updated = applyOrderFill(player({ capital: 0 }), fill, target, room([target]));

    expect(fill.status).toBe("unfilled");
    expect(updated.capital).toBe(0);
    expect(updated.positions).toHaveLength(0);
  });

  it("caps buy fills at available player capital", () => {
    const target = stock({ liquidity: 100 });
    const fill = resolveOrderFill(request("buy", 1000), createInitialOrderBook(target), target, player({ capital: 120 }), room([target]));
    const updated = applyOrderFill(player({ capital: 120 }), fill, target, room([target]));

    expect(fill.filledAmount).toBeLessThanOrEqual(120);
    expect(updated.capital).toBeGreaterThanOrEqual(0);
    expect(updated.positions?.[0]?.investedCapital).toBe(fill.filledAmount);
  });

  it("does not add cash when selling without a matching position", () => {
    const target = stock();
    const fill = resolveOrderFill(request("sell", 100), createInitialOrderBook(target), target, player({ capital: 50 }), room([target]));
    const updated = applyOrderFill(player({ capital: 50 }), fill, target, room([target]));

    expect(fill.status).toBe("unfilled");
    expect(fill.reason).toBe("no_position");
    expect(updated.capital).toBe(50);
    expect(updated.positions).toHaveLength(0);
  });

  it("caps sell fills at the real position market value", () => {
    const target = stock({ currentPrice: 120 });
    const seller = player({
      capital: 10,
      positions: [{ stockId: target.id, hasPosition: true, amount: 100, investedCapital: 100, costPrice: 100, currentPrice: 120, amountLevel: "normal", sellable: true }],
      position: { stockId: target.id, hasPosition: true, amount: 100, investedCapital: 100, costPrice: 100, currentPrice: 120, amountLevel: "normal", sellable: true }
    });
    const fill = resolveOrderFill(request("sell", 1000), createInitialOrderBook(target), target, seller, room([target]));
    const updated = applyOrderFill(seller, fill, target, room([target]));

    expect(fill.filledAmount).toBeLessThanOrEqual(120);
    expect(updated.capital).toBeCloseTo(10 + fill.filledAmount, 2);
    expect(updated.positions?.[0]?.amount ?? 0).toBeLessThanOrEqual(100);
  });

  it("raises crowdedness after a buy fill", () => {
    const target = stock({ crowdedness: 20 });
    const fill = resolveOrderFill(request("buy", 500), createInitialOrderBook(target), target, player({ capital: 1000 }), room([target]));
    applyOrderFill(player({ capital: 1000 }), fill, target, room([target]));

    expect(target.crowdedness).toBeGreaterThan(20);
  });

  it("raises T+1 crowdedness after a buy fill", () => {
    const target = stock({ tPlusOneCrowdedness: 20 });
    const fill = resolveOrderFill(request("buy", 500), createInitialOrderBook(target), target, player({ capital: 1000 }), room([target]));
    applyOrderFill(player({ capital: 1000 }), fill, target, room([target]));

    expect(target.tPlusOneCrowdedness).toBeGreaterThan(20);
  });

  it("raises quant attention when a back-row stock gets crowded", () => {
    const target = stock({ tags: ["后排"], liquidity: 30, sectorBeta: 90, crowdedness: 72, quantAttention: 30 });
    const fill = resolveOrderFill(request("buy", 1000), createInitialOrderBook(target), target, player({ capital: 2000 }), room([target]));
    applyOrderFill(player({ capital: 2000 }), fill, target, room([target]));

    expect(target.quantAttention).toBeGreaterThan(30);
  });

  it("creates UI view models with buy and sell fill rates", () => {
    const target = stock({ isLimitUp: true, tags: ["人气龙"] });
    const book = updateOrderBookByMarketState(createInitialOrderBook(target), target, sector([target]), room([target]));
    const bookVm = createOrderBookViewModel(book, target);
    const fillVm = createOrderFillViewModel(
      resolveOrderFill(request("buy"), book, target, player({ capital: 2000 }), room([target]))
    );

    expect(bookVm.fillRateBuy).toBeGreaterThanOrEqual(0);
    expect(bookVm.fillRateSell).toBeGreaterThanOrEqual(0);
    expect(bookVm.queueLabel).toBe("涨停排队");
    expect(fillVm.reasonText).toContain("排队人数");
  });
});
