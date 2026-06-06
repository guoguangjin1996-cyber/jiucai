import { DialogPage, type DialogPageManager } from "../components/DialogPage";
import { Theme } from "../theme/Theme";

export class HalfPositionPage extends DialogPage {
  constructor(manager: DialogPageManager) {
    super(manager, {
      title: "半仓",
      hero: "稳一手！半仓走起～",
      desc: "进可攻，退可守，不慌不忙。",
      lines: ["投入比例：50%", "预计投入：1,172.84 本金值", "半仓才是王道，留子弹，等机会。"],
      actions: [{ label: "半仓确认", pageKey: "FINAL_CONFIRM", close: false }],
      accent: Theme.colors.primaryGreen
    });
  }
}


