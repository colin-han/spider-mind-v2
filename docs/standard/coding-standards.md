# 代码规范和最佳实践

本文档定义了 Spider Mind v2 项目的代码规范和最佳实践，确保团队代码质量和一致性。

## 🎯 总体原则

1. **一致性**: 遵循统一的代码风格和命名约定
2. **可读性**: 编写清晰、易于理解的代码
3. **可维护性**: 保持模块化和低耦合的设计
4. **性能**: 考虑运行时性能和构建性能
5. **安全性**: 避免常见的安全漏洞

## 📝 TypeScript 规范

### 类型定义

#### ✅ 良好实践

```typescript
// 使用 interface 定义对象结构
interface User {
  id: string;
  name: string;
  email: string;
  createdAt: Date;
  updatedAt: Date;
}

// 使用 type 定义联合类型和复杂类型
type Theme = "light" | "dark" | "system";
type ApiResponse<T> = {
  data: T;
  success: boolean;
  message?: string;
};

// 使用泛型提高复用性
interface Repository<T> {
  create(item: Omit<T, "id">): Promise<T>;
  findById(id: string): Promise<T | null>;
  update(id: string, updates: Partial<T>): Promise<T>;
  delete(id: string): Promise<void>;
}
```

#### ❌ 避免的写法

```typescript
// 避免使用 any 类型
const data: any = await fetchData(); // ❌

// 避免使用 unknown 除非必要
const response: unknown = await api.call(); // ❌ (除非确实不知道类型)

// 避免过度使用类型断言
const user = data as User; // ❌ (应该使用类型守卫)
```

### 函数和方法

#### ✅ 良好实践

```typescript
// 明确的函数签名
async function createUser(
  userData: Omit<User, "id" | "createdAt" | "updatedAt">
): Promise<User> {
  // 实现...
}

// 使用类型守卫
function isUser(value: unknown): value is User {
  return (
    typeof value === "object" &&
    value !== null &&
    "id" in value &&
    "name" in value &&
    "email" in value
  );
}

// 错误处理
async function fetchUserById(id: string): Promise<User> {
  try {
    const response = await api.get(`/users/${id}`);
    if (!isUser(response.data)) {
      throw new Error("Invalid user data received");
    }
    return response.data;
  } catch (error) {
    console.error("Failed to fetch user:", error);
    throw error;
  }
}
```

### 导入和导出

#### ✅ 良好实践

```typescript
// 使用命名导入/导出 (推荐)
export const UserService = {
  create,
  findById,
  update,
  delete: deleteUser,
};

// 导入时使用明确的命名
import { UserService } from "@/lib/services/userService";
import { Button, Input } from "@/lib/components/ui";

// 类型导入使用 type 关键字
import type { User, CreateUserRequest } from "@/lib/types/user";
```

#### ❌ 避免的写法

```typescript
// 避免默认导出 (除了 Next.js 页面组件)
export default UserService; // ❌

// 避免 namespace 导入
import * as UserService from "@/lib/services/userService"; // ❌
```

## ⚛️ React 最佳实践

### 组件设计

#### ✅ 良好实践

```typescript
// 函数组件使用接口定义 Props
interface ButtonProps {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  onClick?: () => void;
  className?: string;
}

// 使用 forwardRef 支持 ref 传递
const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ children, variant = 'primary', size = 'md', disabled, onClick, className }, ref) => {
    const baseClasses = 'btn';
    const variantClasses = {
      primary: 'btn-primary',
      secondary: 'btn-secondary',
      danger: 'btn-danger'
    };
    const sizeClasses = {
      sm: 'btn-sm',
      md: 'btn-md',
      lg: 'btn-lg'
    };

    const classes = clsx(
      baseClasses,
      variantClasses[variant],
      sizeClasses[size],
      disabled && 'btn-disabled',
      className
    );

    return (
      <button
        ref={ref}
        className={classes}
        disabled={disabled}
        onClick={onClick}
        type="button"
      >
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';
```

### Hooks 使用

#### ✅ 良好实践

```typescript
// 自定义 Hook
function useLocalStorage<T>(key: string, initialValue: T) {
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      if (typeof window === 'undefined') return initialValue;
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.error(`Error reading localStorage key "${key}":`, error);
      return initialValue;
    }
  });

  const setValue = useCallback((value: T | ((val: T) => T)) => {
    try {
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      setStoredValue(valueToStore);

      if (typeof window !== 'undefined') {
        window.localStorage.setItem(key, JSON.stringify(valueToStore));
      }
    } catch (error) {
      console.error(`Error setting localStorage key "${key}":`, error);
    }
  }, [key, storedValue]);

  return [storedValue, setValue] as const;
}

// 使用 useMemo 和 useCallback 优化性能
function UserList({ users, onUserSelect }: UserListProps) {
  const sortedUsers = useMemo(() => {
    return users.sort((a, b) => a.name.localeCompare(b.name));
  }, [users]);

  const handleUserClick = useCallback((userId: string) => {
    onUserSelect(userId);
  }, [onUserSelect]);

  return (
    <div>
      {sortedUsers.map(user => (
        <UserCard
          key={user.id}
          user={user}
          onClick={handleUserClick}
        />
      ))}
    </div>
  );
}
```

