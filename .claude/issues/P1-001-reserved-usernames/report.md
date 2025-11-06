# 问题报告: 保留用户名检查未实现

## 基本信息

- **问题ID**: P1-001
- **优先级**: 🟡 P1 (High - 建议近期修复)
- **报告日期**: 2025-11-06
- **报告人**: Claude Code
- **问题类型**: ❌ 功能缺失
- **状态**: 🟡 Open

---

## 问题描述

### 核心问题

设计文档 `id-design.md` 中定义了保留用户名列表 (RESERVED_USERNAMES)，用于防止用户注册系统保留的用户名(如 admin, api, auth 等)，但代码中未找到相应的验证逻辑实现。

### 详细说明

**文档定义** (`docs/design/id-design.md` 第576-588行):

```typescript
const RESERVED_USERNAMES = [
  "admin",
  "api",
  "auth",
  "settings",
  "about",
  "help",
  "support",
  "terms",
  "privacy",
];
```

**实现状态**:

- ❌ 未找到 `RESERVED_USERNAMES` 常量定义
- ❌ 未找到用户名验证函数检查保留词
- ❌ 用户注册/更新 profile 时未进行保留词验证

**当前行为**:

- 用户可以注册任意用户名（仅受格式约束）
- 系统保留的路由名称可能被占用
- 潜在的路由冲突风险

---

## 影响文件

### 设计文档

- `docs/design/id-design.md:576-588` - 定义保留用户名列表

### 可能需要修改的代码文件

- 用户注册逻辑 (Supabase Auth 触发器或 API handler)
- Profile 创建/更新逻辑
- 用户名验证工具函数 (需创建)

### 数据库

- `supabase/migrations/*_user_profiles_schema.sql` - 可能需要添加 CHECK 约束

---

## 影响分析

### 1. 路由冲突风险 🟡 中影响

**问题**: 用户名与系统路由冲突

**场景示例**:

```
用户注册 username = "api"
用户页面 URL: /@api
系统 API 路由: /api/*

可能导致:
- 路由规则冲突
- 访问 /@api 时行为不明确
- 需要额外的路由优先级规则
```

**受影响路由**:

- `/admin` - 管理后台
- `/api` - API 端点
- `/auth` - 认证相关路由
- `/settings` - 系统设置
- `/about`, `/help`, `/support` - 静态页面
- `/terms`, `/privacy` - 法律文档

### 2. 用户体验 🟢 低影响

**问题**: 用户可能困惑为什么某些用户名不可用

**当前状态**:

- 如果有前端路由优先级规则，系统页面会正常工作
- 但用户注册成功后无法访问自己的用户页面 `/@username`

**理想状态**:

- 注册时明确提示"该用户名为系统保留"
- 用户体验更友好

### 3. 安全性 🟢 低影响

**问题**: 潜在的钓鱼风险

**场景**:

- 用户注册 `admin` 或 `support`
- 其他用户可能误认为是官方账号
- 可能被用于钓鱼或冒充

**缓解措施**:

- 实现保留词检查
- 或者使用徽章/认证标识区分官方账号

---

## 根本原因分析

### 为什么会发生?

1. **文档与实现脱节**:
   - 文档定义了功能需求
   - 但实现时可能遗漏或推迟

2. **优先级考虑**:
   - 保留用户名检查可能不在 MVP 范围内
   - 计划后续实现但未完成

3. **路由设计**:
   - 如果路由有清晰的优先级规则
   - 这个功能可能被认为不是必需的

### 当前路由设计

需要检查 Next.js 路由配置:

```
app/
  @[username]/      <- 用户页面 (catch-all)
  admin/            <- 管理后台
  api/              <- API routes
  auth/             <- 认证页面
  ...
```

**如果用户页面路由是 catch-all**，系统路由应该有更高优先级。

---

## 修复方案

### 方案 A: 实现保留用户名检查 ✅ 推荐

完整实现文档描述的功能。

#### 步骤 1: 创建常量文件

**文件**: `lib/constants/reserved-usernames.ts`

```typescript
/**
 * 系统保留的用户名列表
 * 这些用户名不能被用户注册，以避免与系统路由冲突
 */
export const RESERVED_USERNAMES = [
  // 系统路由
  "admin",
  "api",
  "auth",
  "settings",

  // 静态页面
  "about",
  "help",
  "support",
  "terms",
  "privacy",
  "contact",

  // 常见系统词汇
  "system",
  "config",
  "dashboard",
  "profile",
  "account",

  // 防止混淆
  "official",
  "team",
  "staff",
] as const;

/**
 * 检查用户名是否为保留词
 * @param username 用户名（应已转为小写）
 * @returns true 如果是保留词
 */
export function isReservedUsername(username: string): boolean {
  return RESERVED_USERNAMES.includes(username.toLowerCase() as any);
}
```

#### 步骤 2: 添加验证函数

**文件**: `lib/utils/username-validator.ts`

