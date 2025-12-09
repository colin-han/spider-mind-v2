/**
 * 设置当前节点（最小滚动）命令
 *
 * 用于图形视图的鼠标点击交互
 * 采用策略B（0% padding），仅确保节点完全可见
 * 避免节点移动导致双击失败
 */

import { z } from "zod";
import { CommandDefinition } from "../../command-registry";
import { EditorAction } from "../../mindmap-store.types";
import { SetCurrentNodeAction } from "../../actions/ephemeral/set-current-node";
import { registerCommand } from "../../command-registry";
import { ensureNodeVisibleAction } from "../../utils/viewport-utils";

export const SetCurrentNodeMinimalScrollParamsSchema = z.object({
  nodeId: z.string().describe("要选中的节点 ID"),
});
export type SetCurrentNodeMinimalScrollParams = z.infer<
  typeof SetCurrentNodeMinimalScrollParamsSchema
>;

export const setCurrentNodeMinimalScroll: CommandDefinition<
  typeof SetCurrentNodeMinimalScrollParamsSchema
> = {
  id: "navigation.setCurrentNodeMinimalScroll",
  name: "设置当前节点（最小滚动）",
  description: "设置当前节点，仅在节点不完全可见时最小滚动（策略B）",
  category: "navigation",
  actionBased: true,
  undoable: false,
  paramsSchema: SetCurrentNodeMinimalScrollParamsSchema,
  handler: (root, params) => {
    const { nodeId } = params;
    const state = root.currentEditor!;

    const actions: EditorAction[] = [
      new SetCurrentNodeAction({
        oldNodeId: state.currentNode,
        newNodeId: nodeId,
      }),
    ];

    // 策略B: 0% padding (仅确保完全可见，不破坏双击)
    const viewportAction = ensureNodeVisibleAction(nodeId, state, 0);
    if (viewportAction) {
      actions.push(viewportAction);
    }

    return actions;
  },
};

registerCommand(setCurrentNodeMinimalScroll);
