import { DialogPage, type DialogPageManager } from "../components/DialogPage";
import { Theme } from "../theme/Theme";

export class MinuteChartPage extends DialogPage {
  constructor(manager: DialogPageManager) {
    super(manager, {
      title: "分时",
      hero: "又上又下，主打一个心电图！",
      desc: "展示模拟分时图、涨跌停线、今日情绪指数和弹幕开关。",
      lines: ["心电图线：正在左右横跳", "情绪指数：76°C 虚构过热", "弹幕：已开启，准备接收抽象吐槽。"],
      actions: [{ label: "关闭", close: true }],
      accent: Theme.colors.primaryBlue
    });
  }
}


