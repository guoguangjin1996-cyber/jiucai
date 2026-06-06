declare module "cc" {
  export namespace _decorator {
    export function ccclass(name?: string): ClassDecorator;
    export function property(...args: unknown[]): PropertyDecorator;
  }

  export class Color {
    constructor(r?: number, g?: number, b?: number, a?: number);
    static WHITE: Color;
    static BLACK: Color;
    r: number;
    g: number;
    b: number;
    a: number;
  }

  export class Vec3 {
    constructor(x?: number, y?: number, z?: number);
    x: number;
    y: number;
    z: number;
  }

  export class Node {
    constructor(name?: string);
    name: string;
    parent: Node | null;
    children: Node[];
    active: boolean;
    addChild(child: Node): void;
    removeFromParent(): void;
    destroy(): void;
    setPosition(x: number, y: number, z?: number): void;
    setScale(x: number, y?: number, z?: number): void;
    addComponent<T>(component: new () => T): T;
    getComponent<T>(component: new () => T): T | null;
    on(type: string, callback: () => void, target?: unknown): void;
  }

  export class Component {
    node: Node;
  }

  export class UITransform {
    setContentSize(width: number, height: number): void;
    width: number;
    height: number;
  }

  export class Sprite {
    color: Color;
    spriteFrame: SpriteFrame | null;
  }

  export class SpriteFrame {
    texture: Texture2D | null;
  }

  export class Texture2D {}

  export class ImageAsset {}

  export class Label {
    string: string;
    fontSize: number;
    color: Color;
    lineHeight: number;
    horizontalAlign: number;
    verticalAlign: number;
    overflow: number;
    static HorizontalAlign: { LEFT: number; CENTER: number; RIGHT: number };
    static VerticalAlign: { TOP: number; CENTER: number; BOTTOM: number };
    static Overflow: { NONE: number; SHRINK: number; RESIZE_HEIGHT: number };
  }

  export class Button {
    node: Node;
    interactable: boolean;
    static EventType: { CLICK: string };
  }

  export class Layout {
    type: number;
    resizeMode: number;
    spacingX: number;
    spacingY: number;
    paddingTop: number;
    paddingBottom: number;
    paddingLeft: number;
    paddingRight: number;
    static Type: { HORIZONTAL: number; VERTICAL: number; GRID: number };
    static ResizeMode: { NONE: number; CONTAINER: number; CHILDREN: number };
  }

  export class Widget {
    isAlignTop: boolean;
    isAlignBottom: boolean;
    isAlignLeft: boolean;
    isAlignRight: boolean;
    top: number;
    bottom: number;
    left: number;
    right: number;
  }

  export class Graphics {
    strokeColor: Color;
    fillColor: Color;
    lineWidth: number;
    clear(): void;
    moveTo(x: number, y: number): void;
    lineTo(x: number, y: number): void;
    rect(x: number, y: number, width: number, height: number): void;
    circle(x: number, y: number, radius: number): void;
    stroke(): void;
    fill(): void;
  }

  export const resources: {
    load<T>(path: string, type: new () => T, callback: (error: Error | null, asset: T | null) => void): void;
  };
}
