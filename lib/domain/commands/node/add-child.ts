import { MindmapStore } from "../../mindmap-store.types";
import { CommandDefinition, registerCommand } from "../../command-registry";
import { generateShortId } from "@/lib/utils/short-id";
import { AddNodeAction } from "../../actions/add-node";
import { UpdateNodeAction } from "../../actions/update-node";
import { getChildNodes } from "../../editor-utils";

type AddChildNodeParams = [string, number?, string?, string?];

function normalizePosition(siblingsCount: number, position?: number) {
  if (position === undefined) {
    return siblingsCount;
  }
  if (position < 0) {
    return 0;
  }
  if (position > siblingsCount) {
    return siblingsCount;
  }
  return position;
}

export const addChildNodeCommand: CommandDefinition = {
  id: "node.addChild",
  name: "添加子节点",
  description: "添加子节点",
  category: "node",
  handler: (root: MindmapStore, params?: unknown[]) => {
    const [parentId, position, title, content] = params as AddChildNodeParams;
    const normalizedParentId = parentId || root.currentEditor!.currentNode;
    const parentNode = root.currentEditor?.nodes.get(normalizedParentId);
    if (!parentNode) {
      return;
    }
    const siblings = getChildNodes(root.currentEditor!, normalizedParentId);
    const order_index = normalizePosition(siblings.length, position);
    const normalizedTitle = title || "新节点";

    const shortId = generateShortId();

    const actions = [];
    actions.push(
      new AddNodeAction({
        id: crypto.randomUUID(), // UUID,用于数据库主键
        short_id: shortId,
        mindmap_id: root.currentEditor!.currentMindmap.id,
        parent_id: parentNode.id,
        parent_short_id: normalizedParentId, // 使用 parent 的 short_id
        title: normalizedTitle,
        content: content || null,
        order_index: order_index,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
    );

    siblings
      .filter((node) => node.order_index >= order_index)
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

    return actions;
  },
};

registerCommand(addChildNodeCommand);
