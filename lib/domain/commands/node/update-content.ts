import { MindmapStore } from "../../mindmap-store.types";
import { CommandDefinition, registerCommand } from "../../command-registry";
import { UpdateNodeAction } from "../../actions/update-node";

type UpdateContentParams = [string?, string?];

/**
 * 更新节点内容
 */
export const updateContentCommand: CommandDefinition = {
  id: "node.updateContent",
  name: "更新节点内容",
  description: "更新节点内容",
  category: "node",

  handler: (root: MindmapStore, params?: unknown[]) => {
    const [nodeId, newContent] = (params as UpdateContentParams) || [];
    const targetNodeId = nodeId || root.currentEditor!.currentNode;
    const node = root.currentEditor?.nodes.get(targetNodeId);

    if (!node) {
      return;
    }

    if (newContent === node.content) {
      return; // 内容未变化
    }

    return [
      new UpdateNodeAction({
        id: node.id,
        short_id: node.short_id,
        oldNode: { content: node.content },
        newNode: { content: newContent || null },
      }),
    ];
  },

  when: (root: MindmapStore, params?: unknown[]) => {
    const [nodeId] = (params as UpdateContentParams) || [];
    const targetNodeId = nodeId || root.currentEditor?.currentNode;
    return root.currentEditor?.nodes.has(targetNodeId || "") || false;
  },

  getDescription: (root: MindmapStore, params?: unknown[]) => {
    const [nodeId] = (params as UpdateContentParams) || [];
    const targetNodeId = nodeId || root.currentEditor?.currentNode;
    const node = root.currentEditor?.nodes.get(targetNodeId || "");
    return node ? `更新内容：${node.title}` : "更新节点内容";
  },
};

registerCommand(updateContentCommand);