### 状态管理

#### ✅ 良好实践

```typescript
// 使用 useReducer 管理复杂状态
interface TodoState {
  todos: Todo[];
  filter: "all" | "active" | "completed";
  isLoading: boolean;
}

type TodoAction =
  | { type: "ADD_TODO"; payload: Todo }
  | { type: "TOGGLE_TODO"; payload: string }
  | { type: "SET_FILTER"; payload: "all" | "active" | "completed" }
  | { type: "SET_LOADING"; payload: boolean };

function todoReducer(state: TodoState, action: TodoAction): TodoState {
  switch (action.type) {
    case "ADD_TODO":
      return {
        ...state,
        todos: [...state.todos, action.payload],
      };
    case "TOGGLE_TODO":
      return {
        ...state,
        todos: state.todos.map((todo) =>
          todo.id === action.payload
            ? { ...todo, completed: !todo.completed }
            : todo
        ),
      };
    case "SET_FILTER":
      return {
        ...state,
        filter: action.payload,
      };
    case "SET_LOADING":
      return {
        ...state,
        isLoading: action.payload,
      };
    default:
      return state;
  }
}
```

## 🎨 样式和 CSS

### Tailwind CSS 使用

#### ✅ 良好实践

```typescript
// 使用 clsx 组合类名
import clsx from 'clsx';

function Card({ variant, size, children, className }: CardProps) {
  return (
    <div className={clsx(
      // 基础样式
      'rounded-lg border shadow-sm',
      // 变体样式
      {
        'bg-white border-gray-200': variant === 'default',
        'bg-gray-50 border-gray-300': variant === 'secondary',
        'bg-red-50 border-red-200': variant === 'error'
      },
      // 尺寸样式
      {
        'p-3': size === 'sm',
        'p-4': size === 'md',
        'p-6': size === 'lg'
      },
      // 外部传入的类名
      className
    )}>
      {children}
    </div>
  );
}

// 使用 CSS 变量支持主题切换
:root {
  --color-primary: 59 130 246; /* blue-500 */
  --color-primary-foreground: 255 255 255;
  --color-secondary: 107 114 128; /* gray-500 */
}

.dark {
  --color-primary: 147 197 253; /* blue-300 */
  --color-primary-foreground: 30 58 138; /* blue-900 */
}
```

### 响应式设计

```typescript
// 移动优先的响应式类名
<div className="
  grid grid-cols-1 gap-4
  sm:grid-cols-2 sm:gap-6
  md:grid-cols-3
  lg:grid-cols-4 lg:gap-8
">
  {items.map(item => <Item key={item.id} {...item} />)}
</div>
```

## 🧪 测试规范

### 单元测试

#### ✅ 良好实践

```typescript
// 描述性的测试名称
describe("UserService", () => {
  describe("createUser", () => {
    it("should create a new user with valid data", async () => {
      // Arrange
      const userData = {
        name: "John Doe",
        email: "john@example.com",
      };

      // Act
      const result = await UserService.createUser(userData);

      // Assert
      expect(result).toEqual(
        expect.objectContaining({
          id: expect.any(String),
          name: userData.name,
          email: userData.email,
          createdAt: expect.any(Date),
          updatedAt: expect.any(Date),
        })
      );
    });

    it("should throw error when email is invalid", async () => {
      // Arrange
      const invalidUserData = {
        name: "John Doe",
        email: "invalid-email",
      };

      // Act & Assert
      await expect(UserService.createUser(invalidUserData)).rejects.toThrow(
        "Invalid email format"
      );
    });
  });
});
```

### React 组件测试

```typescript
// 使用 Testing Library
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { UserProfile } from './UserProfile';

describe('UserProfile', () => {
  const mockUser = {
    id: '1',
    name: 'John Doe',
    email: 'john@example.com'
  };

  it('should display user information correctly', () => {
    render(<UserProfile user={mockUser} />);

    expect(screen.getByText(mockUser.name)).toBeInTheDocument();
    expect(screen.getByText(mockUser.email)).toBeInTheDocument();
  });

  it('should call onEdit when edit button is clicked', async () => {
    const mockOnEdit = jest.fn();
    render(<UserProfile user={mockUser} onEdit={mockOnEdit} />);

    fireEvent.click(screen.getByRole('button', { name: /edit/i }));

    await waitFor(() => {
      expect(mockOnEdit).toHaveBeenCalledWith(mockUser.id);
    });
  });
});
```

