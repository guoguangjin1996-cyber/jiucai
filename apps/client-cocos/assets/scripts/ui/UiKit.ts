import { Button, Color, Graphics, Label, Layout, Node, UITransform } from "cc";

export const Palette = {
  sky: new Color(221, 245, 255, 255),
  cream: new Color(255, 248, 232, 255),
  mint: new Color(234, 248, 233, 255),
  purple: new Color(243, 234, 254, 255),
  panel: new Color(255, 255, 255, 248),
  panelSoft: new Color(255, 253, 246, 255),
  green: new Color(111, 210, 140, 255),
  red: new Color(255, 125, 125, 255),
  blue: new Color(114, 184, 255, 255),
  purpleStrong: new Color(169, 139, 255, 255),
  yellow: new Color(255, 215, 106, 255),
  textDark: new Color(47, 42, 37, 255),
  textSub: new Color(123, 117, 110, 255),
  danger: new Color(255, 90, 95, 255),
  success: new Color(56, 178, 107, 255),
  warning: new Color(255, 176, 46, 255),
  border: new Color(231, 220, 200, 255)
};

export function panel(name: string, width: number, height: number, color = Palette.panel): Node {
  const node = new Node(name);
  node.addComponent(UITransform).setContentSize(width, height);
  const graphics = node.addComponent(Graphics);
  graphics.fillColor = color;
  graphics.rect(-width / 2, -height / 2, width, height);
  graphics.fill();
  const layout = node.addComponent(Layout);
  layout.type = Layout.Type.VERTICAL;
  layout.resizeMode = Layout.ResizeMode.NONE;
  layout.spacingY = 10;
  layout.paddingTop = 14;
  layout.paddingLeft = 16;
  layout.paddingRight = 16;
  layout.paddingBottom = 14;
  return node;
}

export function row(name: string, width: number, height: number, color = new Color(255, 255, 255, 0)): Node {
  const node = panel(name, width, height, color);
  const layout = node.getComponent(Layout);
  if (layout !== null) {
    layout.type = Layout.Type.HORIZONTAL;
    layout.spacingX = 12;
    layout.spacingY = 0;
  }
  return node;
}

export function label(text: string, size = 22, color = Palette.textDark): Node {
  const node = new Node(`Label:${text.slice(0, 16)}`);
  const labelComponent = node.addComponent(Label);
  labelComponent.string = text;
  labelComponent.fontSize = size;
  labelComponent.lineHeight = size + 7;
  labelComponent.color = color;
  return node;
}

export function button(text: string, onClick: () => void, color = Palette.cream, width = 220, height = 58): Node {
  const node = panel(`Button:${text}`, width, height, color);
  node.addComponent(Button).node.on(Button.EventType.CLICK, onClick);
  node.addChild(label(text, 20, Palette.textDark));
  return node;
}

export function badge(text: string, color = Palette.mint): Node {
  const node = panel(`Badge:${text}`, 168, 44, color);
  node.addChild(label(text, 17, Palette.textDark));
  return node;
}

export function statLine(name: string, value: string, color = Palette.textDark): Node {
  const line = row(`Stat:${name}`, 360, 36);
  line.addChild(label(name, 17, Palette.textSub));
  line.addChild(label(value, 19, color));
  return line;
}

export function clear(node: Node): void {
  for (const child of [...node.children]) child.destroy();
}
