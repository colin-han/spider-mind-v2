/**
 * MindmapGraphViewer - 思维导图图形化展示组件
 *
 * 职责:
 * - 使用 React Flow 渲染思维导图
 * - 处理视图交互 (点击、缩放、平移)
 * - 触发编辑事件 (通过回调)
 *
 * 不负责:
 * - 节点编辑 UI (在 NodePanel 中完成)
 * - 数据持久化
 * - Store 初始化 (由 MindmapEditor 管理)
 */

"use client";

import { useCallback, useMemo, useEffect, useState } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useReactFlow,
  type Node,
  type NodeTypes,
} from "@xyflow/react";
import { useMindmapEditorStore } from "@/lib/store/mindmap-editor.store";
import { convertToFlowData } from "@/lib/utils/mindmap/mindmap-to-flow";
import { calculateDagreLayout } from "@/lib/utils/mindmap/dagre-layout";
import { CustomMindNode } from "./viewer/custom-mind-node";
import { DropIndicator, type DropIndicatorType } from "./viewer/drop-indicator";
import {
  validateDrop,
  getDropActionType,
} from "@/lib/utils/mindmap/drag-validator";
import "@xyflow/react/dist/style.css";

/**
 * MindmapGraphViewer Props
 */
export interface MindmapGraphViewerProps {
  /**
   * 双击节点时的回调 (触发聚焦编辑面板)
   */
  onNodeEdit?: () => void;
}

/**
 * 节点类型注册
 */
const nodeTypes: NodeTypes = {
  customMindNode: CustomMindNode,
} as const;

/**
 * 拖拽状态
 */
interface DragState {
  draggedNodeId: string | null;
  targetNodeId: string | null;
  dropIndicatorType: DropIndicatorType | null;
  targetRect: {
    x: number;
    y: number;
    width: number;
    height: number;
  } | null;
}

/**
 * MindmapGraphViewer 组件
 */
