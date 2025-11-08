-- =====================================================
-- Migration: 为 mindmap_nodes 表添加 note 字段
-- Created: 2025-11-08
-- Description: 添加可选的 note 字段用于存储节点的详细说明（Markdown 格式）
-- =====================================================

BEGIN;

-- 添加 note 字段
ALTER TABLE public.mindmap_nodes
ADD COLUMN IF NOT EXISTS note text;

-- 添加长度约束（最大 10000 字符）
ALTER TABLE public.mindmap_nodes
ADD CONSTRAINT note_length_check
CHECK (note IS NULL OR char_length(note) <= 10000);

-- 添加字段注释
COMMENT ON COLUMN public.mindmap_nodes.note IS
'可选的详细描述字段，支持 Markdown 格式，最大长度 10000 字符';

COMMIT;
