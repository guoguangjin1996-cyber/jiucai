import { DialogPage, type DialogPageManager } from "../components/DialogPage";
import { Theme } from "../theme/Theme";

export class MainForceFundControlPage extends DialogPage {
  constructor(manager: DialogPageManager) {
    super(manager, {
      title: "资金操控",
      hero: "一滑条，满屏戏",
      desc: "买入堆单、突出出货、一键买入、一键卖出和撤单全部，暂为 UI。",
      lines: ["买入堆单滑条：68%", "突出出货滑条：42%", "一键买入 / 一键卖出 / 撤单全部", "不接真实交易，不产生任何现金价值。"],
      actions: [{ label: "执行演出", close: true }],
      accent: Theme.colors.primaryPurple
    });
  }
}


