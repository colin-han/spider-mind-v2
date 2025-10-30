import { Mindmap, MindmapNode } from "../types";
import { EditorAction, EditorState, FocusedArea } from "./mindmap-store.types";

export class EditorStore implements EditorState {
  // 核心数据
  currentMindmap: Mindmap;
  nodes: Map<string, MindmapNode>; // key 是 short_id

  // UI 状态 (默认展开,仅记录折叠状态)
  collapsedNodes: Set<string> = new Set(); // 折叠的节点 short_id 集合

  // 焦点状态
  focusedArea: FocusedArea = "graph"; // UI 焦点区域
  currentNode: string = ""; // short_id

  isSaved: boolean = true; // 是否已保存

  constructor(
    // @ts-expect-error used future
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    private readonly root: EditorStore,
    mindmap: Mindmap,
    initialNodes: MindmapNode[]
  ) {
    this.currentMindmap = mindmap;
    this.nodes = new Map(initialNodes.map((node) => [node.short_id, node]));
    const rootNode = initialNodes.find((node) => !node.parent_id);
    if (!rootNode) {
      throw new Error("No root node found");
    }

    this.currentNode = rootNode!.short_id;
  }

  getChildNode(parentId: string): MindmapNode[] {
    return Array.from(this.nodes.values())
      .filter((node) => node.parent_id === parentId)
      .sort((a, b) => a.order_index - b.order_index);
  }

  getAscendantNode(nodeId: string): MindmapNode[] {
    const node = this.nodes.get(nodeId);
    if (!node) {
      return [];
    }
    const ancestors = [];
    let currentNode = node;
    while (currentNode.parent_id) {
      const parent = this.nodes.get(currentNode.parent_id);
      if (!parent) {
        break;
      }
      ancestors.push(parent);
      currentNode = parent;
    }
    return ancestors;
  }

  getDescendantNode(nodeId: string): MindmapNode[] {
    const node = this.nodes.get(nodeId);
    if (!node) {
      return [];
    }
    const descendants = [];
    const queue = [node];
    while (queue.length > 0) {
      const currentNode = queue.shift()!;
      const children = this.getChildNode(currentNode.id);
      descendants.push(...children);
      queue.push(...children);
    }
    return descendants;
  }

  async acceptAction(action: EditorAction): Promise<void> {
    await action.visitEditorState(this);
  }
}
