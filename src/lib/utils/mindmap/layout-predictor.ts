import type { MindmapNode } from "@/lib/types";
import type { NodeLayout } from "@/domain/mindmap-store.types";
import type { NodeSize } from "./mindmap-layout";

// ============================================================================
// 样式常量（从 measure-node-size.ts 提取）
// ============================================================================

/**
 * 节点样式常量
 * 这些值必须与 CustomMindNode 组件的实际样式保持一致
 */
const STYLE_CONSTANTS = {
  // 最小尺寸
  minWidth: 150,
  minHeight: 40,

  // 内边距 (padding: 0.75rem 1rem)
  padding: {
    horizontal: 32, // 1rem * 2 (左右各 1rem，1rem = 16px)
    vertical: 24, // 0.75rem * 2 (上下各 0.75rem)
  },

  // 字体
  fontSize: 14, // 0.875rem (14px)
  lineHeight: 20, // 1.25rem (20px)

  // 间距和图标
  gap: 8, // 0.5rem (gap-2)
  iconWidth: 16, // 1rem (w-4)

  // 边框
  border: 4, // 2px * 2

  // 根节点额外宽度
  rootExtraWidth: 50,
} as const;

/**
 * Dagre 布局间距常量
 * 这些值必须与 DagreLayoutEngine 的配置保持一致
 */
const DAGRE_CONSTANTS = {
  nodesep: 100, // 水平间距
  ranksep: 50, // 垂直间距
} as const;

// ============================================================================
// 字体度量校准
// ============================================================================

/**
 * 校准后的字体度量数据
 */
let calibratedMetrics: {
  avgCharWidth: number;
  chineseCharWidth: number;
  englishCharWidth: number;
} | null = null;

/**
 * 校准字体度量
 *
 * 在应用启动时测量真实的字体宽度，提高预测精度
 */
export function calibrateFontMetrics(): void {
  if (typeof window === "undefined" || typeof document === "undefined") {
    return;
  }

  try {
    // 测试中文字符
    const chineseWidth = measureText("测试", STYLE_CONSTANTS.fontSize);
    const chineseCharWidth = chineseWidth / 2;

    // 测试英文字符
    const englishWidth = measureText("Test", STYLE_CONSTANTS.fontSize);
    const englishCharWidth = englishWidth / 4;

    // 测试混合文本
    const mixedWidth = measureText("测试Test123", STYLE_CONSTANTS.fontSize);
    const avgCharWidth = mixedWidth / 9;

    calibratedMetrics = {
      avgCharWidth,
      chineseCharWidth,
      englishCharWidth,
    };

    console.log(
      "[LayoutPredictor] Font metrics calibrated:",
      calibratedMetrics
    );
  } catch (error) {
    console.error("[LayoutPredictor] Failed to calibrate font metrics:", error);
  }
}

/**
 * 测量文本宽度
 */
function measureText(text: string, fontSize: number): number {
  const container = document.createElement("div");
  container.style.cssText = `
    position: absolute;
    left: -9999px;
    top: -9999px;
    visibility: hidden;
    font-size: ${fontSize}px;
    line-height: ${STYLE_CONSTANTS.lineHeight}px;
    white-space: nowrap;
  `;
  container.textContent = text;
  document.body.appendChild(container);

  const width = container.getBoundingClientRect().width;
  document.body.removeChild(container);

  return width;
}

// ============================================================================
// 尺寸预测
// ============================================================================

/**
 * 预测节点尺寸
 *
 * @param node - 要预测的节点
 * @returns 预测的节点尺寸
 */
