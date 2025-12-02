/**
 * Markdown 导出工具
 *
 * 提供将思维导图节点树转换为 Markdown 格式的功能
 */

import { MindmapNode } from "@/lib/types";

/**
 * 从指定节点开始生成 Markdown 文本
 *
 * @param node - 起始节点
 * @param allNodes - 所有节点的 Map
 * @param level - 当前层级（1 表示根节点）
 * @returns Markdown 格式的文本
 */
export function buildMarkdownFromNode(
  node: MindmapNode,
  allNodes: Map<string, MindmapNode>,
  level: number
): string {
  const lines: string[] = [];

  // 1. 生成当前节点的标题
  const headingPrefix = "#".repeat(level);
  const escapedTitle = escapeMarkdownTitle(node.title);
  lines.push(`${headingPrefix} ${escapedTitle}`);
  lines.push(""); // 空行

  // 2. 处理笔记内容
  if (node.note) {
    const formattedNote = formatNoteContent(node.note);
    lines.push(formattedNote);
    lines.push(""); // 空行
  }

  // 3. 递归处理子节点
  const children = getChildNodes(node.short_id, allNodes);

  for (const child of children) {
    const childMarkdown = buildMarkdownFromNode(child, allNodes, level + 1);
    lines.push(childMarkdown);
  }

  return lines.join("\n");
}

/**
 * 转义标题中的 Markdown 特殊字符
 *
 * @param title - 原始标题
 * @returns 转义后的标题
 */
function escapeMarkdownTitle(title: string): string {
  // 需要转义的 Markdown 特殊字符
  // 注意：反斜杠必须首先处理，避免双重转义
  const specialChars = [
    "\\", // 反斜杠（必须首先处理）
    "`", // 反引号
    "*", // 星号
    "_", // 下划线
    "[", // 左方括号
    "]", // 右方括号
    "{", // 左花括号
    "}", // 右花括号
    "(", // 左圆括号
    ")", // 右圆括号
    "#", // 井号
    "+", // 加号
    "-", // 减号
    ".", // 句点
    "!", // 感叹号
    "|", // 竖线
  ];

  let escaped = title;
  for (const char of specialChars) {
    // 使用正则表达式全局替换，确保所有字符都被转义
    const regex = new RegExp(char.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g");
    escaped = escaped.replace(regex, `\\${char}`);
  }

  return escaped;
}

/**
 * 格式化笔记内容
 * - 如果不包含 #，直接输出
 * - 如果包含 #，使用 markdown 代码块包裹
 * - 如果包含代码块标记，自动增加反引号数量
 *
 * @param note - 原始笔记内容
 * @returns 格式化后的笔记内容
 */
function formatNoteContent(note: string): string {
  // 检查是否包含 #
  const hasHashSymbol = note.includes("#");

  if (!hasHashSymbol) {
    // 不包含 #，直接输出
    return note;
  }

  // 包含 #，需要用 markdown 代码块包裹
  // 找到合适的代码块标记
  const fenceMarker = findCodeFenceMarker(note);

  return `${fenceMarker}markdown\n${note}\n${fenceMarker}`;
}

/**
 * 找到合适的代码块标记
 * 从 ``` 开始，如果 note 中已包含，则增加反引号数量
 *
 * @param note - 笔记内容
 * @returns 代码块标记（如 ```、````、`````等）
 */
function findCodeFenceMarker(note: string): string {
  let backtickCount = 3; // 从 3 个反引号开始

  while (backtickCount <= 20) {
    // 设置上限防止无限循环
    const marker = "`".repeat(backtickCount);
    if (!note.includes(marker)) {
      return marker;
    }
    backtickCount++;
  }

  // 如果超过 20 个反引号还没找到，抛出错误
  throw new Error("无法找到合适的代码块标记");
}

/**
 * 获取指定节点的所有子节点，按 order_index 排序
 *
 * @param parentShortId - 父节点的 short_id
 * @param allNodes - 所有节点的 Map
 * @returns 排序后的子节点数组
 */
function getChildNodes(
  parentShortId: string,
  allNodes: Map<string, MindmapNode>
): MindmapNode[] {
  const children: MindmapNode[] = [];

  for (const node of allNodes.values()) {
    if (node.parent_short_id === parentShortId) {
      children.push(node);
    }
  }

  // 按 order_index 排序
  children.sort((a, b) => a.order_index - b.order_index);

  return children;
}
