import { create } from "zustand";
import type { MindmapStore, EditorState } from "./mindmap-store.types";
import { getDB } from "../db/schema";
import { CommandManager } from "./command-manager";
import { ShortcutManager } from "./shortcut-manager";

export const useMindmapStore = create<MindmapStore>((set, get) => ({
  init: async () => {
    const db = await getDB();
    const root = get();
    set({
      db,
      commandManager: new CommandManager(root),
      shortcutManager: new ShortcutManager(root),
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
}));

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
