import { MindmapStore } from "../../mindmap-store.types";
import { CommandDefinition, registerCommand } from "../../command-registry";
import { SetCurrentNodeAction } from "../../actions/set-current-node";

/**
 * 选择父节点
 */
export const selectParentCommand: CommandDefinition = {
  id: "navigation.selectParent",
  name: "选择父节点",
  description: "跳转到父节点",
  category: "navigation",
  actionBased: true,
  undoable: false,
  parameters: [],

  handler: (root: MindmapStore) => {
    const currentNode = root.currentEditor?.nodes.get(
      root.currentEditor.currentNode
    );
    if (!currentNode || !currentNode.parent_short_id) {
      return;
    }

    return [
      new SetCurrentNodeAction({
        oldNodeId: currentNode.short_id,
        newNodeId: currentNode.parent_short_id,
      }),
    ];
  },

  when: (root: MindmapStore) => {
    const currentNode = root.currentEditor?.nodes.get(
      root.currentEditor.currentNode
    );
    return currentNode?.parent_short_id != null;
  },
};

registerCommand(selectParentCommand);
