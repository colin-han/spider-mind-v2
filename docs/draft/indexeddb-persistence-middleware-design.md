# IndexedDB 持久化方案设计 - 中间件模式

## 1. 概述与目标

### 1.1 核心目标

- 实现思维导图数据的本地持久化存储
- 提供自动保存能力,无需用户手动操作
- 页面刷新后能从本地缓存快速加载
- 为后续云端同步功能预留扩展空间

### 1.2 设计原则

- **单一数据源**: Zustand Store 是唯一的 Runtime 数据源
- **透明持久化**: 业务逻辑无需关心存储细节
- **高性能**: 单次操作 <5ms,不阻塞 UI
- **易测试**: 可独立测试业务逻辑和持久化逻辑
- **可扩展**: 支持后续添加云端同步、冲突解决等功能

## 2. 架构决策

### 2.1 为什么选择中间件模式?

经过对比 5 种方案后,选择**方案 4: Store + Smart Middleware**:

**对比其他方案的优势**:

- ✅ vs 方案 1(外部同步): 不需要 diff 算法,更精确高效
- ✅ vs 方案 2(Repository): Store 保持纯粹,不引入数据访问层概念
- ✅ vs 方案 3(Event Sourcing): 不需要重建状态,直接同步即可
- ✅ vs 方案 5(显式标记): 业务代码更简洁,不需要显式调用 sync

**核心优势**:

1. **关注点分离**: Store 专注业务逻辑,Middleware 处理持久化
2. **精确控制**: 通过操作元数据,知道具体发生了什么变化
3. **性能优化**: 只操作变化的记录,无需序列化整个状态
4. **透明集成**: 业务代码只需添加元数据,不改变逻辑结构
5. **易于扩展**: 可以轻松添加新的中间件(日志、云同步等)

### 2.2 架构图

```
┌─────────────────────────────────────────────────┐
│                  React Component                │
│          (MindmapEditor, MindmapNode)           │
└────────────────────┬────────────────────────────┘
                     │ dispatch actions
                     ↓
┌─────────────────────────────────────────────────┐
│              Zustand Store (业务逻辑)            │
│  ┌─────────────────────────────────────────┐   │
│  │  Actions with Metadata:                 │   │
│  │  addNode({ [OP_TYPE]: 'ADD_NODE', ... })│   │
│  │  updateNode(...)                        │   │
│  │  deleteNode(...)                        │   │
│  └─────────────────────────────────────────┘   │
└────────────────────┬────────────────────────────┘
                     │ setState with metadata
                     ↓
┌─────────────────────────────────────────────────┐
│          Persistence Middleware                 │
│  ┌─────────────────────────────────────────┐   │
│  │  1. 执行状态更新                         │   │
│  │  2. 检查操作元数据                       │   │
│  │  3. 执行对应的 IndexedDB 操作            │   │
│  └─────────────────────────────────────────┘   │
└────────────────────┬────────────────────────────┘
                     │ CRUD operations
                     ↓
┌─────────────────────────────────────────────────┐
│               IndexedDB Layer                   │
│  ┌──────────────┐      ┌──────────────────┐    │
│  │   mindmaps   │      │  mindmap_nodes   │    │
│  │  - id (PK)   │      │  - id (PK)       │    │
│  │  - short_id  │      │  - short_id      │    │
│  │  - title     │      │  - mindmap_id(FK)│    │
│  │  - ...       │      │  - content       │    │
│  └──────────────┘      │  - ...           │    │
│                        └──────────────────┘    │
└─────────────────────────────────────────────────┘
```

## 3. IndexedDB 数据库设计

### 3.1 数据库模式

