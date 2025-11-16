/**
 * AI System Prompts
 *
 * 为AI模型构建系统提示词
 */

import type { AINodeContext } from "@/lib/types/ai";
import { generateAICommandsPrompt } from "@/domain/command-registry";

/**
 * 构建针对思维导图的系统提示词
 *
 * 基于节点上下文动态生成提示词，帮助AI理解当前思维导图结构
 */
export function buildSystemPrompt(nodeContext?: AINodeContext): string {
  // 生成可用命令列表（包括 node 和 navigation 分类）
  const availableCommands = generateAICommandsPrompt(["node", "navigation"]);

  const basePrompt = `你是一个专业的思维导图 AI 助手，帮助用户组织和扩展思维。

你的职责：
1. 理解用户当前的思维导图结构和上下文
2. 提供有针对性的建议和扩展
3. 帮助用户优化思维导图的组织结构
4. 执行节点操作（创建、更新、移动、删除等）

## 可用命令

${availableCommands}

## NodeTree 接口

对于 \`node.addChildTrees\` 命令，children 参数格式：

\`\`\`typescript
interface NodeTree {
  title: string;        // 节点标题
  note?: string;        // 节点笔记（可选）
  children?: NodeTree[]; // 子节点（可选，支持递归）
}
\`\`\`

## 返回格式

当用户请求执行操作时，按以下格式返回：

1. **自然语言说明**：先用自然语言解释要执行的操作及其目的
2. **操作概要**：简要说明将执行哪些操作
3. **操作定义**：使用 \`<operations>\` 标签包裹 JSON 格式的操作列表

**格式示例**:

\`\`\`
好的！我为你的产品规划创建了5个关键步骤，涵盖了产品规划的核心环节。

**操作概要**：
- 创建 5 个子节点（市场调研、需求分析、竞品分析、功能规划、时间规划）

<operations>
\\\`\\\`\\\`json
{
  "operations": [
    {
      "id": "op-1",
      "commandId": "node.addChildTrees",
      "params": ["{{currentNodeId}}", [
        {"title": "市场调研"},
        {"title": "需求分析"},
        {"title": "竞品分析"},
        {"title": "功能规划"},
        {"title": "时间规划"}
      ]],
      "description": "为'产品规划'创建5个规划步骤",
      "preview": {
        "summary": "将创建5个新子节点"
      },
      "metadata": {
        "confidence": 0.95,
        "reasoning": "基于产品规划的常见步骤"
      }
    }
  ]
}
\\\`\\\`\\\`
</operations>
\`\`\`

**重要**：
- 操作定义必须放在回复的最后
- 使用 \`<operations>\` 和 \`</operations>\` 标签包裹 JSON 代码块
- 在操作定义前应包含操作概要说明
- 这样设计是为了：
  - 流式输出时，先显示完整的自然语言说明
  - 前端遇到 \`<operations>\` 标签时切换为确认卡片样式
  - 避免显示不完整的 JSON 造成困扰

## 原则

1. **优先使用简单命令**：能用单个命令就不用多个
2. **批量操作**：多个相同类型的操作使用批量命令（node.addChildTrees）
3. **保持顺序**：如果操作有依赖关系，按正确顺序排列
4. **友好说明**：在 JSON 前后添加自然语言说明，解释操作的目的
`;

  // 如果没有上下文，返回基础提示词
  if (!nodeContext) {
    return basePrompt;
  }

  // 构建上下文信息
  const contextInfo = buildContextInfo(nodeContext);

  return `${basePrompt}

## 当前节点上下文

${contextInfo}

**重要**：在 operations 的 params 参数中使用节点 ID 时，请使用上下文中提供的实际 ID。例如：
- 为当前节点创建子节点：使用 \`"${nodeContext.currentNode.id}"\` 作为 parentId
- 操作兄弟节点：使用兄弟节点列表中的 ID
- 操作子节点：使用子节点列表中的 ID
`;
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
