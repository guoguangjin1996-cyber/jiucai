import { Color } from "cc";
import type { ClientGameStore, ClientRoom } from "../store/ClientGameStore";
import {
  Palette,
  bossMascot,
  card,
  jellyButton,
  leekMascot,
  pill,
  place,
  progressBar,
  screen,
  textAt
} from "./UiKit";

export class GameScreen {
  constructor(private readonly store: ClientGameStore) {}

  render(room: ClientRoom) {
    const me = room.players[0];
    const isInstitution = me?.role === "institution";
    return isInstitution ? this.renderInstitution(room) : this.renderRetail(room);
  }

  private renderRetail(room: ClientRoom) {
    const root = screen("RetailGameScreen", Palette.cream);
    this.renderTopBar(root, room, Palette.green);

    const mutation = card("MutationCard", 300, 190, new Color(255, 246, 247, 255), 24, true);
    textAt(mutation, "盘面异动", -72, 54, 130, 32, 22, Palette.textDark);
    textAt(mutation, "集合竞价骗炮", -48, 12, 190, 34, 24, Palette.danger);
    textAt(mutation, "开盘跳水问杀！\n监管在看着你哦~", 0, -46, 240, 56, 17, Palette.textSub);
    place(mutation, leekMascot("PanicLeek", 0.5), 94, -40);
    place(root, mutation, -185, 370);

    const rank = card("PlayerRankCard", 300, 300, Palette.panel, 24, true);
    textAt(rank, "玩家收益（非现金）", 0, 118, 250, 30, 19, Palette.textDark);
    const players = room.players.length > 0 ? room.players : this.mockPlayers();
    players.slice(0, 7).forEach((player, index) => {
      const color = index < 3 ? Palette.success : Palette.danger;
      const value = index < 3 ? `+${78 - index * 21}.${index + 2}%` : `-${3 + index * 4}.${index}%`;
      textAt(rank, `${player.nickname}`, -58, 82 - index * 34, 150, 28, 16, Palette.textDark, "left");
      textAt(rank, value, 90, 82 - index * 34, 86, 28, 16, color, "right");
    });
    place(root, rank, 185, 320);

    const chart = card("RetailChart", 300, 250, Palette.panel, 24, true);
    textAt(chart, "韭菜指数（日线）", -34, 94, 190, 28, 18, Palette.textDark);
    textAt(chart, "泡泡叶股份 JC-001", -34, 66, 190, 24, 16, Palette.textSub);
    this.renderSparkLine(chart, -120, -20, Palette.danger);
    textAt(chart, "假装拉升", -76, 24, 92, 24, 14, Palette.warning);
    textAt(chart, "主力出货", 70, -2, 92, 24, 14, Palette.danger);
    textAt(chart, "-12.7%", 94, 72, 76, 30, 16, Palette.panel);
    place(chart, card("DropBadge", 78, 30, Palette.green, 12, false), 94, 72);
    place(root, chart, -185, 130);

    const side = card("RetailSide", 300, 250, Palette.panelSoft, 24, true);
    textAt(side, "持仓信息", -74, 94, 130, 28, 19, Palette.textDark);
    textAt(side, "你是：不开车韭", 0, 52, 230, 28, 17, Palette.textDark);
    textAt(side, "底牌：T+1", 0, 16, 230, 34, 24, Palette.danger);
    textAt(side, "监管热度", -72, -38, 130, 28, 18, Palette.textDark);
    progressBar(side, 30, -40, 130, 0.76, Palette.red);
    textAt(side, "76%", 102, -38, 60, 28, 19, Palette.textDark);
    place(root, side, 185, 130);

    const cash = card("FlowCard", 300, 106, Palette.panelSoft, 20, true);
    textAt(cash, "资金流向（主力在笑！）", 0, 30, 250, 26, 17, Palette.textDark);
    textAt(cash, "主力净卖出 -88.60亿↓", -8, -4, 240, 24, 16, Palette.danger);
    textAt(cash, "散户接盘 +68.88亿↑", -8, -32, 240, 24, 16, Palette.redDeep);
    place(root, cash, -185, -80);

    const behavior = card("BehaviorCard", 300, 106, Palette.mint, 20, true);
    textAt(behavior, "韭菜行为", -76, 30, 130, 26, 17, Palette.textDark);
    textAt(behavior, "追涨停 +99\n割肉 +99\n躺平 +50", 24, -16, 220, 68, 16, Palette.textDark);
    place(root, behavior, 185, -80);

    place(root, jellyButton("起飞\n重仓冲锋", () => this.store.submitAction("TAKE_OFF"), 180, 92, Palette.red, Palette.panel), -220, -240);
    place(root, jellyButton("埋人\n低吸埋伏", () => this.store.submitAction("BURY"), 180, 92, Palette.green, Palette.panel), 0, -240);
    place(root, jellyButton("装死\n假装看不见", () => this.store.submitAction("PLAY_DEAD"), 180, 92, Palette.yellow), 220, -240);
    place(root, jellyButton("跑路\n及时止损", () => this.store.submitAction("RUN_AWAY"), 250, 92, Palette.purpleStrong, Palette.panel), -145, -360);
    place(root, jellyButton("格局\n佛系躺平", () => this.store.submitAction("HOLD"), 250, 92, Palette.blue, Palette.panel), 145, -360);

    const voice = card("VoiceToast", 640, 58, Palette.panelSoft, 22, true);
    textAt(voice, "9:20已到，现在后悔躺平可就来不及咯~", 0, 0, 580, 34, 18, Palette.textSub);
    place(root, voice, 0, -515);
    return root;
  }

