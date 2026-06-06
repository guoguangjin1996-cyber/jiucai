import { Button, Node } from "cc";
import type { ClientGameStore, ClientRoom } from "../../store/ClientGameStore";
import { Palette, button, label, panel, row, statLine } from "../UiKit";

export class PositionCard {
  constructor(private readonly store: ClientGameStore) {}

  render(room: ClientRoom): Node {
    const player = room.players[0];
    const position = player?.position;
    const stateText =
      position === undefined || !position.hasPosition ? "空仓" : position.sellable ? "昨日仓：可卖出" : "今日仓：不可卖出";
    const lockedReason =
      position?.lockedReason === "T+1"
        ? "T+1"
        : position?.lockedReason === "limit_down"
          ? "跌停排队"
          : position?.lockedReason === "suspended"
            ? "停牌"
            : "无";
    const root = panel("PositionCard", 390, 210, Palette.mint);
    root.addChild(label("持仓信息", 22, Palette.textDark));
    root.addChild(statLine("状态", stateText, position?.sellable ? Palette.success : Palette.warning));
    root.addChild(statLine("锁定原因", lockedReason, Palette.danger));

    const actions = row("PositionActions", 330, 64);
    const run = button(position?.sellable === false ? "跑路 不可用" : "跑路", () => this.store.submitAction("RUN_AWAY"), position?.sellable === false ? Palette.border : Palette.purple, 150, 54);
    const runButton = run.getComponent(Button);
    if (runButton !== null) {
      runButton.interactable = position?.sellable !== false;
    }
    actions.addChild(run);
    actions.addChild(button("格局", () => this.store.submitAction("HOLD"), Palette.blue, 120, 54));
    root.addChild(actions);
    return root;
  }
}
