import { Persona, PersonaRepository, PersonaConfig } from './types.js';
import { DEFAULT_PERSONAS, PERSONA_SOURCES, validatePersona, sanitizePersona } from './persona-sources.js';
import { CacheManager, CacheKeyGenerator } from './utils/cache.js';
import { fetchPersonaData } from './utils/network.js';
import { DEFAULT_CONFIG } from './constants.js';

/**
 * 远程人格仓库实现
 * 支持多源数据获取、智能缓存和优雅降级
 */
export class RemotePersonaRepository implements PersonaRepository {
  private personas: Map<string, Persona> = new Map();
  private lastFetchTime: number = 0;
  private cacheDuration: number = DEFAULT_CONFIG.CACHE_DURATION;
  private localPersonas: Persona[] = [];
  private cache: CacheManager;
  private isWarmedUp: boolean = false;

  constructor(localPersonas: Persona[] = []) {
    this.localPersonas = this.validateLocalPersonas(localPersonas);
    this.cache = new CacheManager();
    this.warmUpCache();
  }

  /**
   * 获取所有人格
   * 优先级：本地人格 > 缓存人格 > 远程人格 > 默认人格
   */
  async getAllPersonas(): Promise<Persona[]> {
    // 1. 检查缓存是否有效
    if (this.isCacheValid()) {
      return this.mergePersonas(Array.from(this.personas.values()));
    }

    // 2. 尝试从远程源获取
    const remotePersonas = await this.fetchFromRemoteSources();
    if (remotePersonas.length > 0) {
      this.updateCache(remotePersonas);
      return this.mergePersonas(remotePersonas);
    }

    // 3. 降级到默认人格
    console.warn('所有远程源均失败，使用默认人格');
    return this.fallbackToDefault();
  }

  /**
   * 根据ID获取人格
   */
  async getPersonaById(id: string): Promise<Persona | null> {
    const allPersonas = await this.getAllPersonas();
    return allPersonas.find(p => p.id === id) || null;
  }

  /**
   * 从配置更新人格仓库
   */
  async updateFromConfig(config: PersonaConfig): Promise<void> {
    if (!config.personas || !Array.isArray(config.personas)) {
      throw new Error('配置中未找到有效的人格数组');
    }

    // 验证配置中的人格
    const validPersonas = config.personas
      .map(sanitizePersona)
      .filter((p): p is Persona => p !== null);

    if (validPersonas.length === 0) {
      throw new Error('配置中没有有效的人格');
    }

    // 更新本地人格（配置中的人格被视为本地人格）
    this.localPersonas = validPersonas.map(p => ({ ...p, source: 'local' }));
    
    // 清除缓存以强制重新获取
    this.clearCache();
    
    console.log(`已从配置更新 ${validPersonas.length} 个人格`);
  }

  /**
   * 验证本地人格格式
   */
  private validateLocalPersonas(personas: Persona[]): Persona[] {
    return personas
      .filter(persona => {
        const isValid = validatePersona(persona);
        if (!isValid) {
          console.warn(`无效的本地人格被跳过:`, persona);
        }
        return isValid;
      })
      .map(p => ({ ...p, source: 'local' as const }));
  }

  /**
   * 从多个远程源获取人格数据
   */
  private async fetchFromRemoteSources(): Promise<Persona[]> {
    console.error('开始从远程源获取人格数据...');
    
    for (const url of PERSONA_SOURCES) {
      try {
        const rawData = await fetchPersonaData(url);
        if (rawData.length > 0) {
          const personas = this.processRemotePersonas(rawData);
          if (personas.length > 0) {
            console.error(`成功从 ${url} 获取 ${personas.length} 个人格`);
            return personas;
          }
        }
      } catch (error) {
        console.warn(`从 ${url} 获取人格失败:`, error);
        continue;
      }
    }

    console.warn('所有远程源均获取失败');
    return [];
  }

  /**
   * 处理远程人格数据
   */
  private processRemotePersonas(rawData: any[]): Persona[] {
    const validPersonas: Persona[] = [];

    for (const rawPersona of rawData) {
      const persona = sanitizePersona(rawPersona);
      if (persona) {
        persona.source = 'remote';
        validPersonas.push(persona);
      }
    }

    return validPersonas;
  }

