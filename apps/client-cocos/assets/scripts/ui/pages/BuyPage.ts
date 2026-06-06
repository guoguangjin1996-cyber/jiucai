import { DialogPage, type DialogPageManager } from "../components/DialogPage";
import { Theme } from "../theme/Theme";

export class BuyPage extends DialogPage {
  constructor(manager: DialogPageManager) {
    super(manager, {
      title: "买入",
      hero: "冲就完了！",
      desc: "局内买入动作有风险，入市需谨慎。别问，问就是信仰。",
      lines: ["虚构标的：泡泡叶股份 JC-001", "当前价：10.05  涨停价：11.00  跌停价：9.00", "买入价格、买入数量、可用本金值、风险提示", "已阅读《韭菜保卫战交易协议》"],
      actions: [{ label: "买入", pageKey: "FINAL_CONFIRM", close: false }],
      accent: Theme.colors.primaryRed
    });
  }
}


