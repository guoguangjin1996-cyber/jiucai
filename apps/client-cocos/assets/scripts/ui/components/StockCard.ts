import { Node } from "cc";
import { getStockCardTags, type StockMarketState } from "@jiucai-defense/shared";
import { Palette, label, panel, statLine } from "../UiKit";

export class StockCard {
  render(stock: StockMarketState): Node {
    const root = panel(`StockCard:${stock.id}`, 390, 190, Palette.cream);
    root.addChild(label(`${stock.element}系 · ${stock.name}`, 22, Palette.textDark));
    root.addChild(statLine("虚构涨跌", `${stock.changePercent >= 0 ? "+" : ""}${stock.changePercent}%`, stock.changePercent >= 0 ? Palette.danger : Palette.success));
    const tags = getStockCardTags(stock.tags).join(" / ");
    root.addChild(label(tags.length > 0 ? tags : "暂无标签", 16, Palette.warning));
    root.addChild(statLine("弹幕热度", `${stock.danmakuHeat}`, Palette.purpleStrong));
    root.addChild(statLine("量化关注", `${stock.quantAttention}`, Palette.textDark));
    return root;
  }
}
