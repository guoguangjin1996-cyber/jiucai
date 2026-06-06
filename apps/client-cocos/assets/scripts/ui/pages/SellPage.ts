import { DialogPage, type DialogPageManager } from "../components/DialogPage";
import { Theme } from "../theme/Theme";

export class SellPage extends DialogPage {
  constructor(manager: DialogPageManager) {
    super(manager, {
      title: "卖出",
      hero: "跑得快才有未来！",
      desc: "落袋为安，睡在下一个韭菜晚线。",
      lines: ["持仓：泡泡叶股份 JC-001", "盈亏情况、持有数量、成本价、当前价", "卖出价格、卖出数量、预计到账本金值", "纯局内虚拟参数，无现金价值。"],
      actions: [{ label: "卖出", pageKey: "FINAL_CONFIRM", close: false }],
      accent: Theme.colors.primaryGreen
    });
  }
}


