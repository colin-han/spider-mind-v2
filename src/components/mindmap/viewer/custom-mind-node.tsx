/**
 * CustomMindNode - 自定义思维导图节点组件
 *
 * 职责:
 * - 只读显示节点信息 (标题、状态图标)
 * - 展开/折叠按钮交互
 * - 选中状态视觉反馈
 * - 迷你工具栏显示
 *
 * 不负责:
 * - 节点编辑 (在 NodePanel 中完成)
 * - 布局计算 (由 Dagre 完成)
 */

import { memo, useCallback } from "react";
import { Handle, Position, type NodeProps, useViewport } from "@xyflow/react";
import { useMindmapEditorState, useMindmapStore } from "@/domain/mindmap-store";
import { CollapseNodeAction } from "@/domain/actions/ephemeral/collapse-node";
import { ExpandNodeAction } from "@/domain/actions/ephemeral/expand-node";
import type { CustomNodeData } from "@/lib/types/react-flow";
import { cn } from "@/lib/utils/cn";
import { MiniToolbar } from "./mini-toolbar";
import { MindmapNode } from "@/lib/types";
import { AlignLeft } from "lucide-react";

/**
 * 检查目标节点是否在指定节点的子树中
 */
function isNodeInSubtree(
  targetNodeId: string,
  parentNodeId: string,
  nodesMap: Map<string, MindmapNode>
): boolean {
  if (!targetNodeId) return false;

  let currentId: string = targetNodeId;
  while (currentId) {
    if (currentId === parentNodeId) {
      return true;
    }
    const node = nodesMap.get(currentId)!;
    if (!node) break;
    currentId = node.parent_short_id!;
  }
  return false;
}

/**
 * CustomMindNode 组件
 */
function CustomMindNodeComponent({ data }: NodeProps) {
  const editorState = useMindmapEditorState()!;
  const { acceptActions } = useMindmapStore();

  // 获取当前缩放级别
  const { zoom } = useViewport();

  // 将 data 断言为 CustomNodeData 类型
  const nodeData = data as CustomNodeData;

  const isSelected = editorState.currentNode === nodeData.shortId;
  const isExpanded = !editorState.collapsedNodes.has(nodeData.shortId);
  const isRoot = !nodeData.parentId;
  const isDragging = editorState.isDragging;
  const showToolbar = !isDragging && isSelected;

  // 获取完整节点数据（用于工具栏）
  const node = editorState.nodes.get(nodeData.shortId);

  // 检查当前选中节点是否被这个节点折叠隐藏
  const containsCurrentNode =
    !isExpanded &&
    editorState.currentNode &&
    editorState.currentNode !== nodeData.shortId &&
    isNodeInSubtree(
      editorState.currentNode,
      nodeData.shortId,
      editorState.nodes
    );

  // 展开/折叠切换
  const toggleExpand = useCallback(
    async (e: React.MouseEvent) => {
      e.stopPropagation();

      await acceptActions([
        isExpanded
          ? new CollapseNodeAction(nodeData.shortId)
          : new ExpandNodeAction(nodeData.shortId),
      ]);
    },
    [nodeData.shortId, isExpanded, acceptActions]
  );

  return (
    <div
      data-testid={`mindmap-node-${nodeData.shortId}`}
      className={cn(
        "mind-node relative",
        "flex flex-col",
        "min-w-[150px] max-w-[250px] pt-2 px-4 pb-0",
        "rounded-lg border-2 bg-white",
        "transition-all duration-150",
        "cursor-pointer",
        {
          // 选中状态
          "border-blue-500 shadow-[0_0_0_3px_rgba(59,130,246,0.3)] dark:border-blue-400 dark:shadow-[0_0_0_4px_rgba(96,165,250,0.4)]":
            isSelected,
          "border-gray-200 dark:border-gray-300": !isSelected,
          // 根节点样式
          "bg-gradient-to-br from-purple-600 to-purple-700 text-white border-purple-800 font-semibold":
            isRoot,
        }
      )}
    >
      {/* 迷你工具栏 - 始终渲染，通过 visible 控制显示 */}
      {node && (
        <MiniToolbar
          node={node}
          zoom={zoom}
          visible={showToolbar}
          testId={`mindmap-node-${nodeData.shortId}-mini-toolbar`}
        />
      )}

      {/* 节点标题 (只读) */}
      <span
        data-testid={`mindmap-node-${nodeData.shortId}-title`}
        className={cn(
          "title text-sm select-none py-1",
          "break-words whitespace-normal",
          {
            "text-white": isRoot,
            "text-gray-900 dark:text-gray-900": !isRoot,
          }
        )}
      >
        {nodeData.title}
      </span>

      {/* 状态图标区域 - 始终占位 */}
      <div
        data-testid={`mindmap-node-${nodeData.shortId}-status-icons`}
        style={{ padding: 0 }}
        className="h-1.5 flex justify-end items-center gap-1 mb-1"
      >
        {node?.note && (
          <AlignLeft
            data-testid={`mindmap-node-${nodeData.shortId}-status-note`}
            className={cn("w-3.5 h-3.5 flex-shrink-0", {
              "text-white opacity-80": isRoot,
              "text-gray-500": !isRoot,
            })}
            aria-label="该节点有笔记"
          />
        )}
      </div>

      {/* React Flow Handles (连接点) - 从左到右布局，隐藏但保留用于连线计算 */}
      <Handle
        type="target"
        position={Position.Left}
        className="!w-2 !h-2 !bg-transparent !border-0"
      />
      <Handle
        type="source"
        position={Position.Right}
        className="!w-2 !h-2 !bg-transparent !border-0"
      />

      {/* 展开/折叠按钮 - 右侧连接点位置 */}
      {nodeData.hasChildren && (
        <button
          data-testid={`mindmap-node-${nodeData.shortId}-expand-button`}
          onClick={toggleExpand}
          className={cn(
            "expand-button absolute",
            "w-5 h-5 flex items-center justify-center",
            "rounded-full border cursor-pointer",
            "transition-all duration-150",
            "right-[-10px] top-1/2 -translate-y-1/2",
            "z-10",
            {
              // 包含当前节点 - 蓝色高亮
              "bg-blue-500 border-blue-600 text-white hover:bg-blue-600 shadow-md":
                containsCurrentNode,
              // 根节点 - 紫色
              "bg-white border-purple-600 text-purple-600 hover:bg-purple-50":
                !containsCurrentNode && isRoot,
              // 普通节点 - 灰色
              "bg-white border-gray-400 text-gray-600 hover:bg-gray-50":
                !containsCurrentNode && !isRoot,
            }
          )}
          aria-label={isExpanded ? "折叠子节点" : "展开子节点"}
        >
          <span className="text-xs font-bold">{isExpanded ? "−" : "+"}</span>
        </button>
      )}
    </div>
  );
}

export const CustomMindNode = memo(CustomMindNodeComponent);
CustomMindNode.displayName = "CustomMindNode";
