/**
 * 复制为 Markdown 命令
 *
 * 将当前选中的节点及其所有子节点导出为 Markdown 格式，并复制到系统剪贴板
 */

import { MindmapStore } from "../../mindmap-store.types";
import { CommandDefinition, registerCommand } from "../../command-registry";
import { EmptyParamsSchema } from "../../command-schema";
import { buildMarkdownFromNode } from "@/lib/utils/export/markdown-builder";

/**
 * 复制为 Markdown 命令
 */
export const copyAsMarkdownCommand: CommandDefinition<
  typeof EmptyParamsSchema
> = {
  id: "global.copyAsMarkdown",
  name: "复制为 Markdown",
  description: "将当前选中的节点及其子节点复制为 Markdown 格式",
  category: "global",
  actionBased: false, // ���需要 undo/redo
  undoable: false,
  paramsSchema: EmptyParamsSchema,

  handler: async (root: MindmapStore, _params) => {
    const { currentEditor } = root;

    if (!currentEditor) {
      throw new Error("没有打开的思维导图");
    }

    const { currentNode, nodes } = currentEditor;

    if (!currentNode) {
      throw new Error("未选中节点");
    }

    // 获取当前选中的节点
    const node = nodes.get(currentNode);
    if (!node) {
      throw new Error("节点不存在");
    }

    try {
      // 生成 Markdown 文本
      const markdown = buildMarkdownFromNode(node, nodes, 1);

      // 复制到剪贴板
      await navigator.clipboard.writeText(markdown);

      console.log("已复制为 Markdown");

      // TODO: 可选 - 显示成功提示（使用 toast 通知）
    } catch (error) {
      console.error("复制为 Markdown 失败:", error);

      // 特殊处理剪贴板权限错误
      if (error instanceof DOMException && error.name === "NotAllowedError") {
        throw new Error("剪贴板权限被拒绝，请允许访问剪贴板");
      }

      throw new Error(
        `复制失败: ${error instanceof Error ? error.message : "未知错误"}`
      );
    }
  },

  when: (root: MindmapStore) => {
    // 需要有打开的编辑器，且选中了节点
    return (
      root.currentEditor !== undefined &&
      root.currentEditor.currentNode !== undefined
    );
  },
};

registerCommand(copyAsMarkdownCommand);
