import { Node } from "cc";
import type { ClientGameStore, ClientRoom } from "../../store/ClientGameStore";
import { Palette, button, label, panel, row } from "../UiKit";

export class VotePanel {
  constructor(private readonly store: ClientGameStore) {}

  render(room: ClientRoom): Node {
    const root = panel("VotePanel", 820, 320, Palette.cream);
    root.addChild(label("龙虎榜投票", 24, Palette.textDark));
    root.addChild(label("投出你觉得最会画饼的人。投票会影响局内问询与复盘展示，不直接替代ROI结算。", 17, Palette.textSub));

    for (let index = 0; index < room.players.filter((candidate) => candidate.alive).length; index += 2) {
      const pair = row(`VotePair${index}`, 760, 62);
      for (const player of room.players.filter((candidate) => candidate.alive).slice(index, index + 2)) {
        pair.addChild(button(`投 ${player.nickname}`, () => this.store.vote(player.id), Palette.yellow, 350, 52));
      }
      root.addChild(pair);
    }

    return root;
  }
}
