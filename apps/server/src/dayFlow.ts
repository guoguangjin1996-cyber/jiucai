import {
  DEFAULT_GAME_ROOM_TYPE,
  DISPLAY_ONLY_PHASES,
  getRoomPhaseSequence,
  getRoomPhaseTiming,
  MINIMUM_PHASE_HOLD_SEC,
  SUBMISSION_PHASES,
  type GameRoomType,
  type MarketPhase
} from "@jiucai-defense/shared";

export const DAY_PHASES = getRoomPhaseSequence(DEFAULT_GAME_ROOM_TYPE);

export type DayFlowPhase = MarketPhase;

export const FAST_MODE_PHASE_DURATION_MS = 200;

export function isDayFlowPhase(
  phase: MarketPhase,
  roomType: GameRoomType = DEFAULT_GAME_ROOM_TYPE
): phase is DayFlowPhase {
  return getRoomPhaseSequence(roomType).includes(phase);
}

export function getDayPhases(roomType: GameRoomType = DEFAULT_GAME_ROOM_TYPE): DayFlowPhase[] {
  return getRoomPhaseSequence(roomType);
}

export function getPhaseDurationMs(
  phase: DayFlowPhase,
  fastMode = false,
  roomType: GameRoomType = DEFAULT_GAME_ROOM_TYPE
): number {
  if (fastMode) {
    return FAST_MODE_PHASE_DURATION_MS;
  }

  const timing = getRoomPhaseTiming(roomType, phase);
  if (timing === undefined) {
    throw new Error(`No phase duration configured for ${roomType}:${phase}`);
  }

  return timing.durationSec * 1000;
}

export function getMinimumPhaseHoldMs(
  phase: DayFlowPhase,
  fastMode = false
): number | undefined {
  const holdSec = MINIMUM_PHASE_HOLD_SEC[phase];
  if (holdSec === undefined) {
    return undefined;
  }

  return fastMode ? Math.min(FAST_MODE_PHASE_DURATION_MS, holdSec * 1000) : holdSec * 1000;
}

export function phaseRequiresPlayerSubmission(phase: MarketPhase): boolean {
  return SUBMISSION_PHASES.includes(phase);
}

export function isDisplayOnlyPhase(phase: MarketPhase): boolean {
  return DISPLAY_ONLY_PHASES.includes(phase);
}

export function getNextDayPhase(
  phase: DayFlowPhase,
  roomType: GameRoomType = DEFAULT_GAME_ROOM_TYPE
): DayFlowPhase | undefined {
  const phases = getRoomPhaseSequence(roomType);
  const phaseIndex = phases.indexOf(phase);
  return phases[phaseIndex + 1];
}
