import { Node } from "cc";
import { getLearningScenario } from "../store/LocalShared";
import { Palette, label, panel } from "./UiKit";

export class LearningScenarioScreen {
  render(scenarioId: string): Node {
    const scenario = getLearningScenario(scenarioId);
    const root = panel("LearningScenarioScreen", 720, 1080, Palette.sky);

    if (scenario === undefined) {
      root.addChild(label("教学关卡不存在", 36, Palette.danger));
      return root;
    }

    root.addChild(label(scenario.title, 40, Palette.textDark));
    root.addChild(label(scenario.learningGoal, 19, Palette.success));
    root.addChild(label(scenario.riskTip, 18, Palette.warning));

    for (const step of scenario.steps) {
      const card = panel(`LearningStep:${step.id}`, 620, 104, Palette.panel);
      card.addChild(label(`${step.title} · ${step.phase}`, 20, Palette.textDark));
      card.addChild(label(step.instruction, 17, Palette.textSub));
      card.addChild(label(step.explanationAfterAction, 16, Palette.textSub));
      root.addChild(card);
    }

    return root;
  }
}
