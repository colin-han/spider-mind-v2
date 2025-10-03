"use client";

import { useMindmapEditorStore } from "@/lib/store/mindmap-editor.store";
import { MindmapNode } from "./MindmapNode";

interface NodeTreeProps {
  nodeId: string;
  depth?: number;
}

export function NodeTree({ nodeId, depth = 0 }: NodeTreeProps) {
  const { getNode, getChildren, expandedNodes } = useMindmapEditorStore();

  const node = getNode(nodeId);
  const children = getChildren(nodeId);
  const isExpanded = expandedNodes.has(nodeId);

  if (!node) {
    return null;
  }

  return (
    <div>
      {/* 当前节点 */}
      <div style={{ marginLeft: `${depth * 24}px` }}>
        <MindmapNode
          node={node}
          depth={depth}
          hasChildren={children.length > 0}
        />
      </div>

      {/* 子节点 (仅在展开时显示) */}
      {isExpanded &&
        children.map((child) => (
          <NodeTree
            key={child.short_id}
            nodeId={child.short_id}
            depth={depth + 1}
          />
        ))}
    </div>
  );
}
