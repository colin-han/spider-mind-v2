/**
 * 键盘事件处理工具函数
 */

/**
 * 判断键盘事件是否为可打印字符输入
 *
 * 排除以下情况：
 * - 修饰键组合（快捷键）：Ctrl+C、Cmd+V等
 * - 空格键（用于 navigation.toggleCollapse 命令）
 * - 功能键：Enter、Escape、方向键、F1-F12等
 * - 纯修饰键：Shift、Ctrl、Alt、Meta单独按下
 *
 * 包含以下情况：
 * - 字母、数字、符号
 * - 中文、日文等多字节字符
 *
 * @param event - 键盘事件
 * @returns 是否为可打印字符
 */
export function isPrintableCharacter(event: KeyboardEvent): boolean {
  // 1. 排除修饰键组合（快捷键）
  if (event.ctrlKey || event.metaKey || event.altKey) {
    return false;
  }

  // 2. 排除空格键（用于 navigation.toggleCollapse - 切换节点折叠状态）
  if (event.key === " ") {
    return false;
  }

  // 3. 排除功能键
  const nonPrintableKeys = [
    "Enter",
    "Escape",
    "Tab",
    "Backspace",
    "Delete",
    "ArrowLeft",
    "ArrowRight",
    "ArrowUp",
    "ArrowDown",
    "Home",
    "End",
    "PageUp",
    "PageDown",
    "F1",
    "F2",
    "F3",
    "F4",
    "F5",
    "F6",
    "F7",
    "F8",
    "F9",
    "F10",
    "F11",
    "F12",
    "CapsLock",
    "NumLock",
    "ScrollLock",
    "Shift",
    "Control",
    "Alt",
    "Meta",
  ];

  if (nonPrintableKeys.includes(event.key)) {
    return false;
  }

  // 4. 检查是否为单字符可打印输入
  // key.length === 1 涵盖了字母、数字、符号、中文等
  return event.key.length === 1;
}
