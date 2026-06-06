import { Node } from "cc";
import { Theme } from "../theme/Theme";
import { UiFactory } from "../theme/UiFactory";

export class JCTitleBar {
  static create(parent: Node, title: string, subtitle: string, onBack?: () => void): Node {
    const bar = UiFactory.horizontal("TitleBar", parent, Theme.spacing.md);
    if (onBack) UiFactory.button(bar, "‹", 70, 64, Theme.colors.panelSoft, onBack);
    UiFactory.label("Title", bar, title, Theme.fontSize.subtitle, Theme.colors.textDark, 420, 64);
    UiFactory.label("Subtitle", bar, subtitle, Theme.fontSize.small, Theme.colors.textSub, 180, 64);
    return bar;
  }
}

