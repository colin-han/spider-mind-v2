import { IDBPDatabase } from "idb";
import { MindmapDB } from "@/lib/db/schema";
import { Mindmap, MindmapNode } from "@/lib/types";
import { CommandManager } from "./command-manager";
import { ShortcutManager } from "./shortcut-manager";
import { HistoryManager } from "./history-manager";
import { FocusedAreaId } from "./focused-area.types";
import type { MindmapLayoutService } from "@/lib/utils/mindmap/mindmap-layout";

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

export interface NodeLayout {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * 视口状态
 * 所有坐标使用节点坐标系（pre-zoom），与节点的 x, y, width, height 在同一坐标系中
 */
export interface Viewport {
  x: number; // 视口左边缘在节点坐标系中的 X 坐标
  y: number; // 视口上边缘在节点坐标系中的 Y 坐标
  width: number; // 视口在节点坐标系中的宽度
  height: number; // 视口在节点坐标系中的高度
  zoom: number; // 缩放比例 (0.1 - 2.0)
}

export interface EditorState {
  // 核心数据
  currentMindmap: Mindmap;
  nodes: Map<string, MindmapNode>; // key 是 short_id

  // UI 状态 (默认展开,仅记录折叠状态)
  collapsedNodes: Set<string>; // 折叠的节点 short_id 集合

  // 布局状态（派生状态，不持久化）
  layouts: Map<string, NodeLayout>; // 节点布局信息，key 是 short_id

  // 视口状态（派生状态，不持久化）
  viewport: Viewport;

  // 焦点状态
  focusedArea: FocusedAreaId; // UI 焦点区域
  currentNode: string; // short_id

  // 状态
  isLoading: boolean;
  isSaved: boolean;
  isSaving: boolean; // 是否正在保存
  layoutReady: boolean; // 布局是否已准备好（用于初始视图定位）

  version: number;
}

export interface MindmapStore {
  isLoading: boolean;
  historyVersion: number; // 用于触发 UI 更新的版本号

  readonly currentEditor?: EditorState | undefined; // 内存中的编辑状态（immutable 对象）
  readonly commandManager?: CommandManager;
  readonly shortcutManager?: ShortcutManager;
  readonly historyManager?: HistoryManager;
  readonly layoutService?: MindmapLayoutService; // 布局服务（管理布局计算和更新）

  openMindmap(mindmapId: string): Promise<void>; // 打开指定 mindmap （id是short_id），创建新的EditorState。并清理undo/redo栈。
  acceptActions(actions: EditorAction[]): Promise<void>; // 批量应用 EditorActions 到当前编辑器状态（单事务保证原子性）
  executeCommand(commandId: string, params?: unknown[]): Promise<void>;

  // 布局管理（由 LayoutService 调用）
  updateLayouts(layouts: Map<string, NodeLayout>): void; // 更新布局状态（不持久化，不触发 undo）
}