```typescript
// lib/db/schema.ts
import { openDB, DBSchema } from "idb";

interface MindmapDB extends DBSchema {
  mindmaps: {
    key: string; // short_id
    value: {
      id: string;
      short_id: string;
      title: string;
      created_at: string;
      updated_at: string;
      user_id: string;
      deleted_at: string | null;
      // 编辑器状态
      currentNode: string | null; // 当前选中节点的 short_id
    };
    indexes: {
      "by-id": string;
      "by-updated": string;
    };
  };
  mindmap_nodes: {
    key: string; // short_id
    value: {
      id: string;
      short_id: string;
      mindmap_id: string;
      content: string;
      parent_id: string | null;
      order_index: number;
      created_at: string;
      updated_at: string;
      deleted_at: string | null;
    };
    indexes: {
      "by-mindmap": string;
      "by-parent": string;
    };
  };
}

export const dbPromise = openDB<MindmapDB>("mindmap-db", 1, {
  upgrade(db) {
    // mindmaps 表
    const mindmapStore = db.createObjectStore("mindmaps", {
      keyPath: "short_id",
    });
    mindmapStore.createIndex("by-id", "id");
    mindmapStore.createIndex("by-updated", "updated_at");

    // mindmap_nodes 表
    const nodeStore = db.createObjectStore("mindmap_nodes", {
      keyPath: "short_id",
    });
    nodeStore.createIndex("by-mindmap", "mindmap_id");
    nodeStore.createIndex("by-parent", "parent_id");
  },
});
```

### 3.2 索引设计说明

- **mindmaps.by-id**: 支持通过数据库 ID 快速查找
- **mindmaps.by-updated**: 支持按更新时间排序(最近编辑列表)
- **mindmap_nodes.by-mindmap**: 查询某个思维导图的所有节点
- **mindmap_nodes.by-parent**: 查询某个节点的所有子节点

## 4. 操作元数据模式

### 4.1 元数据符号定义

```typescript
// lib/store/operation-metadata.ts

export const OPERATION_TYPE = Symbol("operationType");

export type OperationType =
  // Mindmap 操作
  | "UPDATE_MINDMAP_TITLE"
  | "UPDATE_CURRENT_NODE"

  // Node 操作
  | "ADD_NODE"
  | "UPDATE_NODE_CONTENT"
  | "DELETE_NODE"
  | "MOVE_NODE"
  | "REORDER_NODES"

  // 编辑器状态(仅影响 mindmap 表)
  | "TOGGLE_EXPAND"
  | "SELECT_NODE";

export interface OperationMetadata {
  [OPERATION_TYPE]: OperationType;
  mindmapId?: string;
  nodeId?: string;
  nodeIds?: string[];
  currentNode?: string | null;
  // 其他操作特定数据
  [key: string]: unknown;
}
```

### 4.2 元数据使用示例

```typescript
// 在 Store 的 action 中添加元数据
addNode: (params: AddNodeParams) => {
  let newNode: MindmapNode | undefined;

  set(
    (state) => {
      newNode = {
        id: crypto.randomUUID(),
        short_id: generateShortId(),
        mindmap_id: state.mindmap?.id || '',
        content: params.content || '',
        parent_id: params.parent_id || null,
        order_index: params.order_index ?? 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        deleted_at: null,
      };
      state.nodes.set(newNode.short_id, newNode);
    },
    false,
    {
      [OPERATION_TYPE]: 'ADD_NODE',
      nodeId: newNode!.short_id,
      node: newNode!,
    } as OperationMetadata
  );
},
```

## 5. 中间件实现

### 5.1 持久化中间件核心逻辑

