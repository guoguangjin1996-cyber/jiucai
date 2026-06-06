import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { extname, join } from "node:path";
import { describe, expect, it } from "vitest";
import type { ElementSectorState, GameRoom, PlayerState, StockMarketState } from "../src";
import {
  A_STYLE_SCORE,
  GLOSSARY_TERMS,
  LEARNING_SCENARIOS,
  createLimitPrices,
  explainPlayerResult
} from "../src";

function player(overrides: Partial<PlayerState> = {}): PlayerState {
  return {
    id: "player-1",
    nickname: "虚构小白",
    isBot: false,
    role: "retail",
    alive: true,
    initialCapital: 100,
    finalCapital: 80,
    capital: 80,
    confidence: 3,
    score: 0,
    position: {
      stockId: "back-row",
      stockName: "山下火",
      element: "火",
      hasPosition: true,
      buyDay: 2,
      costPrice: 100,
      currentPrice: 80,
      amountLevel: "normal",
      sellable: false,
      lockedReason: "T+1"
    },
    positions: [
      {
        stockId: "back-row",
        stockName: "山下火",
        element: "火",
        hasPosition: true,
        buyDay: 2,
        costPrice: 100,
        currentPrice: 80,
        amountLevel: "normal",
        sellable: false,
        lockedReason: "T+1"
      }
    ],
    suspicion: 0,
    votedToday: false,
    ...overrides
  };
}

function stock(overrides: Partial<StockMarketState> = {}): StockMarketState {
  return {
    id: "back-row",
    templateId: "back-row",
    name: "山下火",
    element: "火",
    currentPrice: 80,
    previousClose: 100,
    changePercent: -12,
    danmakuHeat: 80,
    viewCountScore: 80,
    holderCountScore: 80,
    moneyFlowScore: 20,
    crowdedness: 92,
    tPlusOneCrowdedness: 88,
    quantAttention: 91,
    regulationAttention: 55,
    liquidity: 28,
    volatility: 75,
    sectorBeta: 88,
    isLimitUp: false,
    isLimitDown: false,
    boardStrength: 0,
    boardBreakRisk: 80,
    tags: ["后排", "T+1拥挤", "量化盯上", "人气龙", "弹幕龙"],
    ...overrides
  };
}

function sector(stocks: StockMarketState[]): ElementSectorState {
  return {
    element: "火",
    name: "火系板块",
    heat: 65,
    flow: 40,
    resonance: 40,
    risk: 80,
    popularityScore: 90,
    strengthScore: 50,
    moneyFlowScore: 30,
    riskScore: 85,
    resonanceScore: 35,
    statusTags: ["退潮预警"],
    stocks
  };
}

function room(stocks: StockMarketState[]): GameRoom {
  const { limitUpPrice, limitDownPrice } = createLimitPrices(100, 0.1);
  const targetPlayer = player();
  return {
    id: "room-learning",
    status: "finished",
    players: [
      targetPlayer,
      player({
        id: "player-2",
        nickname: "虚构同学",
        initialCapital: 100,
        finalCapital: 120,
        capital: 120,
        position: { hasPosition: false, amountLevel: "none", sellable: false },
        positions: []
      })
    ],
    institution: {
      playerId: "institution-1",
      controlPoints: 0,
      fakeNewsCount: 0,
      exposure: 0,
      harvestScore: 0,
      washScore: 0,
      usedActions: []
    },
    market: {
      day: 3,
      previousClose: 100,
      openPrice: 98,
      currentPrice: 80,
      closePrice: 80,
      limitRate: 0.1,
      limitUpPrice,
      limitDownPrice,
      isLimitUp: false,
      isLimitDown: false,
      boardStrength: 0,
      boardBreakRisk: 80,
      auctionPressure: 0,
      bullishHeat: 20,
      bearishHeat: 80,
      regulationHeat: 7,
      regulationState: "key_monitoring",
      sectors: [sector(stocks)],
      rankings: {
        stockPopularityRank: ["back-row", "leader"],
        stockLeadershipRank: ["leader", "back-row"],
        stockDanmakuRank: ["back-row", "leader"],
        stockQuantRiskRank: ["back-row", "leader"],
        stockTPlusOneRank: ["back-row", "leader"],
        stockRegulationRank: ["leader", "back-row"],
        stockGainersRank: ["leader", "back-row"],
        stockLosersRank: ["back-row", "leader"],
        sectorPopularityRank: ["火"],
        sectorStrengthRank: ["火"],
        sectorRiskRank: ["火"],
        sectorMoneyFlowRank: ["火"]
      }
    },
    day: 3,
    maxDays: 5,
    phase: "DAY_RECAP",
    logs: [
      {
        id: "log-auction",
        timestamp: 1,
        day: 1,
        phase: "AUCTION_FREE",
        type: "auction:fakeOrder",
        message: "集合竞价假封单撤单",
        payload: {}
      }
    ]
  };
}

