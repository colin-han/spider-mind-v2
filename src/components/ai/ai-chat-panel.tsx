// src/components/ai/ai-chat-panel.tsx

"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, UIMessage } from "ai";
import {
  useEffect,
  useRef,
  useState,
  forwardRef,
  useImperativeHandle,
  useCallback,
} from "react";
import { Sparkles, Send, Loader2 } from "lucide-react";
import { buildNodeContext } from "@/lib/ai/node-context";
import { MessageBubble } from "./message-bubble";
import {
  loadConversation,
  createAIMessage,
} from "@/lib/ai/conversation-persistence";
import { AddAIMessageAction } from "@/domain/actions/persistent/add-ai-message";
import { UpdateAIMessageMetadataAction } from "@/domain/actions/persistent/update-ai-message-metadata";
import { useMindmapStore } from "@/domain/mindmap-store";
import type { AINodeContext, AIMessage } from "@/lib/types/ai";
import type { OperationWithId } from "@/lib/ai/tools";
import { getDB } from "@/lib/db/schema";

interface AIChatPanelProps {
  nodeId: string;
}

/**
 * AIChatPanel 的命令式句柄
 */
export interface AIChatPanelHandle {
  focus: () => void;
}

export const AIChatPanel = forwardRef<AIChatPanelHandle, AIChatPanelProps>(
  function AIChatPanel({ nodeId }, ref) {
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const store = useMindmapStore();

    // 暴露命令式 API
    useImperativeHandle(ref, () => ({
      focus: () => {
        // 如果输入框已存在，直接聚焦
        if (inputRef.current) {
          inputRef.current.focus();
          return;
        }
        // 如果还在加载，等待输入框出现后再聚焦
        const maxAttempts = 20; // 最多等待 1 秒 (20 * 50ms)
        let attempts = 0;
        const checkAndFocus = () => {
          if (inputRef.current) {
            inputRef.current.focus();
          } else if (attempts < maxAttempts) {
            attempts++;
            setTimeout(checkAndFocus, 50);
          }
        };
        setTimeout(checkAndFocus, 50);
      },
    }));

    // 对话历史加载状态
    const [initialMessages, setInitialMessages] = useState<UIMessage[]>([]);
    const [isLoadingHistory, setIsLoadingHistory] = useState(true);
    const [historyError, setHistoryError] = useState<string | null>(null);

    // 消息 metadata 映射（messageId -> metadata）
    const [messageMetadataMap, setMessageMetadataMap] = useState<
      Map<string, AIMessage["metadata"]>
    >(new Map());

    // 获取当前思维导图 ID
    const mindmapId = store.currentEditor?.currentMindmap.id;

    // 构建节点上下文
    let nodeContext: AINodeContext | null = null;
    try {
      nodeContext = buildNodeContext(nodeId);
    } catch (error) {
      console.error("Failed to build node context:", error);
      nodeContext = null;
    }

    // AI SDK v5: 手动管理输入状态
    const [input, setInput] = useState("");

    // 加载对话历史
    useEffect(() => {
      async function loadHistory() {
        setIsLoadingHistory(true);
        setHistoryError(null);
        try {
          // 使用 nodeContext 中的 UUID 进行对话持久化
          const nodeUUID = nodeContext?.currentNode.id;
          if (!nodeUUID) {
            throw new Error("Node UUID not available");
          }
          const messages = await loadConversation(nodeUUID);
          setInitialMessages(messages);

          // 加载消息的 metadata 映射
          const db = await getDB();
          const aiMessages = await db.getAllFromIndex(
            "ai_messages",
            "by-node",
            nodeUUID
          );
          const metadataMap = new Map<string, AIMessage["metadata"]>();
          for (const msg of aiMessages) {
            if (msg.metadata) {
              metadataMap.set(msg.id, msg.metadata);
            }
          }
          setMessageMetadataMap(metadataMap);
        } catch (error) {
          console.error("Failed to load conversation history:", error);
          setHistoryError(
            error instanceof Error ? error.message : "加载对话历史失败"
          );
          setInitialMessages([]);
          setMessageMetadataMap(new Map());
        } finally {
          setIsLoadingHistory(false);
        }
      }

      if (nodeContext) {
        loadHistory();
      } else {
        setIsLoadingHistory(false);
      }
    }, [nodeId]); // eslint-disable-line react-hooks/exhaustive-deps

    // 保存消息到 IndexedDB
    const saveMessage = useCallback(
      async (message: UIMessage) => {
        if (!mindmapId || !nodeContext) return;

        const aiMessage = createAIMessage(
          message.id,
          message.role as "user" | "assistant",
          message.parts,
          nodeContext.currentNode.id, // 使用 UUID 进行数据库持久化
          mindmapId
        );

        const action = new AddAIMessageAction(aiMessage);
        await store.acceptActions([action]);
      },
      [mindmapId, nodeContext, store]
    );

    // 🔑 核心：使用 Vercel AI SDK 的 useChat hook
    // useChat 自动处理：
    // - 流式响应（SSE）
    // - 消息状态管理（messages, status, error）
    const { messages, sendMessage, status, error, setMessages } = useChat({
      // AI SDK v5: use DefaultChatTransport
      transport: new DefaultChatTransport({
        api: "/api/ai/chat",
        // Pass nodeContext and modelKey in the request body
        body: {
          nodeContext,
          modelKey: process.env["NEXT_PUBLIC_DEFAULT_AI_MODEL"],
        },
      }),
      // 使用加载的历史消息作为初始消息
      messages: initialMessages,
      // 消息完成时保存
      onFinish: async ({ message }) => {
        try {
          await saveMessage(message);
        } catch (error) {
          console.error("Failed to save AI message:", error);
        }
      },
    });

    // 当 initialMessages 变化时，更新 useChat 的消息
    useEffect(() => {
      setMessages(initialMessages);
    }, [initialMessages, setMessages]);

    // AI SDK v5: status values are "ready" | "submitted" | "streaming" | "error"
    const isLoading = status !== "ready";

    // 处理操作执行回调
    const handleOperationsApplied = useCallback(
      async (
        messageId: string,
        selectedIds: string[],
        operations: OperationWithId[]
      ) => {
        if (!mindmapId || !nodeContext) return;

        try {
          // 1. 更新消息的 metadata
          const updateAction = new UpdateAIMessageMetadataAction(messageId, {
            operationsApplied: true,
            appliedOperationIds: selectedIds,
            appliedAt: new Date().toISOString(),
          });
          await store.acceptActions([updateAction]);

          // 2. 更新本地 metadata 映射
          setMessageMetadataMap((prev) => {
            const newMap = new Map(prev);
            const existingMetadata = newMap.get(messageId) || {};
            newMap.set(messageId, {
              ...existingMetadata,
              operationsApplied: true,
              appliedOperationIds: selectedIds,
              appliedAt: new Date().toISOString(),
            });
            return newMap;
          });

          // 3. 生成确认消息（仅保存本地，不触发 AI 请求）
          const selectedOps = operations.filter((op) =>
            selectedIds.includes(op.id)
          );
          const confirmationText = `我已执行以下操作：\n${selectedOps.map((op) => `- ${(op as unknown as { description: string }).description || "操作"}`).join("\n")}`;

          // 保存用户消息到数据库
          const userMessageId = `user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
          const userMessage = createAIMessage(
            userMessageId,
            "user",
            [{ type: "text", text: confirmationText }],
            nodeContext.currentNode.id, // 使用 UUID 进行数据库持久化
            mindmapId
          );
          await store.acceptActions([new AddAIMessageAction(userMessage)]);

          // 将确认消息添加到界面显示（不触发 AI 请求）
          setMessages((prev) => [
            ...prev,
            {
              id: userMessageId,
              role: "user" as const,
              parts: [{ type: "text" as const, text: confirmationText }],
            },
          ]);
        } catch (error) {
          console.error("Failed to handle operations applied:", error);
        }
      },
      [mindmapId, nodeContext, store, setMessages]
    );

    // 处理操作取消回调
    const handleOperationsCancelled = useCallback(
      async (messageId: string, operations: OperationWithId[]) => {
        if (!mindmapId || !nodeContext) return;

        try {
          // 1. 更新消息的 metadata 标记为已取消
          const updateAction = new UpdateAIMessageMetadataAction(messageId, {
            operationsApplied: true, // 也设置为 true，表示用户已处理过这个建议
            operationsCancelled: true,
            cancelledAt: new Date().toISOString(),
          });
          await store.acceptActions([updateAction]);

          // 2. 更新本地 metadata 映射
          setMessageMetadataMap((prev) => {
            const newMap = new Map(prev);
            const existingMetadata = newMap.get(messageId) || {};
            newMap.set(messageId, {
              ...existingMetadata,
              operationsApplied: true,
              operationsCancelled: true,
              cancelledAt: new Date().toISOString(),
            });
            return newMap;
          });

          // 3. 生成取消消息（仅保存本地，不触发 AI 请求）
          const cancellationText = `我已取消了你建议的 ${operations.length} 个操作。`;

          // 保存用户消息到数据库
          const userMessageId = `user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
          const userMessage = createAIMessage(
            userMessageId,
            "user",
            [{ type: "text", text: cancellationText }],
            nodeContext.currentNode.id, // 使用 UUID 进行数据库持久化
            mindmapId
          );
          await store.acceptActions([new AddAIMessageAction(userMessage)]);

          // 将取消消息添加到界面显示（不触发 AI 请求）
          setMessages((prev) => [
            ...prev,
            {
              id: userMessageId,
              role: "user" as const,
              parts: [{ type: "text" as const, text: cancellationText }],
            },
          ]);
        } catch (error) {
          console.error("Failed to handle operations cancelled:", error);
        }
      },
      [mindmapId, nodeContext, store, setMessages]
    );

    // 自动滚动到底部
    useEffect(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    // 显示加载状态
    if (isLoadingHistory) {
      return (
        <div
          className="ai-panel-expanded flex flex-col h-full items-center justify-center"
          data-testid="ai-chat-panel-loading"
        >
          <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
          <p className="mt-2 text-sm text-gray-500">加载对话历史...</p>
        </div>
      );
    }

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
          {historyError && (
            <div className="text-sm text-yellow-600 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-900/20 p-3 rounded border border-yellow-200 dark:border-yellow-800 mb-4">
              <p className="font-medium mb-1">⚠️ 加载历史失败</p>
              <p className="text-xs">{historyError}</p>
            </div>
          )}

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
            <MessageBubble
              key={message.id}
              message={message}
              metadata={messageMetadataMap.get(message.id)}
              onOperationsApplied={handleOperationsApplied}
              onOperationsCancelled={handleOperationsCancelled}
            />
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
          onSubmit={async (e) => {
            e.preventDefault();
            if (input.trim() && !isLoading && nodeContext && mindmapId) {
              const userInput = input;
              setInput(""); // Clear input immediately for better UX

              // 创建用户消息并保存
              const userMessageId = `user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
              const userMessage = createAIMessage(
                userMessageId,
                "user",
                [{ type: "text", text: userInput }],
                nodeContext.currentNode.id, // 使用 UUID 进行数据库持久化
                mindmapId
              );

              try {
                // 保存用户消息
                const action = new AddAIMessageAction(userMessage);
                await store.acceptActions([action]);
              } catch (error) {
                console.error("Failed to save user message:", error);
              }

              // 发送消息到 AI
              sendMessage({ text: userInput }); // AI SDK v5: sendMessage takes an object with text property
            }
          }}
          className="border-t dark:border-gray-700 p-3"
          data-testid="ai-chat-input"
        >
          <div className="flex gap-2">
            <input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)} // AI SDK v5: manually manage input state
              placeholder="输入消息..."
              disabled={isLoading || !nodeContext}
              className="flex-1 px-3 py-2 border dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:bg-gray-100 dark:disabled:bg-gray-700 disabled:cursor-not-allowed"
              data-testid="ai-input-textarea"
            />
            <button
              type="submit"
              disabled={
                !input.trim() || isLoading || !nodeContext || !mindmapId
              }
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
          {!mindmapId && (
            <p className="text-xs text-red-500 dark:text-red-400 mt-1">
              无法获取思维导图信息，请刷新页面重试
            </p>
          )}
        </form>
      </div>
    );
  }
);
