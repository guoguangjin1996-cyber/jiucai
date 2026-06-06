import { Node } from "cc";
import type { ClientGameStore, ClientRoom } from "../store/ClientGameStore";
import { ResultShareCard } from "./components/ResultShareCard";
import { Palette, button, label, panel } from "./UiKit";

export class ResultScreen {
  constructor(private readonly store: ClientGameStore) {}

  render(room: ClientRoom): Node {
    const root = panel("ResultScreen", 720, 1080, Palette.sky);
    const settlement = room.finalSettlement;
    const winnerText = settlement?.winnerRole === "institution" ? "收割完成" : "保卫成功";
    root.addChild(label(`${winnerText} VS 复盘开始`, 42, Palette.textDark));
    root.addChild(label("ROI排名、主力身份和个人称号已进入虚构复盘板。", 20, Palette.textSub));
    root.addChild(label(`胜利阵营：${settlement?.winnerRole ?? "等待结算"}`, 24, Palette.success));
    root.addChild(label(`冠军玩家：${settlement?.championPlayerId ?? "等待收盘"}`, 20, Palette.textDark));
    root.addChild(label(`主力身份揭晓：${settlement?.institutionPlayerId ?? "等待公开"}`, 20, Palette.textDark));

    const rankCard = panel("ResultRankCard", 620, 230, Palette.panel);
    rankCard.addChild(label("ROI荣誉榜", 24, Palette.textDark));
    for (const item of settlement?.roiRankings?.slice(0, 5) ?? []) {
      rankCard.addChild(label(`${item.nickname} · ROI ${(item.roi * 100).toFixed(2)}% · 本金值 ${item.finalCapital}`, 18, item.roi >= 0 ? Palette.danger : Palette.success));
    }
    if ((settlement?.roiRankings ?? []).length === 0) {
      rankCard.addChild(label("等待服务端结算后生成。", 18, Palette.textSub));
    }
    root.addChild(rankCard);

    const titleCard = panel("PlayerTitles", 620, 210, Palette.cream);
    titleCard.addChild(label("个人称号", 24, Palette.textDark));
    for (const player of room.players.slice(0, 6)) {
      const titles = player.titles.length > 0 ? player.titles.join(" / ") : "暂无称号";
      titleCard.addChild(label(`${player.nickname}：${titles}`, 17, Palette.textSub));
    }
    root.addChild(titleCard);

    root.addChild(
      ResultShareCard.create(root, {
        winnerText,
        roleText: "虚构娱乐模拟玩家",
        title: "T+1锁魂人",
        biggestEvent: "9:20到了，撤单幻想被按进抽屉。",
        shareText: "我在大A生存局里保住了本金值，你敢来挑战ROI榜吗？"
      })
    );
    root.addChild(button("再来一局", () => this.store.createRoom(), Palette.yellow, 520, 70));
    return root;
  }
}