```typescript
// lib/store/middleware/persistence.middleware.ts
import { StateCreator, StoreMutatorIdentifier } from "zustand";
import { dbPromise } from "@/lib/db/schema";
import {
  OPERATION_TYPE,
  OperationType,
  OperationMetadata,
} from "../operation-metadata";

type PersistenceMiddleware = <
  T,
  Mps extends [StoreMutatorIdentifier, unknown][] = [],
  Mcs extends [StoreMutatorIdentifier, unknown][] = [],
>(
  config: StateCreator<T, Mps, Mcs>
) => StateCreator<T, Mps, Mcs>;

export const persistenceMiddleware: PersistenceMiddleware = (config) => {
  return (set, get, api) => {
    return config(
      async (partial, replace, meta?: OperationMetadata) => {
        // 1. 先执行状态更新
        set(partial, replace);

        // 2. 如果有操作元数据,执行持久化
        if (meta?.[OPERATION_TYPE]) {
          await executeSync(meta);
        }
      },
      get,
      api
    );
  };
};

async function executeSync(meta: OperationMetadata): Promise<void> {
  const db = await dbPromise;
  const opType = meta[OPERATION_TYPE] as OperationType;

  try {
    switch (opType) {
      case "ADD_NODE": {
        const { node } = meta;
        await db.put("mindmap_nodes", node);
        break;
      }

      case "UPDATE_NODE_CONTENT": {
        const { nodeId, content, updated_at } = meta;
        const existing = await db.get("mindmap_nodes", nodeId);
        if (existing) {
          await db.put("mindmap_nodes", {
            ...existing,
            content,
            updated_at,
          });
        }
        break;
      }

      case "DELETE_NODE": {
        const { nodeId } = meta;
        await db.delete("mindmap_nodes", nodeId);
        break;
      }

      case "UPDATE_CURRENT_NODE": {
        const { mindmapId, currentNode } = meta;
        const existing = await db.get("mindmaps", mindmapId);
        if (existing) {
          await db.put("mindmaps", {
            ...existing,
            currentNode,
            updated_at: new Date().toISOString(),
          });
        }
        break;
      }

      case "UPDATE_MINDMAP_TITLE": {
        const { mindmapId, title, updated_at } = meta;
        const existing = await db.get("mindmaps", mindmapId);
        if (existing) {
          await db.put("mindmaps", {
            ...existing,
            title,
            updated_at,
          });
        }
        break;
      }

      case "MOVE_NODE": {
        const { nodeId, parent_id, order_index, updated_at } = meta;
        const existing = await db.get("mindmap_nodes", nodeId);
        if (existing) {
          await db.put("mindmap_nodes", {
            ...existing,
            parent_id,
            order_index,
            updated_at,
          });
        }
        break;
      }

      case "REORDER_NODES": {
        const { updates } = meta; // Array<{ nodeId, order_index }>
        const tx = db.transaction("mindmap_nodes", "readwrite");
        await Promise.all(
          updates.map(async ({ nodeId, order_index }) => {
            const existing = await tx.store.get(nodeId);
            if (existing) {
              await tx.store.put({
                ...existing,
                order_index,
                updated_at: new Date().toISOString(),
              });
            }
          })
        );
        await tx.done;
        break;
      }

      // 仅影响内存状态,不需要持久化到 IndexedDB
      case "TOGGLE_EXPAND":
      case "SELECT_NODE":
        // 这些操作不需要持久化
        break;

      default:
        console.warn(`Unknown operation type: ${opType}`);
    }
  } catch (error) {
    console.error(`Failed to sync operation ${opType}:`, error);
    // TODO: 可以添加重试逻辑或错误队列
  }
}
```

### 5.2 Store 集成

```typescript
// lib/store/mindmap-editor.store.ts
import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
import { enableMapSet } from "immer";
import { persistenceMiddleware } from "./middleware/persistence.middleware";
import { OPERATION_TYPE } from "./operation-metadata";

enableMapSet();

export const useMindmapEditorStore = create<MindmapEditorStore>()(
  persistenceMiddleware(
    immer((set) => ({
      // ... state

      addNode: (params: AddNodeParams) => {
        let newNode: MindmapNode | undefined;

        set(
          (state) => {
            newNode = {
              id: crypto.randomUUID(),
              short_id: generateShortId(),
              mindmap_id: state.mindmap?.id || "",
              content: params.content || "",
              parent_id: params.parent_id || null,
              order_index: params.order_index ?? 0,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
              deleted_at: null,
            };
            state.nodes.set(newNode.short_id, newNode);
          },
          false,
          {
            [OPERATION_TYPE]: "ADD_NODE",
            nodeId: newNode!.short_id,
            node: newNode!,
          }
        );
      },

      updateNodeContent: (nodeId: string, content: string) => {
        set(
          (state) => {
            const node = state.nodes.get(nodeId);
            if (node) {
              node.content = content;
              node.updated_at = new Date().toISOString();
            }
          },
          false,
          {
            [OPERATION_TYPE]: "UPDATE_NODE_CONTENT",
            nodeId,
            content,
            updated_at: new Date().toISOString(),
          }
        );
      },

      setCurrentNode: (nodeId: string | null) => {
        set(
          (state) => {
            state.currentNode = nodeId;
          },
          false,
          {
            [OPERATION_TYPE]: "UPDATE_CURRENT_NODE",
            mindmapId: get().mindmap?.short_id,
            currentNode: nodeId,
          }
        );
      },

      // ... 其他 actions
    }))
  )
);
```

## 6. 数据加载策略

### 6.1 初始化加载流程

