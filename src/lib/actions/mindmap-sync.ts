"use server";

import { createServerComponentClient } from "@/lib/supabase/server";
import type { Mindmap, MindmapNode } from "@/lib/types";

/**
 * 按层级顺序排序节点（父节点优先）
 *
 * 目的：确保在批量插入节点时，父节点总是在子节点之前被插入
 * 避免外键约束错误（子节点的parent_id必须指向已存在的父节点）
 *
 * 算法：广度优先遍历（BFS）
 * 1. 构建节点ID到节点的映射
 * 2. 构建父节点ID到子节点列表的映射
 * 3. 从根节点开始，按层级遍历所有节点
 */
function sortNodesByHierarchy(
  nodes: Partial<MindmapNode>[]
): Partial<MindmapNode>[] {
  if (nodes.length === 0) return [];

  // 构建节点映射
  const nodeMap = new Map<string, Partial<MindmapNode>>();
  const childrenMap = new Map<string, Partial<MindmapNode>[]>();

  // 填充映射
  for (const node of nodes) {
    if (!node.id) continue;
    nodeMap.set(node.id, node);

    const parentId = node.parent_id;
    if (parentId) {
      if (!childrenMap.has(parentId)) {
        childrenMap.set(parentId, []);
      }
      childrenMap.get(parentId)!.push(node);
    }
  }

  // 按层级排序（BFS）
  const sorted: Partial<MindmapNode>[] = [];
  const queue: Partial<MindmapNode>[] = [];

  // 找到所有根节点（parent_id不在当前节点列表中的节点）
  for (const node of nodes) {
    const parentId = node.parent_id;
    if (!parentId || !nodeMap.has(parentId)) {
      queue.push(node);
    }
  }

  // BFS遍历
  while (queue.length > 0) {
    const current = queue.shift()!;
    sorted.push(current);

    // 添加当前节点的所有子节点到队列
    const children = childrenMap.get(current.id!) || [];
    queue.push(...children);
  }

  return sorted;
}

/**
 * 从服务器获取完整的思维导图数据（mindmap + nodes）
 */
export async function fetchMindmapData(mindmapId: string): Promise<{
  mindmap: Mindmap;
  nodes: MindmapNode[];
}> {
  const supabase = await createServerComponentClient();

  // 获取当前用户
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Unauthorized");
  }

  // 获取思维导图
  const { data: mindmap, error: mindmapError } = await supabase
    .from("mindmaps")
    .select("*")
    .eq("short_id", mindmapId)
    .eq("user_id", user.id)
    .is("deleted_at", null)
    .single();

  if (mindmapError || !mindmap) {
    throw new Error(`Mindmap not found: ${mindmapError?.message}`);
  }

  // 获取所有节点
  const { data: nodes, error: nodesError } = await supabase
    .from("mindmap_nodes")
    .select("*")
    .eq("mindmap_id", mindmap.id)
    .order("order_index", { ascending: true });

  if (nodesError) {
    throw new Error(`Failed to load nodes: ${nodesError.message}`);
  }

  return {
    mindmap,
    nodes: nodes || [],
  };
}

/**
 * 获取服务器端思维导图的版本信息
 */
export async function fetchServerVersion(mindmapId: string): Promise<{
  updated_at: string;
}> {
  const supabase = await createServerComponentClient();

  // 获取当前用户
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Unauthorized");
  }

  // 获取思维导图版本信息
  const { data: mindmap, error } = await supabase
    .from("mindmaps")
    .select("updated_at")
    .eq("short_id", mindmapId)
    .eq("user_id", user.id)
    .is("deleted_at", null)
    .maybeSingle();

  if (error) {
    console.error("[fetchServerVersion] Database error:", error);
    throw new Error(`Failed to fetch mindmap version: ${error.message}`);
  }

  if (!mindmap) {
    console.error("[fetchServerVersion] Mindmap not found:", {
      mindmapId,
      userId: user.id,
    });
    throw new Error(`Mindmap not found or access denied: ${mindmapId}`);
  }

  return {
    updated_at: mindmap.updated_at,
  };
}

/**
 * 上传思维导图修改到服务器
 */
