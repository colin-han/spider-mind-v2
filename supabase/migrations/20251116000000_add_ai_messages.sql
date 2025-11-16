-- AI 对话消息表
-- 存储用户与 AI 助手的对话历史

CREATE TABLE ai_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  node_id uuid NOT NULL REFERENCES mindmap_nodes(id) ON DELETE CASCADE,
  mindmap_id uuid NOT NULL REFERENCES mindmaps(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id),

  -- 消息内容
  role text NOT NULL CHECK (role IN ('user', 'assistant')),
  parts jsonb NOT NULL,  -- MessagePart[] 序列化

  -- 时间戳
  created_at timestamptz NOT NULL DEFAULT now(),

  -- 元数据（可选）
  metadata jsonb
);

-- 索引
CREATE INDEX idx_ai_messages_node_id ON ai_messages(node_id);
CREATE INDEX idx_ai_messages_mindmap_id ON ai_messages(mindmap_id);
CREATE INDEX idx_ai_messages_user_id ON ai_messages(user_id);
CREATE INDEX idx_ai_messages_created_at ON ai_messages(created_at);

-- RLS 策略
ALTER TABLE ai_messages ENABLE ROW LEVEL SECURITY;

-- 用户只能访问自己的消息
CREATE POLICY "Users can view own messages"
  ON ai_messages FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own messages"
  ON ai_messages FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own messages"
  ON ai_messages FOR DELETE
  USING (auth.uid() = user_id);

-- 添加注释
COMMENT ON TABLE ai_messages IS 'AI 对话消息表，存储用户与 AI 助手的对话历史';
COMMENT ON COLUMN ai_messages.node_id IS '关联的思维导图节点 UUID';
COMMENT ON COLUMN ai_messages.mindmap_id IS '关联的思维导图 UUID';
COMMENT ON COLUMN ai_messages.user_id IS '消息所属用户';
COMMENT ON COLUMN ai_messages.role IS '消息角色：user 或 assistant';
COMMENT ON COLUMN ai_messages.parts IS '消息内容部分（JSON 数组）';
COMMENT ON COLUMN ai_messages.created_at IS '消息创建时间';
COMMENT ON COLUMN ai_messages.metadata IS '可选元数据（如操作信息等）';
