import { Node } from "cc";
import type { PageKey } from "../../store/ViewModels";
import type { ScreenManager } from "../ScreenManager";
import { Theme } from "../theme/Theme";
import { UiFactory } from "../theme/UiFactory";

export class ToolCard {
  static create(parent: Node, manager: ScreenManager, title: string, desc: string, pageKey: PageKey, color = Theme.colors.primaryPurple): Node {
    const box = UiFactory.vertical(`Tool_${title}`, parent, Theme.spacing.xs);
    UiFactory.label("Title", box, title, Theme.fontSize.small, Theme.colors.textDark, 200, 30);
    UiFactory.label("Desc", box, desc, Theme.fontSize.tiny, Theme.colors.textSub, 200, 42);
    UiFactory.button(box, "打开", 160, 48, color, () => manager.openPage(pageKey));
    return box;
  }
}

