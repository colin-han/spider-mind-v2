import type { CommandDefinition } from "../../command-registry";
import type { MindmapStore } from "../../mindmap-store.types";
import { EmptyParamsSchema } from "../../command-schema";
import { SetViewportAction } from "../../actions/ephemeral/set-viewport";

export const zoomReset: CommandDefinition<typeof EmptyParamsSchema> = {
  id: "view.zoomReset",
  name: "重置缩放",
  description: "重置缩放为 100%",
  category: "view",
  actionBased: true,
  undoable: false,
  paramsSchema: EmptyParamsSchema,
  handler: (root: MindmapStore, _params) => {
    const viewport = root.currentEditor!.viewport;
    const newZoom = 1.0;

    // 计算新的视口位置和尺寸（保持中心点不变）
    const centerX = viewport.x + viewport.width / 2;
    const centerY = viewport.y + viewport.height / 2;
    const newWidth = viewport.width * (viewport.zoom / newZoom);
    const newHeight = viewport.height * (viewport.zoom / newZoom);
    const newX = centerX - newWidth / 2;
    const newY = centerY - newHeight / 2;

    return [
      new SetViewportAction(
        { x: newX, y: newY, width: newWidth, height: newHeight, zoom: newZoom },
        viewport
      ),
    ];
  },
};
