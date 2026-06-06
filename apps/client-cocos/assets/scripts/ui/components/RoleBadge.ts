import { Node } from "cc";
import type { MockRole } from "../../store/ViewModels";
import { Theme } from "../theme/Theme";
import { UiFactory } from "../theme/UiFactory";

export class RoleBadge {
  static create(parent: Node, role: MockRole): Node {
    return UiFactory.label("RoleBadge", parent, role === "retail" ? "韭菜阵营" : "隐藏主力", Theme.fontSize.small, role === "retail" ? Theme.colors.success : Theme.colors.primaryPurple, 180, 42);
  }
}

