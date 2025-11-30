# 错误处理和错误页面设计

## 元信息

- 作者：Claude Code
- 创建日期：2025-11-30
- 最后更新：2025-11-30
- 相关文档：
  - [数据库设计](./database-schema.md) - mindmaps 表查询
  - [持久化中间件设计](./persistence-middleware-design.md) - IndexedDB 数据访问

## 关键概念

> 本节定义该设计文档引入的新概念，不包括外部库或其他文档已定义的概念。

| 概念                     | 定义                                                         | 示例/说明                                                          |
| ------------------------ | ------------------------------------------------------------ | ------------------------------------------------------------------ |
| **错误消息检查模式**     | 使用字符串匹配而非 `instanceof` 来识别跨边界传递的错误类型   | `errorMessage.includes("User not authenticated")` 用于识别认证错误 |
| **认证错误重新抛出**     | 在降级逻辑中检测认证错误并重新抛出，防止使用缓存数据         | 用户登出后访问思维导图时，不使用 IndexedDB 缓存                    |
| **redirect 参数机制**    | 在登录 URL 中携带跳转目标，登录成功后自动返回原页面          | `/login?redirect=/mindmaps/abc123`                                 |
| **统一 404 安全策略**    | 对于不存在或无权访问的资源，统一返回 404，不泄露资源是否存在 | 思维导图不存在和无权访问都返回 404                                 |
| **Auth session missing** | Supabase 在用户未登录时返回的特定错误消息                    | 需要特殊处理，将其转换为 UnauthorizedError                         |

## 概述

Spider Mind 的错误处理系统提供友好的用户体验和强健的错误恢复机制，包括可视化的错误页面（404/403）、自动登录跳转、以及针对 Next.js Server Actions 错误序列化问题的解决方案。系统确保未登录用户无法访问本地缓存数据，同时为网络错误提供优雅的降级策略。

## 背景和动机

### 问题背景

1. **缺少友好的错误提示**
   - 用户访问不存在的思维导图时，只有空白页或控制台错误
   - 未登录用户访问受保护资源时，没有清晰的引导

2. **Next.js Server Actions 错误序列化问题**
   - 自定义错误类（如 `UnauthorizedError`）在客户端无法通过 `instanceof` 识别
   - 错误对象在序列化过程中丢失原型链

3. **安全漏洞**
   - 用户登出后仍能访问 IndexedDB 中的缓存数据
   - 缺少对认证状态的强制检查

4. **用户体验问题**
   - 未登录用户访问受保护页面后，登录成功无法回到原页面
   - 错误消息技术化，普通用户难以理解

## 设计目标

- ✅ 提供友好的中文错误页面（404/403）
- ✅ 支持 Dark Mode
- ✅ 未登录用户自动跳转到登录页，登录后自动返回
- ✅ 解决 Next.js Server Actions 错误序列化问题
- ✅ 防止未登录用户访问本地缓存数据（安全）
- ✅ 保持浏览器地址栏 URL 不变（显示错误页时）
- ✅ 网络错误时优雅降级（使用本地数据）
- ✅ 可爱的视觉设计，符合 Spider Mind 品牌

## 设计方案

### 架构概览

```
用户访问 /mindmaps/{id}
    ↓
MindmapEditorContainer 加载
    ↓
调用 openMindmap(id)
    ↓
┌─────────────────────────────────────┐
│ mindmap-store.ts                     │
│ ┌─────────────────────────────────┐ │
│ │ 1. 从 IndexedDB 加载本地数据    │ │
│ └─────────────────────────────────┘ │
│          ↓                           │
│ ┌─────────────────────────────────┐ │
│ │ 2. 调用 fetchServerVersion()     │ │
│ │    检查服务器版本               │ │
│ └─────────────────────────────────┘ │
│          ↓                           │
│    成功 / 失败                       │
│    ↓         ↓                       │
│  比较时间戳  捕获错误                │
│    ↓         ↓                       │
│  决定数据源  识别错误类型            │
│              ↓                       │
│         ┌─────────┬──────────────┐  │
│         │认证错误?│   其他错误?   │  │
│         └─────────┴──────────────┘  │
│              ↓            ↓          │
│          重新抛出    使用本地数据    │
└─────────────────────────────────────┘
    ↓
错误传播到 MindmapEditorContainer
    ↓
┌─────────────────────────────────────┐
│ mindmap-editor-container.tsx         │
│                                      │
│ 检查错误消息:                        │
│ ┌──────────────────────────────────┐│
│ │ "User not authenticated"?        ││
│ │   → 跳转登录页（带 redirect）    ││
│ └──────────────────────────────────┘│
│ ┌──────────────────────────────────┐│
│ │ "Mindmap not found"?             ││
│ │   → 显示 404 错误页面            ││
│ └──────────────────────────────────┘│
│ ┌──────────────────────────────────┐│
│ │ 其他错误?                        ││
│ │   → Toast 提示 + 跳转 Dashboard  ││
│ └──────────────────────────────────┘│
└─────────────────────────────────────┘
```

