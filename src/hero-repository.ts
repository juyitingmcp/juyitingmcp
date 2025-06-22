import { Hero, HeroRepository, HeroConfig } from './types.js';
import { DEFAULT_HEROES, HERO_SOURCES, validateHero, sanitizeHero } from './hero-sources.js';
import { CacheManager, CacheKeyGenerator } from './utils/cache.js';
import { fetchHeroData } from './utils/network.js';
import { DEFAULT_CONFIG } from './constants.js';

/**
 * 远程英雄仓库实现
 * 支持多源数据获取、智能缓存和优雅降级
 */
export class RemoteHeroRepository implements HeroRepository {
  private heroes: Map<string, Hero> = new Map();
  private lastFetchTime: number = 0;
  private cacheDuration: number = DEFAULT_CONFIG.CACHE_DURATION;
  private localHeroes: Hero[] = [];
  private cache: CacheManager;
  private isWarmedUp: boolean = false;

  constructor(localHeroes: Hero[] = []) {
    this.localHeroes = this.validateLocalHeroes(localHeroes);
    this.cache = new CacheManager();
    this.warmUpCache();
  }

  /**
   * 获取所有英雄
   * 优先级：本地英雄 > 缓存英雄 > 远程英雄 > 默认英雄
   */
  async getAllHeroes(): Promise<Hero[]> {
    // 1. 检查缓存是否有效
    if (this.isCacheValid()) {
      return this.mergeHeroes(Array.from(this.heroes.values()));
    }

    // 2. 尝试从远程源获取
    const remoteHeroes = await this.fetchFromRemoteSources();
    if (remoteHeroes.length > 0) {
      this.updateCache(remoteHeroes);
      return this.mergeHeroes(remoteHeroes);
    }

    // 3. 降级到默认英雄
    console.warn('所有远程源均失败，使用默认英雄');
    return this.fallbackToDefault();
  }

  /**
   * 根据ID获取英雄
   */
  async getHeroById(id: string): Promise<Hero | null> {
    const allHeroes = await this.getAllHeroes();
    return allHeroes.find(p => p.id === id) || null;
  }

  /**
   * 从配置更新英雄仓库
   */
  async updateFromConfig(config: HeroConfig): Promise<void> {
    if (!config.heroes || !Array.isArray(config.heroes)) {
      throw new Error('配置中未找到有效的英雄数组');
    }

    // 验证配置中的英雄
    const validHeroes = config.heroes
      .map(sanitizeHero)
      .filter((p): p is Hero => p !== null);

    if (validHeroes.length === 0) {
      throw new Error('配置中没有有效的英雄');
    }

    // 更新本地英雄（配置中的英雄被视为本地英雄）
    this.localHeroes = validHeroes.map(p => ({ ...p, source: 'local' }));
    
    // 清除缓存以强制重新获取
    this.clearCache();
    
    console.log(`已从配置更新 ${validHeroes.length} 个英雄`);
  }

  /**
   * 验证本地英雄格式
   */
  private validateLocalHeroes(heroes: Hero[]): Hero[] {
    return heroes
      .filter((hero: any) => {
        const isValid = validateHero(hero);
        if (!isValid) {
          console.warn(`无效的本地英雄被跳过:`, hero);
        }
        return isValid;
      })
      .map(p => ({ ...p, source: 'local' as const }));
  }

  /**
   * 从多个远程源获取英雄数据
   */
  private async fetchFromRemoteSources(): Promise<Hero[]> {
    console.error('开始从远程源获取英雄数据...');
    
    for (const url of HERO_SOURCES) {
      try {
        const rawData = await fetchHeroData(url);
        if (rawData.length > 0) {
          const heroes = this.processRemoteHeroes(rawData);
          if (heroes.length > 0) {
            console.error(`成功从 ${url} 获取 ${heroes.length} 个英雄`);
            return heroes;
          }
        }
      } catch (error) {
        console.warn(`从 ${url} 获取英雄失败:`, error);
        continue;
      }
    }

    console.warn('所有远程源均获取失败');
    return [];
  }

  /**
   * 处理远程英雄数据
   */
  private processRemoteHeroes(rawData: any[]): Hero[] {
    const validHeroes: Hero[] = [];

    for (const rawHero of rawData) {
      const hero = sanitizeHero(rawHero);
      if (hero) {
        hero.source = 'remote';
        validHeroes.push(hero);
      }
    }

    return validHeroes;
  }

