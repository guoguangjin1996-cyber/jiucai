import { Node } from "cc";
import { Theme } from "../theme/Theme";
import { UiFactory } from "../theme/UiFactory";

export class ProgressGauge {
  static create(parent: Node, title: string, value: number, color: string = Theme.colors.primaryGreen): Node {
    const box = UiFactory.vertical(`Gauge_${title}`, parent, Theme.spacing.xs);
    UiFactory.label("Title", box, `${title} ${value}%`, Theme.fontSize.small, Theme.colors.textDark, 220, 32, "left");
    const track = UiFactory.rect("Track", box, 220, 22, Theme.colors.softBorder);
    const fillWidth = Math.max(8, Math.min(220, Math.round(220 * value / 100)));
    UiFactory.rect("Fill", track, fillWidth, 22, color);
    return box;
  }
}
