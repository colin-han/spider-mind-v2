import { customAlphabet } from "nanoid";
import { isReservedShortId } from "@/lib/constants/reserved-words";

/**
 * 生成 6 位小写字母和数字的短 ID (base36)
 * 用于 mindmaps 和 mindmap_nodes 的 short_id 字段
 */
const nanoid = customAlphabet("abcdefghijklmnopqrstuvwxyz0123456789", 6);

/**
 * 生成短 ID，自动避开保留词
 * @param maxRetries 最大重试次数，默认 10
 * @returns 6 位 base36 格式的短 ID
 * @throws 如果超过最大重试次数仍然生成保留词
 */
export function generateShortId(maxRetries: number = 10): string {
  for (let i = 0; i < maxRetries; i++) {
    const shortId = nanoid();

    // 检查是否为保留词
    if (!isReservedShortId(shortId)) {
      return shortId;
    }
  }

  throw new Error(
    `Failed to generate non-reserved short ID after ${maxRetries} attempts`
  );
}
