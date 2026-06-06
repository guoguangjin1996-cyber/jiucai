import { Color, Node } from "cc";
import type { ClientGameStore, ClientRoom } from "../store/ClientGameStore";
import { Palette, badge, button, label, panel, row } from "./UiKit";

export class RoomScreen {
  constructor(private readonly store: ClientGameStore) {}

  render(room: ClientRoom): Node {
    const root = panel("RoomScreen", 720, 1080, Palette.cream);
    root.addChild(this.renderHeader(room));
    root.addChild(this.renderSeatBoard(room));
    root.addChild(this.renderModeCard());
    root.addChild(this.renderButtons());
    root.addChild(label("提示：高买都是暂时的，亏钱只是局内虚拟参数，学会低吸抽象值。", 17, Palette.textSub));
    return root;
  }

  private renderHeader(room: ClientRoom): Node {
    const header = panel("RoomHeader", 620, 140, Palette.panelSoft);
    header.addChild(label(`房间号：${room.id}`, 28, Palette.textDark));
    header.addChild(label("经典模式 · 8人局", 21, Palette.textSub));
    header.addChild(label("2名隐藏主力 + 6棵韭菜 · ROI榜单见真章", 20, Palette.success));
    return header;
  }

  private renderSeatBoard(room: ClientRoom): Node {
    const board = panel("SeatBoard", 620, 520, Palette.mint);
    board.addChild(label("等待中", 26, Palette.success));
    board.addChild(label("座位环绕开摆，房主皇冠已经戴歪", 18, Palette.textSub));

    for (let index = 0; index < 8; index += 2) {
      const pair = row(`SeatPair${index}`, 560, 86, new Color(255, 255, 255, 0));
      pair.addChild(this.renderSeat(room, index));
      pair.addChild(this.renderSeat(room, index + 1));
      board.addChild(pair);
    }

    return board;
  }

  private renderSeat(room: ClientRoom, index: number): Node {
    const player = room.players[index];
    const seat = panel(`Seat${index + 1}`, 260, 72, Palette.panel);
    if (player === undefined) {
      seat.addChild(label(`${index + 1}. 空位`, 18, Palette.textSub));
      seat.addChild(label("等一棵韭菜发芽", 15, Palette.textSub));
      return seat;
    }

    const crown = index === 0 ? " 房主" : "";
    const bot = player.isBot ? " Bot" : "";
    seat.addChild(label(`${index + 1}. ${player.nickname}${crown}${bot}`, 18, Palette.textDark));
    seat.addChild(label(`本金值 ${player.capital} · 信心 ${player.confidence}`, 15, Palette.textSub));
    return seat;
  }

  private renderModeCard(): Node {
    const card = panel("RoomModeCard", 620, 150, Palette.panel);
    card.addChild(label("经典模式", 24, Palette.success));
    card.addChild(label("主力隐藏身份，操控虚构盘面；韭菜保卫本金值，最终按ROI排名结算。", 17, Palette.textSub));
    card.addChild(label("所有数值仅为局内娱乐模拟，没有任何现金价值。", 17, Palette.warning));
    return card;
  }

  private renderButtons(): Node {
    const actions = row("RoomActions", 620, 86, new Color(255, 255, 255, 0));
    actions.addChild(button("补Bot", () => this.store.addBot(), Palette.green, 180, 66));
    actions.addChild(button("邀请好友", () => this.store.addBot(), Palette.blue, 180, 66));
    actions.addChild(button("开始游戏", () => this.store.startGame(), Palette.yellow, 220, 66));
    actions.addChild(badge("设置", Palette.panel));
    return actions;
  }
}
