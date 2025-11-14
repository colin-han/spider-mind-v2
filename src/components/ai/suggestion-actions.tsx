// src/components/ai/suggestion-actions.tsx

"use client";

import { NodeSuggestion } from "@/lib/types/ai";
import { useMindmapStore, useCommandManager } from "@/domain/mindmap-store";
import { Check } from "lucide-react";
import { useState } from "react";

interface SuggestionActionsProps {
  suggestions: NodeSuggestion[];
}

export function SuggestionActions({ suggestions }: SuggestionActionsProps) {
  const [appliedSuggestions, setAppliedSuggestions] = useState<Set<string>>(
    new Set()
  );
  const store = useMindmapStore();
  const commandManager = useCommandManager();

  const applySuggestion = async (suggestion: NodeSuggestion) => {
    try {
      const editor = store.currentEditor;
      if (!editor || !editor.currentNode) {
        console.warn("No active editor or current node");
        return;
      }

      switch (suggestion.type) {
        case "create_children":
          // 批量创建子节点
          if (
            suggestion.params?.children &&
            suggestion.params.children.length > 0
          ) {
            // 使用命令系统来创建节点
            // TODO: 需要实现批量创建节点的命令
            console.log("Creating children nodes:", suggestion.params.children);

            // 临时方案：逐个创建
            for (const child of suggestion.params.children) {
              const childNode = child as { title: string };
              // node.addChild params: [parentId, position?, title?]
              // 使用 currentNode 作为 parentId
              await commandManager.executeCommand({
                commandId: "node.addChild",
                params: [editor.currentNode, undefined, childNode.title],
              });
            }
          }
          break;

        case "update_title":
          // 更新节点标题
          if (suggestion.params?.newTitle) {
            // node.updateTitle params: [nodeId, newTitle]
            await commandManager.executeCommand({
              commandId: "node.updateTitle",
              params: [editor.currentNode, suggestion.params.newTitle],
            });
          }
          break;

        default:
          console.warn(`Unknown suggestion type: ${suggestion.type}`);
      }

      // 标记为已应用
      setAppliedSuggestions((prev) => new Set(prev).add(suggestion.id));
    } catch (error) {
      console.error("Failed to apply suggestion:", error);
    }
  };

  return (
    <div className="space-y-2">
      {suggestions.map((suggestion) => {
        const isApplied = appliedSuggestions.has(suggestion.id);

        return (
          <button
            key={suggestion.id}
            onClick={() => !isApplied && applySuggestion(suggestion)}
            disabled={isApplied}
            className={`w-full text-left p-3 rounded border transition-colors ${
              isApplied
                ? "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 cursor-not-allowed"
                : "bg-purple-50 dark:bg-purple-900/20 hover:bg-purple-100 dark:hover:bg-purple-900/30 border-purple-200 dark:border-purple-800"
            }`}
          >
            <div className="flex items-start gap-2">
              <Check
                size={16}
                className={`mt-0.5 flex-shrink-0 ${
                  isApplied
                    ? "text-green-600 dark:text-green-400"
                    : "text-purple-600 dark:text-purple-400"
                }`}
              />
              <div className="flex-1">
                <div
                  className={`text-sm font-medium ${
                    isApplied
                      ? "text-green-900 dark:text-green-100"
                      : "text-purple-900 dark:text-purple-100"
                  }`}
                >
                  {isApplied ? "已应用：" : ""}
                  {suggestion.description}
                </div>
                {suggestion.type === "create_children" &&
                  suggestion.params?.children && (
                    <div
                      className={`text-xs mt-1 ${
                        isApplied
                          ? "text-green-700 dark:text-green-300"
                          : "text-purple-700 dark:text-purple-300"
                      }`}
                    >
                      将创建 {suggestion.params.children.length} 个子节点
                    </div>
                  )}
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}
