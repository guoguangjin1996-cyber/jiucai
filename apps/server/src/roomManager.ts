import {
  type AuctionLevel,
  type AuctionOrder,
  type AuctionSide,
  type DanmakuItem,
  DEFAULT_LIMIT_RATE,
  type ElementSectorState,
  type GameLog,
  type GameRoom,
  type GameRoomType,
  type MarketPhase,
  type QuantStrategy,
  INITIAL_INSTITUTION_CAPITAL,
  INITIAL_RETAIL_CAPITAL,
  INITIAL_CONFIDENCE,
  INITIAL_CONTROL_POINTS,
  INITIAL_FAKE_NEWS,
  calculateQuantAttention,
  applyLimitDownLock,
  createOrderBooksForSectors,
  createMarketSectorsForRoomType,
  buyPosition,
  createEmptyPosition,
  createLimitPrices,
  getRoomPhaseTiming,
  getRoomTypeConfig,
  getRegulationState,
  resolveGameRoomType,
  getOpenStatus,
  rankPlayersByROI,
  resolveChampion,
  resolveAuctionPressure,
  resolveOpenPrice,
  resolveMarketRankings,
  resolveSectorStatusTags,
  resolveStockTags,
  shouldBoardBreak,
  shouldFloorReverse,
  shouldEnterRegulationInquiry,
  updatePositionForNewDay,
  updateRegulationHeat
} from "@jiucai-defense/shared";
import { DanmakuManager } from "./danmakuManager";
import { createId } from "./id";
import type {
  DanmakuSendPayload,
  DanmakuSystemPayload,
  DailyTrendItem,
  FinalSettlement,
  InstitutionIntradayAction,
  IntradayChoice,
  MarketDayResult,
  RoomPlayer,
  RoomSnapshot,
  SanitizedRoomSnapshot,
  SubmitActionPayload,
  VoteRecord,
  VoiceLine
} from "./messages";
import type { DayFlowPhase } from "./dayFlow";

const BOT_NICKNAMES = [
  "涨停哥",
  "割肉王",
  "老韭菜",
  "龙虎榜客",
  "满仓侠",
  "空仓大师",
  "地板哥",
  "反向指标"
] as const;

const VOICE_LINES: Partial<Record<MarketPhase, string>> = {
  AUCTION_FREE: "集合竞价开始，现在看到的热情，五秒后可能全部撤走。",
  AUCTION_LOCKED: "9:20已到，现在后悔，属于无效申报。",
  OPEN_PRICE: "集合竞价结束，今天的第一刀已经落下。",
  REGULATION_INQUIRY: "监管问询开始，请解释一下为什么大家都亏得这么有规律。"
};

const LIMIT_UP_SCORE = 7;
const LIMIT_DOWN_SCORE = -7;
const LIMIT_DOWN_SELL_FAIL_RATE = 0.8;

export class RoomError extends Error {
  constructor(
    public readonly code: string,
    message: string
  ) {
    super(message);
    this.name = "RoomError";
  }
}

export interface PlayerSession {
  roomId: string;
  playerId: string;
}

export interface LeaveResult {
  roomId: string;
  room?: RoomSnapshot;
}

export class RoomManager {
  private readonly rooms = new Map<string, RoomSnapshot>();
  private readonly sessions = new Map<string, PlayerSession>();
  private readonly danmakuManager = new DanmakuManager();

  constructor(private readonly random: () => number = Math.random) {}

  createRoom(
    connectionId: string,
    nickname: string,
    roomType: GameRoomType = "STANDARD_20"
  ): RoomSnapshot {
    this.assertNickname(nickname);
    const resolvedRoomType = resolveGameRoomType(roomType);
    const roomTypeConfig = getRoomTypeConfig(resolvedRoomType);

    if (this.sessions.has(connectionId)) {
      this.leave(connectionId);
    }

    const roomId = createId("room");
    const player = this.createPlayer(nickname, false, true, roomTypeConfig.maxDailyActions);
    const now = Date.now();
    const room: RoomSnapshot = {
      id: roomId,
      status: "lobby",
      roomType: resolvedRoomType,
      roomTypeConfig,
      hostPlayerId: player.id,
      players: [player],
      day: 0,
      maxDays: roomTypeConfig.maxDays,
      phase: "PRE_NEWS",
      submittedPlayerIds: [],
      virtualTime: getRoomPhaseTiming(resolvedRoomType, "PRE_NEWS")?.virtualTime ?? "--:--",
      targetMinutes: roomTypeConfig.targetMinutes,
      maxPositions: roomTypeConfig.maxPositions,
      maxDailyActions: roomTypeConfig.maxDailyActions,
      logs: [],
      voiceLines: [],
      danmaku: [],
      institutionIntradayActions: [],
      regulationVotes: {},
      leaderboardVotes: {},
      dailyVoteRecords: [],
      dailyTrend: [],
      createdAt: now,
      updatedAt: now
    };

    this.rooms.set(room.id, room);
    this.sessions.set(connectionId, {
      roomId: room.id,
      playerId: player.id
    });

    return this.cloneRoom(room);
  }

  joinRoom(connectionId: string, roomId: string, nickname: string): RoomSnapshot {
    this.assertNickname(nickname);

    if (this.sessions.has(connectionId)) {
      this.leave(connectionId);
    }

    const room = this.getRoomOrThrow(roomId);
    this.assertRoomHasSeat(room);

    const player = this.createPlayer(nickname, false, false, room.roomTypeConfig.maxDailyActions);
    const updatedRoom = this.updateRoom(room.id, {
      ...room,
      players: [...room.players, player],
      updatedAt: Date.now()
    });

    this.sessions.set(connectionId, {
      roomId: room.id,
      playerId: player.id
    });

    return this.cloneRoom(updatedRoom);
  }

  leave(connectionId: string): LeaveResult | undefined {
    const session = this.sessions.get(connectionId);
    if (session === undefined) {
      return undefined;
    }

    this.sessions.delete(connectionId);

    const room = this.rooms.get(session.roomId);
    if (room === undefined) {
      return { roomId: session.roomId };
    }

    const remainingPlayers = room.players.filter((player) => player.id !== session.playerId);
    if (remainingPlayers.length === 0) {
      this.rooms.delete(room.id);
      return { roomId: room.id };
    }

    const hostPlayerId =
      room.hostPlayerId === session.playerId ? remainingPlayers[0]?.id : room.hostPlayerId;

    if (hostPlayerId === undefined) {
      this.rooms.delete(room.id);
      return { roomId: room.id };
    }

    const updatedPlayers = remainingPlayers.map((player) => ({
      ...player,
      isHost: player.id === hostPlayerId
    }));

    const updatedRoom = this.updateRoom(room.id, {
      ...room,
      hostPlayerId,
      players: updatedPlayers,
      updatedAt: Date.now()
    });

    return {
      roomId: updatedRoom.id,
      room: this.cloneRoom(updatedRoom)
    };
  }

  addBot(connectionId: string, roomId?: string): RoomSnapshot {
    const room = this.getRoomForAction(connectionId, roomId);
    this.assertRoomHasSeat(room);

    const bot = this.createPlayer(this.nextBotNickname(room), true, false, room.roomTypeConfig.maxDailyActions);
    bot.ready = true;

    const updatedRoom = this.updateRoom(room.id, {
      ...room,
      players: [...room.players, bot],
      updatedAt: Date.now()
    });

    return this.cloneRoom(updatedRoom);
  }

  setReady(connectionId: string, ready: boolean): RoomSnapshot {
    const session = this.sessions.get(connectionId);
    if (session === undefined) {
      throw new RoomError("NOT_IN_ROOM", "当前连接不在任何房间中。");
    }

    const room = this.getRoomOrThrow(session.roomId);
    const updatedPlayers = room.players.map((player) =>
      player.id === session.playerId ? { ...player, ready } : player
    );

    const updatedRoom = this.updateRoom(room.id, {
      ...room,
      players: updatedPlayers,
      updatedAt: Date.now()
    });

    return this.cloneRoom(updatedRoom);
  }

  startGame(connectionId: string, roomId?: string, roomTypeOverride?: GameRoomType): RoomSnapshot {
    const session = this.sessions.get(connectionId);
    if (session === undefined) {
      throw new RoomError("NOT_IN_ROOM", "当前连接不在任何房间中。");
    }

    const room = this.getRoomOrThrow(roomId ?? session.roomId);
    const roomType = resolveGameRoomType(roomTypeOverride ?? room.roomType);
    const roomTypeConfig = getRoomTypeConfig(roomType);
    if (session.playerId !== room.hostPlayerId) {
      throw new RoomError("HOST_ONLY", "只有房主可以开始游戏。");
    }

    if (room.status !== "lobby") {
      throw new RoomError("GAME_ALREADY_STARTED", "游戏已经开始。");
    }

    let players = room.players.map((player) => ({ ...player }));
    while (players.length < roomTypeConfig.maxPlayers) {
      const bot = this.createPlayer(this.nextBotNickname({ ...room, players }), true, false, roomTypeConfig.maxDailyActions);
      bot.ready = true;
      players = [...players, bot];
    }

    const institutionIndexes = new Set<number>();
    let institutionPickAttempts = 0;
    while (institutionIndexes.size < roomTypeConfig.institutionCount && institutionPickAttempts < players.length * 2) {
      institutionIndexes.add(Math.min(Math.floor(this.random() * players.length), players.length - 1));
      institutionPickAttempts += 1;
    }
    for (
      let index = players.length - 1;
      institutionIndexes.size < roomTypeConfig.institutionCount && index >= 0;
      index -= 1
    ) {
      institutionIndexes.add(index);
    }

    const institutionPlayers = Array.from(institutionIndexes)
      .map((index) => players[index])
      .filter((player): player is RoomPlayer => player !== undefined);
    const primaryInstitutionPlayer = institutionPlayers[0];
    if (primaryInstitutionPlayer === undefined) {
      throw new RoomError("ROOM_EMPTY", "房间内没有玩家。");
    }

    const assignedPlayers: RoomPlayer[] = players.map((player, index) => ({
      ...player,
      role: institutionIndexes.has(index) ? "institution" : "retail",
      initialCapital: institutionIndexes.has(index) ? INITIAL_INSTITUTION_CAPITAL : INITIAL_RETAIL_CAPITAL,
      finalCapital: institutionIndexes.has(index) ? INITIAL_INSTITUTION_CAPITAL : INITIAL_RETAIL_CAPITAL,
      capital: institutionIndexes.has(index) ? INITIAL_INSTITUTION_CAPITAL : INITIAL_RETAIL_CAPITAL,
      roi: 0,
      positions: [],
      dailyActionCount: 0,
      maxDailyActionCount: roomTypeConfig.maxDailyActions,
      ready: true
    }));

    const previousClose = 100;
    const { limitUpPrice, limitDownPrice } = createLimitPrices(previousClose, DEFAULT_LIMIT_RATE);
    const sectors = resolveSectorStatusTags(resolveStockTags(createMarketSectorsForRoomType(roomType)));
    const orderBooks = createOrderBooksForSectors(sectors);
    const now = Date.now();
    const updatedRoom = this.updateRoom(room.id, {
      ...room,
      status: "playing",
      roomType,
      roomTypeConfig,
      players: assignedPlayers,
      institution: {
        playerId: primaryInstitutionPlayer.id,
        controlPoints: INITIAL_CONTROL_POINTS,
        fakeNewsCount: INITIAL_FAKE_NEWS,
        exposure: 0,
        harvestScore: 0,
        washScore: 0,
        usedActions: []
      },
      institutions: institutionPlayers.map((player) => ({
        playerId: player.id,
        controlPoints: INITIAL_CONTROL_POINTS,
        fakeNewsCount: INITIAL_FAKE_NEWS,
        personalHarvestScore: 0,
        exposed: false,
        focused: false,
        hiddenDays: 0
      })),
      market: {
        day: 1,
        previousClose,
        openPrice: previousClose,
        currentPrice: previousClose,
        closePrice: previousClose,
        limitRate: DEFAULT_LIMIT_RATE,
        limitUpPrice,
        limitDownPrice,
        isLimitUp: false,
        isLimitDown: false,
        boardStrength: 0,
        boardBreakRisk: 0,
        news: "【虚构娱乐模拟】第 1 天盘前公告：虚构交易房开局，请保卫本金值并观察盘面情绪。",
        auctionPressure: 0,
        bullishHeat: 0,
        bearishHeat: 0,
        regulationHeat: 0,
        regulationState: "normal",
        sectors,
        orderBooks,
        rankings: resolveMarketRankings(sectors),
        quant: {
          enabled: true,
          harvestScore: 0,
          alertLevel: 0,
          cooldown: 0,
          visibility: 0
        }
      },
      day: 1,
      maxDays: roomTypeConfig.maxDays,
      phase: "PRE_NEWS",
      submittedPlayerIds: [],
      virtualTime: getRoomPhaseTiming(roomType, "PRE_NEWS")?.virtualTime ?? "--:--",
      targetMinutes: roomTypeConfig.targetMinutes,
      maxPositions: roomTypeConfig.maxPositions,
      maxDailyActions: roomTypeConfig.maxDailyActions,
      logs: [
        ...room.logs,
        {
          id: createId("log"),
          timestamp: now,
          day: 1,
          phase: "PRE_NEWS",
          type: "game:start",
          message: "第 1 天盘前公告已生成。"
        }
      ],
      voiceLines: room.voiceLines,
      danmaku: room.danmaku,
      institutionIntradayActions: [],
      regulationVotes: {},
      leaderboardVotes: {},
      dailyVoteRecords: room.dailyVoteRecords,
      dailyTrend: room.dailyTrend,
      updatedAt: now
    });

    return this.cloneRoom(updatedRoom);
  }

