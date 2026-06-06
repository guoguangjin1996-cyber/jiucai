import { Node } from "cc";
import { Theme } from "../theme/Theme";
import { UiFactory } from "../theme/UiFactory";

export class JCPanel {
  static create(parent: Node, title: string, lines: string[], width = 660, color: string = Theme.colors.panel): Node {
    const panel = UiFactory.rect(`Panel_${title}`, parent, width, 0, color);
    const content = UiFactory.vertical("PanelContent", panel, Theme.spacing.sm);
    UiFactory.label("PanelTitle", content, title, Theme.fontSize.body, Theme.colors.textDark, width - 32, 40, "left");
    UiFactory.textBlock(content, lines, width - 32);
    return panel;
  }
}