function readAllText(root: string): string {
  const skippedDirectories = new Set(["node_modules", "build", "dist", "temp", "library", "local", "profiles", ".git"]);
  const readableExtensions = new Set([".ts", ".tsx", ".js", ".jsx", ".json", ".html", ".css", ".md"]);
  if (!existsSync(root)) {
    return "";
  }
  const stat = statSync(root);
  if (stat.isFile()) {
    if (!readableExtensions.has(extname(root))) {
      return "";
    }
    return readFileSync(root, "utf8");
  }
  return readdirSync(root, { withFileTypes: true })
    .filter((entry) => !entry.isDirectory() || !skippedDirectories.has(entry.name))
    .map((entry) => {
      const child = join(root, entry.name);
      if (entry.isFile() && !readableExtensions.has(extname(child))) {
        return "";
      }
      return readAllText(child);
    })
    .join("\n");
}

describe("learning scenarios and glossary", () => {
  it("contains at least 9 learning scenarios", () => {
    expect(LEARNING_SCENARIOS).toHaveLength(9);
  });

  it("gives every learning scenario a goal, risk tip, and summary", () => {
    for (const scenario of LEARNING_SCENARIOS) {
      expect(scenario.learningGoal.length).toBeGreaterThan(0);
      expect(scenario.riskTip.length).toBeGreaterThan(0);
      expect(scenario.summary.length).toBeGreaterThan(0);
      expect(scenario.steps.length).toBeGreaterThan(0);
    }
  });

  it("contains at least 15 glossary terms", () => {
    expect(GLOSSARY_TERMS.length).toBeGreaterThanOrEqual(15);
    for (const term of GLOSSARY_TERMS) {
      expect(term.inGameMeaning).toBeTruthy();
      expect(term.riskTip).toBeTruthy();
      expect(term.example).toBeTruthy();
    }
  });
});

describe("player result explanation", () => {
  it("explains T+1 lock", () => {
    const explanation = explainPlayerResult(player(), room([stock()]));

    expect(explanation.touchedRules).toContain("T+1");
    expect(explanation.mistakes.join("")).toContain("T+1");
  });

  it("explains quant attention", () => {
    const explanation = explainPlayerResult(player(), room([stock()]));

    expect(explanation.touchedRules).toContain("量化拥挤");
    expect(explanation.mistakes.join("")).toContain("量化");
  });

  it("explains back-row burial risk", () => {
    const explanation = explainPlayerResult(player(), room([stock()]));

    expect(explanation.mistakes.join("")).toContain("后排");
    expect(explanation.riskLessons.join("")).toContain("被埋");
  });

  it("explains that popularity dragon is not the same as leading dragon", () => {
    const explanation = explainPlayerResult(player(), room([stock(), stock({ id: "leader", name: "霹雳火", tags: ["领涨龙"], changePercent: 8 })]));

    expect(explanation.touchedRules).toContain("人气龙");
    expect(explanation.touchedRules).toContain("领涨龙");
    expect(explanation.riskLessons.join("")).toContain("不是同一件事");
  });
});

describe("positioning and compliance copy", () => {
  it("README contains the fictional entertainment simulation disclaimer", () => {
    const readme = readFileSync(join("..", "..", "README.md"), "utf8");

    expect(readme).toContain("本游戏为虚构娱乐模拟，不接入真实股票行情，不涉及真实证券交易，不构成任何投资建议");
    expect(readme).toContain("游戏内所有板块、股票、资金和收益率均为虚构参数");
  });

  it("UI copy avoids high-risk promotional wording", () => {
    const uiText = `${readAllText(join("..", "..", "apps", "client-cocos", "assets", "scripts"))}\n${readAllText(join("..", "..", "apps", "client-cocos", "web-preview", "index.html"))}`;
    const forbidden = ["荐股", "教你赚钱", "投资建议", "股票推荐", "盈利技巧", "实盘训练", "稳赚", "短线打板教程"];

    for (const word of forbidden) {
      expect(uiText.includes(word)).toBe(false);
    }
  }, 15000);

  it("AStyleScore includes beginner learning completeness", () => {
    const criterion = A_STYLE_SCORE.criteria.find((item) => item.item === "新手学习完整度");

    expect(criterion?.maxScore).toBe(14);
    expect(A_STYLE_SCORE.beginnerLearningChecklist).toContain("是否有教学模式");
    expect(A_STYLE_SCORE.beginnerLearningChecklist).toContain("是否能解释玩家亏损原因");
  });
});
