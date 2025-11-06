/**
 * 导航操作命令的快捷键注册
 */

import { registerNonEditShortcut } from "../shortcut-register";

// ← - 选择父节点
registerNonEditShortcut("arrowleft", "navigation.selectParent", true);

// → - 选择第一个子节点
registerNonEditShortcut("arrowright", "navigation.selectFirstChild", true);

// ↑ - 选择上一个兄弟节点
registerNonEditShortcut("arrowup", "navigation.selectPreviousSibling", true);

// ↓ - 选择下一个兄弟节点
registerNonEditShortcut("arrowdown", "navigation.selectNextSibling", true);

// - - 折叠节点
registerNonEditShortcut("-", "navigation.collapseNode", true);

// = - 展开节点
registerNonEditShortcut("=", "navigation.expandNode", true);

// Space - 切换折叠状态
registerNonEditShortcut(" ", "navigation.toggleCollapse", true);