### 详细设计

#### 1. 错误类型系统

**文件**: `src/lib/errors/mindmap-errors.ts`

定义三种自定义错误类型：

```typescript
// 用户未认证错误（未登录）
export class UnauthorizedError extends Error {
  readonly code = "UNAUTHORIZED" as const;
  constructor(message = "User not authenticated") {
    super(message);
    this.name = "UnauthorizedError";
  }
}

// 思维导图不存在错误 (404)
export class MindmapNotFoundError extends Error {
  readonly code = "NOT_FOUND" as const;
  constructor(mindmapId: string) {
    super(`Mindmap not found: ${mindmapId}`);
    this.name = "MindmapNotFoundError";
  }
}

// 访问被拒绝错误 (403) - 预留
export class ForbiddenError extends Error {
  readonly code = "FORBIDDEN" as const;
  constructor(mindmapId: string) {
    super(`Access denied to mindmap: ${mindmapId}`);
    this.name = "ForbiddenError";
  }
}
```

**设计原则**:

- 每个错误类型有唯一的 `code` 常量
- 错误消息包含关键字（用于客户端识别）
- `ForbiddenError` 当前未使用（安全策略：统一返回 404）

#### 2. Server Actions 错误处理

**文件**: `src/lib/actions/mindmap-sync.ts`

##### 问题：Next.js Server Actions 错误序列化

Next.js Server Actions 在客户端和服务端之间传递错误时，会序列化错误对象。自定义错误类会丢失原型链，导致 `instanceof` 检查失败。

**失败的方案**（不要使用）:

```typescript
// ❌ 这不工作！
catch (error) {
  if (error instanceof UnauthorizedError) {  // 总是返回 false
    throw error;
  }
}
```

**正确的方案**（使用错误消息检查）:

```typescript
// ✅ 这才工作！
catch (error) {
  const errorMessage = error instanceof Error ? error.message : String(error);

  // 检查错误消息而不是类型
  if (errorMessage.includes("User not authenticated") ||
      errorMessage.includes("Mindmap not found")) {
    throw error;
  }

  // 其他错误处理...
}
```

##### Auth Session Missing 特殊处理

Supabase 在用户未登录时返回 `AuthSessionMissingError`，需要将其转换为 `UnauthorizedError`：

```typescript
const {
  data: { user },
  error: authError,
} = await supabase.auth.getUser();

if (authError) {
  // 检查是否是 session missing（用户未登录）
  if (authError.message?.includes("Auth session missing")) {
    throw new UnauthorizedError(); // 转换为统一的认证错误
  }
  // 其他认证错误（配置问题）
  throw new Error(`认证失败: ${authError.message}...`);
}
```

**关键要点**:

- `Auth session missing` 是正常的未登录状态，不是错误
- 需要转换为 `UnauthorizedError` 以便客户端识别
- 其他认证错误（如配置错误）需要单独处理

#### 3. 客户端错误处理

**文件**: `src/components/mindmap/mindmap-editor-container.tsx`

##### 错误捕获和识别

```typescript
try {
  await openMindmap(mindmapId);
} catch (error) {
  const errorMessage = error instanceof Error ? error.message : String(error);

  // 识别错误类型（基于错误消息）
  if (errorMessage.includes("User not authenticated")) {
    // 未登录 → 跳转登录页
    const redirectUrl = `/login?redirect=${encodeURIComponent(`/mindmaps/${mindmapId}`)}`;
    window.location.href = redirectUrl;
  } else if (errorMessage.includes("Mindmap not found")) {
    // 404 → 显示错误页面
    setErrorType("404");
  } else {
    // 其他错误 → Toast + 跳转
    toast.error(`加载思维导图失败：${errorMessage}`);
    setTimeout(() => router.push("/dashboard"), 2000);
  }
}
```