  transitionPhase(
    roomId: string,
    phase: MarketPhase,
    timing?: { phaseStartedAt: number; phaseEndsAt: number }
  ): RoomSnapshot {
    const room = this.getRoomOrThrow(roomId);
    const now = Date.now();
    const previousDayEnded = room.phase === "DAY_RECAP" || room.phase === "DAY_RESULT";
    const shouldEnterInquiry =
      phase === "PRE_NEWS" &&
      previousDayEnded &&
      room.market !== undefined &&
      shouldEnterRegulationInquiry(room.market.regulationHeat);
    const actualPhase: MarketPhase = shouldEnterInquiry ? "REGULATION_INQUIRY" : phase;
    const nextDay = phase === "PRE_NEWS" && previousDayEnded ? room.day + 1 : room.day;
    const day = nextDay === 0 ? 1 : nextDay;
    const voiceLine = this.createVoiceLineForPhase(actualPhase, day, now);
    const inquiryVoiceLine = shouldEnterInquiry
      ? this.createVoiceLine("盘面太抽象，监管决定让大家冷静一天。", day, actualPhase, now)
      : undefined;
    const players =
      actualPhase === "PRE_NEWS" && previousDayEnded
        ? room.players.map((player) => {
            const { intradayChoice: _intradayChoice, ...playerWithoutChoice } = player;
            return {
              ...playerWithoutChoice,
              position: updatePositionForNewDay(player.position, day),
              positions: player.positions?.map((position) => updatePositionForNewDay(position, day)) ?? [],
              dailyActionCount: 0
            };
          })
        : room.players;
    const nextRoom: RoomSnapshot = {
      ...room,
      players,
      phase: actualPhase,
      day,
      submittedPlayerIds: [],
      virtualTime: getRoomPhaseTiming(room.roomType, actualPhase)?.virtualTime ?? "--:--",
      ...(timing === undefined
        ? {}
        : {
            phaseStartedAt: timing.phaseStartedAt,
            phaseEndsAt: timing.phaseEndsAt
          }),
      regulationVotes: actualPhase === "REGULATION_INQUIRY" ? {} : room.regulationVotes,
      logs: [
        ...room.logs,
        this.createLog({
          timestamp: now,
          day,
          phase: actualPhase,
          type: "game:phaseChanged",
          message: `进入阶段 ${actualPhase}。`
        })
      ],
      voiceLines: [
        ...room.voiceLines,
        ...(inquiryVoiceLine === undefined ? [] : [inquiryVoiceLine]),
        ...(voiceLine === undefined ? [] : [voiceLine])
      ],
      updatedAt: now
    };

    if (!(phase === "PRE_NEWS" && previousDayEnded) && room.dayResult !== undefined) {
      nextRoom.dayResult = room.dayResult;
    }

    const updatedRoom = this.updateRoom(room.id, nextRoom);

    return this.cloneRoom(updatedRoom);
  }

  settlePhase(roomId: string, phase: MarketPhase): RoomSnapshot {
    const room = this.getRoomOrThrow(roomId);
    const now = Date.now();
    const settledRoom =
      phase === "PRE_NEWS"
        ? this.resolvePreNewsForRoom(room)
        : phase === "MUTATION"
          ? this.resolveMutationForRoom(room)
          : phase === "AUCTION_FREE" || phase === "AUCTION_LOCKED"
            ? this.resolveAuctionPreviewForRoom(room, phase)
            : phase === "OPEN_PRICE"
              ? this.resolveOpenPriceForRoom(room)
              : this.isMarketRefreshPhase(phase)
                ? this.resolveMarketRefreshForRoom(room, phase)
                : phase === "CLOSE"
                  ? this.resolveCloseForRoom(room)
                  : phase === "REGULATION_INQUIRY"
                    ? this.resolveRegulationInquiry(room)
                    : phase === "VOTE" || phase === "FOCUS_VOTE"
                      ? this.resolveLeaderboardVote(room)
                      : phase === "DAY_RESULT" || phase === "DAY_RECAP"
                        ? this.resolveGameEnd(room)
                        : room;
    const updatedRoom = this.updateRoom(room.id, {
      ...settledRoom,
      logs: [
        ...settledRoom.logs,
        this.createLog({
          timestamp: now,
          day: settledRoom.day,
          phase,
          type: "system:settlement",
          message: `阶段 ${phase} 结算完成。`
        })
      ],
      updatedAt: now
    });

    return this.cloneRoom(updatedRoom);
  }

  private resolvePreNewsForRoom(room: RoomSnapshot): RoomSnapshot {
    if (room.market === undefined) {
      return room;
    }

    const refreshedSectors = this.refreshMarketSectors(room, "PRE_NEWS");
    const news = this.createDailyNews(room);
    return {
      ...room,
      market: {
        ...room.market,
        news,
        day: room.day,
        previousClose: room.market.closePrice || room.market.currentPrice || room.market.previousClose,
        bullishHeat: Math.max(0, Math.floor(room.market.bullishHeat * 0.3)),
        bearishHeat: Math.max(0, Math.floor(room.market.bearishHeat * 0.3)),
        sectors: refreshedSectors,
        rankings: resolveMarketRankings(refreshedSectors)
      },
      logs: [
        ...room.logs,
        this.createLog({
          timestamp: Date.now(),
          day: room.day,
          phase: "PRE_NEWS",
          type: "market:preNews",
          message: news
        })
      ]
    };
  }

  private resolveMutationForRoom(room: RoomSnapshot): RoomSnapshot {
    if (room.market === undefined) {
      return room;
    }

    const mutation = this.createMutationLine(room);
    const refreshedSectors = this.refreshMarketSectors(room, "MUTATION");
    return {
      ...room,
      market: {
        ...room.market,
        mutation,
        bullishHeat: room.market.bullishHeat + (this.resolveTextBias(mutation) > 0 ? 1 : 0),
        bearishHeat: room.market.bearishHeat + (this.resolveTextBias(mutation) < 0 ? 1 : 0),
        sectors: refreshedSectors,
        rankings: resolveMarketRankings(refreshedSectors)
      },
      logs: [
        ...room.logs,
        this.createLog({
          timestamp: Date.now(),
          day: room.day,
          phase: "MUTATION",
          type: "market:mutation",
          message: mutation
        })
      ]
    };
  }

  private resolveAuctionPreviewForRoom(room: RoomSnapshot, phase: MarketPhase): RoomSnapshot {
    if (room.market === undefined) {
      return room;
    }

    const orders = room.players.flatMap((player) =>
      player.auctionOrder === undefined ? [] : [player.auctionOrder]
    );
    const auctionPressure = resolveAuctionPressure(orders);
    const refreshedSectors = this.refreshMarketSectors(
      {
        ...room,
        market: {
          ...room.market,
          auctionPressure
        }
      },
      phase
    );

    return {
      ...room,
      market: {
        ...room.market,
        auctionPressure,
        sectors: refreshedSectors,
        rankings: resolveMarketRankings(refreshedSectors)
      },
      logs: [
        ...room.logs,
        this.createLog({
          timestamp: Date.now(),
          day: room.day,
          phase,
          type: "market:auctionPreview",
          message: `集合竞价预览压力 ${auctionPressure}。`,
          payload: {
            auctionPressure
          }
        })
      ]
    };
  }

  private resolveMarketRefreshForRoom(room: RoomSnapshot, phase: MarketPhase): RoomSnapshot {
    if (room.market === undefined) {
      return room;
    }

    const refreshedSectors = this.refreshMarketSectors(room, phase);
    const quantTargetId = resolveMarketRankings(refreshedSectors).stockQuantRiskRank[0];
    const quantStrategy = this.resolveQuantStrategy(room, phase);
    const quantAlertLevel = this.resolveQuantAlertLevel(room);
    const boardBreakRisk = this.resolveBoardBreakRisk(room);
    const lastAttackDay =
      quantStrategy === "DRAIN_LIQUIDITY" || quantStrategy === "T_PLUS_ONE_KNIFE"
        ? room.day
        : room.market.quant?.lastAttackDay;

    return {
      ...room,
      market: {
        ...room.market,
        boardBreakRisk,
        sectors: refreshedSectors,
        rankings: resolveMarketRankings(refreshedSectors),
        quant: {
          enabled: room.roomTypeConfig.quantLevel !== "simplified" || phase !== "PRE_NEWS",
          harvestScore: room.market.quant?.harvestScore ?? 0,
          alertLevel: quantAlertLevel,
          ...(quantTargetId === undefined ? {} : { targetStockId: quantTargetId }),
          strategy: quantStrategy,
          cooldown: Math.max(0, (room.market.quant?.cooldown ?? 0) - 1),
          visibility: Math.min(100, (room.market.quant?.visibility ?? 0) + quantAlertLevel * 6),
          ...(lastAttackDay === undefined ? {} : { lastAttackDay })
        }
      },
      logs: [
        ...room.logs,
        this.createLog({
          timestamp: Date.now(),
          day: room.day,
          phase,
          type: "market:refresh",
          message: `${phase} 盘面刷新完成。`,
          payload: {
            quantTargetId,
            quantStrategy,
            quantAlertLevel,
            boardBreakRisk
          }
        })
      ]
    };
  }

  private isMarketRefreshPhase(phase: MarketPhase): boolean {
    return (
      phase === "MORNING_TRADING" ||
      phase === "MIDDAY_ROTATION" ||
      phase === "AFTERNOON_TRADING" ||
      phase === "CLOSING_RUSH"
    );
  }

