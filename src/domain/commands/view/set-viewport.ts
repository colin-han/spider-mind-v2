import { z } from "zod";
import type { CommandDefinition } from "../../command-registry";
import type { MindmapStore } from "../../mindmap-store.types";
import { SetViewportAction } from "../../actions/ephemeral/set-viewport";

export const SetViewportParamsSchema = z.object({
  x: z.number().describe("视口左边缘 X 坐标（节点坐标系）"),
  y: z.number().describe("视口上边缘 Y 坐标（节点坐标系）"),
  width: z.number().describe("视口宽度（节点坐标系）"),
  height: z.number().describe("视口高度（节点坐标系）"),
  zoom: z.number().describe("缩放比例"),
});

export const setViewport: CommandDefinition<typeof SetViewportParamsSchema> = {
  id: "view.setViewport",
  name: "设置视口",
  description: "设置画布视口位置和缩放（节点坐标系）",
  category: "view",
  actionBased: true,
  undoable: false,
  paramsSchema: SetViewportParamsSchema,
  handler: (root: MindmapStore, params) => {
    const { x, y, width, height, zoom } = params;
    const oldViewport = root.currentEditor!.viewport;
    return [new SetViewportAction({ x, y, width, height, zoom }, oldViewport)];
  },
};
