import { getRegulationState } from "../market";
import type { GameRoom, PlayerState } from "../types";

export type VoteMap = Record<string, string>;
export type ClosingDirectionVote = "SEAL_BOARD" | "BOARD_BREAK" | "DIVE" | "PULL_BACK";

export interface VoteApplyResult {
  room: GameRoom;
  topVotedPlayerId?: string;
  hitInstitution: boolean;
  reason: string;
}

export function applyFocusVoteResult(room: GameRoom, votes: VoteMap): VoteApplyResult {
  const topVotedPlayerId = pickTopVotedPlayerId(votes);
  if (topVotedPlayerId === undefined) {
    return { room: cloneRoom(room), hitInstitution: false, reason: "龙虎榜关注无人形成共识。" };
  }

  const target = room.players.find((player) => player.id === topVotedPlayerId);
  if (target === undefined) {
    return { room: cloneRoom(room), topVotedPlayerId, hitInstitution: false, reason: "被关注玩家不存在。" };
  }

  if (target.role === "institution") {
    const heat = Math.min(room.market.regulationHeat + 1, 10);
    return {
      room: {
        ...cloneRoom(room),
        institution: {
          ...room.institution,
          controlPoints: Math.max(0, room.institution.controlPoints - 1),
          fakeNewsCount: 0
        },
        market: {
          ...room.market,
          regulationHeat: heat,
          regulationState: getRegulationState(heat)
        }
      },
      topVotedPlayerId,
      hitInstitution: true,
      reason: "龙虎榜关注命中主力，次日操盘资源受限，但不直接决定胜负。"
    };
  }

  return {
    room: {
      ...cloneRoom(room),
      players: room.players.map((player) =>
        player.id === topVotedPlayerId
          ? { ...player, confidence: Math.max(0, player.confidence - 1) }
          : { ...player }
      )
    },
    topVotedPlayerId,
    hitInstitution: false,
    reason: "龙虎榜关注命中韭菜，该玩家次日情绪影响力下降。"
  };
}

export function applyRegulationVoteResult(room: GameRoom, votes: VoteMap): VoteApplyResult {
  const topVotedPlayerId = pickTopVotedPlayerId(votes);
  if (topVotedPlayerId === undefined) {
    const heat = Math.max(0, room.market.regulationHeat - 2);
    return {
      room: {
        ...cloneRoom(room),
        market: { ...room.market, regulationHeat: heat, regulationState: getRegulationState(heat) }
      },
      hitInstitution: false,
      reason: "监管问询分歧较大，次日波动加剧但不直接决定胜负。"
    };
  }

  const target = room.players.find((player) => player.id === topVotedPlayerId);
  const heat = Math.max(0, room.market.regulationHeat - 2);
  if (target?.role === "institution") {
    return {
      room: {
        ...cloneRoom(room),
        institution: {
          ...room.institution,
          controlPoints: Math.max(0, room.institution.controlPoints - 1),
          fakeNewsCount: 0
        },
        market: { ...room.market, regulationHeat: heat, regulationState: getRegulationState(heat) }
      },
      topVotedPlayerId,
      hitInstitution: true,
      reason: "监管问询命中主力，操盘能力下降，但不直接决定胜负。"
    };
  }

  return {
    room: {
      ...cloneRoom(room),
      players: room.players.map((player) =>
        player.id === topVotedPlayerId
          ? { ...player, confidence: Math.max(0, player.confidence - 1) }
          : { ...player }
      ),
      market: { ...room.market, regulationHeat: heat, regulationState: getRegulationState(heat) }
    },
    topVotedPlayerId,
    hitInstitution: false,
    reason: "监管问询误伤韭菜，被投玩家信心下降。"
  };
}

export function applyClosingDirectionVote(room: GameRoom, votes: Record<string, ClosingDirectionVote>): GameRoom {
  const direction = pickTopDirection(votes);
  if (direction === undefined) {
    return cloneRoom(room);
  }

  const heatDelta =
    direction === "SEAL_BOARD" || direction === "PULL_BACK"
      ? { bullishHeat: room.market.bullishHeat + 1, bearishHeat: room.market.bearishHeat }
      : { bullishHeat: room.market.bullishHeat, bearishHeat: room.market.bearishHeat + 1 };

  return {
    ...cloneRoom(room),
    market: {
      ...room.market,
      ...heatDelta,
      mutation: `尾盘方向共识：${direction}`
    }
  };
}

function pickTopVotedPlayerId(votes: VoteMap): string | undefined {
  const counts = new Map<string, number>();
  for (const targetPlayerId of Object.values(votes)) {
    counts.set(targetPlayerId, (counts.get(targetPlayerId) ?? 0) + 1);
  }

  return pickTop(counts);
}

function pickTopDirection(votes: Record<string, ClosingDirectionVote>): ClosingDirectionVote | undefined {
  const counts = new Map<ClosingDirectionVote, number>();
  for (const direction of Object.values(votes)) {
    counts.set(direction, (counts.get(direction) ?? 0) + 1);
  }

  return pickTop(counts);
}

function pickTop<T>(counts: Map<T, number>): T | undefined {
  let top: T | undefined;
  let topCount = 0;
  for (const [key, count] of counts.entries()) {
    if (count > topCount) {
      top = key;
      topCount = count;
    }
  }
  return top;
}

function cloneRoom(room: GameRoom): GameRoom {
  return {
    ...room,
    players: room.players.map(clonePlayer),
    institution: { ...room.institution, usedActions: [...room.institution.usedActions] },
    market: { ...room.market },
    logs: room.logs.map((log) => ({ ...log }))
  };
}

function clonePlayer(player: PlayerState): PlayerState {
  const cloned: PlayerState = {
    ...player,
    position: { ...player.position }
  };

  if (player.positions !== undefined) {
    cloned.positions = player.positions.map((position) => ({ ...position }));
  }

  return cloned;
}