```typescript
// lib/hooks/use-mindmap-data.ts
import { useEffect } from "react";
import { useMindmapEditorStore } from "@/lib/store/mindmap-editor.store";
import { dbPromise } from "@/lib/db/schema";
import type { Mindmap, MindmapNode } from "@/types";

export function useMindmapData(
  serverMindmap: Mindmap,
  serverNodes: MindmapNode[]
) {
  useEffect(() => {
    async function initializeData() {
      const db = await dbPromise;

      // 1. 尝试从 IndexedDB 加载
      const cachedMindmap = await db.get("mindmaps", serverMindmap.short_id);
      const cachedNodes = await db.getAllFromIndex(
        "mindmap_nodes",
        "by-mindmap",
        serverMindmap.id
      );

      // 2. 比较时间戳,决定使用哪个数据源
      const useCache =
        cachedMindmap &&
        new Date(cachedMindmap.updated_at) > new Date(serverMindmap.updated_at);

      const mindmap = useCache ? cachedMindmap : serverMindmap;
      const nodes = useCache ? cachedNodes : serverNodes;

      // 3. 初始化 Store
      useMindmapEditorStore.setState((state) => {
        state.mindmap = mindmap;
        state.currentNode = mindmap.currentNode || null;

        state.nodes.clear();
        state.expandedNodes.clear();
        state.selectedNodes.clear();

        nodes.forEach((node) => {
          state.nodes.set(node.short_id, node);
          if (!node.parent_id) {
            state.expandedNodes.add(node.short_id);
          }
        });
      });

      // 4. 如果使用了服务器数据,同步到 IndexedDB
      if (!useCache) {
        await db.put("mindmaps", {
          ...serverMindmap,
          currentNode: null,
        });

        const tx = db.transaction("mindmap_nodes", "readwrite");
        await Promise.all(serverNodes.map((node) => tx.store.put(node)));
        await tx.done;
      }
    }

    initializeData();
  }, [serverMindmap, serverNodes]);
}
```

### 6.2 加载优先级

```
┌─────────────────────────────────────────┐
│         用户打开思维导图页面             │
└─────────────────┬───────────────────────┘
                  │
                  ↓
┌─────────────────────────────────────────┐
│    并行加载服务器数据和 IndexedDB 数据   │
│  ┌──────────────┐  ┌─────────────────┐  │
│  │ Server Data  │  │ IndexedDB Data  │  │
│  └──────────────┘  └─────────────────┘  │
└─────────────────┬───────────────────────┘
                  │
                  ↓
┌─────────────────────────────────────────┐
│         比较 updated_at 时间戳           │
│                                         │
│  if (cache.updated_at > server.updated) │
│    → 使用 IndexedDB (有本地修改)        │
│  else                                   │
│    → 使用 Server (云端有新版本)         │
└─────────────────┬───────────────────────┘
                  │
                  ↓
┌─────────────────────────────────────────┐
│         初始化 Zustand Store            │
└─────────────────────────────────────────┘
```

## 7. 测试策略

### 7.1 单元测试 - 中间件

```typescript
// lib/store/middleware/__tests__/persistence.middleware.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { create } from "zustand";
import { persistenceMiddleware } from "../persistence.middleware";
import { OPERATION_TYPE } from "../../operation-metadata";
import { dbPromise } from "@/lib/db/schema";

describe("Persistence Middleware", () => {
  beforeEach(async () => {
    // 清空测试数据库
    const db = await dbPromise;
    await db.clear("mindmaps");
    await db.clear("mindmap_nodes");
  });

  it("should persist ADD_NODE operation", async () => {
    const useStore = create<TestStore>()(
      persistenceMiddleware((set) => ({
        nodes: new Map(),
        addNode: (node) => {
          set(
            (state) => {
              state.nodes.set(node.short_id, node);
            },
            false,
            {
              [OPERATION_TYPE]: "ADD_NODE",
              node,
            }
          );
        },
      }))
    );

    const testNode = {
      id: "1",
      short_id: "abc",
      content: "Test",
      mindmap_id: "mindmap-1",
      // ...
    };

    useStore.getState().addNode(testNode);

    // 等待异步持久化完成
    await new Promise((resolve) => setTimeout(resolve, 10));

    const db = await dbPromise;
    const persisted = await db.get("mindmap_nodes", "abc");

    expect(persisted).toEqual(testNode);
  });

  it("should not persist TOGGLE_EXPAND operation", async () => {
    // 测试内存状态操作不会触发持久化
  });
});
```

