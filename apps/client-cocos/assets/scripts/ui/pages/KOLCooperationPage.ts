import { DialogPage, type DialogPageManager } from "../components/DialogPage";
import { Theme } from "../theme/Theme";

export class KOLCooperationPage extends DialogPage {
  constructor(manager: DialogPageManager) {
    super(manager, {
      title: "大V合作",
      hero: "嘴强合作计划",
      desc: "大V 列表、粉丝数、影响力、合作费用和合作计划。",
      lines: ["奶茶财经：粉丝 88w  影响力 76", "葱花观察：粉丝 52w  影响力 68", "合作费用：局内操盘点，不是现金。"],
      actions: [{ label: "合作计划", close: true }],
      accent: Theme.colors.primaryPurple
    });
  }
}


