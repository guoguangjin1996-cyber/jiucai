import { describe, expect, it } from "vitest";
import {
  createMarketSectorsForRoomType,
  getRoomPhaseSequence,
  getRoomPhaseTiming,
  getRoomTypeConfig,
  getRoomTypePhaseDurations,
  MINIMUM_PHASE_HOLD_SEC,
  PHASE_VIRTUAL_TIME
} from "../src";

describe("game room type configs", () => {
  it("sets max days for each room type", () => {
    expect(getRoomTypeConfig("QUICK_10").maxDays).toBe(3);
    expect(getRoomTypeConfig("STANDARD_20").maxDays).toBe(5);
    expect(getRoomTypeConfig("LONG_30").maxDays).toBe(7);
  });

  it("sets stock pools for each room type", () => {
    const quickSectors = createMarketSectorsForRoomType("QUICK_10");
    expect(quickSectors).toHaveLength(3);
    expect(quickSectors.every((sector) => sector.stocks.length === 3)).toBe(true);
    expect(quickSectors.flatMap((sector) => sector.stocks)).toHaveLength(9);
    expect(createMarketSectorsForRoomType("STANDARD_20").flatMap((sector) => sector.stocks)).toHaveLength(30);
    expect(createMarketSectorsForRoomType("LONG_30").flatMap((sector) => sector.stocks)).toHaveLength(30);
  });

  it("sets room player and role structures", () => {
    expect(getRoomTypeConfig("QUICK_10")).toMatchObject({
      maxPlayers: 8,
      institutionCount: 2,
      retailCount: 6,
      stockPoolMode: "NINE_STOCKS"
    });
    expect(getRoomTypeConfig("STANDARD_20")).toMatchObject({
      maxPlayers: 12,
      institutionCount: 2,
      retailCount: 10,
      stockPoolMode: "FULL_MARKET"
    });
    expect(getRoomTypeConfig("LONG_30")).toMatchObject({
      maxPlayers: 16,
      institutionCount: 3,
      retailCount: 13,
      stockPoolMode: "FULL_MARKET"
    });
  });

  it("sets position and daily action limits", () => {
    expect(getRoomTypeConfig("QUICK_10").maxPositions).toBe(2);
    expect(getRoomTypeConfig("STANDARD_20").maxPositions).toBe(3);
    expect(getRoomTypeConfig("LONG_30").maxPositions).toBe(4);
    expect(getRoomTypeConfig("QUICK_10").maxDailyActions).toBe(2);
    expect(getRoomTypeConfig("STANDARD_20").maxDailyActions).toBe(3);
    expect(getRoomTypeConfig("LONG_30").maxDailyActions).toBe(4);
  });

  it("keeps configured phase timings and virtual times", () => {
    expect(getRoomPhaseTiming("QUICK_10", "AUCTION_FREE")?.durationSec).toBe(15);
    expect(getRoomPhaseTiming("STANDARD_20", "AFTERNOON_TRADING")?.durationSec).toBe(40);
    expect(getRoomPhaseTiming("LONG_30", "CLOSING_RUSH")?.durationSec).toBe(25);
    expect(PHASE_VIRTUAL_TIME.MORNING_TRADING).toBe("09:30");
    expect(PHASE_VIRTUAL_TIME.CLOSE).toBe("15:00");
    expect(MINIMUM_PHASE_HOLD_SEC.FOCUS_VOTE).toBe(6);
  });

  it("omits afternoon trading in quick rooms but keeps it in longer rooms", () => {
    expect(getRoomPhaseSequence("QUICK_10")).not.toContain("AFTERNOON_TRADING");
    expect(getRoomPhaseSequence("STANDARD_20")).toContain("AFTERNOON_TRADING");
    expect(getRoomPhaseSequence("LONG_30")).toContain("AFTERNOON_TRADING");
    expect(Object.keys(getRoomTypePhaseDurations("STANDARD_20"))).toContain("DAY_RECAP");
  });
});
