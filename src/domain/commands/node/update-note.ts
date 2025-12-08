import { z } from "zod";
import { CommandDefinition, registerCommand } from "../../command-registry";
import { UpdateNodeAction } from "../../actions/persistent/update-node";

export const UpdateNoteParamsSchema = z.object({
  nodeId: z.string().optional().describe("节点 ID"),
  newNote: z.string().nullable().optional().describe("新的笔记内容"),
});

export type UpdateNoteParams = z.infer<typeof UpdateNoteParamsSchema>;

/**
 * 更新节点笔记
 */
export const updateNoteCommand: CommandDefinition<
  typeof UpdateNoteParamsSchema
> = {
  id: "node.updateNote",
  name: "更新节点笔记",
  description: "更新节点的详细说明（note）",
  category: "node",
  actionBased: true,
  paramsSchema: UpdateNoteParamsSchema,

  handler: (root, params) => {
    const { nodeId, newNote } = params;
    const targetNodeId = nodeId || root.currentEditor!.currentNode;
    const node = root.currentEditor?.nodes.get(targetNodeId);

    if (!node) {
      return;
    }

    // 标准化 newNote: undefined 和空字符串都转为 null
    const normalizedNewNote = !newNote ? null : newNote;

    if (normalizedNewNote === node.note) {
      return; // 笔记未变化
    }

    const actions = [];

    // 更新节点笔记
    actions.push(
      new UpdateNodeAction({
        id: node.id,
        short_id: node.short_id,
        oldNode: { note: node.note },
        newNode: { note: normalizedNewNote },
      })
    );

    return actions;
  },

  when: (root, params) => {
    const { nodeId } = params;
    const targetNodeId = nodeId || root.currentEditor?.currentNode;
    return root.currentEditor?.nodes.has(targetNodeId || "") || false;
  },

  getDescription: (root, params) => {
    const { nodeId, newNote } = params;
    const targetNodeId = nodeId || root.currentEditor?.currentNode;
    const node = root.currentEditor?.nodes.get(targetNodeId || "");

    if (!node) return "更新节点笔记";

    const normalizedNewNote =
      newNote === undefined || newNote === "" ? null : newNote;

    if (normalizedNewNote === null) {
      return node.note ? "删除节点笔记" : "更新节点笔记";
    } else if (!node.note) {
      return "添加节点笔记";
    } else {
      return "更新节点笔记";
    }
  },
};

registerCommand(updateNoteCommand);
