import type {
  ElementSectorState,
  GameRoom,
  OrderBookLiquidity,
  OrderBookViewModel,
  OrderFillResult,
  OrderFillViewModel,
  OrderRequest,
  PlayerState,
  PositionState,
  StockMarketState
} from "../types";
import { createBackgroundMarketFunds, resolveBackgroundMarketFundsModifier } from "./priceTemplate";

export const ORDER_FILL_REASON_TEXT: Partial<Record<NonNullable<OrderFillResult["reason"]>, string>> = {
  limit_up_queue: "排队人数爆炸，买入可能失败。",
  limit_down_queue: "门在那边，但现在打不开。",
  low_liquidity: "这票能买，但不一定能体面地跑。",
  suspended: "小黑屋问询中，盘口暂时冷静。",
  quant_drain: "量化尾盘抽走流动性，刚才还能跑，现在只剩队友。",
  t_plus_one_locked: "你想跑，但T+1说：明天再说。",
  position_limit: "持仓栏已满，先处理已有仓位。",
  daily_action_limit: "今日主动操作次数已用完。",
  insufficient_capital: "本金值不足，无法完成本次买入。"
};

ORDER_FILL_REASON_TEXT.no_position = "没有这只纳音票的真实持仓，不能凭空卖出。";

export function createInitialOrderBook(stock: StockMarketState): OrderBookLiquidity {
  const depth = resolveBaseDepth(stock);
  const liquidity = clamp(stock.liquidity, 0, 100);
  const crowdedness = clamp(stock.crowdedness, 0, 100);

  return {
    stockId: stock.id,
    buyDepth: depth.buyDepth,
    sellDepth: depth.sellDepth,
    baseBuyDepth: depth.buyDepth,
    baseSellDepth: depth.sellDepth,
    liquidity,
    crowdedness,
    fillRateBuy: calculateDisplayFillRate(depth.sellDepth, liquidity, "buy"),
    fillRateSell: calculateDisplayFillRate(depth.buyDepth, liquidity, "sell"),
    lastUpdatedDay: 0
  };
}

export function createOrderBooksForSectors(sectors: ElementSectorState[]): Record<string, OrderBookLiquidity> {
  return Object.fromEntries(
    sectors.flatMap((sector) => sector.stocks).map((stock) => [stock.id, createInitialOrderBook(stock)])
  );
}

export function updateOrderBookByMarketState(
  orderBook: OrderBookLiquidity,
  stockState: StockMarketState,
  sectorState: ElementSectorState,
  roomState: GameRoom
): OrderBookLiquidity {
  const suspended = isSuspended(roomState);
  const isBackRowCrowded = isBackRow(stockState) && stockState.crowdedness >= 70;
  const isQuantDrain = isQuantDrainState(stockState, roomState);
  const isSectorMainRise = sectorState.heat >= 70 || sectorState.statusTags.includes("主线王");
  const isSectorDrawdown = sectorState.statusTags.includes("退潮预警") || sectorState.riskScore >= 70 || sectorState.heat <= 30;

  let buyDepth = orderBook.baseBuyDepth;
  let sellDepth = orderBook.baseSellDepth;
  let crowdedness = Math.max(orderBook.crowdedness, stockState.crowdedness);
  let liquidity = stockState.liquidity;
  let fillRateBuy = betweenByLiquidity(liquidity, 0.8, 1);
  let fillRateSell = betweenByLiquidity(liquidity, 0.8, 1);

  if (isSectorMainRise) {
    buyDepth *= 1.25;
    sellDepth *= 0.9;
    if (stockState.tags.includes("人气龙") || stockState.tags.includes("领涨龙")) {
      crowdedness += 8;
    }
  }

  if (isSectorDrawdown) {
    buyDepth *= isBackRow(stockState) ? 0.45 : 0.7;
    sellDepth *= 1.25;
    fillRateSell *= isBackRow(stockState) ? 0.55 : 0.8;
  }

  if (stockState.isLimitUp) {
    buyDepth *= 1.6;
    sellDepth *= 0.3;
    fillRateBuy = betweenByLiquidity(liquidity, 0.03, 0.15);
    fillRateSell = 0.99;
  }

  if (stockState.isLimitDown) {
    buyDepth *= 0.25;
    sellDepth *= 1.7;
    fillRateBuy = 0.99;
    fillRateSell = betweenByLiquidity(liquidity, 0.03, 0.2);
  }

  if (isBackRowCrowded) {
    crowdedness += 12;
    fillRateBuy = Math.min(fillRateBuy, betweenByLiquidity(liquidity, 0.7, 0.9));
    fillRateSell = Math.min(fillRateSell, betweenByLiquidity(liquidity, 0.3, 0.7));
  }

  if (isQuantDrain) {
    buyDepth *= 0.42;
    sellDepth *= 0.45;
    fillRateBuy *= 0.65;
    fillRateSell *= 0.4;
  }

  if (suspended) {
    buyDepth = 0;
    sellDepth = 0;
    fillRateBuy = 0;
    fillRateSell = 0;
  }

  return {
    ...orderBook,
    buyDepth: Math.round(Math.max(0, buyDepth)),
    sellDepth: Math.round(Math.max(0, sellDepth)),
    liquidity: clamp(liquidity, 0, 100),
    crowdedness: clamp(crowdedness, 0, 100),
    fillRateBuy: roundRate(fillRateBuy),
    fillRateSell: roundRate(fillRateSell),
    lastUpdatedDay: roomState.day
  };
}

