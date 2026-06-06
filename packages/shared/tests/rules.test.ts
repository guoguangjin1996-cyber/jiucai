import { describe, expect, it } from "vitest";
import type { GameRoom, MarketState, PlayerRole, PlayerState } from "../src";
import {
  DEFAULT_LIMIT_RATE,
  INITIAL_CAPITAL,
  INITIAL_INSTITUTION_CAPITAL,
  INITIAL_RETAIL_CAPITAL,
  INITIAL_CONFIDENCE,
  INITIAL_CONTROL_POINTS,
  INITIAL_FAKE_NEWS,
  MAX_DAYS,
  applyFocusVoteResult,
  applyRegulationVoteResult,
  applyLimitDownLock,
  buyPosition,
  createEmptyPosition,
  createLimitPrices,
  getRegulationState,
  resolveWinCondition,
  shouldEnterRegulationInquiry,
  updatePositionForNewDay,
  updateRegulationHeat
} from "../src";

function createRetailPlayer(id: string, capital: number, alive = true): PlayerState {
  return {
    id,
    nickname: `虚构散户${id}`,
    isBot: false,
    role: "retail",
    alive,
    capital,
    confidence: INITIAL_CONFIDENCE,
    score: 0,
    position: createEmptyPosition(),
    suspicion: 0,
    votedToday: false
  };
}

function createInstitutionPlayer(): PlayerState {
  return {
    id: "institution-1",
    nickname: "虚构主力",
    isBot: false,
    role: "institution",
    alive: true,
    initialCapital: INITIAL_INSTITUTION_CAPITAL,
    finalCapital: INITIAL_INSTITUTION_CAPITAL,
    capital: INITIAL_INSTITUTION_CAPITAL,
    confidence: INITIAL_CONFIDENCE,
    score: 0,
    position: createEmptyPosition(),
    suspicion: 0,
    votedToday: false
  };
}

function createMarketState(): MarketState {
  const previousClose = 100;
  const { limitUpPrice, limitDownPrice } = createLimitPrices(previousClose, DEFAULT_LIMIT_RATE);

  return {
    day: 1,
    previousClose,
    openPrice: previousClose,
    currentPrice: previousClose,
    closePrice: previousClose,
    limitRate: DEFAULT_LIMIT_RATE,
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
    regulationState: "normal"
  };
}

function createRoom(params: {
  exposure: number;
  day: number;
  retailCapitals: number[];
  aliveRetailCount?: number;
}): GameRoom {
  const aliveRetailCount = params.aliveRetailCount ?? params.retailCapitals.length;
  const retailPlayers = params.retailCapitals.map((capital, index) =>
    createRetailPlayer(`retail-${index + 1}`, capital, index < aliveRetailCount)
  );

  return {
    id: "room-1",
    status: "playing",
    players: [createInstitutionPlayer(), ...retailPlayers],
    institution: {
      playerId: "institution-1",
      controlPoints: INITIAL_CONTROL_POINTS,
      fakeNewsCount: INITIAL_FAKE_NEWS,
      exposure: params.exposure,
      harvestScore: 0,
      washScore: 0,
      usedActions: []
    },
    market: createMarketState(),
    day: params.day,
    maxDays: MAX_DAYS,
    phase: "DAY_RESULT",
    logs: []
  };
}

describe("position rules", () => {
  it("keeps a same-day T+1 position unsellable", () => {
    const position = buyPosition(1, 100, "normal");
    const updatedPosition = updatePositionForNewDay(position, 1);

    expect(updatedPosition.sellable).toBe(false);
    expect(updatedPosition.lockedReason).toBe("T+1");
  });

  it("makes a position sellable on the next day", () => {
    const position = buyPosition(1, 100, "normal");
    const updatedPosition = updatePositionForNewDay(position, 2);

    expect(updatedPosition.sellable).toBe(true);
    expect(updatedPosition.lockedReason).toBeUndefined();
  });

  it("sets a limit-down lock on a sellable position", () => {
    const position = updatePositionForNewDay(buyPosition(1, 100, "heavy"), 2);
    const lockedPosition = applyLimitDownLock(position);

    expect(lockedPosition.sellable).toBe(true);
    expect(lockedPosition.lockedReason).toBe("limit_down");
  });
});

