import { Node } from "cc";
import { ClientGameStore } from "../store/ClientGameStore";
import { clear } from "./UiKit";
import { LandingScreen } from "./LandingScreen";
import { RoomScreen } from "./RoomScreen";
import { GameScreen } from "./GameScreen";
import { ResultScreen } from "./ResultScreen";

export class ScreenManager {
  private readonly landingScreen: LandingScreen;
  private readonly roomScreen: RoomScreen;
  private readonly gameScreen: GameScreen;
  private readonly resultScreen: ResultScreen;

  constructor(
    private readonly root: Node,
    private readonly store: ClientGameStore
  ) {
    this.landingScreen = new LandingScreen(store);
    this.roomScreen = new RoomScreen(store);
    this.gameScreen = new GameScreen(store);
    this.resultScreen = new ResultScreen(store);
    this.store.subscribe(() => this.render());
  }

  showLanding(): void {
    this.render();
  }

  private render(): void {
    clear(this.root);
    const room = this.store.room;

    if (room === undefined) {
      this.root.addChild(this.landingScreen.render());
      return;
    }

    if (room.status === "lobby") {
      this.root.addChild(this.roomScreen.render(room));
      return;
    }

    if (room.status === "finished") {
      this.root.addChild(this.resultScreen.render(room));
      return;
    }

    this.root.addChild(this.gameScreen.render(room));
  }
}