export function resolveOrderFill(
  request: OrderRequest,
  orderBook: OrderBookLiquidity,
  stockState: StockMarketState,
  player: PlayerState,
  room: GameRoom
): OrderFillResult {
  const requestedAmount = Math.max(0, request.amount);
  const avgFillPrice = Math.max(0.01, stockState.currentPrice);
  const baseResult = {
    playerId: request.playerId,
    stockId: request.stockId,
    side: request.side,
    requestedAmount,
    avgFillPrice
  };

  const blockingReason = getBlockingReason(request, stockState, player, room);
  if (blockingReason !== undefined || requestedAmount <= 0) {
    return toFillResult(baseResult, 0, blockingReason);
  }

  const effectiveAmount =
    request.side === "buy"
      ? Math.min(requestedAmount, Math.max(0, player.capital))
      : Math.min(requestedAmount, getSellablePositionMarketValue(player, request.stockId));
  if (request.side === "buy" && effectiveAmount <= 0) {
    return toFillResult(baseResult, 0, "insufficient_capital");
  }
  if (request.side === "sell" && effectiveAmount <= 0) {
    return toFillResult(baseResult, 0, "no_position");
  }

  const availableDepth = request.side === "buy" ? orderBook.sellDepth : orderBook.buyDepth;
  const liquidityFactor = clamp((orderBook.liquidity + stockState.liquidity) / 140, 0.25, 1.25);
  const marketStateFactor = resolveMarketStateFactor(request, stockState, room);
  const quantPenalty = isQuantDrainState(stockState, room) ? 0.4 : 1;
  const lowLiquidityPenalty = orderBook.liquidity < 35 || stockState.liquidity < 35 ? 0.5 : 1;
  const baseFillRate = availableDepth / Math.max(1, effectiveAmount);
  const fillRate = clamp(baseFillRate * liquidityFactor * marketStateFactor * quantPenalty * lowLiquidityPenalty, 0, 1);
  const reason = resolveFillReason(request, orderBook, stockState, room);

  return toFillResult(baseResult, fillRate, reason, effectiveAmount);
}

