import { MindmapStore } from "../../mindmap-store.types";
import { CommandDefinition, registerCommand } from "../../command-registry";
import { UpdateNodeAction } from "../../actions/persistent/update-node";

type UpdateTitleParams = [string?, string?];

/**
 * 更新节点标题
 */
export const updateTitleCommand: CommandDefinition = {
  id: "node.updateTitle",
  name: "更新节点标题",
  description: "更新节点标题",
  category: "node",
  actionBased: true,
  parameters: [
    {
      name: "nodeId",
      type: "string",
      description: "节点 ID",
    },
    {
      name: "newTitle",
      type: "string",
      description: "新的标题内容",
    },
  ],

  handler: (root: MindmapStore, params?: unknown[]) => {
    const [nodeId, newTitle] = (params as UpdateTitleParams) || [];
    const targetNodeId = nodeId || root.currentEditor!.currentNode;
    const node = root.currentEditor?.nodes.get(targetNodeId);

    if (!node) {
      return;
    }

    if (newTitle === undefined || newTitle === node.title) {
      return; // 标题未变化
    }

    const actions = [];

    // 更新节点标题
    actions.push(
      new UpdateNodeAction({
        id: node.id,
        short_id: node.short_id,
        oldNode: { title: node.title },
        newNode: { title: newTitle },
      })
    );

    // TODO: 如果是根节点，需要同步更新 Mindmap.title
    // 当前 UpdateNodeAction 只处理节点，mindmap 的更新可以后续通过创建
    // UpdateMindmapAction 或在 UpdateNodeAction 中特殊处理

    return actions;
  },

  when: (root: MindmapStore, params?: unknown[]) => {
    const [nodeId] = (params as UpdateTitleParams) || [];
    const targetNodeId = nodeId || root.currentEditor?.currentNode;
    return root.currentEditor?.nodes.has(targetNodeId || "") || false;
  },

  getDescription: (root: MindmapStore, params?: unknown[]) => {
    const [nodeId] = (params as UpdateTitleParams) || [];
    const targetNodeId = nodeId || root.currentEditor?.currentNode;
    const node = root.currentEditor?.nodes.get(targetNodeId || "");
    return node ? `更新标题：${node.title}` : "更新节点标题";
  },
};

registerCommand(updateTitleCommand);