##### 错误页面显示

```typescript
if (errorType) {
  return (
    <ErrorPage
      type={errorType}
      onGoHome={() => router.push("/dashboard")}
      onLogin={() => {
        const redirectUrl = `/login?redirect=${encodeURIComponent(`/mindmaps/${mindmapId}`)}`;
        router.push(redirectUrl);
      }}
    />
  );
}
```

**关键要点**:

- 错误页面组件内联显示，不改变浏览器 URL
- 使用状态管理（`errorType`）控制显示
- 不使用 Next.js 的 `error.tsx`（需要保持 URL 不变）

#### 4. 安全机制：防止未登录访问缓存

**文件**: `src/domain/mindmap-store.ts`

**问题**: 用户登出后，本地 IndexedDB 中仍有缓存数据。之前的代码在网络错误时会使用缓存数据作为降级方案，但这会导致未登录用户仍能看到敏感数据。

**解决方案**: 在降级逻辑中检查认证错误并重新抛出

```typescript
try {
  const serverVersion = await fetchServerVersion(mindmapId);
  // 比较时间戳...
} catch (error) {
  // 检查是否是认证错误
  const errorMessage = error instanceof Error ? error.message : String(error);
  if (errorMessage.includes("User not authenticated")) {
    // 用户未登录，不应该访问任何数据（即使是本地缓存）
    console.error("[openMindmap] User not authenticated, re-throwing error");
    throw error; // ✅ 重新抛出，阻止使用缓存
  }

  // 其他错误（如网络错误），使用本地数据作为降级方案
  console.warn(
    "[openMindmap] Failed to check server timestamp, using local data:",
    error
  );
}
```

**安全影响**:

- 🔴 修复前：登出用户可以查看本地缓存的思维导图（高危）
- ✅ 修复后：登出用户会被正确拒绝访问，跳转到登录页

#### 5. 登录跳转机制

##### redirect 参数设计

**登录页面** (`src/app/(auth)/login/page.tsx`):

```typescript
interface LoginPageProps {
  searchParams: Promise<{ redirect?: string }>;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const user = await getAuthUser();

  // 如果已登录且有 redirect 参数，跳转到指定页面
  if (user && params.redirect) {
    // 防止循环：如果 redirect 指向登录页，跳转到 dashboard
    const redirectPath = params.redirect.startsWith("/login")
      ? "/dashboard"
      : params.redirect;
    redirect(redirectPath);
  }

  // ...
}
```

**登录表单** (`src/components/auth/login-form.tsx`):

```typescript
interface LoginFormProps {
  redirect?: string;
}

export function LoginForm({ redirect }: LoginFormProps) {
  const handleSubmit = async (email: string, password: string) => {
    await signIn(email, password, redirect);
  };
  // ...
}
```

**认证 Action** (`src/lib/actions/auth-actions.ts`):

```typescript
export async function signIn(
  email: string,
  password: string,
  redirectTo?: string
) {
  // ... 登录逻辑 ...

  // 决定跳转目标
  const destination =
    redirectTo && !redirectTo.startsWith("/login") ? redirectTo : "/dashboard";

  redirect(destination);
}
```

**防止循环的关键检查**:

- `redirectPath.startsWith("/login")` - 防止跳转回登录页
- 默认跳转到 `/dashboard`

##### 为什么使用 window.location.href？

**未登录跳转使用 `window.location.href`**：

```typescript
// ✅ 使用 window.location.href
window.location.href = `/login?redirect=...`;
```

**原因**:

1. 确保完全刷新页面，清除所有客户端状态
2. 避免认证状态不同步的问题
3. 登录后需要重新初始化所有 context 和 store

**其他跳转使用 `router.push()`**（无需刷新）:

```typescript
// ✅ 使用 router.push
router.push("/dashboard");
```

#### 6. 错误页面组件

**文件**: `src/components/error/error-page.tsx`

##### 组件设计

