import { Button, Color, Graphics, Label, Layout, Node, UITransform } from "cc";

export const Palette = {
  sky: new Color(221, 245, 255, 255),
  skyDeep: new Color(183, 229, 255, 255),
  grass: new Color(178, 232, 156, 255),
  cream: new Color(255, 248, 232, 255),
  mint: new Color(234, 248, 233, 255),
  purple: new Color(243, 234, 254, 255),
  lilac: new Color(225, 213, 255, 255),
  panel: new Color(255, 255, 255, 248),
  panelSoft: new Color(255, 253, 246, 255),
  green: new Color(111, 210, 140, 255),
  greenDeep: new Color(64, 151, 67, 255),
  red: new Color(255, 125, 125, 255),
  redDeep: new Color(212, 72, 78, 255),
  blue: new Color(114, 184, 255, 255),
  blueDeep: new Color(48, 130, 210, 255),
  purpleStrong: new Color(169, 139, 255, 255),
  yellow: new Color(255, 215, 106, 255),
  orange: new Color(255, 176, 46, 255),
  textDark: new Color(47, 42, 37, 255),
  textSub: new Color(123, 117, 110, 255),
  danger: new Color(255, 90, 95, 255),
  success: new Color(56, 178, 107, 255),
  warning: new Color(255, 176, 46, 255),
  border: new Color(231, 220, 200, 255),
  shadow: new Color(87, 73, 51, 58)
};

export type Align = "left" | "center" | "right";

export function clear(node: Node): void {
  for (const child of [...node.children]) child.destroy();
}

export function place(parent: Node, child: Node, x: number, y: number): Node {
  child.setPosition(x, y);
  parent.addChild(child);
  return child;
}

export function screen(name: string, color = Palette.sky): Node {
  return card(name, 750, 1334, color, 0, false);
}

export function card(name: string, width: number, height: number, color = Palette.panel, radius = 24, shadow = true): Node {
  const node = new Node(name);
  node.addComponent(UITransform).setContentSize(width, height);
  if (shadow) {
    const shadowG = node.addComponent(Graphics);
    shadowG.fillColor = Palette.shadow;
    drawRoundRect(shadowG, -width / 2 + 7, -height / 2 - 7, width, height, radius);
    shadowG.fill();
  }
  const graphics = node.addComponent(Graphics);
  graphics.fillColor = color;
  drawRoundRect(graphics, -width / 2, -height / 2, width, height, radius);
  graphics.fill();
  return node;
}

export function panel(name: string, width: number, height: number, color = Palette.panel): Node {
  const node = card(name, width, height, color, 22);
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
  return textNode(`Label:${text.slice(0, 16)}`, text, 360, size + 10, size, color);
}

export function textNode(
  name: string,
  text: string,
  width: number,
  height: number,
  size = 22,
  color = Palette.textDark,
  align: Align = "center"
): Node {
  const node = new Node(name);
  node.addComponent(UITransform).setContentSize(width, height);
  const labelComponent = node.addComponent(Label);
  labelComponent.string = text;
  labelComponent.fontSize = size;
  labelComponent.lineHeight = size + 7;
  labelComponent.color = color;
  labelComponent.horizontalAlign =
    align === "left" ? Label.HorizontalAlign.LEFT : align === "right" ? Label.HorizontalAlign.RIGHT : Label.HorizontalAlign.CENTER;
  labelComponent.verticalAlign = Label.VerticalAlign.CENTER;
  labelComponent.overflow = Label.Overflow.SHRINK;
  return node;
}

export function textAt(
  parent: Node,
  text: string,
  x: number,
  y: number,
  width: number,
  height: number,
  size = 22,
  color = Palette.textDark,
  align: Align = "center"
): Node {
  return place(parent, textNode(`Text:${text.slice(0, 12)}`, text, width, height, size, color, align), x, y);
}

export function jellyButton(
  text: string,
  onClick: () => void,
  width: number,
  height: number,
  color = Palette.green,
  textColor = Palette.textDark
): Node {
  const node = card(`Button:${text}`, width, height, color, 28, true);
  node.addComponent(Button).node.on(Button.EventType.CLICK, onClick);
  const shine = card(`ButtonShine:${text}`, width - 26, Math.max(10, height * 0.18), new Color(255, 255, 255, 74), 999, false);
  place(node, shine, 0, height * 0.24);
  textAt(node, text, 0, 0, width - 24, height - 8, Math.min(28, Math.max(18, height * 0.34)), textColor);
  return node;
}

