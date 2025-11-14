// src/lib/ai/parse-suggestions.ts

import { NodeSuggestion } from "@/lib/types/ai";

/**
 * 从 AI 响应中解析结构化建议
 * 查找 JSON 代码块并解析其中的建议
 */
export function parseAISuggestions(content: string): NodeSuggestion[] {
  try {
    // 查找 JSON 代码块
    const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/);
    if (!jsonMatch || !jsonMatch[1]) {
      return [];
    }

    const parsed = JSON.parse(jsonMatch[1]);

    if (!parsed.suggestions || !Array.isArray(parsed.suggestions)) {
      return [];
    }

    // 为每个建议生成 ID，并确保 params 字段存在
    return parsed.suggestions.map(
      (s: Omit<NodeSuggestion, "id">, index: number) => ({
        id: `suggestion-${Date.now()}-${index}`,
        type: s.type,
        description: s.description,
        params: s.params || {}, // 确保 params 字段存在
      })
    );
  } catch (error) {
    console.error("Failed to parse suggestions:", error);
    return [];
  }
}

/**
 * 从内容中移除 JSON 建议块，只保留文本内容
 * 用于在显示时隐藏 JSON 代码块
 */
export function removeJSONSuggestions(content: string): string {
  return content.replace(/```json\s*[\s\S]*?\s*```/g, "").trim();
}
