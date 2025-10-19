/**
 * 编辑快捷键绑定
 *
 * 基于文档: docs/draft/shortcut-key-bindings.md
 */

import type { ShortcutBinding } from "../types";

/**
 * 编辑快捷键绑定列表
 */
export const editBindings: ShortcutBinding[] = [
  // 1. 复制节点 (Cmd+C / Ctrl+C)
  {
    keys: "mod+c",
    commandId: "edit.copy",
    scope: "editor",
    preventDefault: true,
  },

  // 2. 剪切节点 (Cmd+X / Ctrl+X)
  {
    keys: "mod+x",
    commandId: "edit.cut",
    scope: "editor",
    preventDefault: true,
  },

  // 3. 粘贴节点 (Cmd+V / Ctrl+V)
  {
    keys: "mod+v",
    commandId: "edit.paste",
    scope: "editor",
    preventDefault: true,
  },

  // 注意: edit.duplicate 已在 node.bindings.ts 中定义为 mod+d
];
