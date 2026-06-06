import { Color, Node } from "cc";
import type { ClientGameStore } from "../store/ClientGameStore";
import { Palette, badge, button, label, panel, row } from "./UiKit";

export class LandingScreen {
  constructor(private readonly store: ClientGameStore) {}

  render(): Node {
    const root = panel("LandingScreen", 720, 1080, Palette.sky);
    root.addChild(this.renderCornerActions());
    root.addChild(label("韭菜保卫战", 50, new Color(77, 139, 67, 255)));
    root.addChild(label("大A生存局", 31, Palette.textDark));
    root.addChild(label("8人同局 · 2名隐藏主力 · 6棵韭菜 · ROI排名定胜负", 20, Palette.textSub));
    root.addChild(this.renderMascotStage());
    root.addChild(button("短线快跑房 · 10分钟 · 3日 · 9票", () => this.store.createRoom("QUICK_10"), Palette.red, 520, 76));
    root.addChild(button("五日轮动房 · 20分钟 · 5日 · 30票", () => this.store.createRoom("STANDARD_20"), Palette.green, 520, 76));
    root.addChild(button("全市场长盘房 · 30分钟 · 7日 · 30票", () => this.store.createRoom("LONG_30"), Palette.blue, 520, 70));
    root.addChild(label("虚构娱乐模拟，不构成投资建议，不接入真实行情或真实代码", 17, Palette.textSub));
    return root;
  }

  private renderCornerActions(): Node {
    const actions = row("LandingCornerActions", 620, 54, new Color(255, 255, 255, 0));
    actions.addChild(badge("公告", Palette.panel));
    actions.addChild(badge("排行榜", Palette.panel));
    actions.addChild(badge("签到", Palette.panel));
    return actions;
  }

  private renderMascotStage(): Node {
    const stage = panel("LandingMascotStage", 620, 410, Palette.mint);
    stage.addChild(label("又想割我？没门！", 22, Palette.textDark));
    stage.addChild(label("  \\o/   韭菜小队守本金", 23, Palette.success));
    stage.addChild(label(" /| |\\  冲鸭！先装死！", 21, Palette.textDark));
    stage.addChild(label("  / \\   K线怪物正在假装友善", 20, Palette.warning));
    stage.addChild(label("参考图风格：淡蓝天空、浅绿草地、果冻按钮、低压可爱", 17, Palette.textSub));
    return stage;
  }
}
