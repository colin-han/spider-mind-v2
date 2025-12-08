import type { CommandDefinition } from "../../command-registry";
import type { MindmapStore } from "../../mindmap-store.types";
import { EmptyParamsSchema } from "../../command-schema";
import { SetViewportAction } from "../../actions/ephemeral/set-viewport";

const PAN_STEP = 100; // 平移步进（节点坐标系单位）

export const panRight: CommandDefinition<typeof EmptyParamsSchema> = {
  id: "view.panRight",
  name: "向右平移",
  description: "向右平移视图",
  category: "view",
  actionBased: true,
  undoable: false,
  paramsSchema: EmptyParamsSchema,
  handler: (root: MindmapStore, _params) => {
    const viewport = root.currentEditor!.viewport;
    // 向右平移 = 视口右移 = x 增加
    return [new SetViewportAction({ x: viewport.x + PAN_STEP }, viewport)];
  },
};
