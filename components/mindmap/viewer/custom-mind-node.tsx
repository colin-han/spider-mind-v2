/**
 * CustomMindNode - 自定义思维导图节点组件
 *
 * 职责:
 * - 只读显示节点信息 (标题、图标)
 * - 展开/折叠按钮交互
 * - 选中状态视觉反馈
 *
 * 不负责:
 * - 节点编辑 (在 NodePanel 中完成)
 * - 布局计算 (由 Dagre 完成)
 */

import { memo, useCallback } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { useMindmapEditorStore } from "@/lib/store/mindmap-editor.store";
import type { CustomNodeData } from "@/lib/types/react-flow";
import { cn } from "@/lib/utils/cn";

/**
 * CustomMindNode 组件
 */
function CustomMindNodeComponent({ data }: NodeProps) {
  const { selectedNodes, expandedNodes } = useMindmapEditorStore();

  // 将 data 断言为 CustomNodeData 类型
  const nodeData = data as CustomNodeData;

  const isSelected = selectedNodes.has(nodeData.shortId);
  const isExpanded = expandedNodes.has(nodeData.shortId);
  const isRoot = !nodeData.parentId;

  // 展开/折叠切换
  const toggleExpand = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();

      useMindmapEditorStore.setState((state) => {
        if (isExpanded) {
          state.expandedNodes.delete(nodeData.shortId);
          state.collapsedNodes.add(nodeData.shortId);
        } else {
          state.collapsedNodes.delete(nodeData.shortId);
          state.expandedNodes.add(nodeData.shortId);
        }
      });
    },
    [nodeData.shortId, isExpanded]
  );

  return (
    <div
      data-testid={`mindmap-node-${nodeData.shortId}`}
      className={cn(
        "mind-node",
        "flex items-center gap-2",
        "min-w-[150px] px-4 py-3",
        "rounded-lg border-2 bg-white",
        "transition-all duration-150",
        "cursor-pointer",
        {
          // 选中状态
          "border-blue-500 shadow-[0_0_0_3px_rgba(59,130,246,0.1)]": isSelected,
          "border-gray-200": !isSelected,
          // 根节点样式
          "bg-gradient-to-br from-purple-600 to-purple-700 text-white border-purple-800 font-semibold":
            isRoot,
        }
      )}
    >
      {/* 展开/折叠按钮 */}
      {nodeData.hasChildren && (
        <button
          data-testid={`mindmap-node-${nodeData.shortId}-expand-button`}
          onClick={toggleExpand}
          className={cn(
            "expand-button",
            "w-5 h-5 flex items-center justify-center",
            "border-none bg-transparent cursor-pointer",
            "text-gray-600 hover:text-gray-900",
            "transition-colors duration-150",
            {
              "text-white/70 hover:text-white": isRoot,
            }
          )}
          aria-label={isExpanded ? "折叠子节点" : "展开子节点"}
        >
          {isExpanded ? "▼" : "▶"}
        </button>
      )}

      {/* 节点图标 */}
      <span className="text-lg" aria-hidden="true">
        {isRoot ? "👑" : "📄"}
      </span>

      {/* 节点标题 (只读) */}
      <span
        data-testid={`mindmap-node-${nodeData.shortId}-title`}
        className="title flex-1 text-sm select-none"
      >
        {nodeData.title}
      </span>

      {/* React Flow Handles (连接点) - 从左到右布局 */}
      <Handle
        type="target"
        position={Position.Left}
        className="!w-2 !h-2 !bg-blue-500"
      />
      <Handle
        type="source"
        position={Position.Right}
        className="!w-2 !h-2 !bg-blue-500"
      />
    </div>
  );
}

export const CustomMindNode = memo(CustomMindNodeComponent);
CustomMindNode.displayName = "CustomMindNode";
