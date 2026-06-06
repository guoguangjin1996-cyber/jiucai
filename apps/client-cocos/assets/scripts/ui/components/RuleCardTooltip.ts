import { Node } from "cc";
import type { GlossaryTerm } from "../../store/LocalShared";
import { Palette, label, panel } from "../UiKit";

export class RuleCardTooltip {
  static create(term: GlossaryTerm): Node {
    const root = panel(`RuleCardTooltip:${term.id}`, 460, 220, Palette.cream);
    root.addChild(label(term.term, 22, Palette.textDark));
    root.addChild(label(`游戏内含义：${term.inGameMeaning}`, 15, Palette.textSub));
    root.addChild(label(`风险提示：${term.riskTip}`, 15, Palette.warning));
    root.addChild(label(`例子：${term.example}`, 15, Palette.textSub));
    return root;
  }
}
