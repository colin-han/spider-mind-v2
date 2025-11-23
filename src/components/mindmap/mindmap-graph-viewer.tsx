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

import { useCallback, useMemo, useEffect, useState, memo, useRef } from "react";
import {
  ReactFlow,
  Background,
  MiniMap,
  useReactFlow,
  type Node,
  type NodeTypes,
  type Viewport as RFViewport,
  PanOnScrollMode,
} from "@xyflow/react";
import { useMindmapEditorState, useCommand } from "@/domain/mindmap-store";
import { convertToFlowData } from "@/lib/utils/mindmap/mindmap-to-flow";
import { CustomMindNode } from "./viewer/custom-mind-node";
import { CustomControls } from "./viewer/custom-controls";
import { DropIndicator, type DropIndicatorType } from "./viewer/drop-indicator";
import {
  validateDrop,
  getDropActionType,
} from "@/lib/utils/mindmap/drag-validator";
import type { CustomNodeData } from "@/lib/types/react-flow";
import "@xyflow/react/dist/style.css";
import { useFocusedArea } from "@/lib/hooks/use-focused-area";
import {
  rfViewportToNodeViewport,
  nodeViewportToRfViewport,
} from "@/domain/utils/viewport-utils";
import { calibrateFontMetrics } from "@/lib/utils/mindmap/layout-predictor";

/**
 * MindmapGraphViewer Props
 */
export type MindmapGraphViewerProps = Record<string, never>;

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
 * MindmapGraphViewer 组件（使用 memo 优化）
 */
