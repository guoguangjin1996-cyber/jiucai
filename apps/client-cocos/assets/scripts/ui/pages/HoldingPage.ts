import { DialogPage, type DialogPageManager } from "../components/DialogPage";
import { Theme } from "../theme/Theme";

export class HoldingPage extends DialogPage {
  constructor(manager: DialogPageManager) {
    super(manager, {
      title: "持仓",
      hero: "T+1 锁住了小手",
      desc: "展示总资产、今日盈亏、持仓列表和 T+1 状态。",
      lines: ["总资产：12,345.67 本金值", "今日盈亏：-678.90 本金值", "泡泡叶股份 JC-001 今日仓，不可卖出，原因 T+1"],
      actions: [{ label: "格局一下", close: true }],
      accent: Theme.colors.primaryYellow
    });
  }
}


