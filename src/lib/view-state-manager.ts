/**
 * 思维导图的视图状态
 * 保存在 localStorage 中，key 为 'viewState:{mindmapId}'
 */
export interface ViewState {
  /** 视口状态 */
  viewport: {
    x: number; // 视口左边缘 X 坐标（节点坐标系）
    y: number; // 视口上边缘 Y 坐标（节点坐标系）
    zoom: number; // 缩放比例 (0.1 - 2.0)
  };

  /** 折叠的节点 short_id 列表 */
  collapsedNodes: string[];

  /** 当前选中节点的 short_id */
  currentNode: string;

  /** 最后更新时间（ISO 8601 格式） */
  lastUpdated: string;

  /** 数据版本号（用于未来升级） */
  version: number; // 当前版本为 1
}

/**
 * 视图状态索引
 * 用于管理和清理 localStorage 中的视图状态
 */
interface ViewStateIndex {
  [mindmapId: string]: {
    lastAccessed: string; // 最后访问时间
    size: number; // 数据大小（字节）
  };
}

/**
 * 视图状态管理器
 * 负责保存和加载视图状态到 localStorage
 */
export class ViewStateManager {
  private static readonly VERSION = 1;
  private static readonly MAX_ENTRIES = 50;
  private static readonly MAX_AGE_DAYS = 90;

  /**
   * 保存视图状态
   */
  static save(mindmapId: string, state: Partial<ViewState>): void {
    try {
      // 1. 读取现有状态
      const existing = this.load(mindmapId);

      // 2. 合并状态
      const merged: ViewState = {
        viewport: state.viewport ??
          existing?.viewport ?? { x: 0, y: 0, zoom: 1 },
        collapsedNodes: state.collapsedNodes ?? existing?.collapsedNodes ?? [],
        currentNode: state.currentNode ?? existing?.currentNode ?? "",
        lastUpdated: new Date().toISOString(),
        version: this.VERSION,
      };

      // 3. 保存到 localStorage
      const key = `viewState:${mindmapId}`;
      localStorage.setItem(key, JSON.stringify(merged));

      // 4. 更新索引
      this.updateIndex(mindmapId, JSON.stringify(merged).length);

      // 5. 清理过期数据
      this.cleanup();
    } catch (error) {
      console.error("[ViewStateManager] Failed to save view state:", error);
      // 保存失败不应该影响正常使用，静默处理
    }
  }

  /**
   * 加载视图状态
   */
  static load(mindmapId: string): ViewState | null {
    try {
      const key = `viewState:${mindmapId}`;
      const json = localStorage.getItem(key);

      if (!json) {
        return null;
      }

      const state = JSON.parse(json) as ViewState;

      // 验证版本号
      if (state.version !== this.VERSION) {
        console.warn(
          `[ViewStateManager] Version mismatch: ${state.version} !== ${this.VERSION}`
        );
        return null;
      }

      // 更新访问时间
      this.updateIndex(mindmapId, json.length);

      return state;
    } catch (error) {
      console.error("[ViewStateManager] Failed to load view state:", error);
      return null;
    }
  }

  /**
   * 删除视图状态
   */
  static remove(mindmapId: string): void {
    try {
      const key = `viewState:${mindmapId}`;
      localStorage.removeItem(key);
      this.removeFromIndex(mindmapId);
    } catch (error) {
      console.error("[ViewStateManager] Failed to remove view state:", error);
    }
  }

  /**
   * 更新索引
   */
  private static updateIndex(mindmapId: string, size: number): void {
    try {
      const indexKey = "viewStateIndex";
      const indexJson = localStorage.getItem(indexKey);
      const index: ViewStateIndex = indexJson ? JSON.parse(indexJson) : {};

      index[mindmapId] = {
        lastAccessed: new Date().toISOString(),
        size,
      };

      localStorage.setItem(indexKey, JSON.stringify(index));
    } catch (error) {
      console.error("[ViewStateManager] Failed to update index:", error);
    }
  }

  /**
   * 从索引中移除
   */
  private static removeFromIndex(mindmapId: string): void {
    try {
      const indexKey = "viewStateIndex";
      const indexJson = localStorage.getItem(indexKey);
      if (!indexJson) return;

      const index: ViewStateIndex = JSON.parse(indexJson);
      delete index[mindmapId];
      localStorage.setItem(indexKey, JSON.stringify(index));
    } catch (error) {
      console.error("[ViewStateManager] Failed to remove from index:", error);
    }
  }

  /**
   * 清理过期数据
   */
  private static cleanup(): void {
    try {
      const indexKey = "viewStateIndex";
      const indexJson = localStorage.getItem(indexKey);
      if (!indexJson) return;

      const index: ViewStateIndex = JSON.parse(indexJson);
      const now = new Date().getTime();
      const maxAgeMs = this.MAX_AGE_DAYS * 24 * 60 * 60 * 1000;

      // 1. 按最后访问时间排序
      const entries = Object.entries(index).sort(
        (a, b) =>
          new Date(b[1].lastAccessed).getTime() -
          new Date(a[1].lastAccessed).getTime()
      );

      // 2. 删除超过最大数量的条目
      const toDelete = entries.slice(this.MAX_ENTRIES);

      // 3. 删除超过最大年龄的条目
      entries.forEach(([mindmapId, meta]) => {
        const age = now - new Date(meta.lastAccessed).getTime();
        if (age > maxAgeMs) {
          toDelete.push([mindmapId, meta]);
        }
      });

      // 4. 执行删除
      toDelete.forEach(([mindmapId]) => {
        this.remove(mindmapId);
      });

      if (toDelete.length > 0) {
        console.log(
          `[ViewStateManager] Cleaned up ${toDelete.length} expired view states`
        );
      }
    } catch (error) {
      console.error("[ViewStateManager] Failed to cleanup:", error);
    }
  }
}
