import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
import { enableMapSet } from "immer";
import type { MindmapStore, EditorState } from "./mindmap-store.types";
import { getDB } from "../db/schema";
import { CommandManager } from "./command-manager";
import { ShortcutManager } from "./shortcut-manager";
import { HistoryManager } from "./history-manager";

// 导入所有命令以触发注册
import "./commands";

// 导入所有快捷键以触发注册
import "./shortcuts";

// 启用 Immer 的 Map/Set 支持
enableMapSet();

export const useMindmapStore = create<MindmapStore>()(
  immer((set, get) => ({
    init: async () => {
      const db = await getDB();
      const root = get();
      set((state) => {
        state.db = db;
        state.commandManager = new CommandManager(root);
        state.shortcutManager = new ShortcutManager(root);
        state.historyManager = new HistoryManager(root);
      });
    },
    openMindmap: async (mindmapId: string) => {
      const db = get().db;
      if (!db) {
        throw new Error("Database not initialized");
      }

      // 1. 从 IndexedDB 加载 mindmap
      const mindmap = await db.get("mindmaps", mindmapId);

      if (!mindmap) {
        throw new Error(`Mindmap ${mindmapId} not found in local database`);
      }

      // 2. 加载所有节点
      const nodeIndex = db
        .transaction("mindmap_nodes")
        .store.index("by-mindmap");
      const nodes = await nodeIndex.getAll(mindmap.id);

      if (nodes.length === 0) {
        throw new Error(`No nodes found for mindmap ${mindmapId}`);
      }

      // 3. 找到根节点
      const rootNode = nodes.find((n) => !n.parent_short_id);
      if (!rootNode) {
        throw new Error(`Root node not found for mindmap ${mindmapId}`);
      }

      // 4. 构造 EditorState
      const editorState: EditorState = {
        currentMindmap: mindmap,
        nodes: new Map(nodes.map((n) => [n.short_id, n])),
        collapsedNodes: new Set(),
        focusedArea: "graph",
        currentNode: rootNode.short_id,
        isSaved: !mindmap.dirty,
      };

      // 5. 更新状态
      set((state) => {
        state.currentEditor = editorState;
      });

      // 6. 清空历史栈
      get().historyManager?.clear();
    },
    executeCommand: async (commandId: string, params?: unknown[]) => {
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
      });

      // 2. 批量持久化到 IndexedDB（单事务，异步）
      const db = get().db;
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

        console.log(
          `[MindmapStore] Successfully persisted ${actions.length} action(s) in a single transaction`
        );
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
    },
  }))
);

export const useMindmapEditorState = (): EditorState => {
  const store = useMindmapStore();
  if (!store.currentEditor) {
    throw new Error("打开一个Mindmap后才能够使用editor state");
  }
  return store.currentEditor;
};

export const useCommandManager = (): CommandManager => {
  const store = useMindmapStore();
  return store.commandManager!;
};
