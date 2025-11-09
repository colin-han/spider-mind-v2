/**
 * 节点操作命令的快捷键注册
 */

import {
  registerNonEditShortcut,
  registerShortcut,
} from "../shortcut-register";
import { getModifierKey } from "./platform-utils";

const mod = getModifierKey();

// Tab - 添加子节点
registerNonEditShortcut("tab", "node.addChild");

// Enter - 在下方添加兄弟节点
registerNonEditShortcut("enter", "node.addSiblingBelow");

// Shift+Enter - 在上方添加兄弟节点
registerNonEditShortcut("shift+enter", "node.addSiblingAbove");

// Delete - 删除节点
registerNonEditShortcut("delete", "node.delete", true);

// Backspace - 删除节点
registerNonEditShortcut("backspace", "node.delete", true);

// Cmd+Shift+↑ / Ctrl+Shift+↑ - 上移节点
registerShortcut(`${mod}+shift+arrowup`, "node.moveUp");

// Cmd+Shift+↓ / Ctrl+Shift+↓ - 下移节点
registerShortcut(`${mod}+shift+arrowdown`, "node.moveDown");
