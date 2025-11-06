import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * 合并类名的工具函数
 *
 * 结合 clsx 和 tailwind-merge 的优势：
 * - clsx: 灵活处理条件类名、数组、对象等多种格式
 * - tailwind-merge: 智能合并 Tailwind CSS 类，避免冲突
 *
 * @example
 * cn('px-2 py-1', { 'bg-red-500': isError })
 * cn('px-2', 'px-4') // 结果: 'px-4' (后者覆盖前者)
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
