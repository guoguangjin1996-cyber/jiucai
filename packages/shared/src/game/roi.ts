import type { MarketState, PlayerRole, PlayerState, PositionState } from "../types";

export interface RoleRankings {
  all: PlayerState[];
  institutions: PlayerState[];
  retails: PlayerState[];
}

export interface FunnyTitleResult {
  playerId: string;
  titles: string[];
}

export function calculatePortfolioValue(player: PlayerState, market?: MarketState): number {
  return roundMoney(player.capital + calculateHoldingsMarketValue(player, market));
}

export function updatePlayerCapitalAfterClose(player: PlayerState, market?: MarketState): PlayerState {
  const positions = getPlayerPositions(player).map((position) => markPositionToMarket(position, market));
  const finalCapital = calculatePortfolioValue({ ...player, positions }, market);
  return {
    ...player,
    finalCapital,
    roi: calculateROI({ ...player, positions, finalCapital }),
    position: positions[0] ?? player.position,
    positions
  };
}

export function markToMarketAllPlayers(players: PlayerState[], market?: MarketState): PlayerState[] {
  return players.map((player) => updatePlayerCapitalAfterClose(player, market));
}

export function calculateROI(player: PlayerState, market?: MarketState): number {
  const initialCapital = player.initialCapital ?? inferInitialCapital(player);
  const finalCapital = player.finalCapital ?? calculatePortfolioValue(player, market);
  if (initialCapital <= 0) {
    return 0;
  }

  return Math.round(((finalCapital - initialCapital) / initialCapital) * 10000) / 10000;
}

export function rankPlayersByROI(players: PlayerState[], market?: MarketState): PlayerState[] {
  return [...players]
    .map((player) => {
      const finalCapital = player.finalCapital ?? calculatePortfolioValue(player, market);
      return {
        ...player,
        finalCapital,
        roi: calculateROI({ ...player, finalCapital }, market)
      };
    })
    .sort((left, right) => (right.roi ?? 0) - (left.roi ?? 0));
}

export function resolveChampion(players: PlayerState[]): PlayerState | undefined {
  return rankPlayersByROI(players)[0];
}

export function resolveRoleRankings(players: PlayerState[]): RoleRankings {
  const ranked = rankPlayersByROI(players);
  return {
    all: ranked,
    institutions: ranked.filter((player) => player.role === "institution"),
    retails: ranked.filter((player) => player.role === "retail")
  };
}

export function resolveFunnyTitles(players: PlayerState[]): FunnyTitleResult[] {
  const ranked = rankPlayersByROI(players);
  const champion = ranked[0];
  const institutionLeader = ranked.find((player) => player.role === "institution");
  const retailLeader = ranked.find((player) => player.role === "retail");
  const biggestBagHolder = [...ranked].sort((left, right) => left.capital - right.capital)[0];

  return players.map((player) => {
    const titles = new Set<string>();
    if (player.id === champion?.id && player.role === "retail") titles.add("火中取栗王");
    if (player.id === institutionLeader?.id) titles.add("最强镰刀");
    if (player.id === retailLeader?.id) titles.add("韭菜之光");
    if (player.id === biggestBagHolder?.id) titles.add("最大接盘侠");
    if (player.positions?.some((position) => position.lockedReason === "T+1")) titles.add("T+1锁魂人");
    if ((player.suspicion ?? 0) >= 3) titles.add("量化受害者");
    if ((player.score ?? 0) >= 30) titles.add("反量化大师");
    return {
      playerId: player.id,
      titles: Array.from(titles)
    };
  });
}

function inferInitialCapital(player: Pick<PlayerState, "role" | "capital">): number {
  const defaults: Record<PlayerRole, number> = {
    institution: 1000,
    retail: 100
  };
  return defaults[player.role] ?? player.capital;
}

function calculateHoldingsMarketValue(player: PlayerState, market?: MarketState): number {
  return roundMoney(
    getPlayerPositions(player).reduce((sum, position) => sum + calculatePositionMarketValue(position, market), 0)
  );
}

function calculatePositionMarketValue(position: PositionState, market?: MarketState): number {
  if (!position.hasPosition) return 0;
  const investedCapital = Math.max(0, position.amount ?? position.investedCapital ?? 0);
  if (investedCapital <= 0) return 0;
  const costPrice = Math.max(0.01, position.costPrice ?? position.currentPrice ?? findMarketPrice(position, market) ?? 1);
  const currentPrice = Math.max(0.01, findMarketPrice(position, market) ?? position.currentPrice ?? costPrice);
  return roundMoney((investedCapital * currentPrice) / costPrice);
}

function markPositionToMarket(position: PositionState, market?: MarketState): PositionState {
  if (!position.hasPosition) return { ...position };
  const investedCapital = Math.max(0, position.amount ?? position.investedCapital ?? 0);
  const costPrice = Math.max(0.01, position.costPrice ?? position.currentPrice ?? findMarketPrice(position, market) ?? 1);
  const currentPrice = Math.max(0.01, findMarketPrice(position, market) ?? position.currentPrice ?? costPrice);
  const marketValue = calculatePositionMarketValue(position, market);
  return {
    ...position,
    amount: investedCapital,
    investedCapital,
    currentPrice,
    unrealizedProfit: roundMoney(marketValue - investedCapital),
    unrealizedReturn: roundMoney(currentPrice / costPrice - 1)
  };
}

function findMarketPrice(position: PositionState, market?: MarketState): number | undefined {
  if (position.stockId === undefined) return undefined;
  return market?.sectors?.flatMap((sector) => sector.stocks).find((stock) => stock.id === position.stockId)?.currentPrice;
}

function getPlayerPositions(player: PlayerState): PositionState[] {
  if (player.positions !== undefined && player.positions.length > 0) {
    return player.positions.map((position) => ({ ...position }));
  }
  return player.position.hasPosition ? [{ ...player.position }] : [];
}

function roundMoney(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.round((value + Number.EPSILON) * 100) / 100;
}
