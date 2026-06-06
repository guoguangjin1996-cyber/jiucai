export type RegulationEvent =
  | "TWO_DAY_SURGE"
  | "TWO_DAY_LIMIT_UP"
  | "LIMIT_UP_OPEN"
  | "LIMIT_DOWN_OPEN"
  | "FAKE_ORDER_CANCELLED"
  | "BOARD_BREAK"
  | "FLOOR_REVERSE"
  | "CONSECUTIVE_SHIP"
  | "OVERHEATED_SENTIMENT"
  | "CONCENTRATED_VOTE";

export type RegulationLevel =
  | "normal"
  | "risk_warning"
  | "key_monitoring"
  | "suspension_warning"
  | "black_room";

const REGULATION_EVENT_HEAT: Record<RegulationEvent, number> = {
  TWO_DAY_SURGE: 1,
  TWO_DAY_LIMIT_UP: 2,
  LIMIT_UP_OPEN: 2,
  LIMIT_DOWN_OPEN: 2,
  FAKE_ORDER_CANCELLED: 1,
  BOARD_BREAK: 2,
  FLOOR_REVERSE: 3,
  CONSECUTIVE_SHIP: 2,
  OVERHEATED_SENTIMENT: 1,
  CONCENTRATED_VOTE: 1
};

export function updateRegulationHeat(currentHeat: number, events: RegulationEvent[]): number {
  const addedHeat = events.reduce((total, event) => total + REGULATION_EVENT_HEAT[event], 0);
  return Math.min(currentHeat + addedHeat, 10);
}

export function getRegulationState(heat: number): RegulationLevel {
  if (heat >= 10) {
    return "black_room";
  }

  if (heat >= 8) {
    return "suspension_warning";
  }

  if (heat >= 6) {
    return "key_monitoring";
  }

  if (heat >= 4) {
    return "risk_warning";
  }

  return "normal";
}

export function shouldEnterRegulationInquiry(heat: number): boolean {
  return heat >= 10;
}
