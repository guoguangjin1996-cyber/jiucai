import { Node } from "cc";
import type { PlayerTitle } from "../../store/LocalShared";
import { Palette, label, panel } from "../UiKit";

export interface ResultShareCardData {
  winnerText: "保卫成功" | "收割完成";
  roleText: string;
  title: PlayerTitle | string;
  biggestEvent: string;
  shareText: string;
}

export class ResultShareCard {
  static create(_parent: Node, data: ResultShareCardData): Node {
    const card = panel("ResultShareCard", 620, 330, Palette.panelSoft);
    card.addChild(label("韭菜保卫战", 36, Palette.success));
    card.addChild(label(data.winnerText, 28, Palette.red));
    card.addChild(label(`玩家身份：${data.roleText}`, 19, Palette.textDark));
    card.addChild(label(`个人称号：${data.title}`, 19, Palette.textDark));
    card.addChild(label(`本局名场面：${data.biggestEvent}`, 18, Palette.textSub));
    card.addChild(label(`分享文案：${data.shareText}`, 18, Palette.textSub));
    card.addChild(label("虚构娱乐模拟，不提供真实交易指引。", 16, Palette.warning));
    return card;
  }
}