```typescript
interface ErrorPageProps {
  type: "404" | "403";
  onGoHome: () => void;
  onLogin?: () => void;
}

export const ErrorPage: React.FC<ErrorPageProps> = ({
  type,
  onGoHome,
  onLogin,
}) => {
  const isNotFound = type === "404";

  const config = {
    "404": {
      title: "哎呀，网破了个洞！",
      subtitle: "思维导图好像飞走了...",
      description: "这个思维导图可能不存在，或者已经被删除了。",
    },
    "403": {
      title: "滴滴！蜘蛛感应报警",
      subtitle: "这里有一只守卫蜘蛛",
      description: "你没有权限查看这个思维导图。试试切换账号？",
    },
  };

  // ...
};
```

##### 视觉设计亮点

1. **可爱的蜘蛛插图**
   - 404: 迷路的小蜘蛛（戴着小红花发卡）
   - 403: 安保蜘蛛（严肃表情）
   - SVG 动画：摆动（swing）、浮动（float）

2. **品牌色配置** (`tailwind.config.ts`):

   ```typescript
   colors: {
     brand: {  // 紫色系
       50: "#f5f3ff",
       // ...
       900: "#4c1d95",
     },
     pop: {  // 粉红色系
       400: "#fb7185",
       500: "#f43f5e",
     },
   }
   ```

3. **动画配置**:

   ```typescript
   animation: {
     swing: "swing 3s ease-in-out infinite",
     "float-fast": "float 3s ease-in-out infinite",
   },
   keyframes: {
     swing: {
       "0%, 100%": { transform: "rotate(5deg)" },
       "50%": { transform: "rotate(-5deg)" },
     },
     float: {
       "0%, 100%": { transform: "translateY(0)" },
       "50%": { transform: "translateY(-20px)" },
     },
   }
   ```

4. **Dark Mode 支持**
   - 所有颜色使用 `dark:` 前缀
   - 背景装饰和插图自动适配
   - 示例：`text-gray-700 dark:text-gray-300`

## 实现要点

### 1. 错误识别的关键原则

**始终使用错误消息检查，而不是 instanceof**:

```typescript
// ❌ 不要这样做
if (error instanceof UnauthorizedError) { ... }

// ✅ 应该这样做
const errorMessage = error instanceof Error ? error.message : String(error);
if (errorMessage.includes("User not authenticated")) { ... }
```

**原因**: Next.js Server Actions 的错误序列化问题

### 2. 安全检查的优先级

在降级逻辑（使用缓存数据）之前，**必须先检查认证错误**:

```typescript
catch (error) {
  // 1. 先检查认证错误
  if (errorMessage.includes("User not authenticated")) {
    throw error;  // 阻止使用缓存
  }

  // 2. 再考虑降级
  console.warn("Using local data as fallback");
}
```

### 3. 错误消息的一致性

确保错误消息在整个调用链中保持一致：

1. **定义错误时**: `UnauthorizedError` 的默认消息是 `"User not authenticated"`
2. **转换错误时**: `Auth session missing` → `new UnauthorizedError()`
3. **检查错误时**: `errorMessage.includes("User not authenticated")`

### 4. URL 参数的安全处理

使用 `encodeURIComponent` 编码 redirect 参数：

```typescript
const redirectUrl = `/login?redirect=${encodeURIComponent(`/mindmaps/${mindmapId}`)}`;
```

检查 redirect 参数防止循环：

```typescript
if (params.redirect?.startsWith("/login")) {
  // 防止循环
  redirectPath = "/dashboard";
}
```

## 使用示例

### 示例 1: 处理思维导图加载错误

```typescript
// mindmap-editor-container.tsx
useEffect(() => {
  async function loadMindmap() {
    try {
      await openMindmap(mindmapId);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      if (errorMessage.includes("User not authenticated")) {
        // 跳转登录页
        window.location.href = `/login?redirect=${encodeURIComponent(`/mindmaps/${mindmapId}`)}`;
      } else if (errorMessage.includes("Mindmap not found")) {
        // 显示 404 页面
        setErrorType("404");
      } else {
        // 其他错误
        toast.error(`加载失败：${errorMessage}`);
        setTimeout(() => router.push("/dashboard"), 2000);
      }
    }
  }

  loadMindmap();
}, [mindmapId]);
```

### 示例 2: Server Action 中正确抛出错误