  recordPlayerAction(connectionId: string, payload: SubmitActionPayload): RoomSnapshot {
    const session = this.sessions.get(connectionId);
    if (session === undefined) {
      throw new RoomError("NOT_IN_ROOM", "当前连接不在任何房间中。");
    }

    if (payload.actionType.trim().length === 0 || payload.action.trim().length === 0) {
      throw new RoomError("INVALID_ACTION", "动作类型和动作内容不能为空。");
    }

    const room = this.getRoomOrThrow(session.roomId);
    const player = room.players.find((candidate) => candidate.id === session.playerId);
    if (player === undefined) {
      throw new RoomError("PLAYER_NOT_FOUND", "玩家不存在。");
    }
    this.assertCanSubmitGameAction(room, player, payload);

    const now = Date.now();
    if (payload.actionType === "auction") {
      return this.markPlayerSubmitted(
        this.recordAuctionAction(room, player, payload, now),
        player.id,
        this.countsAsDailyAction(payload)
      );
    }

    if (payload.actionType === "regulationVote") {
      return this.markPlayerSubmitted(this.recordRegulationVote(room, player, payload, now), player.id);
    }

    if (payload.actionType === "vote" || payload.actionType === "leaderboardVote") {
      return this.markPlayerSubmitted(this.recordLeaderboardVote(room, player, payload, now), player.id);
    }

    if (this.isIntradayAction(payload.action)) {
      return this.markPlayerSubmitted(
        this.recordIntradayAction(room, player, payload.action, now),
        player.id,
        this.countsAsDailyAction(payload)
      );
    }

    const actionPayload: Record<string, string> = {
      playerId: player.id,
      actionType: payload.actionType,
      action: payload.action
    };

    if (payload.targetPlayerId !== undefined) {
      actionPayload.targetPlayerId = payload.targetPlayerId;
    }

    const updatedRoom = this.updateRoom(room.id, {
      ...room,
      logs: [
        ...room.logs,
        this.createLog({
          timestamp: now,
          day: room.day,
          phase: room.phase,
          type: "player:action",
          message: `${player.nickname} 提交动作 ${payload.actionType}:${payload.action}。`,
          payload: actionPayload
        })
      ],
      updatedAt: now
    });

    return this.markPlayerSubmitted(updatedRoom, player.id, this.countsAsDailyAction(payload));
  }

  recordDanmakuSend(connectionId: string, payload: DanmakuSendPayload): RoomSnapshot {
    const session = this.sessions.get(connectionId);
    if (session === undefined) {
      throw new RoomError("NOT_IN_ROOM", "当前连接不在任何房间中。");
    }

    if (payload.text.trim().length === 0) {
      throw new RoomError("INVALID_DANMAKU", "弹幕内容不能为空。");
    }

    const room = this.getRoomOrThrow(session.roomId);
    const player = room.players.find((candidate) => candidate.id === session.playerId);
    if (player === undefined) {
      throw new RoomError("PLAYER_NOT_FOUND", "玩家不存在。");
    }

    const { room: roomWithDanmaku, item } = this.danmakuManager.createPlayerDanmaku(
      room,
      player,
      payload
    );
    return this.commitDanmaku(roomWithDanmaku, item);
  }

  recordSystemDanmaku(connectionId: string, payload: DanmakuSystemPayload): RoomSnapshot {
    const session = this.sessions.get(connectionId);
    if (session === undefined) {
      throw new RoomError("NOT_IN_ROOM", "当前连接不在任何房间中。");
    }

    if (payload.text.trim().length === 0) {
      throw new RoomError("INVALID_DANMAKU", "弹幕内容不能为空。");
    }

    const room = this.getRoomOrThrow(session.roomId);
    const { room: roomWithDanmaku, item } = this.danmakuManager.createSystemDanmaku(
      room,
      payload
    );
    return this.commitDanmaku(roomWithDanmaku, item);
  }

  getRoom(roomId: string): RoomSnapshot | undefined {
    const room = this.rooms.get(roomId);
    return room === undefined ? undefined : this.cloneRoom(room);
  }

  getSession(connectionId: string): PlayerSession | undefined {
    const session = this.sessions.get(connectionId);
    return session === undefined ? undefined : { ...session };
  }

  haveAllAlivePlayersSubmitted(roomId: string): boolean {
    const room = this.getRoomOrThrow(roomId);
    const submitted = new Set(room.submittedPlayerIds);
    const alivePlayers = room.players.filter((player) => player.alive && !player.isBot);
    return alivePlayers.length > 0 && alivePlayers.every((player) => submitted.has(player.id));
  }

  applyTimeoutDefaults(roomId: string, phase: MarketPhase): RoomSnapshot {
    const room = this.getRoomOrThrow(roomId);
    const submitted = new Set(room.submittedPlayerIds);
    const now = Date.now();
    const logs = [...room.logs];
    const players = room.players.map((player) => {
      if (!player.alive || submitted.has(player.id)) {
        return player;
      }

      const defaultAction = this.resolveDefaultAction(player, phase);
      logs.push(
        this.createLog({
          timestamp: now,
          day: room.day,
          phase,
          type: "player:defaultAction",
          message: `${player.nickname} 超时，系统执行默认动作：${defaultAction}。`,
          payload: {
            playerId: player.id,
            action: defaultAction
          }
        })
      );

      if (phase === "MORNING_TRADING" || phase === "AFTERNOON_TRADING" || phase === "CLOSING_RUSH") {
        return player.role === "retail" ? { ...player, intradayChoice: "PLAY_DEAD" as const } : player;
      }

      return player;
    });
    const updatedRoom = this.updateRoom(room.id, {
      ...room,
      players,
      submittedPlayerIds: room.players.filter((player) => player.alive).map((player) => player.id),
      logs,
      updatedAt: now
    });

    return this.cloneRoom(updatedRoom);
  }

  getConnectionIdsForRoom(roomId: string): string[] {
    return Array.from(this.sessions.entries())
      .filter(([, session]) => session.roomId === roomId)
      .map(([connectionId]) => connectionId);
  }

  sanitizeRoomForPlayer(room: RoomSnapshot, playerId: string): SanitizedRoomSnapshot {
    const viewer = room.players.find((player) => player.id === playerId);
    const sanitizedRoom: SanitizedRoomSnapshot = {
      id: room.id,
      status: room.status,
      roomType: room.roomType,
      roomTypeConfig: room.roomTypeConfig,
      hostPlayerId: room.hostPlayerId,
      players: room.players.map((player) => {
        const { role: _role, ...basePlayer } = player;
        const sanitizedPlayer = { ...basePlayer };

        if (player.id === playerId) {
          return {
            ...sanitizedPlayer,
            role: player.role
          };
        }

        return sanitizedPlayer;
      }),
      day: room.day,
      maxDays: room.maxDays,
      phase: room.phase,
      submittedPlayerIds: [...room.submittedPlayerIds],
      virtualTime: room.virtualTime ?? "--:--",
      targetMinutes: room.targetMinutes ?? room.roomTypeConfig.targetMinutes,
      maxPositions: room.maxPositions ?? room.roomTypeConfig.maxPositions,
      maxDailyActions: room.maxDailyActions ?? room.roomTypeConfig.maxDailyActions,
      ...(room.phaseStartedAt === undefined ? {} : { phaseStartedAt: room.phaseStartedAt }),
      ...(room.phaseEndsAt === undefined ? {} : { phaseEndsAt: room.phaseEndsAt }),
      logs: room.logs.map((log) => ({ ...log })),
      voiceLines: room.voiceLines.map((voiceLine) => ({ ...voiceLine })),
      danmaku: room.danmaku.map((item) => ({ ...item })),
      institutionIntradayActions: [...room.institutionIntradayActions],
      regulationVotes: { ...room.regulationVotes },
      leaderboardVotes: { ...room.leaderboardVotes },
      dailyVoteRecords: room.dailyVoteRecords.map((record) => ({ ...record })),
      dailyTrend: room.dailyTrend.map((item) => ({ ...item })),
      createdAt: room.createdAt,
      updatedAt: room.updatedAt
    };

    if (room.market !== undefined) {
      sanitizedRoom.market = { ...room.market };
    }

    if (viewer?.role === "institution" && room.institution !== undefined) {
      sanitizedRoom.institutionState = {
        ...room.institution,
        usedActions: [...room.institution.usedActions]
      };
    }

    if (room.status === "finished" && room.finalSettlement !== undefined) {
      sanitizedRoom.finalSettlement = this.cloneFinalSettlement(room.finalSettlement);
    }

    return sanitizedRoom;
  }

  private getRoomForAction(connectionId: string, roomId?: string): RoomSnapshot {
    const targetRoomId = roomId ?? this.sessions.get(connectionId)?.roomId;
    if (targetRoomId === undefined) {
      throw new RoomError("ROOM_ID_REQUIRED", "需要提供 roomId 或先加入房间。");
    }

    return this.getRoomOrThrow(targetRoomId);
  }

  private getRoomOrThrow(roomId: string): RoomSnapshot {
    const room = this.rooms.get(roomId);
    if (room === undefined) {
      throw new RoomError("ROOM_NOT_FOUND", "房间不存在。");
    }

    return room;
  }

  private updateRoom(roomId: string, room: RoomSnapshot): RoomSnapshot {
    this.rooms.set(roomId, room);
    return room;
  }

  private markPlayerSubmitted(
    room: RoomSnapshot,
    playerId: string,
    countDailyAction = false
  ): RoomSnapshot {
    const shouldCountDailyAction =
      countDailyAction && !room.submittedPlayerIds.includes(playerId);
    if (room.submittedPlayerIds.includes(playerId)) {
      return this.cloneRoom(room);
    }

    const updatedRoom = this.updateRoom(room.id, {
      ...room,
      players: shouldCountDailyAction
        ? room.players.map((player) =>
            player.id === playerId
              ? { ...player, dailyActionCount: (player.dailyActionCount ?? 0) + 1 }
              : player
          )
        : room.players,
      submittedPlayerIds: [...room.submittedPlayerIds, playerId],
      updatedAt: Date.now()
    });

    return this.cloneRoom(updatedRoom);
  }

  private assertCanSubmitGameAction(
    room: RoomSnapshot,
    player: RoomPlayer,
    payload: SubmitActionPayload
  ): void {
    if (!player.alive) {
      throw new RoomError("PLAYER_ELIMINATED", "出局玩家不能继续提交动作。");
    }

    if (!this.countsAsDailyAction(payload)) {
      return;
    }

    const currentCount = player.dailyActionCount ?? 0;
    const maxCount = player.maxDailyActionCount ?? room.roomTypeConfig.maxDailyActions;
    if (!room.submittedPlayerIds.includes(player.id) && currentCount >= maxCount) {
      throw new RoomError("DAILY_ACTION_LIMIT", "今日主动操作次数已用完。");
    }

    if (
      player.role === "retail" &&
      payload.action === "TAKE_OFF" &&
      this.getOpenPositions(player).length >= room.roomTypeConfig.maxPositions
    ) {
      throw new RoomError("POSITION_LIMIT", "持仓已满，只能跑路或格局。");
    }
  }

  private countsAsDailyAction(payload: SubmitActionPayload): boolean {
    return payload.actionType === "auction" || this.isIntradayAction(payload.action);
  }

  private getOpenPositions(player: RoomPlayer): NonNullable<RoomPlayer["positions"]> {
    const positions = (player.positions ?? []).filter((position) => position.hasPosition);
    if (!player.position.hasPosition) {
      return positions;
    }

    const hasLegacyPosition = positions.some(
      (position) =>
        position.stockId !== undefined &&
        position.stockId === player.position.stockId &&
        position.buyDay === player.position.buyDay
    );
    return hasLegacyPosition ? positions : [player.position, ...positions];
  }

  private resolveDefaultAction(player: RoomPlayer, phase: MarketPhase): string {
    if (player.role === "institution") {
      if (phase === "INSTITUTION_PRIVATE_ROOM") return "无联合策略";
      if (phase === "REGULATION_INQUIRY") return "装无辜";
      return "不操作";
    }

    if (phase === "AUCTION_FREE" || phase === "AUCTION_LOCKED") return "平开";
    if (phase === "MORNING_TRADING" || phase === "AFTERNOON_TRADING") return "装死";
    if (phase === "CLOSING_RUSH") return player.position.hasPosition ? "格局" : "观望";
    if (phase === "FOCUS_VOTE") return "弃权";
    return "观望";
  }