export function applyOrderFill(
  player: PlayerState,
  fillResult: OrderFillResult,
  stockState: StockMarketState,
  room: GameRoom
): PlayerState {
  if (fillResult.status === "unfilled" || fillResult.filledAmount <= 0) {
    return clonePlayer(player);
  }

  const dailyActionCount = (player.dailyActionCount ?? 0) + 1;

  if (fillResult.side === "buy") {
    stockState.crowdedness = clamp(stockState.crowdedness + impactByAmount(fillResult.filledAmount, 10), 0, 100);
    stockState.holderCountScore = clamp(stockState.holderCountScore + impactByAmount(fillResult.filledAmount, 8), 0, 100);
    stockState.tPlusOneCrowdedness = clamp(
      stockState.tPlusOneCrowdedness + impactByAmount(fillResult.filledAmount, 14),
      0,
      100
    );
    stockState.danmakuHeat = clamp(stockState.danmakuHeat + impactByAmount(fillResult.filledAmount, 5), 0, 100);
    if (isBackRow(stockState) && stockState.crowdedness >= 70) {
      stockState.quantAttention = clamp(stockState.quantAttention + impactByAmount(fillResult.filledAmount, 16), 0, 100);
    }

    const updatedPositions = upsertBoughtPosition(player, fillResult, stockState, room.day);
    return {
      ...clonePlayer(player),
      capital: roundMoney(player.capital - fillResult.filledAmount),
      position: updatedPositions[0] ?? createEmptyPositionLike(),
      positions: updatedPositions,
      dailyActionCount
    };
  }

  const sellUpdate = applySellToPositions(player, fillResult);
  if (sellUpdate.soldProceeds <= 0) {
    return clonePlayer(player);
  }
  return {
    ...clonePlayer(player),
    capital: roundMoney(player.capital + sellUpdate.soldProceeds),
    position: sellUpdate.positions[0] ?? createEmptyPositionLike(),
    positions: sellUpdate.positions,
    dailyActionCount
  };
}

export function refreshBackgroundLiquidity(room: GameRoom): GameRoom {
  if (room.market.sectors === undefined) {
    return { ...room };
  }

  const existingBooks = room.market.orderBooks ?? {};
  const funds = createBackgroundMarketFunds(`${room.id}:${room.day}:${room.phase}`);
  const backgroundModifier = resolveBackgroundMarketFundsModifier(funds);
  const orderBooks: Record<string, OrderBookLiquidity> = {};
  const sectors = room.market.sectors.map((sector) => ({
    ...sector,
    stocks: sector.stocks.map((stock) => {
      const baseBook = existingBooks[stock.id] ?? createInitialOrderBook(stock);
      const nudgedBook = {
        ...baseBook,
        buyDepth: Math.round(baseBook.buyDepth * (1 + backgroundModifier / 100)),
        sellDepth: Math.round(baseBook.sellDepth * (1 - backgroundModifier / 160))
      };
      const updatedBook = updateOrderBookByMarketState(nudgedBook, stock, sector, room);
      orderBooks[stock.id] = updatedBook;
      return { ...stock };
    })
  }));

  return {
    ...room,
    market: {
      ...room.market,
      sectors,
      orderBooks
    }
  };
}

export function createOrderBookViewModel(
  orderBook: OrderBookLiquidity,
  stockState: StockMarketState
): OrderBookViewModel {
  const riskTags: string[] = [];
  if (stockState.isLimitUp) riskTags.push("涨停排队");
  if (stockState.isLimitDown) riskTags.push("跌停排队");
  if (orderBook.liquidity < 35 || stockState.tags.includes("后排")) riskTags.push("低流动性");
  if (stockState.quantAttention >= 80 || stockState.tags.includes("量化盯上")) riskTags.push("量化抽水风险");
  if (stockState.tPlusOneCrowdedness >= 70 || stockState.tags.includes("T+1拥挤")) riskTags.push("T+1拥挤");
  const queueLabel = resolveQueueLabel(orderBook, stockState);

  return {
    stockId: stockState.id,
    stockName: stockState.name,
    buyDepth: orderBook.buyDepth,
    sellDepth: orderBook.sellDepth,
    liquidityLabel: orderBook.liquidity >= 70 ? "高" : orderBook.liquidity >= 40 ? "中" : "低",
    fillRateBuy: orderBook.fillRateBuy,
    fillRateSell: orderBook.fillRateSell,
    ...(queueLabel === undefined ? {} : { queueLabel }),
    riskTags
  };
}

