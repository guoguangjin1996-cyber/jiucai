import { DialogPage, type DialogPageManager } from "../components/DialogPage";
import { Theme } from "../theme/Theme";

export class MessagePublishPage extends DialogPage {
  constructor(manager: DialogPageManager) {
    super(manager, {
      title: "消息发布",
      hero: "话术发射器启动",
      desc: "消息类型、内容编辑、发布范围、情绪强度和预期效果。",
      lines: ["消息类型：棉花糖利好", "发布范围：全房间弹幕", "情绪强度：82%", "预期效果：韭菜们集体眨眼。"],
      actions: [{ label: "发布消息", close: true }],
      accent: Theme.colors.primaryPurple
    });
  }
}