  private assertRoomHasSeat(room: RoomSnapshot): void {
    if (room.players.length >= room.roomTypeConfig.maxPlayers) {
      throw new RoomError("ROOM_FULL", "房间人数已满。");
    }
  }

  private assertNickname(nickname: string): void {
    if (nickname.trim().length === 0) {
      throw new RoomError("INVALID_NICKNAME", "昵称不能为空。");
    }
  }

  private createPlayer(
    nickname: string,
    isBot: boolean,
    isHost: boolean,
    maxDailyActionCount = getRoomTypeConfig("STANDARD_20").maxDailyActions
  ): RoomPlayer {
    return {
      id: createId(isBot ? "bot" : "player"),
      nickname: nickname.trim(),
      isBot,
      role: "retail",
      alive: true,
      initialCapital: INITIAL_RETAIL_CAPITAL,
      finalCapital: INITIAL_RETAIL_CAPITAL,
      capital: INITIAL_RETAIL_CAPITAL,
      roi: 0,
      confidence: INITIAL_CONFIDENCE,
      score: 0,
      position: createEmptyPosition(),
      positions: [],
      dailyActionCount: 0,
      maxDailyActionCount,
      suspicion: 0,
      votedToday: false,
      isHost,
      ready: false,
      titles: []
    };
  }

  private createLog(log: Omit<GameLog, "id">): GameLog {
    return {
      id: createId("log"),
      ...log
    };
  }

  private createVoiceLineForPhase(
    phase: MarketPhase,
    day: number,
    createdAt: number
  ): VoiceLine | undefined {
    const text = VOICE_LINES[phase];
    if (text === undefined) {
      return undefined;
    }

    return {
      id: createId("voice"),
      day,
      phase,
      text,
      createdAt
    };
  }

  private createVoiceLine(
    text: string,
    day: number,
    phase: VoiceLine["phase"],
    createdAt: number
  ): VoiceLine {
    return {
      id: createId("voice"),
      day,
      phase,
      text,
      createdAt
    };
  }

  private commitDanmaku(room: RoomSnapshot, item: DanmakuItem): RoomSnapshot {
    const updatedRoom = this.updateRoom(room.id, {
      ...room,
      logs: [
        ...room.logs,
        this.createLog({
          timestamp: item.createdAt,
          day: room.day,
          phase: room.phase,
          type: "danmaku:send",
          message: item.text,
          payload: item
        })
      ],
      updatedAt: item.createdAt
    });

    return this.cloneRoom(updatedRoom);
  }

  private recordRegulationVote(
    room: RoomSnapshot,
    player: RoomPlayer,
    payload: SubmitActionPayload,
    timestamp: number
  ): RoomSnapshot {
    if (room.phase !== "REGULATION_INQUIRY") {
      throw new RoomError("INVALID_PHASE", "当前阶段不能提交监管问询投票。");
    }

    if (payload.targetPlayerId === undefined) {
      throw new RoomError("TARGET_REQUIRED", "监管问询投票需要 targetPlayerId。");
    }

    const targetPlayer = room.players.find((candidate) => candidate.id === payload.targetPlayerId);
    if (targetPlayer === undefined) {
      throw new RoomError("PLAYER_NOT_FOUND", "被投票玩家不存在。");
    }

    const updatedRoom = this.updateRoom(room.id, {
      ...room,
      regulationVotes: {
        ...room.regulationVotes,
        [player.id]: targetPlayer.id
      },
      logs: [
        ...room.logs,
        this.createLog({
          timestamp,
          day: room.day,
          phase: room.phase,
          type: "regulation:vote",
          message: `${player.nickname} 提交监管问询投票。`,
          payload: {
            voterPlayerId: player.id,
            targetPlayerId: targetPlayer.id
          }
        })
      ],
      updatedAt: timestamp
    });

    return this.cloneRoom(updatedRoom);
  }

  private recordLeaderboardVote(
    room: RoomSnapshot,
    player: RoomPlayer,
    payload: SubmitActionPayload,
    timestamp: number
  ): RoomSnapshot {
    if (room.phase !== "VOTE" && room.phase !== "FOCUS_VOTE") {
      throw new RoomError("INVALID_PHASE", "当前阶段不能提交龙虎榜投票。");
    }

    if (!player.alive) {
      throw new RoomError("PLAYER_ELIMINATED", "出局玩家不能投票。");
    }

    if (payload.targetPlayerId === undefined) {
      throw new RoomError("TARGET_REQUIRED", "龙虎榜投票需要 targetPlayerId。");
    }

    const targetPlayer = room.players.find((candidate) => candidate.id === payload.targetPlayerId);
    if (targetPlayer === undefined) {
      throw new RoomError("PLAYER_NOT_FOUND", "被投票玩家不存在。");
    }

    const updatedRoom = this.updateRoom(room.id, {
      ...room,
      leaderboardVotes: {
        ...room.leaderboardVotes,
        [player.id]: targetPlayer.id
      },
      logs: [
        ...room.logs,
        this.createLog({
          timestamp,
          day: room.day,
          phase: room.phase,
          type: "vote:submit",
          message: `${player.nickname} 提交龙虎榜投票。`,
          payload: {
            voterPlayerId: player.id,
            targetPlayerId: targetPlayer.id
          }
        })
      ],
      updatedAt: timestamp
    });

    return this.cloneRoom(updatedRoom);
  }

  private isIntradayAction(action: string): action is IntradayChoice | InstitutionIntradayAction {
    return (
      action === "TAKE_OFF" ||
      action === "BURY" ||
      action === "PLAY_DEAD" ||
      action === "RUN_AWAY" ||
      action === "HOLD" ||
      action === "DRAW_PIE" ||
      action === "SCARE" ||
      action === "IGNITE" ||
      action === "SMASH" ||
      action === "SHAKE_OUT" ||
      action === "SHIP" ||
      action === "PRY_FLOOR"
    );
  }

  private recordIntradayAction(
    room: RoomSnapshot,
    player: RoomPlayer,
    action: IntradayChoice | InstitutionIntradayAction,
    timestamp: number
  ): RoomSnapshot {
    if (
      room.phase !== "CONTINUOUS_TRADING" &&
      room.phase !== "MORNING_TRADING" &&
      room.phase !== "AFTERNOON_TRADING" &&
      room.phase !== "CLOSING_RUSH"
    ) {
      throw new RoomError("INVALID_PHASE", "当前阶段不能提交盘中动作。");
    }

    if (player.role === "retail") {
      if (!this.isRetailIntradayChoice(action)) {
        throw new RoomError("INVALID_INTRADAY_ACTION", "散户不能提交该盘中动作。");
      }

      if (action === "RUN_AWAY") {
        return this.recordRunAwayAction(room, player, timestamp);
      }

      const updatedPlayers = room.players.map((candidate) =>
        candidate.id === player.id ? { ...candidate, intradayChoice: action } : candidate
      );
      return this.commitIntradayRoom(room, updatedPlayers, room.market, room.institutionIntradayActions, {
        timestamp,
        player,
        action
      });
    }

    if (!this.isInstitutionIntradayAction(action)) {
      throw new RoomError("INVALID_INTRADAY_ACTION", "主力不能提交该盘中动作。");
    }

    const updatedMarket =
      room.market === undefined ? undefined : this.applyInstitutionMarketEffect(room.market, action);
    const updatedActions = [...room.institutionIntradayActions, action];

    return this.commitIntradayRoom(room, room.players, updatedMarket, updatedActions, {
      timestamp,
      player,
      action
    });
  }

  private isRetailIntradayChoice(action: string): action is IntradayChoice {
    return (
      action === "TAKE_OFF" ||
      action === "BURY" ||
      action === "PLAY_DEAD" ||
      action === "RUN_AWAY" ||
      action === "HOLD"
    );
  }

  private isInstitutionIntradayAction(action: string): action is InstitutionIntradayAction {
    return (
      action === "DRAW_PIE" ||
      action === "SCARE" ||
      action === "IGNITE" ||
      action === "SMASH" ||
      action === "SHAKE_OUT" ||
      action === "SHIP" ||
      action === "PRY_FLOOR"
    );
  }

  private applyInstitutionMarketEffect(
    market: NonNullable<RoomSnapshot["market"]>,
    action: InstitutionIntradayAction
  ): NonNullable<RoomSnapshot["market"]> {
    if (action === "DRAW_PIE") {
      return { ...market, bullishHeat: market.bullishHeat + 2 };
    }

    if (action === "SCARE") {
      return { ...market, bearishHeat: market.bearishHeat + 2 };
    }

    return { ...market };
  }

  private recordRunAwayAction(
    room: RoomSnapshot,
    player: RoomPlayer,
    timestamp: number
  ): RoomSnapshot {
    if (!player.position.hasPosition) {
      throw new RoomError("POSITION_NOT_SELLABLE", "当前没有可卖持仓，不能跑路。");
    }

    if (!player.position.sellable) {
      const updatedPlayer = this.addTitle(player, "T+1锁魂人");
      const updatedRoom = this.updatePlayerWithLog(room, updatedPlayer, {
        timestamp,
        type: "position:t1Locked",
        message: "你想跑，但T+1说：明天再说。",
        payload: {
          playerId: player.id,
          lockedReason: player.position.lockedReason ?? "T+1"
        }
      });
      return this.cloneRoom({
        ...updatedRoom,
        voiceLines: [
          ...updatedRoom.voiceLines,
          this.createVoiceLine("你想跑，但T+1说：明天再说。", updatedRoom.day, updatedRoom.phase, timestamp)
        ]
      });
    }

    if (room.market?.isLimitDown === true) {
      const failed = this.random() < LIMIT_DOWN_SELL_FAIL_RATE;
      const lockedPlayer = this.addTitle(
        {
          ...player,
          intradayChoice: "RUN_AWAY",
          position: applyLimitDownLock(player.position)
        },
        "跌停排队员"
      );
      const updatedRoom = this.updatePlayerWithLog(room, lockedPlayer, {
        timestamp,
        type: failed ? "position:limitDownSellFailed" : "position:limitDownSellQueued",
        message: failed ? "跌停了，门在那边，但现在打不开。" : "跌停排队成功，卖出仍在等待成交。",
        payload: {
          playerId: player.id,
          failed,
          lockedReason: "limit_down"
        }
      });
      return this.cloneRoom({
        ...updatedRoom,
        voiceLines: [
          ...updatedRoom.voiceLines,
          this.createVoiceLine("跌停了，门在那边，但现在打不开。", updatedRoom.day, updatedRoom.phase, timestamp)
        ]
      });
    }

    const soldPlayer: RoomPlayer = {
      ...player,
      intradayChoice: "RUN_AWAY",
      position: createEmptyPosition()
    };

    return this.updatePlayerWithLog(room, soldPlayer, {
      timestamp,
      type: "position:sold",
      message: `${player.nickname} 成功跑路。`,
      payload: {
        playerId: player.id
      }
    });
  }

  private updatePlayerWithLog(
    room: RoomSnapshot,
    player: RoomPlayer,
    log: {
      timestamp: number;
      type: string;
      message: string;
      payload?: unknown;
    }
  ): RoomSnapshot {
    const gameLog = this.createLog({
      timestamp: log.timestamp,
      day: room.day,
      phase: room.phase,
      type: log.type,
      message: log.message,
      ...(log.payload === undefined ? {} : { payload: log.payload })
    });
    const updatedRoom = this.updateRoom(room.id, {
      ...room,
      players: room.players.map((candidate) => (candidate.id === player.id ? player : candidate)),
      logs: [...room.logs, gameLog],
      updatedAt: log.timestamp
    });

    return this.cloneRoom(updatedRoom);
  }

