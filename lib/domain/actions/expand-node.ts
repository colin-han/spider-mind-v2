import { MindmapDB } from "@/lib/db/schema";
import { IDBPDatabase } from "idb";
import { EditorAction, EditorState } from "../mindmap-store.types";
import { CollapseNodeAction } from "./collapse-node";

export class ExpandNodeAction implements EditorAction {
  type = "expandNode";

  constructor(private readonly nodeId: string) {}

  async visitEditorState(mutableState: EditorState) {
    mutableState.collapsedNodes.delete(this.nodeId);
  }

  async visitIndexedDB(_db: IDBPDatabase<MindmapDB>) {
    // Do nothing
  }

  reverse(): EditorAction {
    return new CollapseNodeAction(this.nodeId);
  }
}
