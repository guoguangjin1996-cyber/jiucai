export interface LimitBoardState {
  isLimitUp: boolean;
  isLimitDown: boolean;
}

export interface BoardBreakParams {
  isLimitUp: boolean;
  institutionAction: string;
  bullishCrowdCount: number;
}

export interface FloorReverseParams {
  isLimitDown: boolean;
  institutionAction: string;
  bearishCrowdCount: number;
}

export function resolveLimitBoardState(
  currentPrice: number,
  limitUpPrice: number,
  limitDownPrice: number
): LimitBoardState {
  return {
    isLimitUp: currentPrice >= limitUpPrice,
    isLimitDown: currentPrice <= limitDownPrice
  };
}

export function shouldBoardBreak(params: BoardBreakParams): boolean {
  return (
    params.isLimitUp &&
    params.institutionAction === "ship" &&
    params.bullishCrowdCount >= 4
  );
}

export function shouldFloorReverse(params: FloorReverseParams): boolean {
  return (
    params.isLimitDown &&
    params.institutionAction === "pry_floor" &&
    params.bearishCrowdCount >= 4
  );
}
