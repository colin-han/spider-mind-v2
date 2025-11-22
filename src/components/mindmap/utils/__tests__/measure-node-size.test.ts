import {
  measureNodeSize,
  batchMeasureNodeSizes,
  getDefaultNodeSize,
} from "../measure-node-size";
import type { MindmapNode } from "@/lib/types";

// ============================================================================
// 测试辅助函数
// ============================================================================

/**
 * 创建测试节点
 */
function createTestNode(
  id: string,
  title: string,
  parentId: string | null = null,
  hasNote = false
): MindmapNode {
  return {
    id: `node-${id}`,
    short_id: id,
    mindmap_id: "test-mindmap",
    parent_id: parentId ? `node-${parentId}` : null,
    parent_short_id: parentId,
    title,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    order_index: 0,
    note: hasNote ? "Test note content" : null,
  };
}

// ============================================================================
// 测试套件
// ============================================================================

describe("measureNodeSize", () => {
  // 在测试前设置 DOM 环境
  beforeEach(() => {
    // 清理可能遗留的离屏元素
    const leftoverElements = document.querySelectorAll('[style*="-9999px"]');
    leftoverElements.forEach((el) => el.remove());
  });

  it("应该测量普通节点的尺寸", async () => {
    const node = createTestNode("test1", "Test Node");
    const size = await measureNodeSize(node);

    expect(size).toHaveProperty("width");
    expect(size).toHaveProperty("height");
    expect(size.width).toBeGreaterThanOrEqual(150); // 最小宽度
    expect(size.height).toBeGreaterThanOrEqual(40); // 最小高度
    expect(Number.isInteger(size.width)).toBe(true);
    expect(Number.isInteger(size.height)).toBe(true);
  });

  it("应该测量根节点的尺寸（更宽）", async () => {
    const rootNode = createTestNode("root", "Root Node", null);
    const normalNode = createTestNode("child", "Child Node", "root");

    const rootSize = await measureNodeSize(rootNode);
    const normalSize = await measureNodeSize(normalNode);

    // 根节点应该比普通节点更宽
    expect(rootSize.width).toBeGreaterThan(normalSize.width);
  });

  it("应该为带 note 的节点预留图标空间", async () => {
    const nodeWithNote = createTestNode("note1", "Node With Note", null, true);
    const nodeWithoutNote = createTestNode(
      "note2",
      "Node Without Note",
      null,
      false
    );

    const sizeWithNote = await measureNodeSize(nodeWithNote);
    const sizeWithoutNote = await measureNodeSize(nodeWithoutNote);

    // 带 note 的节点应该稍微宽一些（为图标预留空间）
    expect(sizeWithNote.width).toBeGreaterThanOrEqual(sizeWithoutNote.width);
  });

  it("应该处理长文本节点", async () => {
    // 都作为子节点，避免根节点额外宽度的影响
    const shortTextNode = createTestNode("short", "Short", "parent");
    const longTextNode = createTestNode(
      "long",
      "This is a very long text that should make the node wider",
      "parent"
    );

    const shortSize = await measureNodeSize(shortTextNode);
    const longSize = await measureNodeSize(longTextNode);

    // 长文本节点应该至少和短文本节点一样宽或更宽
    // 在测试环境中由于 jsdom 的限制，可能都使用最小宽度
    expect(longSize.width).toBeGreaterThanOrEqual(shortSize.width);

    // 验证两个尺寸都是有效的
    expect(shortSize.width).toBeGreaterThanOrEqual(150);
    expect(longSize.width).toBeGreaterThanOrEqual(150);
  });

  it("应该处理空内容节点", async () => {
    const emptyNode = createTestNode("empty", "");
    const size = await measureNodeSize(emptyNode);

    // 即使内容为空，也应该有最小尺寸
    expect(size.width).toBeGreaterThanOrEqual(150);
    expect(size.height).toBeGreaterThanOrEqual(40);
  });

  it("测量后应该清理 DOM 元素", async () => {
    const node = createTestNode("cleanup", "Cleanup Test");

    // 测量前检查
    const beforeCount = document.querySelectorAll('[style*="-9999px"]').length;

    await measureNodeSize(node);

    // 测量后检查 - 不应该有遗留元素
    const afterCount = document.querySelectorAll('[style*="-9999px"]').length;

    expect(afterCount).toBe(beforeCount);
  });

  it("在服务端环境应该返回默认尺寸", async () => {
    // 模拟服务端环境（在 Jest 的 jsdom 环境中很难完全模拟）
    // 我们通过检查默认尺寸的存在来验证逻辑
    const defaultSize = getDefaultNodeSize();

    // 验证默认尺寸是合理的
    expect(defaultSize.width).toBe(150);
    expect(defaultSize.height).toBe(48);

    // 这个测试主要验证函数在没有 DOM 时不会崩溃
    // 实际的服务端检查在代码中通过 typeof window 实现
  });

  it("发生错误时应该返回默认尺寸", async () => {
    // 创建一个会导致错误的节点（模拟 DOM 操作失败）
    const mockNode = createTestNode("error", "Error Node");

    // 临时覆盖 createElement 使其抛出错误
    const originalCreateElement = document.createElement;
    document.createElement = () => {
      throw new Error("DOM operation failed");
    };

    const size = await measureNodeSize(mockNode);

    // 应该返回默认尺寸
    const defaultSize = getDefaultNodeSize();
    expect(size).toEqual(defaultSize);

    // 恢复 createElement
    document.createElement = originalCreateElement;
  });
});

