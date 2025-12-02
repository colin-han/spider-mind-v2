/**
 * 自动编辑模式管理器
 *
 * 管理自动编辑模式的状态标志
 */

let isAutoEditMode = false;

/**
 * 标记进入自动编辑模式
 * 当用户在 Graph View 中输入可打印字符时调用
 */
export function enterAutoEditMode(): void {
  isAutoEditMode = true;
}

/**
 * 检查是否处于自动编辑模式
 * 在 title input 获得焦点后调用
 */
export function isInAutoEditMode(): boolean {
  return isAutoEditMode;
}

/**
 * 退出自动编辑模式
 * 在 title input 处理完自动编辑后调用
 */
export function exitAutoEditMode(): void {
  isAutoEditMode = false;
}
