import { describe, expect, it } from "vitest";
import { PLAYER_TITLES, VOICE_LINE_LIBRARY, pickVoiceLine, type VoiceLineEvent } from "../src";

const events: VoiceLineEvent[] = [
  "game_start",
  "daily_news",
  "market_mutation",
  "auction_free",
  "auction_locked",
  "open_price",
  "retail_choice",
  "institution_action",
  "market_result",
  "limit_up",
  "limit_down",
  "board_break",
  "t_plus_one",
  "vote_start",
  "vote_result",
  "regulation",
  "player_eliminated",
  "game_result"
];

describe("voice line library", () => {
  it("has at least five lines for every key event", () => {
    for (const event of events) {
      expect(VOICE_LINE_LIBRARY[event].length).toBeGreaterThanOrEqual(5);
    }
  });

  it("includes required lines and settlement titles", () => {
    expect(pickVoiceLine("game_start")).toContain("欢迎来到韭菜保卫战");
    expect(VOICE_LINE_LIBRARY.auction_free).toContain("集合竞价开始。9:20之前，所有深情都可能撤单。");
    expect(VOICE_LINE_LIBRARY.auction_locked).toContain("9:20已到。现在后悔，属于无效申报。");
    expect(VOICE_LINE_LIBRARY.t_plus_one).toContain("你想跑。但T+1说：明天再说。");
    expect(PLAYER_TITLES).toContain("监管克星");
  });
});
