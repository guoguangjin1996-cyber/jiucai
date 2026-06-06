import { Node } from "cc";
import { Theme } from "../theme/Theme";
import { UiFactory } from "../theme/UiFactory";

export class JCButton {
  static create(parent: Node, text: string, onClick: () => void, color = Theme.colors.primaryGreen, disabled = false): Node {
    return UiFactory.button(parent, text, 210, 76, color, onClick, disabled);
  }
}

