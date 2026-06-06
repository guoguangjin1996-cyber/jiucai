import { pickVoiceLine, type VoiceLineEvent } from "@jiucai-defense/shared";

export class VoiceLineManager {
  private counter = 0;

  next(event: VoiceLineEvent): string {
    const line = pickVoiceLine(event, this.counter);
    this.counter += 1;
    return line;
  }
}
