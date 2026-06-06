import { DialogPage, type DialogPageManager } from "../components/DialogPage";
import { Theme } from "../theme/Theme";

export class PowerPage extends DialogPage {
  constructor(manager: DialogPageManager) {
    super(manager, {
      title: "我的势力",
      hero: "建设你的韭菜帝国",
      desc: "浮空小岛、韭菜研究所、洗盘培训营，全部只服务局内演出。",
      lines: ["势力等级：Lv.9 韭菜之王", "建筑：收割机工厂、韭菜研究所、洗盘培训营、印钞造币厂", "小弟：韭韭、韭小新、韭菜花、韭小韭"],
      actions: [{ label: "升级预览", close: true }],
      accent: Theme.colors.primaryPurple
    });
  }
}


