import { _decorator, Component } from "cc";
import { ClientGameStore } from "./store/ClientGameStore";
import { ScreenManager } from "./ui/ScreenManager";

const { ccclass } = _decorator;
const GAME_NAME = "韭菜保卫战：大A生存局";

@ccclass("Main")
export class Main extends Component {
  private screenManager?: ScreenManager;

  protected onLoad(): void {
    console.log(`${GAME_NAME}: 虚构娱乐模拟`);
    const store = new ClientGameStore();
    this.screenManager = new ScreenManager(this.node, store);
    this.screenManager.showLanding();
  }
}

export function main(): void {
  console.log(`${GAME_NAME}: 虚构娱乐模拟`);
}
