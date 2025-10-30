import { IDBPDatabase } from "idb";
import { MindmapDB } from "../db/schema";
import { Mindmap, MindmapNode } from "../types";
import { CommandManager } from "./command-manager";
import { ShortcutManager } from "./shortcut-manager";
import { EditorStore } from "./editor-store";
import { HistoryManager } from "./history-manager";

export interface EditorAction {
  type: string;
  visitEditorState(mutableState: EditorState): Promise<void>;
  visitIndexedDB(db: IDBPDatabase<MindmapDB>): Promise<void>;
  reverse(): EditorAction;
}

export type FocusedArea = "graph" | "panel" | "outline" | "search";

export interface EditorState {
  // 核心数据
  currentMindmap: Mindmap;
  nodes: Map<string, MindmapNode>; // key 是 short_id

  // UI 状态 (默认展开,仅记录折叠状态)
  collapsedNodes: Set<string>; // 折叠的节点 short_id 集合

  // 焦点状态
  focusedArea: FocusedArea; // UI 焦点区域
  currentNode: string; // short_id

  // 编辑状态
  isSaved: boolean;
}

export interface MindmapStore {
  readonly currentEditor?: EditorStore; // 内存中的编辑状态
  readonly db?: IDBPDatabase<MindmapDB>; // 用来保存编辑状态的信息到IndexedDB中。
  readonly commandManager?: CommandManager;
  readonly shortcutManager?: ShortcutManager;
  readonly historyManager?: HistoryManager;

  init(): Promise<void>;
  openMindmap(mindmapId: string): Promise<void>; // 打开指定 mindmap （id是short_id），创建新的EditorStore。并清理undo/redo栈。

  executeCommand(commandId: string, params?: unknown[]): Promise<void>;
}
