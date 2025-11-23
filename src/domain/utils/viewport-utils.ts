import type { Viewport as RFViewport } from "@xyflow/react";
import type { Viewport, EditorState } from "../mindmap-store.types";
import { SetViewportAction } from "../actions/set-viewport";

/**
 * 将 React Flow 视口转换为节点坐标系视口
 * @param rfViewport React Flow 视口 (屏幕坐标系)
 * @param containerWidth 容器宽度 (像素)
 * @param containerHeight 容器高度 (像素)
 */
export function rfViewportToNodeViewport(
  rfViewport: RFViewport,
  containerWidth: number,
  containerHeight: number
): Viewport {
  const { x: rfX, y: rfY, zoom } = rfViewport;
  return {
    x: -rfX / zoom,
    y: -rfY / zoom,
    width: containerWidth / zoom,
    height: containerHeight / zoom,
    zoom,
  };
}

/**
 * 将节点坐标系视口转换为 React Flow 视口
 * @param viewport 节点坐标系视口
 */
export function nodeViewportToRfViewport(viewport: Viewport): RFViewport {
  const { x, y, zoom } = viewport;
  return {
    x: -x * zoom,
    y: -y * zoom,
    zoom,
  };
}

/**
 * 检查节点是否在可视区域内，如果不在则返回调整视口的 Action
 *
 * 所有坐标都使用节点坐标系（pre-zoom），与节点的 x, y, width, height 一致
 */
export function ensureNodeVisibleAction(
  nodeId: string,
  state: EditorState
): SetViewportAction | null {
  const layout = state.layouts.get(nodeId);
  if (!layout) return null;

  const { x: vpX, y: vpY, width: vpWidth, height: vpHeight } = state.viewport;

  // 定义边距（视口的 15%）- 在节点坐标系中
  const paddingX = vpWidth * 0.15;
  const paddingY = vpHeight * 0.15;

  // 检查节点是否完全在可视区域内（含边距）
  // 所有坐标都在节点坐标系中，直接比较即可
  const isVisible =
    layout.x >= vpX + paddingX &&
    layout.y >= vpY + paddingY &&
    layout.x + layout.width <= vpX + vpWidth - paddingX &&
    layout.y + layout.height <= vpY + vpHeight - paddingY;

  if (isVisible) return null;

  // 计算新的视口位置，将节点居中显示
  // 新视口的左上角 = 节点中心 - 视口尺寸的一半
  const newX = layout.x + layout.width / 2 - vpWidth / 2;
  const newY = layout.y + layout.height / 2 - vpHeight / 2;

  return new SetViewportAction({ x: newX, y: newY }, state.viewport);
}

/**
 * 将视口居中到指定节点
 */
export function centerOnNodeAction(
  nodeId: string,
  state: EditorState
): SetViewportAction | null {
  const layout = state.layouts.get(nodeId);
  if (!layout) return null;

  const { width: vpWidth, height: vpHeight } = state.viewport;

  // 计算新的视口位置，将节点居中显示
  const newX = layout.x + layout.width / 2 - vpWidth / 2;
  const newY = layout.y + layout.height / 2 - vpHeight / 2;

  return new SetViewportAction({ x: newX, y: newY }, state.viewport);
}
