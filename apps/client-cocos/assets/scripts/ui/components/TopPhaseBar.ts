import { Node } from "cc";
import type { MockPhase } from "../../store/ViewModels";
import { Theme } from "../theme/Theme";
import { UiFactory } from "../theme/UiFactory";

const phases: Array<{ key: MockPhase; label: string }> = [
  { key: "PRE_NEWS", label: "盘前" },
  { key: "MUTATION", label: "异变" },
  { key: "INSTITUTION_PRIVATE_ROOM", label: "密室" },
  { key: "AUCTION_FREE", label: "可撤" },
  { key: "AUCTION_LOCKED", label: "锁单" },
  { key: "OPEN_PRICE", label: "开盘" },
  { key: "MORNING_TRADING", label: "早盘" },
  { key: "MIDDAY_ROTATION", label: "轮动" },
  { key: "AFTERNOON_TRADING", label: "午后" },
  { key: "CLOSING_RUSH", label: "尾盘" },
  { key: "CLOSE", label: "收盘" },
  { key: "FOCUS_VOTE", label: "关注" },
  { key: "DAY_RECAP", label: "复盘" }
];

export class TopPhaseBar {
  static create(parent: Node, current: MockPhase): Node {
    const row = UiFactory.horizontal("TopPhaseBar", parent, Theme.spacing.xs);
    for (const phase of phases) {
      const color = phase.key === current ? Theme.colors.primaryGreen : Theme.colors.softBorder;
      UiFactory.button(row, phase.label, 78, 44, color, () => undefined, phase.key !== current);
    }
    return row;
  }
}
