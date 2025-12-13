/**
 * 视图状态验证器单元测试
 */
import { validateViewState } from "../view-state-validator";
import type { ViewState } from "../view-state-manager";
import type { MindmapNode } from "@/lib/types";

describe("validateViewState", () => {
  // 创建测试节点树
  const createTestNodes = (): MindmapNode[] => [
    {
      id: "root-id",
      short_id: "root",
      parent_id: null,
      parent_short_id: null,
      mindmap_id: "test-mindmap",
      title: "Root",
      note: null,
      order_index: 0,
      created_at: "2025-01-01T00:00:00Z",
      updated_at: "2025-01-01T00:00:00Z",
    },
    {
      id: "child1-id",
      short_id: "child1",
      parent_id: "root-id",
      parent_short_id: "root",
      mindmap_id: "test-mindmap",
      title: "Child 1",
      note: null,
      order_index: 0,
      created_at: "2025-01-01T00:00:00Z",
      updated_at: "2025-01-01T00:00:00Z",
    },
    {
      id: "child2-id",
      short_id: "child2",
      parent_id: "child1-id",
      parent_short_id: "child1",
      mindmap_id: "test-mindmap",
      title: "Child 2",
      note: null,
      order_index: 0,
      created_at: "2025-01-01T00:00:00Z",
      updated_at: "2025-01-01T00:00:00Z",
    },
    {
      id: "child3-id",
      short_id: "child3",
      parent_id: "child2-id",
      parent_short_id: "child2",
      mindmap_id: "test-mindmap",
      title: "Child 3",
      note: null,
      order_index: 0,
      created_at: "2025-01-01T00:00:00Z",
      updated_at: "2025-01-01T00:00:00Z",
    },
  ];

  describe("基本验证", () => {
    it("应该验证并返回有效的视图状态", () => {
      const nodes = createTestNodes();
      const savedState: ViewState = {
        viewport: { x: 100, y: 200, zoom: 1.5 },
        collapsedNodes: ["child1"],
        currentNode: "root",
        lastUpdated: "2025-01-01T00:00:00Z",
        version: 1,
      };

      const validated = validateViewState(savedState, nodes, "root");

      expect(validated).not.toBeNull();
      expect(validated?.viewport.x).toBe(100);
      expect(validated?.viewport.y).toBe(200);
      expect(validated?.viewport.zoom).toBe(1.5);
      expect(validated?.collapsedNodes).toEqual(["child1"]);
      expect(validated?.currentNode).toBe("root");
    });

    it("应该移除不存在的折叠节点", () => {
      const nodes = createTestNodes();
      const savedState: ViewState = {
        viewport: { x: 0, y: 0, zoom: 1.0 },
        collapsedNodes: ["child1", "non-existent-node", "child2"],
        currentNode: "root",
        lastUpdated: "2025-01-01T00:00:00Z",
        version: 1,
      };

      const validated = validateViewState(savedState, nodes, "root");

      expect(validated).not.toBeNull();
      expect(validated?.collapsedNodes).toEqual(["child1", "child2"]);
      expect(validated?.collapsedNodes).not.toContain("non-existent-node");
    });

    it("应该限制 zoom 在有效范围内（0.1 - 2.0）", () => {
      const nodes = createTestNodes();

      // 测试 zoom 过小
      const stateTooSmall: ViewState = {
        viewport: { x: 0, y: 0, zoom: 0.05 },
        collapsedNodes: [],
        currentNode: "root",
        lastUpdated: "2025-01-01T00:00:00Z",
        version: 1,
      };

      const validatedSmall = validateViewState(stateTooSmall, nodes, "root");
      expect(validatedSmall?.viewport.zoom).toBe(0.1);

      // 测试 zoom 过大
      const stateTooBig: ViewState = {
        viewport: { x: 0, y: 0, zoom: 3.0 },
        collapsedNodes: [],
        currentNode: "root",
        lastUpdated: "2025-01-01T00:00:00Z",
        version: 1,
      };

      const validatedBig = validateViewState(stateTooBig, nodes, "root");
      expect(validatedBig?.viewport.zoom).toBe(2.0);
    });
  });

  describe("当前节点验证", () => {
    it("当当前节点不存在时应该使用根节点", () => {
      const nodes = createTestNodes();
      const savedState: ViewState = {
        viewport: { x: 0, y: 0, zoom: 1.0 },
        collapsedNodes: [],
        currentNode: "non-existent-node",
        lastUpdated: "2025-01-01T00:00:00Z",
        version: 1,
      };

      const validated = validateViewState(savedState, nodes, "root");

      expect(validated).not.toBeNull();
      expect(validated?.currentNode).toBe("root");
    });

    it("当当前节点被折叠时应该选择最近的可见祖先", () => {
      const nodes = createTestNodes();
      const savedState: ViewState = {
        viewport: { x: 0, y: 0, zoom: 1.0 },
        collapsedNodes: ["child1"], // child1 折叠了，child2 和 child3 不可见
        currentNode: "child2", // 尝试选中 child2
        lastUpdated: "2025-01-01T00:00:00Z",
        version: 1,
      };

      const validated = validateViewState(savedState, nodes, "root");

      expect(validated).not.toBeNull();
      // child2 的父节点 child1 被折叠了，应该选择 root
      expect(validated?.currentNode).toBe("root");
    });

    it("当当前节点的深层祖先被折叠时应该选择最近的可见祖先", () => {
      const nodes = createTestNodes();
      const savedState: ViewState = {
        viewport: { x: 0, y: 0, zoom: 1.0 },
        collapsedNodes: ["child1"], // child1 折叠了
        currentNode: "child3", // child3 的祖先 child1 被折叠
        lastUpdated: "2025-01-01T00:00:00Z",
        version: 1,
      };

      const validated = validateViewState(savedState, nodes, "root");

      expect(validated).not.toBeNull();
      // child3 的祖先 child1 被折叠了，应该选择 root
      expect(validated?.currentNode).toBe("root");
    });

    it("当当前节点自身被折叠时应该保持选中（自身折叠不影响可见性）", () => {
      const nodes = createTestNodes();
      const savedState: ViewState = {
        viewport: { x: 0, y: 0, zoom: 1.0 },
        collapsedNodes: ["child1"], // child1 自己被折叠
        currentNode: "child1", // 但是选中的是 child1 自己
        lastUpdated: "2025-01-01T00:00:00Z",
        version: 1,
      };

      const validated = validateViewState(savedState, nodes, "root");

      expect(validated).not.toBeNull();
      // child1 自己被折叠不影响自己的可见性
      expect(validated?.currentNode).toBe("child1");
    });

    it("当有多个祖先被折叠时应该选择最近的可见祖先", () => {
      // 创建更深的树: root -> a -> b -> c -> d
      const deepNodes: MindmapNode[] = [
        {
          id: "root-id",
          short_id: "root",
          parent_id: null,
          parent_short_id: null,
          mindmap_id: "test-mindmap",
          title: "Root",
          note: null,
          order_index: 0,
          created_at: "2025-01-01T00:00:00Z",
          updated_at: "2025-01-01T00:00:00Z",
        },
        {
          id: "a-id",
          short_id: "a",
          parent_id: "root-id",
          parent_short_id: "root",
          mindmap_id: "test-mindmap",
          title: "A",
          note: null,
          order_index: 0,
          created_at: "2025-01-01T00:00:00Z",
          updated_at: "2025-01-01T00:00:00Z",
        },
        {
          id: "b-id",
          short_id: "b",
          parent_id: "a-id",
          parent_short_id: "a",
          mindmap_id: "test-mindmap",
          title: "B",
          note: null,
          order_index: 0,
          created_at: "2025-01-01T00:00:00Z",
          updated_at: "2025-01-01T00:00:00Z",
        },
        {
          id: "c-id",
          short_id: "c",
          parent_id: "b-id",
          parent_short_id: "b",
          mindmap_id: "test-mindmap",
          title: "C",
          note: null,
          order_index: 0,
          created_at: "2025-01-01T00:00:00Z",
          updated_at: "2025-01-01T00:00:00Z",
        },
        {
          id: "d-id",
          short_id: "d",
          parent_id: "c-id",
          parent_short_id: "c",
          mindmap_id: "test-mindmap",
          title: "D",
          note: null,
          order_index: 0,
          created_at: "2025-01-01T00:00:00Z",
          updated_at: "2025-01-01T00:00:00Z",
        },
      ];

      const savedState: ViewState = {
        viewport: { x: 0, y: 0, zoom: 1.0 },
        collapsedNodes: ["b"], // b 被折叠，c 和 d 不可见
        currentNode: "d", // 尝试选中 d
        lastUpdated: "2025-01-01T00:00:00Z",
        version: 1,
      };

      const validated = validateViewState(savedState, deepNodes, "root");

      expect(validated).not.toBeNull();
      // d 的祖先 b 被折叠，应该选择 a（最近的可见祖先）
      expect(validated?.currentNode).toBe("a");
    });
  });

  describe("错误处理", () => {
    it("当验证过程出错时应该返回 null", () => {
      const nodes = createTestNodes();
      const invalidState = null as unknown as ViewState;

      const validated = validateViewState(invalidState, nodes, "root");

      expect(validated).toBeNull();
    });

    it("应该能够处理空节点数组", () => {
      const savedState: ViewState = {
        viewport: { x: 0, y: 0, zoom: 1.0 },
        collapsedNodes: ["child1"],
        currentNode: "root",
        lastUpdated: "2025-01-01T00:00:00Z",
        version: 1,
      };

      const validated = validateViewState(savedState, [], "root");

      expect(validated).not.toBeNull();
      expect(validated?.collapsedNodes).toEqual([]);
      expect(validated?.currentNode).toBe("root");
    });
  });
});
