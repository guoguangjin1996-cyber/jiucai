import { Node } from "cc";
import type { MockGameState } from "../../store/ViewModels";
import { Theme } from "../theme/Theme";
import { JCPanel } from "./JCPanel";

export class MarketNoticeCard {
  static create(parent: Node, state: MockGameState): Node {
    return JCPanel.create(parent, state.news.title, [state.news.desc, "虚构娱乐模拟，不构成投资建议"], 320, Theme.colors.panel);
  }
}

