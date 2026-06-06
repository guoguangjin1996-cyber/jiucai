import { Node } from "cc";
import type { ScreenManager } from "./ScreenManager";

export abstract class BaseScreen {
  readonly node = new Node(this.constructor.name);

  constructor(protected readonly manager: ScreenManager) {}

  show(parent: Node): void {
    parent.addChild(this.node);
    this.render();
  }

  destroy(): void {
    this.node.destroy();
  }

  protected clear(): void {
    for (const child of [...this.node.children]) child.destroy();
  }

  protected abstract render(): void;
}

