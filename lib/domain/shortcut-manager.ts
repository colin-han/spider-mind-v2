import { useMindmapStore } from "./mindmap-store";
import { getShortcutDefinitions } from "./shortcut-register";

export class ShortcutManager {
  constructor() {}

  handleKeydown(event: KeyboardEvent): void {
    const root = useMindmapStore.getState();
    const keys = this.getKeysFromEvent(event);
    const shortcutDefs = getShortcutDefinitions(keys);
    if (!shortcutDefs) {
      return;
    }

    const shortcutDef = shortcutDefs.find((def) => def.when?.(root) ?? true);
    if (!shortcutDef) {
      return;
    }

    console.log(
      "[ShortcutManager] handleKeydown",
      keys,
      shortcutDef,
      root.currentEditor?.version
    );
    const run = shortcutDef.run(root);
    if (run && run.commandId) {
      root.commandManager?.executeCommand(run);
      if (run.preventDefault) {
        event.preventDefault();
        event.stopPropagation();
      }
    }
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
