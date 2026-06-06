import { DialogPage, type DialogPageManager } from "../components/DialogPage";
import { Theme } from "../theme/Theme";

export class FullPositionPage extends DialogPage {
  constructor(manager: DialogPageManager) {
    super(manager, {
      title: "全仓",
      hero: "全仓拉满警告！",
      desc: "一键拉满，心跳拉满。别上头，别上头，别上头。",
      lines: ["投入比例：100%", "风险仪表盘：MAX", "预计投入：全部可用本金值", "警告：这是游戏内搞笑按钮，不代表现实行为。"],
      actions: [{ label: "全仓确认！", pageKey: "FINAL_CONFIRM", close: false }],
      accent: Theme.colors.danger
    });
  }
}


