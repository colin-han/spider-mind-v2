import { MindmapStore } from "../../mindmap-store.types";
import { CommandDefinition, registerCommand } from "../../command-registry";
import { generateShortId } from "@/lib/utils/short-id";
import { AddNodeAction } from "../../actions/add-node";
import { UpdateNodeAction } from "../../actions/update-node";
import { SetCurrentNodeAction } from "../../actions/set-current-node";
import { getChildNodes } from "../../editor-utils";

type AddSiblingNodeParams = [
  string | undefined,
  "above" | "below" | undefined,
  string | undefined,
];

/**
 * 添加兄弟节点（在下方）
 */
export const addSiblingBelowCommand: CommandDefinition = {
  id: "node.addSiblingBelow",
  name: "在下方添加兄弟节点",
  description: "在当前节点下方添加兄弟节点",
  category: "node",

  handler: (root: MindmapStore, params?: unknown[]) => {
    const [nodeId, , title] = (params as AddSiblingNodeParams) || [];
    const targetNodeId = nodeId || root.currentEditor!.currentNode;
    const targetNode = root.currentEditor?.nodes.get(targetNodeId);

    if (!targetNode || !targetNode.parent_short_id) {
      return; // 根节点没有兄弟节点
    }

    const parentNode = root.currentEditor!.nodes.get(
      targetNode.parent_short_id
    );
    if (!parentNode) {
      return;
    }

    const siblings = getChildNodes(
      root.currentEditor!,
      targetNode.parent_short_id
    );
    const shortId = generateShortId();
    const actions = [];

    // 添加新节点（在当前节点后面）
    actions.push(
      new AddNodeAction({
        id: crypto.randomUUID(),
        short_id: shortId,
        mindmap_id: root.currentEditor!.currentMindmap.id,
        parent_id: parentNode.id,
        parent_short_id: targetNode.parent_short_id,
        title: title || "新节点",
        note: null,
        order_index: targetNode.order_index + 1,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
    );

    // 调整后面兄弟节点的 order_index
    siblings
      .filter((node) => node.order_index > targetNode.order_index)
      .forEach((node) => {
        actions.push(
          new UpdateNodeAction({
            id: node.id,
            short_id: node.short_id,
            oldNode: { order_index: node.order_index },
            newNode: { order_index: node.order_index + 1 },
          })
        );
      });

    // 自动选中新创建的节点
    actions.push(
      new SetCurrentNodeAction({
        newNodeId: shortId,
        oldNodeId: root.currentEditor!.currentNode,
      })
    );

    return actions;
  },

  when: (root: MindmapStore) => {
    const currentNode = root.currentEditor?.nodes.get(
      root.currentEditor.currentNode
    );
    return currentNode?.parent_short_id != null; // 不是根节点
  },

  getDescription: () => "添加兄弟节点",
};

registerCommand(addSiblingBelowCommand);
