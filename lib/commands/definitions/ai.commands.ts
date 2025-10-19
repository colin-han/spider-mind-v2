/**
 * AI 相关命令定义
 */

import type { Command } from "../types";

/**
 * AI 命令集合
 */
export const aiCommands: Command[] = [
  // ========== 1. AI 助手 ==========
  {
    id: "ai.assist",
    name: "AI 助手",
    description: "使用 AI 助手分析和处理当前节点",
    category: "ai",

    when: (ctx) => {
      // 必须有当前节点
      return ctx.store.currentNode !== null;
    },

    handler: () => {
      // TODO: 实现 AI 助手功能
      alert("AI Agent 功能即将上线");
    },
  },
];
