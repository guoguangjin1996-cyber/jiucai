import { Button, Node } from "cc";
import type { ClientGameStore, ClientRoom } from "../../store/ClientGameStore";
import { Palette, button, label, panel, row } from "../UiKit";

export class AuctionPanel {
  constructor(private readonly store: ClientGameStore) {}

  render(room: ClientRoom): Node {
    const locked = room.phase === "AUCTION_LOCKED" || room.phase === "OPEN_PRICE";
    const root = panel("AuctionPanel", 820, 260, Palette.cream);
    root.addChild(label(`集合竞价 · ${locked ? "锁单阶段" : "可撤阶段"}`, 24, Palette.textDark));
    root.addChild(label(`模拟盘口压力：${room.market?.auctionPressure ?? 0} · 9:20后后悔按钮会变灰`, 18, Palette.textSub));

    const actions = row("AuctionActions", 760, 70);
    actions.addChild(button("顶涨停", () => this.store.submitAction("TOP_LIMIT_BUY"), Palette.red, 136, 58));
    actions.addChild(button("挂高开", () => this.store.submitAction("HIGH_OPEN_BUY"), Palette.yellow, 136, 58));
    actions.addChild(button("平开", () => this.store.submitAction("FLAT"), Palette.blue, 120, 58));
    actions.addChild(button("按跌停", () => this.store.submitAction("LIMIT_SELL"), Palette.green, 136, 58));
    root.addChild(actions);

    const cancelButton = button("撤单", () => this.store.submitAction("CANCEL_AUCTION_ORDER"), locked ? Palette.border : Palette.purple, 180, 58);
    const buttonComponent = cancelButton.getComponent(Button);
    if (buttonComponent !== null) {
      buttonComponent.interactable = !locked;
    }
    root.addChild(cancelButton);

    if (locked) {
      root.addChild(label("锁单阶段：不可撤单，幻想已经被系统装进小盒子。", 17, Palette.danger));
    } else {
      root.addChild(label("9:20前可以反悔，9:20后反悔无效。", 17, Palette.warning));
    }

    return root;
  }
}
