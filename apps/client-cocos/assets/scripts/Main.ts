import { _decorator, Component } from "cc";
import { GAME_NAME } from "@jiucai-defense/shared";
import { ClientGameStore } from "./store/ClientGameStore";
import { ScreenManager } from "./ui/ScreenManager";

const { ccclass } = _decorator;

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
