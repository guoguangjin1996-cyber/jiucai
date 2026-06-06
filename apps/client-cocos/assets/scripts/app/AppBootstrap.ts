import { Node } from "cc";
import { ScreenManager } from "../ui/ScreenManager";
import { LandingScreen } from "../ui/LandingScreen";

export class AppBootstrap {
  static start(root: Node): ScreenManager {
    const manager = new ScreenManager(root);
    manager.showScreen(LandingScreen);
    return manager;
  }
}

