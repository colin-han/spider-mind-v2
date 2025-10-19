/**
 * NodePanel - 节点编辑面板
 *
 * 职责:
 * - 展示当前选中节点的详细信息
 * - 提供节点编辑 UI (标题、内容)
 * - 响应聚焦请求 (双击触发)
 *
 * 不负责:
 * - 图形化展示
 * - 拖拽逻辑
 * - 布局计算
 */

"use client";

import { forwardRef, useImperativeHandle, useRef } from "react";
import { useMindmapEditorStore } from "@/lib/store/mindmap-editor.store";
import { ResizablePanel } from "./resizable-panel";
import { NodeToolbar } from "./node-toolbar";

/**
 * NodePanelRef - 暴露给父组件的方法
 */
export interface NodePanelRef {
  focusTitleInput: () => void;
}

/**
 * NodePanel 组件
 */
export const NodePanel = forwardRef<NodePanelRef>((_props, ref) => {
  const {
    currentNode,
    getNode,
    updateNodeTitle,
    updateNodeContent,
    setFocusedArea,
  } = useMindmapEditorStore();

  const titleInputRef = useRef<HTMLInputElement>(null);

  // 暴露方法给父组件
  useImperativeHandle(
    ref,
    () => ({
      focusTitleInput: () => {
        titleInputRef.current?.focus();
        titleInputRef.current?.select();
      },
    }),
    []
  );

  // 获取当前节点数据
  const node = currentNode ? getNode(currentNode) : null;

  if (!node) {
    return (
      <ResizablePanel
        data-testid="node-panel"
        defaultWidth={384}
        minWidth={300}
        maxWidth={600}
        className="border-l bg-gray-50"
      >
        <div className="flex items-center justify-center h-full text-gray-500">
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
      className="border-l bg-white"
    >
      <div className="p-4 space-y-4">
        {/* 工具栏 */}
        <NodeToolbar node={node} />

        {/* 标题编辑 */}
        <div>
          <label
            htmlFor="node-title-input"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            标题
          </label>
          <input
            id="node-title-input"
            data-testid="node-panel-title-input"
            ref={titleInputRef}
            type="text"
            value={node.title}
            onChange={(e) => updateNodeTitle(node.short_id, e.target.value)}
            onFocus={() => setFocusedArea("panel")}
            onBlur={() => setFocusedArea("graph")}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-gray-900 bg-white"
            placeholder="节点标题"
          />
        </div>

        {/* 内容编辑 */}
        <div>
          <label
            htmlFor="node-content-textarea"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            内容
          </label>
          <textarea
            id="node-content-textarea"
            data-testid="node-panel-content-textarea"
            value={node.content || ""}
            onChange={(e) => updateNodeContent(node.short_id, e.target.value)}
            onFocus={() => setFocusedArea("panel")}
            onBlur={() => setFocusedArea("graph")}
            rows={20}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none resize-none text-gray-900 bg-white"
            placeholder="节点内容 (可选)"
          />
        </div>

        {/* 元信息显示 */}
        <div className="pt-4 border-t border-gray-200">
          <div className="text-xs text-gray-500 space-y-1">
            <div>
              <span className="font-medium">类型:</span>{" "}
              {node.parent_id === null ? "根节点" : "普通节点"}
            </div>
            <div>
              <span className="font-medium">ID:</span> {node.short_id}
            </div>
            <div>
              <span className="font-medium">更新时间:</span>{" "}
              {new Date(node.updated_at).toLocaleString("zh-CN")}
            </div>
          </div>
        </div>
      </div>
    </ResizablePanel>
  );
});

NodePanel.displayName = "NodePanel";
