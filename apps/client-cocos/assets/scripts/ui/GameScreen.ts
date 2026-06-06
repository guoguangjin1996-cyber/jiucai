import { Color, Node } from "cc";
import type { ClientGameStore, ClientRoom } from "../store/ClientGameStore";
import { AuctionPanel } from "./components/AuctionPanel";
import { DanmakuLayer } from "./components/DanmakuLayer";
import { LimitBoardPanel } from "./components/LimitBoardPanel";
import { PhaseBar } from "./components/PhaseBar";
import { PlayerListView } from "./components/PlayerListView";
import { PositionCard } from "./components/PositionCard";
import { RegulationPanel } from "./components/RegulationPanel";
import { VoiceLineToast } from "./components/VoiceLineToast";
import { VotePanel } from "./components/VotePanel";
import { SectorHeatmap } from "./components/SectorHeatmap";
import { StockCard } from "./components/StockCard";
import { MarketRankingPage } from "./MarketRankingPage";
import { Palette, button, label, panel, row, statLine } from "./UiKit";

export class GameScreen {
  private readonly phaseBar = new PhaseBar();
  private readonly auctionPanel: AuctionPanel;
  private readonly limitBoardPanel = new LimitBoardPanel();
  private readonly positionCard: PositionCard;
  private readonly regulationPanel = new RegulationPanel();
  private readonly votePanel: VotePanel;
  private readonly danmakuLayer = new DanmakuLayer();
  private readonly playerList = new PlayerListView();
  private readonly voiceLineToast = new VoiceLineToast();
  private readonly sectorHeatmap = new SectorHeatmap();
  private readonly stockCard = new StockCard();
  private readonly marketRankingPage = new MarketRankingPage();

  constructor(private readonly store: ClientGameStore) {
    this.auctionPanel = new AuctionPanel(store);
    this.positionCard = new PositionCard(store);
    this.votePanel = new VotePanel(store);
  }

  render(room: ClientRoom): Node {
    const me = room.players[0];
    const isInstitution = me?.role === "institution";
    const root = panel("GameScreen", 900, 1280, isInstitution ? Palette.purple : Palette.cream);
    root.addChild(this.phaseBar.render(room));
    root.addChild(isInstitution ? this.renderInstitutionHero(room) : this.renderRetailHero(room));
    root.addChild(this.renderMarketBoard(room, isInstitution));
    root.addChild(this.danmakuLayer.render(room));
    root.addChild(this.voiceLineToast.render(room));

    if (room.phase === "VOTE" || room.phase === "REGULATION_INQUIRY") {
      root.addChild(this.votePanel.render(room));
    } else if (isInstitution) {
      root.addChild(this.renderInstitutionActions(room));
    } else {
      root.addChild(this.renderRetailActions(room));
    }

    return root;
  }

  private renderRetailHero(room: ClientRoom): Node {
    const me = room.players[0];
    const card = panel("RetailHero", 820, 220, Palette.mint);
    card.addChild(label("韭菜小韭 · Lv.3 韭菜新手", 26, Palette.textDark));
    card.addChild(statLine("总资产", `${me?.capital ?? 12345.67}`, Palette.textDark));
    card.addChild(statLine("今日信心", `${me?.confidence ?? 68}`, Palette.warning));
    card.addChild(label("今日目标：活着离开市场 · 不被画饼 · 赚够200局内本金值就收手", 17, Palette.textSub));
    card.addChild(label("今日提醒：听大V不如听天由命，所有数值仅为娱乐模拟。", 17, Palette.textSub));
    return card;
  }

  private renderInstitutionHero(room: ClientRoom): Node {
    const me = room.players[0];
    const card = panel("InstitutionHero", 820, 250, Palette.panel);
    card.addChild(label("隐藏主力 · Lv.99 主力大佬", 26, Palette.purpleStrong));
    card.addChild(statLine("操盘资金值", `${me?.capital ?? 9876543210}`, Palette.textDark));
    card.addChild(statLine("市场控制力", "87%", Palette.purpleStrong));
    card.addChild(statLine("监管风险值", `${room.market?.regulationHeat ?? 23}/100`, Palette.warning));
    card.addChild(label("台词：市场？不过是我的韭菜田罢了。", 18, Palette.textSub));
    return card;
  }

  private renderMarketBoard(room: ClientRoom, isInstitution: boolean): Node {
    const board = row("MarketBoard", 820, 430, new Color(255, 255, 255, 0));
    const left = panel("MarketLeft", 395, 410, Palette.panel);
    left.addChild(label(isInstitution ? "主力专属分时图" : "韭菜分时图", 24, Palette.textDark));
    left.addChild(this.renderMinuteChartPlaceholder(room, isInstitution));
    left.addChild(this.renderNoticeCard(isInstitution));
    board.addChild(left);

    const right = panel("MarketRight", 395, 410, isInstitution ? Palette.purple : Palette.panelSoft);
    right.addChild(this.regulationPanel.render(room));
    right.addChild(this.limitBoardPanel.render(room));
    right.addChild(this.marketRankingPage.render(room));
    board.addChild(right);
    return board;
  }

