import { Color, Node } from "cc";
import type { DanmakuItem } from "@jiucai-defense/shared";
import type { ClientRoom } from "../../store/ClientGameStore";
import { Palette, label, panel } from "../UiKit";

const SENTIMENT_COLORS: Record<DanmakuItem["sentiment"] | "system", Color> = {
  bullish: Palette.red,
  bearish: Palette.green,
  suspicious: Palette.warning,
  panic: Palette.purpleStrong,
  neutral: Palette.textSub,
  system: Color.WHITE
};

const FALLBACK_LINES = [
  "大佬带带我！冲冲冲！",
  "利好来了？我先抱头蹲下。",
  "主力进场了，还是我眼花了？",
  "完了完了，心电图开始表演。",
  "我是来学习的，顺便被教育。"
];

export class DanmakuLayer {
  render(room: ClientRoom): Node {
    const root = panel("DanmakuLayer", 820, 170, new Color(42, 42, 42, 230));
    root.addChild(label("分时弹幕股评", 20, Color.WHITE));

    const lines = room.danmaku.length > 0 ? room.danmaku.slice(-5) : FALLBACK_LINES.map((text, index) => ({
      id: `fallback-${index}`,
      text,
      sentiment: "neutral" as const,
      source: "system" as const
    }));

    for (const item of lines) {
      const color = item.source === "system" ? SENTIMENT_COLORS.system : SENTIMENT_COLORS[item.sentiment];
      root.addChild(label(`> ${item.text}`, 18, color));
    }

    return root;
  }
}
