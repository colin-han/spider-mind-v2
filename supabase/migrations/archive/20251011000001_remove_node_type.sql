-- 移除 mindmap_nodes 表的 node_type 字段
-- 因为可以通过 parent_id 是否为 NULL 来判断节点类型:
-- parent_id IS NULL: 根节点
-- parent_id IS NOT NULL: 普通节点

-- 删除 node_type 列
ALTER TABLE mindmap_nodes DROP COLUMN node_type;

-- 添加注释说明 parent_id 的语义
COMMENT ON COLUMN mindmap_nodes.parent_id IS '父节点UUID。NULL表示根节点,非NULL表示普通节点';
