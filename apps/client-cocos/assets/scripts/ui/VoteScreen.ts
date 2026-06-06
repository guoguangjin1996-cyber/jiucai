import { BaseScreen } from "./BaseScreen";
import { GameScreen } from "./GameScreen";
import { PlayerAvatar } from "./components/PlayerAvatar";
import { Theme } from "./theme/Theme";
import { UiFactory } from "./theme/UiFactory";

export class VoteScreen extends BaseScreen {
  protected render(): void {
    this.clear();
    const state = this.manager.state;
    UiFactory.rect("Bg", this.node, 750, 1334, Theme.colors.bgCream);
    const content = UiFactory.vertical("VoteContent", this.node, Theme.spacing.md);
    UiFactory.label("Title", content, "龙虎榜投票", Theme.fontSize.title, Theme.colors.primaryYellow, 680, 76);
    UiFactory.label("Desc", content, "找出隐藏主力。全部投票只影响本局虚构结算。", Theme.fontSize.body, Theme.colors.textDark, 680, 54);
    for (const player of state.players) {
      const row = UiFactory.horizontal(`Vote_${player.id}`, content, Theme.spacing.md);
      PlayerAvatar.create(row, player, true);
      UiFactory.label("Suspicion", row, `嫌疑值 ${player.suspicion}`, Theme.fontSize.small, Theme.colors.warning, 180, 46);
      UiFactory.button(row, "投他", 120, 52, Theme.colors.primaryRed, () => this.manager.openDialog({ title: "投票确认", hero: `投给 ${player.nickname}`, desc: "这只是局内推理动作。", lines: ["投票提交后等待服务端阶段机结算。"], actions: [{ label: "确认", close: true }], accent: Theme.colors.primaryRed }));
    }
    UiFactory.button(content, "返回交易房", 520, 70, Theme.colors.primaryGreen, () => this.manager.showScreen(GameScreen));
  }
}

