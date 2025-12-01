import { useMindmapStore } from "./mindmap-store";
import { getShortcutDefinitions } from "./shortcut-register";

export class ShortcutManager {
  private isComposing = false;

  constructor() {}

  handleKeydown(event: KeyboardEvent): void {
    // IME 输入过程中不处理任何快捷键
    // 检查 event.isComposing（标准方式）和 this.isComposing（备用方式，处理 Firefox 特殊情况）
    if (event.isComposing || this.isComposing) {
      return;
    }

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

  /**
   * 供外部组件更新 IME 状态（备用方案，用于处理某些浏览器的特殊情况）
   */
  setComposing(composing: boolean): void {
    this.isComposing = composing;
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
