import { Color, Node } from "cc";
import type { ClientRoom } from "../../store/ClientGameStore";
import { label, panel } from "../UiKit";

export class VoiceLineToast {
  render(room: ClientRoom): Node {
    const root = panel("VoiceLineToast", 820, 88, new Color(68, 59, 50, 245));
    const text = room.voiceLines.at(-1)?.text ?? "虚构娱乐模拟：盘面播报待命，韭菜先深呼吸。";
    root.addChild(label(text, 20, Color.WHITE));
    return root;
  }
}
