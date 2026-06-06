import { Node } from "cc";
import type { MockGameState } from "../../store/ViewModels";
import { Theme } from "../theme/Theme";
import { JCPanel } from "./JCPanel";

export class MutationCard {
  static create(parent: Node, state: MockGameState): Node {
    return JCPanel.create(parent, `盘面异变：${state.mutation.name}`, [state.mutation.desc], 320, Theme.colors.panelSoft);
  }
}