describe("regulation rules", () => {
  it("adds regulation heat and caps it at 10", () => {
    const heat = updateRegulationHeat(7, [
      "FLOOR_REVERSE",
      "LIMIT_UP_OPEN",
      "CONCENTRATED_VOTE"
    ]);

    expect(heat).toBe(10);
  });

  it("enters black room when heat is 10", () => {
    expect(getRegulationState(10)).toBe("black_room");
    expect(shouldEnterRegulationInquiry(10)).toBe(true);
  });
});

describe("win condition rules", () => {
  it("does not let exposure decide victory when ROI belongs to retail", () => {
    const room = createRoom({
      exposure: 2,
      day: 5,
      retailCapitals: [135, 90, 80, 70, 60, 50, 40]
    });
    room.players[0]!.initialCapital = INITIAL_INSTITUTION_CAPITAL;
    room.players[0]!.capital = 1100;
    room.players[0]!.finalCapital = 1100;
    room.players[1]!.initialCapital = INITIAL_RETAIL_CAPITAL;
    room.players[1]!.finalCapital = 135;

    expect(resolveWinCondition(room)).toMatchObject({
      winnerRole: "retail" satisfies PlayerRole,
      championPlayerId: "retail-1"
    });
  });

  it("uses ROI instead of raw capital for the final champion", () => {
    const room = createRoom({
      exposure: 1,
      day: 5,
      retailCapitals: [30, 35, 39, 20, 60, 80, 100]
    });
    room.players[0]!.initialCapital = INITIAL_INSTITUTION_CAPITAL;
    room.players[0]!.capital = 1100;
    room.players[0]!.finalCapital = 1100;
    room.players[6]!.initialCapital = INITIAL_RETAIL_CAPITAL;
    room.players[6]!.capital = 180;
    room.players[6]!.finalCapital = 180;

    expect(resolveWinCondition(room)).toMatchObject({
      winnerRole: "retail" satisfies PlayerRole,
      championPlayerId: "retail-6"
    });
  });

  it("focus vote limits an institution without directly ending the game", () => {
    const room = createRoom({
      exposure: 0,
      day: 2,
      retailCapitals: [100, 100, 100, 100, 100, 100, 100]
    });

    const result = applyFocusVoteResult(room, {
      "retail-1": "institution-1",
      "retail-2": "institution-1"
    });

    expect(result.hitInstitution).toBe(true);
    expect(result.room.institution.controlPoints).toBe(INITIAL_CONTROL_POINTS - 1);
    expect(result.room.institution.fakeNewsCount).toBe(0);
    expect(resolveWinCondition(result.room).winnerRole).toBeUndefined();
  });

  it("regulation vote limits players without directly deciding victory", () => {
    const room = createRoom({
      exposure: 0,
      day: 4,
      retailCapitals: [100, 100, 100, 100, 100, 100, 100]
    });
    room.market.regulationHeat = 10;

    const result = applyRegulationVoteResult(room, {
      "retail-1": "institution-1",
      "retail-2": "institution-1"
    });

    expect(result.hitInstitution).toBe(true);
    expect(result.room.institution.controlPoints).toBe(INITIAL_CONTROL_POINTS - 1);
    expect(result.room.market.regulationHeat).toBeLessThan(10);
    expect(resolveWinCondition(result.room).winnerRole).toBeUndefined();
  });

  it("focus vote against a retail player lowers confidence without deciding victory", () => {
    const room = createRoom({
      exposure: 0,
      day: 2,
      retailCapitals: [100, 100, 100, 100, 100, 100, 100]
    });

    const result = applyFocusVoteResult(room, {
      "retail-2": "retail-1",
      "retail-3": "retail-1"
    });
    const focusedRetail = result.room.players.find((player) => player.id === "retail-1");

    expect(result.hitInstitution).toBe(false);
    expect(focusedRetail?.confidence).toBe(INITIAL_CONFIDENCE - 1);
    expect(resolveWinCondition(result.room).winnerRole).toBeUndefined();
  });
});
