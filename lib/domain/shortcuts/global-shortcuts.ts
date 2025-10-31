/**
 * 全局操作命令的快捷键注册
 */

import { registerShortcut } from "../shortcut-register";
import { getModifierKey } from "./platform-utils";

const mod = getModifierKey();

// Cmd+S / Ctrl+S - 保存
registerShortcut(`${mod}+s`, "mindmap.save");

// Cmd+Z / Ctrl+Z - 撤销
registerShortcut(`${mod}+z`, "history.undo");

// Cmd+Shift+Z / Ctrl+Shift+Z - 重做
registerShortcut(`${mod}+shift+z`, "history.redo");
