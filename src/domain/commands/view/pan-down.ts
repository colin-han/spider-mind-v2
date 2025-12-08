import type { CommandDefinition } from "../../command-registry";
import type { MindmapStore } from "../../mindmap-store.types";
import { EmptyParamsSchema } from "../../command-schema";
import { SetViewportAction } from "../../actions/ephemeral/set-viewport";

const PAN_STEP = 100; // 平移步进（节点坐标系单位）

export const panDown: CommandDefinition<typeof EmptyParamsSchema> = {
  id: "view.panDown",
  name: "向下平移",
  description: "向下平移视图",
  category: "view",
  actionBased: true,
  undoable: false,
  paramsSchema: EmptyParamsSchema,
  handler: (root: MindmapStore, _params) => {
    const viewport = root.currentEditor!.viewport;
    // 向下平移 = 视口下移 = y 增加
    return [new SetViewportAction({ y: viewport.y + PAN_STEP }, viewport)];
  },
};
