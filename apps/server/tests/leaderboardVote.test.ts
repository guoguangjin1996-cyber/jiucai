import { describe, expect, it } from "vitest";
import type { RoomSnapshot } from "../src/messages";
import { RoomManager } from "../src/roomManager";

function createVoteRoom(manager: RoomManager) {
  const room = manager.createRoom("conn-1", "主力候选");
  manager.joinRoom("conn-2", room.id, "散户2");
  manager.joinRoom("conn-3", room.id, "散户3");
  const startedRoom = manager.startGame("conn-1", room.id);
  return manager.transitionPhase(startedRoom.id, "VOTE");
}

function getPlayer(room: RoomSnapshot, nickname: string) {
  const player = room.players.find((candidate) => candidate.nickname === nickname);
  expect(player).toBeDefined();
  return player!;
}

describe("leaderboard vote and settlement", () => {
  it("limits control resources when leaderboard vote hits an institution", () => {
    const manager = new RoomManager(() => 0);
    const room = createVoteRoom(manager);
    const institutionPlayer = room.players.find((player) => player.role === "institution");
    expect(institutionPlayer).toBeDefined();

    manager.recordPlayerAction("conn-2", {
      actionType: "vote",
      action: "vote",
      targetPlayerId: institutionPlayer!.id
    });
    const resolvedRoom = manager.settlePhase(room.id, "VOTE");

    expect(resolvedRoom.institution?.exposure).toBe(0);
    expect(resolvedRoom.institution?.controlPoints).toBe(4);
    expect(resolvedRoom.institution?.fakeNewsCount).toBe(0);
    expect(resolvedRoom.market?.regulationHeat).toBe(1);
    expect(getPlayer(resolvedRoom, "散户2").score).toBe(0);
    expect(resolvedRoom.logs.some((log) => log.type === "vote:hitInstitution")).toBe(true);
  });

  it("settles by ROI champion after day 5", () => {
    const manager = new RoomManager(() => 0);
    const room = createVoteRoom(manager);
    const internalRooms = manager as unknown as { rooms: Map<string, RoomSnapshot> };
    const storedRoom = internalRooms.rooms.get(room.id);
    expect(storedRoom).toBeDefined();
    storedRoom!.day = 5;
    storedRoom!.players = storedRoom!.players.map((player) =>
      player.nickname === "散户2" ? { ...player, capital: 180, finalCapital: 180 } : player
    );
    const resolvedRoom = manager.settlePhase(room.id, "DAY_RESULT");

    expect(resolvedRoom.status).toBe("finished");
    expect(resolvedRoom.finalSettlement?.winnerRole).toBe("retail");
    expect(resolvedRoom.finalSettlement?.championPlayerId).toBe(getPlayer(resolvedRoom, "散户2").id);
  });

  it("lets an institution become champion after day 5 when ROI is highest", () => {
    const manager = new RoomManager(() => 0);
    const room = createVoteRoom(manager);
    const internalRooms = manager as unknown as { rooms: Map<string, RoomSnapshot> };
    const storedRoom = internalRooms.rooms.get(room.id);
    expect(storedRoom).toBeDefined();
    storedRoom!.day = 5;
    storedRoom!.players = storedRoom!.players.map((player, index) =>
      player.role === "retail" && index <= 4 ? { ...player, capital: 30 } : player
    );

    const resolvedRoom = manager.settlePhase(room.id, "DAY_RESULT");

    expect(resolvedRoom.status).toBe("finished");
    expect(resolvedRoom.finalSettlement?.winnerRole).toBe("institution");
  });

  it("eliminates players whose capital is zero or below", () => {
    const manager = new RoomManager(() => 0);
    const room = createVoteRoom(manager);
    const internalRooms = manager as unknown as { rooms: Map<string, RoomSnapshot> };
    const storedRoom = internalRooms.rooms.get(room.id);
    const player = storedRoom?.players.find((candidate) => candidate.nickname === "散户2");
    expect(player).toBeDefined();
    player!.capital = 0;

    const resolvedRoom = manager.settlePhase(room.id, "DAY_RESULT");

    expect(getPlayer(resolvedRoom, "散户2").alive).toBe(false);
    expect(getPlayer(resolvedRoom, "散户2").eliminatedReason).toBe("capital<=0");
  });

  it("eliminates players whose confidence is zero or below", () => {
    const manager = new RoomManager(() => 0);
    const room = createVoteRoom(manager);
    const internalRooms = manager as unknown as { rooms: Map<string, RoomSnapshot> };
    const storedRoom = internalRooms.rooms.get(room.id);
    const player = storedRoom?.players.find((candidate) => candidate.nickname === "散户2");
    expect(player).toBeDefined();
    player!.confidence = 0;

    const resolvedRoom = manager.settlePhase(room.id, "DAY_RESULT");

    expect(getPlayer(resolvedRoom, "散户2").alive).toBe(false);
    expect(getPlayer(resolvedRoom, "散户2").eliminatedReason).toBe("confidence<=0");
  });

  it("reveals institution identity only after game finishes", () => {
    const manager = new RoomManager(() => 0);
    const room = createVoteRoom(manager);
    const retailPlayer = room.players.find((player) => player.role === "retail");
    const hiddenView = manager.sanitizeRoomForPlayer(room, retailPlayer?.id ?? "");

    expect(hiddenView.finalSettlement).toBeUndefined();
    expect(hiddenView.players.some((player) => player.role === "institution")).toBe(false);

    const internalRooms = manager as unknown as { rooms: Map<string, RoomSnapshot> };
    const storedRoom = internalRooms.rooms.get(room.id);
    storedRoom!.day = 5;
    storedRoom!.players = storedRoom!.players.map((player) =>
      player.id === storedRoom!.institution!.playerId ? { ...player, capital: 1300, finalCapital: 1300 } : player
    );
    const finishedRoom = manager.settlePhase(room.id, "DAY_RESULT");
    const revealedView = manager.sanitizeRoomForPlayer(finishedRoom, retailPlayer?.id ?? "");

    expect(revealedView.finalSettlement?.institutionPlayerId).toBe(storedRoom!.institution!.playerId);
  });
});
