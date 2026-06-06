import type {
  GameRoomType,
  MarketPhase,
  QuantLevel,
  RegulationIntensity,
  RoomMarketStrength,
  StockPoolMode
} from "./types";

export interface GameRoomTypeConfig {
  roomType: GameRoomType;
  displayName: string;
  targetDurationMinutes: number;
  maxPlayers: number;
  institutionCount: number;
  retailCount: number;
  stockPoolMode: StockPoolMode;
  maxPositionsPerPlayer: number;
  maxDailyActionsPerPlayer: number;
  quantStrength: RoomMarketStrength;
  regulationStrength: RoomMarketStrength;
  // Backward-compatible aliases used by existing client/server view models.
  type: GameRoomType;
  name: string;
  targetMinutes: number;
  maxDays: number;
  sectorCount: number;
  stockCount: number;
  maxPositions: number;
  maxDailyActions: number;
  quantLevel: QuantLevel;
  regulationIntensity: RegulationIntensity;
  speedLabel: string;
  suitableFor: string;
}

export interface PhaseTimingConfig {
  phase: MarketPhase;
  durationSec: number;
  virtualTime: string;
  requiresPlayerSubmission: boolean;
  minimumPhaseHoldSec?: number;
}

export const ROOM_TYPE_CONFIGS: Record<GameRoomType, GameRoomTypeConfig> = {
  QUICK_10: {
    roomType: "QUICK_10",
    displayName: "短线快跑房",
    targetDurationMinutes: 10,
    maxPlayers: 8,
    institutionCount: 2,
    retailCount: 6,
    stockPoolMode: "NINE_STOCKS",
    maxPositionsPerPlayer: 2,
    maxDailyActionsPerPlayer: 2,
    quantStrength: "weak",
    regulationStrength: "weak",
    type: "QUICK_10",
    name: "短线快跑房",
    targetMinutes: 10,
    maxDays: 3,
    sectorCount: 3,
    stockCount: 9,
    maxPositions: 2,
    maxDailyActions: 2,
    quantLevel: "simplified",
    regulationIntensity: "weakened",
    speedLabel: "约100倍速",
    suitableFor: "试一把就跑"
  },
  STANDARD_20: {
    roomType: "STANDARD_20",
    displayName: "五日轮动房",
    targetDurationMinutes: 20,
    maxPlayers: 8,
    institutionCount: 2,
    retailCount: 6,
    stockPoolMode: "FULL_MARKET",
    maxPositionsPerPlayer: 3,
    maxDailyActionsPerPlayer: 3,
    quantStrength: "standard",
    regulationStrength: "standard",
    type: "STANDARD_20",
    name: "五日轮动房",
    targetMinutes: 20,
    maxDays: 5,
    sectorCount: 5,
    stockCount: 30,
    maxPositions: 3,
    maxDailyActions: 3,
    quantLevel: "standard",
    regulationIntensity: "standard",
    speedLabel: "约86倍速",
    suitableFor: "标准主模式"
  },
  LONG_30: {
    roomType: "LONG_30",
    displayName: "全市场长盘房",
    targetDurationMinutes: 30,
    maxPlayers: 8,
    institutionCount: 2,
    retailCount: 6,
    stockPoolMode: "FULL_MARKET",
    maxPositionsPerPlayer: 4,
    maxDailyActionsPerPlayer: 4,
    quantStrength: "strong",
    regulationStrength: "strong",
    type: "LONG_30",
    name: "全市场长盘房",
    targetMinutes: 30,
    maxDays: 7,
    sectorCount: 5,
    stockCount: 30,
    maxPositions: 4,
    maxDailyActions: 4,
    quantLevel: "enhanced",
    regulationIntensity: "enhanced",
    speedLabel: "约80倍速",
    suitableFor: "好友开黑 / 高阶博弈"
  }
};

export const DEFAULT_GAME_ROOM_TYPE: GameRoomType = "STANDARD_20";

export const PHASE_VIRTUAL_TIME: Partial<Record<MarketPhase, string>> = {
  PRE_NEWS: "09:00",
  AUCTION_FREE: "09:15",
  AUCTION_LOCKED: "09:20",
  OPEN_PRICE: "09:25",
  MORNING_TRADING: "09:30",
  MIDDAY_ROTATION: "11:30",
  AFTERNOON_TRADING: "13:00",
  CLOSING_RUSH: "14:50",
  CLOSE: "15:00",
  FOCUS_VOTE: "15:10"
};

export const MINIMUM_PHASE_HOLD_SEC: Partial<Record<MarketPhase, number>> = {
  AUCTION_FREE: 8,
  AUCTION_LOCKED: 6,
  MORNING_TRADING: 15,
  AFTERNOON_TRADING: 15,
  CLOSING_RUSH: 8,
  FOCUS_VOTE: 6
};

