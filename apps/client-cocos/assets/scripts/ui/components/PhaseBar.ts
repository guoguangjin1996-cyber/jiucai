import { Color, Node } from "cc";
import type { ClientRoom } from "../../store/ClientGameStore";
import { Palette, badge, label, panel, row } from "../UiKit";

const PHASE_LABELS: Record<string, string> = {
  LOBBY: "等待",
  ROLE_REVEAL: "身份",
  PRE_NEWS: "盘前",
  MUTATION: "异变",
  AUCTION_FREE: "竞价可撤",
  AUCTION_LOCKED: "锁单",
  OPEN_PRICE: "开盘",
  CONTINUOUS_TRADING: "盘中",
  LIMIT_BOARD: "封板",
  CLOSE: "收盘",
  VOTE: "投票",
  REGULATION_INQUIRY: "问询",
  DAY_RESULT: "复盘"
  ,
  INSTITUTION_PRIVATE_ROOM: "密室",
  MORNING_TRADING: "早盘",
  MIDDAY_ROTATION: "午间轮动",
  AFTERNOON_TRADING: "午后",
  CLOSING_RUSH: "尾盘",
  FOCUS_VOTE: "关注投票",
  DAY_RECAP: "日终复盘"
};

export class PhaseBar {
  render(room: ClientRoom): Node {
    const root = panel("PhaseBar", 820, 128, Palette.panel);
    root.addChild(label(`第 ${room.day} / ${room.maxDays} 交易日 · ${room.virtualTime ?? "--:--"}`, 26, Palette.textDark));
    const phases = row("PhasePills", 760, 48, new Color(255, 255, 255, 0));
    for (const phase of ["PRE_NEWS", "MUTATION", "INSTITUTION_PRIVATE_ROOM", "AUCTION_FREE", "AUCTION_LOCKED", "OPEN_PRICE", "MORNING_TRADING", "CLOSING_RUSH", "CLOSE", "FOCUS_VOTE", "DAY_RECAP"]) {
      phases.addChild(badge(PHASE_LABELS[phase] ?? phase, phase === room.phase ? Palette.green : Palette.cream));
    }
    root.addChild(phases);
    root.addChild(label(`当前：${PHASE_LABELS[room.phase] ?? room.phase} · 倒计时 ${this.getCountdown(room)}s · 进度 ${this.getProgress(room)}%`, 17, Palette.textSub));
    return root;
  }

  private getCountdown(room: ClientRoom): number {
    if (room.phaseEndsAt === undefined) return 0;
    return Math.max(0, Math.ceil((room.phaseEndsAt - Date.now()) / 1000));
  }

  private getProgress(room: ClientRoom): number {
    if (room.phaseStartedAt === undefined || room.phaseEndsAt === undefined) return 0;
    const total = room.phaseEndsAt - room.phaseStartedAt;
    if (total <= 0) return 0;
    return Math.round(Math.min(1, Math.max(0, (Date.now() - room.phaseStartedAt) / total)) * 100);
  }
}