```typescript
// mindmap-sync.ts
export async function fetchServerVersion(mindmapId: string) {
  try {
    const supabase = await createServerComponentClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError) {
      // 处理 Auth session missing
      if (authError.message?.includes("Auth session missing")) {
        throw new UnauthorizedError(); // ✅ 转换为统一的错误
      }
      throw new Error(`认证失败: ${authError.message}`);
    }

    if (!user) {
      throw new UnauthorizedError(); // ✅ 用户未登录
    }

    // ... 查询数据 ...

    if (!mindmap) {
      throw new MindmapNotFoundError(mindmapId); // ✅ 数据不存在
    }

    return { updated_at: mindmap.updated_at };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);

    // ✅ 重新抛出认证和404错误
    if (
      errorMessage.includes("User not authenticated") ||
      errorMessage.includes("Mindmap not found")
    ) {
      throw error;
    }

    // 处理其他错误...
    throw error;
  }
}
```

### 示例 3: 防止未登录访问缓存

```typescript
// mindmap-store.ts
try {
  const serverVersion = await fetchServerVersion(mindmapId);
  // 比较时间戳，决定是否重新加载...
} catch (error) {
  const errorMessage = error instanceof Error ? error.message : String(error);

  // ✅ 认证错误：阻止使用缓存
  if (errorMessage.includes("User not authenticated")) {
    console.error("[openMindmap] User not authenticated");
    throw error; // 重新抛出，不使用本地数据
  }

  // ✅ 网络错误：允许使用缓存
  console.warn("[openMindmap] Network error, using local data");
  // 继续使用本地数据...
}
```

## 设计决策

### 1. 为什么统一返回 404？

**决策**: 对于不存在或无权访问的思维导图，统一返回 404

**理由**:

- **安全考虑**: 不应让用户知道某个 ID 的思维导图是否存在
- **简化实现**: 不需要额外查询判断是否存在
- **用户体验**: 对用户来说，"找不到"和"无权访问"的最终结果相同

**实现**:

```typescript
if (!mindmap) {
  // 思维导图不存在或用户无权访问
  // 为了安全考虑，统一返回 404
  throw new MindmapNotFoundError(mindmapId);
}
```

### 2. 为什么使用 window.location.href 而不是 router.push？

**决策**: 未登录跳转使用 `window.location.href`

**理由**:

- **完全刷新**: 清除所有客户端状态和缓存
- **避免状态不同步**: 登录状态的变化需要重新初始化 context
- **简单可靠**: 不依赖 Next.js 路由的客户端导航

**场景区分**:

- 登录跳转：使用 `window.location.href`（需要刷新）
- 其他导航：使用 `router.push()`（不需要刷新）

### 3. 为什么不使用 Next.js 的 error.tsx？

**决策**: 使用组件内状态管理错误，而不是 Next.js 的 error.tsx

**理由**:

- **保持 URL**: error.tsx 会改变地址栏 URL，但需求要求保持 URL 不变
- **细粒度控制**: 需要根据错误类型执行不同的操作（跳转 vs 显示页面）
- **自定义交互**: 未登录自动跳转等逻辑在 error.tsx 中难以实现

**实现方式**:

```typescript
const [errorType, setErrorType] = useState<"404" | "403" | null>(null);

// 错误处理中
catch (error) {
  if (errorMessage.includes("Mindmap not found")) {
    setErrorType("404");  // 设置状态，不改变 URL
  }
}

// 渲染
if (errorType) {
  return <ErrorPage type={errorType} />;  // 内联显示
}
```

### 4. 为什么使用错误消息检查而不是 instanceof？

**决策**: 使用 `errorMessage.includes()` 而不是 `instanceof`

**理由**:

- **Next.js 限制**: Server Actions 序列化错误时丢失原型链
- **可靠性**: 错误消息在序列化后保持不变
- **简单性**: 不依赖复杂的错误类型系统

**权衡**:

- ❌ 缺点：错误消息字符串耦合
- ✅ 优点：跨边界通信可靠
- ✅ 优点：实现简单，易于理解

### 5. Auth session missing 的处理策略

**决策**: 将 `Auth session missing` 转换为 `UnauthorizedError`

**理由**:

- **语义正确**: "session missing" 本质上是"用户未登录"
- **统一处理**: 避免在多个地方判断不同的错误消息
- **用户友好**: "未认证"比"session missing"更容易理解

**实现**:

```typescript
if (authError.message?.includes("Auth session missing")) {
  throw new UnauthorizedError(); // 转换为统一的错误
}
```

## 替代方案