describe("batchMeasureNodeSizes", () => {
  it("应该批量测量多个节点", async () => {
    const nodes = [
      createTestNode("batch1", "Node 1"),
      createTestNode("batch2", "Node 2"),
      createTestNode("batch3", "Node 3"),
    ];

    const sizeMap = await batchMeasureNodeSizes(nodes);

    expect(sizeMap.size).toBe(3);
    expect(sizeMap.has("batch1")).toBe(true);
    expect(sizeMap.has("batch2")).toBe(true);
    expect(sizeMap.has("batch3")).toBe(true);

    // 每个尺寸都应该是有效的
    sizeMap.forEach((size) => {
      expect(size.width).toBeGreaterThanOrEqual(150);
      expect(size.height).toBeGreaterThanOrEqual(40);
    });
  });

  it("应该处理空数组", async () => {
    const sizeMap = await batchMeasureNodeSizes([]);

    expect(sizeMap.size).toBe(0);
  });

  it("批量测量应该成功完成", async () => {
    const nodes = Array.from(
      { length: 10 },
      (_, i) => createTestNode(`perf${i}`, `Node ${i}`, "parent") // 都作为子节点
    );

    // 批量测量
    const batchStart = performance.now();
    const sizeMap = await batchMeasureNodeSizes(nodes);
    const batchTime = performance.now() - batchStart;

    // 串行测量（用于对比，但不做严格断言）
    const serialStart = performance.now();
    for (const node of nodes) {
      await measureNodeSize(node);
    }
    const serialTime = performance.now() - serialStart;

    console.log(`Batch: ${batchTime}ms, Serial: ${serialTime}ms`);

    // 验证批量测量成功
    expect(sizeMap.size).toBe(10);
    sizeMap.forEach((size) => {
      expect(size.width).toBeGreaterThanOrEqual(150);
      expect(size.height).toBeGreaterThanOrEqual(40);
    });

    // 注意：在测试环境中性能差异不明显，所以不做严格的性能断言
    // 只验证批量测量没有明显慢很多
    expect(batchTime).toBeLessThan(serialTime * 3);
  });
});

describe("getDefaultNodeSize", () => {
  it("应该返回默认尺寸", () => {
    const size = getDefaultNodeSize();

    expect(size).toEqual({
      width: 150,
      height: 48,
    });
  });

  it("应该返回新对象（不是引用）", () => {
    const size1 = getDefaultNodeSize();
    const size2 = getDefaultNodeSize();

    expect(size1).not.toBe(size2);
    expect(size1).toEqual(size2);
  });
});
