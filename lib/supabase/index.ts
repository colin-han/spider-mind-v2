// 客户端实例导出
export { supabase, type SupabaseClient } from "./client";

// 服务端实例导出
export {
  createServerClient,
  createServerComponentClient,
  createRouteHandlerClient,
  type ServerSupabaseClient,
  type ServerComponentClient,
  type RouteHandlerClient,
} from "./server";

// 数据库类型定义导出
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
} from "@/lib/types/supabase";

// Supabase 常用类型重新导出
export type {
  Session,
  User,
  AuthError,
  PostgrestError,
  RealtimeChannel,
  RealtimePostgresChangesPayload,
} from "@supabase/supabase-js";
