import { requireAuth } from "@/lib/utils/auth-helpers";
import { createServerComponentClient } from "@/lib/supabase/server";
import { MindmapList } from "@/components/dashboard/MindmapList";
import type { MindmapListItem } from "@/lib/types";

export default async function DashboardPage() {
  const user = await requireAuth();
  const supabase = await createServerComponentClient();

  // 获取用户的所有思维导图（排除软删除的）
  const { data: mindmaps } = await supabase
    .from("mindmaps")
    .select("id, short_id, title, created_at, updated_at")
    .eq("user_id", user.id)
    .is("deleted_at", null)
    .order("updated_at", { ascending: false });

  return (
    <div data-testid="dashboard-content">
      <MindmapList mindmaps={(mindmaps as MindmapListItem[]) || []} />
    </div>
  );
}
