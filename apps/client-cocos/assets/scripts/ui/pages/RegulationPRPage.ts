import { DialogPage, type DialogPageManager } from "../components/DialogPage";
import { Theme } from "../theme/Theme";

export class RegulationPRPage extends DialogPage {
  constructor(manager: DialogPageManager) {
    super(manager, {
      title: "监管公关",
      hero: "危机？不存在的！",
      desc: "监管热度过高时，主力只能先假装无辜。",
      lines: ["监管风险值：23/100", "公关能量：8/10", "舆情应对策略：装无辜、甩锅、洗白、喝茶", "今日热点：虚构标的波动像奶茶摇摇杯。"],
      actions: [{ label: "降温", close: true }],
      accent: Theme.colors.primaryPurple
    });
  }
}


