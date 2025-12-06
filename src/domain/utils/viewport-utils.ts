import type { Viewport as RFViewport } from "@xyflow/react";
import type { Viewport, EditorState } from "../mindmap-store.types";
import { SetViewportAction } from "../actions/ephemeral/set-viewport";

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
 * 确保节点在视口的可视区域内（最小移动策略）
 *
 * 所有坐标都使用节点坐标系（pre-zoom），与节点的 x, y, width, height 一致
 *
 * @param nodeId - 节点ID
 * @param state - 当前编辑器状态
 * @param padding - 边距比例 (0-1)，默认0.15
 *   - 0: 仅确保完全可见（策略B，用于图形点击）
 *   - 0.15: 确保在15%边距的安全区域内（策略A，用于键盘导航和节点操作）
 * @returns SetViewportAction 或 null（无需滚动）
 */
export function ensureNodeVisibleAction(
  nodeId: string,
  state: EditorState,
  padding: number = 0.15
): SetViewportAction | null {
  const layout = state.layouts.get(nodeId);
  if (!layout) return null;

  const { x: vpX, y: vpY, width: vpWidth, height: vpHeight } = state.viewport;

  // 1. 计算安全区域边界（节点坐标系）
  const safeLeft = vpX + vpWidth * padding;
  const safeRight = vpX + vpWidth * (1 - padding);
  const safeTop = vpY + vpHeight * padding;
  const safeBottom = vpY + vpHeight * (1 - padding);

  // 2. 节点边界（节点坐标系）
  const nodeLeft = layout.x;
  const nodeRight = layout.x + layout.width;
  const nodeTop = layout.y;
  const nodeBottom = layout.y + layout.height;

  // 3. 计算水平方向所需偏移（节点坐标系）
  let deltaX = 0;
  if (nodeRight < safeLeft) {
    // 节点在左侧安全区外，需要向左滚动（减小viewport.x）
    deltaX = safeLeft - nodeRight;
  } else if (nodeLeft > safeRight) {
    // 节点在右侧安全区外，需要向右滚动（增大viewport.x）
    deltaX = safeRight - nodeLeft;
  }

  // 4. 计算垂直方向所需偏移（节点坐标系）
  let deltaY = 0;
  if (nodeBottom < safeTop) {
    // 节点在上方安全区外，需要向上滚动（减小viewport.y）
    deltaY = safeTop - nodeBottom;
  } else if (nodeTop > safeBottom) {
    // 节点在下方安全区外，需要向下滚动（增大viewport.y）
    deltaY = safeBottom - nodeTop;
  }

  // 5. 如果无需滚动，返回null
  if (deltaX === 0 && deltaY === 0) {
    return null;
  }

  // 6. 计算新的视口位置（节点坐标系）
  const newX = vpX - deltaX;
  const newY = vpY - deltaY;

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
