import { DialogPage, type DialogPageManager } from "../components/DialogPage";
import { Theme } from "../theme/Theme";

export class CancelOrderPage extends DialogPage {
  constructor(manager: DialogPageManager) {
    super(manager, {
      title: "撤单",
      hero: "后悔药警告！",
      desc: "下错单不可怕，可怕的是不撤单。但锁单后，幻想无效。",
      lines: ["待撤订单：泡泡叶股份 JC-001  买入 10.20  200份  09:15:30", "状态：待成交", "撤单仅影响局内模拟订单。"],
      actions: [{ label: "一键撤单", close: true }],
      accent: Theme.colors.primaryYellow
    });
  }
}


