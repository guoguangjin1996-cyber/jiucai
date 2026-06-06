import { DialogPage, type DialogPageManager } from "../components/DialogPage";
import { Theme } from "../theme/Theme";

export class TradeListPage extends DialogPage {
  constructor(manager: DialogPageManager) {
    super(manager, {
      title: "成交",
      hero: "这里记录你每一次冲动。",
      desc: "买入、卖出、成交价格、成交数量，全是局内虚构流水。",
      lines: ["09:31 买入 10.05 100份 标签：手抖成交", "10:42 卖出 9.88 50份 标签：跑慢了", "11:08 观望 0份 标签：韭菜不死"],
      actions: [{ label: "知道了", close: true }],
      accent: Theme.colors.primaryYellow
    });
  }
}


