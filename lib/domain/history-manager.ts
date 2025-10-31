import { EditorAction } from "./mindmap-store.types";
import { MindmapStore } from "./mindmap-store.types";

export interface HistoryItem {
  commandId: string;
  description: string;
  actions: EditorAction[];
}

export class HistoryManager {
  undoStack: HistoryItem[] = [];
  redoStack: HistoryItem[] = [];

  constructor(private readonly root: MindmapStore) {}

  private executeActions(actions: EditorAction[]) {
    actions.forEach((action) => {
      this.root.acceptAction(action);
    });
  }

  execute(item: HistoryItem) {
    this.executeActions(item.actions);
    this.undoStack.push(item);
    this.redoStack = [];
  }

  undo() {
    if (this.undoStack.length === 0) {
      return;
    }
    const item = this.undoStack.pop()!;
    this.executeActions(item.actions.map((action) => action.reverse()));
    this.redoStack.push(item);
  }

  redo() {
    if (this.redoStack.length === 0) {
      return;
    }
    const item = this.redoStack.pop()!;
    this.executeActions(item.actions);
    this.undoStack.push(item);
  }

  clear() {
    this.undoStack = [];
    this.redoStack = [];
  }

  canUndo() {
    return this.undoStack.length > 0;
  }

  canRedo() {
    return this.redoStack.length > 0;
  }

  lastUndoDescription() {
    return this.undoStack[this.undoStack.length - 1]?.description;
  }

  lastRedoDescription() {
    return this.redoStack[this.redoStack.length - 1]?.description;
  }
}