  /**
   * 合并人格数据（本地优先）
   */
  private mergePersonas(basePersonas: Persona[]): Persona[] {
    const mergedMap = new Map<string, Persona>();
    
    // 1. 先添加基础人格（远程或默认）
    basePersonas.forEach(persona => {
      mergedMap.set(persona.id, persona);
    });
    
    // 2. 本地人格覆盖同ID人格（优先级最高）
    this.localPersonas.forEach(persona => {
      if (mergedMap.has(persona.id)) {
        console.log(`本地人格覆盖远程人格: ${persona.name} (${persona.id})`);
      }
      mergedMap.set(persona.id, persona);
    });
    
    const result = Array.from(mergedMap.values());
    console.error(`合并后共有 ${result.length} 个人格`);
    
    return result;
  }

  /**
   * 降级到默认人格
   */
  private fallbackToDefault(): Persona[] {
    const defaultWithSource = DEFAULT_PERSONAS.map(p => ({ 
      ...p, 
      source: 'default' as const 
    }));
    
    this.updateCache(defaultWithSource);
    return this.mergePersonas(defaultWithSource);
  }

  /**
   * 检查缓存是否有效
   */
  private isCacheValid(): boolean {
    const now = Date.now();
    const isValid = (now - this.lastFetchTime < this.cacheDuration) && this.personas.size > 0;
    
    if (!isValid && this.personas.size > 0) {
      console.error('人格缓存已过期，需要重新获取');
    }
    
    return isValid;
  }

  /**
   * 更新缓存
   */
  private updateCache(personas: Persona[]): void {
    this.personas.clear();
    personas.forEach(persona => {
      this.personas.set(persona.id, persona);
    });
    this.lastFetchTime = Date.now();
    
    // 同时更新全局缓存
    const cacheKey = CacheKeyGenerator.persona('all');
    this.cache.set(cacheKey, personas);
    
    console.error(`缓存已更新，包含 ${personas.length} 个人格`);
  }

  /**
   * 清除缓存
   */
  private clearCache(): void {
    this.personas.clear();
    this.lastFetchTime = 0;
    this.cache.clear();
    console.log('人格缓存已清除');
  }

  /**
   * 预热缓存
   */
  private warmUpCache(): void {
    if (this.isWarmedUp) {
      return;
    }

    // 异步预热，不阻塞构造函数
    setTimeout(async () => {
      try {
        await this.getAllPersonas();
        this.isWarmedUp = true;
        console.error('人格缓存预热完成');
      } catch (error) {
        console.warn('人格缓存预热失败:', error);
      }
    }, 100);
  }

  /**
   * 获取仓库统计信息
   */
  getStats(): RepositoryStats {
    const allPersonas = Array.from(this.personas.values());
    const bySource = allPersonas.reduce((acc, persona) => {
      const source = persona.source || 'unknown';
      acc[source] = (acc[source] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      totalPersonas: allPersonas.length,
      localPersonas: this.localPersonas.length,
      cachedPersonas: this.personas.size,
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
    console.log('手动刷新人格缓存...');
    this.clearCache();
    await this.getAllPersonas();
  }

  /**
   * 搜索人格
   */
  async searchPersonas(query: string): Promise<Persona[]> {
    const allPersonas = await this.getAllPersonas();
    const lowercaseQuery = query.toLowerCase();

    return allPersonas.filter(persona => {
      return (
        persona.name.toLowerCase().includes(lowercaseQuery) ||
        persona.description?.toLowerCase().includes(lowercaseQuery) ||
        persona.goal.toLowerCase().includes(lowercaseQuery) ||
        persona.category?.toLowerCase().includes(lowercaseQuery) ||
        persona.tags?.some(tag => tag.toLowerCase().includes(lowercaseQuery))
      );
    });
  }

  /**
   * 按分类获取人格
   */
  async getPersonasByCategory(category: string): Promise<Persona[]> {
    const allPersonas = await this.getAllPersonas();
    return allPersonas.filter(persona => persona.category === category);
  }

  /**
   * 获取所有分类
   */
  async getCategories(): Promise<string[]> {
    const allPersonas = await this.getAllPersonas();
    const categories = new Set<string>();
    
    allPersonas.forEach(persona => {
      if (persona.category) {
        categories.add(persona.category);
      }
    });
    
    return Array.from(categories).sort();
  }
}

/**
 * 仓库统计信息接口
 */
export interface RepositoryStats {
  totalPersonas: number;
  localPersonas: number;
  cachedPersonas: number;
  lastFetchTime: number;
  cacheValid: boolean;
  bySource: Record<string, number>;
  cacheStats: any;
} 