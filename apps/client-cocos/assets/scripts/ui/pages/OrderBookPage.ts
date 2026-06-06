import { DialogPage, type DialogPageManager } from "../components/DialogPage";
import { Theme } from "../theme/Theme";

export class OrderBookPage extends DialogPage {
  constructor(manager: DialogPageManager) {
    super(manager, {
      title: "盘口",
      hero: "排队现场",
      desc: "人太多了，挤不进去。要么排队，要么躺平。",
      lines: ["买一到买五：虚构小韭排队中", "卖一到卖五：K线怪物举牌中", "排队人数：8888  封单强度：82%"],
      actions: [{ label: "返回", close: true }],
      accent: Theme.colors.primaryGreen
    });
  }
}


