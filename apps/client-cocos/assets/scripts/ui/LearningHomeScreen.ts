import { Node } from "cc";
import { LEARNING_SCENARIOS } from "../store/LocalShared";
import { Palette, button, label, panel } from "./UiKit";

export class LearningHomeScreen {
  render(onSelect: (scenarioId: string) => void = () => undefined): Node {
    const root = panel("LearningHomeScreen", 720, 1080, Palette.sky);
    root.addChild(label("规则体验课堂", 42, Palette.textDark));
    root.addChild(label("用虚构五行市场理解局内阶段、盘面风格和风险现象", 19, Palette.textSub));

    for (const scenario of LEARNING_SCENARIOS) {
      root.addChild(button(scenario.title, () => onSelect(scenario.id), Palette.cream, 560, 58));
    }

    root.addChild(label("仅用于规则学习和娱乐体验，不接入真实行情或真实代码。", 17, Palette.textSub));
    return root;
  }
}