export function button(text: string, onClick: () => void, color = Palette.cream, width = 220, height = 58): Node {
  return jellyButton(text, onClick, width, height, color);
}

export function badge(text: string, color = Palette.mint): Node {
  const node = card(`Badge:${text}`, 150, 44, color, 18, true);
  textAt(node, text, 0, 0, 132, 36, 17, Palette.textDark);
  return node;
}

export function statLine(name: string, value: string, color = Palette.textDark): Node {
  const line = row(`Stat:${name}`, 360, 36);
  line.addChild(label(name, 17, Palette.textSub));
  line.addChild(label(value, 19, color));
  return line;
}

export function pill(parent: Node, text: string, x: number, y: number, width: number, color = Palette.cream): Node {
  const node = card(`Pill:${text}`, width, 42, color, 999, true);
  textAt(node, text, 0, 0, width - 18, 34, 16, Palette.textDark);
  return place(parent, node, x, y);
}

export function progressBar(parent: Node, x: number, y: number, width: number, value: number, color = Palette.green): Node {
  const bg = card("ProgressBg", width, 18, new Color(233, 235, 230, 255), 999, false);
  const fillWidth = Math.max(16, Math.min(width, width * value));
  place(bg, card("ProgressFill", fillWidth, 18, color, 999, false), (fillWidth - width) / 2, 0);
  return place(parent, bg, x, y);
}

export function drawRoundRect(graphics: Graphics, x: number, y: number, width: number, height: number, radius: number): void {
  graphics.rect(x, y, width, height);
}

export function leekMascot(name = "LeekMascot", scale = 1): Node {
  const node = new Node(name);
  const g = node.addComponent(Graphics);
  g.fillColor = new Color(255, 250, 238, 255);
  g.circle(0, -8 * scale, 48 * scale);
  g.fill();
  g.fillColor = Palette.green;
  const bladeRects: Array<[number, number, number, number]> = [
    [-28, 44, 20, 70],
    [0, 54, 22, 82],
    [28, 44, 20, 70]
  ];
  for (const [x, y, w, h] of bladeRects) {
    g.rect((x - w / 2) * scale, y * scale, w * scale, h * scale);
  }
  g.fill();
  g.fillColor = Palette.textDark;
  g.circle(-16 * scale, 0, 4 * scale);
  g.circle(16 * scale, 0, 4 * scale);
  g.fill();
  textAt(node, "o", 0, -20 * scale, 40 * scale, 24 * scale, 18 * scale, Palette.red);
  return node;
}

export function bossMascot(name = "BossMascot", scale = 1): Node {
  const node = new Node(name);
  const g = node.addComponent(Graphics);
  g.fillColor = new Color(48, 45, 58, 255);
  g.circle(0, 0, 56 * scale);
  g.fill();
  g.fillColor = Palette.yellow;
  g.rect(-36 * scale, 52 * scale, 72 * scale, 18 * scale);
  g.circle(-28 * scale, 70 * scale, 10 * scale);
  g.circle(0, 78 * scale, 12 * scale);
  g.circle(28 * scale, 70 * scale, 10 * scale);
  g.fill();
  g.fillColor = new Color(12, 12, 18, 255);
  g.rect(-34 * scale, 10 * scale, 28 * scale, 12 * scale);
  g.rect(6 * scale, 10 * scale, 28 * scale, 12 * scale);
  g.fill();
  textAt(node, "主力", 0, -34 * scale, 80 * scale, 28 * scale, 18 * scale, Palette.yellow);
  return node;
}

export function kLineMonster(name = "KLineMonster", scale = 1): Node {
  const node = new Node(name);
  const g = node.addComponent(Graphics);
  g.fillColor = new Color(69, 166, 95, 255);
  g.rect(-50 * scale, -35 * scale, 100 * scale, 86 * scale);
  g.fill();
  g.strokeColor = Palette.red;
  g.lineWidth = 6 * scale;
  g.moveTo(-86 * scale, -24 * scale);
  g.lineTo(-40 * scale, 28 * scale);
  g.lineTo(-10 * scale, 4 * scale);
  g.lineTo(34 * scale, 52 * scale);
  g.lineTo(88 * scale, -12 * scale);
  g.stroke();
  g.fillColor = Palette.textDark;
  g.circle(-18 * scale, 12 * scale, 6 * scale);
  g.circle(18 * scale, 12 * scale, 6 * scale);
  g.fill();
  textAt(node, "K!", 0, -18 * scale, 70 * scale, 28 * scale, 18 * scale, Palette.panel);
  return node;
}
