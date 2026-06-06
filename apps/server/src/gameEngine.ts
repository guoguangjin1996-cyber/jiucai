import type { RoomSnapshot, SubmitActionPayload } from "./messages";
import {
  DAY_PHASES,
  getNextDayPhase,
  getPhaseDurationMs,
  getMinimumPhaseHoldMs,
  isDayFlowPhase,
  phaseRequiresPlayerSubmission
} from "./dayFlow";
import type { DayFlowPhase } from "./dayFlow";
import type { RoomManager } from "./roomManager";

export interface GameEngineCallbacks {
  onPhaseChanged?: (room: RoomSnapshot, phase: DayFlowPhase) => void;
  onStateUpdated?: (room: RoomSnapshot) => void;
}

export interface GameEngineOptions {
  fastMode?: boolean;
  callbacks?: GameEngineCallbacks;
}

interface PhaseTimerState {
  timer: ReturnType<typeof setTimeout>;
  phase: DayFlowPhase;
  startedAt: number;
  endsAt: number;
}

export class GameEngine {
  private readonly timers = new Map<string, PhaseTimerState>();
  private readonly fastMode: boolean;
  private readonly callbacks: GameEngineCallbacks;

  constructor(
    private readonly roomManager: RoomManager,
    options: GameEngineOptions = {}
  ) {
    this.fastMode = options.fastMode ?? process.env.FAST_MODE === "1";
    this.callbacks = options.callbacks ?? {};
  }

  startRoom(roomId: string): RoomSnapshot {
    this.stopRoom(roomId);
    const firstPhase = DAY_PHASES[0];
    if (firstPhase === undefined) {
      throw new Error("DAY_PHASES is empty.");
    }
    return this.enterPhase(roomId, firstPhase);
  }

  submitAction(connectionId: string, payload: SubmitActionPayload): RoomSnapshot {
    const room = this.roomManager.recordPlayerAction(connectionId, payload);
    this.callbacks.onStateUpdated?.(room);
    this.maybeAdvanceEarly(room);
    return room;
  }

  stopRoom(roomId: string): void {
    const state = this.timers.get(roomId);
    if (state !== undefined) {
      clearTimeout(state.timer);
      this.timers.delete(roomId);
    }
  }

  stopAll(): void {
    for (const roomId of this.timers.keys()) {
      this.stopRoom(roomId);
    }
  }

  private enterPhase(roomId: string, phase: DayFlowPhase): RoomSnapshot {
    const baseRoom = this.roomManager.getRoom(roomId);
    const roomType = baseRoom?.roomType ?? "STANDARD_20";
    const startedAt = Date.now();
    const durationMs = getPhaseDurationMs(phase, this.fastMode, roomType);
    const endsAt = startedAt + durationMs;
    const room = this.roomManager.transitionPhase(roomId, phase, {
      phaseStartedAt: startedAt,
      phaseEndsAt: endsAt
    });
    this.callbacks.onPhaseChanged?.(room, phase);
    this.callbacks.onStateUpdated?.(room);
    this.schedulePhaseEnd(room.id, phase, startedAt, endsAt);
    return room;
  }

  private schedulePhaseEnd(
    roomId: string,
    phase: DayFlowPhase,
    startedAt: number,
    endsAt: number
  ): void {
    this.stopRoom(roomId);
    const delayMs = Math.max(0, endsAt - Date.now());
    const timer = setTimeout(() => {
      this.finishPhase(roomId, phase);
    }, delayMs);

    this.timers.set(roomId, { timer, phase, startedAt, endsAt });
  }

  private maybeAdvanceEarly(room: RoomSnapshot): void {
    if (!isDayFlowPhase(room.phase, room.roomType) || !phaseRequiresPlayerSubmission(room.phase)) {
      return;
    }

    if (!this.roomManager.haveAllAlivePlayersSubmitted(room.id)) {
      return;
    }

    const state = this.timers.get(room.id);
    if (state === undefined || state.phase !== room.phase) {
      return;
    }

    const minimumEndAt = state.startedAt + (getMinimumPhaseHoldMs(room.phase, this.fastMode) ?? 0);
    const nextEndAt = Math.min(state.endsAt, Math.max(Date.now(), minimumEndAt));
    this.schedulePhaseEnd(room.id, room.phase, state.startedAt, nextEndAt);
  }

  private finishPhase(roomId: string, phase: DayFlowPhase): void {
    const beforeDefaults = this.roomManager.getRoom(roomId);
    const defaultedRoom =
      beforeDefaults !== undefined && phaseRequiresPlayerSubmission(phase)
        ? this.roomManager.applyTimeoutDefaults(roomId, phase)
        : beforeDefaults;
    if (defaultedRoom !== undefined && phaseRequiresPlayerSubmission(phase)) {
      this.callbacks.onStateUpdated?.(defaultedRoom);
    }

    const settledRoom = this.roomManager.settlePhase(roomId, phase);
    this.callbacks.onStateUpdated?.(settledRoom);

    if (phase === "DAY_RECAP") {
      if (settledRoom.status === "finished" || settledRoom.day >= settledRoom.maxDays) {
        this.timers.delete(roomId);
        return;
      }

      this.enterPhase(roomId, "PRE_NEWS");
      return;
    }

    const nextPhase = getNextDayPhase(phase, settledRoom.roomType);
    if (nextPhase === undefined) {
      this.timers.delete(roomId);
      return;
    }

    const nextRoom = this.enterPhase(roomId, nextPhase);
    if (!isDayFlowPhase(nextRoom.phase, nextRoom.roomType)) {
      this.timers.delete(roomId);
    }
  }
}
