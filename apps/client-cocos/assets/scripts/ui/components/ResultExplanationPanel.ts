import { Node } from "cc";
import type { PlayerResultExplanation } from "../../store/LocalShared";
import { Palette, label, panel } from "../UiKit";

export class ResultExplanationPanel {
  static create(explanation: PlayerResultExplanation): Node {
    const root = panel("ResultExplanationPanel", 620, 360, Palette.panel);
    root.addChild(label(`${explanation.nickname} · ROI ${(explanation.roi * 100).toFixed(2)}% · 第${explanation.rank}名`, 21, Palette.textDark));
    root.addChild(label(`主要正向来源：${explanation.mainProfitSource}`, 16, Palette.success));
    root.addChild(label(`主要回撤来源：${explanation.mainLossSource}`, 16, Palette.warning));
    root.addChild(label(`触达规则：${explanation.touchedRules.join(" / ") || "暂无"}`, 16, Palette.textSub));

    for (const lesson of explanation.riskLessons.slice(0, 3)) {
      root.addChild(label(lesson, 15, Palette.textSub));
    }

    return root;
  }
}
