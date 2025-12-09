import type { CommandDefinition } from "../../command-registry";
import type { MindmapStore } from "../../mindmap-store.types";
import { EmptyParamsSchema } from "../../command-schema";
import { SetViewportAction } from "../../actions/ephemeral/set-viewport";

export const zoomOut: CommandDefinition<typeof EmptyParamsSchema> = {
  id: "view.zoomOut",
  name: "缩小视图",
  description: "缩小画布视图约 17%",
  category: "view",
  actionBased: true,
  undoable: false,
  paramsSchema: EmptyParamsSchema,
  handler: (root: MindmapStore, _params) => {
    const viewport = root.currentEditor!.viewport;
    const newZoom = Math.max(0.1, viewport.zoom / 1.2);

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
