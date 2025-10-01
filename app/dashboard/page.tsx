import { requireAuth } from "@/lib/utils/auth-helpers";
import { createServerComponentClient } from "@/lib/supabase/server";
import { MindMapList } from "@/components/dashboard/MindMapList";
import type { MindMapListItem } from "@/lib/types";

export default async function DashboardPage() {
  const user = await requireAuth();
  const supabase = await createServerComponentClient();

  // 获取用户的所有思维导图（排除软删除的）
  const { data: mindMaps } = await supabase
    .from("mind_maps")
    .select("id, short_id, title, description, created_at, updated_at")
    .eq("user_id", user.id)
    .is("deleted_at", null)
    .order("updated_at", { ascending: false });

  return (
    <div data-testid="dashboard-content">
      <MindMapList mindMaps={(mindMaps as MindMapListItem[]) || []} />
    </div>
  );
}
