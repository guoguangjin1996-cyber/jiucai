import { Node } from "cc";
import type { ClientRoom } from "../store/ClientGameStore";
import { Palette, label, panel } from "./UiKit";

export class MarketRankingPage {
  render(room: ClientRoom): Node {
    const root = panel("MarketRankingPage", 390, 260, Palette.panel);
    const rankings = room.market?.rankings;
    root.addChild(label("龙虎榜 · ROI观察", 22, Palette.textDark));
    root.addChild(label(`人气榜：${rankings?.stockPopularityRank.slice(0, 3).join(" / ") ?? "-"}`, 16, Palette.textSub));
    root.addChild(label(`领涨榜：${rankings?.stockLeadershipRank.slice(0, 3).join(" / ") ?? "-"}`, 16, Palette.textSub));
    root.addChild(label(`五行热度：${rankings?.sectorPopularityRank.join(" / ") ?? "-"}`, 16, Palette.textSub));
    root.addChild(label(`量化警报：${rankings?.stockQuantRiskRank.slice(0, 3).join(" / ") ?? "-"}`, 16, Palette.textSub));
    root.addChild(label(`T+1拥挤：${rankings?.stockTPlusOneRank.slice(0, 3).join(" / ") ?? "-"}`, 16, Palette.textSub));
    const roiRank = room.finalSettlement?.roiRankings?.slice(0, 3).map((item) => item.nickname).join(" / ") ?? "收盘后生成";
    root.addChild(label(`收益率榜：${roiRank}`, 16, Palette.success));
    return root;
  }
}
