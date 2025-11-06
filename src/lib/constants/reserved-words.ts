/**
 * 保留的 short_id 列表
 * 仅包含长度为 6 的保留词，因为 short_id 固定为 6 位
 * 避免与路由或系统功能冲突
 */
export const RESERVED_SHORT_IDS: Array<string> = [
  // 系统路由 (6位)
  "create",
  "delete",
  "system",
  "config",
  "update",
  "remove",

  // 常见操作 (6位)
  "export",
  "import",
  "backup",
  "upload",
  "search",

  // 用户相关 (6位)
  "logout",
  "signup",
  "signin",
  "verify",

  // 权限相关 (6位)
  "public",
  "shared",
  "secret",

  // 状态相关 (6位)
  "active",
  "hidden",
  "locked",
  "draft0", // draft + 数字的组合

  // API 相关 (6位)
  "api001",
  "apiv01",
  "apiv02",

  // 其他 (6位)
  "folder",
  "static",
] as const;

/**
 * 可能被用作路由的词汇（各种长度）
 * 这些词在其他场景下需要考虑，但不影响 6 位 short_id
 */
export const ROUTE_RESERVED_WORDS: Array<string> = [
  // 短于 6 位
  "new",
  "edit",
  "api",
  "admin",
  "share",
  "clone",
  "copy",
  "move",
  "login",
  "help",
  "about",
  "docs",
  "terms",

  ...RESERVED_SHORT_IDS,

  // 长于 6 位
  "settings",
  "profile",
  "account",
  "support",
  "privacy",
] as const;

/**
 * 检查 short_id 是否为保留词
 */
export function isReservedShortId(shortId: string): boolean {
  return RESERVED_SHORT_IDS.includes(shortId);
}
