/**
 * 导航操作命令的快捷键注册
 */

import {
  registerNonEditShortcut,
  registerShortcut,
} from "../shortcut-register";
import type { FocusedAreaId } from "../focused-area.types";

// ← - 选择父节点
registerNonEditShortcut("arrowleft", "navigation.selectParent", true);

// → - 选择第一个子节点
registerNonEditShortcut("arrowright", "navigation.selectFirstChild", true);

// ↑ - 选择上一个兄弟节点
registerNonEditShortcut("arrowup", "navigation.selectPreviousSibling", true);

// ↓ - 选择下一个兄弟节点
registerNonEditShortcut("arrowdown", "navigation.selectNextSibling", true);

// Cmd+[ - 折叠节点
registerNonEditShortcut("meta+[", "navigation.collapseNode", true);

// Cmd+] - 展开节点
registerNonEditShortcut("meta+]", "navigation.expandNode", true);

// Cmd+\ - 递归折叠子树
registerNonEditShortcut("meta+\\", "navigation.collapseSubtreeRecursive", true);

// 递归展开子树命令已实现，但暂不绑定快捷键
// navigation.expandSubtreeRecursive

// Space - 编辑标题
registerShortcut({
  key: " ",
  run: () => ({
    commandId: "global.setFocusedArea",
    params: ["title-editor"],
    preventDefault: true,
  }),
  when: (root) => {
    // 只在非编辑区域生效
    const editingAreas: FocusedAreaId[] = [
      "title-editor",
      "note-editor",
      "ai-chat",
    ];
    const currentArea = root.currentEditor!.focusedArea as FocusedAreaId;
    if (editingAreas.includes(currentArea)) {
      return false;
    }

    // 检查焦点是否在 input 或 textarea 内
    const activeElement = document.activeElement;
    if (
      activeElement &&
      (activeElement.tagName === "INPUT" ||
        activeElement.tagName === "TEXTAREA")
    ) {
      return false;
    }

    return true;
  },
});
