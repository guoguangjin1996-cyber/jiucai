import type { PositionAmountLevel, PositionState } from "../types";

export function createEmptyPosition(): PositionState {
  return {
    hasPosition: false,
    amountLevel: "none",
    sellable: false
  };
}

export function buyPosition(
  day: number,
  costPrice: number,
  amountLevel: PositionAmountLevel
): PositionState {
  return {
    hasPosition: true,
    buyDay: day,
    costPrice,
    amountLevel,
    sellable: false,
    lockedReason: "T+1"
  };
}

export function updatePositionForNewDay(
  position: PositionState,
  currentDay: number
): PositionState {
  if (position.hasPosition && position.buyDay !== undefined && currentDay > position.buyDay) {
    const { lockedReason: _lockedReason, ...unlockedPosition } = position;
    return {
      ...unlockedPosition,
      sellable: true
    };
  }

  if (position.hasPosition) {
    return {
      ...position,
      sellable: false,
      lockedReason: "T+1"
    };
  }

  return { ...position };
}

export function applyLimitDownLock(position: PositionState): PositionState {
  if (position.hasPosition && position.sellable) {
    return {
      ...position,
      lockedReason: "limit_down"
    };
  }

  return { ...position };
}