### 7.2 集成测试 - 完整流程

```typescript
// app/mindmaps/[shortId]/__tests__/mindmap-persistence.test.tsx
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MindmapEditor } from '@/components/mindmap/MindmapEditor';

describe('Mindmap Persistence Integration', () => {
  it('should persist node creation and reload from cache', async () => {
    // 1. 渲染编辑器
    const { unmount } = render(<MindmapEditor />);

    // 2. 创建节点
    const addButton = screen.getByTestId('add-root-node-button');
    await userEvent.click(addButton);

    const input = screen.getByTestId('node-input');
    await userEvent.type(input, 'New Node');
    await userEvent.keyboard('{Enter}');

    // 3. 等待持久化
    await waitFor(() => {
      expect(screen.getByText('New Node')).toBeInTheDocument();
    });

    // 4. 卸载组件(模拟页面关闭)
    unmount();

    // 5. 重新渲染(模拟页面重新打开)
    render(<MindmapEditor />);

    // 6. 验证从缓存加载
    await waitFor(() => {
      expect(screen.getByText('New Node')).toBeInTheDocument();
    });
  });
});
```

### 7.3 性能测试

```typescript
// lib/store/middleware/__tests__/performance.test.ts
import { describe, it, expect } from "vitest";

describe("Persistence Performance", () => {
  it("should complete single node save in <5ms", async () => {
    const start = performance.now();

    await db.put("mindmap_nodes", testNode);

    const duration = performance.now() - start;
    expect(duration).toBeLessThan(5);
  });

  it("should handle 100 rapid updates without blocking", async () => {
    const updates = Array.from({ length: 100 }, (_, i) => ({
      nodeId: `node-${i}`,
      content: `Content ${i}`,
    }));

    const start = performance.now();

    await Promise.all(
      updates.map((update) =>
        useStore.getState().updateNodeContent(update.nodeId, update.content)
      )
    );

    const duration = performance.now() - start;
    expect(duration).toBeLessThan(500); // 平均 <5ms per update
  });
});
```

## 8. 性能特性

### 8.1 操作性能基准

| 操作类型                  | 预期耗时 | 说明                |
| ------------------------- | -------- | ------------------- |
| 单节点创建                | <5ms     | put 操作            |
| 单节点更新                | <3ms     | put 覆盖            |
| 单节点删除                | <3ms     | delete 操作         |
| 批量重排序(10个节点)      | <20ms    | 事务批量 put        |
| 加载完整思维导图(100节点) | <50ms    | getAll + 初始化     |
| 切换选中节点              | 0ms      | 纯内存操作,不持久化 |

### 8.2 优化策略

1. **事务批处理**: 对于批量操作(如重排序),使用事务一次性提交
2. **选择性持久化**: 通过操作类型区分,避免不必要的磁盘 I/O
3. **索引优化**: 为常用查询场景建立索引
4. **错误恢复**: 失败操作不阻塞 UI,可后台重试

## 9. 实现阶段规划

### Phase 1: 核心基础设施 (1-2天)

- [ ] 创建 IndexedDB schema 和初始化代码
- [ ] 实现基础 CRUD 操作函数
- [ ] 创建持久化中间件框架
- [ ] 编写单元测试

### Phase 2: Store 集成 (1-2天)

- [ ] 为所有 Store actions 添加操作元数据
- [ ] 在中间件中实现各操作类型的同步逻辑
- [ ] 实现数据加载策略(服务器 vs 缓存)
- [ ] 编写集成测试

### Phase 3: 优化与监控 (1天)

- [ ] 添加性能监控(记录操作耗时)
- [ ] 实现错误重试机制
- [ ] 优化批量操作
- [ ] 性能测试和调优

### Phase 4: 云端同步扩展(未来)

- [ ] 添加冲突检测中间件
- [ ] 实现变更队列和上传逻辑
- [ ] 设计冲突解决策略

## 10. 完整代码示例

### 10.1 Store Actions 完整示例

