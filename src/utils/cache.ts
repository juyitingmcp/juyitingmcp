import { CacheEntry } from '../types.js';
import { DEFAULT_CONFIG } from '../constants.js';

/**
 * LRU缓存管理器
 * 支持TTL（生存时间）和LRU（最近最少使用）淘汰策略
 */
export class CacheManager {
  private cache = new Map<string, CacheEntry>();
  private readonly maxSize: number;
  private readonly defaultTTL: number;

  constructor(maxSize = DEFAULT_CONFIG.MAX_CACHE_SIZE, defaultTTL = DEFAULT_CONFIG.CACHE_DURATION) {
    this.maxSize = maxSize;
    this.defaultTTL = defaultTTL;
  }

  /**
   * 设置缓存项
   * @param key 缓存键
   * @param value 缓存值
   * @param ttl 生存时间（毫秒），默认使用配置的TTL
   */
  set(key: string, value: any, ttl?: number): void {
    const expiry = Date.now() + (ttl || this.defaultTTL);

    // LRU淘汰：如果缓存已满，删除最旧的项
    if (this.cache.size >= this.maxSize && !this.cache.has(key)) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey) {
        this.cache.delete(firstKey);
      }
    }

    // 如果key已存在，先删除（这样重新插入会更新顺序）
    if (this.cache.has(key)) {
      this.cache.delete(key);
    }

    this.cache.set(key, { value, expiry });
  }

  /**
   * 获取缓存项
   * @param key 缓存键
   * @returns 缓存值或null（如果不存在或已过期）
   */
  get(key: string): any | null {
    const entry = this.cache.get(key);
    
    if (!entry) {
      return null;
    }

    // 检查是否过期
    if (Date.now() > entry.expiry) {
      this.cache.delete(key);
      return null;
    }

    // LRU更新：重新插入以更新访问顺序
    this.cache.delete(key);
    this.cache.set(key, entry);

    return entry.value;
  }

  /**
   * 检查缓存项是否存在且未过期
   * @param key 缓存键
   * @returns 是否存在有效缓存
   */
  has(key: string): boolean {
    return this.get(key) !== null;
  }

  /**
   * 删除缓存项
   * @param key 缓存键
   * @returns 是否成功删除
   */
  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  /**
   * 清空所有缓存
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * 获取缓存统计信息
   * @returns 缓存统计
   */
  getStats(): CacheStats {
    const now = Date.now();
    let expiredCount = 0;
    let validCount = 0;

    for (const [, entry] of this.cache) {
      if (now > entry.expiry) {
        expiredCount++;
      } else {
        validCount++;
      }
    }

    return {
      totalSize: this.cache.size,
      validCount,
      expiredCount,
      maxSize: this.maxSize,
      hitRate: this.calculateHitRate()
    };
  }

  /**
   * 清理过期缓存项
   * @returns 清理的项目数量
   */
  cleanup(): number {
    const now = Date.now();
    const expiredKeys: string[] = [];

    for (const [key, entry] of this.cache) {
      if (now > entry.expiry) {
        expiredKeys.push(key);
      }
    }

    expiredKeys.forEach(key => this.cache.delete(key));
    return expiredKeys.length;
  }

  /**
   * 获取所有有效的缓存键
   * @returns 有效缓存键列表
   */
  getValidKeys(): string[] {
    const now = Date.now();
    const validKeys: string[] = [];

    for (const [key, entry] of this.cache) {
      if (now <= entry.expiry) {
        validKeys.push(key);
      }
    }

    return validKeys;
  }

  /**
   * 计算缓存命中率（简单实现）
   * 实际应用中可能需要更复杂的统计
   */
  private calculateHitRate(): number {
    // 简化实现，实际项目中可以维护更详细的统计
    const stats = this.getBasicStats();
    return stats.validCount / Math.max(stats.totalSize, 1);
  }

  private getBasicStats() {
    const now = Date.now();
    let validCount = 0;

    for (const [, entry] of this.cache) {
      if (now <= entry.expiry) {
        validCount++;
      }
    }

    return {
      totalSize: this.cache.size,
      validCount
    };
  }

  /**
   * 设置带条件的缓存（仅当key不存在时设置）
   * @param key 缓存键
   * @param value 缓存值
   * @param ttl 生存时间
   * @returns 是否成功设置
   */
  setIfNotExists(key: string, value: any, ttl?: number): boolean {
    if (this.has(key)) {
      return false;
    }
    this.set(key, value, ttl);
    return true;
  }

  /**
   * 批量获取缓存项
   * @param keys 缓存键列表
   * @returns 键值对映射
   */
  mget(keys: string[]): Map<string, any> {
    const result = new Map<string, any>();
    
    for (const key of keys) {
      const value = this.get(key);
      if (value !== null) {
        result.set(key, value);
      }
    }

    return result;
  }

  /**
   * 批量设置缓存项
   * @param entries 键值对数组
   * @param ttl 生存时间
   */
  mset(entries: Array<[string, any]>, ttl?: number): void {
    for (const [key, value] of entries) {
      this.set(key, value, ttl);
    }
  }
}

// 缓存统计接口
export interface CacheStats {
  totalSize: number;
  validCount: number;
  expiredCount: number;
  maxSize: number;
  hitRate: number;
}

// 全局缓存实例
export const globalCache = new CacheManager();

// 缓存键生成器
export class CacheKeyGenerator {
  private static readonly PREFIX = 'juyiting:';

  static persona(source: string): string {
    return `${this.PREFIX}persona:${source}`;
  }

  static config(configId: string): string {
    return `${this.PREFIX}config:${configId}`;
  }

  static collaboration(sessionId: string): string {
    return `${this.PREFIX}collaboration:${sessionId}`;
  }

  static userConfigs(userKey: string): string {
    return `${this.PREFIX}user_configs:${userKey}`;
  }

  static custom(namespace: string, key: string): string {
    return `${this.PREFIX}${namespace}:${key}`;
  }
}

// 缓存装饰器（用于方法级缓存）
export function cached(ttl?: number) {
  return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const cacheKey = CacheKeyGenerator.custom(
        target.constructor.name,
        `${propertyName}:${JSON.stringify(args)}`
      );

      // 尝试从缓存获取
      const cached = globalCache.get(cacheKey);
      if (cached !== null) {
        return cached;
      }

      // 执行原方法
      const result = await method.apply(this, args);

      // 存入缓存
      globalCache.set(cacheKey, result, ttl);

      return result;
    };

    return descriptor;
  };
} 