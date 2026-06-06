import { Node } from "cc";
import type { MockPlayer } from "../../store/ViewModels";
import { Theme } from "../theme/Theme";
import { UiFactory } from "../theme/UiFactory";

const iconByType: Record<MockPlayer["avatarType"], string> = {
  leek: "小韭",
  boss: "墨镜",
  bot: "Bot",
  regulator: "监管"
};

export class PlayerAvatar {
  static create(parent: Node, player: MockPlayer, compact = false): Node {
    const box = UiFactory.rect(`Avatar_${player.id}`, parent, compact ? 120 : 150, compact ? 88 : 120, Theme.colors.panelSoft);
    UiFactory.label("Icon", box, iconByType[player.avatarType], compact ? Theme.fontSize.small : Theme.fontSize.body, Theme.colors.textDark, compact ? 120 : 150, 42);
    UiFactory.label("Name", box, player.nickname, Theme.fontSize.tiny, Theme.colors.textSub, compact ? 120 : 150, 36);
    return box;
  }
}

