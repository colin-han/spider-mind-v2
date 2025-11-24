/**
 * XMind 文件构建器
 *
 * 负责将思维导图数据转换为 XMind 格式的 XML 内容
 */

import type { Mindmap, MindmapNode } from "@/lib/types";
import { escapeXml, generateTimestamp } from "./xml-utils";
import { getChildNodes } from "./tree-utils";

/**
 * 构建 XMind content.xml 内容
 *
 * @param _mindmap - 思维导图对象（暂未使用，保留供未来扩展）
 * @param nodes - 节点Map
 * @returns content.xml 的完整内容
 */
export function buildContentXml(
  _mindmap: Mindmap,
  nodes: Map<string, MindmapNode>
): string {
  // 找到根节点
  const rootNode = Array.from(nodes.values()).find(
    (node) => node.parent_id === null
  );

  if (!rootNode) {
    throw new Error("未找到根节点");
  }

  const timestamp = generateTimestamp();

  // 构建XML头部
  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
  xml += '<xmap-content xmlns="urn:xmind:xmap:xmlns:content:2.0" ';
  xml += 'xmlns:fo="http://www.w3.org/1999/XSL/Format" ';
  xml += 'version="2.0">\n';

  // Sheet
  xml += `  <sheet id="sheet1" timestamp="${timestamp}">\n`;
  xml += `    <title>Sheet 1</title>\n`;

  // 根节点（带 structure-class）
  xml += buildRootTopicXml(rootNode, nodes, timestamp);

  xml += "  </sheet>\n";
  xml += "</xmap-content>";

  return xml;
}

/**
 * 构建根节点 XML（包含 structure-class）
 *
 * @param node - 根节点
 * @param nodes - 节点Map
 * @param timestamp - 时间戳
 * @returns 根节点的 XML 字符串
 */
function buildRootTopicXml(
  node: MindmapNode,
  nodes: Map<string, MindmapNode>,
  timestamp: number
): string {
  let xml = `    <topic id="${escapeXml(node.short_id)}" `;
  xml += `timestamp="${timestamp}" `;
  xml += 'structure-class="org.xmind.ui.map.unbalanced">\n';
  xml += `      <title>${escapeXml(node.title)}</title>\n`;

  // 备注
  if (node.note && node.note.trim()) {
    xml += "      <notes>\n";
    xml += "        <plain>\n";
    xml += `          <content>${escapeXml(node.note)}</content>\n`;
    xml += "        </plain>\n";
    xml += "      </notes>\n";
  }

  // 子节点
  const children = getChildNodes(node.short_id, nodes);
  if (children.length > 0) {
    xml += "      <children>\n";
    xml += '        <topics type="attached">\n';
    children.forEach((child) => {
      xml += buildTopicXml(child, nodes, timestamp, 10); // 缩进10个空格
    });
    xml += "        </topics>\n";
    xml += "      </children>\n";
  }

  xml += "    </topic>\n";
  return xml;
}

/**
 * 递归构建普通节点 XML
 *
 * @param node - 节点
 * @param nodes - 节点Map
 * @param timestamp - 时间戳
 * @param indent - 缩进空格数
 * @returns 节点的 XML 字符串
 */
function buildTopicXml(
  node: MindmapNode,
  nodes: Map<string, MindmapNode>,
  timestamp: number,
  indent: number
): string {
  const prefix = " ".repeat(indent);
  let xml = `${prefix}<topic id="${escapeXml(node.short_id)}" `;
  xml += `timestamp="${timestamp}">\n`;
  xml += `${prefix}  <title>${escapeXml(node.title)}</title>\n`;

  // 备注
  if (node.note && node.note.trim()) {
    xml += `${prefix}  <notes>\n`;
    xml += `${prefix}    <plain>\n`;
    xml += `${prefix}      <content>${escapeXml(node.note)}</content>\n`;
    xml += `${prefix}    </plain>\n`;
    xml += `${prefix}  </notes>\n`;
  }

  // 递归处理子节点
  const children = getChildNodes(node.short_id, nodes);
  if (children.length > 0) {
    xml += `${prefix}  <children>\n`;
    xml += `${prefix}    <topics type="attached">\n`;
    children.forEach((child) => {
      xml += buildTopicXml(child, nodes, timestamp, indent + 6);
    });
    xml += `${prefix}    </topics>\n`;
    xml += `${prefix}  </children>\n`;
  }

  xml += `${prefix}</topic>\n`;
  return xml;
}

/**
 * 构建 manifest.xml
 *
 * @returns manifest.xml 的完整内容
 */
export function buildManifestXml(): string {
  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
  xml += '<manifest xmlns="urn:xmind:xmap:xmlns:manifest:1.0">\n';
  xml += '  <file-entry full-path="content.xml" media-type="text/xml"/>\n';
  xml += "</manifest>";
  return xml;
}