  private commitIntradayRoom(
    room: RoomSnapshot,
    players: RoomPlayer[],
    market: RoomSnapshot["market"],
    institutionIntradayActions: InstitutionIntradayAction[],
    logInput: {
      timestamp: number;
      player: RoomPlayer;
      action: string;
    }
  ): RoomSnapshot {
    const updatedRoom = this.updateRoom(room.id, {
      ...room,
      players,
      ...(market === undefined ? {} : { market }),
      institutionIntradayActions,
      logs: [
        ...room.logs,
        this.createLog({
          timestamp: logInput.timestamp,
          day: room.day,
          phase: room.phase,
          type: "player:action",
          message: `${logInput.player.nickname} 提交盘中动作 ${logInput.action}。`,
          payload: {
            playerId: logInput.player.id,
            actionType: "intraday",
            action: logInput.action
          }
        })
      ],
      updatedAt: logInput.timestamp
    });

    return this.cloneRoom(updatedRoom);
  }

  private recordAuctionAction(
    room: RoomSnapshot,
    player: RoomPlayer,
    payload: SubmitActionPayload,
    timestamp: number
  ): RoomSnapshot {
    if (room.phase !== "AUCTION_FREE" && room.phase !== "AUCTION_LOCKED") {
      throw new RoomError("INVALID_PHASE", "当前阶段不能提交集合竞价动作。");
    }

    if (payload.action === "CANCEL_AUCTION_ORDER") {
      return this.cancelAuctionOrder(room, player, timestamp);
    }

    const order = this.createAuctionOrder(player, payload.action, room.phase, timestamp);
    const updatedPlayers = room.players.map((candidate) =>
      candidate.id === player.id ? { ...candidate, auctionOrder: order } : candidate
    );
    const updatedRoom = this.updateRoom(room.id, {
      ...room,
      players: updatedPlayers,
      logs: [
        ...room.logs,
        this.createLog({
          timestamp,
          day: room.day,
          phase: room.phase,
          type: "player:action",
          message: `${player.nickname} 提交集合竞价动作 ${payload.action}。`,
          payload: {
            playerId: player.id,
            actionType: payload.actionType,
            action: payload.action,
            order
          }
        })
      ],
      updatedAt: timestamp
    });

    return this.cloneRoom(updatedRoom);
  }

  private cancelAuctionOrder(
    room: RoomSnapshot,
    player: RoomPlayer,
    timestamp: number
  ): RoomSnapshot {
    const currentOrder = player.auctionOrder;
    if (currentOrder === undefined || currentOrder.cancelled) {
      throw new RoomError("NO_AUCTION_ORDER", "当前没有可撤销的集合竞价订单。");
    }

    if (room.phase !== "AUCTION_FREE" || !currentOrder.cancellable) {
      throw new RoomError("AUCTION_LOCKED", "9:20已到，现在后悔，属于无效申报。");
    }

    const cancelledOrder: AuctionOrder = {
      ...currentOrder,
      cancelled: true
    };
    const titledPlayer = this.addTitle(
      {
        ...player,
        auctionOrder: cancelledOrder
      },
      "9:19撤单怪"
    );
    const updatedPlayers = room.players.map((candidate) =>
      candidate.id === player.id ? titledPlayer : candidate
    );
    const cancelledFakeOrder = currentOrder.isFake === true;
    const updatedMarket =
      cancelledFakeOrder && room.market !== undefined
        ? {
            ...room.market,
            regulationHeat: updateRegulationHeat(room.market.regulationHeat, [
              "FAKE_ORDER_CANCELLED"
            ]),
            regulationState: getRegulationState(
              updateRegulationHeat(room.market.regulationHeat, ["FAKE_ORDER_CANCELLED"])
            )
          }
        : room.market;
    const logs: GameLog[] = [
      ...room.logs,
      this.createLog({
        timestamp,
        day: room.day,
        phase: room.phase,
        type: "player:action",
        message: `${player.nickname} 撤销集合竞价订单。`,
        payload: {
          playerId: player.id,
          actionType: "auction",
          action: "CANCEL_AUCTION_ORDER",
          order: cancelledOrder
        }
      })
    ];

    if (cancelledFakeOrder) {
      logs.push(
        this.createLog({
          timestamp,
          day: room.day,
          phase: room.phase,
          type: "regulation:event",
          message: "FAKE_ORDER_CANCELLED",
          payload: {
            playerId: player.id,
            event: "FAKE_ORDER_CANCELLED"
          }
        })
      );
    }

    const updatedRoom = this.updateRoom(room.id, {
      ...room,
      players: updatedPlayers,
      ...(updatedMarket === undefined ? {} : { market: updatedMarket }),
      logs,
      updatedAt: timestamp
    });

    return this.cloneRoom(updatedRoom);
  }

  private createAuctionOrder(
    player: RoomPlayer,
    action: string,
    phase: DayFlowPhase,
    timestamp: number
  ): AuctionOrder {
    const orderShape = this.resolveAuctionOrderShape(player, action);
    const order: AuctionOrder = {
      playerId: player.id,
      side: orderShape.side,
      level: orderShape.level,
      cancellable: phase === "AUCTION_FREE",
      cancelled: false
    };

    if (phase === "AUCTION_LOCKED") {
      order.lockedAt = timestamp;
    }

    if (orderShape.isFake !== undefined) {
      order.isFake = orderShape.isFake;
    }

    return order;
  }

  private resolveAuctionOrderShape(
    player: RoomPlayer,
    action: string
  ): { side: AuctionSide; level: AuctionLevel; isFake?: boolean } {
    if (player.role === "retail") {
      if (action === "TOP_LIMIT_BUY") {
        return { side: "buy", level: "limit" };
      }
      if (action === "HIGH_OPEN_BUY") {
        return { side: "buy", level: "aggressive" };
      }
      if (action === "FLAT") {
        return { side: "neutral", level: "normal" };
      }
      if (action === "LIMIT_SELL") {
        return { side: "sell", level: "limit" };
      }
    }

    if (player.role === "institution") {
      if (action === "FAKE_LIMIT_BUY") {
        return { side: "buy", level: "limit", isFake: true };
      }
      if (action === "FAKE_LIMIT_SELL") {
        return { side: "sell", level: "limit", isFake: true };
      }
      if (action === "REAL_LIMIT_BUY") {
        return { side: "buy", level: "limit", isFake: false };
      }
      if (action === "REAL_LIMIT_SELL") {
        return { side: "sell", level: "limit", isFake: false };
      }
    }

    throw new RoomError("INVALID_AUCTION_ACTION", "无效的集合竞价动作。");
  }

  private resolveOpenPriceForRoom(room: RoomSnapshot): RoomSnapshot {
    if (room.market === undefined) {
      return room;
    }

    const orders = room.players.flatMap((player) =>
      player.auctionOrder === undefined ? [] : [player.auctionOrder]
    );
    const auctionPressure = resolveAuctionPressure(orders);
    const openPrice = resolveOpenPrice(
      room.market.previousClose,
      auctionPressure,
      room.market.limitRate
    );
    const openStatus = getOpenStatus(
      openPrice,
      room.market.previousClose,
      room.market.limitRate
    );
    const regulationEvents =
      openStatus === "LIMIT_UP_OPEN"
        ? ["LIMIT_UP_OPEN" as const]
        : openStatus === "LIMIT_DOWN_OPEN"
          ? ["LIMIT_DOWN_OPEN" as const]
          : [];
    const regulationHeat =
      regulationEvents.length === 0
        ? room.market.regulationHeat
        : updateRegulationHeat(room.market.regulationHeat, regulationEvents);

    return {
      ...room,
      market: {
        ...room.market,
        auctionPressure,
        openPrice,
        currentPrice: openPrice,
        isLimitUp: openStatus === "LIMIT_UP_OPEN",
        isLimitDown: openStatus === "LIMIT_DOWN_OPEN",
        regulationHeat,
        regulationState: getRegulationState(regulationHeat)
      },
      logs: [
        ...room.logs,
        this.createLog({
          timestamp: Date.now(),
          day: room.day,
          phase: "OPEN_PRICE",
          type: "market:openPrice",
          message: `集合竞价结束，开盘价 ${openPrice}，状态 ${openStatus}。`,
          payload: {
            auctionPressure,
            openPrice,
            openStatus
          }
        })
      ]
    };
  }

  private resolveCloseForRoom(room: RoomSnapshot): RoomSnapshot {
    if (room.market === undefined) {
      return room;
    }

    const marketResolution = this.resolveMarketDayResult(room);
    const result = marketResolution.result;
    const tradeStock = this.pickTradeStock(room);
    const settledPlayers = room.players.map((player) =>
      this.settlePlayerByResult(
        player,
        result,
        room.day,
        room.market?.currentPrice ?? 100,
        room.roomTypeConfig.maxPositions,
        tradeStock
      )
    );
    const closePrice = this.resolveClosePrice(room.market.currentPrice, result);
    const voiceLine = this.createResultVoiceLine(result, room.day);
    const regulationHeat = this.updateRegulationHeatForDayResult(room, result);
    const refreshedSectors =
      room.market.sectors === undefined
        ? undefined
        : resolveSectorStatusTags(resolveStockTags(room.market.sectors));

    return {
      ...room,
      players: settledPlayers,
      market: {
        ...room.market,
        isLimitUp: marketResolution.isLimitUp,
        isLimitDown: marketResolution.isLimitDown,
        boardStrength: marketResolution.boardStrength,
        regulationHeat,
        regulationState: getRegulationState(regulationHeat),
        closePrice,
        currentPrice: closePrice,
        ...(refreshedSectors === undefined
          ? {}
          : {
              sectors: refreshedSectors,
              rankings: resolveMarketRankings(refreshedSectors)
            })
      },
      dayResult: result,
      dailyTrend: [
        ...room.dailyTrend,
        {
          day: room.day,
          result,
          closePrice,
          regulationHeat
        }
      ],
      voiceLines: voiceLine === undefined ? room.voiceLines : [...room.voiceLines, voiceLine],
      logs: [
        ...room.logs,
        this.createLog({
          timestamp: Date.now(),
          day: room.day,
          phase: "CLOSE",
          type: "market:dayResult",
          message: `收盘结算完成，当日结果 ${result}。`,
          payload: {
            result,
            marketScore: marketResolution.marketScore,
            boardStrength: marketResolution.boardStrength,
            regulationHeat,
            closePrice
          }
        })
      ]
    };
  }