### 方案 1: 使用 Next.js App Router 的 error.tsx

**不采用的原因**:

- 会改变浏览器地址栏 URL（不符合需求）
- 难以实现细粒度的错误处理逻辑
- 无法在错误边界中执行异步操作（如自动跳转登录）

### 方案 2: 使用 React Error Boundary

**不采用的原因**:

- Error Boundary 只能捕获组件渲染错误
- 无法捕获异步操作（如 `openMindmap`）中的错误
- 需要在更上层添加额外的错误边界组件

### 方案 3: 在 Server Actions 中序列化错误代码

**不采用的原因**:

- 需要定义额外的错误码系统
- 增加复杂性，违反简单性原则
- 错误消息本身已经足够标识错误类型

### 方案 4: 全局错误处理 Hook

**不采用的原因**:

- 全局 Hook 难以访问组件特定的状态（如 `mindmapId`）
- 每个错误的处理逻辑不同，难以统一
- 当前的组件内处理已经足够清晰

## FAQ

### Q1: 为什么 `instanceof UnauthorizedError` 不工作？

**A**: Next.js Server Actions 在传递错误从服务端到客户端时会序列化错误对象。序列化过程中，错误对象会丢失原型链，导致客户端收到的是普通的 `Error` 对象，而不是 `UnauthorizedError` 的实例。因此 `instanceof` 检查总是返回 `false`。

**解决方案**: 使用错误消息检查：

```typescript
const errorMessage = error instanceof Error ? error.message : String(error);
if (errorMessage.includes("User not authenticated")) {
  // 处理认证错误
}
```

### Q2: 如何防止登录后的无限循环？

**A**: 在登录页面和登录 Action 中都需要检查 `redirect` 参数：

```typescript
// 登录页面
if (params.redirect?.startsWith("/login")) {
  redirectPath = "/dashboard"; // 防止循环
}

// 登录 Action
const destination =
  redirectTo && !redirectTo.startsWith("/login") ? redirectTo : "/dashboard";
```

### Q3: 用户登出后为什么不能访问本地缓存？

**A**: 出于安全考虑，即使数据在本地 IndexedDB 中，未登录用户也不应该访问。实现方式是在 `openMindmap` 函数中检查认证错误并重新抛出，阻止使用缓存数据：

```typescript
catch (error) {
  if (errorMessage.includes("User not authenticated")) {
    throw error;  // 重新抛出，不使用缓存
  }
  // 只有网络错误等非认证问题才使用缓存
}
```

### Q4: 为什么要转换 "Auth session missing" 错误？

**A**: Supabase 返回的 "Auth session missing" 是一个实现细节，不应该暴露给应用层。将其转换为 `UnauthorizedError` 有以下好处：

1. 统一错误处理逻辑
2. 语义更清晰（"未认证"vs"session missing"）
3. 解耦应用层和认证层的实现

### Q5: 如何在错误页面中使用自定义图标？

**A**: 错误页面使用 SVG 绘制的可爱蜘蛛插图。如需自定义：

1. 修改 `SpiderIllustration` 组件中的 SVG 路径
2. 调整颜色（`primaryColor`, `secondaryColor`）
3. 修改动画（`animate-swing`, `animate-float-fast`）

示例：

```typescript
<g className="animate-swing" style={{ transformOrigin: "200px 0px" }}>
  {/* 蜘蛛丝 */}
  <line x1="200" y1="0" x2="200" y2="100" stroke="#e5e7eb" strokeWidth="3" />

  {/* 蜘蛛身体 */}
  <g transform="translate(200, 160) rotate(10)">
    {/* ... SVG 路径 ... */}
  </g>
</g>
```

## 参考资料

- [Next.js Error Handling](https://nextjs.org/docs/app/building-your-application/routing/error-handling)
- [Supabase Auth Errors](https://supabase.com/docs/reference/javascript/auth-api-errors)
- [React Error Boundaries](https://react.dev/reference/react/Component#catching-rendering-errors-with-an-error-boundary)
- [Tailwind CSS Dark Mode](https://tailwindcss.com/docs/dark-mode)

## 修订历史

| 日期       | 版本 | 修改内容                     | 作者        |
| ---------- | ---- | ---------------------------- | ----------- |
| 2025-11-30 | 1.0  | 初始版本，完整的错误处理设计 | Claude Code |
