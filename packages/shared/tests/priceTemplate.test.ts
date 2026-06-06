import { describe, expect, it } from "vitest";
import {
  PRICE_ENGINE_WEIGHTS,
  PriceTemplateLibrary,
  assignTemplateToNayinStock,
  createBackgroundMarketFunds,
  getTemplateCandidatesForNayinStock,
  normalizeHistoricalTemplate,
  perturbTemplate,
  resolveBackgroundMarketFundsModifier,
  resolveRetailCrowdModifier,
  resolveStockReturn,
  type NayinPersonality,
  type PriceTemplate,
  type PriceTemplateType,
  type StockPriceEngineInput
} from "../src";

const ALL_TEMPLATE_TYPES: PriceTemplateType[] = [
  "LEADER_STREAK",
  "BOARD_BREAK",
  "CORE_TREND",
  "HIDDEN_START",
  "ONE_DAY_HYPE",
  "DRAWDOWN",
  "DEFENSIVE_RANGE",
  "HIGH_LEVEL_DIVERGENCE"
];

function stock(personality: NayinPersonality, id = `stock-${personality}`) {
  return { id, personality };
}

function candidateWeight(personality: NayinPersonality, templateType: PriceTemplateType): number {
  return getTemplateCandidatesForNayinStock(stock(personality)).find((item) => item.templateType === templateType)?.weight ?? 0;
}

function onlyInstitutionInput(institutionModifier: number): StockPriceEngineInput {
  return {
    templateReturn: 0,
    sectorModifier: 0,
    institutionModifier,
    retailCrowdModifier: 0,
    quantModifier: 0,
    regulationModifier: 0,
    randomNoise: 0
  };
}

function expectLegalTemplate(template: PriceTemplate): void {
  expect(ALL_TEMPLATE_TYPES).toContain(template.templateType);
  expect(template.source === "synthetic" || template.source === "historical").toBe(true);
  expect(template.anonymized).toBe(true);
  expect(template.days.length).toBeGreaterThan(0);
  for (const day of template.days) {
    expect(day.highPct).toBeGreaterThanOrEqual(day.openPct);
    expect(day.highPct).toBeGreaterThanOrEqual(day.closePct);
    expect(day.lowPct).toBeLessThanOrEqual(day.openPct);
    expect(day.lowPct).toBeLessThanOrEqual(day.closePct);
    expect(day.volumeRatio).toBeGreaterThan(0);
  }
  expect(template.features.volatility).toBeGreaterThanOrEqual(0);
  expect(template.features.maxDrawdown).toBeGreaterThanOrEqual(0);
  expect(template.features.turnoverLevel).toBeGreaterThan(0);
}

describe("price template library", () => {
  it("generates every required synthetic template as a legal PriceTemplate", () => {
    const templates = PriceTemplateLibrary.all();
    expect(templates).toHaveLength(8);
    expect(templates.map((template) => template.templateType).sort()).toEqual([...ALL_TEMPLATE_TYPES].sort());

    for (const template of templates) {
      expect(template.source).toBe("synthetic");
      expectLegalTemplate(template);
    }
  });

  it("normalizes historical OHLCV without retaining source name, code, or date", () => {
    const template = normalizeHistoricalTemplate(
      [
        {
          name: "虚构源名称",
          code: "SOURCE-CODE-REDACT",
          date: "sample-day-one",
          open: 10,
          high: 11,
          low: 9.5,
          close: 10.5,
          volume: 1000
        },
        {
          name: "虚构源名称",
          code: "SOURCE-CODE-REDACT",
          date: "sample-day-two",
          open: 10.5,
          high: 12,
          low: 10,
          close: 11.5,
          volume: 2000
        }
      ],
      { id: "anonymous-source", templateType: "CORE_TREND" }
    );

    expect(template.source).toBe("historical");
    expect(template.anonymized).toBe(true);
    expect(template.days[0]?.openPct).toBe(0);
    expect(template.days[0]?.closePct).toBe(5);
    expect(template.days[0]?.volumeRatio).toBeCloseTo(0.67, 2);

    const serialized = JSON.stringify(template);
    expect(serialized).not.toContain("虚构源名称");
    expect(serialized).not.toContain("SOURCE-CODE-REDACT");
    expect(serialized).not.toContain("sample-day-one");
    expect(serialized).not.toContain("sample-day-two");
  });

  it("perturbs a curve while preserving its template type", () => {
    const template = PriceTemplateLibrary.getByType("BOARD_BREAK");
    const perturbed = perturbTemplate(template, "fixed-perturb-seed");

    expect(perturbed.templateType).toBe(template.templateType);
    expect(perturbed.source).toBe(template.source);
    expect(perturbed.anonymized).toBe(true);
    expect(perturbed.days).not.toEqual(template.days);
    expectLegalTemplate(perturbed);
  });
});

