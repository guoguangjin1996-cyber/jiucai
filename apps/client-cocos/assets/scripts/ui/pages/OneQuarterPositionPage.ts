import { DialogPage, type DialogPageManager } from "../components/DialogPage";
import { Theme } from "../theme/Theme";

export class OneQuarterPositionPage extends DialogPage {
  constructor(manager: DialogPageManager) {
    super(manager, {
      title: "1/4仓",
      hero: "先伸一根脚趾进去",
      desc: "保守一点，睡得更香。",
      lines: ["投入比例：25%", "预计投入：586.42 本金值", "仓位很小，不会被锅铲一锅端。"],
      actions: [{ label: "1/4仓下单", pageKey: "FINAL_CONFIRM", close: false }],
      accent: Theme.colors.primaryBlue
    });
  }
}


