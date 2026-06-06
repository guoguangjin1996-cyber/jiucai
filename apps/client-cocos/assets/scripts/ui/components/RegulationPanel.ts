import { Node } from "cc";
import type { ClientRoom } from "../../store/ClientGameStore";
import { Palette, label, panel, statLine } from "../UiKit";

const STATE_LABELS: Record<string, string> = {
  normal: "正常",
  risk_warning: "风险提示",
  key_monitoring: "重点监控",
  suspension_warning: "停牌预警",
  black_room: "小黑屋"
};

export class RegulationPanel {
  render(room: ClientRoom): Node {
    const heat = room.market?.regulationHeat ?? 0;
    const state = room.market?.regulationState ?? "normal";
    const root = panel("RegulationPanel", 390, 150, Palette.panel);
    root.addChild(label("监管热度", 22, Palette.textDark));
    root.addChild(statLine("热度", `${heat}/10`, heat >= 7 ? Palette.danger : Palette.warning));
    root.addChild(statLine("状态", STATE_LABELS[state] ?? state, Palette.textDark));
    if (room.phase === "REGULATION_INQUIRY") {
      root.addChild(label("小黑屋问询中：请投出你觉得最会带节奏的人。", 15, Palette.danger));
    }
    return root;
  }
}
