import { describe, expect, it } from "vitest";
import type { RoomSnapshot } from "../src/messages";
import { RoomManager } from "../src/roomManager";

function createRandomSequence(values: number[]) {
  let index = 0;
  return () => values[index++] ?? values.at(-1) ?? 0.5;
}

function createTradingRoom(manager: RoomManager) {
  const room = manager.createRoom("conn-1", "主力候选");
  manager.joinRoom("conn-2", room.id, "散户2");
  manager.joinRoom("conn-3", room.id, "散户3");
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

describe("continuous trading", () => {
  it("adds capital when TAKE_OFF meets an up day", () => {
    const manager = new RoomManager(createRandomSequence([0, 1]));
    const room = createTradingRoom(manager);

    manager.recordPlayerAction("conn-2", {
      actionType: "intraday",
      action: "TAKE_OFF"
    });

    const closedRoom = closeRoom(manager, room.id);
    expect(closedRoom.dayResult).toBe("SMALL_UP");
    expect(getPlayer(closedRoom, "散户2").capital).toBe(120);
  });

  it("subtracts capital when TAKE_OFF meets a down day", () => {
    const manager = new RoomManager(createRandomSequence([0, 0]));
    const room = createTradingRoom(manager);

    manager.recordPlayerAction("conn-1", {
      actionType: "intraday",
      action: "SMASH"
    });
    manager.recordPlayerAction("conn-2", {
      actionType: "intraday",
      action: "TAKE_OFF"
    });

    const closedRoom = closeRoom(manager, room.id);
    expect(["SMALL_DOWN", "BIG_DOWN"]).toContain(closedRoom.dayResult);
    expect(getPlayer(closedRoom, "散户2").capital).toBe(80);
  });

  it("adds capital when BURY meets a down day", () => {
    const manager = new RoomManager(createRandomSequence([0, 0]));
    const room = createTradingRoom(manager);

    manager.recordPlayerAction("conn-1", {
      actionType: "intraday",
      action: "SMASH"
    });
    manager.recordPlayerAction("conn-2", {
      actionType: "intraday",
      action: "BURY"
    });

    const closedRoom = closeRoom(manager, room.id);
    expect(["SMALL_DOWN", "BIG_DOWN"]).toContain(closedRoom.dayResult);
    expect(getPlayer(closedRoom, "散户2").capital).toBe(115);
  });

  it("adds confidence for PLAY_DEAD up to 3", () => {
    const manager = new RoomManager(createRandomSequence([0, 0.5]));
    const room = createTradingRoom(manager);
    const internalRooms = manager as unknown as { rooms: Map<string, RoomSnapshot> };
    const storedRoom = internalRooms.rooms.get(room.id);
    const player = storedRoom?.players.find((candidate) => candidate.nickname === "散户2");
    expect(player).toBeDefined();
    player!.confidence = 2;

    manager.recordPlayerAction("conn-2", {
      actionType: "intraday",
      action: "PLAY_DEAD"
    });

    const closedRoom = closeRoom(manager, room.id);
    expect(getPlayer(closedRoom, "散户2").confidence).toBe(3);
  });

  it("increases bullishHeat when institution uses DRAW_PIE", () => {
    const manager = new RoomManager(createRandomSequence([0, 0.5]));
    const room = createTradingRoom(manager);

    const updatedRoom = manager.recordPlayerAction("conn-1", {
      actionType: "intraday",
      action: "DRAW_PIE"
    });

    expect(room.market?.bullishHeat).toBe(0);
    expect(updatedRoom.market?.bullishHeat).toBe(2);
  });

  it("increases target suspicion when suspicious danmaku is sent", () => {
    const manager = new RoomManager(createRandomSequence([0, 0.5]));
    const room = createTradingRoom(manager);
    const target = getPlayer(room, "散户3");

    const updatedRoom = manager.recordDanmakuSend("conn-2", {
      text: "他一直在唱多，我怀疑他。",
      sentiment: "suspicious",
      targetPlayerId: target.id
    });

    expect(getPlayer(updatedRoom, "散户3").suspicion).toBe(1);
    expect(updatedRoom.danmaku).toHaveLength(1);
  });
});
