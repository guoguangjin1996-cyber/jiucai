import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getRoomTypeConfig } from "@jiucai-defense/shared";
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
    const quickConfig = getRoomTypeConfig("QUICK_10");
    expect(quick.players).toHaveLength(quickConfig.maxPlayers);
    expect(quick.players.filter((player) => player.role === "institution")).toHaveLength(quickConfig.institutionCount);
    expect(quick.players.filter((player) => player.role === "retail")).toHaveLength(quickConfig.retailCount);
    expect(quick.maxDays).toBe(3);
    expect(quick.market?.sectors?.flatMap((sector) => sector.stocks)).toHaveLength(9);
    expect(quick.maxPositions).toBe(2);
    expect(quick.maxDailyActions).toBe(2);
    expect(quick.players[0]?.maxDailyActionCount).toBe(2);

    const standardLobby = manager.createRoom("standard", "标准", "STANDARD_20");
    const standard = manager.startGame("standard", standardLobby.id);
    const standardConfig = getRoomTypeConfig("STANDARD_20");
    expect(standard.players).toHaveLength(standardConfig.maxPlayers);
    expect(standard.players.filter((player) => player.role === "institution")).toHaveLength(standardConfig.institutionCount);
    expect(standard.players.filter((player) => player.role === "retail")).toHaveLength(standardConfig.retailCount);
    expect(standard.maxDays).toBe(5);
    expect(standard.market?.sectors?.flatMap((sector) => sector.stocks)).toHaveLength(30);
    expect(standard.maxPositions).toBe(3);
    expect(standard.maxDailyActions).toBe(3);

    const longLobby = manager.createRoom("long", "长盘", "LONG_30");
    const long = manager.startGame("long", longLobby.id);
    const longConfig = getRoomTypeConfig("LONG_30");
    expect(long.players).toHaveLength(longConfig.maxPlayers);
    expect(long.players.filter((player) => player.role === "institution")).toHaveLength(longConfig.institutionCount);
    expect(long.players.filter((player) => player.role === "retail")).toHaveLength(longConfig.retailCount);
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

  it("enforces room-type daily action limits", () => {
    const manager = new RoomManager(() => 0);
    const lobby = manager.createRoom("conn-1", "房主", "QUICK_10");
    manager.joinRoom("conn-2", lobby.id, "散户2");
    const room = manager.startGame("conn-1", lobby.id);

    manager.transitionPhase(room.id, "AUCTION_FREE");
    manager.recordPlayerAction("conn-2", { actionType: "auction", action: "FLAT" });
    manager.transitionPhase(room.id, "AUCTION_LOCKED");
    manager.recordPlayerAction("conn-2", { actionType: "auction", action: "FLAT" });
    manager.transitionPhase(room.id, "MORNING_TRADING");

    expect(() =>
      manager.recordPlayerAction("conn-2", { actionType: "intraday", action: "TAKE_OFF" })
    ).toThrow("今日主动操作次数已用完");
  });

  it("refreshes market rankings and quant target during intraday phases", () => {
    const manager = new RoomManager(() => 0);
    const lobby = manager.createRoom("conn-1", "房主", "STANDARD_20");
    manager.joinRoom("conn-2", lobby.id, "散户2");
    const room = manager.startGame("conn-1", lobby.id);

    manager.transitionPhase(room.id, "MORNING_TRADING");
    manager.recordPlayerAction("conn-2", { actionType: "intraday", action: "TAKE_OFF" });
    const refreshed = manager.settlePhase(room.id, "MORNING_TRADING");

    expect(refreshed.market?.rankings?.stockPopularityRank.length).toBeGreaterThan(0);
    expect(refreshed.market?.quant?.targetStockId).toBeDefined();
    expect(refreshed.logs.some((log) => log.type === "market:refresh")).toBe(true);
  });

  it("stores bought stock positions after an up close", () => {
    const manager = new RoomManager(() => 1);
    const lobby = manager.createRoom("conn-1", "房主", "STANDARD_20");
    manager.joinRoom("conn-2", lobby.id, "散户2");
    const room = manager.startGame("conn-1", lobby.id);

    manager.transitionPhase(room.id, "MORNING_TRADING");
    manager.recordPlayerAction("conn-2", { actionType: "intraday", action: "TAKE_OFF" });
    manager.transitionPhase(room.id, "CLOSE");
    const closed = manager.settlePhase(room.id, "CLOSE");
    const player = closed.players.find((candidate) => candidate.nickname === "散户2");

    expect(player?.positions?.[0]?.stockId).toBeDefined();
    expect(player?.positions?.[0]?.lockedReason).toBe("T+1");
  });

  it("settles regulation inquiry as a no-trade inserted day in fast mode", async () => {
    const manager = new RoomManager(() => 0);
    const engine = new GameEngine(manager, { fastMode: true });
    const lobby = manager.createRoom("conn-1", "房主", "STANDARD_20");
    const room = manager.startGame("conn-1", lobby.id);
    const internalRooms = manager as unknown as { rooms: Map<string, typeof room> };
    const storedRoom = internalRooms.rooms.get(room.id);
    expect(storedRoom?.market).toBeDefined();
    storedRoom!.phase = "DAY_RECAP";
    storedRoom!.market!.regulationHeat = 10;
    storedRoom!.market!.regulationState = "black_room";

    engine.startRoom(room.id);
    expect(manager.getRoom(room.id)?.phase).toBe("REGULATION_INQUIRY");
    await vi.advanceTimersByTimeAsync(FAST_MODE_PHASE_DURATION_MS);

    expect(manager.getRoom(room.id)?.phase).toBe("DAY_RECAP");
    engine.stopAll();
  });
});
