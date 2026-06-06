import { DialogPage, type DialogPageManager } from "../components/DialogPage";
import { Theme } from "../theme/Theme";

export class MinePage extends DialogPage {
  constructor(manager: DialogPageManager) {
    super(manager, {
      title: "我的",
      hero: "韭菜档案馆",
      desc: "头像、等级、韭菜值、勋章、装扮、战斗记录。",
      lines: ["等级：Lv.3 韭菜新手", "韭菜值：68", "勋章：T+1 惊魂人、最强嘴硬"],
      actions: [{ label: "收起档案", close: true }],
      accent: Theme.colors.primaryGreen
    });
  }
}


