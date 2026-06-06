import type {
  GameLog,
  GameRoomType,
  InstitutionPlayerState,
  InstitutionState,
  MarketPhase,
  MarketState,
  DanmakuItem,
  PlayerRole,
  PlayerState,
  GameRoomTypeConfig
} from "@jiucai-defense/shared";

export interface WsMessage<T = any> {
  type: string;
  requestId?: string;
  payload: T;
}

export type ClientMessage =
  | WsMessage<CreateRoomPayload>
  | WsMessage<JoinRoomPayload>
  | WsMessage<LeaveRoomPayload>
  | WsMessage<AddBotPayload>
  | WsMessage<ReadyPayload>
  | WsMessage<StartGamePayload>
  | WsMessage<SubmitActionPayload>
  | WsMessage<DanmakuSendPayload>
  | WsMessage<DanmakuSystemPayload>
  | WsMessage<PingPayload>;

export interface CreateRoomPayload {
  nickname: string;
  roomType?: GameRoomType;
}

export interface JoinRoomPayload {
  roomId: string;
  nickname: string;
}

export interface LeaveRoomPayload {
  roomId?: string;
}

export interface AddBotPayload {
  roomId?: string;
}

export interface ReadyPayload {
  ready?: boolean;
}

export interface StartGamePayload {
  roomId?: string;
  roomType?: GameRoomType;
}

export interface SubmitActionPayload {
  actionType: string;
  action: string;
  targetPlayerId?: string;
}

export interface DanmakuSendPayload {
  text: string;
  sentiment: "bullish" | "bearish" | "suspicious" | "panic" | "neutral";
  targetPlayerId?: string;
  asInstitution?: boolean;
}

export interface DanmakuSystemPayload {
  text: string;
  sentiment?: "bullish" | "bearish" | "suspicious" | "panic" | "neutral";
  targetPlayerId?: string;
}

export interface PingPayload {
  now?: number;
}

export type ServerEventType =
  | "room:updated"
  | "game:started"
  | "game:stateUpdated"
  | "game:phaseChanged"
  | "danmaku:updated"
  | "error"
  | "pong";

export type IntradayChoice = "TAKE_OFF" | "BURY" | "PLAY_DEAD" | "RUN_AWAY" | "HOLD";

export type InstitutionIntradayAction =
  | "DRAW_PIE"
  | "SCARE"
  | "IGNITE"
  | "SMASH"
  | "SHAKE_OUT"
  | "SHIP"
  | "PRY_FLOOR";

export type MarketDayResult =
  | "BIG_UP"
  | "SMALL_UP"
  | "FLAT"
  | "SMALL_DOWN"
  | "BIG_DOWN"
  | "BOARD_BREAK"
  | "FLOOR_REVERSE";

export interface RoomPlayer extends PlayerState {
  isHost: boolean;
  ready: boolean;
  titles: string[];
  intradayChoice?: IntradayChoice;
}

export interface RoomSnapshot {
  id: string;
  status: "lobby" | "playing" | "finished";
  roomType: GameRoomType;
  roomTypeConfig: GameRoomTypeConfig;
  hostPlayerId: string;
  players: RoomPlayer[];
  institution?: InstitutionState;
  institutions?: InstitutionPlayerState[];
  market?: MarketState;
  day: number;
  maxDays: number;
  phase: MarketPhase;
  submittedPlayerIds: string[];
  phaseStartedAt?: number;
  phaseEndsAt?: number;
  virtualTime?: string;
  targetMinutes?: number;
  maxPositions?: number;
  maxDailyActions?: number;
  logs: GameLog[];
  voiceLines: VoiceLine[];
  danmaku: DanmakuItem[];
  institutionIntradayActions: InstitutionIntradayAction[];
  regulationVotes: Record<string, string>;
  leaderboardVotes: Record<string, string>;
  dailyVoteRecords: VoteRecord[];
  dailyTrend: DailyTrendItem[];
  finalSettlement?: FinalSettlement;
  dayResult?: MarketDayResult;
  createdAt: number;
  updatedAt: number;
}

export interface VoteRecord {
  day: number;
  voterPlayerId: string;
  targetPlayerId: string;
  hitInstitution?: boolean;
}

export interface DailyTrendItem {
  day: number;
  result: MarketDayResult;
  closePrice: number;
  regulationHeat: number;
}

export interface FinalSettlement {
  winnerRole: PlayerRole;
  reason: string;
  championPlayerId?: string;
  institutionPlayerId: string;
  institutionPlayerIds?: string[];
  roiRankings?: Array<{
    playerId: string;
    nickname: string;
    role: PlayerRole;
    roi: number;
    finalCapital: number;
  }>;
  dailyTrend: DailyTrendItem[];
  dailyVoteRecords: VoteRecord[];
  playerTitles: Array<{
    playerId: string;
    nickname: string;
    titles: string[];
  }>;
  awards: {
    maxBagHolder?: string;
    strongestRetail?: string;
    strongestInstitution?: string;
    t1SoulLocker: string[];
    boardBreakExperiencer: string[];
    cancelMonster919: string[];
  };
}

export interface VoiceLine {
  id: string;
  day: number;
  phase: MarketPhase;
  text: string;
  createdAt: number;
}

export interface SanitizedRoomPlayer extends Omit<RoomPlayer, "role"> {
  role?: PlayerRole;
}

export interface SanitizedRoomSnapshot
  extends Omit<RoomSnapshot, "players" | "institution" | "finalSettlement"> {
  players: SanitizedRoomPlayer[];
  institutionState?: InstitutionState;
  finalSettlement?: FinalSettlement;
}

export interface RoomUpdatedPayload {
  room: SanitizedRoomSnapshot;
}

export interface GameStartedPayload {
  room: SanitizedRoomSnapshot;
}

export interface GameStateUpdatedPayload {
  room: SanitizedRoomSnapshot;
}

export interface GamePhaseChangedPayload {
  roomId: string;
  day: number;
  phase: MarketPhase;
  durationMs?: number;
  virtualTime?: string;
}

export interface DanmakuUpdatedPayload {
  roomId: string;
  danmaku: DanmakuItem[];
}

export interface ErrorPayload {
  code: string;
  message: string;
}

export interface PongPayload {
  now: number;
}
