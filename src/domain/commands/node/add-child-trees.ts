import { z } from "zod";
import { CommandDefinition, registerCommand } from "../../command-registry";
import { EditorAction } from "../../mindmap-store.types";
import { MindmapNode } from "@/lib/types";
import { AddNodeAction } from "../../actions/persistent/add-node";
import { SetCurrentNodeAction } from "../../actions/ephemeral/set-current-node";
import { getChildNodes } from "../../editor-utils";
import { generateShortId } from "@/lib/utils/short-id";

/**
 * 节点树定义
 * 支持递归定义多级节点
 */
export interface NodeTree {
  title: string;
  note?: string;
  children?: NodeTree[];
}

// 使用 z.lazy() 定义递归类型
// 由于 exactOptionalPropertyTypes 配置，需要使用类型断言
const NodeTreeSchema = z.lazy(() =>
  z.object({
    title: z.string().describe("节点标题"),
    note: z.string().optional().describe("节点笔记"),
    children: z.array(NodeTreeSchema).optional().describe("子节点列表"),
  })
) as z.ZodType<NodeTree>;

export const AddChildTreesParamsSchema = z.object({
  parentId: z.string().describe("父节点的 ID"),
  children: z.array(NodeTreeSchema).describe("子节点树数组"),
});

export type AddChildTreesParams = z.infer<typeof AddChildTreesParamsSchema>;

/**
 * 创建节点树命令
 *
 * 功能：
 * - 批量创建子节点（当 children 中的节点没有子节点时）
 * - 创建多级节点树（当 children 中包含嵌套子节点时）
 *
 * 使用示例：
 * ```typescript
 * // 批量创建子节点（替代 addChildren）
 * executeCommand("node.addChildTrees", {
 *   parentId,
 *   children: [
 *     { title: "节点1" },
 *     { title: "节点2", note: "笔记" },
 *     { title: "节点3" }
 *   ]
 * });
 *
 * // 创建多级树
 * executeCommand("node.addChildTrees", {
 *   parentId,
 *   children: [
 *     {
 *       title: "前端",
 *       children: [
 *         { title: "React" },
 *         { title: "TypeScript" }
 *       ]
 *     },
 *     {
 *       title: "后端",
 *       children: [
 *         { title: "Next.js" },
 *         { title: "Supabase" }
 *       ]
 *     }
 *   ]
 * });
 * ```
 */
export const addChildTreesCommand: CommandDefinition<
  typeof AddChildTreesParamsSchema
> = {
  id: "node.addChildTrees",
  name: "批量添加子树",
  description: "批量添加子节点或创建多级树",
  category: "node",
  actionBased: true,
  paramsSchema: AddChildTreesParamsSchema,

  when: (root, params) => {
    if (!root.currentEditor) return false;

    const { parentId } = params;
    return root.currentEditor.nodes.has(parentId);
  },

  handler: (root, params): EditorAction[] => {
    const { parentId, children } = params;

    const parentNode = root.currentEditor?.nodes.get(parentId);
    if (!parentNode) return [];
    if (!children || children.length === 0) return [];

    const actions: EditorAction[] = [];

    /**
     * 递归创建节点树
     * @param parent 父节点
     * @param nodes 要创建的节点列表
     * @param startPosition 起始位置
     * @returns 创建的节点列表（按创建顺序，用于后续选中第一个）
     */
    function createNodes(
      parent: MindmapNode,
      nodes: NodeTree[],
      startPosition: number
    ): MindmapNode[] {
      const createdNodes: MindmapNode[] = [];

      nodes.forEach((nodeTree, index) => {
        const shortId = generateShortId();
        const position = startPosition + index;

        // 创建当前节点
        const newNode: MindmapNode = {
          id: crypto.randomUUID(),
          short_id: shortId,
          mindmap_id: root.currentEditor!.currentMindmap.id,
          parent_id: parent.id,
          parent_short_id: parent.short_id,
          title: nodeTree.title,
          note: nodeTree.note ?? null,
          order_index: position,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };

        actions.push(new AddNodeAction(newNode));
        createdNodes.push(newNode);

        // 递归创建子节点
        if (nodeTree.children && nodeTree.children.length > 0) {
          createNodes(newNode, nodeTree.children, 0);
        }
      });

      return createdNodes;
    }

    // 获取父节点的现有子节点数量，以确定起始位置
    const siblings = getChildNodes(root.currentEditor!, parentId);
    const createdNodes = createNodes(parentNode, children, siblings.length);

    // 选中第一个创建的节点
    if (createdNodes.length > 0 && root.currentEditor) {
      const firstNode = createdNodes[0];
      if (firstNode) {
        actions.push(
          new SetCurrentNodeAction({
            newNodeId: firstNode.short_id,
            oldNodeId: root.currentEditor.currentNode,
          })
        );
      }
    }

    return actions;
  },

  getDescription: (_root, params) => {
    const { children } = params;

    if (!children || children.length === 0) {
      return "创建节点树";
    }

    // 递归计算节点总数
    function countNodes(nodes: NodeTree[]): number {
      return nodes.reduce((sum, node) => {
        return sum + 1 + (node.children ? countNodes(node.children) : 0);
      }, 0);
    }

    const total = countNodes(children);
    const topLevel = children.length;

    // 如果所有节点都没有子节点，显示简单描述
    const hasNested = children.some(
      (node) => node.children && node.children.length > 0
    );

    if (!hasNested) {
      return `创建 ${total} 个子节点`;
    }

    return `创建节点树 (${topLevel} 个一级节点，共 ${total} 个节点)`;
  },
};

registerCommand(addChildTreesCommand);