```typescript
// lib/store/mindmap-editor.store.ts (完整版)
export const useMindmapEditorStore = create<MindmapEditorStore>()(
  persistenceMiddleware(
    immer((set, get) => ({
      // State
      mindmap: null,
      nodes: new Map(),
      expandedNodes: new Set(),
      selectedNodes: new Set(),
      currentNode: null,

      // Actions with metadata
      addNode: (params: AddNodeParams) => {
        let newNode: MindmapNode | undefined;

        set(
          (state) => {
            newNode = {
              id: crypto.randomUUID(),
              short_id: generateShortId(),
              mindmap_id: state.mindmap?.id || "",
              content: params.content || "",
              parent_id: params.parent_id || null,
              order_index: params.order_index ?? 0,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
              deleted_at: null,
            };
            state.nodes.set(newNode.short_id, newNode);

            // 如果是根节点,自动展开
            if (!newNode.parent_id) {
              state.expandedNodes.add(newNode.short_id);
            }
          },
          false,
          {
            [OPERATION_TYPE]: "ADD_NODE",
            nodeId: newNode!.short_id,
            node: newNode!,
          }
        );
      },

      updateNodeContent: (nodeId: string, content: string) => {
        set(
          (state) => {
            const node = state.nodes.get(nodeId);
            if (node) {
              node.content = content;
              node.updated_at = new Date().toISOString();
            }
          },
          false,
          {
            [OPERATION_TYPE]: "UPDATE_NODE_CONTENT",
            nodeId,
            content,
            updated_at: new Date().toISOString(),
          }
        );
      },

      deleteNode: (nodeId: string) => {
        set(
          (state) => {
            state.nodes.delete(nodeId);
            state.expandedNodes.delete(nodeId);
            state.selectedNodes.delete(nodeId);
            if (state.currentNode === nodeId) {
              state.currentNode = null;
            }
          },
          false,
          {
            [OPERATION_TYPE]: "DELETE_NODE",
            nodeId,
          }
        );
      },

      moveNode: (
        nodeId: string,
        newParentId: string | null,
        order_index: number
      ) => {
        set(
          (state) => {
            const node = state.nodes.get(nodeId);
            if (node) {
              node.parent_id = newParentId;
              node.order_index = order_index;
              node.updated_at = new Date().toISOString();
            }
          },
          false,
          {
            [OPERATION_TYPE]: "MOVE_NODE",
            nodeId,
            parent_id: newParentId,
            order_index,
            updated_at: new Date().toISOString(),
          }
        );
      },

      reorderNodes: (
        updates: Array<{ nodeId: string; order_index: number }>
      ) => {
        set(
          (state) => {
            const now = new Date().toISOString();
            updates.forEach(({ nodeId, order_index }) => {
              const node = state.nodes.get(nodeId);
              if (node) {
                node.order_index = order_index;
                node.updated_at = now;
              }
            });
          },
          false,
          {
            [OPERATION_TYPE]: "REORDER_NODES",
            updates,
          }
        );
      },

      setCurrentNode: (nodeId: string | null) => {
        set(
          (state) => {
            state.currentNode = nodeId;
          },
          false,
          {
            [OPERATION_TYPE]: "UPDATE_CURRENT_NODE",
            mindmapId: get().mindmap?.short_id,
            currentNode: nodeId,
          }
        );
      },

      updateMindmapTitle: (title: string) => {
        set(
          (state) => {
            if (state.mindmap) {
              state.mindmap.title = title;
              state.mindmap.updated_at = new Date().toISOString();
            }
          },
          false,
          {
            [OPERATION_TYPE]: "UPDATE_MINDMAP_TITLE",
            mindmapId: get().mindmap?.short_id,
            title,
            updated_at: new Date().toISOString(),
          }
        );
      },

      // 纯内存操作,无需持久化
      toggleExpand: (nodeId: string) => {
        set(
          (state) => {
            if (state.expandedNodes.has(nodeId)) {
              state.expandedNodes.delete(nodeId);
            } else {
              state.expandedNodes.add(nodeId);
            }
          },
          false,
          { [OPERATION_TYPE]: "TOGGLE_EXPAND", nodeId }
        );
      },

      selectNode: (nodeId: string, multi = false) => {
        set(
          (state) => {
            if (!multi) {
              state.selectedNodes.clear();
            }
            state.selectedNodes.add(nodeId);
          },
          false,
          { [OPERATION_TYPE]: "SELECT_NODE", nodeId }
        );
      },
    }))
  )
);
```

