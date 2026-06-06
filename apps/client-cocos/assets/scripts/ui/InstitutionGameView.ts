import type { Node } from "cc";
import type { MockGameState } from "../store/ViewModels";
import type { ScreenManager } from "./ScreenManager";
import { BottomActionBar } from "./components/BottomActionBar";
import { DanmakuLayer } from "./components/DanmakuLayer";
import { MarketChartPanel } from "./components/MarketChartPanel";
import { PlayerListPanel } from "./components/PlayerListPanel";
import { ProgressGauge } from "./components/ProgressGauge";
import { RegulationHeatBar } from "./components/RegulationHeatBar";
import { ToolCard } from "./components/ToolCard";
import { VoiceLineToast } from "./components/VoiceLineToast";
import { Theme } from "./theme/Theme";
import { UiFactory } from "./theme/UiFactory";

export class InstitutionGameView {
  constructor(private readonly manager: ScreenManager) {}

  render(parent: Node, state: MockGameState): void {
    const identity = UiFactory.vertical("InstitutionIdentity", parent, Theme.spacing.sm);
    UiFactory.label("Name", identity, "隐藏主力  Lv.99 主力大佬", Theme.fontSize.body, Theme.colors.primaryPurple, 660, 36, "left");
    UiFactory.textBlock(identity, ["操盘资金：9,876,543,210 操盘点", "今日收益：+123,456,789", "监管风险值：23/100  监管状态：正常", "市场？不过是我的韭菜田罢了。"], 660);
    ProgressGauge.create(identity, "市场控制力", 87, Theme.colors.primaryPurple);

    const main = UiFactory.horizontal("InstitutionMain", parent, Theme.spacing.md);
    MarketChartPanel.create(main, state, true);
    const monitor = UiFactory.vertical("Monitor", main, Theme.spacing.sm);
    DanmakuLayer.create(monitor, state);
    RegulationHeatBar.create(monitor, 23);
    UiFactory.textBlock(monitor, ["09:15-09:25 集合竞价挂单 执行中", "09:30-10:30 缓慢拉升 执行中", "10:30-11:00 洗盘震仓 等待中", "14:30-15:00 封板出货 等待中"], 320);

    const toolbox = UiFactory.vertical("Toolbox", parent, Theme.spacing.sm);
    UiFactory.label("ToolTitle", toolbox, "主力工具箱", Theme.fontSize.body, Theme.colors.textDark, 660, 36, "left");
    const toolRow1 = UiFactory.horizontal("ToolRow1", toolbox, Theme.spacing.sm);
    ToolCard.create(toolRow1, this.manager, "资金操控", "滑条一拉，全场眨眼", "MAIN_FORCE_FUND_CONTROL");
    ToolCard.create(toolRow1, this.manager, "筹码分布", "看果冻怎么晃", "CHIP_DISTRIBUTION");
    ToolCard.create(toolRow1, this.manager, "涨停控制", "封板回封炸板", "LIMIT_CONTROL");
    const toolRow2 = UiFactory.horizontal("ToolRow2", toolbox, Theme.spacing.sm);
    ToolCard.create(toolRow2, this.manager, "消息发布", "话术发射", "MESSAGE_PUBLISH");
    ToolCard.create(toolRow2, this.manager, "大V合作", "嘴强合作", "KOL_COOPERATION");
    ToolCard.create(toolRow2, this.manager, "监管关系", "探头闪烁", "REGULATOR_RELATION");
    ToolCard.create(toolbox, this.manager, "小黑屋记录", "门口贴着虚构二字", "BLACK_ROOM_RECORD");

    const actions = UiFactory.vertical("InstitutionActions", parent, Theme.spacing.sm);
    UiFactory.label("ActionTitle", actions, "主力操作区", Theme.fontSize.body, Theme.colors.textDark, 660, 36, "left");
    const buttons = UiFactory.horizontal("ForceButtons", actions, Theme.spacing.xs);
    for (const label of ["假封板", "假核按钮", "真封单", "真砸盘", "撤单"]) {
      UiFactory.button(buttons, label, 125, 58, Theme.colors.primaryPurple, () => this.manager.openPage(label === "撤单" ? "CANCEL_ORDER" : "MAIN_FORCE_CONSOLE"));
    }
    const continuous = UiFactory.horizontal("Continuous", actions, Theme.spacing.xs);
    for (const label of ["画饼", "吓人", "点火", "掀桌", "甩人", "收网"]) {
      UiFactory.button(continuous, label, 102, 54, Theme.colors.primaryYellow, () => this.manager.openPage("MESSAGE_PUBLISH"));
    }

    const lower = UiFactory.horizontal("InstitutionLower", parent, Theme.spacing.md);
    PlayerListPanel.create(lower, state.players);
    const nav = UiFactory.vertical("InstitutionNav", lower, Theme.spacing.sm);
    BottomActionBar.create(nav, this.manager, [
      { label: "操盘台", key: "MAIN_FORCE_CONSOLE" },
      { label: "监控", key: "MARKET_MONITOR" },
      { label: "资金", key: "FUND_MANAGEMENT" }
    ]);
    BottomActionBar.create(nav, this.manager, [
      { label: "网络", key: "NETWORK" },
      { label: "公关", key: "REGULATION_PR" },
      { label: "势力", key: "POWER" }
    ]);
    VoiceLineToast.create(parent, "假单必须在 9:20 前撤，否则可能把自己也骗进去。");
  }
}