  private resolveRegulationInquiry(room: RoomSnapshot): RoomSnapshot {
    if (room.market === undefined || room.institution === undefined) {
      return room;
    }

    const institutionPlayerIds = new Set(
      room.players.filter((player) => player.role === "institution").map((player) => player.id)
    );
    const votes = Object.entries(room.regulationVotes);
    const hitVotes = votes.filter(([, targetPlayerId]) => institutionPlayerIds.has(targetPlayerId));
    const now = Date.now();

    if (hitVotes.length > 0) {
      const heat = Math.max(0, room.market.regulationHeat - 4);
      return {
        ...room,
        players: room.players.map((player) =>
          player.role === "retail" && player.alive
            ? { ...player, confidence: Math.min(player.confidence + 1, INITIAL_CONFIDENCE) }
            : player
        ),
        institution: {
          ...room.institution,
          controlPoints: Math.max(0, room.institution.controlPoints - 1),
          fakeNewsCount: 0,
          usedActions: [...room.institution.usedActions]
        },
        ...(room.institutions === undefined
          ? {}
          : {
              institutions: room.institutions.map((institution) =>
                institutionPlayerIds.has(institution.playerId)
                  ? {
                      ...institution,
                      controlPoints: Math.max(0, institution.controlPoints - 1),
                      fakeNewsCount: 0,
                      focused: true
                    }
                  : institution
              )
            }),
        market: {
          ...room.market,
          regulationHeat: heat,
          regulationState: getRegulationState(heat)
        },
        regulationVotes: {},
        logs: [
          ...room.logs,
          this.createLog({
            timestamp: now,
            day: room.day,
            phase: "REGULATION_INQUIRY",
            type: "regulation:hit",
            message: "监管问询命中主力，次日控盘资源受限。",
            payload: {
              hitVotes: hitVotes.length,
              controlPoints: Math.max(0, room.institution.controlPoints - 1),
              regulationHeat: heat
            }
          })
        ],
        updatedAt: now
      };
    }

    if (votes.length > 0) {
      const wrongTargetId = this.pickTopVotedPlayerId(votes);
      const wrongVoterIds = new Set(votes.map(([voterPlayerId]) => voterPlayerId));
      const heat = Math.max(0, room.market.regulationHeat - 2);

      return {
        ...room,
        players: room.players.map((player) => {
          const confidencePenalty =
            player.id === wrongTargetId || wrongVoterIds.has(player.id) ? 1 : 0;
          return confidencePenalty === 0
            ? player
            : { ...player, confidence: Math.max(player.confidence - confidencePenalty, 0) };
        }),
        institution: {
          ...room.institution,
          harvestScore: room.institution.harvestScore + 15,
          usedActions: [...room.institution.usedActions]
        },
        market: {
          ...room.market,
          regulationHeat: heat,
          regulationState: getRegulationState(heat)
        },
        regulationVotes: {},
        logs: [
          ...room.logs,
          this.createLog({
            timestamp: now,
            day: room.day,
            phase: "REGULATION_INQUIRY",
            type: "regulation:miss",
            message: "监管问询投错，主力完成一次收割。",
            payload: {
              wrongTargetId,
              harvestScore: room.institution.harvestScore + 15,
              regulationHeat: heat
            }
          })
        ],
        updatedAt: now
      };
    }

    const heat = Math.max(0, room.market.regulationHeat - 2);
    return {
      ...room,
      institution: {
        ...room.institution,
        washScore: room.institution.washScore + 1,
        usedActions: [...room.institution.usedActions, "REGULATION_WHITEWASH"]
      },
      market: {
        ...room.market,
        regulationHeat: heat,
        regulationState: getRegulationState(heat)
      },
      regulationVotes: {},
      logs: [
        ...room.logs,
        this.createLog({
          timestamp: now,
          day: room.day,
          phase: "REGULATION_INQUIRY",
          type: "regulation:whitewash",
          message: "主力获得监管洗白，下一日主力操作效果 +1。",
          payload: {
            washScore: room.institution.washScore + 1,
            regulationHeat: heat
          }
        })
      ],
      updatedAt: now
    };
  }

  private resolveLeaderboardVote(room: RoomSnapshot): RoomSnapshot {
    if (room.institution === undefined) {
      return room;
    }

    const votes = Object.entries(room.leaderboardVotes);
    if (votes.length === 0) {
      return {
        ...room,
        logs: [
          ...room.logs,
          this.createLog({
            timestamp: Date.now(),
            day: room.day,
            phase: "VOTE",
            type: "vote:empty",
            message: "龙虎榜无人投票。"
          })
        ]
      };
    }

    const topCandidateIds = this.pickTopVotedPlayerIds(votes);
    const institutionPlayerIds = new Set(
      room.players.filter((player) => player.role === "institution").map((player) => player.id)
    );
    const voteRecords: VoteRecord[] = votes.map(([voterPlayerId, targetPlayerId]) => ({
      day: room.day,
      voterPlayerId,
      targetPlayerId,
      hitInstitution: institutionPlayerIds.has(targetPlayerId)
    }));
    const now = Date.now();

    if (topCandidateIds.length > 1) {
      const tiedCandidates = new Set(topCandidateIds);
      return {
        ...room,
        players: room.players.map((player) =>
          tiedCandidates.has(player.id)
            ? { ...player, suspicion: player.suspicion + 1 }
            : player
        ),
        dailyVoteRecords: [...room.dailyVoteRecords, ...voteRecords],
        leaderboardVotes: {},
        logs: [
          ...room.logs,
          this.createLog({
            timestamp: now,
            day: room.day,
            phase: "VOTE",
            type: "vote:tied",
            message: "龙虎榜投票平票，最高票候选人怀疑值上升。",
            payload: {
              candidateIds: topCandidateIds
            }
          })
        ],
        updatedAt: now
      };
    }

    const topCandidateId = topCandidateIds[0];
    if (topCandidateId === undefined) {
      return room;
    }

    const hitInstitution = institutionPlayerIds.has(topCandidateId);
    if (hitInstitution) {
      const nextHeat = Math.min(10, (room.market?.regulationHeat ?? 0) + 1);
      const focusedInstitutions = room.institutions?.map((institution) =>
        institution.playerId === topCandidateId
          ? {
              ...institution,
              controlPoints: Math.max(0, institution.controlPoints - 1),
              fakeNewsCount: 0,
              focused: true
            }
          : institution
      );

      return {
        ...room,
        institution: {
          ...room.institution,
          controlPoints:
            room.institution.playerId === topCandidateId
              ? Math.max(0, room.institution.controlPoints - 1)
              : room.institution.controlPoints,
          fakeNewsCount: room.institution.playerId === topCandidateId ? 0 : room.institution.fakeNewsCount,
          usedActions: [...room.institution.usedActions]
        },
        ...(focusedInstitutions === undefined ? {} : { institutions: focusedInstitutions }),
        ...(room.market === undefined
          ? {}
          : {
              market: {
                ...room.market,
                regulationHeat: nextHeat,
                regulationState: getRegulationState(nextHeat)
              }
            }),
        dailyVoteRecords: [...room.dailyVoteRecords, ...voteRecords],
        leaderboardVotes: {},
        logs: [
          ...room.logs,
          this.createLog({
            timestamp: now,
            day: room.day,
            phase: "VOTE",
            type: "vote:hitInstitution",
            message: "龙虎榜关注命中主力，次日控盘资源受限。",
            payload: {
              targetPlayerId: topCandidateId,
              regulationHeat: nextHeat
            }
          })
        ],
        updatedAt: now
      };
    }

    return {
      ...room,
      players: room.players.map((player) => {
        const penalty = player.id === topCandidateId ? 1 : 0;
        return penalty === 0
          ? player
          : { ...player, confidence: Math.max(player.confidence - penalty, 0) };
      }),
      dailyVoteRecords: [...room.dailyVoteRecords, ...voteRecords],
      leaderboardVotes: {},
      logs: [
        ...room.logs,
        this.createLog({
          timestamp: now,
          day: room.day,
          phase: "VOTE",
          type: "vote:retailFriction",
          message: "龙虎榜关注误伤韭菜，被关注者次日弹幕影响力下降。",
          payload: {
            targetPlayerId: topCandidateId
          }
        })
      ],
      updatedAt: now
    };
  }

  private resolveGameEnd(room: RoomSnapshot): RoomSnapshot {
    if (room.institution === undefined || room.market === undefined) {
      return room;
    }

    const players = room.players.map((player) => this.applyElimination(player, room.day));
    const candidateRoom = {
      ...room,
      players: players.map((player) => ({
        ...player,
        finalCapital: player.capital,
        roi: rankPlayersByROI([player])[0]?.roi ?? 0
      }))
    };

    if (candidateRoom.day < candidateRoom.maxDays) {
      return candidateRoom;
    }

    const champion = resolveChampion(candidateRoom.players);
    if (champion === undefined) {
      return candidateRoom;
    }
    const winnerRole = champion.role;
    const finalSettlement = this.createFinalSettlement(
      candidateRoom,
      winnerRole,
      `${candidateRoom.maxDays} 个虚拟交易日结束，${champion.nickname} 以 ROI ${(champion.roi ?? 0) * 100}% 获得本局冠军。`
    );

    return {
      ...candidateRoom,
      status: "finished",
      finalSettlement,
      logs: [
        ...candidateRoom.logs,
        this.createLog({
          timestamp: Date.now(),
          day: candidateRoom.day,
          phase: candidateRoom.phase,
          type: "game:finished",
          message: finalSettlement.reason,
          payload: {
            winnerRole,
            championPlayerId: champion.id,
            institutionPlayerIds: candidateRoom.players
              .filter((player) => player.role === "institution")
              .map((player) => player.id)
          }
        })
      ]
    };
  }

  private resolveMarketDayResult(room: RoomSnapshot): {
    result: MarketDayResult;
    marketScore: number;
    isLimitUp: boolean;
    isLimitDown: boolean;
    boardStrength: number;
  } {
    const market = room.market;
    if (market === undefined) {
      return {
        result: "FLAT",
        marketScore: 0,
        isLimitUp: false,
        isLimitDown: false,
        boardStrength: 0
      };
    }

    const takeOffCount = room.players.filter((player) => player.intradayChoice === "TAKE_OFF")
      .length;
    const buryCount = room.players.filter((player) => player.intradayChoice === "BURY").length;
    const hasAction = (action: InstitutionIntradayAction) =>
      room.institutionIntradayActions.includes(action);

    const newsBias = this.resolveTextBias(market.news);
    const mutationBias = this.resolveTextBias(market.mutation);
    const randomNoise = (this.random() - 0.5) * 2;
    const marketScore =
      newsBias +
      mutationBias +
      market.auctionPressure * 0.3 +
      market.bullishHeat -
      market.bearishHeat +
      takeOffCount -
      buryCount +
      (hasAction("IGNITE") ? 3 : 0) +
      (hasAction("SMASH") ? -3 : 0) +
      randomNoise;
    const isLimitUp = marketScore >= LIMIT_UP_SCORE;
    const isLimitDown = marketScore <= LIMIT_DOWN_SCORE;
    const boardStrength = isLimitUp
      ? Math.min(10, Math.max(1, Math.round(marketScore - LIMIT_UP_SCORE + 6)))
      : 0;

    if (
      shouldBoardBreak({
        isLimitUp,
        institutionAction: hasAction("SHIP") ? "ship" : "none",
        bullishCrowdCount: takeOffCount
      })
    ) {
      return {
        result: "BOARD_BREAK",
        marketScore,
        isLimitUp: false,
        isLimitDown: false,
        boardStrength: 0
      };
    }

    if (
      shouldFloorReverse({
        isLimitDown,
        institutionAction: hasAction("PRY_FLOOR") ? "pry_floor" : "none",
        bearishCrowdCount: buryCount
      })
    ) {
      return {
        result: "FLOOR_REVERSE",
        marketScore,
        isLimitUp: false,
        isLimitDown: false,
        boardStrength: 0
      };
    }

    if (isLimitUp) {
      return {
        result: "BIG_UP",
        marketScore,
        isLimitUp: true,
        isLimitDown: false,
        boardStrength
      };
    }

    if (isLimitDown) {
      return {
        result: "BIG_DOWN",
        marketScore,
        isLimitUp: false,
        isLimitDown: true,
        boardStrength: 0
      };
    }

    if (marketScore >= 5) {
      return { result: "BIG_UP", marketScore, isLimitUp: false, isLimitDown: false, boardStrength };
    }

    if (marketScore > 1) {
      return { result: "SMALL_UP", marketScore, isLimitUp: false, isLimitDown: false, boardStrength };
    }

    if (marketScore >= -1) {
      return { result: "FLAT", marketScore, isLimitUp: false, isLimitDown: false, boardStrength };
    }

    if (marketScore > -5) {
      return {
        result: "SMALL_DOWN",
        marketScore,
        isLimitUp: false,
        isLimitDown: false,
        boardStrength
      };
    }

    return { result: "BIG_DOWN", marketScore, isLimitUp: false, isLimitDown: false, boardStrength };
  }

  private updateRegulationHeatForDayResult(
    room: RoomSnapshot,
    result: MarketDayResult
  ): number {
    const currentHeat = room.market?.regulationHeat ?? 0;
    const events: Parameters<typeof updateRegulationHeat>[1] = [];

    if (result === "BOARD_BREAK") {
      events.push("BOARD_BREAK");
    }

    if (result === "FLOOR_REVERSE") {
      events.push("FLOOR_REVERSE");
    }

    if (room.institutionIntradayActions.includes("SHIP")) {
      events.push("CONSECUTIVE_SHIP");
    }

    if ((room.market?.bullishHeat ?? 0) + (room.market?.bearishHeat ?? 0) >= 8) {
      events.push("OVERHEATED_SENTIMENT");
    }

    return updateRegulationHeat(currentHeat, events);
  }