export function predictNodeSize(node: MindmapNode): NodeSize {
  const isRoot = !node.parent_short_id;
  const hasNote = !!node.note;
  const title = node.title || "Untitled";

  // 1. 估算文本宽度
  const textWidth = estimateTextWidth(title);

  // 2. 计算总宽度
  let width =
    textWidth + STYLE_CONSTANTS.padding.horizontal + STYLE_CONSTANTS.border;

  // 添加 note 图标空间
  if (hasNote) {
    width += STYLE_CONSTANTS.iconWidth + STYLE_CONSTANTS.gap;
  }

  // 根节点额外宽度
  if (isRoot) {
    width += STYLE_CONSTANTS.rootExtraWidth;
  }

  // 保守预测：宽度增加 10% 冗余（宁可偏大）
  width = Math.ceil(width * 1.1);

  // 应用最小宽度
  width = Math.max(width, STYLE_CONSTANTS.minWidth);

  // 3. 高度（单行文本高度固定）
  const height = Math.max(
    STYLE_CONSTANTS.lineHeight +
      STYLE_CONSTANTS.padding.vertical +
      STYLE_CONSTANTS.border,
    STYLE_CONSTANTS.minHeight
  );

  return { width, height };
}

/**
 * 估算文本宽度
 *
 * @param text - 文本内容
 * @returns 估算的宽度（像素）
 */
function estimateTextWidth(text: string): number {
  // 优先使用校准后的度量
  if (calibratedMetrics) {
    return estimateTextWidthCalibrated(text);
  }

  // 回退到固定估算
  return estimateTextWidthFixed(text);
}

/**
 * 使用校准数据估算文本宽度
 */
function estimateTextWidthCalibrated(text: string): number {
  if (!calibratedMetrics) {
    throw new Error("Calibrated metrics not available");
  }

  let chineseCount = 0;
  let otherCount = 0;

  for (const char of text) {
    const code = char.charCodeAt(0);
    // Unicode 范围：中文字符 (U+4E00 到 U+9FFF)
    if (code >= 0x4e00 && code <= 0x9fff) {
      chineseCount++;
    } else {
      otherCount++;
    }
  }

  return (
    chineseCount * calibratedMetrics.chineseCharWidth +
    otherCount * calibratedMetrics.englishCharWidth
  );
}

/**
 * 使用固定值估算文本宽度（回退方案）
 */
function estimateTextWidthFixed(text: string): number {
  const CHINESE_CHAR_WIDTH = 14;
  const ENGLISH_CHAR_WIDTH = 8;

  let chineseCount = 0;
  let otherCount = 0;

  for (const char of text) {
    const code = char.charCodeAt(0);
    if (code >= 0x4e00 && code <= 0x9fff) {
      chineseCount++;
    } else {
      otherCount++;
    }
  }

  return chineseCount * CHINESE_CHAR_WIDTH + otherCount * ENGLISH_CHAR_WIDTH;
}

// ============================================================================
// 位置预测
// ============================================================================

/**
 * 预测新增节点的位置
 *
 * @param newNode - 新增的节点
 * @param _predictedSize - 预测的节点尺寸（暂未使用，保留用于未来扩展）
 * @param currentLayouts - 当前的布局缓存
 * @param nodes - 所有节点
 * @returns 预测的位置坐标
 */
export function predictNodePosition(
  newNode: MindmapNode,
  _predictedSize: NodeSize,
  currentLayouts: Map<string, NodeLayout>,
  nodes: Map<string, MindmapNode>
): { x: number; y: number } {
  // 1. 根节点
  if (!newNode.parent_short_id) {
    return { x: 50, y: 50 };
  }

  // 2. 找到父节点
  const parent = nodes.get(newNode.parent_short_id);
  if (!parent) {
    return { x: 200, y: 100 };
  }

  const parentLayout = currentLayouts.get(parent.short_id);
  if (!parentLayout) {
    return { x: 200, y: 100 };
  }

  // 3. 获取所有兄弟节点（包括新节点）
  const siblings = Array.from(nodes.values())
    .filter((n) => n.parent_short_id === parent.short_id)
    .sort((a, b) => a.order_index - b.order_index);

  const newNodeIndex = siblings.findIndex(
    (n) => n.short_id === newNode.short_id
  );

  // 4. 计算水平位置（Dagre 的 LR 布局）
  const x = parentLayout.x + parentLayout.width + DAGRE_CONSTANTS.nodesep;

  // 5. 计算垂直位置
  let y: number;

  if (newNodeIndex === 0) {
    // 第一个子节点：与父节点垂直对齐
    y = parentLayout.y;
  } else {
    // 非第一个子节点：在上一个兄弟节点下方
    const prevSibling = siblings[newNodeIndex - 1];
    if (!prevSibling) {
      // 理论上不会发生，但为了类型安全
      y = parentLayout.y;
    } else {
      const prevLayout = currentLayouts.get(prevSibling.short_id);

      if (prevLayout) {
        y = prevLayout.y + prevLayout.height + DAGRE_CONSTANTS.ranksep;
      } else {
        // 上一个兄弟布局未知，使用估算
        y = parentLayout.y + newNodeIndex * 70;
      }
    }
  }

  return { x, y };
}

