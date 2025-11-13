// src/components/ai/ai-chat-panel.tsx

"use client";

import { useEffect, useRef, useState, useMemo } from "react";
import { Sparkles, Send, XCircle } from "lucide-react";
import { MessageBubble } from "./message-bubble";
import { useAIConversationStore } from "@/domain/ai-conversation-store";
import { toMindmapMessage } from "@/lib/types/ai-conversation";

interface AIChatPanelProps {
  nodeId: string;
}

export function AIChatPanel({ nodeId }: AIChatPanelProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 手动管理输入状态
  const [input, setInput] = useState("");

  // 使用 AI 会话 Store
  const {
    getConversation,
    sendMessage,
    loadConversation,
    isStreaming,
    abortStream,
    setActiveNode,
  } = useAIConversationStore();

  // 获取当前会话
  const conversation = getConversation(nodeId);
  const streaming = isStreaming(nodeId);
  const messages = useMemo(
    () => conversation?.messages || [],
    [conversation?.messages]
  );
  const error = conversation?.error;

  // 加载会话（初始化）
  useEffect(() => {
    loadConversation(nodeId);
  }, [nodeId, loadConversation]);

  // 设置当前活跃节点
  useEffect(() => {
    setActiveNode(nodeId);
  }, [nodeId, setActiveNode]);

  // 自动滚动到底部
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // 处理发送消息
  const handleSend = async () => {
    if (!input.trim() || streaming) return;

    const message = input.trim();
    setInput("");

    // 发送消息（异步，不阻塞）
    await sendMessage(nodeId, message);
  };

  // 处理取消流式响应
  const handleAbort = () => {
    abortStream(nodeId);
  };

  return (
    <div
      className="flex flex-col h-full bg-white dark:bg-gray-900"
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
          <MessageBubble key={message.id} message={toMindmapMessage(message)} />
        ))}

        {streaming && (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
              <div className="w-2 h-2 bg-purple-500 rounded-full animate-pulse" />
              AI 正在思考...
            </div>
            <button
              onClick={handleAbort}
              className="text-xs text-red-500 hover:text-red-600 flex items-center gap-1"
              data-testid="ai-abort-button"
            >
              <XCircle size={14} />
              取消
            </button>
          </div>
        )}

        {error && (
          <div className="text-sm text-red-500 dark:text-red-400 bg-red-50 dark:bg-red-900/20 p-3 rounded border border-red-200 dark:border-red-800">
            <p className="font-medium mb-1">⚠️ 出错了</p>
            <p className="text-xs">{error}</p>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSend();
        }}
        className="border-t dark:border-gray-700 p-3 bg-gray-50 dark:bg-gray-900"
        data-testid="ai-chat-input"
      >
        <div className="flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder="输入消息..."
            disabled={streaming}
            className="flex-1 px-3 py-2 border dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:bg-gray-100 dark:disabled:bg-gray-700 disabled:cursor-not-allowed"
            data-testid="ai-input-textarea"
          />
          <button
            type="submit"
            disabled={!input.trim() || streaming}
            className="px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600 disabled:opacity-50 dark:disabled:bg-gray-700 disabled:cursor-not-allowed flex items-center gap-2 transition-colors"
            data-testid="ai-send-button"
          >
            <Send size={16} />
            发送
          </button>
        </div>
      </form>
    </div>
  );
}
