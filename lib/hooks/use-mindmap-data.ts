import { useEffect, useState } from "react";
import { useMindmapEditorStore } from "@/lib/store/mindmap-editor.store";
import { initDB } from "@/lib/db/schema";
import type { Mindmap, MindmapNode } from "@/lib/types";

/**
 * 初始化思维导图数据到 Store
 *
 * 优先从 IndexedDB 加载（如果有本地数据），否则使用服务器数据
 */
export function useMindmapData(mindmap: Mindmap, initialNodes: MindmapNode[]) {
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    if (isInitialized) return;

    const initializeData = async () => {
      try {
        // 1. 尝试从 IndexedDB 加载
        const db = await initDB();
        const tx = db.transaction(["mindmaps", "mindmap_nodes"], "readonly");

        // 检查 IndexedDB 中是否有数据
        const localMindmap = await tx
          .objectStore("mindmaps")
          .get(mindmap.short_id);
        const localNodesIndex = tx
          .objectStore("mindmap_nodes")
          .index("by-mindmap");
        const localNodes = await localNodesIndex.getAll(mindmap.id);

        await tx.done;

        // 2. 决定使用哪个数据源
        let nodesToLoad: MindmapNode[] = initialNodes;
        let mindmapToLoad = mindmap;

        if (localMindmap && localNodes.length > 0) {
          console.log("[useMindmapData] Loading from IndexedDB:", {
            mindmap: localMindmap,
            nodeCount: localNodes.length,
          });

          // 从 IndexedDB 加载的数据需要去除持久化字段
          nodesToLoad = localNodes.map(
            ({ dirty: _dirty, local_updated_at: _local_updated_at, ...node }) =>
              node
          );
          mindmapToLoad = {
            ...localMindmap,
            // 去除持久化相关字段
            dirty: undefined,
            local_updated_at: undefined,
            server_updated_at: undefined,
          } as Mindmap;
        } else {
          console.log("[useMindmapData] Loading from server:", {
            mindmap,
            nodeCount: initialNodes.length,
          });

          // 首次加载，将服务器数据保存到 IndexedDB
          const writeTx = db.transaction(
            ["mindmaps", "mindmap_nodes"],
            "readwrite"
          );

          // 保存思维导图元数据
          await writeTx.objectStore("mindmaps").put({
            ...mindmap,
            dirty: false,
            local_updated_at: new Date().toISOString(),
            server_updated_at: mindmap.updated_at,
          });

          // 保存所有节点
          for (const node of initialNodes) {
            await writeTx.objectStore("mindmap_nodes").put({
              ...node,
              dirty: false,
              local_updated_at: new Date().toISOString(),
            });
          }

          await writeTx.done;
        }

        // 3. 使用 setState 来安全地修改 Store
        useMindmapEditorStore.setState((state) => {
          // 清空现有数据
          state.nodes.clear();
          state.selectedNodes.clear();
          state.currentNode = null;
          state.expandedNodes.clear();
          state.collapsedNodes.clear();

          // 设置当前思维导图
          state.currentMindmap = mindmapToLoad;

          // 加载所有节点到 Map
          nodesToLoad.forEach((node) => {
            state.nodes.set(node.short_id, node);
          });

          // 默认展开根节点
          const rootNode = Array.from(state.nodes.values()).find(
            (node) =>
              node.mindmap_id === mindmap.id && node.node_type === "root"
          );
          if (rootNode) {
            state.expandedNodes.add(rootNode.short_id);
          }

          // 重置状态
          state.isDirty = false;
          state.isSynced = true;
        });

        // 4. 初始化撤销/重做状态
        await useMindmapEditorStore.getState().updateUndoRedoState();

        setIsInitialized(true);
      } catch (error) {
        console.error("[useMindmapData] Failed to initialize:", error);

        // 出错时使用服务器数据
        useMindmapEditorStore.setState((state) => {
          state.nodes.clear();
          state.selectedNodes.clear();
          state.currentNode = null;
          state.expandedNodes.clear();
          state.collapsedNodes.clear();
          state.currentMindmap = mindmap;

          initialNodes.forEach((node) => {
            state.nodes.set(node.short_id, node);
          });

          const rootNode = Array.from(state.nodes.values()).find(
            (node) =>
              node.mindmap_id === mindmap.id && node.node_type === "root"
          );
          if (rootNode) {
            state.expandedNodes.add(rootNode.short_id);
          }
        });

        setIsInitialized(true);
      }
    };

    void initializeData();
  }, [mindmap, isInitialized, initialNodes]);

  return { isInitialized };
}
