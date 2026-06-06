import { DialogPage, type DialogPageManager } from "../components/DialogPage";
import { Theme } from "../theme/Theme";

export class MarketMonitorPage extends DialogPage {
  constructor(manager: DialogPageManager) {
    super(manager, {
      title: "市场监控",
      hero: "全网盯盘中",
      desc: "谁在恐慌，一眼看穿，仍然只是虚构娱乐模拟。",
      lines: ["A股热度：68", "情绪温度：76°C 过热", "韭菜警报：88%", "可疑目标：原来是韭、绿油油、涨停幻想家"],
      actions: [{ label: "继续盯盘", close: true }],
      accent: Theme.colors.primaryPurple
    });
  }
}


