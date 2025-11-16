/**
 * AI 操作参数转换器
 *
 * 负责将 AI 返回的参数（UUID 格式）转换为命令系统期望的格式（short_id）
 */

import { useMindmapStore } from "../mindmap-store";
import type { AIOperation } from "./types";

/**
 * 通过 UUID 查找节点的 short_id
 */
function uuidToShortId(uuid: string): string | null {
  const root = useMindmapStore.getState();
  const editor = root.currentEditor;

  if (!editor) return null;

  // 遍历所有节点查找匹配的 UUID
  for (const node of editor.nodes.values()) {
    if (node.id === uuid) {
      return node.short_id;
    }
  }

  return null;
}

/**
 * 检测字符串是否为 UUID 格式
 */
function isUUID(str: string): boolean {
  // UUID 格式：xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
}

/**
 * 转换参数数组中的 UUID 为 short_id
 *
 * @param params - 原始参数数组
 * @returns 转换后的参数数组
 */
function transformParams(params: unknown[]): unknown[] {
  return params.map((param) => {
    // 如果参数不是字符串，直接返回
    if (typeof param !== "string") {
      return param;
    }

    // 检测是否是 UUID 格式
    if (isUUID(param)) {
      const shortId = uuidToShortId(param);
      if (shortId) {
        console.log(`[参数转换] UUID ${param} -> short_id ${shortId}`);
        return shortId;
      }
      // 如果找不到对应的 short_id，保持原值（验证阶段会报错）
      console.warn(`[参数转换] 无法找到 UUID ${param} 对应的节点`);
    }

    return param;
  });
}

/**
 * 转换单个操作的参数
 *
 * @param operation - AI 操作
 * @returns 转换后的操作（新对象）
 */
export function transformOperationParams(operation: AIOperation): AIOperation {
  return {
    ...operation,
    params: transformParams(operation.params),
  };
}

/**
 * 批量转换操作参数
 *
 * @param operations - AI 操作数组
 * @returns 转换后的操作数组（新数组）
 */
export function transformOperationsParams(
  operations: AIOperation[]
): AIOperation[] {
  return operations.map(transformOperationParams);
}
