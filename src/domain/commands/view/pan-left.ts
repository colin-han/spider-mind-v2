import type { CommandDefinition } from "../../command-registry";
import type { MindmapStore } from "../../mindmap-store.types";
import { SetViewportAction } from "../../actions/ephemeral/set-viewport";

const PAN_STEP = 100; // 平移步进（节点坐标系单位）

export const panLeft: CommandDefinition = {
  id: "view.panLeft",
  name: "向左平移",
  description: "向左平移视图",
  category: "view",
  actionBased: true,
  undoable: false,
  handler: (root: MindmapStore) => {
    const viewport = root.currentEditor!.viewport;
    // 向左平移 = 视口左边缘向左移动 = x 减小
    return [new SetViewportAction({ x: viewport.x - PAN_STEP }, viewport)];
  },
};
