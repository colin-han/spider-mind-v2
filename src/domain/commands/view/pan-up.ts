import type { CommandDefinition } from "../../command-registry";
import type { MindmapStore } from "../../mindmap-store.types";
import { SetViewportAction } from "../../actions/set-viewport";

const PAN_STEP = 100; // 平移步进（节点坐标系单位）

export const panUp: CommandDefinition = {
  id: "view.panUp",
  name: "向上平移",
  description: "向上平移视图",
  category: "view",
  actionBased: true,
  undoable: false,
  handler: (root: MindmapStore) => {
    const viewport = root.currentEditor!.viewport;
    // 向上平移 = 视口上移 = y 减小
    return [new SetViewportAction({ y: viewport.y - PAN_STEP }, viewport)];
  },
};
