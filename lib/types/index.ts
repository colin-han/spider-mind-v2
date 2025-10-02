/**
 * 类型定义导出文件
 *
 * 这个文件集中导出所有类型定义，方便在项目中使用
 */

// 导入 Supabase 数据库类型定义以供本地使用
import type {
  Database,
  Tables,
  TablesInsert,
  TablesUpdate,
  Enums,
} from "./supabase";

// 重新导出 Supabase 数据库类型定义
export type { Database, Tables, TablesInsert, TablesUpdate, Enums };

// 通用类型定义
export interface ApiResponse<T = unknown> {
  data: T | null;
  error: string | null;
  success: boolean;
}

export interface PaginatedResponse<T = unknown> {
  data: T[];
  count: number | null;
  error: string | null;
  success: boolean;
}

// 应用状态类型
export interface LoadingState {
  isLoading: boolean;
  error: string | null;
}

// 用户资料类型
export type Profile = Tables<"user_profiles">;

// 用户界面相关类型
export interface UserSession {
  user: Profile | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

export type Mindmap = Tables<"mindmaps">;
export type MindmapInsert = TablesInsert<"mindmaps">;
export type MindmapUpdate = TablesUpdate<"mindmaps">;

export type MindmapNode = Tables<"mindmap_nodes">;
export type MindmapNodeInsert = TablesInsert<"mindmap_nodes">;
export type MindmapNodeUpdate = TablesUpdate<"mindmap_nodes">;

// Server Action 结果类型
export interface CreateMindmapResult {
  success: boolean;
  shortId?: string;
  error?: string;
}

export interface DeleteMindmapResult {
  success: boolean;
  error?: string;
}

// Dashboard 列表项类型
export interface MindmapListItem {
  id: string;
  short_id: string;
  title: string;
  description: string | null;
  created_at: string;
  updated_at: string;
}
