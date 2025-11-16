import { EditorAction, EditorState } from "../mindmap-store.types";
import { IDBPDatabase } from "idb";
import { MindmapDB } from "@/lib/db/schema";
import { AIMessage } from "@/lib/types/ai";

/**
 * AI 消息添加 Action
 *
 * 注意：AI 对话消息是交互记录，不需要撤销能力
 */
export class AddAIMessageAction implements EditorAction {
  type = "ADD_AI_MESSAGE" as const;

  constructor(private readonly message: AIMessage) {}

  applyToEditorState(_draft: EditorState): void {
    // AI 消息不影响编辑器核心状态
    // 无需修改 EditorState
  }

  async applyToIndexedDB(db: IDBPDatabase<MindmapDB>): Promise<void> {
    // 标记为 dirty，等待 save 时同步
    await db.put("ai_messages", {
      ...this.message,
      dirty: true, // 标记需要同步
      local_id: this.message.id, // 保存本地 ID
      // server_id 在同步后填充
    });
  }

  reverse(): EditorAction {
    // AI 对话消息不支持撤销
    // 返回一个空操作
    return new NoOpAction();
  }
}

/**
 * 空操作（用于不支持撤销的 Action）
 */
class NoOpAction implements EditorAction {
  type = "NO_OP" as const;

  applyToEditorState(_draft: EditorState): void {
    // 无操作
  }

  reverse(): EditorAction {
    return this;
  }
}
