import type { MockGameState } from "../store/ViewModels";
import type { ScreenManager } from "./ScreenManager";
import { BottomActionBar } from "./components/BottomActionBar";
import { CuteNumberText } from "./components/CuteNumberText";
import { DanmakuLayer } from "./components/DanmakuLayer";
import { MarketChartPanel } from "./components/MarketChartPanel";
import { MarketNoticeCard } from "./components/MarketNoticeCard";
import { MutationCard } from "./components/MutationCard";
import { PlayerListPanel } from "./components/PlayerListPanel";
import { PositionCard } from "./components/PositionCard";
import { RegulationHeatBar } from "./components/RegulationHeatBar";
import { VoiceLineToast } from "./components/VoiceLineToast";
import { Theme } from "./theme/Theme";
import { UiFactory } from "./theme/UiFactory";
import type { Node } from "cc";

export class RetailGameView {
  constructor(private readonly manager: ScreenManager) {}

  render(parent: Node, state: MockGameState): void {
    const hero = UiFactory.vertical("RetailHero", parent, Theme.spacing.sm);
    UiFactory.label("Name", hero, "韭菜小韭  Lv.3 韭菜新手", Theme.fontSize.body, Theme.colors.primaryGreen, 660, 36, "left");
    CuteNumberText.create(hero, "总资产", "12,345.67", true);
    CuteNumberText.create(hero, "今日盈亏", "-678.90", false);
    UiFactory.textBlock(hero, ["今日目标：活着离开市场 / 不被割超过3次 / 赚够200元就收手", "今日提醒：市场有风险，韭菜需谨慎；听大V不如听天由命。"], 660);

    const cards = UiFactory.horizontal("InfoCards", parent, Theme.spacing.sm);
    MarketNoticeCard.create(cards, state);
    MutationCard.create(cards, state);

    const middle = UiFactory.horizontal("Middle", parent, Theme.spacing.md);
    MarketChartPanel.create(middle, state);
    const side = UiFactory.vertical("Side", middle, Theme.spacing.sm);
    DanmakuLayer.create(side, state);
    PositionCard.create(side, state);
    RegulationHeatBar.create(side, state.market.regulationHeat);

    const actions = UiFactory.vertical("RetailActions", parent, Theme.spacing.sm);
    UiFactory.label("ActionTitle", actions, "韭菜操作区", Theme.fontSize.body, Theme.colors.textDark, 660, 36, "left");
    const trade = UiFactory.horizontal("TradeButtons", actions, Theme.spacing.sm);
    UiFactory.button(trade, "起飞", 150, 68, Theme.colors.primaryRed, () => this.manager.openPage("BUY"));
    UiFactory.button(trade, "埋人", 150, 68, Theme.colors.primaryGreen, () => this.manager.openPage("SELL"));
    UiFactory.button(trade, "装死", 150, 68, Theme.colors.primaryYellow, () => this.manager.openPage("CANCEL_ORDER"));
    UiFactory.button(trade, "跑路", 150, 68, Theme.colors.softBorder, () => this.manager.openPage("SELL"), state.market.positionLockedReason === "T+1");
    const position = UiFactory.horizontal("PositionButtons", actions, Theme.spacing.sm);
    UiFactory.button(position, "全仓", 120, 56, Theme.colors.danger, () => this.manager.openPage("FULL_POSITION"));
    UiFactory.button(position, "半仓", 120, 56, Theme.colors.primaryGreen, () => this.manager.openPage("HALF_POSITION"));
    UiFactory.button(position, "1/3仓", 120, 56, Theme.colors.primaryBlue, () => this.manager.openPage("ONE_THIRD_POSITION"));
    UiFactory.button(position, "1/4仓", 120, 56, Theme.colors.primaryBlue, () => this.manager.openPage("ONE_QUARTER_POSITION"));
    UiFactory.button(position, "格局", 120, 56, Theme.colors.primaryYellow, () => this.manager.openPage("HOLDING"));
    UiFactory.textBlock(actions, ["9:20 前可以反悔，9:20 后反悔无效。", "今日仓：不可卖出，原因：T+1。"], 660);

    const playersAndNav = UiFactory.horizontal("PlayersAndNav", parent, Theme.spacing.md);
    PlayerListPanel.create(playersAndNav, state.players);
    const nav = UiFactory.vertical("RetailNav", playersAndNav, Theme.spacing.sm);
    BottomActionBar.create(nav, this.manager, [
      { label: "首页", key: "HOME" },
      { label: "行情", key: "MARKET" },
      { label: "持仓", key: "HOLDING" },
      { label: "社区", key: "COMMUNITY" },
      { label: "我的", key: "MINE" }
    ]);
    BottomActionBar.create(nav, this.manager, [
      { label: "分时", key: "MINUTE" },
      { label: "成交", key: "TRADE_LIST" },
      { label: "盘口", key: "ORDER_BOOK" }
    ]);
    VoiceLineToast.create(parent, "9:20 已到，现在后悔躺平可就来不及咯～");
  }
}

