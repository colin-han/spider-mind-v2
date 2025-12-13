/**
 * ViewStateManager 单元测试
 */
import { ViewStateManager, ViewState } from "../view-state-manager";

// 模拟 localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};

  return {
    getItem: (key: string): string | null => {
      return store[key] || null;
    },
    setItem: (key: string, value: string): void => {
      store[key] = value;
    },
    removeItem: (key: string): void => {
      delete store[key];
    },
    clear: (): void => {
      store = {};
    },
  };
})();

// 在测试前设置 localStorage mock
Object.defineProperty(global, "localStorage", {
  value: localStorageMock,
});

describe("ViewStateManager", () => {
  beforeEach(() => {
    // 每个测试前清空 localStorage
    localStorageMock.clear();
  });

  describe("save() 和 load()", () => {
    it("应该能够保存和加载完整的视图状态", () => {
      const mindmapId = "test-mindmap-1";
      const state: Partial<ViewState> = {
        viewport: { x: 100, y: 200, zoom: 1.5 },
        collapsedNodes: ["node1", "node2"],
        currentNode: "node3",
      };

      ViewStateManager.save(mindmapId, state);
      const loaded = ViewStateManager.load(mindmapId);

      expect(loaded).toBeDefined();
      expect(loaded?.viewport.x).toBe(100);
      expect(loaded?.viewport.y).toBe(200);
      expect(loaded?.viewport.zoom).toBe(1.5);
      expect(loaded?.collapsedNodes).toEqual(["node1", "node2"]);
      expect(loaded?.currentNode).toBe("node3");
      expect(loaded?.version).toBe(1);
      expect(loaded?.lastUpdated).toBeDefined();
    });

    it("应该能够保存部分视图状态（只保存 viewport）", () => {
      const mindmapId = "test-mindmap-2";
      const state: Partial<ViewState> = {
        viewport: { x: 50, y: 100, zoom: 1.2 },
      };

      ViewStateManager.save(mindmapId, state);
      const loaded = ViewStateManager.load(mindmapId);

      expect(loaded).toBeDefined();
      expect(loaded?.viewport.x).toBe(50);
      expect(loaded?.viewport.y).toBe(100);
      expect(loaded?.viewport.zoom).toBe(1.2);
      // 其他字段应该有默认值
      expect(loaded?.collapsedNodes).toEqual([]);
      expect(loaded?.currentNode).toBe("");
    });

    it("应该能够合并保存的状态", () => {
      const mindmapId = "test-mindmap-3";

      // 第一次保存 viewport
      ViewStateManager.save(mindmapId, {
        viewport: { x: 10, y: 20, zoom: 1.0 },
      });

      // 第二次保存 collapsedNodes
      ViewStateManager.save(mindmapId, {
        collapsedNodes: ["node1"],
      });

      // 第三次保存 currentNode
      ViewStateManager.save(mindmapId, {
        currentNode: "node2",
      });

      const loaded = ViewStateManager.load(mindmapId);

      expect(loaded).toBeDefined();
      expect(loaded?.viewport.x).toBe(10);
      expect(loaded?.collapsedNodes).toEqual(["node1"]);
      expect(loaded?.currentNode).toBe("node2");
    });

    it("当不存在视图状态时应该返回 null", () => {
      const loaded = ViewStateManager.load("non-existent-mindmap");
      expect(loaded).toBeNull();
    });

    it("当数据格式错误时应该返回 null", () => {
      const mindmapId = "test-mindmap-invalid";
      localStorage.setItem(`viewState:${mindmapId}`, "invalid json");

      const loaded = ViewStateManager.load(mindmapId);
      expect(loaded).toBeNull();
    });

    it("当版本号不匹配时应该返回 null", () => {
      const mindmapId = "test-mindmap-version";
      const invalidState = {
        viewport: { x: 0, y: 0, zoom: 1 },
        collapsedNodes: [],
        currentNode: "",
        lastUpdated: new Date().toISOString(),
        version: 999, // 错误的版本号
      };

      localStorage.setItem(
        `viewState:${mindmapId}`,
        JSON.stringify(invalidState)
      );

      const loaded = ViewStateManager.load(mindmapId);
      expect(loaded).toBeNull();
    });
  });

  describe("remove()", () => {
    it("应该能够删除视图状态", () => {
      const mindmapId = "test-mindmap-remove";
      const state: Partial<ViewState> = {
        viewport: { x: 100, y: 200, zoom: 1.5 },
      };

      ViewStateManager.save(mindmapId, state);
      expect(ViewStateManager.load(mindmapId)).toBeDefined();

      ViewStateManager.remove(mindmapId);
      expect(ViewStateManager.load(mindmapId)).toBeNull();
    });

    it("应该能够从索引中删除条目", () => {
      const mindmapId = "test-mindmap-remove-index";
      const state: Partial<ViewState> = {
        viewport: { x: 100, y: 200, zoom: 1.5 },
      };

      ViewStateManager.save(mindmapId, state);

      // 验证索引中有这个条目
      const indexJson = localStorage.getItem("viewStateIndex");
      expect(indexJson).toBeDefined();
      const index = JSON.parse(indexJson!);
      expect(index[mindmapId]).toBeDefined();

      // 删除
      ViewStateManager.remove(mindmapId);

      // 验证索引中没有这个条目
      const indexAfterJson = localStorage.getItem("viewStateIndex");
      const indexAfter = JSON.parse(indexAfterJson || "{}");
      expect(indexAfter[mindmapId]).toBeUndefined();
    });
  });

  describe("索引管理", () => {
    it("保存时应该更新索引", () => {
      const mindmapId = "test-mindmap-index";
      const state: Partial<ViewState> = {
        viewport: { x: 100, y: 200, zoom: 1.5 },
      };

      ViewStateManager.save(mindmapId, state);

      const indexJson = localStorage.getItem("viewStateIndex");
      expect(indexJson).toBeDefined();

      const index = JSON.parse(indexJson!);
      expect(index[mindmapId]).toBeDefined();
      expect(index[mindmapId].lastAccessed).toBeDefined();
      expect(index[mindmapId].size).toBeGreaterThan(0);
    });

    it("加载时应该更新访问时间", () => {
      const mindmapId = "test-mindmap-access";
      const state: Partial<ViewState> = {
        viewport: { x: 100, y: 200, zoom: 1.5 },
      };

      ViewStateManager.save(mindmapId, state);

      // 获取第一次的访问时间
      const indexJson1 = localStorage.getItem("viewStateIndex");
      const index1 = JSON.parse(indexJson1!);
      const firstAccess = index1[mindmapId].lastAccessed;

      // 等待 1ms
      setTimeout(() => {
        ViewStateManager.load(mindmapId);

        // 获取第二次的访问时间
        const indexJson2 = localStorage.getItem("viewStateIndex");
        const index2 = JSON.parse(indexJson2!);
        const secondAccess = index2[mindmapId].lastAccessed;

        expect(
          new Date(secondAccess).getTime() >= new Date(firstAccess).getTime()
        ).toBe(true);
      }, 10);
    });
  });

  describe("清理逻辑", () => {
    it("应该删除超过最大数量的条目", () => {
      // 保存 52 个思维导图的状态（MAX_ENTRIES = 50）
      for (let i = 0; i < 52; i++) {
        ViewStateManager.save(`mindmap-${i}`, {
          viewport: { x: i, y: i, zoom: 1 },
        });
      }

      // 获取索引
      const indexJson = localStorage.getItem("viewStateIndex");
      const index = JSON.parse(indexJson || "{}");

      // 应该只保留 50 个（最近访问的）
      expect(Object.keys(index).length).toBeLessThanOrEqual(50);
    });

    it("应该删除超过 90 天未访问的条目", () => {
      const mindmapId = "old-mindmap";

      // 手动创建一个超过 90 天未访问的条目
      const oldDate = new Date();
      oldDate.setDate(oldDate.getDate() - 91); // 91 天前

      const index = {
        [mindmapId]: {
          lastAccessed: oldDate.toISOString(),
          size: 100,
        },
      };

      localStorage.setItem("viewStateIndex", JSON.stringify(index));
      localStorage.setItem(
        `viewState:${mindmapId}`,
        JSON.stringify({
          viewport: { x: 0, y: 0, zoom: 1 },
          collapsedNodes: [],
          currentNode: "",
          lastUpdated: oldDate.toISOString(),
          version: 1,
        })
      );

      // 保存一个新的状态，触发清理
      ViewStateManager.save("new-mindmap", {
        viewport: { x: 0, y: 0, zoom: 1 },
      });

      // 验证旧的条目被删除
      const loaded = ViewStateManager.load(mindmapId);
      expect(loaded).toBeNull();

      const indexJson = localStorage.getItem("viewStateIndex");
      const indexAfter = JSON.parse(indexJson || "{}");
      expect(indexAfter[mindmapId]).toBeUndefined();
    });
  });

  describe("错误处理", () => {
    it("保存失败时应该静默处理", () => {
      // 模拟 localStorage 写入失败
      const originalSetItem = localStorage.setItem;
      localStorage.setItem = jest.fn(() => {
        throw new Error("localStorage is full");
      });

      // 不应该抛出错误
      expect(() => {
        ViewStateManager.save("test-mindmap", {
          viewport: { x: 0, y: 0, zoom: 1 },
        });
      }).not.toThrow();

      // 恢复原始方法
      localStorage.setItem = originalSetItem;
    });

    it("加载失败时应该返回 null", () => {
      // 模拟 localStorage 读取失败
      const originalGetItem = localStorage.getItem;
      localStorage.getItem = jest.fn(() => {
        throw new Error("localStorage read error");
      });

      const loaded = ViewStateManager.load("test-mindmap");
      expect(loaded).toBeNull();

      // 恢复原始方法
      localStorage.getItem = originalGetItem;
    });
  });
});
