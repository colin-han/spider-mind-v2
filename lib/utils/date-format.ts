import { formatDistanceToNow } from "date-fns";
import { zhCN } from "date-fns/locale";

/**
 * 将日期格式化为相对时间
 * @param date - ISO 日期字符串或 Date 对象
 * @returns 相对时间字符串，如 "2天前"、"刚刚"
 */
export function formatRelativeTime(date: string | Date): string {
  return formatDistanceToNow(new Date(date), {
    addSuffix: true,
    locale: zhCN,
  });
}