  private refreshMarketSectors(room: RoomSnapshot, phase: MarketPhase): ElementSectorState[] {
    const market = room.market;
    if (market?.sectors === undefined) {
      return [];
    }

    const takeOffCount = room.players.filter((player) => player.intradayChoice === "TAKE_OFF").length;
    const buryCount = room.players.filter((player) => player.intradayChoice === "BURY").length;
    const holdCount = room.players.filter((player) => player.intradayChoice === "HOLD").length;
    const institutionHype = room.institutionIntradayActions.filter((action) =>
      action === "DRAW_PIE" || action === "IGNITE" || action === "SHIP"
    ).length;
    const institutionPressure = room.institutionIntradayActions.filter((action) =>
      action === "SCARE" || action === "SMASH" || action === "SHAKE_OUT"
    ).length;
    const phaseMomentum = this.resolvePhaseMomentum(room, phase);
    const quantMultiplier = this.resolveQuantMultiplier(room);

    const updatedSectors = market.sectors.map((sector, sectorIndex) => {
      const sectorFocus = sectorIndex === room.day % Math.max(1, market.sectors?.length ?? 1) ? 8 : 0;
      const stocks = sector.stocks.map((stock, stockIndex) => {
        const leaderBias = stockIndex === 0 ? 4 : stockIndex === 1 ? 2 : 0;
        const backRowRisk = stock.liquidity < 45 ? 10 : 0;
        const tPlusOneLockedCount = this.countLockedPositionsForStock(room, stock.id);
        const crowdDelta = takeOffCount * 4 + holdCount * 2 - buryCount * 3;
        const sentimentDelta = market.bullishHeat * 3 - market.bearishHeat * 3;
        const moneyFlowScore = this.clampScore(
          stock.moneyFlowScore * 0.65 + 25 + crowdDelta + institutionHype * 8 - institutionPressure * 6 + sectorFocus
        );
        const danmakuHeat = this.clampScore(stock.danmakuHeat * 0.7 + market.bullishHeat * 4 + market.bearishHeat * 3 + leaderBias);
        const holderCountScore = this.clampScore(stock.holderCountScore * 0.7 + takeOffCount * 8 + holdCount * 4 + tPlusOneLockedCount * 12);
        const viewCountScore = this.clampScore(stock.viewCountScore * 0.7 + danmakuHeat * 0.35 + sectorFocus + leaderBias);
        const crowdedness = this.clampScore(
          stock.crowdedness * 0.55 + holderCountScore * 0.35 + (stock.liquidity < 45 ? 15 : 0)
        );
        const tPlusOneCrowdedness = this.clampScore(
          stock.tPlusOneCrowdedness * 0.55 + tPlusOneLockedCount * 25 + takeOffCount * 4
        );
        const lowLiquidityRisk = Math.max(0, 100 - stock.liquidity);
        const quantAttention = this.clampScore(
          calculateQuantAttention({
            crowdedness,
            volatilityRisk: stock.volatility,
            liquidityRisk: lowLiquidityRisk,
            danmakuHeat,
            mainForceTrace: institutionHype * 18 + institutionPressure * 12,
            tPlusOneLockedCount: tPlusOneLockedCount * 20
          }) * quantMultiplier
        );
        const regulationAttention = this.clampScore(
          stock.regulationAttention * 0.65 + market.regulationHeat * 7 + Math.abs(stock.changePercent) * 4
        );
        const changePercent = this.clampPercent(
          stock.changePercent + phaseMomentum + (sentimentDelta + crowdDelta) / 50 + (stock.sectorBeta - 50) / 100
        );
        const isLimitUp = changePercent >= market.limitRate * 100;
        const isLimitDown = changePercent <= -market.limitRate * 100;

        return {
          ...stock,
          currentPrice: this.roundPrice(stock.previousClose * (1 + changePercent / 100)),
          changePercent,
          danmakuHeat,
          viewCountScore,
          holderCountScore,
          moneyFlowScore,
          crowdedness,
          tPlusOneCrowdedness,
          quantAttention,
          regulationAttention,
          isLimitUp,
          isLimitDown,
          boardStrength: isLimitUp ? Math.min(10, Math.max(1, Math.round(6 + changePercent - market.limitRate * 100))) : 0,
          boardBreakRisk: isLimitUp ? this.clampScore(quantAttention * 0.45 + crowdedness * 0.35 + institutionPressure * 10) : 0
        };
      });

      const heat = this.average(stocks.map((stock) => stock.danmakuHeat + stock.viewCountScore)) / 2;
      const flow = this.average(stocks.map((stock) => stock.moneyFlowScore));
      const risk = this.average(stocks.map((stock) => stock.quantAttention + stock.regulationAttention)) / 2;
      const resonance = this.clampScore(
        stocks.filter((stock) => stock.changePercent > 0).length * 14 + Math.max(0, phaseMomentum) * 6
      );

      return {
        ...sector,
        heat: this.clampScore(heat),
        flow: this.clampScore(flow),
        resonance,
        risk: this.clampScore(risk),
        popularityScore: this.clampScore(heat * 0.45 + flow * 0.25 + resonance * 0.15 + sectorFocus),
        strengthScore: this.clampScore(
          this.average(stocks.map((stock) => stock.changePercent * 5 + stock.boardStrength * 6 + 50))
        ),
        moneyFlowScore: this.clampScore(flow),
        riskScore: this.clampScore(risk),
        resonanceScore: resonance,
        stocks
      };
    });

    return resolveSectorStatusTags(resolveStockTags(updatedSectors));
  }

  private resolvePhaseMomentum(room: RoomSnapshot, phase: MarketPhase): number {
    const market = room.market;
    if (market === undefined) {
      return 0;
    }

    const base = market.auctionPressure * 0.08 + market.bullishHeat * 0.12 - market.bearishHeat * 0.12;
    const institutionBoost =
      (room.institutionIntradayActions.includes("IGNITE") ? 0.8 : 0) +
      (room.institutionIntradayActions.includes("SMASH") ? -0.8 : 0) +
      (room.institutionIntradayActions.includes("SHIP") ? -0.5 : 0);

    if (phase === "PRE_NEWS") return 0;
    if (phase === "MUTATION") return base * 0.4;
    if (phase === "AUCTION_FREE" || phase === "AUCTION_LOCKED") return market.auctionPressure * 0.05;
    if (phase === "MORNING_TRADING") return base + institutionBoost;
    if (phase === "MIDDAY_ROTATION") return base * 0.5;
    if (phase === "AFTERNOON_TRADING") return base * 0.8 + institutionBoost;
    if (phase === "CLOSING_RUSH") return base + institutionBoost * 1.2;
    return 0;
  }

  private resolveQuantMultiplier(room: RoomSnapshot): number {
    if (room.roomTypeConfig.quantLevel === "simplified") return 0.7;
    if (room.roomTypeConfig.quantLevel === "enhanced") return 1.25;
    return 1;
  }

  private resolveQuantStrategy(room: RoomSnapshot, phase: MarketPhase): QuantStrategy {
    if (room.roomTypeConfig.quantLevel === "simplified") return "SCAN_CROWD";
    if (phase === "CLOSING_RUSH") return "DRAIN_LIQUIDITY";
    if (this.maxStockScore(room, (stock) => stock.tPlusOneCrowdedness) >= 70) return "T_PLUS_ONE_KNIFE";
    if (room.institutionIntradayActions.length >= 2) return "ANTI_MAIN_FORCE";
    return "SCAN_CROWD";
  }

  private resolveQuantAlertLevel(room: RoomSnapshot): number {
    const maxAttention = this.maxStockScore(room, (stock) => stock.quantAttention);
    return Math.max(0, Math.min(5, Math.ceil(maxAttention / 20)));
  }

  private resolveBoardBreakRisk(room: RoomSnapshot): number {
    const maxRisk = this.maxStockScore(room, (stock) => stock.boardBreakRisk);
    const institutionRisk = room.institutionIntradayActions.includes("SHIP") ? 20 : 0;
    return this.clampScore(maxRisk + institutionRisk);
  }

  private maxStockScore(room: RoomSnapshot, score: (stock: ElementSectorState["stocks"][number]) => number): number {
    const stocks = room.market?.sectors?.flatMap((sector) => sector.stocks) ?? [];
    return stocks.reduce((max, stock) => Math.max(max, score(stock)), 0);
  }

  private countLockedPositionsForStock(room: RoomSnapshot, stockId: string): number {
    return room.players.reduce((count, player) => {
      const positions = this.getOpenPositions(player);
      return count + positions.filter((position) => position.stockId === stockId && !position.sellable).length;
    }, 0);
  }

  private createDailyNews(room: RoomSnapshot): string {
    const lines = [
      "盘前公告：五行盘面重新开局，所有数字均为虚构娱乐模拟。",
      "盘前公告：量化机构开始扫描拥挤交易，今日别买得太整齐。",
      "盘前公告：监管热度归档刷新，盘面太抽象会进入问询。"
    ];
    return lines[(room.day - 1) % lines.length] ?? lines[0] ?? "盘前公告：虚构娱乐模拟盘面刷新。";
  }

  private createMutationLine(room: RoomSnapshot): string {
    const lines = [
      "盘前异动：火系弹幕升温，后排票出现拥挤迹象。",
      "盘前异动：水系暗线流动，量化正在扫描后排。",
      "盘前异动：土系护盘增强，退潮时资金开始找避风处。"
    ];
    return lines[(room.day + room.players.length) % lines.length] ?? lines[0] ?? "盘前异动：虚构盘面出现情绪波动。";
  }

  private average(values: number[]): number {
    if (values.length === 0) return 0;
    return values.reduce((sum, value) => sum + value, 0) / values.length;
  }

  private clampScore(value: number): number {
    return Math.max(0, Math.min(100, Math.round(value * 100) / 100));
  }

  private clampPercent(value: number): number {
    return Math.max(-10, Math.min(10, Math.round(value * 100) / 100));
  }

  private roundPrice(value: number): number {
    return Math.round(value * 100) / 100;
  }

  private pickTopVotedPlayerId(votes: [string, string][]): string {
    const voteCounts = new Map<string, number>();
    for (const [, targetPlayerId] of votes) {
      voteCounts.set(targetPlayerId, (voteCounts.get(targetPlayerId) ?? 0) + 1);
    }

    let topPlayerId = votes[0]?.[1] ?? "";
    let topCount = 0;
    for (const [playerId, count] of voteCounts.entries()) {
      if (count > topCount) {
        topPlayerId = playerId;
        topCount = count;
      }
    }

    return topPlayerId;
  }

  private pickTopVotedPlayerIds(votes: [string, string][]): string[] {
    const voteCounts = new Map<string, number>();
    for (const [, targetPlayerId] of votes) {
      voteCounts.set(targetPlayerId, (voteCounts.get(targetPlayerId) ?? 0) + 1);
    }

    const maxCount = Math.max(...Array.from(voteCounts.values()));
    return Array.from(voteCounts.entries())
      .filter(([, count]) => count === maxCount)
      .map(([playerId]) => playerId);
  }

  private applyElimination(player: RoomPlayer, day: number): RoomPlayer {
    if (!player.alive) {
      return player;
    }

    if (player.capital <= 0) {
      return {
        ...player,
        alive: false,
        eliminatedDay: day,
        eliminatedReason: "capital<=0"
      };
    }

    if (player.confidence <= 0) {
      return {
        ...player,
        alive: false,
        eliminatedDay: day,
        eliminatedReason: "confidence<=0"
      };
    }

    return player;
  }

