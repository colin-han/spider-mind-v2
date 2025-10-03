import { useEffect, useState } from "react";
import { useMindmapEditorStore } from "@/lib/store/mindmap-editor.store";
import type { Mindmap, MindmapNode } from "@/lib/types";

/**
 * 初始化思维导图数据到 Store
 * 仅在首次加载时执行一次
 */
export function useMindmapData(mindmap: Mindmap, initialNodes: MindmapNode[]) {
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    if (isInitialized) return;

    // 使用 setState 来安全地修改 Store
    useMindmapEditorStore.setState((state) => {
      // 清空现有数据
      state.nodes.clear();
      state.selectedNodes.clear();
      state.currentNode = null;
      state.expandedNodes.clear();
      state.collapsedNodes.clear();

      // 设置当前思维导图
      state.currentMindmap = mindmap;

      // 加载所有节点到 Map
      initialNodes.forEach((node) => {
        state.nodes.set(node.short_id, node);
      });

      // 默认展开根节点
      const rootNode = Array.from(state.nodes.values()).find(
        (node) => node.mindmap_id === mindmap.id && node.node_type === "root"
      );
      if (rootNode) {
        state.expandedNodes.add(rootNode.short_id);
      }
    });

    setIsInitialized(true);
  }, [mindmap, isInitialized, initialNodes]);

  return { isInitialized };
}
