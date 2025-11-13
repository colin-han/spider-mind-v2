/**
 * NodePanel - 节点编辑面板
 *
 * 职责:
 * - 展示当前选中节点的详细信息
 * - 提供节点标题编辑 UI
 * - 响应聚焦请求 (双击触发)
 *
 * 不负责:
 * - 图形化展示
 * - 拖拽逻辑
 * - 布局计算
 */

"use client";

import { useEffect, useRef, useState } from "react";
import { FileText, Sparkles } from "lucide-react";
import { useMindmapEditorState, useCommand } from "@/domain/mindmap-store";
import { ResizablePanel } from "./resizable-panel";
import { NodeToolbar } from "./node-toolbar";
import { MarkdownEditor } from "@/components/common/markdown-editor";
import { Tabs, TabItem } from "@/components/common/tabs";
import { AIChatPanel } from "@/components/ai/ai-chat-panel";

/**
 * NodePanel 组件
 */
export const NodePanel = () => {
  const editorState = useMindmapEditorState()!;
  const updateTitle = useCommand("node.updateTitle");
  const updateNote = useCommand("node.updateNote");
  const setFocusedArea = useCommand("global.setFocusedArea");

  const panelRef = useRef<HTMLDivElement>(null);
  const titleInputRef = useRef<HTMLInputElement>(null);

  // 本地编辑状态
  const [editingTitle, setEditingTitle] = useState("");
  const [editingNote, setEditingNote] = useState("");

  // Tab 状态
  const [activeTab, setActiveTab] = useState<string>("note");

  useEffect(() => {
    if (
      editorState.focusedArea === "panel" &&
      !panelRef.current?.contains(document.activeElement)
    ) {
      titleInputRef.current?.focus();
      titleInputRef.current?.select();
    }
  }, [editorState.focusedArea]);

  // 获取当前节点数据
  const node = editorState.currentNode
    ? editorState.nodes.get(editorState.currentNode)
    : null;

  // 当切换节点时，同步本地编辑状态
  useEffect(() => {
    if (node) {
      setEditingTitle(node.title);
      setEditingNote(node.note || "");
    }
  }, [node]);

  // 字符计数
  const charCount = editingNote.length;
  const maxChars = 10000;
  const isNearLimit = charCount > 9000;
  const isAtLimit = charCount >= maxChars;

  // Tab 配置
  const tabItems: TabItem[] = [
    {
      id: "note",
      label: "笔记",
      icon: <FileText size={16} />,
      content: (
        <div className="flex flex-col h-full p-4 min-h-0">
          <div className="flex items-center justify-between mb-1">
            <label
              htmlFor="node-note-input"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              笔记内容
            </label>
            {/* 字符计数 */}
            <div
              className={`text-xs ${
                isAtLimit
                  ? "text-red-600 dark:text-red-400"
                  : isNearLimit
                    ? "text-yellow-600 dark:text-yellow-400"
                    : "text-gray-500 dark:text-gray-400"
              }`}
            >
              {charCount.toLocaleString()} / {maxChars.toLocaleString()}
            </div>
          </div>
          <div className="flex-1 flex flex-col min-h-0">
            <MarkdownEditor
              value={editingNote}
              onChange={(val) => setEditingNote(val || "")}
              onBlur={() => {
                const trimmedNote = editingNote.trim();
                const newNote = trimmedNote === "" ? null : editingNote;
                if (newNote !== node?.note) {
                  updateNote(node!.short_id, newNote);
                }
              }}
              placeholder="节点详细说明（支持 Markdown）"
              maxLength={10000}
              testId="node-panel-note-input"
              className="h-full"
            />
          </div>
        </div>
      ),
    },
    {
      id: "ai-chat",
      label: "AI 助手",
      icon: <Sparkles size={16} />,
      content: node ? <AIChatPanel nodeId={node.short_id} /> : null,
    },
  ];

  if (!node) {
    return (
      <ResizablePanel
        data-testid="node-panel"
        defaultWidth={384}
        minWidth={300}
        maxWidth={600}
        className="border-l border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900"
      >
        <div className="flex items-center justify-center h-full text-gray-500 dark:text-gray-400">
          未选中节点
        </div>
      </ResizablePanel>
    );
  }

  return (
    <ResizablePanel
      data-testid="node-panel"
      defaultWidth={384}
      minWidth={300}
      maxWidth={600}
      className="border-l border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 flex flex-col"
    >
      <div className="flex-1 flex flex-col p-4 gap-4 min-h-0" ref={panelRef}>
        {/* 工具栏 */}
        <NodeToolbar node={node} />

        {/* 标题编辑 */}
        <div>
          <label
            htmlFor="node-title-input"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
          >
            标题
          </label>
          <input
            id="node-title-input"
            data-testid="node-panel-title-input"
            ref={titleInputRef}
            type="text"
            value={editingTitle}
            onChange={(e) => setEditingTitle(e.target.value)}
            onBlur={() => {
              // 只有当值确实改变时才调用 command
              if (editingTitle !== node.title) {
                updateTitle(node.short_id, editingTitle);
              }
            }}
            onFocus={() => setFocusedArea("panel")}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400 outline-none text-gray-900 dark:text-white bg-white dark:bg-gray-800"
            placeholder="节点标题"
          />
        </div>

        {/* Tabs - 笔记和 AI 助手 */}
        <div className="flex-1 min-h-0">
          <Tabs
            items={tabItems}
            activeTab={activeTab}
            onChange={setActiveTab}
          />
        </div>
      </div>

      {/* 状态栏 - 紧贴底部，水平填满 */}
      <div className="py-2 bg-gray-100 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 text-xs text-gray-600 dark:text-gray-400 text-center">
        ID: {node.short_id} · 更新时间:{" "}
        {new Date(node.updated_at).toLocaleString("zh-CN")}
      </div>
    </ResizablePanel>
  );
};

NodePanel.displayName = "NodePanel";
