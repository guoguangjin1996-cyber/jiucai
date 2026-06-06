import { describe, expect, it } from "vitest";
import { RoomError, RoomManager } from "../src/roomManager";

function createStartedAuctionRoom(manager: RoomManager) {
  const room = manager.createRoom("conn-1", "房主");
  manager.joinRoom("conn-2", room.id, "玩家2");
  manager.joinRoom("conn-3", room.id, "玩家3");
  const startedRoom = manager.startGame("conn-1", room.id);
  return manager.transitionPhase(startedRoom.id, "AUCTION_FREE");
}

describe("auction flow", () => {
  it("allows cancelling orders during AUCTION_FREE", () => {
    const manager = new RoomManager(() => 0.9);
    let room = createStartedAuctionRoom(manager);

    room = manager.recordPlayerAction("conn-2", {
      actionType: "auction",
      action: "TOP_LIMIT_BUY"
    });
    room = manager.recordPlayerAction("conn-2", {
      actionType: "auction",
      action: "CANCEL_AUCTION_ORDER"
    });

    const player = room.players.find((candidate) => candidate.nickname === "玩家2");
    expect(player?.auctionOrder?.cancelled).toBe(true);
  });

  it("does not allow cancelling orders during AUCTION_LOCKED", () => {
    const manager = new RoomManager(() => 0.9);
    const room = createStartedAuctionRoom(manager);

    manager.recordPlayerAction("conn-2", {
      actionType: "auction",
      action: "TOP_LIMIT_BUY"
    });
    manager.transitionPhase(room.id, "AUCTION_LOCKED");

    expect(() =>
      manager.recordPlayerAction("conn-2", {
        actionType: "auction",
        action: "CANCEL_AUCTION_ORDER"
      })
    ).toThrow(RoomError);
  });

  it("accepts new orders during AUCTION_LOCKED as non-cancellable", () => {
    const manager = new RoomManager(() => 0.9);
    const room = createStartedAuctionRoom(manager);
    manager.transitionPhase(room.id, "AUCTION_LOCKED");

    const updatedRoom = manager.recordPlayerAction("conn-2", {
      actionType: "auction",
      action: "HIGH_OPEN_BUY"
    });

    const player = updatedRoom.players.find((candidate) => candidate.nickname === "玩家2");
    expect(player?.auctionOrder).toMatchObject({
      side: "buy",
      level: "aggressive",
      cancellable: false,
      cancelled: false
    });
    expect(player?.auctionOrder?.lockedAt).toBeTypeOf("number");
  });

  it("records a regulation event when institution cancels a fake order", () => {
    const manager = new RoomManager(() => 0);
    let room = createStartedAuctionRoom(manager);

    room = manager.recordPlayerAction("conn-1", {
      actionType: "auction",
      action: "FAKE_LIMIT_BUY"
    });
    room = manager.recordPlayerAction("conn-1", {
      actionType: "auction",
      action: "CANCEL_AUCTION_ORDER"
    });

    expect(room.market?.regulationHeat).toBe(1);
    expect(room.logs.some((log) => log.type === "regulation:event")).toBe(true);
    expect(room.logs.some((log) => log.message === "FAKE_ORDER_CANCELLED")).toBe(true);
  });

  it("opens high or limit-up when buy pressure is strong", () => {
    const manager = new RoomManager(() => 0);
    let room = createStartedAuctionRoom(manager);

    manager.recordPlayerAction("conn-1", {
      actionType: "auction",
      action: "REAL_LIMIT_BUY"
    });
    manager.recordPlayerAction("conn-2", {
      actionType: "auction",
      action: "TOP_LIMIT_BUY"
    });
    manager.recordPlayerAction("conn-3", {
      actionType: "auction",
      action: "TOP_LIMIT_BUY"
    });
    manager.transitionPhase(room.id, "OPEN_PRICE");
    room = manager.settlePhase(room.id, "OPEN_PRICE");

    expect(room.market?.auctionPressure).toBe(9);
    expect(room.market?.openPrice).toBe(110);
    expect(room.market?.currentPrice).toBe(110);
    expect(room.market?.isLimitUp).toBe(true);
    expect(
      room.logs.some(
        (log) => log.type === "market:openPrice" && String(log.message).includes("LIMIT_UP_OPEN")
      )
    ).toBe(true);
  });

  it("opens low or limit-down when sell pressure is strong", () => {
    const manager = new RoomManager(() => 0);
    let room = createStartedAuctionRoom(manager);

    manager.recordPlayerAction("conn-1", {
      actionType: "auction",
      action: "REAL_LIMIT_SELL"
    });
    manager.recordPlayerAction("conn-2", {
      actionType: "auction",
      action: "LIMIT_SELL"
    });
    manager.recordPlayerAction("conn-3", {
      actionType: "auction",
      action: "LIMIT_SELL"
    });
    manager.transitionPhase(room.id, "OPEN_PRICE");
    room = manager.settlePhase(room.id, "OPEN_PRICE");

    expect(room.market?.auctionPressure).toBe(-9);
    expect(room.market?.openPrice).toBe(90);
    expect(room.market?.currentPrice).toBe(90);
    expect(room.market?.isLimitDown).toBe(true);
    expect(
      room.logs.some(
        (log) => log.type === "market:openPrice" && String(log.message).includes("LIMIT_DOWN_OPEN")
      )
    ).toBe(true);
  });
});
