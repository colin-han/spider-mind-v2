import { requireAuth } from "@/lib/utils/auth-helpers";
import { createServerComponentClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { MindmapEditor } from "@/components/mindmap/mindmap-editor-container";

interface MindmapPageProps {
  params: Promise<{
    shortId: string;
  }>;
}

export default async function MindmapPage({ params }: MindmapPageProps) {
  const user = await requireAuth();
  const { shortId } = await params;
  const supabase = await createServerComponentClient();

  // 获取思维导图
  const { data: mindmap } = await supabase
    .from("mindmaps")
    .select("*")
    .eq("short_id", shortId)
    .eq("user_id", user.id)
    .is("deleted_at", null)
    .single();

  if (!mindmap) {
    notFound();
  }

  // 获取所有节点
  const { data: nodes } = await supabase
    .from("mindmap_nodes")
    .select("*")
    .eq("mindmap_id", mindmap.id)
    .order("order_index", { ascending: true });

  if (!nodes) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-red-500">错误: 无法加载节点数据</div>
      </div>
    );
  }

  return <MindmapEditor mindmap={mindmap} initialNodes={nodes} />;
}