  /**
   * 合并英雄数据（本地优先）
   */
  private mergeHeroes(baseHeroes: Hero[]): Hero[] {
    const mergedMap = new Map<string, Hero>();
    
    // 1. 先添加基础英雄（远程或默认）
    baseHeroes.forEach((hero: any) => {
      mergedMap.set(hero.id, hero);
    });
    
    // 2. 本地英雄覆盖同ID英雄（优先级最高）
    this.localHeroes.forEach((hero: any) => {
      if (mergedMap.has(hero.id)) {
        console.log(`本地英雄覆盖远程英雄: ${hero.name} (${hero.id})`);
      }
      mergedMap.set(hero.id, hero);
    });
    
    const result = Array.from(mergedMap.values());
    console.error(`合并后共有 ${result.length} 个英雄`);
    
    return result;
  }

  /**
   * 降级到默认英雄
   */
  private fallbackToDefault(): Hero[] {
    const defaultWithSource = DEFAULT_HEROES.map(p => ({ 
      ...p, 
      source: 'default' as const 
    }));
    
    this.updateCache(defaultWithSource);
    return this.mergeHeroes(defaultWithSource);
  }

  /**
   * 检查缓存是否有效
   */
  private isCacheValid(): boolean {
    const now = Date.now();
    const isValid = (now - this.lastFetchTime < this.cacheDuration) && this.heroes.size > 0;
    
    if (!isValid && this.heroes.size > 0) {
      console.error('英雄缓存已过期，需要重新获取');
    }
    
    return isValid;
  }

  /**
   * 更新缓存
   */
  private updateCache(heroes: Hero[]): void {
    this.heroes.clear();
    heroes.forEach((hero: any) => {
      this.heroes.set(hero.id, hero);
    });
    this.lastFetchTime = Date.now();
    
    console.error(`缓存已更新，共 ${heroes.length} 个英雄`);
  }

  /**
   * 清除缓存
   */
  private clearCache(): void {
    this.heroes.clear();
    this.lastFetchTime = 0;
    this.isWarmedUp = false;
    
    console.log('英雄缓存已清除');
  }

  /**
   * 缓存预热
   */
  private warmUpCache(): void {
    if (this.isWarmedUp) return;
    
    setTimeout(async () => {
      try {
        await this.getAllHeroes();
        this.isWarmedUp = true;
        console.error('英雄缓存预热完成');
      } catch (error) {
        console.warn('缓存预热失败:', error);
      }
    }, 1000);
  }

  /**
   * 获取仓库统计信息
   */
  getStats(): RepositoryStats {
    const heroes = Array.from(this.heroes.values());
    const bySource = heroes.reduce((acc: any, hero: any) => {
      const source = hero.source || 'unknown';
      acc[source] = (acc[source] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      totalHeroes: heroes.length,
      localHeroes: this.localHeroes.length,
      cachedHeroes: this.heroes.size,
      lastFetchTime: this.lastFetchTime,
      cacheValid: this.isCacheValid(),
      bySource,
      cacheStats: this.cache.getStats()
    };
  }

  /**
   * 手动刷新缓存
   */
  async refreshCache(): Promise<void> {
    this.clearCache();
    await this.getAllHeroes();
  }

  /**
   * 搜索英雄
   */
  async searchHeroes(query: string): Promise<Hero[]> {
    const allHeroes = await this.getAllHeroes();
    const lowerQuery = query.toLowerCase();
    
    return allHeroes.filter((hero: any) =>
      hero.name.toLowerCase().includes(lowerQuery) ||
      (hero.description || '').toLowerCase().includes(lowerQuery) ||
      hero.id.toLowerCase().includes(lowerQuery) ||
      hero.tags?.some((tag: any) => tag.toLowerCase().includes(lowerQuery))
    );
  }

  /**
   * 按分类获取英雄
   */
  async getHeroesByCategory(category: string): Promise<Hero[]> {
    const allHeroes = await this.getAllHeroes();
    return allHeroes.filter((hero: any) => hero.category === category);
  }

  /**
   * 获取所有分类
   */
  async getCategories(): Promise<string[]> {
    const allHeroes = await this.getAllHeroes();
    const categories = new Set<string>();
    
    allHeroes.forEach((hero: any) => {
      if (hero.category) {
        categories.add(hero.category);
      }
    });
    
    return Array.from(categories).sort();
  }
}

export interface RepositoryStats {
  totalHeroes: number;
  localHeroes: number;
  cachedHeroes: number;
  lastFetchTime: number;
  cacheValid: boolean;
  bySource: Record<string, number>;
  cacheStats: any;
} 