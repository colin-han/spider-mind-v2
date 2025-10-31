/**
 * 节点操作命令的快捷键注册
 */

import { registerShortcut } from "../shortcut-register";
import { getModifierKey } from "./platform-utils";

const mod = getModifierKey();

// Tab - 添加子节点
registerShortcut("tab", "node.addChild");

// Enter - 在下方添加兄弟节点
registerShortcut("enter", "node.addSiblingBelow");

// Delete - 删除节点
registerShortcut("delete", "node.delete");

// Backspace - 删除节点
registerShortcut("backspace", "node.delete");

// Cmd+Shift+↑ / Ctrl+Shift+↑ - 上移节点
registerShortcut(`${mod}+shift+arrowup`, "node.moveUp");

// Cmd+Shift+↓ / Ctrl+Shift+↓ - 下移节点
registerShortcut(`${mod}+shift+arrowdown`, "node.moveDown");
