import { calculateROI, rankPlayersByROI } from "./game/roi";
import type { ElementSectorState, GameRoom, PlayerState, PositionState, StockMarketState } from "./types";

export type TouchedRule =
  | "集合竞价"
  | "T+1"
  | "涨跌停"
  | "板块轮动"
  | "人气龙"
  | "领涨龙"
  | "量化拥挤"
  | "监管问询";

export interface PlayerResultExplanation {
  playerId: string;
  nickname: string;
  roi: number;
  rank: number;
  mainProfitSource: string;
  mainLossSource: string;
  mistakes: string[];
  goodDecisions: string[];
  riskLessons: string[];
  touchedRules: TouchedRule[];
}

export function explainPlayerResult(player: PlayerState, room: GameRoom): PlayerResultExplanation {
  const ranked = rankPlayersByROI(room.players);
  const rank = ranked.findIndex((item) => item.id === player.id) + 1;
  const roi = calculateROI(player);
  const positions = getPlayerPositions(player);
  const heldStocks = positions
    .map((position) => findStock(room.market.sectors ?? [], position.stockId))
    .filter((stock): stock is StockMarketState => stock !== undefined);
  const touchedRules = new Set<TouchedRule>();
  const mistakes = new Set<string>();
  const goodDecisions = new Set<string>();
  const riskLessons = new Set<string>();

  if (hasAuctionTrap(player, room)) {
    touchedRules.add("集合竞价");
    mistakes.add("你在集合竞价强势外观出现时跟单，后来封单变化让开盘承接变弱。");
    riskLessons.add("集合竞价早期盘口仍可能变化，9:20 后有效订单会被锁定。");
  }

  if (positions.some((position) => position.lockedReason === "T+1" || (position.hasPosition && !position.sellable))) {
    touchedRules.add("T+1");
    mistakes.add("你有当日仓位处于 T+1 锁定，风险扩大时无法当日处理。");
    riskLessons.add("T+1 会让追高后的回撤持续到次日。");
  }

  if (heldStocks.some((stock) => stock.tags.includes("后排"))) {
    mistakes.add("你买入了后排票，弹性更高，但在龙头炸板或板块退潮时更容易被埋。");
    riskLessons.add("后排依赖龙头情绪和板块承接，退潮时更容易被埋。");
  }

  if (heldStocks.some((stock) => stock.tags.includes("T+1拥挤") || stock.tPlusOneCrowdedness >= 70)) {
    touchedRules.add("T+1");
    touchedRules.add("量化拥挤");
    mistakes.add("你持有的股票出现 T+1 拥挤，同向锁仓让尾盘流动性更脆。");
    riskLessons.add("T+1 拥挤会放大跳水和排队风险。");
  }

  if (heldStocks.some((stock) => stock.tags.includes("量化盯上") || stock.quantAttention >= 80)) {
    touchedRules.add("量化拥挤");
    mistakes.add("你持有的股票被系统量化机构盯上，拥挤和低流动性风险被放大。");
    riskLessons.add("量化更偏向拥挤、低流动性、T+1 锁仓严重的目标。");
  }

  if (heldStocks.some((stock) => stock.isLimitUp || stock.isLimitDown || stock.boardBreakRisk >= 60)) {
    touchedRules.add("涨跌停");
    riskLessons.add("涨停、炸板、跌停排队都会改变成交体验，不等于自由进出。");
  }

  if (room.market.regulationHeat >= 6 || room.phase === "REGULATION_INQUIRY") {
    touchedRules.add("监管问询");
    riskLessons.add("异常波动、虚假封单、炸板和弹幕过热会推高监管热度。");
  }

  if (ignoredCenterForceDrop(room)) {
    mistakes.add("盘中中军跳水时，板块承接已经转弱，但你仍暴露在同板块风险里。");
    riskLessons.add("中军代表承接，中军跳水常是板块风险信号。");
  }

  if (followedPopularityWithoutLeadership(heldStocks, room)) {
    touchedRules.add("人气龙");
    touchedRules.add("领涨龙");
    mistakes.add("你被弹幕龙或人气龙吸引，但它不一定是真正带动板块的领涨龙。");
    riskLessons.add("人气龙看关注度，领涨龙看真实带动能力，两者不是同一件事。");
  }

  if (caughtSectorRotation(heldStocks, room.market.sectors ?? [])) {
    touchedRules.add("板块轮动");
    goodDecisions.add("你抓住了轮动、防守或暗线方向，避开了单一主线过热。");
    riskLessons.add("主线过热后，资金可能切向轮动或防守方向。");
  }

  if (roi > 0) {
    goodDecisions.add(`你的 ROI 为 ${(roi * 100).toFixed(2)}%，说明本局资金效率为正。`);
  } else if (roi < 0) {
    mistakes.add(`你的 ROI 为 ${(roi * 100).toFixed(2)}%，说明本局资金效率回撤。`);
  }

  return {
    playerId: player.id,
    nickname: player.nickname,
    roi,
    rank: rank > 0 ? rank : room.players.length,
    mainProfitSource: resolveMainProfitSource(roi, heldStocks, Array.from(goodDecisions)),
    mainLossSource: resolveMainLossSource(roi, heldStocks, Array.from(mistakes)),
    mistakes: Array.from(mistakes),
    goodDecisions: Array.from(goodDecisions),
    riskLessons: Array.from(riskLessons),
    touchedRules: Array.from(touchedRules)
  };
}

