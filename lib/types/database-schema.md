# 数据库类型配置说明

## 自动类型生成

项目配置了自动从Supabase数据库生成TypeScript类型定义的功能。

### 使用方法

```bash
# 生成数据库类型定义
yarn db:types
```

### 配置说明

1. **类型文件位置**: `lib/types/supabase.ts`
2. **生成脚本**: 定义在 `package.json` 中的 `db:types` 脚本
3. **导出方式**: 通过 `lib/types/index.ts` 和 `lib/supabase/index.ts` 导出

### 当前状态

目前项目包含基础的类型定义模板，包括：

- `profiles` 表：用户资料信息
- `mind_maps` 表：思维导图数据

### Supabase 项目初始化后

当Supabase项目配置完成后：

1. 运行 `yarn db:types` 将自动覆盖模板文件
2. 生成真实的数据库类型定义
3. 所有Supabase客户端将获得完整的类型安全

### 类型使用示例

```typescript
import { supabase, type Profile, type MindMap } from "@/lib/supabase";

// 类型安全的数据查询
const { data: profiles } = await supabase
  .from("profiles")
  .select("*")
  .returns<Profile[]>();

// 类型安全的数据插入
const newMindMap: MindMapInsert = {
  title: "新思维导图",
  content: { nodes: [], connections: [] },
  user_id: "123",
  is_public: false,
};

await supabase.from("mind_maps").insert(newMindMap);
```

### 注意事项

1. 修改数据库结构后，记得运行 `yarn db:types` 更新类型定义
2. 不要手动编辑生成的 `supabase.ts` 文件，它会被覆盖
3. 如需添加自定义类型，请在 `lib/types/index.ts` 中定义
