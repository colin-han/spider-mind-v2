// src/components/ai/ai-chat-panel.tsx

"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useEffect, useRef, useState } from "react";
import { Sparkles, Send } from "lucide-react";
import { buildNodeContext } from "@/lib/ai/node-context";
import { MessageBubble } from "./message-bubble";
import { getEnvConfig } from "@/lib/env";

interface AIChatPanelProps {
  nodeId: string;
}

export function AIChatPanel({ nodeId }: AIChatPanelProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 构建节点上下文
  let nodeContext;
  try {
    nodeContext = buildNodeContext(nodeId);
  } catch (error) {
    console.error("Failed to build node context:", error);
    nodeContext = null;
  }

  // AI SDK v5: 手动管理输入状态
  const [input, setInput] = useState("");

  // 🔑 核心：使用 Vercel AI SDK 的 useChat hook
  // useChat 自动处理：
  // - 流式响应（SSE）
  // - 消息状态管理（messages, status, error）
  const { messages, sendMessage, status, error } = useChat({
    // AI SDK v5: use DefaultChatTransport
    transport: new DefaultChatTransport({
      api: "/api/ai/chat",
      // Pass nodeContext and modelKey in the request body
      body: {
        nodeContext,
        modelKey: getEnvConfig().NEXT_PUBLIC_DEFAULT_AI_MODEL,
      },
    }),
    // TODO: Phase 2 - 从 IndexedDB 加载初始消息
    // initialMessages: useAIConversationStore.getState().getMessages(nodeId),
    // TODO: Phase 2 - 消息更新时保存到 IndexedDB
    // onFinish: (message) => {
    //   saveConversation(nodeId, messages);
    // },
  });

  // AI SDK v5: status values are "ready" | "submitted" | "streaming" | "error"
  const isLoading = status !== "ready";

  // 自动滚动到底部
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <div
      className="ai-panel-expanded flex flex-col h-full"
      data-testid="ai-chat-panel"
    >
      {/* Messages */}
      <div
        className="flex-1 overflow-y-auto p-4 space-y-4"
        data-testid="ai-message-list"
      >
        {messages.length === 0 && (
          <div className="text-center text-gray-500 dark:text-gray-400 text-sm py-8">
            <div className="mb-4">
              <Sparkles
                size={32}
                className="text-purple-300 dark:text-purple-400 mx-auto mb-2"
              />
            </div>
            <p className="mb-2">👋 你好！我可以帮你拓展思维导图。</p>
            <p className="text-xs">试试问我：</p>
            <div className="mt-2 space-y-1 text-left max-w-xs mx-auto">
              <div className="bg-gray-50 dark:bg-gray-700 p-2 rounded text-xs">
                &ldquo;帮我为这个节点生成子主题&rdquo;
              </div>
              <div className="bg-gray-50 dark:bg-gray-700 p-2 rounded text-xs">
                &ldquo;分析一下当前的结构&rdquo;
              </div>
            </div>
          </div>
        )}

        {messages.map((message) => (
          <MessageBubble key={message.id} message={message} />
        ))}

        {isLoading && (
          <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
            <div className="w-2 h-2 bg-purple-500 rounded-full animate-pulse" />
            AI 正在思考...
          </div>
        )}

        {error && (
          <div className="text-sm text-red-500 dark:text-red-400 bg-red-50 dark:bg-red-900/20 p-3 rounded border border-red-200 dark:border-red-800">
            <p className="font-medium mb-1">⚠️ 出错了</p>
            <p className="text-xs">{error.message}</p>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (input.trim() && !isLoading && nodeContext) {
            sendMessage({ text: input }); // AI SDK v5: sendMessage takes an object with text property
            setInput(""); // Clear input after sending
          }
        }}
        className="border-t dark:border-gray-700 p-3"
        data-testid="ai-chat-input"
      >
        <div className="flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)} // AI SDK v5: manually manage input state
            placeholder="输入消息..."
            disabled={isLoading || !nodeContext}
            className="flex-1 px-3 py-2 border dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:bg-gray-100 dark:disabled:bg-gray-700 disabled:cursor-not-allowed"
            data-testid="ai-input-textarea"
          />
          <button
            type="submit"
            disabled={!input.trim() || isLoading || !nodeContext}
            className="px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600 disabled:opacity-50 dark:disabled:bg-gray-700 disabled:cursor-not-allowed flex items-center gap-2 transition-colors"
            data-testid="ai-send-button"
          >
            <Send size={16} />
            发送
          </button>
        </div>
        {!nodeContext && (
          <p className="text-xs text-red-500 dark:text-red-400 mt-1">
            无法加载节点上下文，请刷新页面重试
          </p>
        )}
      </form>
    </div>
  );
}
