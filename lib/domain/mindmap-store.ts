import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
import { enableMapSet } from "immer";
import type { MindmapStore, EditorState } from "./mindmap-store.types";
import { getDB } from "../db/schema";
import { CommandManager } from "./command-manager";
import { ShortcutManager } from "./shortcut-manager";
import { HistoryManager } from "./history-manager";

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
    openMindmap: async (_mindmapId: string) => {
      //TODO: 加载mindmap, 创建editorstore;
    },
    executeCommand: async (commandId: string, params?: unknown[]) => {
      get().commandManager!.executeCommand({
        commandId,
        params,
      });
    },

    acceptAction: (action) => {
      set((state) => {
        if (!state.currentEditor) {
          throw new Error("No editor opened");
        }
        action.applyToEditorState(state.currentEditor);
      });
      // 应用到 IndexedDB
      const db = get().db;
      if (db) {
        action.applyToIndexedDB?.(db);
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
