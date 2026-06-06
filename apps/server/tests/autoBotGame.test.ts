import { describe, expect, it } from "vitest";
import { MAX_PLAYERS, rankPlayersByROI } from "@jiucai-defense/shared";
import { DAY_PHASES } from "../src/dayFlow";
import { RoomManager } from "../src/roomManager";

describe("8 bot auto play smoke test", () => {
  it("can auto-fill and produce a winner placeholder after a full virtual game", () => {
    const manager = new RoomManager(() => 0);
    const room = manager.createRoom("conn-1", "内测员");
    const started = manager.startGame("conn-1", room.id);

    expect(started.players).toHaveLength(MAX_PLAYERS);
    expect(started.players.filter((player) => player.isBot)).toHaveLength(7);

    let current = started;
    for (const phase of DAY_PHASES) {
      current = manager.transitionPhase(current.id, phase);
      current = manager.settlePhase(current.id, phase);
    }

    const roiLeader = rankPlayersByROI(current.players)[0];

    expect(current.phase).toBe("DAY_RESULT");
    expect(roiLeader?.role).toMatch(/retail|institution/);
  });
});
