// src/lib/ai/node-context.ts

import { AINodeContext } from "@/lib/types/ai";
import { useMindmapStore } from "@/domain/mindmap-store";

/**
 * 构建节点上下文
 * 从 mindmap store 中提取节点的上下文信息（父节点链、兄弟节点、子节点）
 */
export function buildNodeContext(nodeId: string): AINodeContext {
  const store = useMindmapStore.getState();
  const editor = store.currentEditor;

  if (!editor) {
    throw new Error("No active editor");
  }

  const node = editor.nodes.get(nodeId);
  if (!node) {
    throw new Error(`Node not found: ${nodeId}`);
  }

  // 构建父节点链（从根节点到当前节点的路径）
  const parentChain: { id: string; title: string; note?: string }[] = [];
  let currentNode = node;

  // 向上遍历直到根节点
  while (currentNode.parent_short_id) {
    const parent = editor.nodes.get(currentNode.parent_short_id);
    if (!parent) break;

    // 插入到数组开头，保持从根到当前的顺序
    const parentNode: { id: string; title: string; note?: string } = {
      id: parent.id, // 使用 UUID
      title: parent.title,
    };
    // 只在 note 有值时添加该字段
    if (parent.note) {
      parentNode.note = parent.note;
    }
    parentChain.unshift(parentNode);

    currentNode = parent;
  }

  // 获取兄弟节点（同一父节点下的其他节点）
  const siblings: { id: string; title: string }[] = [];
  if (node.parent_short_id) {
    // 遍历所有节点，找出同一父节点下的节点
    Array.from(editor.nodes.values()).forEach((n) => {
      if (n.parent_short_id === node.parent_short_id && n.short_id !== nodeId) {
        siblings.push({
          id: n.id, // 使用 UUID
          title: n.title,
        });
      }
    });
  }

  // 获取子节点
  const children: { id: string; title: string }[] = [];
  Array.from(editor.nodes.values()).forEach((n) => {
    if (n.parent_short_id === nodeId) {
      children.push({
        id: n.id, // 使用 UUID
        title: n.title,
      });
    }
  });

  // 构建 currentNode，只在 note 有值时添加该字段
  const currentNodeData: {
    id: string;
    title: string;
    note?: string;
  } = {
    id: node.id, // UUID
    title: node.title,
  };
  if (node.note) {
    currentNodeData.note = node.note;
  }

  return {
    currentNode: currentNodeData,
    parentChain,
    siblings,
    children,
  };
}

/**
 * 格式化节点上下文为人类可读的字符串
 * 用于调试或显示
 */
export function formatNodeContext(context: AINodeContext): string {
  const parentChainStr =
    context.parentChain.length > 0
      ? context.parentChain.map((p) => p.title).join(" > ")
      : "根节点";

  const siblingsStr =
    context.siblings.length > 0
      ? context.siblings.map((s) => s.title).join(", ")
      : "无";

  const childrenStr =
    context.children.length > 0
      ? context.children.map((c) => c.title).join(", ")
      : "无";

  return `
当前节点: ${context.currentNode.title}
父节点链: ${parentChainStr}
兄弟节点: ${siblingsStr}
子节点: ${childrenStr}
  `.trim();
}