## 🚀 性能优化

### 代码分割

```typescript
// 动态导入组件
import { lazy, Suspense } from 'react';

const LazyComponent = lazy(() => import('./LazyComponent'));

function App() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <LazyComponent />
    </Suspense>
  );
}

// Next.js 动态导入
import dynamic from 'next/dynamic';

const DynamicChart = dynamic(() => import('./Chart'), {
  loading: () => <p>Loading chart...</p>,
  ssr: false // 仅在客户端渲染
});
```

### 图片优化

```typescript
// 使用 Next.js Image 组件
import Image from 'next/image';

function UserAvatar({ user }: { user: User }) {
  return (
    <Image
      src={user.avatar || '/default-avatar.png'}
      alt={`${user.name}'s avatar`}
      width={40}
      height={40}
      className="rounded-full"
      priority={false} // 非关键图片设为 false
    />
  );
}
```

## 🔒 安全最佳实践

### 输入验证

```typescript
import { z } from "zod";

// 使用 Zod 进行数据验证
const CreateUserSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  email: z.string().email("Invalid email format"),
  age: z.number().min(0).max(150).optional(),
});

export async function createUser(data: unknown) {
  // 验证输入数据
  const validatedData = CreateUserSchema.parse(data);

  // 继续处理...
  return await UserService.create(validatedData);
}
```

### XSS 防护

```typescript
// 避免 dangerouslySetInnerHTML
// ❌ 危险
<div dangerouslySetInnerHTML={{ __html: userContent }} />

// ✅ 安全
import DOMPurify from 'isomorphic-dompurify';

function SafeContent({ content }: { content: string }) {
  const sanitizedContent = DOMPurify.sanitize(content);
  return <div dangerouslySetInnerHTML={{ __html: sanitizedContent }} />;
}
```

## 📋 代码审查检查清单

### 通用检查项

- [ ] 代码遵循项目的命名约定
- [ ] 函数和变量名清晰表达意图
- [ ] 没有使用 `any` 类型
- [ ] 所有函数都有明确的类型签名
- [ ] 错误处理得当
- [ ] 没有硬编码的魔法数字或字符串
- [ ] 代码有适当的注释说明复杂逻辑

### React 组件检查项

- [ ] 组件职责单一，复用性好
- [ ] Props 接口定义清晰
- [ ] 适当使用 `useMemo` 和 `useCallback` 优化性能
- [ ] 事件处理函数命名规范 (handle\*)
- [ ] 没有在 render 函数中创建新对象或函数
- [ ] 适当的 key 属性用于列表渲染

### 性能检查项

- [ ] 大型组件使用懒加载
- [ ] 图片使用 Next.js Image 组件
- [ ] API 调用有适当的缓存策略
- [ ] 避免不必要的重新渲染
- [ ] 长列表使用虚拟滚动

### 安全检查项

- [ ] 用户输入经过验证和清理
- [ ] 没有使用 eval() 或 Function() 构造器
- [ ] 外部链接使用 rel="noopener noreferrer"
- [ ] 敏感信息不在客户端代码中暴露

### 测试检查项

- [ ] 关键功能有相应的单元测试
- [ ] 测试覆盖率达到要求 (>80%)
- [ ] 测试名称清晰描述测试场景
- [ ] 使用 AAA 模式 (Arrange, Act, Assert)

## 🔧 工具配置

### ESLint 规则

项目使用以下关键 ESLint 规则:

```json
{
  "rules": {
    "@typescript-eslint/no-explicit-any": "error",
    "@typescript-eslint/no-unused-vars": "error",
    "@typescript-eslint/prefer-const": "error",
    "react/jsx-key": "error",
    "react-hooks/rules-of-hooks": "error",
    "react-hooks/exhaustive-deps": "warn"
  }
}
```

### Prettier 配置

```json
{
  "semi": true,
  "trailingComma": "es5",
  "singleQuote": false,
  "printWidth": 80,
  "tabWidth": 2,
  "useTabs": false
}
```

## 📚 学习资源

### TypeScript

- [TypeScript 官方文档](https://www.typescriptlang.org/docs/)
- [TypeScript 深入理解](https://basarat.gitbook.io/typescript/)

### React

- [React 官方文档](https://react.dev/)
- [React Patterns](https://reactpatterns.com/)

### 测试

- [Testing Library 文档](https://testing-library.com/)
- [Jest 文档](https://jestjs.io/docs/)

---

遵循这些规范和最佳实践将帮助我们构建高质量、可维护的代码库。如有疑问或建议，请在团队中讨论并更新本文档。