## 11. 错误处理与监控

### 11.1 错误处理策略

```typescript
// lib/store/middleware/persistence.middleware.ts (增强版)
async function executeSync(meta: OperationMetadata): Promise<void> {
  const db = await dbPromise;
  const opType = meta[OPERATION_TYPE] as OperationType;

  try {
    // ... 执行同步逻辑
  } catch (error) {
    console.error(`Failed to sync operation ${opType}:`, error);

    // 记录失败操作,可选择性重试
    await recordFailedOperation(meta, error);

    // 可以添加用户提示(可选)
    if (shouldNotifyUser(error)) {
      notifyPersistenceError(opType);
    }
  }
}

// 失败操作队列
async function recordFailedOperation(meta: OperationMetadata, error: unknown) {
  const failedOps = await db.get("failed_operations", meta[OPERATION_TYPE]);
  // 存储失败操作,后续可重试
}
```

### 11.2 性能监控

```typescript
// lib/utils/performance-monitor.ts
export class PersistenceMonitor {
  private static metrics: Map<OperationType, number[]> = new Map();

  static recordDuration(opType: OperationType, duration: number) {
    if (!this.metrics.has(opType)) {
      this.metrics.set(opType, []);
    }
    this.metrics.get(opType)!.push(duration);
  }

  static getStats(opType: OperationType) {
    const durations = this.metrics.get(opType) || [];
    return {
      count: durations.length,
      avg: durations.reduce((a, b) => a + b, 0) / durations.length,
      max: Math.max(...durations),
      min: Math.min(...durations),
    };
  }
}

// 在中间件中使用
async function executeSync(meta: OperationMetadata): Promise<void> {
  const start = performance.now();

  try {
    // ... 执行同步
  } finally {
    const duration = performance.now() - start;
    PersistenceMonitor.recordDuration(meta[OPERATION_TYPE], duration);

    if (duration > 10) {
      console.warn(
        `Slow persistence operation: ${meta[OPERATION_TYPE]} took ${duration}ms`
      );
    }
  }
}
```

## 12. 未来扩展路径

### 12.1 云端同步支持

```typescript
// 可以添加新的中间件来处理云端同步
export const cloudSyncMiddleware: CloudSyncMiddleware = (config) => {
  return (set, get, api) => {
    return config(
      async (partial, replace, meta) => {
        set(partial, replace);

        if (meta?.[OPERATION_TYPE]) {
          // 1. 本地持久化(现有逻辑)
          await executeSync(meta);

          // 2. 添加到上传队列
          await queueForUpload(meta);
        }
      },
      get,
      api
    );
  };
};

// Store 集成多个中间件
export const useMindmapEditorStore = create<MindmapEditorStore>()(
  persistenceMiddleware(
    cloudSyncMiddleware(
      immer((set, get) => ({
        // ... store implementation
      }))
    )
  )
);
```

### 12.2 离线支持与冲突解决

未来可以基于操作元数据实现:

- **操作日志**: 记录所有操作序列,支持离线操作回放
- **冲突检测**: 比较本地和云端的操作序列
- **自动合并**: 基于操作类型智能合并非冲突变更
- **手动解决**: 提供 UI 让用户选择冲突解决策略

## 13. 总结

### 13.1 方案优势

✅ **清晰的架构**: Store 专注业务逻辑,中间件处理持久化
✅ **高性能**: 单次操作 <5ms,不影响用户体验
✅ **易于测试**: 可以独立测试业务逻辑和持久化逻辑
✅ **可扩展**: 轻松添加云端同步、日志、监控等功能
✅ **精确控制**: 通过元数据知道具体变更,无需 diff 算法

### 13.2 关键决策

1. 使用 **Zustand 中间件** 模式,而非 Repository 或 Event Sourcing
2. 通过 **操作元数据** 实现精确的持久化控制
3. **IndexedDB 作为本地缓存**,Zustand Store 是唯一运行时数据源
4. 支持 **服务器数据优先** 的加载策略,避免数据丢失
5. 为未来的 **云端同步** 预留扩展空间

### 13.3 实施建议

- 从 Phase 1 开始,逐步实施各阶段
- 每个阶段都编写充分的测试
- 持续监控性能指标,及时优化
- 收集用户反馈,迭代改进体验
