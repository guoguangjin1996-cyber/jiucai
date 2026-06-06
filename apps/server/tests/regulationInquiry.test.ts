import { describe, expect, it } from "vitest";
import { getRegulationState, updateRegulationHeat } from "@jiucai-defense/shared";
import type { RoomSnapshot } from "../src/messages";
import { RoomManager } from "../src/roomManager";

function createInquiryRoom(manager: RoomManager) {
  const room = manager.createRoom("conn-1", "主力候选");
  manager.joinRoom("conn-2", room.id, "散户2");
  manager.joinRoom("conn-3", room.id, "散户3");
  const startedRoom = manager.startGame("conn-1", room.id);
  const internalRooms = manager as unknown as { rooms: Map<string, RoomSnapshot> };
  const storedRoom = internalRooms.rooms.get(startedRoom.id);
  expect(storedRoom?.market).toBeDefined();
  storedRoom!.market!.regulationHeat = 10;
  storedRoom!.market!.regulationState = "black_room";
  const dayResultRoom = manager.transitionPhase(startedRoom.id, "DAY_RESULT");
  return manager.transitionPhase(dayResultRoom.id, "PRE_NEWS");
}

function getPlayer(room: RoomSnapshot, nickname: string) {
  const player = room.players.find((candidate) => candidate.nickname === nickname);
  expect(player).toBeDefined();
  return player!;
}

describe("regulation inquiry", () => {
  it("enters black_room when regulation heat reaches 10", () => {
    const heat = updateRegulationHeat(8, ["FLOOR_REVERSE"]);

    expect(heat).toBe(10);
    expect(getRegulationState(heat)).toBe("black_room");
  });

  it("enters REGULATION_INQUIRY on the next day after black_room", () => {
    const manager = new RoomManager(() => 0);
    const inquiryRoom = createInquiryRoom(manager);

    expect(inquiryRoom.phase).toBe("REGULATION_INQUIRY");
    expect(inquiryRoom.day).toBe(2);
    expect(inquiryRoom.voiceLines.some((line) => line.text.includes("盘面太抽象"))).toBe(true);
  });

  it("limits institution resources when players vote for the institution", () => {
    const manager = new RoomManager(() => 0);
    const inquiryRoom = createInquiryRoom(manager);
    const institutionPlayer = inquiryRoom.players.find((player) => player.role === "institution");
    expect(institutionPlayer).toBeDefined();

    manager.recordPlayerAction("conn-2", {
      actionType: "regulationVote",
      action: "vote",
      targetPlayerId: institutionPlayer!.id
    });
    const resolvedRoom = manager.settlePhase(inquiryRoom.id, "REGULATION_INQUIRY");

    expect(resolvedRoom.institution?.exposure).toBe(0);
    expect(resolvedRoom.institution?.controlPoints).toBe(4);
    expect(resolvedRoom.institution?.fakeNewsCount).toBe(0);
    expect(resolvedRoom.logs.some((log) => log.type === "regulation:hit")).toBe(true);
  });

  it("reduces the voted retail player's confidence on a wrong vote", () => {
    const manager = new RoomManager(() => 0);
    const inquiryRoom = createInquiryRoom(manager);
    const targetRetail = getPlayer(inquiryRoom, "散户3");

    manager.recordPlayerAction("conn-2", {
      actionType: "regulationVote",
      action: "vote",
      targetPlayerId: targetRetail.id
    });
    const resolvedRoom = manager.settlePhase(inquiryRoom.id, "REGULATION_INQUIRY");

    expect(getPlayer(resolvedRoom, "散户3").confidence).toBe(2);
    expect(resolvedRoom.institution?.harvestScore).toBe(15);
    expect(resolvedRoom.logs.some((log) => log.type === "regulation:miss")).toBe(true);
  });

  it("reduces regulation heat after inquiry", () => {
    const manager = new RoomManager(() => 0);
    const inquiryRoom = createInquiryRoom(manager);
    const targetRetail = getPlayer(inquiryRoom, "散户3");

    manager.recordPlayerAction("conn-2", {
      actionType: "regulationVote",
      action: "vote",
      targetPlayerId: targetRetail.id
    });
    const resolvedRoom = manager.settlePhase(inquiryRoom.id, "REGULATION_INQUIRY");

    expect(resolvedRoom.market?.regulationHeat).toBe(8);
    expect(resolvedRoom.market?.regulationState).toBe("suspension_warning");
  });
});
