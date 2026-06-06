import { Node } from "cc";
import type { MockGameState } from "../../store/ViewModels";
import { Theme } from "../theme/Theme";
import { UiFactory } from "../theme/UiFactory";
import { MockKLineChart } from "./MockKLineChart";

export class MarketChartPanel {
  static create(parent: Node, state: MockGameState, secret = false): Node {
    const panel = UiFactory.vertical("MarketChartPanel", parent, Theme.spacing.sm);
    UiFactory.label("Name", panel, `${state.market.name} ${state.market.code}`, Theme.fontSize.body, Theme.colors.textDark, 420, 36, "left");
    UiFactory.label("Price", panel, `${state.market.price.toFixed(2)}  +${state.market.change.toFixed(2)}  +${state.market.changePercent.toFixed(2)}%`, Theme.fontSize.small, Theme.colors.primaryRed, 420, 32, "left");
    MockKLineChart.create(panel, 420, 220);
    if (secret) {
      UiFactory.textBlock(panel, ["吸筹阶段 → 拉升阶段 → 洗盘阶段 → 出货阶段", "主力持仓 62.3%  散户持仓 30.1%  游资持仓 7.6%"], 420);
    }
    return panel;
  }
}

