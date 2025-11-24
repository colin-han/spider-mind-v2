import { requireAuth } from "@/lib/utils/auth-helpers";
import { createServerComponentClient } from "@/lib/supabase/server";
import { MindmapListClient } from "@/components/dashboard/mindmap-list-client";
import type { MindmapListItem } from "@/lib/types";

export default async function DashboardPage() {
  const user = await requireAuth();
  const supabase = await createServerComponentClient();

  // 使用JOIN查询，一次性获取mindmaps和根节点title
  const { data: rawData } = await supabase
    .from("mindmaps")
    .select(
      `
      id,
      short_id,
      created_at,
      updated_at,
      root_node:mindmap_nodes!inner(title)
    `
    )
    .eq("user_id", user.id)
    .is("deleted_at", null)
    .is("mindmap_nodes.parent_short_id", null)
    .order("updated_at", { ascending: false });

  // 定义 JOIN 查询返回的数据类型
  type MindmapWithRootNode = {
    id: string;
    short_id: string;
    created_at: string;
    updated_at: string;
    root_node: { title: string } | { title: string }[] | null;
  };

  // 转换数据格式
  const mindmaps: MindmapListItem[] = (rawData || []).map(
    (item: MindmapWithRootNode) => ({
      id: item.id,
      short_id: item.short_id,
      created_at: item.created_at,
      updated_at: item.updated_at,
      title: Array.isArray(item.root_node)
        ? item.root_node[0]?.title || "未命名思维导图"
        : item.root_node?.title || "未命名思维导图",
    })
  );

  return (
    <div data-testid="dashboard-content">
      <MindmapListClient initialMindmaps={mindmaps} />
    </div>
  );
}
