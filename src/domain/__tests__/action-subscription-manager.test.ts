import { describe, it, expect, beforeEach } from "@jest/globals";
import { ActionSubscriptionManager } from "../action-subscription-manager";
import type { EditorAction } from "../mindmap-store.types";

// Mock EditorAction for testing
class MockAction implements EditorAction {
  constructor(public type: string) {}

  applyToEditorState(): void {
    // Mock implementation
  }

  reverse(): EditorAction {
    return new MockAction(`reverse-${this.type}`);
  }
}

describe("ActionSubscriptionManager", () => {
  let manager: ActionSubscriptionManager;

  beforeEach(() => {
    manager = new ActionSubscriptionManager();
  });

  describe("subscribe", () => {
    it("应该成功订阅 action", () => {
      const handler = jest.fn();
      const unsubscribe = manager.subscribe("addChildNode", handler);

      expect(unsubscribe).toBeInstanceOf(Function);
      expect(manager.getStats()["addChildNode"]).toBe(1);
    });

    it("应该返回取消订阅函数", () => {
      const handler = jest.fn();
      const unsubscribe = manager.subscribe("addChildNode", handler);

      expect(manager.getStats()["addChildNode"]).toBe(1);

      unsubscribe();

      expect(manager.getStats()["addChildNode"]).toBeUndefined();
    });

    it("应该允许多个订阅者订阅同一个 action", () => {
      const handler1 = jest.fn();
      const handler2 = jest.fn();

      manager.subscribe("addChildNode", handler1);
      manager.subscribe("addChildNode", handler2);

      expect(manager.getStats()["addChildNode"]).toBe(2);
    });
  });

  describe("notify", () => {
    it("应该调用订阅者", async () => {
      const handler = jest.fn();
      manager.subscribe("addChildNode", handler);

      const action = new MockAction("addChildNode");
      const payload = {
        action,
        timestamp: Date.now(),
      };

      await manager.notify("addChildNode", payload);

      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler).toHaveBeenCalledWith(payload);
    });

    it("应该调用所有订阅者", async () => {
      const handler1 = jest.fn();
      const handler2 = jest.fn();

      manager.subscribe("addChildNode", handler1);
      manager.subscribe("addChildNode", handler2);

      const action = new MockAction("addChildNode");
      const payload = {
        action,
        timestamp: Date.now(),
      };

      await manager.notify("addChildNode", payload);

      expect(handler1).toHaveBeenCalledTimes(1);
      expect(handler2).toHaveBeenCalledTimes(1);
    });

    it("不应该调用未订阅的 action 的订阅者", async () => {
      const handler = jest.fn();
      manager.subscribe("addChildNode", handler);

      const action = new MockAction("updateNode");
      const payload = {
        action,
        timestamp: Date.now(),
      };

      await manager.notify("updateNode", payload);

      expect(handler).not.toHaveBeenCalled();
    });

    it("应该支持异步订阅者", async () => {
      const handler = jest.fn(async () => {
        await new Promise((resolve) => setTimeout(resolve, 10));
      });

      manager.subscribe("addChildNode", handler);

      const action = new MockAction("addChildNode");
      const payload = {
        action,
        timestamp: Date.now(),
      };

      await manager.notify("addChildNode", payload);

      expect(handler).toHaveBeenCalledTimes(1);
    });

    it("错误隔离: 一个订阅者的错误不应影响其他订阅者", async () => {
      // Mock console.error to suppress error output
      const originalConsoleError = console.error;
      let errorCalled = false;
      console.error = jest.fn(() => {
        errorCalled = true;
      });

      const handler1 = jest.fn(() => {
        throw new Error("Handler 1 failed");
      });
      const handler2 = jest.fn();

      manager.subscribe("addChildNode", handler1);
      manager.subscribe("addChildNode", handler2);

      const action = new MockAction("addChildNode");
      const payload = {
        action,
        timestamp: Date.now(),
      };

      await manager.notify("addChildNode", payload);

      // handler2 应该仍然被调用
      expect(handler2).toHaveBeenCalledTimes(1);

      // 应该记录错误
      expect(errorCalled).toBe(true);

      // Restore console.error
      console.error = originalConsoleError;
    });
  });

  describe("unsubscribe", () => {
    it("应该成功取消订阅", async () => {
      const handler = jest.fn();
      const unsubscribe = manager.subscribe("addChildNode", handler);

      unsubscribe();

      const action = new MockAction("addChildNode");
      const payload = {
        action,
        timestamp: Date.now(),
      };

      await manager.notify("addChildNode", payload);

      expect(handler).not.toHaveBeenCalled();
    });

    it("应该只取消指定的订阅者", async () => {
      const handler1 = jest.fn();
      const handler2 = jest.fn();

      manager.subscribe("addChildNode", handler1);
      const unsubscribe2 = manager.subscribe("addChildNode", handler2);

      unsubscribe2();

      const action = new MockAction("addChildNode");
      const payload = {
        action,
        timestamp: Date.now(),
      };

      await manager.notify("addChildNode", payload);

      expect(handler1).toHaveBeenCalledTimes(1);
      expect(handler2).not.toHaveBeenCalled();
    });
  });

  describe("subscribeMultiple", () => {
    it("应该订阅多个 actions", () => {
      const handler = jest.fn();
      const unsubscribe = manager.subscribeMultiple(
        ["addChildNode", "updateNode", "removeNode"],
        handler
      );

      expect(unsubscribe).toBeInstanceOf(Function);
      expect(manager.getStats()["addChildNode"]).toBe(1);
      expect(manager.getStats()["updateNode"]).toBe(1);
      expect(manager.getStats()["removeNode"]).toBe(1);
    });

    it("应该批量取消订阅", async () => {
      const handler = jest.fn();
      const unsubscribe = manager.subscribeMultiple(
        ["addChildNode", "updateNode"],
        handler
      );

      unsubscribe();

      const action1 = new MockAction("addChildNode");
      const action2 = new MockAction("updateNode");

      await manager.notify("addChildNode", {
        action: action1,
        timestamp: Date.now(),
      });
      await manager.notify("updateNode", {
        action: action2,
        timestamp: Date.now(),
      });

      expect(handler).not.toHaveBeenCalled();
    });

    it("应该为所有订阅的 actions 调用订阅者", async () => {
      const handler = jest.fn();
      manager.subscribeMultiple(["addChildNode", "updateNode"], handler);

      const action1 = new MockAction("addChildNode");
      const action2 = new MockAction("updateNode");

      await manager.notify("addChildNode", {
        action: action1,
        timestamp: Date.now(),
      });
      await manager.notify("updateNode", {
        action: action2,
        timestamp: Date.now(),
      });

      expect(handler).toHaveBeenCalledTimes(2);
    });
  });

  describe("clear", () => {
    it("应该清空所有订阅", () => {
      const handler1 = jest.fn();
      const handler2 = jest.fn();

      manager.subscribe("addChildNode", handler1);
      manager.subscribe("updateNode", handler2);

      expect(manager.getStats()["addChildNode"]).toBe(1);
      expect(manager.getStats()["updateNode"]).toBe(1);

      manager.clear();

      expect(manager.getStats()).toEqual({});
    });
  });

  describe("getStats", () => {
    it("应该返回订阅统计信息", () => {
      const handler1 = jest.fn();
      const handler2 = jest.fn();
      const handler3 = jest.fn();

      manager.subscribe("addChildNode", handler1);
      manager.subscribe("addChildNode", handler2);
      manager.subscribe("updateNode", handler3);

      const stats = manager.getStats();

      expect(stats).toEqual({
        addChildNode: 2,
        updateNode: 1,
      });
    });

    it("空订阅列表应该返回空对象", () => {
      const stats = manager.getStats();
      expect(stats).toEqual({});
    });
  });
});
