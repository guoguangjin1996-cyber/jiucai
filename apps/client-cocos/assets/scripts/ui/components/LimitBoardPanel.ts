import { Node } from "cc";
import type { ClientRoom } from "../../store/ClientGameStore";
import { Palette, label, panel, statLine } from "../UiKit";

export class LimitBoardPanel {
  render(room: ClientRoom): Node {
    const market = room.market;
    const status = market?.isLimitUp ? "涨停糊住了" : market?.isLimitDown ? "跌停排队中" : "未封板";
    const root = panel("LimitBoardPanel", 390, 190, Palette.panel);
    root.addChild(label("涨跌停炸板监控", 22, Palette.textDark));
    root.addChild(statLine("状态", status, market?.isLimitDown ? Palette.success : Palette.danger));
    root.addChild(statLine("封板强度", `${market?.boardStrength ?? 0}`, Palette.warning));
    root.addChild(statLine("炸板风险", `${market?.boardBreakRisk ?? 0}`, Palette.danger));
    root.addChild(label("虚构盘面事件，仅展示局内参数。", 15, Palette.textSub));
    return root;
  }
}
