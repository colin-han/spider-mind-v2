/**
 * 节点操作快捷键绑定
 *
 * 基于文档: docs/draft/shortcut-key-bindings.md
 */

import type { ShortcutBinding } from "../types";

/**
 * 节点操作快捷键绑定列表
 */
export const nodeBindings: ShortcutBinding[] = [
  // 1. 添加子节点
  {
    keys: "tab",
    commandId: "node.addChild",
    scope: "editor",
    preventDefault: true,
  },

  // 2. 添加兄弟节点（在下方）
  {
    keys: "enter",
    commandId: "node.addSiblingBelow",
    scope: "editor",
    preventDefault: true,
  },

  // 3. 删除节点 (两个快捷键)
  {
    keys: "delete",
    commandId: "node.delete",
    scope: "editor",
    preventDefault: true,
  },
  {
    keys: "backspace",
    commandId: "node.delete",
    scope: "editor",
    preventDefault: true,
  },

  // 4. 编辑节点 (F2)
  {
    keys: "f2",
    commandId: "node.edit",
    scope: "editor",
    preventDefault: true,
  },

  // 5. 复制节点 (Cmd+D / Ctrl+D)
  {
    keys: "mod+d",
    commandId: "edit.duplicate",
    scope: "editor",
    preventDefault: true,
  },

  // 6. 增加缩进 (Cmd+] / Ctrl+])
  {
    keys: "mod+]",
    commandId: "node.indent",
    scope: "editor",
    preventDefault: true,
  },

  // 7. 减少缩进 (Cmd+[ / Ctrl+[)
  {
    keys: "mod+[",
    commandId: "node.outdent",
    scope: "editor",
    preventDefault: true,
  },

  // 8. 上移节点 (Cmd+Shift+↑ / Ctrl+Shift+↑)
  {
    keys: "mod+shift+up",
    commandId: "node.moveUp",
    scope: "editor",
    preventDefault: true,
  },

  // 9. 下移节点 (Cmd+Shift+↓ / Ctrl+Shift+↓)
  {
    keys: "mod+shift+down",
    commandId: "node.moveDown",
    scope: "editor",
    preventDefault: true,
  },
];
