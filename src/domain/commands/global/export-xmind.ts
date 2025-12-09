/**
 * 导出思维导图为 XMind 格式
 *
 * XMind 文件是一个 ZIP 压缩包,包含以下内容：
 * - mimetype: MIME 类型声明
 * - META-INF/manifest.xml: 元数据清单
 * - content.xml: 思维导图内容（XML 格式）
 */

import { MindmapStore } from "../../mindmap-store.types";
import { CommandDefinition, registerCommand } from "../../command-registry";
import { EmptyParamsSchema } from "../../command-schema";
import JSZip from "jszip";
import {
  buildContentXml,
  buildManifestXml,
} from "@/lib/utils/export/xmind-builder";

/**
 * 导出思维导图为 XMind 格式
 */
export const exportXMindCommand: CommandDefinition<typeof EmptyParamsSchema> = {
  id: "global.exportXMind",
  name: "导出为 XMind",
  description: "导出当前思维导图为 XMind 格式",
  category: "global",
  actionBased: false,
  undoable: false,
  paramsSchema: EmptyParamsSchema,

  handler: async (root: MindmapStore, _params) => {
    const { currentEditor } = root;

    if (!currentEditor) {
      throw new Error("没有打开的思维导图");
    }

    const { currentMindmap, nodes } = currentEditor;

    // 检查是否有节点
    if (nodes.size === 0) {
      throw new Error("思维导图为空，无法导出");
    }

    try {
      // 1. 构建 XML 内容
      const contentXml = buildContentXml(currentMindmap, nodes);
      const manifestXml = buildManifestXml();

      // 2. 创建 ZIP 文件
      const zip = new JSZip();

      // mimetype 必须是第一个文件，且不压缩
      zip.file("mimetype", "application/vnd.xmind.workbook", {
        compression: "STORE", // 不压缩
      });

      // META-INF/manifest.xml
      zip.file("META-INF/manifest.xml", manifestXml);

      // content.xml
      zip.file("content.xml", contentXml);

      // 3. 生成 Blob
      const blob = await zip.generateAsync({
        type: "blob",
        compression: "DEFLATE",
        compressionOptions: {
          level: 9, // 最高压缩
        },
      });

      // 4. 找到根节点标题作为文件名
      const rootNode = Array.from(nodes.values()).find(
        (node) => node.parent_id === null
      );
      const filename = rootNode
        ? `${sanitizeFilename(rootNode.title)}.xmind`
        : "untitled.xmind";

      // 5. 触发下载
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      console.log(`XMind 文件已导出: ${filename}`);
    } catch (error) {
      console.error("导出 XMind 失败:", error);
      throw new Error(
        `导出失败: ${error instanceof Error ? error.message : "未知错误"}`
      );
    }
  },

  when: (root: MindmapStore) => {
    return root.currentEditor !== undefined;
  },
};

/**
 * 清理文件名中的非法字符
 *
 * @param filename - 原始文件名
 * @returns 清理后的文件名
 */
function sanitizeFilename(filename: string): string {
  // 移除或替换文件名中的非法字符
  return filename
    .replace(/[<>:"/\\|?*\x00-\x1F]/g, "_") // 替换非法字符为下划线
    .replace(/\s+/g, "_") // 替换空格为下划线
    .substring(0, 200); // 限制长度
}

registerCommand(exportXMindCommand);
