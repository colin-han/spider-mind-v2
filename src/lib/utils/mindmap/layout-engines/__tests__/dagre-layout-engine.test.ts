import { DagreLayoutEngine } from "../dagre-layout-engine";
import type { MindmapNode } from "@/lib/types";
import type { NodeSize } from "../../mindmap-layout";

// ============================================================================
// 测试数据构造辅助函数
// ============================================================================

/**
 * 创建测试节点
 */
function createTestNode(
  id: string,
  parentId: string | null = null
): MindmapNode {
  return {
    id: `node-${id}`,
    short_id: id,
    mindmap_id: "test-mindmap",
    parent_id: parentId ? `node-${parentId}` : null,
    parent_short_id: parentId,
    title: `Node ${id}`,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    order_index: 0,
    note: null,
  };
}

/**
 * 创建简单的树结构
 *   root
 *   ├── child1
 *   │   ├── child1-1
 *   │   └── child1-2
 *   └── child2
 */
function createSimpleTree(): Map<string, MindmapNode> {
  const nodes = new Map<string, MindmapNode>();
  nodes.set("root", createTestNode("root"));
  nodes.set("child1", createTestNode("child1", "root"));
  nodes.set("child1-1", createTestNode("child1-1", "child1"));
  nodes.set("child1-2", createTestNode("child1-2", "child1"));
  nodes.set("child2", createTestNode("child2", "root"));
  return nodes;
}

/**
 * 创建统一尺寸缓存
 */
function createUniformSizeCache(
  nodes: Map<string, MindmapNode>,
  width = 100,
  height = 40
): Map<string, NodeSize> {
  const cache = new Map<string, NodeSize>();
  for (const id of nodes.keys()) {
    cache.set(id, { width, height });
  }
  return cache;
}

// ============================================================================
// 测试套件
// ============================================================================