```typescript
import { isReservedUsername } from "@/lib/constants/reserved-usernames";

/**
 * 用户名验证规则
 */
const USERNAME_REGEX = /^[a-z0-9]([a-z0-9-]{1,18}[a-z0-9])?$/;
const MIN_LENGTH = 3;
const MAX_LENGTH = 20;

export interface UsernameValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * 验证用户名是否合法
 * @param username 待验证的用户名
 * @returns 验证结果
 */
export function validateUsername(username: string): UsernameValidationResult {
  // 长度检查
  if (username.length < MIN_LENGTH) {
    return {
      valid: false,
      error: `用户名至少需要 ${MIN_LENGTH} 个字符`,
    };
  }

  if (username.length > MAX_LENGTH) {
    return {
      valid: false,
      error: `用户名最多 ${MAX_LENGTH} 个字符`,
    };
  }

  // 格式检查
  if (!USERNAME_REGEX.test(username)) {
    return {
      valid: false,
      error: "用户名只能包含小写字母、数字和连字符，且不能以连字符开头或结尾",
    };
  }

  // 保留词检查
  if (isReservedUsername(username)) {
    return {
      valid: false,
      error: "该用户名为系统保留，请选择其他用户名",
    };
  }

  return { valid: true };
}
```

#### 步骤 3: 在数据库层添加约束 (可选)

**文件**: `supabase/migrations/YYYYMMDDHHMMSS_add_username_reserved_check.sql`

```sql
-- 添加 CHECK 约束防止保留用户名
-- 注意：PostgreSQL 的 CHECK 约束有限制，建议在应用层检查

DO $$
BEGIN
  -- 创建函数检查保留用户名
  CREATE OR REPLACE FUNCTION check_reserved_username()
  RETURNS TRIGGER AS $func$
  DECLARE
    reserved_names TEXT[] := ARRAY[
      'admin', 'api', 'auth', 'settings',
      'about', 'help', 'support', 'terms', 'privacy'
    ];
  BEGIN
    IF NEW.username = ANY(reserved_names) THEN
      RAISE EXCEPTION 'Username "%" is reserved', NEW.username;
    END IF;
    RETURN NEW;
  END;
  $func$ LANGUAGE plpgsql;

  -- 创建触发器
  DROP TRIGGER IF EXISTS check_reserved_username_trigger ON user_profiles;

  CREATE TRIGGER check_reserved_username_trigger
    BEFORE INSERT OR UPDATE OF username ON user_profiles
    FOR EACH ROW
    EXECUTE FUNCTION check_reserved_username();
END $$;

COMMENT ON FUNCTION check_reserved_username() IS
  '检查用户名是否为系统保留，如果是则拒绝操作';
```

#### 步骤 4: 在 API 层集成验证

**场景 1**: Supabase Auth 用户创建触发器

如果使用 Supabase Auth 的 `handle_new_user()` 触发器:

```sql
-- 在 handle_new_user 函数中添加验证
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  username_value TEXT;
BEGIN
  -- 从 raw_user_meta_data 获取 username
  username_value := NEW.raw_user_meta_data->>'username';

  -- 检查是否为保留用户名 (调用上面创建的函数会更好)
  IF username_value IN ('admin', 'api', 'auth', 'settings', 'about', 'help', 'support', 'terms', 'privacy') THEN
    RAISE EXCEPTION 'Username "%" is reserved', username_value;
  END IF;

  -- 创建 profile
  INSERT INTO public.user_profiles (id, username, ...)
  VALUES (NEW.id, username_value, ...);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

**场景 2**: Next.js API Route

如果有自定义的 profile 创建/更新 API:

```typescript
// app/api/profile/route.ts
import { validateUsername } from "@/lib/utils/username-validator";

export async function POST(request: Request) {
  const { username, ...rest } = await request.json();

  // 验证用户名
  const validation = validateUsername(username);
  if (!validation.valid) {
    return NextResponse.json({ error: validation.error }, { status: 400 });
  }

  // 创建 profile
  const { data, error } = await supabase
    .from("user_profiles")
    .insert({ username, ...rest });

  // ...
}
```

#### 步骤 5: 前端表单验证

```typescript
// components/username-input.tsx
import { validateUsername } from "@/lib/utils/username-validator";

