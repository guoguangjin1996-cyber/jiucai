import { DialogPage, type DialogPageManager } from "../components/DialogPage";
import { Theme } from "../theme/Theme";

export class FundManagementPage extends DialogPage {
  constructor(manager: DialogPageManager) {
    super(manager, {
      title: "资金管理",
      hero: "钱不是万能的",
      desc: "但没有局内操盘点，很难割得优雅。",
      lines: ["总资产：5,432,109,876 操盘点", "今日收益：+123,456,789", "资金分布：股票账户、理财产品、打断资金、备用金", "资金流水：收入和支出均为虚构参数。"],
      actions: [{ label: "查看完毕", close: true }],
      accent: Theme.colors.primaryPurple
    });
  }
}


