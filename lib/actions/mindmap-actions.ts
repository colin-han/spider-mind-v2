"use server";

import { revalidatePath } from "next/cache";
import { createServerComponentClient } from "@/lib/supabase/server";
import { generateShortId } from "@/lib/utils/short-id";
import { requireAuth } from "@/lib/utils/auth-helpers";
import type {
  CreateMindmapResult,
  DeleteMindmapResult,
  MindmapInsert,
  MindmapNodeInsert,
} from "@/lib/types";

/**
 * 生成思维导图标题（带时间戳）
 * 格式：新思维导图 2025-10-01 14:30
 */
function generateMindmapTitle(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  const hours = String(now.getHours()).padStart(2, "0");
  const minutes = String(now.getMinutes()).padStart(2, "0");

  return `新思维导图 ${year}-${month}-${day} ${hours}:${minutes}`;
}

/**
 * 创建新的思维导图（包含根节点）
 * 自动生成标题和 short_id，创建根节点后返回 short_id 用于跳转
 */
export async function createMindmap(): Promise<CreateMindmapResult> {
  try {
    const user = await requireAuth();
    const supabase = await createServerComponentClient();

    const title = generateMindmapTitle();
    let mindmapShortId = generateShortId();
    let retries = 0;
    const maxRetries = 3;

    // 创建思维导图，处理 short_id 冲突
    let mindmapData = null;
    while (retries < maxRetries) {
      const mindmapInsert: MindmapInsert = {
        user_id: user.id,
        short_id: mindmapShortId,
        title,
        description: null,
      };

      const { data, error } = await supabase
        .from("mindmaps")
        .insert(mindmapInsert)
        .select("id, short_id")
        .single();

      if (!error) {
        mindmapData = data;
        break;
      }

      // 如果是唯一约束冲突，重试
      if (error.code === "23505") {
        retries++;
        mindmapShortId = generateShortId();
        continue;
      }

      // 其他错误直接返回
      return {
        success: false,
        error: error.message || "创建思维导图失败",
      };
    }

    if (!mindmapData) {
      return {
        success: false,
        error: "生成唯一 ID 失败，请重试",
      };
    }

    // 创建根节点
    const rootNodeShortId = generateShortId();
    const rootNodeInsert: MindmapNodeInsert = {
      mindmap_id: mindmapData.id,
      short_id: rootNodeShortId,
      node_type: "root",
      title,
      content: null,
      parent_id: null,
      order_index: 0,
    };

    const { error: nodeError } = await supabase
      .from("mindmap_nodes")
      .insert(rootNodeInsert);

    if (nodeError) {
      // 如果根节点创建失败，删除已创建的思维导图
      await supabase.from("mindmaps").delete().eq("id", mindmapData.id);

      return {
        success: false,
        error: nodeError.message || "创建根节点失败",
      };
    }

    // 刷新 dashboard 页面
    revalidatePath("/dashboard");

    return {
      success: true,
      shortId: mindmapData.short_id,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "创建失败，请重试",
    };
  }
}

/**
 * 软删除思维导图
 * 设置 deleted_at 字段，不实际删除数据
 */
export async function deleteMindmap(id: string): Promise<DeleteMindmapResult> {
  try {
    const user = await requireAuth();
    const supabase = await createServerComponentClient();

    // 软删除：设置 deleted_at
    const { error } = await supabase
      .from("mindmaps")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", id)
      .eq("user_id", user.id);

    if (error) {
      return {
        success: false,
        error: error.message || "删除失败",
      };
    }

    // 刷新 dashboard 页面
    revalidatePath("/dashboard");

    return {
      success: true,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "删除失败，请重试",
    };
  }
}
