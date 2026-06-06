import { Color, Node } from "cc";
import type { ClientRoom } from "../../store/ClientGameStore";
import { Palette, label, panel, row } from "../UiKit";

export class PlayerListView {
  render(room: ClientRoom): Node {
    const root = panel("PlayerListView", 680, 300, Palette.panel);
    root.addChild(label("玩家席位 · ROI观察榜", 22, Palette.textDark));

    for (let index = 0; index < 8; index += 2) {
      const pair = row(`PlayerPair${index}`, 620, 64, new Color(255, 255, 255, 0));
      pair.addChild(this.renderPlayer(room, index));
      pair.addChild(this.renderPlayer(room, index + 1));
      root.addChild(pair);
    }

    return root;
  }

  private renderPlayer(room: ClientRoom, index: number): Node {
    const player = room.players[index];
    const item = panel(`Player${index + 1}`, 300, 54, index % 2 === 0 ? Palette.mint : Palette.cream);

    if (player === undefined) {
      item.addChild(label(`${index + 1}. 空位`, 16, Palette.textSub));
      return item;
    }

    const roleHint = player.role === "institution" ? " 主力" : player.role === "retail" ? " 韭菜" : "";
    const bot = player.isBot ? " Bot" : "";
    const roi = player.roi === undefined ? "" : ` ROI ${(player.roi * 100).toFixed(1)}%`;
    item.addChild(label(`${index + 1}. ${player.nickname}${bot}${roleHint}`, 15, Palette.textDark));
    item.addChild(label(`本金 ${player.capital} · 信心 ${player.confidence}${roi}`, 13, Palette.textSub));
    return item;
  }
}