export const SUBMISSION_PHASES: readonly MarketPhase[] = [
  "INSTITUTION_PRIVATE_ROOM",
  "AUCTION_FREE",
  "AUCTION_LOCKED",
  "MORNING_TRADING",
  "AFTERNOON_TRADING",
  "CLOSING_RUSH",
  "REGULATION_INQUIRY",
  "FOCUS_VOTE"
];

export const DISPLAY_ONLY_PHASES: readonly MarketPhase[] = [
  "PRE_NEWS",
  "MUTATION",
  "OPEN_PRICE",
  "CLOSE",
  "DAY_RECAP"
];

const QUICK_PHASE_SECONDS: Partial<Record<MarketPhase, number>> = {
  PRE_NEWS: 6,
  MUTATION: 5,
  INSTITUTION_PRIVATE_ROOM: 8,
  AUCTION_FREE: 15,
  AUCTION_LOCKED: 10,
  OPEN_PRICE: 5,
  MORNING_TRADING: 35,
  MIDDAY_ROTATION: 30,
  CLOSING_RUSH: 20,
  CLOSE: 8,
  FOCUS_VOTE: 15,
  DAY_RECAP: 3
};

const STANDARD_PHASE_SECONDS: Partial<Record<MarketPhase, number>> = {
  PRE_NEWS: 8,
  MUTATION: 6,
  INSTITUTION_PRIVATE_ROOM: 8,
  AUCTION_FREE: 16,
  AUCTION_LOCKED: 10,
  OPEN_PRICE: 4,
  MORNING_TRADING: 40,
  MIDDAY_ROTATION: 20,
  AFTERNOON_TRADING: 40,
  CLOSING_RUSH: 20,
  CLOSE: 8,
  FOCUS_VOTE: 16,
  DAY_RECAP: 4
};

const LONG_PHASE_SECONDS: Partial<Record<MarketPhase, number>> = {
  PRE_NEWS: 10,
  MUTATION: 8,
  INSTITUTION_PRIVATE_ROOM: 10,
  AUCTION_FREE: 18,
  AUCTION_LOCKED: 12,
  OPEN_PRICE: 5,
  MORNING_TRADING: 42,
  MIDDAY_ROTATION: 20,
  AFTERNOON_TRADING: 42,
  CLOSING_RUSH: 25,
  CLOSE: 10,
  FOCUS_VOTE: 16,
  DAY_RECAP: 2
};

export const ROOM_PHASE_SECONDS: Record<GameRoomType, Partial<Record<MarketPhase, number>>> = {
  QUICK_10: QUICK_PHASE_SECONDS,
  STANDARD_20: STANDARD_PHASE_SECONDS,
  LONG_30: LONG_PHASE_SECONDS
};

export function getRoomTypeConfig(roomType: GameRoomType = DEFAULT_GAME_ROOM_TYPE): GameRoomTypeConfig {
  return ROOM_TYPE_CONFIGS[roomType];
}

export function getGameRoomTypeConfig(roomType: GameRoomType = DEFAULT_GAME_ROOM_TYPE): GameRoomTypeConfig {
  return getRoomTypeConfig(roomType);
}

export function isGameRoomType(value: unknown): value is GameRoomType {
  return value === "QUICK_10" || value === "STANDARD_20" || value === "LONG_30";
}

export function resolveGameRoomType(value: unknown): GameRoomType {
  return isGameRoomType(value) ? value : DEFAULT_GAME_ROOM_TYPE;
}

export function getRoomPhaseSequence(roomType: GameRoomType): MarketPhase[] {
  return Object.keys(ROOM_PHASE_SECONDS[roomType]) as MarketPhase[];
}

export function getRoomPhaseTiming(
  roomType: GameRoomType,
  phase: MarketPhase
): PhaseTimingConfig | undefined {
  const durationSec = ROOM_PHASE_SECONDS[roomType][phase];
  if (durationSec === undefined) {
    return undefined;
  }

  const requiresPlayerSubmission = SUBMISSION_PHASES.includes(phase);
  return {
    phase,
    durationSec,
    virtualTime: PHASE_VIRTUAL_TIME[phase] ?? "",
    requiresPlayerSubmission,
    ...(requiresPlayerSubmission && MINIMUM_PHASE_HOLD_SEC[phase] !== undefined
      ? { minimumPhaseHoldSec: MINIMUM_PHASE_HOLD_SEC[phase] }
      : {})
  };
}

export function getRoomPhaseTimings(roomType: GameRoomType): PhaseTimingConfig[] {
  return getRoomPhaseSequence(roomType).map((phase) => {
    const timing = getRoomPhaseTiming(roomType, phase);
    if (timing === undefined) {
      throw new Error(`Missing phase timing for ${roomType}:${phase}`);
    }
    return timing;
  });
}

export function getRoomTypePhaseDurations(roomType: GameRoomType): Partial<Record<MarketPhase, number>> {
  return { ...ROOM_PHASE_SECONDS[roomType] };
}

export function getPhaseVirtualTime(phase: MarketPhase): string {
  return PHASE_VIRTUAL_TIME[phase] ?? "--:--";
}
