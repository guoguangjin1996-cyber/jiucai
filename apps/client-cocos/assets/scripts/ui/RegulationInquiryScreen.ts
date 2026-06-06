import { BaseScreen } from "./BaseScreen";
import { GameScreen } from "./GameScreen";
import { Theme } from "./theme/Theme";
import { UiFactory } from "./theme/UiFactory";

export class RegulationInquiryScreen extends BaseScreen {
  protected render(): void {
    this.clear();
    UiFactory.rect("Bg", this.node, 750, 1334, Theme.colors.bgPurple);
    const content = UiFactory.vertical("RegulationContent", this.node, Theme.spacing.lg);
    UiFactory.label("Title", content, "监管小黑屋问询", Theme.fontSize.title, Theme.colors.primaryPurple, 680, 80);
    UiFactory.label("Hero", content, "探头：你们在屋里笑什么？", Theme.fontSize.subtitle, Theme.colors.textDark, 680, 64);
    UiFactory.textBlock(content, ["问询原因：监管热度 76%，K线怪物表情过于夸张。", "玩家需要选择解释口径，所有回答只影响局内虚构资源。", "请勿映射真实市场或真实主体。"], 640);
    const row = UiFactory.horizontal("Actions", content, Theme.spacing.md);
    UiFactory.button(row, "降温", 150, 66, Theme.colors.primaryBlue, () => this.manager.openPage("REGULATOR_RELATION"));
    UiFactory.button(row, "甩锅", 150, 66, Theme.colors.primaryYellow, () => this.manager.openPage("REGULATION_PR"));
    UiFactory.button(row, "装无辜", 180, 66, Theme.colors.primaryPurple, () => this.manager.openPage("BLACK_ROOM_RECORD"));
    UiFactory.button(content, "返回交易房", 520, 74, Theme.colors.primaryGreen, () => this.manager.showScreen(GameScreen));
  }
}

