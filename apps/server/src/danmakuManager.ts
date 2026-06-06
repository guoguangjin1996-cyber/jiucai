import type { DanmakuItem } from "@jiucai-defense/shared";
import { createId } from "./id";
import type { DanmakuSendPayload, DanmakuSystemPayload, RoomPlayer, RoomSnapshot } from "./messages";
import { RoomError } from "./roomManager";

export const QUICK_DANMAKU = [
  "这还不上？",
  "别追，骗炮！",
  "他一直在唱多，我怀疑他。",
  "我先装死。",
  "9:20后我撤不了。",
  "这明显出货。"
] as const;

export class DanmakuManager {
  createPlayerDanmaku(
    room: RoomSnapshot,
    player: RoomPlayer,
    payload: DanmakuSendPayload,
    createdAt = Date.now()
  ): { room: RoomSnapshot; item: DanmakuItem } {
    const asInstitution = payload.asInstitution === true;
    if (asInstitution) {
      const institutionState = room.institutions?.find((institution) => institution.playerId === player.id);
      if (player.role !== "institution" || (room.institution?.playerId !== player.id && institutionState === undefined)) {
        throw new RoomError("INSTITUTION_ONLY", "只有主力可以投放主力弹幕。");
      }

      if ((institutionState?.fakeNewsCount ?? room.institution?.fakeNewsCount ?? 0) <= 0) {
        throw new RoomError("NO_FAKE_NEWS", "主力弹幕次数已用完。");
      }
    }

    const item: DanmakuItem = {
      id: createId("danmaku"),
      playerId: player.id,
      source: asInstitution ? "institution" : player.isBot ? "bot" : "player",
      text: payload.text,
      sentiment: payload.sentiment,
      createdAt
    };

    if (payload.targetPlayerId !== undefined) {
      item.targetPlayerId = payload.targetPlayerId;
    }

    const roomWithFakeNewsCost =
      asInstitution && room.institution !== undefined
        ? {
            ...room,
            institution: {
              ...room.institution,
              fakeNewsCount:
                room.institution.playerId === player.id
                  ? room.institution.fakeNewsCount - 1
                  : room.institution.fakeNewsCount
            },
            ...(room.institutions === undefined
              ? {}
              : {
                  institutions: room.institutions.map((institution) =>
                    institution.playerId === player.id
                      ? { ...institution, fakeNewsCount: institution.fakeNewsCount - 1 }
                      : institution
                  )
                })
          }
        : room;

    return this.appendDanmaku(roomWithFakeNewsCost, item);
  }

  createSystemDanmaku(
    room: RoomSnapshot,
    payload: DanmakuSystemPayload,
    createdAt = Date.now()
  ): { room: RoomSnapshot; item: DanmakuItem } {
    const item: DanmakuItem = {
      id: createId("danmaku"),
      source: "system",
      text: payload.text,
      sentiment: payload.sentiment ?? "neutral",
      createdAt
    };

    if (payload.targetPlayerId !== undefined) {
      item.targetPlayerId = payload.targetPlayerId;
    }

    return this.appendDanmaku(room, item);
  }

  private appendDanmaku(
    room: RoomSnapshot,
    item: DanmakuItem
  ): { room: RoomSnapshot; item: DanmakuItem } {
    const market = room.market === undefined ? undefined : { ...room.market };
    const players = room.players.map((player) => ({
      ...player,
      position: { ...player.position },
      ...(player.positions === undefined
        ? {}
        : { positions: player.positions.map((position) => ({ ...position })) })
    }));

    if (market !== undefined && item.sentiment === "bullish") {
      market.bullishHeat += 1;
    }

    if (market !== undefined && item.sentiment === "bearish") {
      market.bearishHeat += 1;
    }

    if (item.sentiment === "suspicious" && item.targetPlayerId !== undefined) {
      const targetPlayer = players.find((player) => player.id === item.targetPlayerId);
      if (targetPlayer !== undefined) {
        targetPlayer.suspicion += 1;
      }
    }

    const updatedRoom: RoomSnapshot = {
      ...room,
      players,
      danmaku: [...room.danmaku, item],
      updatedAt: item.createdAt
    };

    if (market !== undefined) {
      updatedRoom.market = market;
    }

    return { room: updatedRoom, item };
  }
}
