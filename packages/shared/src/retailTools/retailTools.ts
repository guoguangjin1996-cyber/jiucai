import type {
  ElementSectorState,
  ElementType,
  GameRoom,
  MarketPhase,
  PlayerState,
  RetailWarningDanmakuType,
  StockMarketState
} from "../types";
import { buildOverheatRiskViewModel, clamp } from "../market/overheatRisk";
import type {
  CoreThermometerPayload,
  FakeOrderMirrorPayload,
  LeekRadarPayload,
  QuantSnifferPayload,
  RetailToolResult,
  RetailToolState,
  RetailToolType,
  WarningDanmakuPayload
} from "./types";

const PASSIVE_TOOLS = new Set<RetailToolType>([
  "T_PLUS_ONE_BELT",
  "AUCTION_920_ALARM",
  "COOL_DOWN_CONFIRM"
]);

export function getInitialRetailTools(playerId: string): RetailToolState[] {
  return [
    createTool(playerId, "LEEK_RADAR", 2),
    createTool(playerId, "T_PLUS_ONE_BELT", 0, true),
    createTool(playerId, "AUCTION_920_ALARM", 0, true),
    createTool(playerId, "WARNING_DANMAKU", 3),
    createTool(playerId, "FAKE_ORDER_MIRROR", 1),
    createTool(playerId, "QUANT_SNIFFER", 1),
    createTool(playerId, "CORE_THERMOMETER", 1),
    createTool(playerId, "COOL_DOWN_CONFIRM", 0, true)
  ];
}

export function canUseRetailTool(toolState: RetailToolState, room: GameRoom, phase: MarketPhase): boolean {
  if (room.status === "finished") return false;
  if (toolState.passive || PASSIVE_TOOLS.has(toolState.toolType)) return true;
  if (phase === "DAY_RECAP" || phase === "DAY_RESULT" || phase === "CLOSE") return false;
  return toolState.remainingUses > 0;
}

export function consumeRetailToolUse(toolState: RetailToolState, room: GameRoom): RetailToolState {
  if (toolState.passive || PASSIVE_TOOLS.has(toolState.toolType)) {
    return { ...toolState };
  }

  return {
    ...toolState,
    remainingUses: Math.max(0, toolState.remainingUses - 1),
    lastUsedDay: room.day
  };
}

export function shouldTriggerTPlusOneBelt(player: PlayerState, stock: StockMarketState, phase: MarketPhase): boolean {
  return (
    isTradingPhase(phase) &&
    player.role === "retail" &&
    !hasOpenPosition(player, stock.id) &&
    (stock.tPlusOneCrowdedness >= 70 || stock.tags.includes("T+1拥挤"))
  );
}

export function shouldTriggerAuction920Alarm(phase: MarketPhase, remainingSec: number): boolean {
  return phase === "AUCTION_FREE" && remainingSec <= 20 && remainingSec >= 0;
}

export function shouldTriggerCoolDownConfirm(player: PlayerState, stock: StockMarketState, phase: MarketPhase): boolean {
  return (
    isTradingPhase(phase) &&
    player.role === "retail" &&
    !hasOpenPosition(player, stock.id) &&
    ((stock.overheatRisk ?? 0) >= 70 ||
      stock.riskFlags?.includes("高危收割区") === true ||
      stock.quantAttention >= 80 ||
      stock.tPlusOneCrowdedness >= 70 ||
      stock.regulationAttention >= 70)
  );
}

export function useWarningDanmaku(
  room: GameRoom,
  playerId: string,
  stockId: string,
  warningType: RetailWarningDanmakuType
): RetailToolResult<WarningDanmakuPayload> {
  const delta = warningPowerDelta(warningType);
  const updatedRoom = updateStock(room, stockId, (stock) => ({
    ...stock,
    retailWarningPower: clamp((stock.retailWarningPower ?? 0) + delta),
    danmakuHeat: clamp(stock.danmakuHeat + Math.max(4, delta * 0.25))
  }));
  const updatedStock = findStock(updatedRoom, stockId);

  return {
    success: updatedStock !== undefined,
    toolType: "WARNING_DANMAKU",
    playerId,
    stockId,
    message: "虚构娱乐模拟：风险弹幕已加入盘面讨论。",
    room: updatedRoom,
    payload: {
      warningType,
      retailWarningPower: updatedStock?.retailWarningPower ?? delta
    }
  };
}

export function useLeekRadar(room: GameRoom, playerId: string): RetailToolResult<LeekRadarPayload> {
  const watchedStocks = allStocks(room)
    .map((stock) => buildOverheatRiskViewModel(stock))
    .sort((left, right) => right.overheatRisk - left.overheatRisk)
    .slice(0, 5)
    .map((stock) => ({
      stockId: stock.stockId,
      stockName: stock.stockName,
      overheatRisk: stock.overheatRisk,
      riskFlags: stock.riskFlags
    }));

  return {
    success: true,
    toolType: "LEEK_RADAR",
    playerId,
    message: "虚构娱乐模拟：韭菜雷达扫描完成。",
    payload: { watchedStocks }
  };
}

