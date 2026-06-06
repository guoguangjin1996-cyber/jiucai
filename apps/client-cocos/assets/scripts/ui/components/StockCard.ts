import { Node } from "cc";
import type { StockMarketState } from "../../store/LocalShared";
import { Palette, label, panel, statLine } from "../UiKit";

function getLocalStockCardTags(tags: readonly string[]): string[] {
  return tags.map((tag) => {
    if (tag === "t_plus_one_hot") return "T+1拥挤";
    if (tag === "quant_attention") return "量化盯上";
    if (tag === "limit_up") return "封板表演";
    if (tag === "limit_down") return "排队现场";
    if (tag === "main_force_trace") return "疑似画饼";
    return tag;
  });
}

export class StockCard {
  render(stock: StockMarketState): Node {
    const root = panel(`StockCard:${stock.id}`, 390, 190, Palette.cream);
    root.addChild(label(`${stock.element}系 · ${stock.name}`, 22, Palette.textDark));
    root.addChild(statLine("虚构涨跌", `${stock.changePercent >= 0 ? "+" : ""}${stock.changePercent}%`, stock.changePercent >= 0 ? Palette.danger : Palette.success));
    const tags = getLocalStockCardTags(stock.tags).join(" / ");
    root.addChild(label(tags.length > 0 ? tags : "暂无标签", 16, Palette.warning));
    root.addChild(statLine("弹幕热度", `${stock.danmakuHeat}`, Palette.purpleStrong));
    root.addChild(statLine("量化关注", `${stock.quantAttention}`, Palette.textDark));
    return root;
  }
}
