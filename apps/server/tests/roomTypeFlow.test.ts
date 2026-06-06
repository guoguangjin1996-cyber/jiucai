import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { FAST_MODE_MINIMUM_HOLD_MS, FAST_MODE_PHASE_DURATION_MS } from "../src/dayFlow";
import { GameEngine } from "../src/gameEngine";
import { RoomManager } from "../src/roomManager";

describe("room type and compressed time flow", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
  });

  it("starts rooms with room-type specific limits and stock pools", () => {
    const manager = new RoomManager(() => 0);

    const quickLobby = manager.createRoom("quick", "快跑", "QUICK_10");
    const quick = manager.startGame("quick", quickLobby.id);
    expect(quick.maxDays).toBe(3);
    expect(quick.market?.sectors?.flatMap((sector) => sector.stocks)).toHaveLength(9);
    expect(quick.maxPositions).toBe(2);
    expect(quick.maxDailyActions).toBe(2);
    expect(quick.players[0]?.maxDailyActionCount).toBe(2);

    const standardLobby = manager.createRoom("standard", "标准", "STANDARD_20");
    const standard = manager.startGame("standard", standardLobby.id);
    expect(standard.maxDays).toBe(5);
    expect(standard.market?.sectors?.flatMap((sector) => sector.stocks)).toHaveLength(30);
    expect(standard.maxPositions).toBe(3);
    expect(standard.maxDailyActions).toBe(3);

    const longLobby = manager.createRoom("long", "长盘", "LONG_30");
    const long = manager.startGame("long", longLobby.id);
    expect(long.maxDays).toBe(7);
    expect(long.market?.sectors?.flatMap((sector) => sector.stocks)).toHaveLength(30);
    expect(long.maxPositions).toBe(4);
    expect(long.maxDailyActions).toBe(4);
  });

  it("advances early after every alive human submits and minimum hold passes", async () => {
    const manager = new RoomManager(() => 0);
    const engine = new GameEngine(manager, { fastMode: true });
    const lobby = manager.createRoom("conn-1", "房主", "STANDARD_20");
    const room = manager.startGame("conn-1", lobby.id);
    const phases: string[] = [];
    const trackedEngine = new GameEngine(manager, {
      fastMode: true,
      callbacks: {
        onPhaseChanged: (_room, phase) => phases.push(phase)
      }
    });

    trackedEngine.startRoom(room.id);
    await vi.advanceTimersByTimeAsync(FAST_MODE_PHASE_DURATION_MS * 3);
    expect(manager.getRoom(room.id)?.phase).toBe("AUCTION_FREE");
    const session = manager.getSession("conn-1");
    const currentPlayer = manager.getRoom(room.id)?.players.find((player) => player.id === session?.playerId);

    trackedEngine.submitAction("conn-1", {
      actionType: "auction",
      action: currentPlayer?.role === "institution" ? "REAL_LIMIT_BUY" : "FLAT"
    });
    await vi.advanceTimersByTimeAsync(FAST_MODE_MINIMUM_HOLD_MS);

    expect(phases).toContain("AUCTION_LOCKED");
    trackedEngine.stopAll();
    engine.stopAll();
  });

  it("applies timeout default actions when action phases expire", async () => {
    const manager = new RoomManager(() => 0);
    const engine = new GameEngine(manager, { fastMode: true });
    const lobby = manager.createRoom("conn-1", "房主", "STANDARD_20");
    const room = manager.startGame("conn-1", lobby.id);

    engine.startRoom(room.id);
    await vi.advanceTimersByTimeAsync(FAST_MODE_PHASE_DURATION_MS * 4);

    const updated = manager.getRoom(room.id);
    expect(updated?.logs.some((log) => log.type === "player:defaultAction")).toBe(true);
    engine.stopAll();
  });

  it("settles ROI after the last configured trading day", async () => {
    const manager = new RoomManager(() => 0);
    const engine = new GameEngine(manager, { fastMode: true });
    const lobby = manager.createRoom("conn-1", "房主", "QUICK_10");
    const room = manager.startGame("conn-1", lobby.id);
    const internalRooms = manager as unknown as { rooms: Map<string, typeof room> };
    const storedRoom = internalRooms.rooms.get(room.id);
    expect(storedRoom).toBeDefined();
    storedRoom!.day = 3;

    engine.startRoom(room.id);
    await vi.advanceTimersByTimeAsync(FAST_MODE_PHASE_DURATION_MS * 12);

    const finished = manager.getRoom(room.id);
    expect(finished?.status).toBe("finished");
    expect(finished?.finalSettlement?.championPlayerId).toBeDefined();
    engine.stopAll();
  });
});
