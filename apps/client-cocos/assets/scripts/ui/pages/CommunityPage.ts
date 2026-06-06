import { DialogPage, type DialogPageManager } from "../components/DialogPage";
import { Theme } from "../theme/Theme";

export class CommunityPage extends DialogPage {
  constructor(manager: DialogPageManager) {
    super(manager, {
      title: "社区",
      hero: "全员嘴强王者",
      desc: "热议话题、大V发言、玩家吐槽和弹幕评论。",
      lines: ["热议：小韭菜为何突然沉默", "大V：我只负责把话说圆", "玩家吐槽：我是来学习的，结果学会了哭。"],
      actions: [{ label: "发帖", close: true }],
      accent: Theme.colors.primaryPurple
    });
  }
}


