/**
 * 自动编辑模式管理器
 *
 * 管理从 Graph View 到 Node Panel 的待输入字符传递
 */

let pendingInputChar: string | null = null;

/**
 * 设置待输入字符
 * 当用户在 Graph View 中输入可打印字符时调用
 */
export function setPendingInputChar(char: string): void {
  pendingInputChar = char;
}

/**
 * 获取待输入字符
 * 在 title input 获得焦点后调用，获取需要应用的字符
 */
export function getPendingInputChar(): string | null {
  return pendingInputChar;
}

/**
 * 清除待输入字符
 * 在应用待输入字符后调用
 */
export function clearPendingInputChar(): void {
  pendingInputChar = null;
}
