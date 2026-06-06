import { DialogPage, type DialogPageManager } from "../components/DialogPage";
import { Theme } from "../theme/Theme";

export class ChipDistributionPage extends DialogPage {
  constructor(manager: DialogPageManager) {
    super(manager, {
      title: "筹码分布",
      hero: "筹码像果冻一样晃",
      desc: "筹码热力图、持仓结构、集中度和占比。",
      lines: ["主力持仓：62.3%", "散户持仓：30.1%", "游资持仓：7.6%", "筹码集中度：高，但仍是虚构参数。"],
      actions: [{ label: "关闭热力图", close: true }],
      accent: Theme.colors.primaryPurple
    });
  }
}


