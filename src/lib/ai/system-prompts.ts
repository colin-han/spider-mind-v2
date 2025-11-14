/**
 * AI System Prompts
 *
 * 为AI模型构建系统提示词
 */

import type { AINodeContext } from "@/lib/types/ai";

/**
 * 构建针对思维导图的系统提示词
 *
 * 基于节点上下文动态生成提示词，帮助AI理解当前思维导图结构
 */
export function buildSystemPrompt(nodeContext?: AINodeContext): string {
  const basePrompt = `你是一个专业的思维导图AI助手，帮助用户组织和扩展思维。

你的职责：
1. 理解用户当前的思维导图结构和上下文
2. 提供有针对性的建议和扩展
3. 帮助用户优化思维导图的组织结构
4. 提供相关的子主题建议

输出格式：
- 使用简洁、清晰的语言
- 提供具体、可操作的建议
- 如果需要建议新节点，以Markdown列表形式提供
- 可以使用JSON代码块来提供结构化建议

JSON建议格式（可选）：
\`\`\`json
{
  "suggestions": [
    {
      "type": "create_children",
      "titles": ["子节点1", "子节点2"]
    },
    {
      "type": "update_title",
      "title": "新标题"
    },
    {
      "type": "reorganize",
      "structure": {
        "parent": "父节点ID",
        "children": ["子节点ID1", "子节点ID2"]
      }
    }
  ]
}
\`\`\`
`;

  // 如果没有上下文，返回基础提示词
  if (!nodeContext) {
    return basePrompt;
  }

  // 构建上下文信息
  const contextInfo = buildContextInfo(nodeContext);

  return `${basePrompt}

${contextInfo}`;
}

/**
 * 构建节点上下文信息
 */
function buildContextInfo(context: AINodeContext): string {
  const parts: string[] = [];

  // 当前节点信息
  parts.push(`当前节点：
- 标题：${context.currentNode.title}
- ID：${context.currentNode.id}`);

  // 父节点链信息
  if (context.parentChain.length > 0) {
    const chain = context.parentChain
      .map((node: { id: string; title: string }) => node.title)
      .join(" > ");
    parts.push(`\n父节点链：${chain}`);
  }

  // 兄弟节点信息
  if (context.siblings.length > 0) {
    const siblings = context.siblings
      .map((node: { id: string; title: string }) => `- ${node.title}`)
      .join("\n");
    parts.push(`\n兄弟节点：\n${siblings}`);
  }

  // 子节点信息
  if (context.children.length > 0) {
    const children = context.children
      .map((node: { id: string; title: string }) => `- ${node.title}`)
      .join("\n");
    parts.push(`\n子节点：\n${children}`);
  } else {
    parts.push("\n子节点：（无）");
  }

  return parts.join("\n");
}

/**
 * 为不同场景构建专门的提示词
 */
export const SCENARIO_PROMPTS = {
  /**
   * 扩展子节点场景
   */
  expandChildren: (nodeContext: AINodeContext): string => {
    return `${buildSystemPrompt(nodeContext)}

用户希望为当前节点"${nodeContext.currentNode.title}"扩展子节点。
请分析该主题，提供3-5个相关的子主题建议。
考虑已有的子节点（${nodeContext.children.map((n: { id: string; title: string }) => n.title).join("、")}），避免重复。`;
  },

  /**
   * 重组结构场景
   */
  reorganize: (nodeContext: AINodeContext): string => {
    return `${buildSystemPrompt(nodeContext)}

用户希望优化当前节点"${nodeContext.currentNode.title}"的结构。
请分析现有的子节点和兄弟节点，提供重组建议。`;
  },

  /**
   * 总结归纳场景
   */
  summarize: (nodeContext: AINodeContext): string => {
    return `${buildSystemPrompt(nodeContext)}

用户希望总结当前节点"${nodeContext.currentNode.title}"及其子节点的内容。
请提供一个简洁的总结。`;
  },

  /**
   * 提供问题场景
   */
  generateQuestions: (nodeContext: AINodeContext): string => {
    return `${buildSystemPrompt(nodeContext)}

基于当前节点"${nodeContext.currentNode.title}"，请提出3-5个深入思考的问题，
帮助用户进一步探索这个主题。`;
  },
};
