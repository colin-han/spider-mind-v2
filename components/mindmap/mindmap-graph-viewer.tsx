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

import { useCallback, useMemo, useEffect } from "react";
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
 * MindmapGraphViewer 组件
 */
export function MindmapGraphViewer({ onNodeEdit }: MindmapGraphViewerProps) {
  const { fitView } = useReactFlow();
  const {
    currentMindmap,
    nodes: nodesMap,
    collapsedNodes,
    setCurrentNode,
    getRootNode,
  } = useMindmapEditorStore();

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

    // 步骤 2: 计算布局
    const layoutedNodes = calculateDagreLayout(flowData.nodes, flowData.edges);

    return {
      nodes: layoutedNodes,
      edges: flowData.edges,
    };
  }, [currentMindmap, nodesMap, collapsedNodes, getRootNode]);

  // 单击节点 - 选中
  const onNodeClick = useCallback(
    (_event: React.MouseEvent, node: Node) => {
      setCurrentNode(node.id);
    },
    [setCurrentNode]
  );

  // 双击节点 - 触发编辑
  const onNodeDoubleClick = useCallback(
    (_event: React.MouseEvent, node: Node) => {
      setCurrentNode(node.id);
      onNodeEdit?.();
    },
    [setCurrentNode, onNodeEdit]
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
      className="h-full w-full bg-gray-50"
    >
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodeClick={onNodeClick}
        onNodeDoubleClick={onNodeDoubleClick}
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
    </div>
  );
}
