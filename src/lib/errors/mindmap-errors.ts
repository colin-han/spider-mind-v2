/**
 * 思维导图相关错误类
 */

/**
 * 思维导图不存在错误 (404)
 */
export class MindmapNotFoundError extends Error {
  readonly code = "NOT_FOUND" as const;

  constructor(mindmapId: string) {
    super(`Mindmap not found: ${mindmapId}`);
    this.name = "MindmapNotFoundError";
  }
}

/**
 * 用户未认证错误（未登录）
 * 注意：这个错误在前端会触发跳转到登录页，不会显示错误页面
 */
export class UnauthorizedError extends Error {
  readonly code = "UNAUTHORIZED" as const;

  constructor(message = "User not authenticated") {
    super(message);
    this.name = "UnauthorizedError";
  }
}

/**
 * 访问被拒绝错误 (403)
 * 用户已登录，但没有权限访问该资源
 */
export class ForbiddenError extends Error {
  readonly code = "FORBIDDEN" as const;

  constructor(mindmapId: string) {
    super(`Access denied to mindmap: ${mindmapId}`);
    this.name = "ForbiddenError";
  }
}
