/**
 * AI 对话历史持久化服务
 *
 * 提供对话历史的加载和保存功能
 */
import { getDB } from "@/lib/db/schema";
import { AIMessage } from "@/lib/types/ai";
import { UIMessage } from "ai";
import { supabase } from "@/lib/supabase/client";
import { Json } from "@/lib/types/supabase";

/**
 * 加载节点的对话历史
 *
 * 优先从本地 IndexedDB 加载，如果本地没有则从云端拉取
 */
export async function loadConversation(nodeId: string): Promise<UIMessage[]> {
  const db = await getDB();

  // 先尝试从本地加载
  let messages = await db.getAllFromIndex("ai_messages", "by-node", nodeId);

  // 如果本地没有，从云端加载
  if (messages.length === 0) {
    messages = await loadConversationFromServer(nodeId);

    // 缓存到本地 IndexedDB
    if (messages.length > 0) {
      const tx = db.transaction("ai_messages", "readwrite");
      for (const msg of messages) {
        await tx.store.put(msg);
      }
      await tx.done;
    }
  }

  // 按时间排序
  messages.sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );

  // 转换为 UIMessage 格式
  return messages.map((msg) => ({
    id: msg.id,
    role: msg.role,
    parts: msg.parts,
  }));
}

/**
 * 从 Supabase 加载节点的对话历史
 */
async function loadConversationFromServer(
  nodeId: string
): Promise<AIMessage[]> {
  const { data, error } = await supabase
    .from("ai_messages")
    .select("*")
    .eq("node_id", nodeId)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("Failed to load conversation from server:", error.message);
    return [];
  }

  if (!data || data.length === 0) {
    return [];
  }

  // 转换为本地格式
  return data.map((serverMsg) => {
    const message: AIMessage = {
      id: serverMsg.id, // 使用 server_id 作为本地 ID
      role: serverMsg.role as "user" | "assistant",
      parts: serverMsg.parts as UIMessage["parts"],
      nodeId: serverMsg.node_id,
      mindmapId: serverMsg.mindmap_id,
      createdAt: serverMsg.created_at,
      dirty: false,
      local_id: serverMsg.id,
      server_id: serverMsg.id,
      synced_at: serverMsg.created_at,
    };

    // 只有当 metadata 存在时才添加
    if (serverMsg.metadata) {
      message.metadata = serverMsg.metadata as {
        operations?: unknown[];
        operationsApplied?: boolean;
        [key: string]: unknown;
      };
    }

    return message;
  });
}

/**
 * 检查节点是否有对话历史
 */
export async function hasConversation(nodeId: string): Promise<boolean> {
  const db = await getDB();
  const messages = await db.getAllFromIndex("ai_messages", "by-node", nodeId);
  return messages.length > 0;
}

/**
 * 获取对话统计信息
 */
export async function getConversationStats(nodeId: string): Promise<{
  messageCount: number;
  firstMessageAt?: string;
  lastMessageAt?: string;
}> {
  const db = await getDB();
  const messages = await db.getAllFromIndex("ai_messages", "by-node", nodeId);

  if (messages.length === 0) {
    return { messageCount: 0 };
  }

  messages.sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );

  // 已经在上面检查了 messages.length > 0，所以这里可以安全使用非空断言
  const firstMessage = messages[0]!;
  const lastMessage = messages[messages.length - 1]!;

  return {
    messageCount: messages.length,
    firstMessageAt: firstMessage.createdAt,
    lastMessageAt: lastMessage.createdAt,
  };
}

/**
 * 创建 AI 消息对象
 *
 * 用于创建符合 AIMessage 接口的消息对象
 */
export function createAIMessage(
  id: string,
  role: "user" | "assistant",
  parts: UIMessage["parts"],
  nodeId: string,
  mindmapId: string,
  metadata?: AIMessage["metadata"]
): AIMessage {
  const message: AIMessage = {
    id,
    role,
    parts,
    nodeId,
    mindmapId,
    createdAt: new Date().toISOString(),
    dirty: true,
    local_id: id,
  };

  // 只有当 metadata 存在时才添加
  if (metadata) {
    message.metadata = metadata;
  }

  return message;
}

/**
 * 同步 AI 消息到 Supabase
 *
 * 将所有 dirty 的消息上传到服务器
 */
export async function syncAIMessages(mindmapId: string): Promise<void> {
  const db = await getDB();

  // 获取该思维导图下所有未同步的消息
  const allMessages = await db.getAllFromIndex(
    "ai_messages",
    "by-mindmap",
    mindmapId
  );

  const dirtyMessages = allMessages.filter((m) => m.dirty);

  if (dirtyMessages.length === 0) {
    return; // 无需同步
  }

  console.log(`Syncing ${dirtyMessages.length} AI messages to server`);

  // 获取当前用户
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("User not authenticated");
  }

  // 批量插入新消息（AI 消息只会新增，不会更新）
  const { data, error } = await supabase
    .from("ai_messages")
    .insert(
      dirtyMessages.map((msg) => ({
        node_id: msg.nodeId,
        mindmap_id: msg.mindmapId,
        user_id: user.id,
        role: msg.role,
        parts: msg.parts as unknown as Json,
        created_at: msg.createdAt,
        metadata: (msg.metadata ?? null) as Json | null,
      }))
    )
    .select("id");

  if (error) {
    throw new Error(`Failed to sync AI messages: ${error.message}`);
  }

  if (!data || data.length !== dirtyMessages.length) {
    throw new Error("Unexpected response from server");
  }

  // 更新本地记录：标记为已同步，记录 server_id
  const tx = db.transaction("ai_messages", "readwrite");
  for (let i = 0; i < dirtyMessages.length; i++) {
    // 已在上面检查了 data.length === dirtyMessages.length，所以可以安全使用非空断言
    const localMessage = dirtyMessages[i]!;
    const serverId = data[i]!.id;

    await tx.store.put({
      ...localMessage,
      dirty: false,
      server_id: serverId,
      synced_at: new Date().toISOString(),
    });
  }
  await tx.done;

  console.log(`Successfully synced ${dirtyMessages.length} AI messages`);
}
