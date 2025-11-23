import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
import { enableMapSet } from "immer";
import type { MindmapStore, EditorState } from "./mindmap-store.types";
import type { MindmapNode } from "@/lib/types";
import { getDB } from "@/lib/db/schema";
import { CommandManager } from "./command-manager";
import { ShortcutManager } from "./shortcut-manager";
import { HistoryManager } from "./history-manager";
import {
  fetchMindmapData,
  fetchServerVersion,
} from "@/lib/actions/mindmap-sync";
import { actionSubscriptionManager } from "./action-subscription-manager";
import { MindmapLayoutServiceImpl } from "@/lib/utils/mindmap/layout-service";
import { DagreLayoutEngine } from "@/lib/utils/mindmap/layout-engines/dagre-layout-engine";
import { measureNodeSize } from "@/components/mindmap/utils/measure-node-size";

// 导入所有命令以触发注册
import "./commands";

// 导入所有快捷键以触发注册
import "./shortcuts";
import { useCallback } from "react";

// 启用 Immer 的 Map/Set 支持
enableMapSet();

const engine = new DagreLayoutEngine();

export const useMindmapStore = create<MindmapStore>()(
  immer((set, get) => ({
    isLoading: true,
    historyVersion: 0,
    commandManager: new CommandManager(),
    shortcutManager: new ShortcutManager(),
    historyManager: new HistoryManager(),
    layoutService: new MindmapLayoutServiceImpl(engine, measureNodeSize),
    openMindmap: async (mindmapId: string) => {
      const db = await getDB();
      if (!db) {
        throw new Error("Database not initialized");
      }

      set((state) => {
        state.isLoading = true;
      });

      try {
        // 1. 从 IndexedDB 加载本地数据
        const localMindmap = await db.get("mindmaps", mindmapId);

        let mindmapToLoad;
        let nodesToLoad: MindmapNode[] = [];
        let loadedFromServer = false; // 追踪数据来源

        // 2. 检查是否需要从服务器加载
        let shouldFetchFromServer = false;

        if (!localMindmap) {
          // 情况1：本地没有数据，需要从服务器加载
          console.log(
            `[openMindmap] No local data found for ${mindmapId}, fetching from server`
          );
          shouldFetchFromServer = true;
        } else {
          // 情况2：本地有数据，检查服务器时间戳
          try {
            // 使用 server action 获取服务器版本
            const serverVersion = await fetchServerVersion(mindmapId);
            const serverUpdatedAt = new Date(
              serverVersion.updated_at
            ).getTime();
            const localUpdatedAt = new Date(localMindmap.updated_at).getTime();

            if (serverUpdatedAt > localUpdatedAt) {
              console.log(
                `[openMindmap] Server data is newer (${serverVersion.updated_at} > ${localMindmap.updated_at}), fetching from server`
              );
              shouldFetchFromServer = true;
            } else {
              console.log(
                `[openMindmap] Local data is up-to-date, loading from IndexedDB`
              );
            }
          } catch (error) {
            console.warn(
              "[openMindmap] Failed to check server timestamp, using local data:",
              error
            );
            // 服务器检查失败，使用本地数据
          }
        }

        // 3. 根据判断结果加载数据
        if (shouldFetchFromServer) {
          // 使用 server action 从服务器加载
          const serverData = await fetchMindmapData(mindmapId);
          mindmapToLoad = serverData.mindmap;
          nodesToLoad = serverData.nodes;
          loadedFromServer = true;

          console.log(
            `[openMindmap] Loaded from server: ${nodesToLoad.length} nodes`
          );

          // 保存到 IndexedDB
          const writeTx = db.transaction(
            ["mindmaps", "mindmap_nodes"],
            "readwrite"
          );

          await writeTx.objectStore("mindmaps").put({
            ...mindmapToLoad,
            dirty: false,
            local_updated_at: new Date().toISOString(),
            server_updated_at: mindmapToLoad.updated_at,
          });

          // 清空旧节点
          const nodeStore = writeTx.objectStore("mindmap_nodes");
          const oldNodesIndex = nodeStore.index("by-mindmap");
          const oldNodes = await oldNodesIndex.getAllKeys(mindmapToLoad.id);
          for (const key of oldNodes) {
            await nodeStore.delete(key);
          }

          // 保存新节点
          for (const node of nodesToLoad) {
            await nodeStore.put({
              ...node,
              dirty: false,
              local_updated_at: new Date().toISOString(),
            });
          }

          await writeTx.done;
          console.log("[openMindmap] Server data saved to IndexedDB");
        } else {
          // 从本地加载
          mindmapToLoad = localMindmap;

          const nodeIndex = db
            .transaction("mindmap_nodes")
            .store.index("by-mindmap");
          nodesToLoad = await nodeIndex.getAll(localMindmap!.id);

          console.log(
            `[openMindmap] Loaded from IndexedDB: ${nodesToLoad.length} nodes`
          );
        }

        // 3.5. 过滤掉已删除的节点（仅从 IndexedDB 加载时需要）
        if (!loadedFromServer) {
          const originalNodesCount = nodesToLoad.length;
          nodesToLoad = nodesToLoad.filter(
            (node) => !(node as { deleted?: boolean }).deleted
          );
          if (originalNodesCount !== nodesToLoad.length) {
            console.log(
              `[openMindmap] Filtered out ${originalNodesCount - nodesToLoad.length} deleted nodes`
            );
          }
        }

        // 4. 验证数据
        if (!mindmapToLoad) {
          throw new Error(`Mindmap ${mindmapId} not found`);
        }

        if (nodesToLoad.length === 0) {
          throw new Error(`No nodes found for mindmap ${mindmapId}`);
        }

        // 5. 找到根节点
        const rootNode = nodesToLoad.find((n) => !n.parent_short_id);
        if (!rootNode) {
          throw new Error(`Root node not found for mindmap ${mindmapId}`);
        }

        // 6. 构造 EditorState
        const editorState: EditorState = {
          currentMindmap: mindmapToLoad,
          nodes: new Map(nodesToLoad.map((n) => [n.short_id, n])),
          collapsedNodes: new Set(),
          layouts: new Map(), // 布局状态，初始为空，由 LayoutService 计算后更新
          focusedArea: "graph",
          currentNode: rootNode.short_id,
          isLoading: false,
          // 如果从服务器加载，数据总是已保存状态；如果从本地加载，检查 dirty 标志
          isSaved: loadedFromServer ? true : !localMindmap?.dirty,
          version: 0,
        };

        // 7. 更新状态
        set((state) => {
          state.currentEditor = editorState;
          state.isLoading = false;
        });

        // 8. 初始化布局服务
        const store = get();
        const { layoutService } = store;
        if (layoutService && store.currentEditor) {
          console.log("[MindmapStore] Initializing LayoutService...");
          layoutService.init(engine, measureNodeSize, store as MindmapStore);
          console.log("[MindmapStore] LayoutService initialized");
        }

        // 9. 清空历史栈
        get().historyManager?.clear();
      } catch (error) {
        set((state) => {
          state.isLoading = false;
        });
        throw error;
      }
    },
    executeCommand: async (commandId: string, params?: unknown[]) => {
      console.log(
        "[MindmapStore] executeCommand",
        commandId,
        params,
        get().currentEditor!.version
      );
      get().commandManager!.executeCommand({
        commandId,
        params,
      });
    },

    acceptActions: async (actions) => {
      if (actions.length === 0) {
        return;
      }

      // 1. 批量更新内存状态（同步）
      set((state) => {
        if (!state.currentEditor) {
          throw new Error("No editor opened");
        }
        actions.forEach((action) => {
          action.applyToEditorState(state.currentEditor!);
        });
        state.currentEditor.version++;
      });

      // 2. 批量持久化到 IndexedDB（单事务，异步）
      const db = await getDB();
      if (!db) {
        return;
      }

      try {
        // 创建单个事务
        const tx = db.transaction("mindmap_nodes", "readwrite");

        // 在事务中顺序执行所有持久化操作
        for (const action of actions) {
          if (action.applyToIndexedDB) {
            await action.applyToIndexedDB(db);
          }
        }

        // 等待事务提交
        await tx.done;
      } catch (error) {
        console.error("[MindmapStore] Failed to persist actions:", {
          actionCount: actions.length,
          actionTypes: actions.map((a) => a.type),
          error,
        });

        // 标记为未保存
        set((state) => {
          if (state.currentEditor) {
            state.currentEditor.isSaved = false;
          }
        });

        // 传播错误
        throw error;
      }

      // 3. 通知订阅者
      const timestamp = Date.now();
      for (const action of actions) {
        await actionSubscriptionManager.notify(action.type, {
          action,
          timestamp,
        });
      }
    },

    /**
     * 更新布局状态
     * 由 LayoutService 调用，直接更新 state，不持久化，不触发 undo
     */
    updateLayouts: (layouts) => {
      set((state) => {
        if (!state.currentEditor) {
          return;
        }
        state.currentEditor.layouts = layouts;
      });
    },
  }))
);

export const useMindmapEditorState = (): EditorState | undefined => {
  const store = useMindmapStore();

  if (!store.currentEditor) {
    return undefined;
  }
  return store.currentEditor;
};

export const useCommandManager = (): CommandManager => {
  const store = useMindmapStore();
  return store.commandManager!;
};

export const useCommand = (
  commandId: string
): ((...params: unknown[]) => Promise<void>) => {
  const manager = useCommandManager();
  return useCallback(
    (...params) =>
      manager.executeCommand({
        commandId,
        params,
      }),
    [manager, commandId]
  );
};
