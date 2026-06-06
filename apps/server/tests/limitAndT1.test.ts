import { describe, expect, it } from "vitest";
import type { RoomSnapshot } from "../src/messages";
import { RoomManager } from "../src/roomManager";

function createRandomSequence(values: number[]) {
  let index = 0;
  return () => values[index++] ?? values.at(-1) ?? 0.5;
}

function createRoomWithPlayers(manager: RoomManager, playerCount: number) {
  const room = manager.createRoom("conn-1", "主力候选");
  for (let index = 2; index <= playerCount; index += 1) {
    manager.joinRoom(`conn-${index}`, room.id, `散户${index}`);
  }

  const startedRoom = manager.startGame("conn-1", room.id);
  return manager.transitionPhase(startedRoom.id, "CONTINUOUS_TRADING");
}

function closeRoom(manager: RoomManager, roomId: string) {
  manager.transitionPhase(roomId, "CLOSE");
  return manager.settlePhase(roomId, "CLOSE");
}

function getPlayer(room: RoomSnapshot, nickname: string) {
  const player = room.players.find((candidate) => candidate.nickname === nickname);
  expect(player).toBeDefined();
  return player!;
}

describe("limit board and T+1", () => {
  it("keeps same-day TAKE_OFF position unsellable", () => {
    const manager = new RoomManager(createRandomSequence([0, 1]));
    const room = createRoomWithPlayers(manager, 3);

    manager.recordPlayerAction("conn-2", {
      actionType: "intraday",
      action: "TAKE_OFF"
    });

    const closedRoom = closeRoom(manager, room.id);
    const player = getPlayer(closedRoom, "散户2");

    expect(player.position.hasPosition).toBe(true);
    expect(player.position.buyDay).toBe(1);
    expect(player.position.sellable).toBe(false);
    expect(player.position.lockedReason).toBe("T+1");
  });

  it("makes yesterday position sellable on the next day", () => {
    const manager = new RoomManager(createRandomSequence([0, 1]));
    const room = createRoomWithPlayers(manager, 3);
    manager.recordPlayerAction("conn-2", {
      actionType: "intraday",
      action: "TAKE_OFF"
    });

    let closedRoom = closeRoom(manager, room.id);
    closedRoom = manager.transitionPhase(closedRoom.id, "DAY_RESULT");
    const nextDayRoom = manager.transitionPhase(closedRoom.id, "PRE_NEWS");
    const player = getPlayer(nextDayRoom, "散户2");

    expect(nextDayRoom.day).toBe(2);
    expect(player.position.sellable).toBe(true);
    expect(player.position.lockedReason).toBeUndefined();
  });

  it("triggers board break when limit-up, institution ships, and most retail are bullish", () => {
    const manager = new RoomManager(createRandomSequence([0, 1]));
    const room = createRoomWithPlayers(manager, 5);

    manager.recordPlayerAction("conn-1", { actionType: "intraday", action: "DRAW_PIE" });
    manager.recordPlayerAction("conn-1", { actionType: "intraday", action: "SHIP" });
    for (let index = 2; index <= 5; index += 1) {
      manager.recordPlayerAction(`conn-${index}`, {
        actionType: "intraday",
        action: "TAKE_OFF"
      });
    }

    const closedRoom = closeRoom(manager, room.id);

    expect(closedRoom.dayResult).toBe("BOARD_BREAK");
    expect(closedRoom.market?.isLimitUp).toBe(false);
    expect(getPlayer(closedRoom, "散户2").titles).toContain("炸板体验官");
    expect(closedRoom.voiceLines.some((line) => line.text.includes("炸板了"))).toBe(true);
  });

  it("triggers floor reverse when limit-down, institution pries floor, and most retail are bearish", () => {
    const manager = new RoomManager(createRandomSequence([0, 0]));
    const room = createRoomWithPlayers(manager, 5);

    manager.recordPlayerAction("conn-1", { actionType: "intraday", action: "SCARE" });
    manager.recordPlayerAction("conn-1", { actionType: "intraday", action: "PRY_FLOOR" });
    for (let index = 2; index <= 5; index += 1) {
      manager.recordPlayerAction(`conn-${index}`, {
        actionType: "intraday",
        action: "BURY"
      });
    }

    const closedRoom = closeRoom(manager, room.id);

    expect(closedRoom.dayResult).toBe("FLOOR_REVERSE");
    expect(closedRoom.market?.isLimitDown).toBe(false);
    expect(getPlayer(closedRoom, "散户2").capital).toBe(75);
  });

  it("can fail to run away during limit-down queue", () => {
    const manager = new RoomManager(createRandomSequence([0, 0]));
    const room = createRoomWithPlayers(manager, 3);
    const internalRooms = manager as unknown as { rooms: Map<string, RoomSnapshot> };
    const storedRoom = internalRooms.rooms.get(room.id);
    const player = storedRoom?.players.find((candidate) => candidate.nickname === "散户2");
    expect(player).toBeDefined();
    player!.position = {
      hasPosition: true,
      buyDay: 0,
      costPrice: 100,
      amountLevel: "normal",
      sellable: true
    };
    if (storedRoom?.market !== undefined) {
      storedRoom.market.isLimitDown = true;
    }

    const updatedRoom = manager.recordPlayerAction("conn-2", {
      actionType: "intraday",
      action: "RUN_AWAY"
    });
    const updatedPlayer = getPlayer(updatedRoom, "散户2");

    expect(updatedPlayer.position.lockedReason).toBe("limit_down");
    expect(updatedPlayer.titles).toContain("跌停排队员");
    expect(
      updatedRoom.logs.some((log) => log.type === "position:limitDownSellFailed")
    ).toBe(true);
  });
});
