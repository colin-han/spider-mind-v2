// lib/types/ai.ts
import { UIMessage, LanguageModel } from "ai"; // AI SDK v5: Message renamed to UIMessage

/**
 * 节点操作建议
 */
export interface NodeSuggestion {
  id: string;
  type: "create_children" | "update_title" | "reorganize" | "expand";
  description: string; // 建议描述

  // 应用建议所需的参数
  params: {
    children?: { title: string }[];
    newTitle?: string;
    reorganization?: {
      action: "group" | "split" | "merge";
      details: unknown;
    };
  };
}

/**
 * 扩展的消息类型（添加思维导图特定的元数据）
 */
export interface MindmapMessage extends UIMessage {
  // 可选：AI 生成的结构化建议
  suggestions?: NodeSuggestion[];

  // 可选：节点上下文快照（用于调试）
  nodeContext?: AINodeContext;
}

/**
 * 对话会话（节点级）
 */
export interface Conversation {
  id: string; // 对话 ID
  node_id: string; // 关联的节点 ID
  messages: MindmapMessage[]; // 消息列表
  created_at: string; // 创建时间
  updated_at: string; // 最后更新时间
}

/**
 * AI 上下文（传递给 AI 的节点上下文）
 */
export interface AINodeContext {
  currentNode: {
    id: string;
    title: string;
  };
  parentChain: { id: string; title: string }[]; // 祖先节点链
  siblings: { id: string; title: string }[]; // 兄弟节点
  children: { id: string; title: string }[]; // 子节点
}

/**
 * AI 模型键类型（从配置文件导出）
 */
export type AIModelKey =
  | "gpt-4-turbo"
  | "gpt-3.5-turbo"
  | "claude-3.5-sonnet"
  | "claude-3-haiku"
  | "deepseek-chat"
  | "moonshot-v1"
  | "qwen-turbo";

/**
 * AI 模型配置
 */
export interface AIModelConfig {
  provider: string;
  name: string;
  model: LanguageModel; // 实际的模型实例
  description: string;
  cost: "极低" | "低" | "中" | "高";
}
