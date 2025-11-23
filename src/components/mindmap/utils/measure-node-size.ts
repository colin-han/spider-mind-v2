import type { MindmapNode } from "@/lib/types";
import type { NodeSize } from "@/lib/utils/mindmap/mindmap-layout";

// ============================================================================
// 配置常量
// ============================================================================

/**
 * 默认节点尺寸（当测量失败时使用）
 */
const DEFAULT_NODE_SIZE: NodeSize = {
  width: 150,
  height: 48,
};

/**
 * 根节点额外宽度（根节点通常更宽）
 */
const ROOT_NODE_EXTRA_WIDTH = 50;

// ============================================================================
// 尺寸测量函数
// ============================================================================

/**
 * 测量节点的实际渲染尺寸
 *
 * 使用离屏渲染技术：
 * 1. 创建一个离屏的 DOM 容器
 * 2. 应用与实际节点相同的样式
 * 3. 渲染节点内容
 * 4. 测量实际尺寸
 * 5. 清理 DOM 元素
 *
 * @param node - 要测量的节点
 * @returns 节点尺寸（宽度和高度）
 */
export async function measureNodeSize(node: MindmapNode): Promise<NodeSize> {
  // 在服务端环境中返回默认尺寸
  if (typeof window === "undefined" || typeof document === "undefined") {
    console.warn(
      `[measureNodeSize] Cannot measure node in server environment, using default size`
    );
    return DEFAULT_NODE_SIZE;
  }

  try {
    // 1. 创建离屏容器
    const container = document.createElement("div");
    container.style.position = "absolute";
    container.style.left = "-9999px";
    container.style.top = "-9999px";
    container.style.visibility = "hidden";
    container.style.pointerEvents = "none";

    // 2. 创建节点元素
    const nodeElement = document.createElement("div");

    // 应用与 CustomMindNode 相同的基础样式
    nodeElement.className = "mind-node";
    Object.assign(nodeElement.style, {
      display: "flex",
      alignItems: "center",
      gap: "0.5rem", // gap-2
      minWidth: "150px",
      padding: "0.75rem 1rem", // py-3 px-4
      borderRadius: "0.5rem", // rounded-lg
      border: "2px solid",
      borderColor: "#e5e7eb", // border-gray-200
      backgroundColor: "#ffffff",
      fontSize: "0.875rem", // text-sm
      lineHeight: "1.25rem",
      whiteSpace: "nowrap",
    });

    // 根节点特殊样式
    const isRoot = !node.parent_short_id;
    if (isRoot) {
      Object.assign(nodeElement.style, {
        background: "linear-gradient(to bottom right, #9333ea, #7e22ce)", // from-purple-600 to-purple-700
        color: "#ffffff",
        borderColor: "#6b21a8", // border-purple-800
        fontWeight: "600", // font-semibold
      });
    }

    // 3. 创建标题元素
    const titleElement = document.createElement("span");
    titleElement.className = "title";
    titleElement.textContent = node.title || "Untitled";
    titleElement.style.flex = "1";
    titleElement.style.userSelect = "none";
    nodeElement.appendChild(titleElement);

    // 4. 添加 Note 图标空间（如果有 note）
    if (node.note) {
      const iconSpace = document.createElement("span");
      iconSpace.style.width = "1rem"; // w-4
      iconSpace.style.height = "1rem"; // h-4
      iconSpace.style.flexShrink = "0";
      nodeElement.appendChild(iconSpace);
    }

    // 5. 将元素添加到容器并挂载到 DOM
    container.appendChild(nodeElement);
    document.body.appendChild(container);

    // 6. 测量尺寸（使用 getBoundingClientRect 获取实际渲染尺寸）
    const rect = nodeElement.getBoundingClientRect();
    let { width, height } = rect;

    // 7. 清理 DOM
    document.body.removeChild(container);

    // 8. 确保最小尺寸
    width = Math.max(width, 150);
    height = Math.max(height, 40);

    // 9. 根节点额外宽度
    if (isRoot) {
      width += ROOT_NODE_EXTRA_WIDTH;
    }

    // 10. 四舍五入到整数（布局算法通常使用整数）
    width = Math.ceil(width);
    height = Math.ceil(height);

    console.log(
      `[measureNodeSize] Measured node ${node.short_id}:`,
      `${width}x${height}`,
      `(root: ${isRoot}, hasNote: ${!!node.note})`
    );

    return { width, height };
  } catch (error) {
    console.error(
      `[measureNodeSize] Failed to measure node ${node.short_id}:`,
      error
    );
    return DEFAULT_NODE_SIZE;
  }
}

/**
 * 批量测量多个节点的尺寸
 *
 * @param nodes - 要测量的节点数组
 * @returns 节点尺寸 Map（key 是 short_id）
 */
export async function batchMeasureNodeSizes(
  nodes: MindmapNode[]
): Promise<Map<string, NodeSize>> {
  const sizeMap = new Map<string, NodeSize>();

  // 并发测量所有节点（浏览器会批量处理 DOM 操作）
  const measurements = await Promise.all(
    nodes.map(async (node) => {
      const size = await measureNodeSize(node);
      return { nodeId: node.short_id, size };
    })
  );

  // 构建结果 Map
  for (const { nodeId, size } of measurements) {
    sizeMap.set(nodeId, size);
  }

  console.log(
    `[batchMeasureNodeSizes] Measured ${sizeMap.size} nodes successfully`
  );

  return sizeMap;
}

/**
 * 获取默认节点尺寸
 *
 * @returns 默认节点尺寸
 */
export function getDefaultNodeSize(): NodeSize {
  return { ...DEFAULT_NODE_SIZE };
}
