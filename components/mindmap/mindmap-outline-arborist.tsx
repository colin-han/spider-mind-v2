/**
 * MindmapOutlineArborist - 使用 react-arborist 的紧凑型大纲视图
 *
 * 职责:
 * - 使用虚拟化渲染优化性能
 * - 提供紧凑的窄面板设计
 * - 复用现有的 store 逻辑
 *
 * 不负责:
 * - Store 初始化
 * - 布局管理 (由 MindmapEditorLayout 管理)
 */

"use client";

import { useEffect, useRef, memo, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, BookOpen } from "lucide-react";
import { Tree, NodeRendererProps, TreeApi } from "react-arborist";
import { useMindmapEditorStore } from "@/lib/store/mindmap-editor.store";
import type { MindmapNode } from "@/lib/types";
import { cn } from "@/lib/utils/cn";

/**
 * MindmapOutlineArborist Props
 */
interface MindmapOutlineArboristProps {
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

/**
 * Tree Node 数据类型
 */
interface TreeNode {
  id: string;
  name: string;
  children: TreeNode[] | undefined;
  data: MindmapNode;
}

/**
 * 将 MindmapNode 转换为 Tree 数据结构
 */
function convertToTreeData(
  nodeId: string,
  nodesMap: Map<string, MindmapNode>
): TreeNode | null {
  const node = nodesMap.get(nodeId);
  if (!node) return null;

  // 获取所有子节点
  const children = Array.from(nodesMap.values())
    .filter((n) => n.parent_short_id === nodeId)
    .sort((a, b) => a.order_index - b.order_index)
    .map((child) => convertToTreeData(child.short_id, nodesMap))
    .filter((n): n is TreeNode => n !== null);

  return {
    id: node.short_id,
    name: node.title,
    children: children.length > 0 ? children : undefined,
    data: node,
  };
}

/**
 * 自定义节点渲染组件
 */
function Node({ node, style, dragHandle }: NodeRendererProps<TreeNode>) {
  const { currentNode, setCurrentNode, setFocusedArea } =
    useMindmapEditorStore();
  const isSelected = currentNode === node.id;

  const handleClick = () => {
    setCurrentNode(node.id);
    setFocusedArea("outline");
  };

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation(); // 阻止事件冒泡，避免触发节点选中
    node.toggle();
  };

  return (
    <div
      ref={dragHandle}
      style={style}
      onClick={handleClick}
      className={cn(
        "flex items-center gap-2 px-2 py-1 cursor-pointer text-sm transition-colors",
        {
          "bg-blue-100 text-blue-900 font-medium": isSelected,
          "hover:bg-gray-100": !isSelected,
        }
      )}
      data-testid={`mindmap-node-${node.id}`}
    >
      {/* 展开/折叠图标 */}
      {node.children && node.children.length > 0 && (
        <span
          className="w-4 h-4 flex items-center justify-center text-gray-400 flex-shrink-0 hover:text-gray-600 cursor-pointer transition-colors"
          onClick={handleToggle}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
            className="w-4 h-4"
          >
            {node.isOpen ? (
              <path
                fillRule="evenodd"
                d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
                clipRule="evenodd"
              />
            ) : (
              <path
                fillRule="evenodd"
                d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z"
                clipRule="evenodd"
              />
            )}
          </svg>
        </span>
      )}
      {(!node.children || node.children.length === 0) && (
        <span className="w-4 flex-shrink-0" />
      )}

      {/* 节点标题 - 使用省略号处理长文本 */}
      <span className="flex-1 truncate" title={node.data.name}>
        {node.data.name}
      </span>
    </div>
  );
}

/**
 * MindmapOutlineArborist 组件
 */
export const MindmapOutlineArborist = memo(function MindmapOutlineArborist({
  isCollapsed,
  onToggleCollapse,
}: MindmapOutlineArboristProps) {
  const {
    currentMindmap,
    getRootNode,
    nodes: nodesMap,
    currentNode,
  } = useMindmapEditorStore();
  const containerRef = useRef<HTMLDivElement>(null);
  const treeRef = useRef<TreeApi<TreeNode> | undefined>(undefined);
  const [containerHeight, setContainerHeight] = useState<number>(0);

  const rootNode = currentMindmap ? getRootNode(currentMindmap.id) : null;

  // 转换数据为 Tree 格式
  const treeData = useMemo(() => {
    if (!rootNode) return [];
    const root = convertToTreeData(rootNode.short_id, nodesMap);
    return root ? [root] : [];
  }, [rootNode, nodesMap]);

  // 监听容器尺寸变化
  useEffect(() => {
    if (!containerRef.current) return;

    // 立即获取初始高度
    const initialHeight = containerRef.current.clientHeight;
    if (initialHeight > 0) {
      setContainerHeight(initialHeight);
    }

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const height = entry.contentRect.height;
        if (height > 0) {
          setContainerHeight(height);
        }
      }
    });

    resizeObserver.observe(containerRef.current);

    return () => {
      resizeObserver.disconnect();
    };
  }, []);

  // 当 currentNode 变化时，自动滚动并选中
  useEffect(() => {
    if (!currentNode || isCollapsed || !treeRef.current) {
      return;
    }

    // 延迟执行，确保 tree 已更新
    const timer = setTimeout(() => {
      // 使用 react-arborist 的 API 滚动到节点
      if (treeRef.current) {
        treeRef.current.focus(currentNode, { scroll: true });
      }
    }, 100);

    return () => clearTimeout(timer);
  }, [currentNode, isCollapsed]);

  // 收起状态：只显示展开按钮
  if (isCollapsed) {
    return (
      <div className="h-full flex flex-col items-center py-4">
        <button
          onClick={onToggleCollapse}
          className="p-2 hover:bg-gray-100 rounded transition-colors"
          aria-label="展开大纲"
          data-testid="outline-expand-button"
        >
          <ChevronRight className="w-5 h-5 text-gray-600" />
        </button>
        <div className="mt-4">
          <BookOpen className="w-5 h-5 text-gray-400" />
        </div>
      </div>
    );
  }

  // 展开状态：显示 Tree
  return (
    <div className="h-full flex flex-col" data-testid="mindmap-outline">
      {/* 标题栏 */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 flex-shrink-0">
        <div className="flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-gray-600" />
          <h3 className="text-sm font-semibold text-gray-900">大纲</h3>
        </div>
        <button
          onClick={onToggleCollapse}
          className="p-1 hover:bg-gray-100 rounded transition-colors"
          aria-label="收起大纲"
          data-testid="outline-collapse-button"
        >
          <ChevronLeft className="w-4 h-4 text-gray-600" />
        </button>
      </div>

      {/* Tree 内容 */}
      <div
        ref={containerRef}
        className="flex-1 min-h-0 overflow-hidden [&_*:focus-visible]:outline-none"
        data-testid="outline-tree"
      >
        {!currentMindmap && (
          <div className="text-sm text-gray-500 text-center py-8">
            未加载思维导图
          </div>
        )}

        {currentMindmap && !rootNode && (
          <div className="text-sm text-red-500 text-center py-8">
            错误: 未找到根节点
          </div>
        )}

        {rootNode && treeData.length > 0 && containerHeight > 0 && (
          <Tree
            ref={treeRef}
            data={treeData}
            openByDefault={true}
            disableEdit={true}
            disableMultiSelection={true}
            selectionFollowsFocus={true}
            indent={20}
            rowHeight={32}
            overscanCount={10}
            padding={8}
            width={containerRef.current?.clientWidth || 200}
            height={containerHeight}
          >
            {Node}
          </Tree>
        )}
      </div>
    </div>
  );
});
