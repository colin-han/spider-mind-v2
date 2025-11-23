import type { CommandDefinition } from "../../command-registry";
import type { MindmapStore } from "../../mindmap-store.types";
import { SetViewportAction } from "../../actions/set-viewport";

export const fitView: CommandDefinition = {
  id: "view.fitView",
  name: "适应视图",
  description: "调整视图以显示全部内容",
  category: "view",
  actionBased: true,
  undoable: false,
  handler: (root: MindmapStore) => {
    const state = root.currentEditor!;
    const viewport = state.viewport;

    // 计算所有节点的边界
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    state.layouts.forEach((layout) => {
      minX = Math.min(minX, layout.x);
      minY = Math.min(minY, layout.y);
      maxX = Math.max(maxX, layout.x + layout.width);
      maxY = Math.max(maxY, layout.y + layout.height);
    });

    // 如果没有节点，不做任何操作
    if (minX === Infinity) {
      return [];
    }

    // 计算内容的宽高
    const contentWidth = maxX - minX;
    const contentHeight = maxY - minY;

    // 添加 20% 的边距
    const padding = 0.2;
    const paddedWidth = contentWidth * (1 + padding);
    const paddedHeight = contentHeight * (1 + padding);

    // 计算缩放比例（取最小值以确保内容完全可见）
    const zoomX = viewport.width / paddedWidth;
    const zoomY = viewport.height / paddedHeight;
    const newZoom = Math.max(0.1, Math.min(2.0, Math.min(zoomX, zoomY)));

    // 计算新的视口尺寸
    const newWidth = viewport.width / newZoom;
    const newHeight = viewport.height / newZoom;

    // 计算新的视口位置（居中内容）
    const contentCenterX = minX + contentWidth / 2;
    const contentCenterY = minY + contentHeight / 2;
    const newX = contentCenterX - newWidth / 2;
    const newY = contentCenterY - newHeight / 2;

    return [
      new SetViewportAction(
        { x: newX, y: newY, width: newWidth, height: newHeight, zoom: newZoom },
        viewport
      ),
    ];
  },
};
