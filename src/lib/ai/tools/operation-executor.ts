import { useMindmapStore } from "@/domain/mindmap-store";
import type { OperationWithId, OperationAction } from "./suggest-operations";
import type { NodeTree } from "./operation-config";
import { createCompositeCommand } from "@/domain/commands/composite/create-composite-command";

// 定义操作数据接口，用于运行时访问
interface OperationData {
  id: string;
  action: OperationAction;
  targetNodeId: string;
  description: string;
  // addChild 专用
  title?: string;
  afterSiblingId?: string;
  // addChildTrees 专用
  children?: NodeTree[];
  // updateTitle 专用
  newTitle?: string;
  // updateNote 专用
  newNote?: string;
}

/**
 * 将 UUID 转换为 short_id
 */
function convertUUIDToShortId(uuid: string): string {
  const root = useMindmapStore.getState();
  const editor = root.currentEditor;

  if (!editor) {
    throw new Error("No active editor");
  }

  const node = Array.from(editor.nodes.values()).find((n) => n.id === uuid);

  if (!node) {
    throw new Error(`Node with UUID ${uuid} not found`);
  }

  return node.short_id;
}

/**
 * 获取兄弟节点之后的位置
 */
function getPositionAfterSibling(siblingUuid: string): number {
  const root = useMindmapStore.getState();
  const editor = root.currentEditor;

  if (!editor) {
    throw new Error("No active editor");
  }

  const sibling = Array.from(editor.nodes.values()).find(
    (n) => n.id === siblingUuid
  );

  if (!sibling) {
    throw new Error(`Sibling node with UUID ${siblingUuid} not found`);
  }

  return sibling.order_index + 1;
}

/**
 * 执行单个操作
 */
export async function executeOperation(
  operation: OperationWithId
): Promise<void> {
  const root = useMindmapStore.getState();

  if (!root.currentEditor) {
    throw new Error("No active editor");
  }

  // 类型断言为 OperationData 以访问运行时属性
  const op = operation as unknown as OperationData;

  // 转换 targetNodeId 从 UUID 到 short_id
  const targetShortId = convertUUIDToShortId(op.targetNodeId);

  switch (op.action) {
    case "addChild":
      await root.executeCommand("node.addChild", {
        parentId: targetShortId,
        title: op.title as string,
        position: op.afterSiblingId
          ? getPositionAfterSibling(op.afterSiblingId as string)
          : undefined,
      });
      break;

    case "addChildTrees":
      await root.executeCommand("node.addChildTrees", {
        parentId: targetShortId,
        children: op.children || [],
      });
      break;

    case "updateTitle":
      await root.executeCommand("node.updateTitle", {
        nodeId: targetShortId,
        newTitle: op.newTitle as string,
      });
      break;

    case "updateNote":
      await root.executeCommand("node.updateNote", {
        nodeId: targetShortId,
        newNote: op.newNote as string,
      });
      break;

    case "deleteNode":
      await root.executeCommand("node.delete", {
        nodeId: targetShortId,
      });
      break;

    default:
      throw new Error(`Unknown operation action: ${op.action}`);
  }
}

/**
 * 批量执行选中的操作
 */
export async function executeSelectedOperations(
  operations: OperationWithId[],
  description: string = "执行 AI 操作"
): Promise<void> {
  const root = useMindmapStore.getState();

  if (!root.currentEditor) {
    throw new Error("No active editor");
  }

  // 使用 CompositeCommand 将所有操作组合成一个事务
  const commandRuns = operations.map((operation) => {
    // 类型断言为 OperationData 以访问运行时属性
    const op = operation as unknown as OperationData;
    const targetShortId = convertUUIDToShortId(op.targetNodeId);

    switch (op.action) {
      case "addChild":
        return {
          commandId: "node.addChild",
          params: {
            parentId: targetShortId,
            title: op.title as string,
            position: op.afterSiblingId
              ? getPositionAfterSibling(op.afterSiblingId as string)
              : undefined,
          },
        };

      case "addChildTrees":
        return {
          commandId: "node.addChildTrees",
          params: {
            parentId: targetShortId,
            children: op.children || [],
          },
        };

      case "updateTitle":
        return {
          commandId: "node.updateTitle",
          params: {
            nodeId: targetShortId,
            newTitle: op.newTitle as string,
          },
        };

      case "updateNote":
        return {
          commandId: "node.updateNote",
          params: {
            nodeId: targetShortId,
            newNote: op.newNote as string,
          },
        };

      case "deleteNode":
        return {
          commandId: "node.delete",
          params: {
            nodeId: targetShortId,
          },
        };

      default:
        throw new Error(`Unknown operation action: ${op.action}`);
    }
  });

  const compositeCommand = createCompositeCommand(description, commandRuns);
  await root.commandManager!.executeCommand(
    {
      commandId: compositeCommand.id,
      params: {},
    },
    compositeCommand
  );
}
