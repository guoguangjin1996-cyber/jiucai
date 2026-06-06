import { BaseScreen } from "./BaseScreen";
import { GameScreen } from "./GameScreen";
import { Theme } from "./theme/Theme";
import { UiFactory } from "./theme/UiFactory";

export class RoleRevealScreen extends BaseScreen {
  protected render(): void {
    this.clear();
    const role = this.manager.state.role;
    const isRetail = role === "retail";
    UiFactory.rect("Bg", this.node, 750, 1334, isRetail ? Theme.colors.bgMint : Theme.colors.bgPurple);
    const content = UiFactory.vertical("RevealContent", this.node, Theme.spacing.lg);
    UiFactory.label("Title", content, isRetail ? "你是：韭菜阵营" : "你是：隐藏主力", Theme.fontSize.title, isRetail ? Theme.colors.primaryGreen : Theme.colors.primaryPurple, 680, 80);
    UiFactory.label("Avatar", content, isRetail ? "哭唧唧韭菜小人举着小盾牌" : "主力戴墨镜坐老板椅，还顶着小皇冠", Theme.fontSize.body, Theme.colors.textDark, 680, 120);
    const goals = isRetail
      ? ["1. 保护本金值", "2. 识别盘面情绪", "3. 在 ROI 排名中争取更高资金效率"]
      : ["1. 隐藏身份", "2. 用盘口和弹幕制造情绪", "3. 影响部分价格因子", "4. 控制暴露和监管热度"];
    UiFactory.textBlock(content, goals, 620);
    UiFactory.label("Line", content, isRetail ? "我只是想赚点零花钱啊！" : "市场？不过是我的韭菜田罢了。", Theme.fontSize.subtitle, Theme.colors.textDark, 680, 84);
    UiFactory.button(content, isRetail ? "进入交易房" : "开始收网", 520, 86, isRetail ? Theme.colors.primaryGreen : Theme.colors.primaryPurple, () => this.manager.showScreen(GameScreen));
    UiFactory.label("Disclaimer", content, "虚构娱乐模拟，不提供真实交易指引", Theme.fontSize.small, Theme.colors.textSub, 680, 44);
  }
}
