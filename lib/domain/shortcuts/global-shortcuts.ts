/**
 * 全局操作命令的快捷键注册
 */

import {
  registerNonEditShortcut,
  registerShortcut,
} from "../shortcut-register";
import { getModifierKey } from "./platform-utils";

const mod = getModifierKey();

// Cmd+S / Ctrl+S - 保存
registerShortcut(`${mod}+s`, "global.save", true);

// Cmd+Z / Ctrl+Z - 撤销
registerNonEditShortcut(`${mod}+z`, "global.undo", true);

// Cmd+Shift+Z / Ctrl+Shift+Z - 重做
registerNonEditShortcut(`${mod}+shift+z`, "global.redo", true);