export const MindmapGraphViewer = memo(function MindmapGraphViewer(
  _props: MindmapGraphViewerProps = {}
) {
  const { fitView, flowToScreenPosition, getViewport } = useReactFlow();
  const moveNode = useCommand("node.move");
  const editorState = useMindmapEditorState()!;
  const setFocusedArea = useCommand("global.setFocusedArea");
  const setCurrentNode = useCommand("navigation.setCurrentNode");

  // 容器引用,用于计算相对坐标
  const containerRef = useRef<HTMLDivElement>(null);

  // 从 editorState 获取数据
  const currentMindmap = editorState.currentMindmap;
  const nodesMap = editorState.nodes;
  const collapsedNodes = editorState.collapsedNodes;
  const layouts = editorState.layouts;

  // 获取根节点的辅助函数
  const getRootNode = useCallback(
    (mindmapId: string) => {
      return Array.from(editorState.nodes.values()).find(
        (node) => node.mindmap_id === mindmapId && node.parent_id === null
      );
    },
    [editorState.nodes]
  );

  // 拖拽状态
  const [dragState, setDragState] = useState<DragState>({
    draggedNodeId: null,
    targetNodeId: null,
    dropIndicatorType: null,
    targetRect: null,
  });

  // Dark mode 检测
  const [isDarkMode, setIsDarkMode] = useState(false);

  // 注册 graph 的 focusedArea handler
  useFocusedArea({
    id: "graph",
    onEnter: () => {
      // 将焦点设置到容器元素上
      containerRef.current?.focus();
    },
  });

  useEffect(() => {
    // 检测初始 dark mode 状态
    const darkModeMediaQuery = window.matchMedia(
      "(prefers-color-scheme: dark)"
    );
    setIsDarkMode(darkModeMediaQuery.matches);

    // 监听 dark mode 变化
    const handler = (e: MediaQueryListEvent) => setIsDarkMode(e.matches);
    darkModeMediaQuery.addEventListener("change", handler);

    // 【优化】校准字体度量，提高布局预测精度
    calibrateFontMetrics();

    return () => darkModeMediaQuery.removeEventListener("change", handler);
  }, []);

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
    const flowData = convertToFlowData(root.short_id, nodesMap, collapsedNodes);

    // 步骤 2: 应用布局（从 editorState.layouts 获取）
    const layoutedNodes = flowData.nodes.map((node) => {
      const layout = layouts.get(node.id);
      if (layout) {
        return {
          ...node,
          position: { x: layout.x, y: layout.y },
          width: layout.width,
          height: layout.height,
        };
      }
      // 如果没有布局信息，返回原始节点（初始位置）
      return node;
    });

    return {
      nodes: layoutedNodes,
      edges: flowData.edges,
    };
  }, [currentMindmap, nodesMap, collapsedNodes, getRootNode, layouts]);

  // 单击节点 - 选中
  const onNodeClick = useCallback(
    (_event: React.MouseEvent, node: Node) => {
      setCurrentNode(node.id);
      setFocusedArea("graph");
    },
    [setCurrentNode, setFocusedArea]
  );

  // 双击节点 - 选中节点（编辑在 NodePanel 中自动响应）
  const onNodeDoubleClick = useCallback(
    (_event: React.MouseEvent, node: Node) => {
      setCurrentNode(node.id);
      setFocusedArea("title-editor");
    },
    [setCurrentNode, setFocusedArea]
  );

  // 点击空白区域 - 设置焦点到图形视图
  const onPaneClick = useCallback(() => {
    setFocusedArea("graph");
  }, [setFocusedArea]);

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
        // 将画布坐标转换为屏幕坐标
        const screenPosition = flowToScreenPosition({
          x: targetNode.position.x,
          y: targetNode.position.y,
        });

        // 获取容器偏移(DropIndicator 相对于容器定位)
        const containerRect = containerRef.current?.getBoundingClientRect();
        const offsetX = containerRect?.left || 0;
        const offsetY = containerRect?.top || 0;

        setDragState((prev) => ({
          ...prev,
          targetNodeId: targetNode.id,
          dropIndicatorType: "forbidden",
          targetRect: {
            x: screenPosition.x - offsetX,
            y: screenPosition.y - offsetY,
            width: (targetNode.width || 172) * getViewport().zoom,
            height: (targetNode.height || 50) * getViewport().zoom,
          },
        }));
        return;
      }

      // 将画布坐标转换为屏幕坐标
      const screenPosition = flowToScreenPosition({
        x: targetNode.position.x,
        y: targetNode.position.y,
      });

      // 计算拖放动作类型（使用屏幕坐标）
      const actionType = getDropActionType(
        mouseY,
        screenPosition.y,
        (targetNode.height || 50) * getViewport().zoom
      );

      // 映射到指示器类型
      const indicatorType: DropIndicatorType =
        actionType === "insert-before"
          ? "line-above"
          : actionType === "insert-after"
            ? "line-below"
            : "highlight";

      // 获取容器偏移(DropIndicator 相对于容器定位)
      const containerRect = containerRef.current?.getBoundingClientRect();
      const offsetX = containerRect?.left || 0;
      const offsetY = containerRect?.top || 0;

      setDragState((prev) => ({
        ...prev,
        targetNodeId: targetNode.id,
        dropIndicatorType: indicatorType,
        targetRect: {
          x: screenPosition.x - offsetX,
          y: screenPosition.y - offsetY,
          width: (targetNode.width || 172) * getViewport().zoom,
          height: (targetNode.height || 50) * getViewport().zoom,
        },
      }));
    },
    [
      dragState.draggedNodeId,
      nodes,
      nodesMap,
      flowToScreenPosition,
      getViewport,
    ]
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
        newParentId = targetNode.parent_short_id ?? null;
        position = targetNode.order_index;
      } else if (dropIndicatorType === "line-below") {
        // 插入到目标节点下方 (同级)
        newParentId = targetNode.parent_short_id ?? null;
        position = targetNode.order_index + 1;
      } else {
        // highlight: 成为目标节点的子节点
        newParentId = targetNode.short_id;
        position = Infinity; // 插入到最后
      }

      // 执行移动（使用新的命令系统）
      moveNode(draggedNodeId, newParentId, position).catch((error) => {
        console.error("[MindmapGraphViewer] Failed to move node:", error);
      });
    },
    [dragState, nodesMap, moveNode]
  );

  // === 视口双向同步 ===
  const viewport = editorState?.viewport;
  const { setViewport: rfSetViewport } = useReactFlow();
  const setViewportCmd = useCommand("view.setViewport");
  const hasInitializedRef = useRef(false);
  const currentMindmapId = useRef<string | null>(null);
  const lastSyncedViewportRef = useRef<{
    x: number;
    y: number;
    zoom: number;
  } | null>(null);

  // 比较两个 viewport 是否相似（差值小于阈值）
  const isSimilarViewport = useCallback(
    (
      vp1: { x: number; y: number; zoom: number },
      vp2: { x: number; y: number; zoom: number }
    ) => {
      const threshold = 0.0001;
      return (
        Math.abs(vp1.x - vp2.x) < threshold &&
        Math.abs(vp1.y - vp2.y) < threshold &&
        Math.abs(vp1.zoom - vp2.zoom) < threshold
      );
    },
    []
  );

  // Store → React Flow（Command 触发）
  useEffect(() => {
    if (!viewport) return;

    // 检查是否与上次同步的值相似，如果相似则跳过
    if (
      lastSyncedViewportRef.current &&
      isSimilarViewport(
        { x: viewport.x, y: viewport.y, zoom: viewport.zoom },
        lastSyncedViewportRef.current
      )
    ) {
      return;
    }

    // 记录本次同步的值
    lastSyncedViewportRef.current = {
      x: viewport.x,
      y: viewport.y,
      zoom: viewport.zoom,
    };

    // 转换为 React Flow 坐标系
    const rfViewport = nodeViewportToRfViewport(viewport);
    rfSetViewport(rfViewport, { duration: 200 });
  }, [viewport, rfSetViewport, isSimilarViewport]);

  // React Flow → Store（用户交互触发）
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const debouncedSync = useCallback(
    (rfVp: RFViewport) => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }

      debounceTimeoutRef.current = setTimeout(() => {
        const container = containerRef.current;
        if (!container) return;

        // 转换为节点坐标系
        const nodeVp = rfViewportToNodeViewport(
          rfVp,
          container.clientWidth,
          container.clientHeight
        );

        // 检查是否与上次同步的值相似，如果相似则跳过
        if (
          lastSyncedViewportRef.current &&
          isSimilarViewport(
            { x: nodeVp.x, y: nodeVp.y, zoom: nodeVp.zoom },
            lastSyncedViewportRef.current
          )
        ) {
          return;
        }

        // 记录本次同步的值
        lastSyncedViewportRef.current = {
          x: nodeVp.x,
          y: nodeVp.y,
          zoom: nodeVp.zoom,
        };

        setViewportCmd(
          nodeVp.x,
          nodeVp.y,
          nodeVp.width,
          nodeVp.height,
          nodeVp.zoom
        );
      }, 50);
    },
    [setViewportCmd, isSimilarViewport]
  );

  // 仅在首次加载时适应视图
  useEffect(() => {
    if (!editorState) return;

    // 检查是否是新的 mindmap（通过 mindmap id 判断）
    const mindmapId = editorState.currentMindmap.id;
    if (currentMindmapId.current !== mindmapId) {
      currentMindmapId.current = mindmapId;
      hasInitializedRef.current = false;
      lastSyncedViewportRef.current = null; // 重置同步记录
    }

    if (nodes.length > 0 && !hasInitializedRef.current) {
      hasInitializedRef.current = true;
      setTimeout(() => {
        fitView({ padding: 0.2, duration: 300 });

        // fitView 完成后，同步视口到 Store
        setTimeout(() => {
          const container = containerRef.current;
          if (!container) return;

          const rfVp = getViewport();
          const nodeVp = rfViewportToNodeViewport(
            rfVp,
            container.clientWidth,
            container.clientHeight
          );

          // 记录初始同步的值
          lastSyncedViewportRef.current = {
            x: nodeVp.x,
            y: nodeVp.y,
            zoom: nodeVp.zoom,
          };

          setViewportCmd(
            nodeVp.x,
            nodeVp.y,
            nodeVp.width,
            nodeVp.height,
            nodeVp.zoom
          );
        }, 350); // 等待 fitView 动画完成
      }, 50);
    }
  }, [nodes.length, fitView, getViewport, setViewportCmd, editorState]);

  return (
    <div
      ref={containerRef}
      data-testid="mindmap-graph-viewer"
      tabIndex={0}
      className="h-full w-full bg-gray-50 dark:bg-gray-900 relative outline-none"
    >
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodeClick={onNodeClick}
        onNodeDoubleClick={onNodeDoubleClick}
        onPaneClick={onPaneClick}
        onNodeDragStart={onNodeDragStart}
        onNodeDrag={onNodeDrag}
        onNodeDragStop={onNodeDragStop}
        onViewportChange={debouncedSync}
        disableKeyboardA11y={true}
        fitView
        minZoom={0.1}
        maxZoom={2}
        // 妙控板手势支持
        panOnScroll={true}
        panOnScrollMode={PanOnScrollMode.Free}
        panOnScrollSpeed={0.5}
        zoomOnPinch={true}
        defaultEdgeOptions={{
          type: "smoothstep",
          animated: false,
          style: {
            stroke: isDarkMode ? "#6b7280" : "#94a3b8",
            strokeWidth: 2,
          },
        }}
        proOptions={{ hideAttribution: true }}
      >
        <Background color={isDarkMode ? "#374151" : "#e2e8f0"} gap={16} />
        <CustomControls />
        <MiniMap
          data-testid="mindmap-graph-viewer-minimap"
          nodeColor={(node) => {
            const data = node.data as CustomNodeData;
            // 根节点的 parentId 为 null
            return data.parentId === null ? "#9333ea" : "#cbd5e1";
          }}
          nodeStrokeColor={(node) => {
            const data = node.data as CustomNodeData;
            return data.parentId === null ? "#7c3aed" : "#94a3b8";
          }}
          nodeStrokeWidth={2}
          maskColor="rgba(0, 0, 0, 0.1)"
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
});
