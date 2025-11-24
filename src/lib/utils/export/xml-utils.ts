/**
 * XML 工具函数
 *
 * 提供 XML 生成和处理的基础工具
 */

/**
 * XML特殊字符转义
 *
 * 将字符串中的特殊字符转义为 XML 实体
 *
 * @param str - 需要转义的字符串
 * @returns 转义后的字符串
 */
export function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/**
 * 生成时间戳（毫秒）
 *
 * XMind 使用毫秒级时间戳
 *
 * @returns 当前时间的毫秒时间戳
 */
export function generateTimestamp(): number {
  return Date.now();
}
