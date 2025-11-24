/**
 * MindmapListClient - 思维导图列表客户端组件
 *
 * 职责:
 * - 接收服务器端JOIN查询的基线数据
 * - 从IndexedDB查询根节点title并覆盖基线数据
 * - 提供渐进增强的用户体验（立即显示→异步更新）
 *
 * 架构:
 * - 服务器端：JOIN查询提供快速首屏
 * - 客户端：IndexedDB覆盖保证数据最新
 */

"use client";

import { useEffect, useState } from "react";
import { getDB } from "@/lib/db/schema";
import { MindmapList } from "./mindmap-list";
import type { MindmapListItem } from "@/lib/types";

interface Props {
  initialMindmaps: MindmapListItem[];
}

export function MindmapListClient({ initialMindmaps }: Props) {
  // 使用服务器返回的数据作为初始值，立即渲染
  const [mindmaps, setMindmaps] = useState<MindmapListItem[]>(initialMindmaps);

  useEffect(() => {
    async function enrichWithIndexedDB() {
      try {
        const db = await getDB();

        // 并行查询所有mindmap的根节点title
        const enriched = await Promise.all(
          initialMindmaps.map(async (mindmap) => {
            try {
              // 从IndexedDB查询根节点
              const nodeIndex = db
                .transaction("mindmap_nodes")
                .store.index("by-mindmap");
              const nodes = await nodeIndex.getAll(mindmap.id);
              const rootNode = nodes.find((n) => !n.parent_short_id);

              // 如果找到IndexedDB中的数据，覆盖服务器返回的title
              if (rootNode) {
                return {
                  ...mindmap,
                  title: rootNode.title,
                };
              }

              // 否则保持服务器返回的数据
              return mindmap;
            } catch (error) {
              console.error(
                `Failed to query IndexedDB for mindmap ${mindmap.id}:`,
                error
              );
              // 出错时保持服务器返回的数据
              return mindmap;
            }
          })
        );

        // 更新状态（只有当title确实发生变化时才更新）
        setMindmaps(enriched);
      } catch (error) {
        console.error("Failed to enrich mindmaps with IndexedDB:", error);
        // 出错时保持服务器返回的数据
      }
    }

    enrichWithIndexedDB();
  }, [initialMindmaps]);

  return <MindmapList mindmaps={mindmaps} />;
}
