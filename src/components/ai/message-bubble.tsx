// src/components/ai/message-bubble.tsx

"use client";

import { UIMessage } from "ai"; // AI SDK v5: Message renamed to UIMessage
import { User, Bot, CheckCircle } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import {
  parseAISuggestions,
  removeJSONSuggestions,
} from "@/lib/ai/parse-suggestions";
import { SuggestionActions } from "./suggestion-actions";
import {
  extractOperations,
  extractExplanation,
  hasOperationsTag,
  hasCompleteOperations,
} from "@/lib/ai/parse-operations";
import { OperationsPanel } from "./operations-panel";
import { useState } from "react";
import type { AIMessage } from "@/lib/types/ai";
import type { AIOperation } from "@/domain/ai";

interface MessageBubbleProps {
  message: UIMessage;
  metadata?: AIMessage["metadata"]; // 消息的持久化 metadata
  onOperationsApplied?: (
    messageId: string,
    selectedIds: string[],
    operations: AIOperation[]
  ) => void;
  onOperationsCancelled?: (
    messageId: string,
    operations: AIOperation[]
  ) => void;
}

export function MessageBubble({
  message,
  metadata,
  onOperationsApplied,
  onOperationsCancelled,
}: MessageBubbleProps) {
  const isUser = message.role === "user";
  const [operationsPanelVisible, setOperationsPanelVisible] = useState(true);

  // AI SDK v5: Extract text from parts array
  const getTextContent = () => {
    return message.parts
      .filter((part) => part.type === "text")
      .map((part) => part.text)
      .join("");
  };

  const textContent = getTextContent();

  // 检测是否包含 operations
  const hasOperations = !isUser && hasOperationsTag(textContent);
  const operationsComplete =
    hasOperations && hasCompleteOperations(textContent);
  const operations = operationsComplete ? extractOperations(textContent) : [];
  const operationsLoading = hasOperations && !operationsComplete;

  // 检查操作是否已执行或已取消（从 metadata 中读取）
  const operationsAlreadyApplied = metadata?.operationsApplied === true;
  const operationsCancelled = metadata?.operationsCancelled === true;

  // 解析 AI 响应中的结构化建议（仅当不是 operations 时）
  const suggestions =
    !isUser && !hasOperations ? parseAISuggestions(textContent) : null;

  // 确定显示内容
  let displayContent: string;
  if (isUser) {
    displayContent = textContent;
  } else if (hasOperations) {
    // 如果包含 operations，只显示 explanation 部分
    displayContent = extractExplanation(textContent);
  } else {
    // 否则移除 JSON 建议块
    displayContent = removeJSONSuggestions(textContent);
  }

  const handleAccept = (selectedIds: string[]) => {
    setOperationsPanelVisible(false);
    // 通知父组件操作已执行
    if (onOperationsApplied) {
      onOperationsApplied(message.id, selectedIds, operations);
    }
  };

  const handleReject = () => {
    setOperationsPanelVisible(false);
    // 通知父组件操作已取消
    if (onOperationsCancelled) {
      onOperationsCancelled(message.id, operations);
    }
  };

  return (
    <div
      className={`flex gap-3 ${isUser ? "flex-row-reverse" : "flex-row"}`}
      data-testid={`message-${message.role}`}
    >
      {/* Avatar */}
      <div
        className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
          isUser ? "bg-blue-500" : "bg-purple-500"
        }`}
      >
        {isUser ? (
          <User size={16} className="text-white" />
        ) : (
          <Bot size={16} className="text-white" />
        )}
      </div>

      {/* Content */}
      <div
        className={`flex-1 max-w-[80%] ${isUser ? "items-end" : "items-start"}`}
      >
        <div
          className={`rounded-lg p-3 ${
            isUser
              ? "bg-blue-500 text-white"
              : "bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100"
          }`}
        >
          {isUser ? (
            // 用户消息：简单文本显示
            <div className="text-sm whitespace-pre-wrap">{displayContent}</div>
          ) : (
            // AI 消息：使用 ReactMarkdown 渲染
            <div className="text-sm prose prose-sm max-w-none dark:prose-invert">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                rehypePlugins={[rehypeHighlight]}
                components={{
                  // 自定义组件样式
                  p: ({ children }) => (
                    <p className="mb-2 last:mb-0">{children}</p>
                  ),
                  ul: ({ children }) => (
                    <ul className="list-disc pl-4 mb-2">{children}</ul>
                  ),
                  ol: ({ children }) => (
                    <ol className="list-decimal pl-4 mb-2">{children}</ol>
                  ),
                  code: ({
                    inline,
                    children,
                    ...props
                  }: {
                    inline?: boolean;
                    children?: React.ReactNode;
                  }) => {
                    if (inline) {
                      return (
                        <code className="bg-gray-200 dark:bg-gray-700 px-1 py-0.5 rounded text-sm">
                          {children}
                        </code>
                      );
                    }
                    return <code {...props}>{children}</code>;
                  },
                }}
              >
                {displayContent}
              </ReactMarkdown>
            </div>
          )}
        </div>

        {/* Suggestions */}
        {suggestions && suggestions.length > 0 && (
          <div className="mt-2">
            <SuggestionActions suggestions={suggestions} />
          </div>
        )}

        {/* Operations Panel */}
        {hasOperations &&
          operationsPanelVisible &&
          !operationsAlreadyApplied && (
            <div className="mt-2">
              <OperationsPanel
                operations={operations}
                loading={operationsLoading}
                onAccept={handleAccept}
                onReject={handleReject}
              />
            </div>
          )}

        {/* 已执行的操作显示状态 */}
        {hasOperations && operationsAlreadyApplied && !operationsCancelled && (
          <div className="mt-2 text-xs text-green-600 dark:text-green-400 flex items-center gap-1">
            <CheckCircle className="w-4 h-4" />
            已执行{" "}
            {(metadata?.["appliedOperationIds"] as string[] | undefined)
              ?.length || operations.length}{" "}
            个操作
          </div>
        )}

        {/* 已取消的操作显示状态 */}
        {hasOperations && operationsCancelled && (
          <div className="mt-2 text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
            <CheckCircle className="w-4 h-4" />
            已取消 {operations.length} 个操作
          </div>
        )}

        {/* Timestamp - AI SDK v5: createdAt no longer available in UIMessage */}
        {/* Could add metadata.timestamp if needed in Phase 2 */}
      </div>
    </div>
  );
}
