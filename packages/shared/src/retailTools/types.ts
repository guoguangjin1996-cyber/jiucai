import type { ElementType, GameRoom, MarketPhase, RetailWarningDanmakuType, StockMarketState } from "../types";

export type RetailToolType =
  | "LEEK_RADAR"
  | "T_PLUS_ONE_BELT"
  | "AUCTION_920_ALARM"
  | "WARNING_DANMAKU"
  | "FAKE_ORDER_MIRROR"
  | "QUANT_SNIFFER"
  | "CORE_THERMOMETER"
  | "COOL_DOWN_CONFIRM";

export interface RetailToolState {
  playerId: string;
  toolType: RetailToolType;
  remainingUses: number;
  dailyLimit: number;
  passive: boolean;
  lastUsedDay?: number;
}

export interface RetailToolResult<TPayload = Record<string, unknown>> {
  success: boolean;
  toolType: RetailToolType;
  playerId: string;
  stockId?: string;
  message: string;
  remainingUses?: number;
  triggered?: boolean;
  room?: GameRoom;
  payload?: TPayload;
}

export interface WarningDanmakuPayload {
  warningType: RetailWarningDanmakuType;
  retailWarningPower: number;
}

export interface LeekRadarPayload {
  watchedStocks: Array<{
    stockId: string;
    stockName: string;
    overheatRisk: number;
    riskFlags: string[];
  }>;
}

export interface FakeOrderMirrorPayload {
  fakeOrderRisk: number;
  boardStrength: number;
  boardBreakRisk: number;
}

export interface QuantSnifferPayload {
  quantAttention: number;
  crowdedness: number;
  tPlusOneCrowdedness: number;
}

export interface CoreThermometerPayload {
  element: ElementType;
  coreDive: boolean;
  backRowHeatReduction: number;
}

export interface RetailToolTriggerContext {
  room: GameRoom;
  phase: MarketPhase;
  stock?: StockMarketState;
}
