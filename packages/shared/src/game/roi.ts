import type { PlayerRole, PlayerState } from "../types";

export interface RoleRankings {
  all: PlayerState[];
  institutions: PlayerState[];
  retails: PlayerState[];
}

export interface FunnyTitleResult {
  playerId: string;
  titles: string[];
}

export function calculateROI(player: PlayerState): number {
  const initialCapital = player.initialCapital ?? inferInitialCapital(player);
  const finalCapital = player.finalCapital ?? player.capital;
  if (initialCapital <= 0) {
    return 0;
  }

  return Math.round(((finalCapital - initialCapital) / initialCapital) * 10000) / 10000;
}

export function rankPlayersByROI(players: PlayerState[]): PlayerState[] {
  return [...players]
    .map((player) => ({
      ...player,
      finalCapital: player.finalCapital ?? player.capital,
      roi: calculateROI(player)
    }))
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
