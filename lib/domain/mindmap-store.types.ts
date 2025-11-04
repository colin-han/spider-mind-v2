import { IDBPDatabase } from "idb";
import { MindmapDB } from "../db/schema";
import { Mindmap, MindmapNode } from "../types";
import { CommandManager } from "./command-manager";
import { ShortcutManager } from "./shortcut-manager";
import { HistoryManager } from "./history-manager";

export interface EditorAction {
  type: string;

  /**
   * 应用到 EditorState
   * 使用 Immer Draft，可以直接修改 draft
   */
  applyToEditorState(draft: EditorState): void;

  /**
   * （可选）持久化到 IndexedDB
   * 会被 MindmapStore.acceptActions 自动调用
   */
  applyToIndexedDB?(db: IDBPDatabase<MindmapDB>): Promise<void>;

  /**
   * 返回逆操作（用于 undo）
   */
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

  // 状态
  isLoading: boolean;
  isSaved: boolean;

  version: number;
}

export interface MindmapStore {
  isLoading: boolean;

  readonly currentEditor?: EditorState; // 内存中的编辑状态（immutable 对象）
  readonly commandManager?: CommandManager;
  readonly shortcutManager?: ShortcutManager;
  readonly historyManager?: HistoryManager;

  openMindmap(mindmapId: string): Promise<void>; // 打开指定 mindmap （id是short_id），创建新的EditorState。并清理undo/redo栈。
  acceptActions(actions: EditorAction[]): Promise<void>; // 批量应用 EditorActions 到当前编辑器状态（单事务保证原子性）
  executeCommand(commandId: string, params?: unknown[]): Promise<void>;
}
