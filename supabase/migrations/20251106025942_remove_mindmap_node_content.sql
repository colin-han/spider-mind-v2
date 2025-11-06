-- Remove content column from mindmap_nodes table
-- This field is no longer used, removing to simplify the data model

ALTER TABLE mindmap_nodes
DROP COLUMN IF EXISTS content;
