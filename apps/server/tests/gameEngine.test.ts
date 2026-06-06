import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DAY_PHASES, FAST_MODE_PHASE_DURATION_MS } from "../src/dayFlow";
import { GameEngine } from "../src/gameEngine";
import { RoomManager } from "../src/roomManager";

function createStartedRoom(manager: RoomManager) {
  const room = manager.createRoom("conn-1", "房主");
  return manager.startGame("conn-1", room.id);
}

describe("GameEngine day flow", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
  });

  it("enters phases in order after game start", async () => {
    const manager = new RoomManager(() => 0);
    const phases: string[] = [];
    const engine = new GameEngine(manager, {
      fastMode: true,
      callbacks: {
        onPhaseChanged: (_room, phase) => {
          phases.push(phase);
        }
      }
    });
    const room = createStartedRoom(manager);

    engine.startRoom(room.id);
    await vi.advanceTimersByTimeAsync(FAST_MODE_PHASE_DURATION_MS * 3);

    expect(phases.slice(0, 4)).toEqual([
      "PRE_NEWS",
      "MUTATION",
      "AUCTION_FREE",
      "AUCTION_LOCKED"
    ]);

    engine.stopAll();
  });

  it("can finish one day in FAST_MODE", async () => {
    const manager = new RoomManager(() => 0);
    const engine = new GameEngine(manager, { fastMode: true });
    const room = createStartedRoom(manager);

    engine.startRoom(room.id);
    await vi.advanceTimersByTimeAsync(FAST_MODE_PHASE_DURATION_MS * DAY_PHASES.length);

    const finishedRoom = manager.getRoom(room.id);
    expect(finishedRoom?.phase).toBe("DAY_RESULT");
    expect(
      finishedRoom?.logs.some(
        (log) => log.type === "system:settlement" && log.phase === "DAY_RESULT"
      )
    ).toBe(true);

    engine.stopAll();
  });

  it("records phase changes in logs", async () => {
    const manager = new RoomManager(() => 0);
    const engine = new GameEngine(manager, { fastMode: true });
    const room = createStartedRoom(manager);

    engine.startRoom(room.id);
    await vi.advanceTimersByTimeAsync(FAST_MODE_PHASE_DURATION_MS);

    const updatedRoom = manager.getRoom(room.id);
    const phaseLogs = updatedRoom?.logs.filter((log) => log.type === "game:phaseChanged") ?? [];

    expect(phaseLogs.map((log) => log.phase)).toContain("PRE_NEWS");
    expect(phaseLogs.map((log) => log.phase)).toContain("MUTATION");

    engine.stopAll();
  });

  it("records submitted player actions", () => {
    const manager = new RoomManager(() => 0);
    const engine = new GameEngine(manager, { fastMode: true });
    const room = createStartedRoom(manager);
    engine.startRoom(room.id);

    const updatedRoom = engine.submitAction("conn-1", {
      actionType: "danmaku",
      action: "虚构娱乐模拟：我先观察一下"
    });
    const actionLog = updatedRoom.logs.find((log) => log.type === "player:action");

    expect(actionLog?.message).toContain("danmaku:虚构娱乐模拟：我先观察一下");
    expect(actionLog?.payload).toMatchObject({
      actionType: "danmaku",
      action: "虚构娱乐模拟：我先观察一下"
    });

    engine.stopAll();
  });
});
