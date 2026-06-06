import { DialogPage, type DialogPageManager } from "../components/DialogPage";
import { Theme } from "../theme/Theme";

export class NetworkPage extends DialogPage {
  constructor(manager: DialogPageManager) {
    super(manager, {
      title: "关系网络",
      hero: "人脉就是钱脉",
      desc: "核心人脉图均为虚构角色关系。",
      lines: ["游资大佬：强度 99%", "财经大V：强度 82%", "监管熟人：强度 70%", "散户代表：强度 10%", "关系强度越高，台词越浮夸。"],
      actions: [{ label: "收起网络", close: true }],
      accent: Theme.colors.primaryPurple
    });
  }
}