describe("Nayin template assignment", () => {
  it("makes leader-style personalities more likely to receive streak, break, or divergence templates", () => {
    const leaderWeights =
      candidateWeight("龙头", "LEADER_STREAK") +
      candidateWeight("龙头", "BOARD_BREAK") +
      candidateWeight("龙头", "HIGH_LEVEL_DIVERGENCE");
    const defensiveWeight = candidateWeight("龙头", "DEFENSIVE_RANGE");

    expect(leaderWeights).toBeGreaterThan(defensiveWeight * 3);
    expect(["LEADER_STREAK", "BOARD_BREAK", "HIGH_LEVEL_DIVERGENCE"]).toContain(
      assignTemplateToNayinStock(stock("龙头"), "leader-seed-1").templateType
    );
  });

  it("makes center-force personalities more likely to receive the core trend template", () => {
    expect(candidateWeight("中军", "CORE_TREND")).toBeGreaterThan(candidateWeight("中军", "ONE_DAY_HYPE"));
    expect(candidateWeight("趋势", "CORE_TREND")).toBeGreaterThan(candidateWeight("趋势", "BOARD_BREAK"));
  });

  it("makes defensive personalities more likely to receive the defensive range template", () => {
    expect(candidateWeight("防守", "DEFENSIVE_RANGE")).toBeGreaterThan(candidateWeight("防守", "LEADER_STREAK"));
    expect(candidateWeight("横盘", "DEFENSIVE_RANGE")).toBeGreaterThan(candidateWeight("横盘", "DRAWDOWN"));
  });
});

describe("stock price engine", () => {
  it("does not allow institution influence to be 100% of the resolved return", () => {
    const quickReturn = resolveStockReturn(onlyInstitutionInput(10), "QUICK_10");
    const standardReturn = resolveStockReturn(onlyInstitutionInput(10), "STANDARD_20");
    const longReturn = resolveStockReturn(onlyInstitutionInput(10), "LONG_30");

    expect(quickReturn).toBe(2);
    expect(standardReturn).toBe(1.8);
    expect(longReturn).toBe(1.5);
    expect(quickReturn).toBeLessThan(10);
  });

  it("uses different weights for QUICK_10, STANDARD_20, and LONG_30", () => {
    expect(PRICE_ENGINE_WEIGHTS.QUICK_10.templateReturn).not.toBe(PRICE_ENGINE_WEIGHTS.STANDARD_20.templateReturn);
    expect(PRICE_ENGINE_WEIGHTS.STANDARD_20.templateReturn).not.toBe(PRICE_ENGINE_WEIGHTS.LONG_30.templateReturn);

    const input: StockPriceEngineInput = {
      templateReturn: 10,
      sectorModifier: 6,
      institutionModifier: 4,
      retailCrowdModifier: 2,
      quantModifier: -1,
      regulationModifier: -2,
      randomNoise: 1
    };

    expect(resolveStockReturn(input, "QUICK_10")).not.toBe(resolveStockReturn(input, "STANDARD_20"));
    expect(resolveStockReturn(input, "STANDARD_20")).not.toBe(resolveStockReturn(input, "LONG_30"));
  });

  it("can move a stock through background market funds even when player trading is absent", () => {
    const funds = createBackgroundMarketFunds("no-player-trades");
    const backgroundModifier = resolveBackgroundMarketFundsModifier(funds);
    const crowdModifier = resolveRetailCrowdModifier({
      playerTradePressure: 0,
      crowdedness: 0,
      danmakuSentiment: 0
    });
    const resolved = resolveStockReturn(
      {
        templateReturn: 0,
        sectorModifier: backgroundModifier,
        institutionModifier: 0,
        retailCrowdModifier: crowdModifier,
        quantModifier: funds.quantFlow,
        regulationModifier: 0,
        randomNoise: 0
      },
      "STANDARD_20"
    );

    expect(crowdModifier).toBe(0);
    expect(backgroundModifier).not.toBe(0);
    expect(resolved).not.toBe(0);
  });

  it("prevents institution operation from fully determining the final price", () => {
    const resolved = resolveStockReturn(
      {
        templateReturn: -4,
        sectorModifier: -3,
        institutionModifier: 10,
        retailCrowdModifier: -2,
        quantModifier: -1,
        regulationModifier: -3,
        randomNoise: 0.5
      },
      "STANDARD_20"
    );

    expect(resolved).not.toBe(10);
    expect(resolved).toBeLessThan(2);
  });
});
