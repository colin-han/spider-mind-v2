import { z } from "zod";
import { CommandDefinition } from "../../command-registry";
import { EditorAction } from "../../mindmap-store.types";
import { SetCurrentNodeAction } from "../../actions/ephemeral/set-current-node";
import { registerCommand } from "../../command-registry";
import { ensureNodeVisibleAction } from "../../utils/viewport-utils";

export const SetCurrentNodeParamsSchema = z.object({
  nodeId: z.string().describe("要选中的节点 ID"),
});
export type SetCurrentNodeParams = z.infer<typeof SetCurrentNodeParamsSchema>;

export const setCurrentNode: CommandDefinition<
  typeof SetCurrentNodeParamsSchema
> = {
  id: "navigation.setCurrentNode",
  name: "设置当前节点",
  description: "设置当前选中的节点",
  category: "navigation",
  actionBased: true,
  undoable: false,
  paramsSchema: SetCurrentNodeParamsSchema,
  handler: (root, params) => {
    const { nodeId } = params;
    const state = root.currentEditor!;

    const actions: EditorAction[] = [
      new SetCurrentNodeAction({
        oldNodeId: state.currentNode,
        newNodeId: nodeId,
      }),
    ];

    // 策略A: 15% padding (确保在安全区域内)
    const viewportAction = ensureNodeVisibleAction(nodeId, state, 0.15);
    if (viewportAction) {
      actions.push(viewportAction);
    }

    return actions;
  },
};

registerCommand(setCurrentNode);
