import { z } from "zod";
import { CommandDefinition, registerCommand } from "../../command-registry";
import { generateShortId } from "@/lib/utils/short-id";
import { AddNodeAction } from "../../actions/persistent/add-node";
import { UpdateNodeAction } from "../../actions/persistent/update-node";
import { SetCurrentNodeAction } from "../../actions/ephemeral/set-current-node";
import { ExpandNodeAction } from "../../actions/ephemeral/expand-node";
import { getChildNodes } from "../../editor-utils";
import { EnsureCurrentNodeVisibleAction } from "../../actions/ephemeral/ensure-current-node-visible";

export const AddChildNodeParamsSchema = z.object({
  parentId: z.string().optional().describe("父节点的 ID，默认为当前选中节点"),
  position: z.number().optional().describe("插入位置（在兄弟节点中的索引）"),
  title: z.string().optional().describe("节点标题"),
});

export type AddChildNodeParams = z.infer<typeof AddChildNodeParamsSchema>;

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

export const addChildNodeCommand: CommandDefinition<
  typeof AddChildNodeParamsSchema
> = {
  id: "node.addChild",
  name: "添加子节点",
  description: "添加单个子节点",
  category: "node",
  actionBased: true,
  paramsSchema: AddChildNodeParamsSchema,
  handler: (root, params) => {
    const { parentId, position, title } = params;
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

    // 如果父节点是折叠状态，先展开它
    if (root.currentEditor!.collapsedNodes.has(normalizedParentId)) {
      actions.push(new ExpandNodeAction(normalizedParentId));
    }

    actions.push(
      new AddNodeAction({
        id: crypto.randomUUID(), // UUID,用于数据库主键
        short_id: shortId,
        mindmap_id: root.currentEditor!.currentMindmap.id,
        parent_id: parentNode.id,
        parent_short_id: normalizedParentId, // 使用 parent 的 short_id
        title: normalizedTitle,
        note: null,
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

    // 自动选中新创建的节点
    actions.push(
      new SetCurrentNodeAction({
        newNodeId: shortId,
        oldNodeId: root.currentEditor!.currentNode,
      })
    );

    // 策略A: 确保新节点在安全区域内（15% padding）
    // 使用 EnsureCurrentNodeVisibleAction，在执行时才检查和滚动
    actions.push(new EnsureCurrentNodeVisibleAction(0.15));

    return actions;
  },
};

registerCommand(addChildNodeCommand);
