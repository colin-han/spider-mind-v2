import type {
  EditorAction,
  EditorState,
  Viewport,
} from "../../mindmap-store.types";

export interface SetViewportParams {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  zoom?: number;
}

export class SetViewportAction implements EditorAction {
  type = "setViewport";

  constructor(
    private readonly newViewport: SetViewportParams,
    private readonly oldViewport: Viewport
  ) {}

  applyToEditorState(draft: EditorState): void {
    if (this.newViewport.x !== undefined) {
      draft.viewport.x = this.newViewport.x;
    }
    if (this.newViewport.y !== undefined) {
      draft.viewport.y = this.newViewport.y;
    }
    if (this.newViewport.width !== undefined) {
      draft.viewport.width = this.newViewport.width;
    }
    if (this.newViewport.height !== undefined) {
      draft.viewport.height = this.newViewport.height;
    }
    if (this.newViewport.zoom !== undefined) {
      draft.viewport.zoom = Math.max(0.1, Math.min(2.0, this.newViewport.zoom));
    }
  }

  // 视口状态不持久化到 IndexedDB
  async applyToIndexedDB(): Promise<void> {}

  reverse(): EditorAction {
    // 构建反向操作的参数：只包含原操作中修改过的字段
    const reverseParams: SetViewportParams = {};
    if (this.newViewport.x !== undefined) {
      reverseParams.x = this.oldViewport.x;
    }
    if (this.newViewport.y !== undefined) {
      reverseParams.y = this.oldViewport.y;
    }
    if (this.newViewport.width !== undefined) {
      reverseParams.width = this.oldViewport.width;
    }
    if (this.newViewport.height !== undefined) {
      reverseParams.height = this.oldViewport.height;
    }
    if (this.newViewport.zoom !== undefined) {
      reverseParams.zoom = this.oldViewport.zoom;
    }

    return new SetViewportAction(reverseParams, {
      x: this.newViewport.x ?? this.oldViewport.x,
      y: this.newViewport.y ?? this.oldViewport.y,
      width: this.newViewport.width ?? this.oldViewport.width,
      height: this.newViewport.height ?? this.oldViewport.height,
      zoom: this.newViewport.zoom ?? this.oldViewport.zoom,
    });
  }
}