export function createOrderFillViewModel(fillResult: OrderFillResult): OrderFillViewModel {
  return {
    status: fillResult.status,
    requestedAmount: fillResult.requestedAmount,
    filledAmount: fillResult.filledAmount,
    unfilledAmount: fillResult.unfilledAmount,
    avgFillPrice: fillResult.avgFillPrice,
    ...(fillResult.reason === undefined ? {} : { reasonText: ORDER_FILL_REASON_TEXT[fillResult.reason] ?? fillResult.reason })
  };
}

function resolveBaseDepth(stock: StockMarketState): { buyDepth: number; sellDepth: number } {
  if (stock.liquidityProfile !== undefined) {
    const depth = clamp(stock.liquidityProfile.dailyLiquidity, 500, 12000);
    return {
      buyDepth: Math.round(depth),
      sellDepth: Math.round(depth)
    };
  }

  const tagSet = new Set(stock.tags);
  if (tagSet.has("人气龙") || tagSet.has("领涨龙") || tagSet.has("卡位龙")) {
    return { buyDepth: 4500, sellDepth: 4500 };
  }
  if (tagSet.has("中军")) {
    return { buyDepth: 8000, sellDepth: 8000 };
  }
  if (tagSet.has("后排")) {
    return { buyDepth: 1400, sellDepth: 1400 };
  }
  if (tagSet.has("暗线")) {
    return { buyDepth: 1200, sellDepth: 1200 };
  }
  if (stock.liquidity >= 70 && stock.volatility <= 35) {
    return { buyDepth: 4500, sellDepth: 4500 };
  }
  return { buyDepth: 3500, sellDepth: 3500 };
}

function calculateDisplayFillRate(depth: number, liquidity: number, side: "buy" | "sell"): number {
  const depthFactor = clamp(depth / 3000, 0.2, 1);
  const liquidityFactor = clamp(liquidity / 75, 0.25, 1);
  const sideBias = side === "buy" ? 0.98 : 0.96;
  return roundRate(clamp(depthFactor * liquidityFactor * sideBias, 0.05, 1));
}

function betweenByLiquidity(liquidity: number, min: number, max: number): number {
  return min + (max - min) * clamp(liquidity / 100, 0, 1);
}

function isBackRow(stock: StockMarketState): boolean {
  return stock.tags.includes("后排") || (stock.liquidity < 45 && stock.sectorBeta >= 70);
}

function isQuantDrainState(stock: StockMarketState, room: GameRoom): boolean {
  return (
    (room.phase === "CLOSING_RUSH" && (stock.quantAttention >= 75 || stock.tags.includes("量化盯上"))) ||
    stock.quantAttention >= 90
  );
}

function isSuspended(room: GameRoom): boolean {
  return room.market.regulationState === "black_room" || room.phase === "REGULATION_INQUIRY";
}

function getBlockingReason(
  request: OrderRequest,
  stockState: StockMarketState,
  player: PlayerState,
  room: GameRoom
): OrderFillResult["reason"] | undefined {
  if (isSuspended(room)) return "suspended";
  if ((player.dailyActionCount ?? 0) >= (player.maxDailyActionCount ?? Number.POSITIVE_INFINITY)) {
    return "daily_action_limit";
  }
  if (request.side === "buy" && player.capital <= 0) return "insufficient_capital";
  if (request.side === "buy" && openPositionCount(player) >= maxPositions(room)) return "position_limit";
  if (request.side === "sell" && !hasPosition(player, request.stockId)) return "no_position";
  if (request.side === "sell" && hasTPlusOneLock(player, request.stockId)) return "t_plus_one_locked";
  if (stockState.isLimitUp && request.side === "buy") return undefined;
  if (stockState.isLimitDown && request.side === "sell") return undefined;
  return undefined;
}

function resolveMarketStateFactor(request: OrderRequest, stockState: StockMarketState, room: GameRoom): number {
  if (isSuspended(room)) return 0;
  if (stockState.isLimitUp && request.side === "buy") return 0.08;
  if (stockState.isLimitUp && request.side === "sell") return 1;
  if (stockState.isLimitDown && request.side === "sell") return 0.08;
  if (stockState.isLimitDown && request.side === "buy") return 1;
  if (isBackRow(stockState) && stockState.crowdedness >= 70 && request.side === "sell") return 0.55;
  return 0.95;
}

