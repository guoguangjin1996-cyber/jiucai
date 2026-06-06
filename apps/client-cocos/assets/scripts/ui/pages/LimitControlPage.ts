import { DialogPage, type DialogPageManager } from "../components/DialogPage";
import { Theme } from "../theme/Theme";

export class LimitControlPage extends DialogPage {
  constructor(manager: DialogPageManager) {
    super(manager, {
      title: "涨停控制",
      hero: "封板方式：看起来很忙",
      desc: "涨停控制台、跌停控制台、封单金额、封单比例和执行计划。",
      lines: ["封单金额：虚构 8888 操盘点", "封单比例：76%", "封板方式：果冻式回封", "执行封板计划：仅 UI，无真实行情。"],
      actions: [{ label: "执行封板计划", close: true }],
      accent: Theme.colors.primaryPurple
    });
  }
}


