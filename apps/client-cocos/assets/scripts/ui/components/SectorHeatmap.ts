import { Node } from "cc";
import type { ClientRoom } from "../../store/ClientGameStore";
import { Palette, label, panel } from "../UiKit";

export class SectorHeatmap {
  render(room: ClientRoom): Node {
    const root = panel("SectorHeatmap", 820, 230, Palette.panelSoft);
    root.addChild(label("五行热力图 · 抽象板块", 22, Palette.textDark));

    for (const sector of room.market?.sectors ?? []) {
      const tags = sector.statusTags.length > 0 ? sector.statusTags.join(" / ") : "观察中";
      root.addChild(
        label(
          `${sector.name} 人气${sector.popularityRank ?? "-"} 强度${sector.strengthRank ?? "-"} 风险${sector.riskRank ?? "-"} | 热${sector.heat} 流${sector.flow} 共${sector.resonance} 险${sector.risk} | ${tags}`,
          15,
          Palette.textSub
        )
      );
    }

    if ((room.market?.sectors ?? []).length === 0) {
      root.addChild(label("等待服务端 FULL_MARKET 数据；这里会展示完全虚构的盘面热力。", 18, Palette.textSub));
    }

    return root;
  }
}
