/**
 * 全局快捷键绑定
 *
 * 基于文档: docs/draft/shortcut-key-bindings.md
 */

import type { ShortcutBinding } from "../types";

/**
 * 全局快捷键绑定列表
 */
export const globalBindings: ShortcutBinding[] = [
  // 1. 保存 (Cmd+S / Ctrl+S)
  {
    keys: "mod+s",
    commandId: "mindmap.save",
    scope: "global",
    preventDefault: true,
  },

  // 2. 撤销 (Cmd+Z / Ctrl+Z)
  {
    keys: "mod+z",
    commandId: "history.undo",
    scope: "global",
    preventDefault: true,
  },

  // 3. 重做 (Cmd+Shift+Z / Ctrl+Shift+Z)
  {
    keys: "mod+shift+z",
    commandId: "history.redo",
    scope: "global",
    preventDefault: true,
  },

  // 注意: 以下命令尚未实现，暂不绑定快捷键
  // - global.search (Cmd+F / Ctrl+F)
  // - global.clearSelection (Esc)
  // - global.showShortcutHelp (Shift+/)
];
