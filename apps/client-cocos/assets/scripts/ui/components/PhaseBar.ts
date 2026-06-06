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
};

export class PhaseBar {
  render(room: ClientRoom): Node {
    const root = panel("PhaseBar", 820, 128, Palette.panel);
    root.addChild(label(`第 ${room.day} / 5 交易日`, 26, Palette.textDark));
    const phases = row("PhasePills", 760, 48, new Color(255, 255, 255, 0));
    for (const phase of ["PRE_NEWS", "MUTATION", "AUCTION_FREE", "AUCTION_LOCKED", "OPEN_PRICE", "CONTINUOUS_TRADING", "CLOSE", "VOTE"]) {
      phases.addChild(badge(PHASE_LABELS[phase] ?? phase, phase === room.phase ? Palette.green : Palette.cream));
    }
    root.addChild(phases);
    root.addChild(label(`当前：${PHASE_LABELS[room.phase] ?? room.phase} · 倒计时以服务端阶段广播为准`, 17, Palette.textSub));
    return root;
  }
}
