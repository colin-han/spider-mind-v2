import { MindmapDB } from "@/lib/db/schema";
import { IDBPDatabase } from "idb";
import { EditorAction, EditorState } from "../mindmap-store.types";
import { ExpandNodeAction } from "./expand-node";

export class CollapseNodeAction implements EditorAction {
  type = "collapseNode";

  constructor(private readonly nodeId: string) {}

  async visitEditorState(mutableState: EditorState) {
    mutableState.collapsedNodes.add(this.nodeId);
  }

  async visitIndexedDB(_db: IDBPDatabase<MindmapDB>) {
    // Do nothing
  }

  reverse(): EditorAction {
    return new ExpandNodeAction(this.nodeId);
  }
}
