import { CommandRun } from "./command-manager";
import { MindmapStore } from "./mindmap-store.types";
import { getShortcutDefinitions } from "./shortcut-register";

export class ShortcutManager {
  constructor(private readonly root: MindmapStore) {}

  handleKeydown(event: KeyboardEvent): CommandRun | undefined {
    const keys = this.getKeysFromEvent(event);
    const shortcutDefs = getShortcutDefinitions(keys);
    if (!shortcutDefs) {
      return undefined;
    }
    const shortcutDef = shortcutDefs.find(
      (def) => def.when?.(this.root) ?? true
    );
    if (!shortcutDef) {
      return undefined;
    }
    return shortcutDef.run(this.root);
  }

  private getKeysFromEvent(event: KeyboardEvent): string {
    let keys = "";
    if (event.ctrlKey) {
      keys += "ctrl+";
    }
    if (event.altKey) {
      keys += "alt+";
    }
    if (event.metaKey) {
      keys += "meta+";
    }
    if (event.shiftKey) {
      keys += "shift+";
    }
    keys += event.key.toLowerCase();
    return keys;
  }
}
