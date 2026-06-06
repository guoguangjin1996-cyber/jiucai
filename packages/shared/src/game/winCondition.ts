import { rankPlayersByROI } from "./roi";
import type { GameRoom, PlayerRole } from "../types";

export interface WinConditionResult {
  winnerRole: PlayerRole | undefined;
  championPlayerId?: string;
  roi?: number;
  reason: string;
}

export function resolveWinCondition(room: GameRoom): WinConditionResult {
  if (room.day < room.maxDays) {
    return {
      winnerRole: undefined,
      reason: "尚未到第 5 个虚拟交易日，收益率榜暂不结算冠军。"
    };
  }

  const champion = rankPlayersByROI(room.players)[0];
  if (champion === undefined) {
    return {
      winnerRole: undefined,
      reason: "没有可结算玩家。"
    };
  }

  return {
    winnerRole: champion.role,
    championPlayerId: champion.id,
    ...(champion.roi === undefined ? {} : { roi: champion.roi }),
    reason: `5 个虚拟交易日结束，${champion.nickname} 以 ROI ${((champion.roi ?? 0) * 100).toFixed(2)}% 获得本局冠军。`
  };
}
