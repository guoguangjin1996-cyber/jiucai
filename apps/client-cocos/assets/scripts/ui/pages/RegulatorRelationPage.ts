import { DialogPage, type DialogPageManager } from "../components/DialogPage";
import { Theme } from "../theme/Theme";

export class RegulatorRelationPage extends DialogPage {
  constructor(manager: DialogPageManager) {
    super(manager, {
      title: "监管关系",
      hero: "探头正在闪烁",
      desc: "监管关系网、降温策略、甩锅策略和公关动作。",
      lines: ["关系网：监管探头、公告小纸条、问询小黑屋", "降温策略：讲笑话", "甩锅策略：锅自己长腿跑了", "公关动作：喝茶并点头。"],
      actions: [{ label: "装无辜", close: true }],
      accent: Theme.colors.primaryPurple
    });
  }
}


