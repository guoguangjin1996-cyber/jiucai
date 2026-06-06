import { Node } from "cc";
import { Theme } from "../theme/Theme";
import { ProgressGauge } from "./ProgressGauge";

export class RegulationHeatBar {
  static create(parent: Node, heat: number): Node {
    return ProgressGauge.create(parent, "监管热度", heat, heat > 70 ? Theme.colors.danger : Theme.colors.warning);
  }
}

