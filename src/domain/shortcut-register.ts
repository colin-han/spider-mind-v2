import { CommandRun } from "./command-manager";
import { MindmapStore } from "./mindmap-store.types";
import { FocusedAreaId } from "./focused-area.types";

const shortcutDefinitions = new Map<string, ShortcutDefinition[]>();

// 定义哪些区域是编辑模式（需要禁用快捷键）
const EDITING_AREAS: FocusedAreaId[] = [
  "title-editor",
  "note-editor",
  "ai-chat",
];

export interface ShortcutDefinition {
  key: string;
  when?: (root: MindmapStore) => boolean;
  run(root: MindmapStore): CommandRun & { preventDefault?: boolean };
}

export function registerShortcut(
  key: string,
  commandId: string,
  preventDefault?: boolean
): void;
export function registerShortcut(
  key: string,
  commandId: string,
  params?: Record<string, unknown>,
  preventDefault?: boolean
): void;
export function registerShortcut(def: ShortcutDefinition): void;
export function registerShortcut(
  arg: string | ShortcutDefinition,
  commandId?: string,
  params?: Record<string, unknown> | boolean,
  preventDefault?: boolean
) {
  if (typeof arg === "string") {
    if (typeof params === "object" && !Array.isArray(params)) {
      registerShortcutImpl({
        key: arg,
        run: () => ({
          commandId: commandId!,
          params: params,
          preventDefault: preventDefault ?? false,
        }),
      });
    } else {
      // 当 params 是 boolean 时，把它当作 preventDefault 处理
      registerShortcutImpl({
        key: arg,
        run: () => ({
          commandId: commandId!,
          params: {},
          preventDefault:
            typeof params === "boolean" ? params : (preventDefault ?? false),
        }),
      });
    }
  } else {
    registerShortcutImpl(arg);
  }
}

export function registerNonEditShortcut(
  key: string,
  commandId: string,
  preventDefault?: boolean
) {
  registerShortcutImpl({
    key,
    run: () => ({
      commandId,
      params: {},
      preventDefault: preventDefault ?? false,
    }),
    when: (root) => {
      // 检查焦点是否在编辑区域内
      const currentArea = root.currentEditor!.focusedArea as FocusedAreaId;
      if (EDITING_AREAS.includes(currentArea)) {
        return false;
      }

      // 检查焦点是否在 input 或 textarea 内
      const activeElement = document.activeElement;
      if (
        activeElement &&
        (activeElement.tagName === "INPUT" ||
          activeElement.tagName === "TEXTAREA")
      ) {
        return false;
      }

      return true;
    },
  });
}

export function registerShortcutForArea(
  areaId: FocusedAreaId,
  key: string,
  commandId: string,
  params?: Record<string, unknown>,
  preventDefault?: boolean
) {
  registerShortcutImpl({
    key,
    run: () => ({
      commandId,
      params: params ?? {},
      preventDefault: preventDefault ?? false,
    }),
    when: (root) => {
      // 检查焦点是否在编辑区域内
      const currentArea = root.currentEditor!.focusedArea;
      if (currentArea !== areaId) {
        return false;
      }

      return true;
    },
  });
}

function registerShortcutImpl(def: ShortcutDefinition) {
  const existing = shortcutDefinitions.get(def.key);
  if (existing) {
    existing.push(def);
  } else {
    shortcutDefinitions.set(def.key, [def]);
  }
}

export function getShortcutDefinitions(key: string) {
  return shortcutDefinitions.get(key);
}

/**
 * 根据命令 ID 查找快捷键
 */
export function findShortcutByCommand(commandId: string):
  | {
      key: string;
      definition: ShortcutDefinition;
    }
  | undefined {
  for (const [key, defs] of shortcutDefinitions.entries()) {
    for (const def of defs) {
      const run = def.run({} as unknown as MindmapStore);
      if (run.commandId === commandId) {
        return { key, definition: def };
      }
    }
  }
  return undefined;
}