export function useFakeOrderMirror(
  room: GameRoom,
  playerId: string,
  stockId: string
): RetailToolResult<FakeOrderMirrorPayload> {
  const stock = findStock(room, stockId);
  const fakeOrderRisk =
    stock === undefined
      ? 0
      : clamp(stock.boardStrength * 0.45 + stock.boardBreakRisk * 0.35 + (stock.isLimitUp ? 15 : 0) + (stock.noisePower ?? 0) * 0.2);

  return {
    success: stock !== undefined,
    toolType: "FAKE_ORDER_MIRROR",
    playerId,
    stockId,
    message: "虚构娱乐模拟：假封单镜像已返回风险读数。",
    payload: {
      fakeOrderRisk,
      boardStrength: stock?.boardStrength ?? 0,
      boardBreakRisk: stock?.boardBreakRisk ?? 0
    }
  };
}

export function useQuantSniffer(room: GameRoom, playerId: string, stockId: string): RetailToolResult<QuantSnifferPayload> {
  const stock = findStock(room, stockId);

  return {
    success: stock !== undefined,
    toolType: "QUANT_SNIFFER",
    playerId,
    stockId,
    message: "虚构娱乐模拟：量化嗅探器已返回拥挤读数。",
    payload: {
      quantAttention: stock?.quantAttention ?? 0,
      crowdedness: stock?.crowdedness ?? 0,
      tPlusOneCrowdedness: stock?.tPlusOneCrowdedness ?? 0
    }
  };
}

export function useCoreThermometer(
  room: GameRoom,
  playerId: string,
  element: ElementType
): RetailToolResult<CoreThermometerPayload> {
  const sector = room.market.sectors?.find((candidate) => candidate.element === element);
  const coreDive =
    sector?.stocks.some((stock) => stock.tags.includes("中军") && stock.changePercent <= -3) ?? false;
  const backRowHeatReduction = coreDive ? 15 : 0;
  const updatedRoom =
    sector === undefined || !coreDive
      ? room
      : updateSector(room, element, (targetSector) => ({
          ...targetSector,
          stocks: targetSector.stocks.map((stock) =>
            stock.tags.includes("后排")
              ? {
                  ...stock,
                  danmakuHeat: clamp(stock.danmakuHeat - backRowHeatReduction),
                  crowdedness: clamp(stock.crowdedness - 10)
                }
              : stock
          )
        }));

  return {
    success: sector !== undefined,
    toolType: "CORE_THERMOMETER",
    playerId,
    message: "虚构娱乐模拟：中军温度计已完成读数。",
    triggered: coreDive,
    room: updatedRoom,
    payload: {
      element,
      coreDive,
      backRowHeatReduction
    }
  };
}

function createTool(playerId: string, toolType: RetailToolType, dailyLimit: number, passive = false): RetailToolState {
  return {
    playerId,
    toolType,
    remainingUses: dailyLimit,
    dailyLimit,
    passive
  };
}

function isTradingPhase(phase: MarketPhase): boolean {
  return (
    phase === "CONTINUOUS_TRADING" ||
    phase === "MORNING_TRADING" ||
    phase === "AFTERNOON_TRADING" ||
    phase === "CLOSING_RUSH"
  );
}

function hasOpenPosition(player: PlayerState, stockId: string): boolean {
  return [player.position, ...(player.positions ?? [])].some(
    (position) => position.hasPosition && position.stockId === stockId
  );
}

function warningPowerDelta(warningType: RetailWarningDanmakuType): number {
  const deltas: Record<RetailWarningDanmakuType, number> = {
    WARN_RISK: 18,
    CALLOUT_FAKE_ORDER: 22,
    WARN_T_PLUS_ONE: 16,
    WARN_QUANT: 14,
    WARN_CORE_DIVE: 12,
    QUESTION_HYPE: 10
  };
  return deltas[warningType];
}

function allStocks(room: GameRoom): StockMarketState[] {
  return room.market.sectors?.flatMap((sector) => sector.stocks) ?? [];
}

function findStock(room: GameRoom, stockId: string): StockMarketState | undefined {
  return allStocks(room).find((stock) => stock.id === stockId);
}

function updateStock(room: GameRoom, stockId: string, update: (stock: StockMarketState) => StockMarketState): GameRoom {
  const sectors = room.market.sectors?.map((sector) => ({
    ...sector,
    stocks: sector.stocks.map((stock) => (stock.id === stockId ? update(stock) : stock))
  }));

  return {
    ...room,
    market: {
      ...room.market,
      ...(sectors === undefined ? {} : { sectors })
    }
  };
}

function updateSector(room: GameRoom, element: ElementType, update: (sector: ElementSectorState) => ElementSectorState): GameRoom {
  const sectors = room.market.sectors?.map((sector) => (sector.element === element ? update(sector) : sector));

  return {
    ...room,
    market: {
      ...room.market,
      ...(sectors === undefined ? {} : { sectors })
    }
  };
}
