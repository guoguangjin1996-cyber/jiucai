import { DialogPage, type DialogPageManager } from "../components/DialogPage";
import { Theme } from "../theme/Theme";

export class OneThirdPositionPage extends DialogPage {
  constructor(manager: DialogPageManager) {
    super(manager, {
      title: "1/3仓",
      hero: "先试试水，别直接下海",
      desc: "小步试探，活得更久。",
      lines: ["投入比例：约33%", "预计投入：781.89 本金值", "先学会游泳，再考虑冲浪。"],
      actions: [{ label: "1/3仓下单", pageKey: "FINAL_CONFIRM", close: false }],
      accent: Theme.colors.primaryBlue
    });
  }
}