  private createFinalSettlement(
    room: RoomSnapshot,
    winnerRole: "institution" | "retail",
    reason: string
  ): FinalSettlement {
    const roiRankings = rankPlayersByROI(room.players);
    const champion = roiRankings[0];
    const retailPlayers = room.players.filter((player) => player.role === "retail");
    const institutionPlayers = room.players.filter((player) => player.role === "institution");
    const institutionPlayer = institutionPlayers[0];
    const maxBagHolder = this.maxBy(
      room.players,
      (player) => (player.initialCapital ?? 100) - player.capital
    )?.id;
    const strongestRetail = roiRankings.find((player) => player.role === "retail")?.id;

    return {
      winnerRole,
      reason,
      ...(champion === undefined ? {} : { championPlayerId: champion.id }),
      institutionPlayerId: room.institution?.playerId ?? institutionPlayer?.id ?? "",
      institutionPlayerIds: institutionPlayers.map((player) => player.id),
      roiRankings: roiRankings.map((player) => ({
        playerId: player.id,
        nickname: player.nickname,
        role: player.role,
        roi: player.roi ?? 0,
        finalCapital: player.finalCapital ?? player.capital
      })),
      dailyTrend: room.dailyTrend.map((item) => ({ ...item })),
      dailyVoteRecords: room.dailyVoteRecords.map((record) => ({ ...record })),
      playerTitles: room.players.map((player) => ({
        playerId: player.id,
        nickname: player.nickname,
        titles: [...player.titles]
      })),
      awards: {
        ...(maxBagHolder === undefined ? {} : { maxBagHolder }),
        ...(strongestRetail === undefined ? {} : { strongestRetail }),
        ...(institutionPlayer === undefined ? {} : { strongestInstitution: institutionPlayer.id }),
        t1SoulLocker: room.players
          .filter((player) => player.titles.includes("T+1锁魂人"))
          .map((player) => player.id),
        boardBreakExperiencer: room.players
          .filter((player) => player.titles.includes("炸板体验官"))
          .map((player) => player.id),
        cancelMonster919: room.players
          .filter((player) => player.titles.includes("9:19撤单怪"))
          .map((player) => player.id)
      }
    };
  }

  private maxBy(players: RoomPlayer[], score: (player: RoomPlayer) => number): RoomPlayer | undefined {
    let bestPlayer: RoomPlayer | undefined;
    let bestScore = Number.NEGATIVE_INFINITY;
    for (const player of players) {
      const currentScore = score(player);
      if (currentScore > bestScore) {
        bestPlayer = player;
        bestScore = currentScore;
      }
    }

    return bestPlayer;
  }

  private resolveTextBias(text: string | undefined): number {
    if (text === undefined) {
      return 0;
    }

    if (text.includes("利好") || text.includes("起飞") || text.includes("看涨")) {
      return 1;
    }

    if (text.includes("利空") || text.includes("跳水") || text.includes("看跌")) {
      return -1;
    }

    return 0;
  }

  private pickTradeStock(room: RoomSnapshot): ElementSectorState["stocks"][number] | undefined {
    const sectors = room.market?.sectors ?? [];
    const stocks = sectors.flatMap((sector) => sector.stocks);
    const preferredStockId =
      room.market?.rankings?.stockPopularityRank[0] ??
      room.market?.rankings?.stockLeadershipRank[0] ??
      stocks[0]?.id;

    return stocks.find((stock) => stock.id === preferredStockId) ?? stocks[0];
  }

  private settlePlayerByResult(
    player: RoomPlayer,
    result: MarketDayResult,
    day: number,
    costPrice: number,
    maxPositions: number,
    tradeStock?: ElementSectorState["stocks"][number]
  ): RoomPlayer {
    const choice = player.intradayChoice;
    if (choice === undefined || player.role === "institution") {
      return { ...player, position: { ...player.position } };
    }

    if (choice === "PLAY_DEAD") {
      return {
        ...player,
        confidence: Math.min(player.confidence + 1, INITIAL_CONFIDENCE),
        position: { ...player.position }
      };
    }

    if (choice === "TAKE_OFF" && result === "BOARD_BREAK") {
      return this.addTitle({
        ...player,
        capital: player.capital - 25,
        confidence: Math.max(player.confidence - 1, 0),
        position: { ...player.position }
      }, "炸板体验官");
    }

    if (choice === "BURY" && result === "FLOOR_REVERSE") {
      return {
        ...player,
        capital: player.capital - 25,
        confidence: Math.max(player.confidence - 1, 0),
        position: { ...player.position }
      };
    }

    const isUp = result === "BIG_UP" || result === "SMALL_UP" || result === "FLOOR_REVERSE";
    const isDown = result === "BIG_DOWN" || result === "SMALL_DOWN" || result === "BOARD_BREAK";

    if (choice === "TAKE_OFF" && isUp) {
      const basePosition = buyPosition(day, tradeStock?.currentPrice ?? costPrice, "normal");
      const position = {
        ...basePosition,
        ...(tradeStock === undefined
          ? {}
          : {
              stockId: tradeStock.id,
              stockName: tradeStock.name,
              element: tradeStock.element,
              currentPrice: tradeStock.currentPrice
            })
      };
      const openPositions = this.getOpenPositions(player).slice(0, maxPositions - 1);
      return this.addTitle({
        ...player,
        capital: player.capital + 20,
        position,
        positions: [...openPositions, position]
      }, result === "BIG_UP" ? "封板信仰者" : undefined);
    }

    if (choice === "TAKE_OFF" && isDown) {
      return { ...player, capital: player.capital - 20, position: { ...player.position } };
    }

    if (choice === "BURY" && isDown) {
      return { ...player, capital: player.capital + 15, position: { ...player.position } };
    }

    if (choice === "BURY" && isUp) {
      return { ...player, capital: player.capital - 15, position: { ...player.position } };
    }

    return { ...player, position: { ...player.position } };
  }

  private resolveClosePrice(currentPrice: number, result: MarketDayResult): number {
    const multiplier: Record<MarketDayResult, number> = {
      BIG_UP: 1.06,
      SMALL_UP: 1.02,
      FLAT: 1,
      SMALL_DOWN: 0.98,
      BIG_DOWN: 0.94,
      BOARD_BREAK: 0.97,
      FLOOR_REVERSE: 1.03
    };

    return Math.round(currentPrice * multiplier[result] * 100) / 100;
  }

  private createResultVoiceLine(result: MarketDayResult, day: number): VoiceLine | undefined {
    const createdAt = Date.now();
    if (result === "BIG_UP") {
      return this.createVoiceLine("涨停了，没上车的人开始研究玄学。", day, "CLOSE", createdAt);
    }

    if (result === "BOARD_BREAK") {
      return this.createVoiceLine(
        "炸板了，刚才还在喊格局的人，现在开始研究止损。",
        day,
        "CLOSE",
        createdAt
      );
    }

    if (result === "BIG_DOWN") {
      return this.createVoiceLine("跌停了，门在那边，但现在打不开。", day, "CLOSE", createdAt);
    }

    return undefined;
  }

  private addTitle(player: RoomPlayer, title: string | undefined): RoomPlayer {
    if (title === undefined || player.titles.includes(title)) {
      return { ...player, titles: [...player.titles], position: { ...player.position } };
    }

    return {
      ...player,
      titles: [...player.titles, title],
      position: { ...player.position }
    };
  }

  private nextBotNickname(room: RoomSnapshot): string {
    const usedNicknames = new Set(room.players.map((player) => player.nickname));
    const nickname = BOT_NICKNAMES.find((candidate) => !usedNicknames.has(candidate));
    if (nickname !== undefined) {
      return nickname;
    }

    return `Bot${room.players.filter((player) => player.isBot).length + 1}`;
  }

  private cloneRoom(room: RoomSnapshot): RoomSnapshot {
    const clonedRoom: RoomSnapshot = {
      ...room,
      players: room.players.map((player) => {
        const clonedPlayer: RoomPlayer = {
          ...player,
          position: { ...player.position },
          ...(player.positions === undefined
            ? {}
            : { positions: player.positions.map((position) => ({ ...position })) })
        };

        if (player.auctionOrder !== undefined) {
          clonedPlayer.auctionOrder = { ...player.auctionOrder };
        }

        return clonedPlayer;
      }),
      logs: room.logs.map((log) => ({ ...log })),
      voiceLines: room.voiceLines.map((voiceLine) => ({ ...voiceLine })),
      danmaku: room.danmaku.map((item) => ({ ...item })),
      institutionIntradayActions: [...room.institutionIntradayActions],
      regulationVotes: { ...room.regulationVotes },
      leaderboardVotes: { ...room.leaderboardVotes },
      dailyVoteRecords: room.dailyVoteRecords.map((record) => ({ ...record })),
      dailyTrend: room.dailyTrend.map((item) => ({ ...item }))
    };

    if (room.finalSettlement !== undefined) {
      clonedRoom.finalSettlement = this.cloneFinalSettlement(room.finalSettlement);
    }

    if (room.institution !== undefined) {
      clonedRoom.institution = {
        ...room.institution,
        usedActions: [...room.institution.usedActions]
      };
    }

    if (room.institutions !== undefined) {
      clonedRoom.institutions = room.institutions.map((institution) => ({ ...institution }));
    }

    if (room.market !== undefined) {
      const clonedMarket = { ...room.market };
      if (room.market.sectors !== undefined) {
        clonedMarket.sectors = room.market.sectors.map((sector) => ({
          ...sector,
          statusTags: [...sector.statusTags],
          stocks: sector.stocks.map((stock) => ({
            ...stock,
            tags: [...stock.tags]
          }))
        }));
      }
      if (room.market.rankings !== undefined) {
        clonedMarket.rankings = {
          stockPopularityRank: [...room.market.rankings.stockPopularityRank],
          stockLeadershipRank: [...room.market.rankings.stockLeadershipRank],
          stockDanmakuRank: [...room.market.rankings.stockDanmakuRank],
          stockQuantRiskRank: [...room.market.rankings.stockQuantRiskRank],
          stockTPlusOneRank: [...room.market.rankings.stockTPlusOneRank],
          stockRegulationRank: [...room.market.rankings.stockRegulationRank],
          stockGainersRank: [...room.market.rankings.stockGainersRank],
          stockLosersRank: [...room.market.rankings.stockLosersRank],
          sectorPopularityRank: [...room.market.rankings.sectorPopularityRank],
          sectorStrengthRank: [...room.market.rankings.sectorStrengthRank],
          sectorRiskRank: [...room.market.rankings.sectorRiskRank],
          sectorMoneyFlowRank: [...room.market.rankings.sectorMoneyFlowRank]
        };
      }
      if (room.market.quant !== undefined) {
        clonedMarket.quant = { ...room.market.quant };
      }
      if (room.market.orderBooks !== undefined) {
        clonedMarket.orderBooks = Object.fromEntries(
          Object.entries(room.market.orderBooks).map(([stockId, orderBook]) => [stockId, { ...orderBook }])
        );
      }
      clonedRoom.market = clonedMarket;
    }

    return clonedRoom;
  }

  private cloneFinalSettlement(settlement: FinalSettlement): FinalSettlement {
    return {
      ...settlement,
      ...(settlement.institutionPlayerIds === undefined
        ? {}
        : { institutionPlayerIds: [...settlement.institutionPlayerIds] }),
      ...(settlement.roiRankings === undefined
        ? {}
        : { roiRankings: settlement.roiRankings.map((item) => ({ ...item })) }),
      dailyTrend: settlement.dailyTrend.map((item) => ({ ...item })),
      dailyVoteRecords: settlement.dailyVoteRecords.map((record) => ({ ...record })),
      playerTitles: settlement.playerTitles.map((item) => ({
        ...item,
        titles: [...item.titles]
      })),
      awards: {
        ...settlement.awards,
        t1SoulLocker: [...settlement.awards.t1SoulLocker],
        boardBreakExperiencer: [...settlement.awards.boardBreakExperiencer],
        cancelMonster919: [...settlement.awards.cancelMonster919]
      }
    };
  }
}