/**
 * 为新节点生成预测布局
 *
 * @param newNode - 新增的节点
 * @param currentLayouts - 当前的布局缓存
 * @param nodes - 所有节点
 * @returns 预测的完整布局
 */
export function predictNewNodeLayout(
  newNode: MindmapNode,
  currentLayouts: Map<string, NodeLayout>,
  nodes: Map<string, MindmapNode>
): NodeLayout {
  // 1. 预测尺寸
  const size = predictNodeSize(newNode);

  // 2. 预测位置
  const position = predictNodePosition(newNode, size, currentLayouts, nodes);

  return {
    id: newNode.short_id,
    x: position.x,
    y: position.y,
    width: size.width,
    height: size.height,
  };
}

// ============================================================================
// 编辑节点尺寸预测
// ============================================================================

/**
 * 预测编辑后的节点尺寸（用于实时编辑）
 *
 * @param node - 正在编辑的节点
 * @param newTitle - 新的标题文本
 * @returns 预测的节点尺寸
 */
export function predictEditedNodeSize(
  node: MindmapNode,
  newTitle: string
): NodeSize {
  const virtualNode = { ...node, title: newTitle };
  return predictNodeSize(virtualNode);
}

/**
 * 增量更新布局（只重算受影响的节点）
 *
 * @param editedNodeId - 被编辑的节点ID
 * @param newSize - 新的尺寸
 * @param currentLayouts - 当前的布局缓存
 * @param nodes - 所有节点
 * @returns 更新后的布局
 */
export function updateLayoutForEditedNode(
  editedNodeId: string,
  newSize: NodeSize,
  currentLayouts: Map<string, NodeLayout>,
  nodes: Map<string, MindmapNode>
): Map<string, NodeLayout> {
  const editedLayout = currentLayouts.get(editedNodeId);
  if (!editedLayout) return currentLayouts;

  // 1. 更新编辑节点的尺寸（位置不变）
  const newLayouts = new Map(currentLayouts);
  newLayouts.set(editedNodeId, {
    ...editedLayout,
    width: newSize.width,
    height: newSize.height,
  });

  // 2. 找到所有兄弟节点
  const editedNode = nodes.get(editedNodeId);
  if (!editedNode) return newLayouts;

  const siblings = Array.from(nodes.values())
    .filter((n) => n.parent_short_id === editedNode.parent_short_id)
    .sort((a, b) => a.order_index - b.order_index);

  const editedIndex = siblings.findIndex((n) => n.short_id === editedNodeId);

  // 3. 调整后续兄弟节点的 y 坐标
  const heightDiff = newSize.height - editedLayout.height;
  if (heightDiff !== 0) {
    for (let i = editedIndex + 1; i < siblings.length; i++) {
      const sibling = siblings[i];
      if (sibling) {
        const siblingLayout = newLayouts.get(sibling.short_id);
        if (siblingLayout) {
          newLayouts.set(sibling.short_id, {
            ...siblingLayout,
            y: siblingLayout.y + heightDiff,
          });
        }
      }
    }
  }

  return newLayouts;
}
