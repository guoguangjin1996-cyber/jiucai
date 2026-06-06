import { Graphics, Node } from "cc";
import { Theme } from "../theme/Theme";
import { hexToColor, UiFactory } from "../theme/UiFactory";

export class MockKLineChart {
  static create(parent: Node, width = 420, height = 220): Node {
    const chart = UiFactory.rect("MockKLineChart", parent, width, height, Theme.colors.panelSoft);
    const graphics = chart.addComponent(Graphics);
    graphics.lineWidth = 4;
    graphics.strokeColor = hexToColor(Theme.colors.primaryRed);
    const points: Array<[number, number]> = [
      [16, 122],
      [54, 142],
      [92, 92],
      [130, 176],
      [168, 150],
      [206, 102],
      [244, 118],
      [282, 82],
      [320, 100],
      [360, 70],
      [404, 90]
    ];
    const first = points[0];
    if (first) graphics.moveTo(first[0] - width / 2, first[1] - height / 2);
    for (const [x, y] of points.slice(1)) graphics.lineTo(x - width / 2, y - height / 2);
    graphics.stroke();
    UiFactory.label("Tag1", chart, "假装拉升", Theme.fontSize.tiny, Theme.colors.primaryPurple, 130, 28);
    UiFactory.label("Tag2", chart, "韭菜跳水", Theme.fontSize.tiny, Theme.colors.danger, 130, 28);
    return chart;
  }
}
