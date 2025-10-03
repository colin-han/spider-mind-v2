"use client";

import { useMindmapEditorStore } from "@/lib/store/mindmap-editor.store";
import { NodeTree } from "./NodeTree";
import { Button } from "@/components/ui/button";
import toast from "react-hot-toast";

interface FloatingNodeListProps {
  mindmapId: string;
}

export function FloatingNodeList({ mindmapId }: FloatingNodeListProps) {
  const { getFloatingNodes, createFloatingNode, selectNode } =
    useMindmapEditorStore();

  const floatingNodes = getFloatingNodes(mindmapId);

  const handleAddFloating = () => {
    try {
      const newNode = createFloatingNode({
        mindmapId,
        position: floatingNodes.length,
        title: "新浮动节点",
      });

      selectNode(newNode.short_id);
      toast.success("浮动节点已创建");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "创建失败");
    }
  };

  return (
    <div className="bg-white rounded-lg shadow p-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900">浮动节点</h2>
        <Button
          size="sm"
          variant="secondary"
          onClick={handleAddFloating}
          data-testid="add-floating-button"
        >
          + 新建
        </Button>
      </div>

      <div className="border-t border-gray-200 pt-4">
        {floatingNodes.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-4">暂无浮动节点</p>
        ) : (
          <div className="space-y-2">
            {floatingNodes.map((node) => (
              <div
                key={node.short_id}
                data-testid={`floating-node-${node.short_id}`}
              >
                <NodeTree nodeId={node.short_id} depth={0} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
