import { Node } from "cc";
import { Theme } from "../theme/Theme";
import { UiFactory } from "../theme/UiFactory";

export class CuteNumberText {
  static create(parent: Node, label: string, value: string, positive = true): Node {
    return UiFactory.label(`CuteNumber_${label}`, parent, `${label}：${value}`, Theme.fontSize.small, positive ? Theme.colors.success : Theme.colors.danger, 300, 34, "left");
  }
}