function resolveFillReason(
  request: OrderRequest,
  orderBook: OrderBookLiquidity,
  stockState: StockMarketState,
  room: GameRoom
): OrderFillResult["reason"] | undefined {
  if (stockState.isLimitUp && request.side === "buy") return "limit_up_queue";
  if (stockState.isLimitDown && request.side === "sell") return "limit_down_queue";
  if (isQuantDrainState(stockState, room)) return "quant_drain";
  if (orderBook.liquidity < 35 || stockState.liquidity < 35) return "low_liquidity";
  return undefined;
}

function hasTPlusOneLock(player: PlayerState, stockId: string): boolean {
  return getPositions(player).some(
    (position) =>
      position.hasPosition &&
      position.stockId === stockId &&
      (position.lockedReason === "T+1" || !position.sellable)
  );
}

function hasPosition(player: PlayerState, stockId: string): boolean {
  return getPositions(player).some(
    (position) => position.hasPosition && position.stockId === stockId && (position.amount ?? position.investedCapital ?? 0) > 0
  );
}

function getSellablePositionMarketValue(player: PlayerState, stockId: string): number {
  return roundMoney(
    getPositions(player)
      .filter((position) => position.hasPosition && position.stockId === stockId && position.sellable)
      .reduce((sum, position) => {
        const amount = Math.max(0, position.amount ?? position.investedCapital ?? 0);
        const costPrice = Math.max(0.01, position.costPrice ?? position.currentPrice ?? 1);
        const currentPrice = Math.max(0.01, position.currentPrice ?? costPrice);
        return sum + (amount * currentPrice) / costPrice;
      }, 0)
  );
}

function openPositionCount(player: PlayerState): number {
  return getPositions(player).filter((position) => position.hasPosition).length;
}

function maxPositions(room: GameRoom): number {
  const maxPositions = (room as GameRoom & { maxPositions?: number }).maxPositions;
  return maxPositions ?? 3;
}

function toFillResult(
  base: Pick<OrderFillResult, "playerId" | "stockId" | "side" | "requestedAmount" | "avgFillPrice">,
  fillRate: number,
  reason?: OrderFillResult["reason"],
  executableAmount = base.requestedAmount
): OrderFillResult {
  const roundedFillRate = roundRate(fillRate);
  const filledAmount = roundMoney(Math.min(base.requestedAmount, Math.max(0, executableAmount)) * roundedFillRate);
  const unfilledAmount = roundMoney(base.requestedAmount - filledAmount);
  const status = filledAmount >= base.requestedAmount && roundedFillRate > 0 ? "filled" : filledAmount > 0 ? "partial" : "unfilled";

  return {
    ...base,
    filledAmount,
    unfilledAmount,
    fillRate: roundedFillRate,
    status,
    ...(reason === undefined ? {} : { reason })
  };
}

function upsertBoughtPosition(
  player: PlayerState,
  fillResult: OrderFillResult,
  stockState: StockMarketState,
  day: number
): PositionState[] {
  const positions = getPositions(player);
  const found = positions.find((position) => position.stockId === fillResult.stockId && position.hasPosition);
  if (found === undefined) {
    return [
      ...positions,
      {
        stockId: stockState.id,
        stockName: stockState.name,
        element: stockState.element,
        hasPosition: true,
        buyDay: day,
        costPrice: fillResult.avgFillPrice,
        currentPrice: stockState.currentPrice,
        amount: fillResult.filledAmount,
        investedCapital: fillResult.filledAmount,
        quantityUnit: fillResult.filledAmount / Math.max(0.01, fillResult.avgFillPrice),
        amountLevel: amountLevelFor(fillResult.filledAmount),
        sellable: false,
        lockedReason: "T+1"
      }
    ];
  }

  return positions.map((position) =>
    position === found
      ? {
          ...position,
          amount: roundMoney((position.amount ?? 0) + fillResult.filledAmount),
          investedCapital: roundMoney((position.investedCapital ?? position.amount ?? 0) + fillResult.filledAmount),
          quantityUnit: roundMoney(
            (position.quantityUnit ?? 0) + fillResult.filledAmount / Math.max(0.01, fillResult.avgFillPrice)
          ),
          currentPrice: stockState.currentPrice,
          sellable: false,
          lockedReason: "T+1"
        }
      : { ...position }
  );
}

