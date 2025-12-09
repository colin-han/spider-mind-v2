import { EditorAction } from "../../mindmap-store.types";
import { CommandDefinition, registerCommand } from "../../command-registry";
import { SetCurrentNodeAction } from "../../actions/ephemeral/set-current-node";
import { ensureNodeVisibleAction } from "../../utils/viewport-utils";
import { EmptyParamsSchema } from "../../command-schema";

/**
 * 选择父节点
 */
export const selectParentCommand: CommandDefinition<typeof EmptyParamsSchema> =
  {
    id: "navigation.selectParent",
    name: "选择父节点",
    description: "跳转到父节点",
    category: "navigation",
    actionBased: true,
    undoable: false,
    paramsSchema: EmptyParamsSchema,

    handler: (root) => {
      const state = root.currentEditor;
      if (!state) return;

      const currentNode = state.nodes.get(state.currentNode);
      if (!currentNode || !currentNode.parent_short_id) {
        return;
      }

      const actions: EditorAction[] = [
        new SetCurrentNodeAction({
          oldNodeId: currentNode.short_id,
          newNodeId: currentNode.parent_short_id,
        }),
      ];

      // 策略A: 15% padding (确保在安全区域内)
      const viewportAction = ensureNodeVisibleAction(
        currentNode.parent_short_id,
        state,
        0.15
      );
      if (viewportAction) {
        actions.push(viewportAction);
      }

      return actions;
    },

    when: (root) => {
      const currentNode = root.currentEditor?.nodes.get(
        root.currentEditor.currentNode
      );
      return currentNode?.parent_short_id != null;
    },
  };

registerCommand(selectParentCommand);