  private renderNoticeCard(isInstitution: boolean): Node {
    const card = panel("NoticeCard", 350, 118, isInstitution ? Palette.cream : Palette.mint);
    card.addChild(label("盘面异动：集合竞价骗炮", 20, Palette.textDark));
    card.addChild(label(isInstitution ? "假单必须在9:20前撤，否则可能把自己也骗进去。" : "看起来像机会，也可能是饭局。", 16, Palette.textSub));
    return card;
  }

  private renderMinuteChartPlaceholder(room: ClientRoom, isInstitution: boolean): Node {
    const chart = panel("MinuteChartPlaceholder", 350, 210, isInstitution ? Palette.panelSoft : Palette.cream);
    const pressure = room.market?.auctionPressure ?? 76;
    chart.addChild(label("泡泡叶股份 JC-001", 19, Palette.textDark));
    chart.addChild(label(isInstitution ? "吸筹 → 拉升 → 洗盘 → 出货" : "假装拉升 → 主力出货 → 韭菜跳水", 16, Palette.textSub));
    chart.addChild(label("╭─╮  ╭╮    ╭──╮", 22, Palette.danger));
    chart.addChild(label("╯ ╰──╯╰────╯  ╰─", 22, Palette.success));
    chart.addChild(label(`模拟压力 ${pressure} · 虚构行情，仅局内展示`, 15, Palette.textSub));
    return chart;
  }

  private renderRetailActions(room: ClientRoom): Node {
    const actions = panel("RetailActions", 820, 300, Palette.panelSoft);
    actions.addChild(label("韭菜操作区", 24, Palette.textDark));

    if (room.phase === "AUCTION_FREE" || room.phase === "AUCTION_LOCKED" || room.phase === "OPEN_PRICE") {
      actions.addChild(this.auctionPanel.render(room));
      return actions;
    }

    const primary = row("RetailPrimaryActions", 760, 76);
    primary.addChild(button("起飞", () => this.store.submitAction("TAKE_OFF"), Palette.red, 170, 62));
    primary.addChild(button("埋人", () => this.store.submitAction("BURY"), Palette.green, 170, 62));
    primary.addChild(button("装死", () => this.store.submitAction("PLAY_DEAD"), Palette.yellow, 170, 62));
    actions.addChild(primary);
    actions.addChild(label("起飞=看涨情绪 · 埋人=看跌情绪 · 装死=空仓围观", 17, Palette.textSub));
    actions.addChild(this.positionCard.render(room));
    return actions;
  }

  private renderInstitutionActions(room: ClientRoom): Node {
    const actions = panel("InstitutionActions", 820, 360, Palette.panel);
    actions.addChild(label("主力操盘后台", 24, Palette.purpleStrong));
    const tools = row("InstitutionToolsA", 760, 70);
    tools.addChild(button("资金操控", () => this.store.submitAction("DRAW_PIE"), Palette.purple, 150, 58));
    tools.addChild(button("筹码分布", () => this.store.submitAction("IGNITE"), Palette.purple, 150, 58));
    tools.addChild(button("涨停控制", () => this.store.submitAction("SEAL_BOARD"), Palette.purple, 150, 58));
    tools.addChild(button("消息发布", () => this.store.sendDanmaku("利好来了？先别慌，这只是虚构弹幕。", "bullish"), Palette.yellow, 150, 58));
    actions.addChild(tools);

    const moves = row("InstitutionMoves", 760, 70);
    moves.addChild(button("画饼", () => this.store.submitAction("DRAW_PIE"), Palette.red, 130, 58));
    moves.addChild(button("吓人", () => this.store.submitAction("SCARE"), Palette.green, 130, 58));
    moves.addChild(button("点火", () => this.store.submitAction("IGNITE"), Palette.yellow, 130, 58));
    moves.addChild(button("掀桌", () => this.store.submitAction("SMASH"), Palette.purpleStrong, 130, 58));
    moves.addChild(button("收网", () => this.store.submitAction("SHIP"), Palette.blue, 130, 58));
    actions.addChild(moves);
    actions.addChild(label("当前计划：09:15挂单执行中 · 10:30洗盘等待中 · 14:30封板出货等待中", 17, Palette.textSub));
    actions.addChild(label(`监控目标：${room.players.map((player) => player.nickname).slice(0, 4).join(" / ") || "等待玩家入场"}`, 17, Palette.textSub));
    return actions;
  }
}
