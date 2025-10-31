/**
 * 导航操作命令的快捷键注册
 */

import { registerShortcut } from "../shortcut-register";

// ← - 选择父节点
registerShortcut("arrowleft", "navigation.selectParent");

// → - 选择第一个子节点
registerShortcut("arrowright", "navigation.selectFirstChild");

// ↑ - 选择上一个兄弟节点
registerShortcut("arrowup", "navigation.selectPreviousSibling");

// ↓ - 选择下一个兄弟节点
registerShortcut("arrowdown", "navigation.selectNextSibling");

// - - 折叠节点
registerShortcut("-", "navigation.collapseNode");

// = - 展开节点
registerShortcut("=", "navigation.expandNode");

// Space - 切换折叠状态
registerShortcut(" ", "navigation.toggleCollapse");
