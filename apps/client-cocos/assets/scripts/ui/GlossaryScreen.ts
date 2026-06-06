import { Node } from "cc";
import { GLOSSARY_TERMS } from "../store/LocalShared";
import { Palette, label, panel } from "./UiKit";

export class GlossaryScreen {
  render(): Node {
    const root = panel("GlossaryScreen", 720, 1080, Palette.sky);
    root.addChild(label("盘面术语图鉴", 40, Palette.textDark));
    root.addChild(label("所有解释均为游戏内虚构规则体验", 18, Palette.textSub));

    for (const term of GLOSSARY_TERMS.slice(0, 9)) {
      const card = panel(`Glossary:${term.id}`, 620, 108, Palette.panel);
      card.addChild(label(term.term, 22, Palette.textDark));
      card.addChild(label(term.inGameMeaning, 16, Palette.textSub));
      card.addChild(label(term.riskTip, 16, Palette.warning));
      root.addChild(card);
    }

    return root;
  }
}