function applySellToPositions(
  player: PlayerState,
  fillResult: OrderFillResult
): { positions: PositionState[]; soldProceeds: number } {
  let remainingSellValue = fillResult.filledAmount;
  let soldProceeds = 0;
  const positions: PositionState[] = [];

  for (const position of getPositions(player)) {
    if (!position.hasPosition || position.stockId !== fillResult.stockId || remainingSellValue <= 0) {
      positions.push({ ...position });
      continue;
    }

    const positionAmount = Math.max(0, position.amount ?? position.investedCapital ?? 0);
    const costPrice = Math.max(0.01, position.costPrice ?? fillResult.avgFillPrice);
    const currentPrice = Math.max(0.01, position.currentPrice ?? fillResult.avgFillPrice);
    const positionMarketValue = roundMoney((positionAmount * currentPrice) / costPrice);
    const soldValue = Math.min(positionMarketValue, remainingSellValue);
    const soldRatio = positionMarketValue <= 0 ? 0 : soldValue / positionMarketValue;
    const soldInvestedCapital = roundMoney(positionAmount * soldRatio);
    const remainingPositionAmount = roundMoney(positionAmount - soldInvestedCapital);
    const realizedProfit = roundMoney(soldValue - soldInvestedCapital);
    remainingSellValue = roundMoney(remainingSellValue - soldValue);
    soldProceeds = roundMoney(soldProceeds + soldValue);

    if (remainingPositionAmount > 0) {
      const remainingQuantityUnit =
        position.quantityUnit === undefined ? undefined : roundMoney(position.quantityUnit * (1 - soldRatio));
      positions.push({
        ...position,
        amount: remainingPositionAmount,
        investedCapital: remainingPositionAmount,
        ...(remainingQuantityUnit === undefined ? {} : { quantityUnit: remainingQuantityUnit }),
        realizedProfit: roundMoney((position.realizedProfit ?? 0) + realizedProfit),
        currentPrice,
        unrealizedProfit: roundMoney((remainingPositionAmount * currentPrice) / costPrice - remainingPositionAmount),
        unrealizedReturn: roundMoney(currentPrice / costPrice - 1)
      });
    }
  }

  return { positions, soldProceeds };
}

function getPositions(player: PlayerState): PositionState[] {
  if (player.positions !== undefined && player.positions.length > 0) {
    return player.positions.map((position) => ({ ...position }));
  }
  return player.position.hasPosition ? [{ ...player.position }] : [];
}

function clonePlayer(player: PlayerState): PlayerState {
  return {
    ...player,
    position: { ...player.position },
    positions: player.positions?.map((position) => ({ ...position })) ?? []
  };
}

function createEmptyPositionLike(): PositionState {
  return {
    hasPosition: false,
    amountLevel: "none",
    sellable: false
  };
}

function amountLevelFor(amount: number): PositionState["amountLevel"] {
  if (amount >= 75) return "heavy";
  if (amount >= 35) return "normal";
  if (amount > 0) return "light";
  return "none";
}

function impactByAmount(amount: number, maxImpact: number): number {
  return Math.min(maxImpact, Math.max(1, Math.round(amount / 10)));
}

function resolveQueueLabel(orderBook: OrderBookLiquidity, stockState: StockMarketState): string | undefined {
  if (stockState.isLimitUp) return "涨停排队";
  if (stockState.isLimitDown) return "跌停排队";
  if (orderBook.fillRateSell < 0.45) return "卖出成功率下降";
  if (orderBook.fillRateBuy < 0.45) return "买入成功率下降";
  return undefined;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function roundRate(value: number): number {
  return Math.round(clamp(value, 0, 1) * 1000) / 1000;
}

function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}
