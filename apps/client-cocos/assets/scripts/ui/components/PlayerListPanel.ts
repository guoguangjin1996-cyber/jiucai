import { Node } from "cc";
import type { MockPlayer } from "../../store/ViewModels";
import { Theme } from "../theme/Theme";
import { UiFactory } from "../theme/UiFactory";
import { PlayerAvatar } from "./PlayerAvatar";

export class PlayerListPanel {
  static create(parent: Node, players: MockPlayer[]): Node {
    const panel = UiFactory.vertical("PlayerListPanel", parent, Theme.spacing.sm);
    UiFactory.label("Title", panel, "玩家收益（局内虚拟值）", Theme.fontSize.small, Theme.colors.textDark, 300, 34, "left");
    for (const player of players) {
      const row = UiFactory.horizontal(`Player_${player.id}`, panel, Theme.spacing.xs);
      PlayerAvatar.create(row, player, true);
      const sign = player.score >= 70 ? "+" : "-";
      UiFactory.label("Score", row, `${sign}${Math.abs(player.score - 55)}.${player.suspicion}%`, Theme.fontSize.small, player.score >= 70 ? Theme.colors.success : Theme.colors.danger, 140, 44, "right");
    }
    return panel;
  }
}
