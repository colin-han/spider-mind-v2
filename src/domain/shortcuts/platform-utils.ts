/**
 * 平台检测工具
 */

/**
 * 检测当前操作系统是否为 Mac
 */
export function isMac(): boolean {
  if (typeof window === "undefined") {
    return false;
  }
  return /Mac|iPhone|iPad|iPod/.test(navigator.platform);
}

/**
 * 获取修饰键前缀
 * Mac: meta (Cmd 键)
 * Windows/Linux: ctrl (Ctrl 键)
 */
export function getModifierKey(): "meta" | "ctrl" {
  return isMac() ? "meta" : "ctrl";
}
