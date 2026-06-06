import { describe, expect, it } from "vitest";
import { INITIAL_CAPITAL, INITIAL_CONFIDENCE, getRoomTypeConfig } from "@jiucai-defense/shared";
import { RoomError, RoomManager } from "../src/roomManager";

describe("RoomManager", () => {
  it("creates a room with the creator as host", () => {
    const manager = new RoomManager();
    const room = manager.createRoom("conn-1", "房主");

    expect(room.players).toHaveLength(1);
    expect(room.players[0]?.nickname).toBe("房主");
    expect(room.players[0]?.isHost).toBe(true);
    expect(room.players[0]?.capital).toBe(INITIAL_CAPITAL);
    expect(room.players[0]?.confidence).toBe(INITIAL_CONFIDENCE);
    expect(room.players[0]?.position.hasPosition).toBe(false);
  });

  it("joins an existing room", () => {
    const manager = new RoomManager();
    const room = manager.createRoom("conn-1", "房主");
    const updatedRoom = manager.joinRoom("conn-2", room.id, "新玩家");

    expect(updatedRoom.players).toHaveLength(2);
    expect(updatedRoom.players.map((player) => player.nickname)).toContain("新玩家");
  });

  it("does not allow more than the configured room capacity", () => {
    const manager = new RoomManager();
    const room = manager.createRoom("conn-1", "玩家1");
    const maxPlayers = getRoomTypeConfig("STANDARD_20").maxPlayers;

    for (let index = 2; index <= maxPlayers; index += 1) {
      manager.joinRoom(`conn-${index}`, room.id, `玩家${index}`);
    }

    expect(() => manager.joinRoom("conn-overflow", room.id, "溢出玩家")).toThrow(RoomError);
  });

  it("adds a bot player", () => {
    const manager = new RoomManager();
    const room = manager.createRoom("conn-1", "房主");
    const updatedRoom = manager.addBot("conn-1", room.id);

    expect(updatedRoom.players).toHaveLength(2);
    expect(updatedRoom.players[1]).toMatchObject({
      nickname: "涨停哥",
      isBot: true,
      ready: true
    });
  });

  it("updates the room after a player leaves", () => {
    const manager = new RoomManager();
    const room = manager.createRoom("conn-1", "房主");
    manager.joinRoom("conn-2", room.id, "新玩家");

    const result = manager.leave("conn-2");

    expect(result?.room?.players).toHaveLength(1);
    expect(result?.room?.players[0]?.nickname).toBe("房主");
  });

  it("starts a standard game with configured institutions and retail players", () => {
    const manager = new RoomManager(() => 0);
    const room = manager.createRoom("conn-1", "房主");
    const config = getRoomTypeConfig("STANDARD_20");
    const maxPlayers = config.maxPlayers;

    for (let index = 2; index <= maxPlayers; index += 1) {
      manager.joinRoom(`conn-${index}`, room.id, `玩家${index}`);
    }

    const startedRoom = manager.startGame("conn-1", room.id);

    expect(startedRoom.players).toHaveLength(config.maxPlayers);
    expect(startedRoom.status).toBe("playing");
    expect(startedRoom.phase).toBe("PRE_NEWS");
    expect(startedRoom.day).toBe(1);
    expect(startedRoom.maxDays).toBe(5);
    expect(startedRoom.players.filter((player) => player.role === "institution")).toHaveLength(config.institutionCount);
    expect(startedRoom.players.filter((player) => player.role === "retail")).toHaveLength(config.retailCount);
    expect(startedRoom.players.filter((player) => player.role === "institution")[0]?.capital).toBe(1000);
    expect(startedRoom.players.filter((player) => player.role === "retail")[0]?.capital).toBe(100);
    expect(startedRoom.institution?.controlPoints).toBe(5);
    expect(startedRoom.institutions).toHaveLength(2);
    expect(startedRoom.market).toMatchObject({
      day: 1,
      previousClose: 100,
      currentPrice: 100,
      limitRate: 0.1,
      limitUpPrice: 110,
      limitDownPrice: 90,
      regulationHeat: 0
    });
    expect(startedRoom.market?.sectors).toHaveLength(5);
    expect(startedRoom.market?.sectors?.flatMap((sector) => sector.stocks)).toHaveLength(30);
    expect(Object.keys(startedRoom.market?.orderBooks ?? {})).toHaveLength(30);
    expect(startedRoom.market?.news).toContain("虚构娱乐模拟");
  });

  it("shows institution resources only to the institution player", () => {
    const manager = new RoomManager(() => 0);
    const room = manager.createRoom("conn-1", "房主");
    for (let index = 2; index <= getRoomTypeConfig("STANDARD_20").maxPlayers; index += 1) {
      manager.joinRoom(`conn-${index}`, room.id, `玩家${index}`);
    }

    const startedRoom = manager.startGame("conn-1", room.id);
    const institutionPlayer = startedRoom.players.find((player) => player.role === "institution");
    const retailPlayer = startedRoom.players.find((player) => player.role === "retail");

    expect(institutionPlayer).toBeDefined();
    expect(retailPlayer).toBeDefined();

    const institutionView = manager.sanitizeRoomForPlayer(startedRoom, institutionPlayer?.id ?? "");
    const retailView = manager.sanitizeRoomForPlayer(startedRoom, retailPlayer?.id ?? "");

    expect(institutionView.institutionState?.playerId).toBe(institutionPlayer?.id);
    expect(retailView.institutionState).toBeUndefined();
    expect(retailView.players.some((player) => player.role === "institution")).toBe(false);
    expect(retailView.players.find((player) => player.id === retailPlayer?.id)?.role).toBe("retail");
  });

  it("fills missing seats with bots when starting", () => {
    const manager = new RoomManager(() => 0.5);
    const room = manager.createRoom("conn-1", "房主");
    manager.joinRoom("conn-2", room.id, "玩家2");

    const startedRoom = manager.startGame("conn-1", room.id);
    const config = getRoomTypeConfig("STANDARD_20");

    expect(startedRoom.players).toHaveLength(config.maxPlayers);
    expect(startedRoom.players.filter((player) => player.isBot)).toHaveLength(config.maxPlayers - 2);
    expect(startedRoom.players.some((player) => player.nickname === "涨停哥")).toBe(true);
  });
});
