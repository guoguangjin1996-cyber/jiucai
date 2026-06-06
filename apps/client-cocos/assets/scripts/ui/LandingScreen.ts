import { Color } from "cc";
import type { ClientGameStore } from "../store/ClientGameStore";
import {
  Palette,
  bossMascot,
  card,
  jellyButton,
  kLineMonster,
  leekMascot,
  pill,
  place,
  screen,
  textAt
} from "./UiKit";

export class LandingScreen {
  constructor(private readonly store: ClientGameStore) {}

  render() {
    const root = screen("LandingScreen", Palette.sky);

    place(root, card("CloudLeft", 210, 86, new Color(255, 255, 255, 170), 46, false), -230, 560);
    place(root, card("CloudRight", 250, 92, new Color(255, 255, 255, 170), 46, false), 230, 550);
    place(root, card("Grass", 760, 280, Palette.grass, 0, false), 0, -530);

    pill(root, "公告", -210, 500, 120, Palette.panel);
    pill(root, "排行榜", 0, 500, 120, Palette.panel);
    pill(root, "签到", 210, 500, 120, Palette.panel);

    textAt(root, "韭菜保卫战", 0, 405, 580, 72, 54, Palette.greenDeep);
    place(root, card("TitleRibbon", 350, 58, Palette.yellow, 26, true), 0, 345);
    textAt(root, "大A生存局", 0, 345, 320, 46, 30, Palette.textDark);
    textAt(root, "8人同局，2名隐藏主力，6棵韭菜，ROI榜单定胜负", 0, 284, 620, 40, 22, Palette.textDark);

    const stage = card("LandingStage", 620, 380, Palette.mint, 28, true);
    textAt(stage, "又想割我？没门！", -160, 140, 230, 34, 22, Palette.textDark);
    textAt(stage, "冲鸭！", 156, 136, 160, 34, 22, Palette.redDeep);
    place(stage, kLineMonster("Monster", 1.25), 0, 40);
    place(stage, leekMascot("HeroLeek", 1.05), -195, -92);
    place(stage, leekMascot("SmallLeekA", 0.72), 180, -98);
    place(stage, leekMascot("SmallLeekB", 0.62), 260, -110);
    place(stage, bossMascot("TinyBoss", 0.52), 245, 92);
    textAt(stage, "K线怪物正在假装友善", 0, -154, 420, 28, 18, Palette.warning);
    place(root, stage, 0, 80);

    place(root, jellyButton("快速开局\n随机匹配8人", () => this.store.createRoom("QUICK_10"), 520, 86, Palette.red, Palette.panel), 0, -190);
    place(root, jellyButton("创建房间\n邀请好友一起玩", () => this.store.createRoom("STANDARD_20"), 520, 86, Palette.green, Palette.panel), 0, -300);
    place(root, jellyButton("玩法说明", () => this.store.createRoom("LONG_30"), 520, 76, Palette.blue, Palette.panel), 0, -405);

    const tip = card("Disclaimer", 560, 52, Palette.panelSoft, 24, true);
    textAt(tip, "虚构娱乐模拟，不含真实交易指引", 0, 0, 520, 34, 18, Palette.textSub);
    place(root, tip, 0, -540);

    return root;
  }
}