describe("DagreLayoutEngine", () => {
  describe("layout()", () => {
    it("应该为所有节点计算布局", () => {
      const engine = new DagreLayoutEngine();
      const nodes = createSimpleTree();
      const sizeCache = createUniformSizeCache(nodes);
      const collapsedNodes = new Set<string>();

      const layouts = engine.layout(nodes, sizeCache, collapsedNodes);

      // 应该返回所有节点的布局
      expect(layouts.size).toBe(5);
      expect(layouts.has("root")).toBe(true);
      expect(layouts.has("child1")).toBe(true);
      expect(layouts.has("child1-1")).toBe(true);
      expect(layouts.has("child1-2")).toBe(true);
      expect(layouts.has("child2")).toBe(true);
    });

    it("布局结果应该包含正确的字段", () => {
      const engine = new DagreLayoutEngine();
      const nodes = createSimpleTree();
      const sizeCache = createUniformSizeCache(nodes);
      const collapsedNodes = new Set<string>();

      const layouts = engine.layout(nodes, sizeCache, collapsedNodes);
      const rootLayout = layouts.get("root");

      expect(rootLayout).toBeDefined();
      expect(rootLayout).toHaveProperty("id");
      expect(rootLayout).toHaveProperty("x");
      expect(rootLayout).toHaveProperty("y");
      expect(rootLayout).toHaveProperty("width");
      expect(rootLayout).toHaveProperty("height");
      expect(typeof rootLayout!.x).toBe("number");
      expect(typeof rootLayout!.y).toBe("number");
    });

    it("应该使用缓存的尺寸", () => {
      const engine = new DagreLayoutEngine();
      const nodes = createSimpleTree();
      const sizeCache = createUniformSizeCache(nodes, 200, 80);
      const collapsedNodes = new Set<string>();

      const layouts = engine.layout(nodes, sizeCache, collapsedNodes);
      const rootLayout = layouts.get("root");

      expect(rootLayout?.width).toBe(200);
      expect(rootLayout?.height).toBe(80);
    });

    it("应该过滤折叠节点的子节点", () => {
      const engine = new DagreLayoutEngine();
      const nodes = createSimpleTree();
      const sizeCache = createUniformSizeCache(nodes);
      const collapsedNodes = new Set<string>(["child1"]); // 折叠 child1

      const layouts = engine.layout(nodes, sizeCache, collapsedNodes);

      // child1 应该可见，但它的子节点不可见
      expect(layouts.size).toBe(3);
      expect(layouts.has("root")).toBe(true);
      expect(layouts.has("child1")).toBe(true);
      expect(layouts.has("child2")).toBe(true);
      expect(layouts.has("child1-1")).toBe(false);
      expect(layouts.has("child1-2")).toBe(false);
    });

    it("应该过滤多层折叠节点的所有后代", () => {
      const engine = new DagreLayoutEngine();
      const nodes = createSimpleTree();
      const sizeCache = createUniformSizeCache(nodes);
      const collapsedNodes = new Set<string>(["root"]); // 折叠根节点

      const layouts = engine.layout(nodes, sizeCache, collapsedNodes);

      // 只有根节点可见
      expect(layouts.size).toBe(1);
      expect(layouts.has("root")).toBe(true);
      expect(layouts.has("child1")).toBe(false);
      expect(layouts.has("child2")).toBe(false);
      expect(layouts.has("child1-1")).toBe(false);
      expect(layouts.has("child1-2")).toBe(false);
    });

    it("应该处理空节点集合", () => {
      const engine = new DagreLayoutEngine();
      const nodes = new Map<string, MindmapNode>();
      const sizeCache = new Map<string, NodeSize>();
      const collapsedNodes = new Set<string>();

      const layouts = engine.layout(nodes, sizeCache, collapsedNodes);

      expect(layouts.size).toBe(0);
    });

    it("应该为没有尺寸缓存的节点使用默认尺寸", () => {
      const engine = new DagreLayoutEngine();
      const nodes = createSimpleTree();
      const sizeCache = new Map<string, NodeSize>(); // 空缓存
      const collapsedNodes = new Set<string>();

      const layouts = engine.layout(nodes, sizeCache, collapsedNodes);

      // 应该仍然能够计算布局（使用默认尺寸）
      expect(layouts.size).toBe(5);
      const rootLayout = layouts.get("root");
      expect(rootLayout?.width).toBe(100); // 默认宽度
      expect(rootLayout?.height).toBe(40); // 默认高度
    });
  });

  describe("getDropIndicatorLayout()", () => {
    it("应该在节点上方命中时返回 above indicator", () => {
      const engine = new DagreLayoutEngine();
      const nodes = createSimpleTree();
      const sizeCache = createUniformSizeCache(nodes);
      const collapsedNodes = new Set<string>();

      const layouts = engine.layout(nodes, sizeCache, collapsedNodes);
      const rootLayout = layouts.get("root")!;

      // 在根节点上方点击
      const indicator = engine.getDropIndicatorLayout(
        rootLayout.x + 50,
        rootLayout.y - 10,
        layouts
      );

      expect(indicator).not.toBeNull();
      expect(indicator?.id).toBe("drop-indicator");
      expect(indicator?.x).toBe(rootLayout.x);
      expect(indicator?.width).toBe(rootLayout.width);
      expect(indicator?.height).toBe(4);
    });

    it("应该在节点下方命中时返回 below indicator", () => {
      const engine = new DagreLayoutEngine();
      const nodes = createSimpleTree();
      const sizeCache = createUniformSizeCache(nodes);
      const collapsedNodes = new Set<string>();

      const layouts = engine.layout(nodes, sizeCache, collapsedNodes);
      const rootLayout = layouts.get("root")!;

      // 在根节点下方点击
      const indicator = engine.getDropIndicatorLayout(
        rootLayout.x + 50,
        rootLayout.y + rootLayout.height + 10,
        layouts
      );

      expect(indicator).not.toBeNull();
      expect(indicator?.id).toBe("drop-indicator");
    });

    it("应该在节点中间命中时返回 child indicator", () => {
      const engine = new DagreLayoutEngine();
      const nodes = createSimpleTree();
      const sizeCache = createUniformSizeCache(nodes);
      const collapsedNodes = new Set<string>();

      const layouts = engine.layout(nodes, sizeCache, collapsedNodes);
      const rootLayout = layouts.get("root")!;

      // 在根节点中间点击
      const indicator = engine.getDropIndicatorLayout(
        rootLayout.x + 50,
        rootLayout.y + rootLayout.height / 2,
        layouts
      );

      expect(indicator).not.toBeNull();
      expect(indicator?.id).toBe("drop-indicator");
    });

    it("应该在没有命中任何节点时返回 null", () => {
      const engine = new DagreLayoutEngine();
      const nodes = createSimpleTree();
      const sizeCache = createUniformSizeCache(nodes);
      const collapsedNodes = new Set<string>();

      const layouts = engine.layout(nodes, sizeCache, collapsedNodes);

      // 在远离所有节点的位置点击
      const indicator = engine.getDropIndicatorLayout(-1000, -1000, layouts);

      expect(indicator).toBeNull();
    });

    it("应该处理空布局", () => {
      const engine = new DagreLayoutEngine();
      const layouts = new Map();

      const indicator = engine.getDropIndicatorLayout(100, 100, layouts);

      expect(indicator).toBeNull();
    });
  });

  describe("分层布局验证", () => {
    it("子节点应该在父节点右侧", () => {
      const engine = new DagreLayoutEngine();
      const nodes = createSimpleTree();
      const sizeCache = createUniformSizeCache(nodes);
      const collapsedNodes = new Set<string>();

      const layouts = engine.layout(nodes, sizeCache, collapsedNodes);

      const rootLayout = layouts.get("root")!;
      const child1Layout = layouts.get("child1")!;
      const child2Layout = layouts.get("child2")!;

      // 子节点的 x 坐标应该大于父节点（水平布局）
      expect(child1Layout.x).toBeGreaterThan(rootLayout.x);
      expect(child2Layout.x).toBeGreaterThan(rootLayout.x);
    });

    it("孙节点应该在子节点右侧", () => {
      const engine = new DagreLayoutEngine();
      const nodes = createSimpleTree();
      const sizeCache = createUniformSizeCache(nodes);
      const collapsedNodes = new Set<string>();

      const layouts = engine.layout(nodes, sizeCache, collapsedNodes);

      const child1Layout = layouts.get("child1")!;
      const child1_1Layout = layouts.get("child1-1")!;
      const child1_2Layout = layouts.get("child1-2")!;

      // 孙节点的 x 坐标应该大于子节点（水平布局）
      expect(child1_1Layout.x).toBeGreaterThan(child1Layout.x);
      expect(child1_2Layout.x).toBeGreaterThan(child1Layout.x);
    });
  });
});
