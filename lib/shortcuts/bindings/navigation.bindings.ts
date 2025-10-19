/**
 * 导航快捷键绑定
 *
 * 基于文档: docs/draft/shortcut-key-bindings.md
 */

import type { ShortcutBinding } from "../types";

/**
 * 导航快捷键绑定列表
 */
export const navigationBindings: ShortcutBinding[] = [
  // 1. 选择父节点 (←)
  {
    keys: "arrowleft",
    commandId: "navigation.selectParent",
    scope: "editor",
    preventDefault: true,
  },

  // 2. 选择第一个子节点 (→)
  {
    keys: "arrowright",
    commandId: "navigation.selectFirstChild",
    scope: "editor",
    preventDefault: true,
  },

  // 3. 选择上一个兄弟节点 (↑)
  {
    keys: "arrowup",
    commandId: "navigation.selectPreviousSibling",
    scope: "editor",
    preventDefault: true,
  },

  // 4. 选择下一个兄弟节点 (↓)
  {
    keys: "arrowdown",
    commandId: "navigation.selectNextSibling",
    scope: "editor",
    preventDefault: true,
  },

  // 5. 折叠节点 (-)
  {
    keys: "-",
    commandId: "navigation.collapseNode",
    scope: "editor",
    preventDefault: true,
  },

  // 6. 展开节点 (+)
  {
    keys: "=",
    commandId: "navigation.expandNode",
    scope: "editor",
    preventDefault: true,
  },

  // 7. 切换折叠/展开 (Space)
  {
    keys: "space",
    commandId: "navigation.toggleCollapse",
    scope: "editor",
    preventDefault: true,
  },
];
