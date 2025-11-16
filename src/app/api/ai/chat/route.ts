/**
 * AI Chat API Route
 *
 * 处理AI对话请求，使用进程池管理并发
 */

import { NextRequest } from "next/server";
import { convertToCoreMessages, streamText } from "ai";
import { getAIModel } from "@/lib/config/ai-models";
import { buildSystemPrompt } from "@/lib/ai/system-prompts";
import type { AINodeContext, AIModelKey } from "@/lib/types/ai";

/**
 * 生成唯一ID
 */
function generateId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * 从请求中获取用户ID
 *
 * TODO: 集成实际的认证系统
 * 目前使用临时方案：从header或cookie中获取，否则生成临时ID
 */
function getUserIdFromRequest(req: NextRequest): string {
  // 尝试从header获取
  const headerUserId = req.headers.get("x-user-id");
  if (headerUserId) {
    return headerUserId;
  }

  // 尝试从cookie获取
  const cookieUserId = req.cookies.get("user-id")?.value;
  if (cookieUserId) {
    return cookieUserId;
  }

  // 生成临时用户ID（开发阶段）
  const tempUserId = generateId("temp-user");
  console.warn(
    `[API /ai/chat] No user ID found, using temporary ID: ${tempUserId}`
  );
  return tempUserId;
}

/**
 * POST /api/ai/chat
 *
 * 处理AI对话请求
 */
export async function POST(req: NextRequest) {
  try {
    // 解析请求体
    const body = await req.json();
    const { messages, nodeContext, modelKey } = body as {
      messages: unknown; // UIMessage[] from useChat
      nodeContext?: AINodeContext;
      modelKey?: AIModelKey;
    };

    // 验证请求参数
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return new Response(JSON.stringify({ error: "Invalid messages" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // 转换 UIMessage 到 CoreMessage
    const coreMessages = convertToCoreMessages(messages);

    // 获取用户ID（用于日志）
    const userId = getUserIdFromRequest(req);
    console.log(`[API /ai/chat] Processing request for user ${userId}`);

    // 获取AI模型
    const model = getAIModel(modelKey || "claude-3.5-sonnet");

    // 构建系统提示词
    const systemPrompt = buildSystemPrompt(
      nodeContext || {
        currentNode: { id: "root", title: "Root" },
        parentChain: [],
        siblings: [],
        children: [],
      }
    );
    console.log("[API /ai/chat] System prompt:", systemPrompt);

    // 调用 streamText
    const result = await streamText({
      model,
      system: systemPrompt,
      messages: coreMessages,
      temperature: 0.7,
    });

    // 返回 UI Message Stream Response
    return result.toUIMessageStreamResponse();
  } catch (error) {
    console.error("[API /ai/chat] Error:", error);

    // 返回错误响应
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";

    return new Response(
      JSON.stringify({
        error: "Failed to process AI request",
        details: errorMessage,
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}

/**
 * GET /api/ai/chat
 *
 * 返回API信息
 */
export async function GET() {
  return new Response(
    JSON.stringify({
      message: "AI Chat API",
      version: "1.0.0",
      status: "operational",
    }),
    {
      status: 200,
      headers: { "Content-Type": "application/json" },
    }
  );
}
