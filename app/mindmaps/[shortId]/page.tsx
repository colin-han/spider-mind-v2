import { requireAuth } from "@/lib/utils/auth-helpers";
import { createServerComponentClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";

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
    .select("id, short_id, title, description, created_at, updated_at")
    .eq("short_id", shortId)
    .eq("user_id", user.id)
    .is("deleted_at", null)
    .single();

  if (!mindmap) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white rounded-lg shadow p-8">
          <h1 className="text-3xl font-bold mb-4 text-gray-900">
            {mindmap.title}
          </h1>

          {mindmap.description && (
            <p className="text-gray-600 mb-6">{mindmap.description}</p>
          )}

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-2 text-blue-900">
              🚧 编辑器开发中
            </h2>
            <p className="text-blue-800 mb-4">
              思维导图编辑功能正在开发中，敬请期待！
            </p>
            <div className="space-y-2 text-sm text-gray-700">
              <p>
                <span className="font-medium">Short ID:</span>{" "}
                {mindmap.short_id}
              </p>
              <p>
                <span className="font-medium">创建时间:</span>{" "}
                {new Date(mindmap.created_at).toLocaleString("zh-CN")}
              </p>
              <p>
                <span className="font-medium">更新时间:</span>{" "}
                {new Date(mindmap.updated_at).toLocaleString("zh-CN")}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
