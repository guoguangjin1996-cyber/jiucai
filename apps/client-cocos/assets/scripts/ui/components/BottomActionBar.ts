import { Node } from "cc";
import type { PageKey } from "../../store/ViewModels";
import type { ScreenManager } from "../ScreenManager";
import { Theme } from "../theme/Theme";
import { UiFactory } from "../theme/UiFactory";

export class BottomActionBar {
  static create(parent: Node, manager: ScreenManager, items: Array<{ label: string; key: PageKey }>): Node {
    const bar = UiFactory.horizontal("BottomActionBar", parent, Theme.spacing.xs);
    for (const item of items) {
      UiFactory.button(bar, item.label, 112, 58, Theme.colors.panelSoft, () => manager.openPage(item.key));
    }
    return bar;
  }
}

