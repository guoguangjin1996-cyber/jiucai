import { DialogPage, type DialogPageManager } from "../components/DialogPage";
import { Theme } from "../theme/Theme";

export class FinalConfirmPage extends DialogPage {
  constructor(manager: DialogPageManager) {
    super(manager, {
      title: "最终确认",
      hero: "干就完了！！",
      desc: "你确定吗？你真的确定吗？",
      lines: ["订单信息：泡泡叶股份 JC-001", "方向：局内模拟动作  价格：10.05  数量：100份", "预计投入：1,005.00 本金值"],
      actions: [{ label: "再想想", close: true }, { label: "就是它！", close: true }],
      accent: Theme.colors.primaryRed
    });
  }
}


