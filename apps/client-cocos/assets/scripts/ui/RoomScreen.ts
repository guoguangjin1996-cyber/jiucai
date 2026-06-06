import { Button, ImageAsset, Node, Sprite, SpriteFrame, Texture2D, UITransform, resources } from "cc";
import type { ClientGameStore, ClientRoom } from "../store/ClientGameStore";
import { Palette, card, place, screen, textAt } from "./UiKit";

const ROOM_REFERENCE_PATH = "textures/ui/room-reference";

export class RoomScreen {
  constructor(private readonly store: ClientGameStore) {}

  render(_room: ClientRoom): Node {
    const root = screen("RoomScreenReference", Palette.cream);
    place(root, this.renderReferenceBackground(), 0, 0);

    this.addHotspot(root, "BackHotspot", -300, 565, 100, 100, () => this.store.createRoom("STANDARD_20"));
    this.addHotspot(root, "SettingsHotspot", 285, 565, 100, 100, () => undefined);
    this.addHotspot(root, "ChatHotspot", 285, 455, 100, 100, () => undefined);
    this.addHotspot(root, "AddBotHotspot", -255, -460, 150, 125, () => this.store.addBot());
    this.addHotspot(root, "InviteHotspot", -52, -460, 190, 125, () => this.store.addBot());
    this.addHotspot(root, "StartGameHotspot", 185, -460, 300, 125, () => this.store.startGame());

    return root;
  }

  private renderReferenceBackground(): Node {
    const node = new Node("RoomReferenceBackground");
    node.addComponent(UITransform).setContentSize(750, 1334);
    const sprite = node.addComponent(Sprite);
    this.loadReferenceSprite(sprite, node);
    return node;
  }

  private loadReferenceSprite(sprite: Sprite, fallbackParent: Node): void {
    resources.load(ROOM_REFERENCE_PATH, ImageAsset, (imageError, imageAsset) => {
      if (imageError === null && imageAsset !== null) {
        const texture = new Texture2D();
        const maybeTexture = texture as Texture2D & { image?: ImageAsset };
        maybeTexture.image = imageAsset;
        this.applyTexture(sprite, texture);
        return;
      }

      resources.load(`${ROOM_REFERENCE_PATH}/texture`, Texture2D, (textureError, texture) => {
        if (textureError === null && texture !== null) {
          this.applyTexture(sprite, texture);
          return;
        }

        resources.load(`${ROOM_REFERENCE_PATH}/spriteFrame`, SpriteFrame, (spriteError, spriteFrame) => {
          if (spriteError === null && spriteFrame !== null) {
            sprite.spriteFrame = spriteFrame;
            return;
          }
          console.warn("[RoomScreen] failed to load room-reference", {
            imageError: imageError?.message,
            textureError: textureError?.message,
            spriteError: spriteError?.message
          });
          this.renderMissingBackground(fallbackParent);
        });
      });
    });
  }

  private applyTexture(sprite: Sprite, texture: Texture2D): void {
    const spriteFrame = new SpriteFrame();
    spriteFrame.texture = texture;
    sprite.spriteFrame = spriteFrame;
  }

  private renderMissingBackground(parent: Node): void {
    const fallback = card("RoomReferenceMissing", 650, 180, Palette.panelSoft, 18, true);
    textAt(fallback, "room-reference.png 加载失败", 0, 32, 560, 36, 24, Palette.danger);
    textAt(fallback, "请在 Console 查看 [RoomScreen] failed to load room-reference", 0, -24, 600, 30, 17, Palette.textSub);
    place(parent, fallback, 0, 0);
  }

  private addHotspot(parent: Node, name: string, x: number, y: number, width: number, height: number, onClick: () => void): Node {
    const node = new Node(name);
    node.addComponent(UITransform).setContentSize(width, height);
    node.addComponent(Button).node.on(Button.EventType.CLICK, onClick);
    return place(parent, node, x, y);
  }
}