function getPlayerPositions(player: PlayerState): PositionState[] {
  const positions = player.positions ?? [];
  if (positions.length > 0) {
    return positions;
  }
  return player.position.hasPosition ? [player.position] : [];
}

function findStock(sectors: ElementSectorState[], stockId: string | undefined): StockMarketState | undefined {
  if (stockId === undefined) {
    return undefined;
  }
  return sectors.flatMap((sector) => sector.stocks).find((stock) => stock.id === stockId);
}

function hasAuctionTrap(player: PlayerState, room: GameRoom): boolean {
  if (player.auctionOrder !== undefined && !player.auctionOrder.cancelled && player.auctionOrder.side === "buy") {
    return true;
  }

  return room.logs.some((log) => {
    const text = `${log.type}${log.message}`;
    return text.includes("集合竞价") || text.includes("撤单") || text.includes("假封") || text.includes("骗炮");
  });
}

function ignoredCenterForceDrop(room: GameRoom): boolean {
  return (room.market.sectors ?? []).some((sector) =>
    sector.stocks.some((stock) => stock.tags.includes("中军") && stock.changePercent <= -3)
  );
}

function followedPopularityWithoutLeadership(heldStocks: StockMarketState[], room: GameRoom): boolean {
  const rankings = room.market.rankings;
  const popularityLeaderId = rankings?.stockPopularityRank[0];
  const leadershipLeaderId = rankings?.stockLeadershipRank[0];

  return heldStocks.some((stock) => {
    const isPopularityFocus =
      stock.tags.includes("人气龙") ||
      stock.tags.includes("弹幕龙") ||
      (popularityLeaderId !== undefined && stock.id === popularityLeaderId);
    const isLeadershipFocus = stock.tags.includes("领涨龙") || (leadershipLeaderId !== undefined && stock.id === leadershipLeaderId);
    return isPopularityFocus && !isLeadershipFocus;
  });
}

function caughtSectorRotation(heldStocks: StockMarketState[], sectors: ElementSectorState[]): boolean {
  return heldStocks.some((stock) => {
    const sector = sectors.find((item) => item.element === stock.element);
    return (
      stock.tags.includes("暗线") ||
      (sector?.statusTags.includes("轮动先锋") ?? false) ||
      (sector?.statusTags.includes("防守吸血") ?? false)
    );
  });
}

function resolveMainProfitSource(roi: number, heldStocks: StockMarketState[], goodDecisions: string[]): string {
  if (goodDecisions.length > 0) {
    return goodDecisions[0]!;
  }
  if (roi > 0) {
    return "本局收益率为正，主要来自虚构持仓价格变化和行动节奏。";
  }
  if (heldStocks.some((stock) => stock.tags.includes("领涨龙"))) {
    return "你接触过领涨龙方向，但后续处理未能完全转化为收益率优势。";
  }
  return "本局没有明显正向来源，收益率主要受回撤和锁定规则影响。";
}

function resolveMainLossSource(roi: number, heldStocks: StockMarketState[], mistakes: string[]): string {
  if (mistakes.length > 0) {
    return mistakes[0]!;
  }
  if (roi < 0) {
    return "本局收益率为负，主要来自虚构持仓回撤。";
  }
  if (heldStocks.some((stock) => stock.tags.includes("后排"))) {
    return "后排暴露带来潜在回撤风险，但本局未形成主要亏损来源。";
  }
  return "本局没有明显亏损来源。";
}
