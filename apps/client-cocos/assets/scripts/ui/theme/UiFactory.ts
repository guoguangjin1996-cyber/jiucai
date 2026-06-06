import { Button, Color, Graphics, Label, Layout, Node, UITransform, Widget } from "cc";
import { Theme } from "./Theme";

export type Align = "left" | "center" | "right";

export function hexToColor(hex: string, alpha = 255): Color {
  const clean = hex.replace("#", "");
  const r = Number.parseInt(clean.slice(0, 2), 16);
  const g = Number.parseInt(clean.slice(2, 4), 16);
  const b = Number.parseInt(clean.slice(4, 6), 16);
  return new Color(r, g, b, alpha);
}

export class UiFactory {
  static node(name: string, parent?: Node): Node {
    const node = new Node(name);
    if (parent) parent.addChild(node);
    return node;
  }

  static rect(name: string, parent: Node, width: number, height: number, color: string = Theme.colors.panel): Node {
    const node = UiFactory.node(name, parent);
    node.addComponent(UITransform).setContentSize(width, height);
    const graphics = node.addComponent(Graphics);
    graphics.fillColor = hexToColor(color);
    graphics.rect(-width / 2, -height / 2, width, height);
    graphics.fill();
    return node;
  }

  static label(
    name: string,
    parent: Node,
    text: string,
    fontSize: number = Theme.fontSize.body,
    color: string = Theme.colors.textDark,
    width: number = 0,
    height: number = 0,
    align: Align = "center"
  ): Node {
    const node = UiFactory.node(name, parent);
    if (width > 0 || height > 0) node.addComponent(UITransform).setContentSize(width, height);
    const label = node.addComponent(Label);
    label.string = text;
    label.fontSize = fontSize;
    label.lineHeight = Math.round(fontSize * 1.35);
    label.color = hexToColor(color);
    label.horizontalAlign =
      align === "left" ? Label.HorizontalAlign.LEFT : align === "right" ? Label.HorizontalAlign.RIGHT : Label.HorizontalAlign.CENTER;
    label.verticalAlign = Label.VerticalAlign.CENTER;
    label.overflow = Label.Overflow.SHRINK;
    return node;
  }

  static button(
    parent: Node,
    text: string,
    width: number,
    height: number,
    color: string,
    onClick: () => void,
    disabled = false
  ): Node {
    const node = UiFactory.rect(`Button_${text}`, parent, width, height, disabled ? Theme.colors.softBorder : color);
    const button = node.addComponent(Button);
    button.interactable = !disabled;
    if (!disabled) node.on(Button.EventType.CLICK, onClick);
    UiFactory.label("Label", node, text, Math.min(Theme.fontSize.body, Math.floor(height * 0.48)), Theme.colors.textDark, width, height);
    return node;
  }

  static vertical(name: string, parent: Node, spacing: number = Theme.spacing.sm): Node {
    const node = UiFactory.node(name, parent);
    node.addComponent(UITransform).setContentSize(680, 0);
    const layout = node.addComponent(Layout);
    layout.type = Layout.Type.VERTICAL;
    layout.resizeMode = Layout.ResizeMode.CONTAINER;
    layout.spacingY = spacing;
    return node;
  }

  static horizontal(name: string, parent: Node, spacing: number = Theme.spacing.sm): Node {
    const node = UiFactory.node(name, parent);
    node.addComponent(UITransform).setContentSize(680, 0);
    const layout = node.addComponent(Layout);
    layout.type = Layout.Type.HORIZONTAL;
    layout.resizeMode = Layout.ResizeMode.CONTAINER;
    layout.spacingX = spacing;
    return node;
  }

  static widgetFill(node: Node, margin = 0): void {
    const widget = node.addComponent(Widget);
    widget.isAlignTop = true;
    widget.isAlignBottom = true;
    widget.isAlignLeft = true;
    widget.isAlignRight = true;
    widget.top = margin;
    widget.bottom = margin;
    widget.left = margin;
    widget.right = margin;
  }

  static position(node: Node, x: number, y: number): Node {
    node.setPosition(x, y, 0);
    return node;
  }

  static textBlock(parent: Node, lines: string[], width = 620): Node {
    return UiFactory.label("TextBlock", parent, lines.join("\n"), Theme.fontSize.small, Theme.colors.textSub, width, 0, "left");
  }
}