export function UsernameInput() {
  const [username, setUsername] = useState("");
  const [error, setError] = useState("");

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.toLowerCase();
    setUsername(value);

    const validation = validateUsername(value);
    setError(validation.error || "");
  };

  return (
    <div>
      <input
        type="text"
        value={username}
        onChange={handleChange}
        className={error ? "border-red-500" : ""}
      />
      {error && <p className="text-red-500 text-sm">{error}</p>}
    </div>
  );
}
```

---

### 方案 B: 从文档中移除 ❌ 不推荐

如果团队决定不实现此功能。

**场景**:

- 路由优先级规则已足够处理冲突
- 认为保留用户名限制对用户不友好
- 计划使用其他方式（如官方认证徽章）区分

**步骤**:

1. 从 `id-design.md` 中删除 RESERVED_USERNAMES 部分
2. 在文档中说明为什么不需要保留用户名
3. 确保路由优先级规则文档化

**优点**:

- ✅ 用户可以使用更多用户名
- ✅ 实现简单

**缺点**:

- ❌ 放弃文档定义的功能
- ❌ 潜在的路由冲突问题
- ❌ 可能需要更复杂的路由规则

---

### 方案 C: 混合方案 ⭐ 实用

仅保留核心系统路由的用户名检查，减少限制。

**保留清单（最小化）**:

```typescript
const RESERVED_USERNAMES = [
  "api", // 必须保留
  "auth", // 必须保留
  "admin", // 必须保留
  "_next", // Next.js 内部路由
  "_app", // Next.js 内部路由
];
```

**优点**:

- ✅ 保护核心系统路由
- ✅ 给用户更多选择空间
- ✅ 实现成本低

**缺点**:

- ⚠️ about, help, support 等可能被占用
- ⚠️ 需要清晰的路由优先级规则

---

## 推荐方案

**建议采用 方案 A (完整实现)** 或 **方案 C (混合方案)**

### 理由

1. **符合设计意图**: 文档明确定义了此功能
2. **防患于未然**: 提前避免路由冲突
3. **用户体验**: 提供清晰的错误提示
4. **实现成本**: 相对较低，约 2-4 小时

### 决策依据

需要团队讨论:

- [ ] 当前路由优先级是如何配置的？
- [ ] 是否已经有用户注册了保留词用户名？
- [ ] 是否计划创建官方账号（admin, support等）？
- [ ] 是否有其他机制区分官方账号（徽章、认证）？

---

## 验证清单

实现完成后，检查:

- [ ] RESERVED_USERNAMES 常量已创建
- [ ] validateUsername() 函数已实现并测试
- [ ] 数据库层约束已添加（可选）
- [ ] API handler 已集成验证
- [ ] 前端表单已实现验证
- [ ] 尝试注册保留用户名会被拒绝
- [ ] 错误提示清晰友好
- [ ] 更新 id-design.md 说明实现状态
- [ ] 编写单元测试

---

## 测试用例

### 单元测试

```typescript
// __tests__/username-validator.test.ts
import { validateUsername } from "@/lib/utils/username-validator";

describe("validateUsername", () => {
  it("should reject reserved usernames", () => {
    expect(validateUsername("admin").valid).toBe(false);
    expect(validateUsername("api").valid).toBe(false);
    expect(validateUsername("auth").valid).toBe(false);
  });

  it("should accept valid usernames", () => {
    expect(validateUsername("john").valid).toBe(true);
    expect(validateUsername("user-123").valid).toBe(true);
  });

  it("should reject invalid formats", () => {
    expect(validateUsername("ab").valid).toBe(false); // too short
    expect(validateUsername("-john").valid).toBe(false); // starts with hyphen
    expect(validateUsername("JOHN").valid).toBe(false); // uppercase
  });
});
```

### E2E 测试

```typescript
// tests/e2e/username-registration.spec.ts
import { test, expect } from "@playwright/test";

test("should reject reserved username", async ({ page }) => {
  await page.goto("/signup");

  await page.fill('[data-testid="username-input"]', "admin");
  await page.click('[data-testid="submit-button"]');

  await expect(page.locator(".error-message")).toContainText(
    "该用户名为系统保留"
  );
});
```

---

## 预计工时

| 任务                         | 预计时间  |
| ---------------------------- | --------- |
| 创建 RESERVED_USERNAMES 常量 | 15分钟    |
| 实现 validateUsername()      | 30分钟    |
| 数据库触发器（可选）         | 30分钟    |
| API 层集成                   | 1小时     |
| 前端表单验证                 | 30分钟    |
| 单元测试                     | 30分钟    |
| E2E 测试                     | 30分钟    |
| 文档更新                     | 15分钟    |
| **总计**                     | **4小时** |

如果采用方案C（最小化保留词），可减少至 2小时。

---

## 相关资源

### 验证报告

- **汇总报告**: `.claude/logs/verification-reports/2025-11-06-batch-verification.md`
- **id-design 详细报告**: `.claude/logs/id-design-verification-report.md`

### 相关文档

- **设计文档**: `docs/design/id-design.md:576-588`
- **Username 设计**: `docs/design/id-design.md:554-589`

### 参考实现

- GitHub 保留用户名策略
- GitLab 保留路径列表
- Twitter 保留用户名

---

## 责任人与时间线

| 任务             | 责任人          | 预计完成时间 | 状态      |
| ---------------- | --------------- | ------------ | --------- |
| 决策采用哪个方案 | 产品/技术负责人 | 2025-11-08   | 🟡 待决策 |
| 实现验证逻辑     | 后端开发        | 2025-11-15   | 🔴 待分配 |
| 前端表单集成     | 前端开发        | 2025-11-15   | 🔴 待分配 |
| 编写测试         | QA              | 2025-11-15   | 🔴 待分配 |
| 更新文档         | 文档维护者      | 2025-11-15   | 🔴 待分配 |

---

## 问题状态跟踪

- **创建时间**: 2025-11-06
- **发现来源**: 文档验证 (`/doc-verify`)
- **当前状态**: 🟡 Open
- **优先级**: P1 (High)
- **预计修复**: 2025-11-15

---

**报告生成**: Claude Code
**最后更新**: 2025-11-06
