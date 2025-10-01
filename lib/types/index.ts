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
  Profile,
  MindMap,
  ProfileInsert,
  MindMapInsert,
  ProfileUpdate,
  MindMapUpdate,
} from "./supabase";

// 重新导出 Supabase 数据库类型定义
export type {
  Database,
  Tables,
  TablesInsert,
  TablesUpdate,
  Enums,
  Profile,
  MindMap,
  ProfileInsert,
  MindMapInsert,
  ProfileUpdate,
  MindMapUpdate,
};

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

// 用户界面相关类型
export interface UserSession {
  user: Profile | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

// 思维导图相关类型
export interface MindMapNode {
  id: string;
  text: string;
  x: number;
  y: number;
  children: MindMapNode[];
  parentId?: string;
  color?: string;
  fontSize?: number;
  shape?: "rectangle" | "ellipse" | "diamond";
}

export interface MindMapData {
  nodes: MindMapNode[];
  connections: MindMapConnection[];
  viewport: {
    x: number;
    y: number;
    zoom: number;
  };
}

export interface MindMapConnection {
  id: string;
  sourceId: string;
  targetId: string;
  type: "straight" | "curved" | "step";
  color?: string;
  strokeWidth?: number;
}
