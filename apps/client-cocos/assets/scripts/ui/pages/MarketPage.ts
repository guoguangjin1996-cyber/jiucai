import { DialogPage, type DialogPageManager } from "../components/DialogPage";
import { Theme } from "../theme/Theme";

export class MarketPage extends DialogPage {
  constructor(manager: DialogPageManager) {
    super(manager, {
      title: "行情",
      hero: "绿得发慌也要可爱",
      desc: "自选列表只展示虚构标的和虚构数值。",
      lines: ["泡泡叶股份 JC-001 +5.26% 标签：像棉花糖", "葱花科技 JC-233 -2.10% 标签：葱花掉地上", "月台股份 JC-520 +1.68% 标签：站台等风"],
      actions: [{ label: "返回", close: true }],
      accent: Theme.colors.primaryBlue
    });
  }
}


