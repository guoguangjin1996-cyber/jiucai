import { Node } from "cc";
import type { PageKey } from "../../store/ViewModels";
import { BaseScreen } from "../BaseScreen";
import type { ScreenManager } from "../ScreenManager";
import { Theme } from "../theme/Theme";
import { UiFactory } from "../theme/UiFactory";

export interface DialogPageConfig {
  title: string;
  hero: string;
  desc: string;
  lines: string[];
  actions?: Array<{ label: string; pageKey?: PageKey; close?: boolean }>;
  accent?: string;
}

export type DialogPageManager = ScreenManager;

export class DialogPage extends BaseScreen {
  protected readonly config: DialogPageConfig;

  constructor(manager: ScreenManager, config?: DialogPageConfig) {
    super(manager);
    this.config = config ?? {
      title: "玩法说明",
      hero: "虚构娱乐模拟局",
      desc: "8 人同局，2 名隐藏主力，6 名韭菜。所有数值都是局内虚拟参数。",
      lines: ["用游戏方式理解集合竞价、T+1、涨跌停和板块轮动。", "不接真实行情，不提供真实交易指引。"],
      actions: [{ label: "知道了", close: true }],
      accent: Theme.colors.primaryGreen
    };
  }

  protected render(): void {
    this.clear();
    UiFactory.rect("DialogMask", this.node, 750, 1334, this.config.accent ?? Theme.colors.bgCream);
    const panel = UiFactory.vertical("DialogPanel", this.node, Theme.spacing.md);
    UiFactory.label("Title", panel, this.config.title, Theme.fontSize.subtitle, Theme.colors.textDark, 650, 56);
    UiFactory.label("Hero", panel, this.config.hero, Theme.fontSize.title, this.config.accent ?? Theme.colors.primaryGreen, 650, 86);
    UiFactory.label("Desc", panel, this.config.desc, Theme.fontSize.body, Theme.colors.textSub, 650, 80);
    UiFactory.textBlock(panel, this.config.lines, 650);
    const art = UiFactory.label("Art", panel, "哭唧唧韭菜  /  墨镜主力  /  K线怪物", Theme.fontSize.small, Theme.colors.textSub, 650, 70);
    art.setScale(1, 1, 1);
    const actionRow = UiFactory.horizontal("Actions", panel, Theme.spacing.md);
    const actions = this.config.actions ?? [{ label: "确认", close: true }];
    for (const action of actions) {
      UiFactory.button(actionRow, action.label, 220, 70, this.config.accent ?? Theme.colors.primaryGreen, () => {
        if (action.pageKey) this.manager.openPage(action.pageKey);
        if (action.close !== false) this.manager.closeTop();
      });
    }
  }
}
