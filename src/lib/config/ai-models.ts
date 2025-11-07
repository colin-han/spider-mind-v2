// lib/config/ai-models.ts

import { createOpenAI } from "@ai-sdk/openai";
import { openai } from "@ai-sdk/openai";
import { anthropic } from "@ai-sdk/anthropic";
import { deepseek } from "@ai-sdk/deepseek";
import { AIModelConfig, AIModelKey } from "@/lib/types/ai";

/**
 * 支持的 AI 模型配置
 */
export const AI_MODELS: Record<AIModelKey, AIModelConfig> = {
  // OpenAI
  "gpt-4-turbo": {
    provider: "openai",
    name: "GPT-4 Turbo",
    model: openai("gpt-4-turbo-preview"),
    description: "最强大的模型，适合复杂推理",
    cost: "高",
  },

  "gpt-3.5-turbo": {
    provider: "openai",
    name: "GPT-3.5 Turbo",
    model: openai("gpt-3.5-turbo"),
    description: "快速且经济，适合简单任务",
    cost: "低",
  },

  // Anthropic Claude
  "claude-3.5-sonnet": {
    provider: "anthropic",
    name: "Claude 3.5 Sonnet",
    model: anthropic("claude-3-5-sonnet-20241022"),
    description: "平衡性能和成本，中文友好",
    cost: "中",
  },

  "claude-3-haiku": {
    provider: "anthropic",
    name: "Claude 3 Haiku",
    model: anthropic("claude-3-haiku-20240307"),
    description: "最快的 Claude 模型",
    cost: "低",
  },

  // DeepSeek（国内模型，性价比高）
  "deepseek-chat": {
    provider: "deepseek",
    name: "DeepSeek Chat",
    model: deepseek("deepseek-chat"),
    description: "国内模型，性价比极高，中文优秀",
    cost: "极低",
  },

  // Moonshot（Kimi，OpenAI 兼容）
  "moonshot-v1": {
    provider: "moonshot",
    name: "Moonshot (Kimi)",
    model: createOpenAI({
      baseURL: "https://api.moonshot.cn/v1",
      apiKey: process.env["MOONSHOT_API_KEY"] || "",
    })("moonshot-v1-8k"),
    description: "国内模型，上下文长，中文好",
    cost: "中",
  },

  // 通义千问（Qwen，OpenAI 兼容）
  "qwen-turbo": {
    provider: "qwen",
    name: "通义千问 Turbo",
    model: createOpenAI({
      baseURL: "https://dashscope.aliyuncs.com/compatible-mode/v1",
      apiKey: process.env["QWEN_API_KEY"] || "",
    })("qwen-turbo"),
    description: "阿里云模型，速度快",
    cost: "低",
  },
} as const;

/**
 * 获取 AI 模型实例
 */
export function getAIModel(modelKey: AIModelKey = "claude-3.5-sonnet") {
  const config = AI_MODELS[modelKey];
  if (!config) {
    console.warn(
      `Model ${modelKey} not found, falling back to claude-3.5-sonnet`
    );
    return AI_MODELS["claude-3.5-sonnet"].model;
  }
  return config.model;
}

/**
 * 从环境变量加载默认模型
 */
export function getDefaultModel(): AIModelKey {
  const envModel = process.env["NEXT_PUBLIC_DEFAULT_AI_MODEL"] as AIModelKey;
  if (envModel && AI_MODELS[envModel]) {
    return envModel;
  }
  return "claude-3.5-sonnet";
}

/**
 * 获取模型配置信息（不含model实例）
 */
export function getModelInfo(modelKey: AIModelKey) {
  const config = AI_MODELS[modelKey];
  if (!config) return null;

  return {
    provider: config.provider,
    name: config.name,
    description: config.description,
    cost: config.cost,
  };
}

/**
 * 获取所有可用模型的列表
 */
export function getAllModels(): Array<{
  key: AIModelKey;
  name: string;
  description: string;
  cost: string;
}> {
  return Object.entries(AI_MODELS).map(([key, config]) => ({
    key: key as AIModelKey,
    name: config.name,
    description: config.description,
    cost: config.cost,
  }));
}
