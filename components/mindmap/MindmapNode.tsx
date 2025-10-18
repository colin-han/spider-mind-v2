"use client";

import { useState, useRef, useEffect } from "react";
import { useMindmapEditorStore } from "@/lib/store/mindmap-editor.store";
import { useConfirm } from "@/components/ui/confirm-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { MindmapNode as MindmapNodeType } from "@/lib/types";
import toast from "react-hot-toast";
import { cn } from "@/lib/utils/cn";

interface MindmapNodeProps {
  node: MindmapNodeType;
  depth: number;
  hasChildren: boolean;
}

export function MindmapNode({ node, hasChildren }: MindmapNodeProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(node.title);
  const inputRef = useRef<HTMLInputElement>(null);
  const confirm = useConfirm();

  const {
    currentNode,
    collapsedNodes,
    setCurrentNode,
    updateNodeTitle,
    addChildNode,
    deleteNode,
  } = useMindmapEditorStore();

  const isSelected = currentNode === node.short_id;
  const isExpanded = !collapsedNodes.has(node.short_id);
  const isRoot = node.parent_id === null;

  // 自动 focus 输入框
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  // 进入编辑模式
  const handleDoubleClick = () => {
    setIsEditing(true);
    setEditValue(node.title);
  };

  // 保存编辑
  const handleSave = () => {
    const trimmedValue = editValue.trim();
    if (!trimmedValue) {
      toast.error("节点标题不能为空");
      return;
    }

    try {
      updateNodeTitle(node.short_id, trimmedValue);
      setIsEditing(false);
      toast.success("标题已更新");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "更新失败");
    }
  };

  // 取消编辑
  const handleCancel = () => {
    setEditValue(node.title);
    setIsEditing(false);
  };

  // 键盘事件
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSave();
    } else if (e.key === "Escape") {
      handleCancel();
    }
  };

  // 单击选中
  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentNode(node.short_id);
  };

  // 切换展开/折叠
  const toggleExpand = (e: React.MouseEvent) => {
    e.stopPropagation();

    useMindmapEditorStore.setState((state) => {
      if (isExpanded) {
        state.collapsedNodes.add(node.short_id);
      } else {
        state.collapsedNodes.delete(node.short_id);
      }
    });

    // 触发重新渲染
    setCurrentNode(node.short_id);
  };

  // 添加子节点
  const handleAddChild = (e: React.MouseEvent) => {
    e.stopPropagation();

    try {
      const newNode = addChildNode({
        parentId: node.short_id,
        position: 0,
        title: "新节点",
      });

      // 展开父节点
      useMindmapEditorStore.setState((state) => {
        state.collapsedNodes.delete(node.short_id);
      });

      // 选中新节点
      setCurrentNode(newNode.short_id);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "创建失败");
    }
  };

  // 删除节点
  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();

    const confirmed = await confirm({
      title: `确定要删除 "${node.title}" 吗?`,
      description: "此操作将同时删除该节点的所有子节点,且无法撤销。",
      confirmText: "确定删除",
      cancelText: "取消",
    });

    if (confirmed) {
      try {
        deleteNode(node.short_id);
        toast.success("节点已删除");
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "删除失败");
      }
    }
  };

  // 节点类型图标
  const getNodeIcon = () => {
    if (isRoot) return "👑";
    return "📄";
  };

  return (
    <div
      className={cn(
        "group flex items-center gap-2 py-2 px-3 rounded-lg transition-all cursor-pointer",
        "border-2",
        {
          "bg-blue-50 border-blue-500": isSelected,
          "border-transparent hover:bg-gray-50": !isSelected && !isEditing,
          "bg-blue-50 border-blue-300": isEditing,
        }
      )}
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
      data-testid={`mindmap-node-${node.short_id}`}
    >
      {/* 展开/折叠按钮 */}
      {hasChildren && (
        <button
          onClick={toggleExpand}
          className="w-5 h-5 flex items-center justify-center text-gray-500 hover:text-gray-700"
          data-testid={`toggle-expand-button-${node.short_id}`}
        >
          {isExpanded ? "▼" : "▶"}
        </button>
      )}

      {/* 占位符 (无子节点时) */}
      {!hasChildren && <div className="w-5" />}

      {/* 节点图标 */}
      <span className="text-lg">{getNodeIcon()}</span>

      {/* 节点标题 */}
      {isEditing ? (
        <div className="flex-1 flex items-center gap-2">
          <Input
            ref={inputRef}
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={handleSave}
            className="flex-1"
            data-testid={`node-title-input-${node.short_id}`}
          />
          <Button
            size="sm"
            variant="ghost"
            onClick={handleSave}
            data-testid={`save-title-button-${node.short_id}`}
          >
            ✓
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={handleCancel}
            data-testid={`cancel-title-button-${node.short_id}`}
          >
            ✕
          </Button>
        </div>
      ) : (
        <div
          className="flex-1 text-gray-900"
          data-testid={`node-title-${node.short_id}`}
        >
          {node.title}
        </div>
      )}

      {/* 操作按钮 (hover 显示) */}
      {!isEditing && (
        <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
          <Button
            size="sm"
            variant="ghost"
            onClick={handleAddChild}
            data-testid={`add-child-button-${node.short_id}`}
          >
            +
          </Button>
          {!isRoot && (
            <Button
              size="sm"
              variant="ghost"
              onClick={handleDelete}
              data-testid={`delete-node-button-${node.short_id}`}
            >
              ×
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
