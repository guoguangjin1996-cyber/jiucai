import { DialogPage, type DialogPageManager } from "../components/DialogPage";
import { Theme } from "../theme/Theme";

export class HomePage extends DialogPage {
  constructor(manager: DialogPageManager) {
    super(manager, {
      title: "首页",
      hero: "今日先活着",
      desc: "今日目标、韭菜心情指数、提醒和小贴士。",
      lines: ["目标：活着离开市场", "心情指数：68，正在假装镇定", "小贴士：这是虚构娱乐模拟。"],
      actions: [{ label: "好嘞", close: true }],
      accent: Theme.colors.primaryGreen
    });
  }
}


