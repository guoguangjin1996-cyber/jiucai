import { describe, expect, it } from "vitest";
import type { AuctionOrder } from "../src";
import {
  DEFAULT_LIMIT_RATE,
  createLimitPrices,
  getOpenStatus,
  resolveAuctionPressure,
  resolveLimitBoardState,
  resolveOpenPrice,
  shouldBoardBreak,
  shouldFloorReverse
} from "../src";

function createOrder(order: Partial<AuctionOrder> & Pick<AuctionOrder, "side" | "level">): AuctionOrder {
  return {
    playerId: order.playerId ?? "player-1",
    side: order.side,
    level: order.level,
    cancellable: order.cancellable ?? true,
    cancelled: order.cancelled ?? false,
    lockedAt: order.lockedAt,
    isFake: order.isFake
  };
}

describe("market auction", () => {
  it("returns positive pressure when buy power is stronger", () => {
    const pressure = resolveAuctionPressure([
      createOrder({ side: "buy", level: "limit" }),
      createOrder({ side: "buy", level: "aggressive" }),
      createOrder({ side: "sell", level: "weak" })
    ]);

    expect(pressure).toBe(4.5);
  });

  it("returns negative pressure when sell power is stronger", () => {
    const pressure = resolveAuctionPressure([
      createOrder({ side: "buy", level: "normal" }),
      createOrder({ side: "sell", level: "limit" }),
      createOrder({ side: "sell", level: "aggressive" })
    ]);

    expect(pressure).toBe(-4);
  });

  it("ignores cancelled orders", () => {
    const pressure = resolveAuctionPressure([
      createOrder({ side: "buy", level: "limit", cancelled: true }),
      createOrder({ side: "sell", level: "normal" })
    ]);

    expect(pressure).toBe(-1);
  });
});

describe("market price", () => {
  it("does not let open price exceed limit prices", () => {
    const previousClose = 100;
    const highOpenPrice = resolveOpenPrice(previousClose, 100, DEFAULT_LIMIT_RATE);
    const lowOpenPrice = resolveOpenPrice(previousClose, -100, DEFAULT_LIMIT_RATE);
    const { limitUpPrice, limitDownPrice } = createLimitPrices(previousClose, DEFAULT_LIMIT_RATE);

    expect(highOpenPrice).toBe(limitUpPrice);
    expect(lowOpenPrice).toBe(limitDownPrice);
  });

  it("returns limit-up open status when pressure is high", () => {
    const openPrice = resolveOpenPrice(100, 7, DEFAULT_LIMIT_RATE);

    expect(openPrice).toBe(110);
    expect(getOpenStatus(openPrice, 100, DEFAULT_LIMIT_RATE)).toBe("LIMIT_UP_OPEN");
  });

  it("returns limit-down open status when pressure is low", () => {
    const openPrice = resolveOpenPrice(100, -7, DEFAULT_LIMIT_RATE);

    expect(openPrice).toBe(90);
    expect(getOpenStatus(openPrice, 100, DEFAULT_LIMIT_RATE)).toBe("LIMIT_DOWN_OPEN");
  });
});

describe("market limit board", () => {
  it("breaks the board when limit-up, institution ships, and bullish crowd is large", () => {
    const { isLimitUp } = resolveLimitBoardState(110, 110, 90);

    expect(
      shouldBoardBreak({
        isLimitUp,
        institutionAction: "ship",
        bullishCrowdCount: 4
      })
    ).toBe(true);
  });

  it("reverses from the floor when limit-down, institution pries floor, and bearish crowd is large", () => {
    const { isLimitDown } = resolveLimitBoardState(90, 110, 90);

    expect(
      shouldFloorReverse({
        isLimitDown,
        institutionAction: "pry_floor",
        bearishCrowdCount: 4
      })
    ).toBe(true);
  });
});
