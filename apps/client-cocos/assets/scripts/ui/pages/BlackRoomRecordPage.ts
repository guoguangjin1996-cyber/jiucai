import { DialogPage, type DialogPageManager } from "../components/DialogPage";
import { Theme } from "../theme/Theme";

export class BlackRoomRecordPage extends DialogPage {
  constructor(manager: DialogPageManager) {
    super(manager, {
      title: "小黑屋记录",
      hero: "门口贴着虚构二字",
      desc: "处罚记录、黑名单管理、申诉记录和今日小黑屋数据。",
      lines: ["处罚记录：09:48 墨镜太闪，被探头关注", "黑名单：暂无真实主体", "申诉记录：我只是个路过的 K 线", "一键清空小黑屋按钮：仅 UI，暂不接真实逻辑。"],
      actions: [{ label: "一键清空小黑屋", close: true }],
      accent: Theme.colors.primaryPurple
    });
  }
}


