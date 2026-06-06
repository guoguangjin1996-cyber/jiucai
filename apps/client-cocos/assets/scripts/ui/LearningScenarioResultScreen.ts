import { Node } from "cc";
import { getLearningScenario } from "../store/LocalShared";
import { Palette, label, panel } from "./UiKit";

export class LearningScenarioResultScreen {
  render(scenarioId: string): Node {
    const scenario = getLearningScenario(scenarioId);
    const root = panel("LearningScenarioResultScreen", 720, 1080, Palette.sky);

    if (scenario === undefined) {
      root.addChild(label("复盘数据等待生成", 36, Palette.textDark));
      return root;
    }

    root.addChild(label(`${scenario.title} · 复盘`, 38, Palette.textDark));
    root.addChild(label(scenario.summary, 20, Palette.textSub));
    root.addChild(label("本关只解释虚构盘面规则，不提供真实交易指引。", 18, Palette.warning));
    return root;
  }
}
