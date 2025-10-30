import { CommandRun } from "./command-manager";
import { MindmapStore } from "./mindmap-store.types";

const shortcutDefinitions = new Map<string, ShortcutDefinition[]>();

export interface ShortcutDefinition {
  key: string;
  when?: (root: MindmapStore) => boolean;
  run(root: MindmapStore): CommandRun;
}

export function registerShortcut(key: string, commandId: string): void;
export function registerShortcut(def: ShortcutDefinition): void;
export function registerShortcut(
  arg: string | ShortcutDefinition,
  commandId?: string
) {
  if (typeof arg === "string") {
    registerShortcutImpl({
      key: arg,
      run: () => ({
        commandId: commandId!,
        params: [],
      }),
    });
  } else {
    registerShortcutImpl(arg);
  }
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
