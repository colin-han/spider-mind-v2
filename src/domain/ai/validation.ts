/**
 * AI 操作验证模块
 *
 * 提供操作验证和节点 ID 提取功能，确保 AI 返回的操作安全可靠
 */

import { AIOperation, ValidationResult } from "./types";
import { getCommand } from "../command-registry";
import { useMindmapStore } from "../mindmap-store";

/**
 * 从操作参数中提取节点ID
 * 用于验证节点是否存在
 *
 * @param operation - AI 操作
 * @returns 节点ID数组
 */
export function extractNodeIds(operation: AIOperation): string[] {
  const nodeIds: string[] = [];

  // 根据命令类型提取节点ID
  switch (operation.commandId) {
    case "node.addChild":
    case "node.addChildTrees":
      // 第一个参数是 parentId
      nodeIds.push(operation.params[0] as string);
      break;

    case "node.addSiblingAbove":
    case "node.addSiblingBelow":
    case "node.updateTitle":
    case "node.updateNote":
    case "node.delete":
    case "node.moveUp":
    case "node.moveDown":
      // 第一个参数是 nodeId
      nodeIds.push(operation.params[0] as string);
      break;

    case "node.move":
      // 第一个参数是 nodeId，第二个参数是 targetParentId
      nodeIds.push(operation.params[0] as string);
      nodeIds.push(operation.params[1] as string);
      break;

    case "navigation.setCurrentNode":
      // 第一个参数是 nodeId
      nodeIds.push(operation.params[0] as string);
      break;

    // 其他命令不涉及节点ID验证
    default:
      break;
  }

  return nodeIds;
}

/**
 * 验证 AI 操作的合法性
 *
 * 检查项：
 * 1. 命令是否存在
 * 2. 相关节点是否存在
 * 3. 命令的前置条件是否满足
 *
 * @param operation - AI 操作
 * @returns 验证结果
 */
export function validateOperation(operation: AIOperation): ValidationResult {
  // 1. 检查命令是否存在
  const command = getCommand(operation.commandId);
  if (!command) {
    return {
      valid: false,
      error: `未知命令: ${operation.commandId}`,
    };
  }

  // 2. 检查节点是否存在
  const root = useMindmapStore.getState();
  const nodeIds = extractNodeIds(operation);

  for (const nodeId of nodeIds) {
    if (!root.currentEditor?.nodes.has(nodeId)) {
      return {
        valid: false,
        error: `节点不存在: ${nodeId}`,
      };
    }
  }

  // 3. 检查前置条件
  if (command.when && !command.when(root, operation.params)) {
    return {
      valid: false,
      error: `命令前置条件不满足`,
    };
  }

  return { valid: true };
}

/**
 * 验证批量操作中的所有操作
 *
 * @param operations - 操作数组
 * @returns 第一个验证失败的结果，如果全部通过则返回成功结果
 */
export function validateOperations(
  operations: AIOperation[]
): ValidationResult {
  for (const operation of operations) {
    const result = validateOperation(operation);
    if (!result.valid) {
      return result;
    }
  }

  return { valid: true };
}
