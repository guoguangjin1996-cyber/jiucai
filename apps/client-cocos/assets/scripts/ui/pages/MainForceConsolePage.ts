import { DialogPage, type DialogPageManager } from "../components/DialogPage";
import { Theme } from "../theme/Theme";

export class MainForceConsolePage extends DialogPage {
  constructor(manager: DialogPageManager) {
    super(manager, {
      title: "操盘台",
      hero: "主力大佬在线操盘中",
      desc: "今天也是收割韭菜的一天，全部为局内虚构演出。",
      lines: ["今日战绩：收割人数 3", "今日收益：+123,456,789 操盘点", "市场控制力：87%", "战术选择：拉升、洗盘、出货、对倒烟雾弹"],
      actions: [{ label: "战术确认", close: true }],
      accent: Theme.colors.primaryPurple
    });
  }
}