export function MindmapGraphViewer({ onNodeEdit }: MindmapGraphViewerProps) {
  const { fitView } = useReactFlow();
  const {
    currentMindmap,
    nodes: nodesMap,
    expandedNodes,
    selectNode,
    getRootNode,
    moveNode,
  } = useMindmapEditorStore();

  // 拖拽状态
  const [dragState, setDragState] = useState<DragState>({
    draggedNodeId: null,
    targetNodeId: null,
    dropIndicatorType: null,
    targetRect: null,
  });

  // 转换数据为 React Flow 格式
  const { nodes, edges } = useMemo(() => {
    if (!currentMindmap) {
      return { nodes: [], edges: [] };
    }

    const root = getRootNode(currentMindmap.id);
    if (!root) {
      return { nodes: [], edges: [] };
    }

    // 步骤 1: 转换数据
    const flowData = convertToFlowData(root.short_id, nodesMap, expandedNodes);

    // 步骤 2: 计算布局
    const layoutedNodes = calculateDagreLayout(flowData.nodes, flowData.edges);

    return {
      nodes: layoutedNodes,
      edges: flowData.edges,
    };
  }, [currentMindmap, nodesMap, expandedNodes, getRootNode]);

  // 单击节点 - 选中
  const onNodeClick = useCallback(
    (_event: React.MouseEvent, node: Node) => {
      const multiSelect = _event.metaKey || _event.ctrlKey;
      selectNode(node.id, multiSelect);
    },
    [selectNode]
  );

  // 双击节点 - 触发编辑
  const onNodeDoubleClick = useCallback(
    (_event: React.MouseEvent, node: Node) => {
      selectNode(node.id, false);
      onNodeEdit?.();
    },
    [selectNode, onNodeEdit]
  );

  // 拖拽开始
  const onNodeDragStart = useCallback(
    (_event: React.MouseEvent | React.TouchEvent | MouseEvent, node: Node) => {
      setDragState({
        draggedNodeId: node.id,
        targetNodeId: null,
        dropIndicatorType: null,
        targetRect: null,
      });
    },
    []
  );

  // 拖拽中
  const onNodeDrag = useCallback(
    (event: React.MouseEvent | React.TouchEvent | MouseEvent, _node: Node) => {
      if (!dragState.draggedNodeId) return;

      // 获取鼠标位置
      const mouseEvent = event as MouseEvent;
      const mouseX = mouseEvent.clientX;
      const mouseY = mouseEvent.clientY;

      // 查找鼠标下方的节点
      const elements = document.elementsFromPoint(mouseX, mouseY);
      let targetNode: Node | null = null;

      for (const element of elements) {
        const nodeId = element.getAttribute("data-id");
        if (nodeId && nodeId !== dragState.draggedNodeId) {
          targetNode = nodes.find((n) => n.id === nodeId) || null;
          if (targetNode) break;
        }
      }

      // 如果没有找到有效的目标节点,清空指示器
      if (!targetNode) {
        setDragState((prev) => ({
          ...prev,
          targetNodeId: null,
          dropIndicatorType: null,
          targetRect: null,
        }));
        return;
      }

      // 验证拖放是否合法
      const isValid = validateDrop(
        dragState.draggedNodeId,
        targetNode.id,
        nodesMap
      );

      if (!isValid) {
        // 显示禁止指示器
        setDragState((prev) => ({
          ...prev,
          targetNodeId: targetNode.id,
          dropIndicatorType: "forbidden",
          targetRect: {
            x: targetNode.position.x,
            y: targetNode.position.y,
            width: targetNode.width || 172,
            height: targetNode.height || 50,
          },
        }));
        return;
      }

      // 计算拖放动作类型
      const actionType = getDropActionType(
        mouseY,
        targetNode.position.y,
        targetNode.height || 50
      );

      // 映射到指示器类型
      const indicatorType: DropIndicatorType =
        actionType === "insert-before"
          ? "line-above"
          : actionType === "insert-after"
            ? "line-below"
            : "highlight";

      setDragState((prev) => ({
        ...prev,
        targetNodeId: targetNode.id,
        dropIndicatorType: indicatorType,
        targetRect: {
          x: targetNode.position.x,
          y: targetNode.position.y,
          width: targetNode.width || 172,
          height: targetNode.height || 50,
        },
      }));
    },
    [dragState.draggedNodeId, nodes, nodesMap]
  );

  // 拖拽结束
  const onNodeDragStop = useCallback(
    (_event: React.MouseEvent | React.TouchEvent | MouseEvent, _node: Node) => {
      const { draggedNodeId, targetNodeId, dropIndicatorType } = dragState;

      // 清空拖拽状态
      setDragState({
        draggedNodeId: null,
        targetNodeId: null,
        dropIndicatorType: null,
        targetRect: null,
      });

      // 如果没有有效的拖放目标,不执行任何操作
      if (!draggedNodeId || !targetNodeId || !dropIndicatorType) {
        return;
      }

      // 如果是禁止拖放,不执行任何操作
      if (dropIndicatorType === "forbidden") {
        return;
      }

      // 验证拖放是否合法
      const isValid = validateDrop(draggedNodeId, targetNodeId, nodesMap);
      if (!isValid) {
        return;
      }

      // 获取目标节点
      const targetNode = nodesMap.get(targetNodeId);
      if (!targetNode) return;

      // 根据指示器类型计算新的父节点和位置
      let newParentId: string | null;
      let position: number;

      if (dropIndicatorType === "line-above") {
        // 插入到目标节点上方 (同级)
        newParentId = targetNode.parent_short_id;
        position = targetNode.order_index;
      } else if (dropIndicatorType === "line-below") {
        // 插入到目标节点下方 (同级)
        newParentId = targetNode.parent_short_id;
        position = targetNode.order_index + 1;
      } else {
        // highlight: 成为目标节点的子节点
        newParentId = targetNode.short_id;
        position = Infinity; // 插入到最后
      }

      // 执行移动
      try {
        moveNode({
          nodeId: draggedNodeId,
          newParentId,
          position,
        });
      } catch (error) {
        console.error("[MindmapGraphViewer] Failed to move node:", error);
      }
    },
    [dragState, nodesMap, moveNode]
  );

  // 初始化时自动适应视图
  useEffect(() => {
    if (nodes.length > 0) {
      // 延迟执行以确保节点已渲染
      setTimeout(() => {
        fitView({ padding: 0.2, duration: 300 });
      }, 50);
    }
  }, [nodes.length, fitView]);

  return (
    <div
      data-testid="mindmap-graph-viewer"
      className="h-full w-full bg-gray-50 relative"
    >
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodeClick={onNodeClick}
        onNodeDoubleClick={onNodeDoubleClick}
        onNodeDragStart={onNodeDragStart}
        onNodeDrag={onNodeDrag}
        onNodeDragStop={onNodeDragStop}
        fitView
        minZoom={0.1}
        maxZoom={2}
        defaultEdgeOptions={{
          type: "smoothstep",
          animated: false,
          style: { stroke: "#94a3b8", strokeWidth: 2 },
        }}
        proOptions={{ hideAttribution: true }}
      >
        <Background color="#e2e8f0" gap={16} />
        <Controls
          data-testid="mindmap-graph-viewer-controls"
          showInteractive={false}
        />
        <MiniMap
          data-testid="mindmap-graph-viewer-minimap"
          nodeColor={(node) => {
            const data = node.data as { nodeType: string };
            return data.nodeType === "root" ? "#9333ea" : "#cbd5e1";
          }}
          maskColor="rgba(0, 0, 0, 0.05)"
          pannable
          zoomable
        />
      </ReactFlow>

      {/* 拖拽指示器 */}
      {dragState.dropIndicatorType && dragState.targetRect && (
        <DropIndicator
          type={dragState.dropIndicatorType}
          targetRect={dragState.targetRect}
        />
      )}
    </div>
  );
}