  private renderInstitution(room: ClientRoom) {
    const root = screen("InstitutionGameScreen", Palette.purple);
    this.renderTopBar(root, room, Palette.purpleStrong);
    place(root, bossMascot("BigBoss", 0.95), 240, 430);
    textAt(root, "隐藏主力", -210, 455, 220, 40, 30, Palette.purpleStrong);
    textAt(root, "Lv.99 主力大佬 · 操盘后台", -160, 416, 300, 30, 18, Palette.textSub);

    const funds = card("InstitutionFunds", 640, 150, Palette.panel, 24, true);
    textAt(funds, "操盘资金值", -210, 44, 180, 28, 18, Palette.textSub);
    textAt(funds, "9,876,543,210", -146, 4, 310, 42, 32, Palette.textDark);
    textAt(funds, "今日收益 +123,456,789", 148, 30, 260, 30, 20, Palette.success);
    textAt(funds, "市场控制力 87%", 148, -14, 260, 30, 20, Palette.purpleStrong);
    progressBar(funds, 150, -48, 220, 0.87, Palette.purpleStrong);
    place(root, funds, 0, 330);

    const tools = card("InstitutionTools", 640, 224, Palette.panel, 24, true);
    textAt(tools, "主力工具箱", -220, 78, 180, 30, 22, Palette.textDark);
    const toolItems = [
      ["资金操控", "DRAW_PIE", Palette.purpleStrong],
      ["筹码分布", "IGNITE", Palette.lilac],
      ["涨停控制", "SEAL_BOARD", Palette.yellow],
      ["消息发布", "DRAW_PIE", Palette.blue],
      ["大V合作", "SCARE", Palette.green],
      ["监管公关", "COOL_DOWN", Palette.red],
      ["小黑屋记录", "SHIP", Palette.cream]
    ] as const;
    toolItems.forEach((item, index) => {
      const x = -220 + (index % 4) * 146;
      const y = 26 - Math.floor(index / 4) * 76;
      place(tools, jellyButton(item[0], () => this.store.submitAction(item[1]), 126, 54, item[2]), x, y);
    });
    place(root, tools, 0, 142);

    const chart = card("InstitutionChart", 310, 250, Palette.panelSoft, 24, true);
    textAt(chart, "主力专属分时图", 0, 92, 240, 30, 20, Palette.textDark);
    this.renderSparkLine(chart, -124, -8, Palette.purpleStrong);
    textAt(chart, "吸筹阶段  →  拉升阶段", 0, 48, 250, 24, 16, Palette.purpleStrong);
    textAt(chart, "洗盘阶段  →  出货阶段", 0, -76, 250, 24, 16, Palette.warning);
    place(root, chart, -170, -90);

    const chips = card("ChipCard", 310, 250, Palette.panel, 24, true);
    textAt(chips, "实时筹码分布", -60, 92, 160, 28, 20, Palette.textDark);
    textAt(chips, "主力持仓 62.3%", 0, 48, 240, 28, 18, Palette.purpleStrong);
    progressBar(chips, 0, 22, 220, 0.623, Palette.purpleStrong);
    textAt(chips, "散户持仓 30.1%", 0, -18, 240, 28, 18, Palette.greenDeep);
    progressBar(chips, 0, -44, 220, 0.301, Palette.green);
    textAt(chips, "游资持仓 7.6%", 0, -82, 240, 28, 18, Palette.orange);
    place(root, chips, 170, -90);

    const plan = card("ControlPlan", 640, 186, Palette.panelSoft, 24, true);
    textAt(plan, "当前操控计划", -220, 64, 180, 30, 22, Palette.textDark);
    ["09:15-09:25 集合竞价挂单 执行中", "09:30-10:30 缓慢拉升 执行中", "10:30-11:00 洗盘震仓 等待中", "14:30-15:00 封板出货 等待中"].forEach((line, index) => {
      textAt(plan, line, 22, 30 - index * 34, 520, 26, 17, index < 2 ? Palette.success : Palette.textSub, "left");
    });
    place(root, plan, 0, -326);
    textAt(root, "虚构娱乐模拟，不接入真实行情，仅作规则学习与娱乐体验", 0, -548, 640, 30, 17, Palette.textSub);
    return root;
  }

  private renderTopBar(root: ReturnType<typeof screen>, room: ClientRoom, activeColor: Color): void {
    place(root, jellyButton("‹", () => this.store.createRoom("STANDARD_20"), 58, 58, Palette.panel), -320, 585);
    textAt(root, `第 ${room.day || 2} / ${room.maxDays || 5} 交易日`, 0, 585, 280, 38, 28, Palette.textDark);
    textAt(root, "倒计时 01:08", 252, 585, 180, 30, 20, Palette.textDark);
    const phases = ["盘前", "异动", "竞价", "开盘", "盘中", "收盘", "复盘"];
    phases.forEach((phase, index) => {
      pill(root, phase, -270 + index * 90, 528, 74, index === 3 ? activeColor : Palette.panelSoft);
    });
  }

  private renderSparkLine(parent: ReturnType<typeof card>, x: number, y: number, color: Color): void {
    const points = ["▁", "▃", "▂", "▅", "▆", "▃", "▇", "▄", "▂", "▁", "▃", "▂"];
    textAt(parent, points.join(""), x + 135, y, 260, 60, 34, color);
  }

  private mockPlayers() {
    return [
      { nickname: "韭菜王" },
      { nickname: "原来是韭" },
      { nickname: "格局打开" },
      { nickname: "割肉小能手" },
      { nickname: "绿油油" },
      { nickname: "Bot-06" },
      { nickname: "Bot-04" }
    ];
  }
}
