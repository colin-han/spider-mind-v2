import type { CommandDefinition } from "../../command-registry";
import type { MindmapStore } from "../../mindmap-store.types";
import { SetViewportAction } from "../../actions/ephemeral/set-viewport";

export const setViewport: CommandDefinition = {
  id: "view.setViewport",
  name: "设置视口",
  description: "设置画布视口位置和缩放（节点坐标系）",
  category: "view",
  actionBased: true,
  undoable: false,
  parameters: [
    {
      name: "x",
      type: "number",
      description: "视口左边缘 X 坐标（节点坐标系）",
    },
    {
      name: "y",
      type: "number",
      description: "视口上边缘 Y 坐标（节点坐标系）",
    },
    {
      name: "width",
      type: "number",
      description: "视口宽度（节点坐标系）",
    },
    {
      name: "height",
      type: "number",
      description: "视口高度（节点坐标系）",
    },
    { name: "zoom", type: "number", description: "缩放比例" },
  ],
  handler: (root: MindmapStore, params?: unknown[]) => {
    const [x, y, width, height, zoom] = (params as [
      number,
      number,
      number,
      number,
      number,
    ]) || [0, 0, 800, 600, 1];
    const oldViewport = root.currentEditor!.viewport;
    return [new SetViewportAction({ x, y, width, height, zoom }, oldViewport)];
  },
};