export async function uploadMindmapChanges(data: {
  mindmapId: string;
  mindmap?: Partial<Mindmap> | undefined;
  nodes: Partial<MindmapNode>[];
  deletedNodeIds?: string[]; // 需要删除的节点 ID 列表
}): Promise<{
  updated_at: string;
}> {
  const supabase = await createServerComponentClient();

  // 获取当前用户
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Unauthorized");
  }

  // 开始数据库事务（通过顺序执行来模拟）
  try {
    let updatedAt: string;

    // 1. 更新思维导图元数据（如果有修改）
    if (data.mindmap) {
      // 更新mindmap的updated_at
      // 注意：title字段已移除，统一使用根节点title
      const updateData: Record<string, string> = {
        updated_at: new Date().toISOString(),
      };

      const { data: updatedMindmap, error } = await supabase
        .from("mindmaps")
        .update(updateData)
        .eq("short_id", data.mindmapId)
        .eq("user_id", user.id)
        .select("updated_at")
        .single();

      if (error || !updatedMindmap) {
        throw new Error(`Failed to update mindmap: ${error?.message}`);
      }

      updatedAt = updatedMindmap.updated_at;
    } else {
      // 如果没有更新 mindmap，获取当前版本
      const { data: currentMindmap, error } = await supabase
        .from("mindmaps")
        .select("id, updated_at")
        .eq("short_id", data.mindmapId)
        .eq("user_id", user.id)
        .single();

      if (error || !currentMindmap) {
        throw new Error(`Failed to fetch mindmap: ${error?.message}`);
      }

      updatedAt = currentMindmap.updated_at;
    }

    // 2. 先删除已标记删除的节点（必须在更新节点之前）
    // 原因：避免外键约束错误（要更新的节点可能引用即将被删除的父节点）
    if (data.deletedNodeIds && data.deletedNodeIds.length > 0) {
      const { error: deleteError } = await supabase
        .from("mindmap_nodes")
        .delete()
        .in("id", data.deletedNodeIds);

      if (deleteError) {
        throw new Error(`Failed to delete nodes: ${deleteError.message}`);
      }

      // 更新 mindmap 的 updated_at（因为节点有删除）
      const { data: finalMindmap, error: finalError } = await supabase
        .from("mindmaps")
        .update({
          updated_at: new Date().toISOString(),
        })
        .eq("short_id", data.mindmapId)
        .eq("user_id", user.id)
        .select("updated_at")
        .single();

      if (finalError || !finalMindmap) {
        throw new Error(
          `Failed to update mindmap timestamp: ${finalError?.message}`
        );
      }

      updatedAt = finalMindmap.updated_at;
    }

    // 3. 批量上传节点（使用 UPSERT）
    if (data.nodes.length > 0) {
      // 获取 mindmap.id 用于节点更新
      const { data: mindmap, error: mindmapError } = await supabase
        .from("mindmaps")
        .select("id")
        .eq("short_id", data.mindmapId)
        .eq("user_id", user.id)
        .single();

      if (mindmapError || !mindmap) {
        throw new Error(`Failed to fetch mindmap: ${mindmapError?.message}`);
      }

      const currentTime = new Date().toISOString();

      // ✅ 按层级顺序排序节点（父节点优先）
      // 避免外键约束错误：子节点的parent_id必须指向已存在的父节点
      const sortedNodes = sortNodesByHierarchy(data.nodes);

      // ✅ 使用 UPSERT 批量上传节点（支持新增和更新）
      const nodesToUpsert = sortedNodes.map((node) => ({
        id: node.id!,
        short_id: node.short_id!,
        mindmap_id: mindmap.id,
        parent_id: node.parent_id!,
        parent_short_id: node.parent_short_id!,
        title: node.title!,
        note: node.note ?? null,
        order_index: node.order_index!,
        created_at: node.created_at!,
        updated_at: currentTime,
      }));

      const { error: nodesError } = await supabase
        .from("mindmap_nodes")
        .upsert(nodesToUpsert, {
          onConflict: "id", // 根据 id 判断是插入还是更新
        });

      if (nodesError) {
        throw new Error(`Failed to upsert nodes: ${nodesError.message}`);
      }

      // 更新 mindmap 的 updated_at（因为节点有变化）
      const { data: finalMindmap, error: finalError } = await supabase
        .from("mindmaps")
        .update({
          updated_at: currentTime,
        })
        .eq("short_id", data.mindmapId)
        .eq("user_id", user.id)
        .select("updated_at")
        .single();

      if (finalError || !finalMindmap) {
        throw new Error(
          `Failed to update mindmap timestamp: ${finalError?.message}`
        );
      }

      updatedAt = finalMindmap.updated_at;
    }

    return {
      updated_at: updatedAt,
    };
  } catch (error) {
    console.error("[uploadMindmapChanges] Error:", error);
    throw error;
  }
}
