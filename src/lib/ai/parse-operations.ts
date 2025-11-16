/**
 * AI 操作解析模块
 *
 * 提供从 AI 响应中解析操作的功能：
 * - 检测 <operations> 标签
 * - 提取说明文本
 * - 解析 JSON 操作列表
 */

import type { AIOperation } from "@/domain/ai";

/**
 * 从 AI 回复中提取操作列表
 * 支持 <operations> 标签包裹的 JSON 代码块
 *
 * @param aiResponse - AI 的完整响应文本
 * @returns 提取出的操作列表
 *
 * @example
 * ```typescript
 * const response = `
 * 我为你创建了3个节点。
 *
 * <operations>
 * \`\`\`json
 * {
 *   "operations": [...]
 * }
 * \`\`\`
 * </operations>
 * `;
 *
 * const operations = extractOperations(response);
 * ```
 */
export function extractOperations(aiResponse: string): AIOperation[] {
  // 匹配 <operations>...</operations> 标签内的 JSON 代码块
  const operationsRegex =
    /<operations>\s*```json\s*\n([\s\S]*?)\n```\s*<\/operations>/g;
  const matches = [...aiResponse.matchAll(operationsRegex)];

  if (matches.length === 0) {
    return [];
  }

  const operations: AIOperation[] = [];

  for (const match of matches) {
    try {
      const jsonStr = match[1];
      if (!jsonStr) {
        continue;
      }

      const parsed = JSON.parse(jsonStr);

      // 验证格式
      if (parsed.operations && Array.isArray(parsed.operations)) {
        operations.push(...parsed.operations);
      }
    } catch (error) {
      console.error("Failed to parse operations:", error);
    }
  }

  return operations;
}

/**
 * 检测流式输出中是否包含 <operations> 标签
 * 用于在流式输出时切换显示模式
 *
 * @param text - 当前累积的文本
 * @returns 是否包含 operations 标签
 *
 * @example
 * ```typescript
 * if (hasOperationsTag(accumulatedText)) {
 *   // 停止文本流式输出，显示 operations 面板
 * }
 * ```
 */
export function hasOperationsTag(text: string): boolean {
  return text.includes("<operations>");
}

/**
 * 提取 <operations> 标签之前的文本
 * 用于在流式输出时显示说明部分
 *
 * @param text - 当前累积的文本
 * @returns 标签之前的说明文本
 *
 * @example
 * ```typescript
 * const explanation = extractExplanation(accumulatedText);
 * setDisplayText(explanation); // 显示说明文本
 * ```
 */
export function extractExplanation(text: string): string {
  const operationsIndex = text.indexOf("<operations>");
  if (operationsIndex === -1) {
    return text;
  }
  return text.substring(0, operationsIndex).trim();
}

/**
 * 检测是否已接收完整的 operations 标签
 * 用于判断是否可以开始解析操作列表
 *
 * @param text - 当前累积的文本
 * @returns 是否包含完整的 operations 标签
 */
export function hasCompleteOperations(text: string): boolean {
  return text.includes("</operations>");
}
