import { describe, it, expect, beforeEach } from "@jest/globals";
import { createCompositeCommand } from "../create-composite-command";
import {
  registerCommand,
  ActionBasedCommandDefinition,
  ImperativeCommandDefinition,
} from "../../../command-registry";
import { MindmapStore, EditorAction } from "../../../mindmap-store.types";

// Mock EditorAction
class MockAction implements EditorAction {
  type: string;

  constructor(private value: string) {
    this.type = `mock-${value}`;
  }

  applyToEditorState(): void {
    // Mock implementation
  }

  reverse(): EditorAction {
    return new MockAction(`reverse-${this.value}`);
  }
}

describe("createCompositeCommand", () => {
  // 清理注册的命令
  beforeEach(() => {
    // 注意：这里需要实际的清理逻辑，或者使用 Mock
  });

  describe("基础功能", () => {
    it("应该返回标准的 CommandDefinition", () => {
      const compositeCommand = createCompositeCommand("测试组合命令", []);

      expect(compositeCommand).toHaveProperty("id");
      expect(compositeCommand).toHaveProperty("name");
      expect(compositeCommand).toHaveProperty("description");
      expect(compositeCommand).toHaveProperty("category");
      expect(compositeCommand).toHaveProperty("actionBased");
      expect(compositeCommand).toHaveProperty("handler");

      expect(compositeCommand.actionBased).toBe(true);
      expect(compositeCommand.category).toBe("ai");
      expect(compositeCommand.name).toBe("测试组合命令");
      expect(compositeCommand.description).toBe("测试组合命令");
      expect(compositeCommand.id).toMatch(/^ai\.composite\.\d+$/);
    });

    it("应该收集所有子命令的 actions", async () => {
      // 注册测试命令
      const testCommand1: ActionBasedCommandDefinition = {
        id: "test.command1",
        name: "测试命令1",
        description: "测试",
        category: "node",
        actionBased: true,
        handler: () => [new MockAction("action1"), new MockAction("action2")],
      };

      const testCommand2: ActionBasedCommandDefinition = {
        id: "test.command2",
        name: "测试命令2",
        description: "测试",
        category: "node",
        actionBased: true,
        handler: () => [new MockAction("action3")],
      };

      registerCommand(testCommand1);
      registerCommand(testCommand2);

      // 创建组合命令
      const compositeCommand = createCompositeCommand("批量操作", [
        { commandId: "test.command1", params: [] },
        { commandId: "test.command2", params: [] },
      ]);

      // 执行 handler
      const mockRoot = {} as MindmapStore;
      const actions = await compositeCommand.handler(mockRoot, []);

      expect(actions).toHaveLength(3);
    });
  });

  describe("错误处理", () => {
    it("应该在命令不存在时抛出错误", async () => {
      const compositeCommand = createCompositeCommand("测试", [
        { commandId: "non.existent", params: [] },
      ]);

      const mockRoot = {} as MindmapStore;

      await expect(compositeCommand.handler(mockRoot, [])).rejects.toThrow(
        "Command non.existent not found"
      );
    });

    it("应该在命令不是 actionBased 时抛出错误", async () => {
      // 注册命令式命令
      const imperativeCommand: ImperativeCommandDefinition = {
        id: "test.imperative",
        name: "命令式命令",
        description: "测试",
        category: "global",
        actionBased: false,
        handler: () => {
          // 直接执行
        },
      };

      registerCommand(imperativeCommand);

      const compositeCommand = createCompositeCommand("测试", [
        { commandId: "test.imperative", params: [] },
      ]);

      const mockRoot = {} as MindmapStore;

      await expect(compositeCommand.handler(mockRoot, [])).rejects.toThrow(
        "is not action-based"
      );
    });

    it("应该在命令是 undoable: false 时抛出错误", async () => {
      // 注册不可撤销命令
      const nonUndoableCommand: ActionBasedCommandDefinition = {
        id: "test.nonundoable",
        name: "不可撤销命令",
        description: "测试",
        category: "navigation",
        actionBased: true,
        undoable: false,
        handler: () => [new MockAction("action1")],
      };

      registerCommand(nonUndoableCommand);

      const compositeCommand = createCompositeCommand("测试", [
        { commandId: "test.nonundoable", params: [] },
      ]);

      const mockRoot = {} as MindmapStore;

      await expect(compositeCommand.handler(mockRoot, [])).rejects.toThrow(
        "is not undoable"
      );
    });

    it("应该在前置条件不满足时抛出错误", async () => {
      // 注册带前置条件的命令
      const conditionalCommand: ActionBasedCommandDefinition = {
        id: "test.conditional",
        name: "条件命令",
        description: "测试",
        category: "node",
        actionBased: true,
        handler: () => [new MockAction("action1")],
        when: () => false, // 前置条件总是不满足
      };

      registerCommand(conditionalCommand);

      const compositeCommand = createCompositeCommand("测试", [
        { commandId: "test.conditional", params: [] },
      ]);

      const mockRoot = {} as MindmapStore;

      await expect(compositeCommand.handler(mockRoot, [])).rejects.toThrow(
        "precondition not met"
      );
    });

    it("应该在第一个错误时中止执行", async () => {
      const executionOrder: string[] = [];

      // 注册第一个命令
      const command1: ActionBasedCommandDefinition = {
        id: "test.first",
        name: "第一个命令",
        description: "测试",
        category: "node",
        actionBased: true,
        handler: () => {
          executionOrder.push("first");
          return [new MockAction("action1")];
        },
      };

      // 注册会失败的命令
      const failingCommand: ActionBasedCommandDefinition = {
        id: "test.failing",
        name: "失败命令",
        description: "测试",
        category: "node",
        actionBased: true,
        handler: () => {
          executionOrder.push("failing");
          throw new Error("Command execution failed");
        },
      };

      // 注册第三个命令（不应该被执行）
      const command3: ActionBasedCommandDefinition = {
        id: "test.third",
        name: "第三个命令",
        description: "测试",
        category: "node",
        actionBased: true,
        handler: () => {
          executionOrder.push("third");
          return [new MockAction("action3")];
        },
      };

      registerCommand(command1);
      registerCommand(failingCommand);
      registerCommand(command3);

      const compositeCommand = createCompositeCommand("测试", [
        { commandId: "test.first", params: [] },
        { commandId: "test.failing", params: [] },
        { commandId: "test.third", params: [] },
      ]);

      const mockRoot = {} as MindmapStore;

      await expect(compositeCommand.handler(mockRoot, [])).rejects.toThrow();

      // 验证第三个命令没有执行
      expect(executionOrder).toEqual(["first", "failing"]);
      expect(executionOrder).not.toContain("third");
    });
  });
});
