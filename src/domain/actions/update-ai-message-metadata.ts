import { EditorAction, EditorState } from "../mindmap-store.types";
import { IDBPDatabase } from "idb";
import { MindmapDB } from "@/lib/db/schema";
import { AIMessage } from "@/lib/types/ai";

/**
 * AI 消息元数据更新 Action
 *
 * 用于更新 AI 消息的 metadata，例如标记操作已执行
 */
export class UpdateAIMessageMetadataAction implements EditorAction {
  type = "UPDATE_AI_MESSAGE_METADATA" as const;

  constructor(
    private readonly messageId: string,
    private readonly metadataUpdate: Partial<NonNullable<AIMessage["metadata"]>>
  ) {}

  applyToEditorState(_draft: EditorState): void {
    // AI 消息不影响编辑器核心状态
    // 无需修改 EditorState
  }

  async applyToIndexedDB(db: IDBPDatabase<MindmapDB>): Promise<void> {
    // 获取现有消息
    const existingMessage = await db.get("ai_messages", this.messageId);

    if (!existingMessage) {
      console.warn(
        `AI message ${this.messageId} not found, skipping metadata update`
      );
      return;
    }

    // 合并 metadata
    const updatedMetadata = {
      ...(existingMessage.metadata || {}),
      ...this.metadataUpdate,
    };

    // 更新消息
    await db.put("ai_messages", {
      ...existingMessage,
      metadata: updatedMetadata,
      dirty: true, // 标记需要同步
    });
  }

  reverse(): EditorAction {
    // AI 对话消息不支持撤销
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
