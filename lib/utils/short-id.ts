import { customAlphabet } from "nanoid";

/**
 * 生成 6 位小写字母和数字的短 ID (base36)
 * 用于 mind_maps 和 mind_map_nodes 的 short_id 字段
 */
const nanoid = customAlphabet("abcdefghijklmnopqrstuvwxyz0123456789", 6);

export function generateShortId(): string {
  return nanoid();
}
