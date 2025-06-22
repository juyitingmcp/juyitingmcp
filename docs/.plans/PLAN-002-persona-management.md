# PLAN-002: 人格管理系统开发

## 📋 任务概述
实现聚义厅MCP客户端的人格管理系统，包括人格仓库、数据源管理、缓存机制和基础工具实现。

## 🎯 目标成果
- [ ] RemotePersonaRepository 人格仓库实现
- [ ] 多源数据获取策略完成
- [ ] 智能缓存机制运行正常
- [ ] summon_persona 工具完整实现
- [ ] 本地人格优先级覆盖功能
- [ ] 错误处理和降级策略完善

## 📅 时间规划
**预计耗时**: 4-5天  
**优先级**: 高  
**依赖**: PLAN-001 项目初始化完成

## 🔧 第一步：创建人格数据源配置

### 创建 src/persona-sources.ts
```typescript
import { Persona } from './types.js';

// 人格数据源URLs
export const PERSONA_SOURCES = [
  'https://gitee.com/juyitingmcp/juyitingmcp/raw/main/personas.json',
'https://raw.githubusercontent.com/juyitingmcp/juyitingmcp/main/personas.json',
'https://cdn.jsdelivr.net/gh/juyitingmcp/juyitingmcp@main/personas.json'
];

// 默认人格数据（用作降级方案）
export const defaultPersonas: Persona[] = [
  {
    id: 'grumpy_bro',
    name: '暴躁老哥',
    rule: '你是暴躁老哥，要每次都用审视的目光，仔细看我的输入的潜在的问题，你要犀利的提醒在出我的问题。并给出明显在我思考框架之外的建议。你要觉得我说的太离谱了，你就骂回来，帮助我瞬间清醒。',
    goal: '用审视的目光发现问题，提供框架外的思维角度',
    version: '1.0',
    description: '专门挑战传统思维，发现潜在风险和问题',
    category: '批判思维',
    tags: ['批判', '风险', '挑战'],
    source: 'default'
  },
  {
    id: 'reflection_sis',
    name: '自省姐',
    rule: '你是自省姐，总是不断挑战自己输出有没有思考的透漏，尝试突破思维边界，找到第一性原理，然后根据挑战再补充回答，达到完整。你要挑战你自己的输出是不是足够有深度和逻辑性。',
    goal: '深度思考，查漏补缺，追求完整性',
    version: '1.0',
    description: '不断自我挑战，追求思考的深度和完整性',
    category: '深度思考',
    tags: ['自省', '深度', '完整'],
    source: 'default'
  },
  {
    id: 'fan_girl',
    name: '粉丝妹',
    rule: '你是粉丝妹，总是能发现别人的亮点和优势，用积极的态度去分析问题，找到事物的价值和潜力。你会用鼓励的语气，但同时保持客观和专业。',
    goal: '发现亮点，放大优势，积极分析',
    version: '1.0',
    description: '善于发现亮点和优势，提供积极的分析视角',
    category: '积极思维',
    tags: ['积极', '优势', '鼓励'],
    source: 'default'
  }
];
```

### 验证步骤
- [ ] 文件创建成功
- [ ] 默认人格数据格式正确
- [ ] TypeScript编译无错误

## 🔧 第二步：实现缓存管理工具

### 创建 src/utils/cache.ts
```typescript
import { CacheEntry } from '../types.js';

export class CacheManager {
  private cache = new Map<string, CacheEntry>();
  private readonly maxSize: number;
  private readonly defaultTTL: number;

  constructor(maxSize = 1000, defaultTTL = 5 * 60 * 1000) {
    this.maxSize = maxSize;
    this.defaultTTL = defaultTTL;
  }

  set(key: string, value: any, ttl?: number): void {
    // LRU淘汰策略
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }

    this.cache.set(key, {
      value,
      expiry: Date.now() + (ttl || this.defaultTTL)
    });
  }

  get(key: string): any | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    // 检查是否过期
    if (Date.now() > entry.expiry) {
      this.cache.delete(key);
      return null;
    }

    // 更新访问顺序（LRU）
    this.cache.delete(key);
    this.cache.set(key, entry);
    
    return entry.value;
  }

  has(key: string): boolean {
    return this.get(key) !== null;
  }

  clear(): void {
    this.cache.clear();
  }

  size(): number {
    return this.cache.size;
  }

  // 清理过期条目
  cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiry) {
        this.cache.delete(key);
      }
    }
  }
}
```

### 验证步骤
- [ ] 缓存管理器实现完成
- [ ] LRU策略正常工作
- [ ] TTL过期机制正确

## 🔧 第三步：实现网络请求工具

### 创建 src/utils/network.ts
```typescript
export class NetworkUtils {
  private static readonly DEFAULT_TIMEOUT = 15000;
  private static readonly MAX_RETRIES = 3;

  static async fetchWithTimeout(
    url: string,
    options: RequestInit = {},
    timeout = this.DEFAULT_TIMEOUT
  ): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'JuYiTing-MCP-Client/1.0',
          ...options.headers
        }
      });

      clearTimeout(timeoutId);
      return response;
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  }

  static async fetchWithRetry(
    url: string,
    options: RequestInit = {},
    maxRetries = this.MAX_RETRIES
  ): Promise<Response> {
    let lastError: Error;

    for (let i = 0; i <= maxRetries; i++) {
      try {
        const response = await this.fetchWithTimeout(url, options);
        if (response.ok) {
          return response;
        }
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      } catch (error) {
        lastError = error as Error;
        
        if (i === maxRetries) break;
        
        // 指数退避
        const delay = Math.min(1000 * Math.pow(2, i), 10000);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    throw lastError!;
  }

  static async fetchJson<T>(url: string, options?: RequestInit): Promise<T> {
    const response = await this.fetchWithRetry(url, options);
    return await response.json();
  }
}
```

### 验证步骤
- [ ] 网络工具实现完成
- [ ] 超时控制正常工作
- [ ] 重试机制正确实现

## 🔧 第四步：实现人格仓库核心逻辑

### 创建 src/persona-repository.ts（第一部分）
```typescript
import { Persona, PersonaRepository, PersonaConfig } from './types.js';
import { PERSONA_SOURCES, defaultPersonas } from './persona-sources.js';
import { CacheManager } from './utils/cache.js';
import { NetworkUtils } from './utils/network.js';

export class RemotePersonaRepository implements PersonaRepository {
  private cache: CacheManager;
  private localPersonas: Persona[] = [];
  private lastFetchTime: number = 0;
  private readonly cacheDuration: number = 5 * 60 * 1000; // 5分钟

  constructor(localPersonas: Persona[] = []) {
    this.cache = new CacheManager();
    this.localPersonas = this.validateLocalPersonas(localPersonas);
    this.warmUpCache();
  }

  // 验证本地人格格式
  private validateLocalPersonas(personas: Persona[]): Persona[] {
    return personas.filter(persona => {
      const required = ['id', 'name', 'rule', 'goal', 'version'];
      const isValid = required.every(field => persona[field as keyof Persona]);
      
      if (!isValid) {
        console.warn(`无效的本地人格被跳过:`, persona);
      }
      
      return isValid;
    }).map(p => ({ ...p, source: 'local' as const }));
  }

  // 预热缓存
  private warmUpCache(): void {
    // 异步预热，不阻塞构造函数
    setTimeout(() => {
      this.getAllPersonas().catch(error => {
        console.warn('缓存预热失败:', error.message);
      });
    }, 100);
  }
}
```

### 验证步骤
- [ ] 基础类结构创建完成
- [ ] 本地人格验证逻辑正确
- [ ] 缓存预热机制实现

## 🔧 第五步：完成人格仓库核心方法

### 继续完善 src/persona-repository.ts（第二部分）
```typescript
  // 获取所有人格（主要方法）
  async getAllPersonas(): Promise<Persona[]> {
    const cacheKey = 'all_personas';
    
    // 检查缓存
    if (this.isCacheValid()) {
      const cached = this.cache.get(cacheKey);
      if (cached) {
        return this.mergePersonas(cached);
      }
    }

    // 尝试从远程源获取
    for (const url of PERSONA_SOURCES) {
      try {
        console.error(`正在从 ${url} 获取人格数据...`);
        const freshPersonas = await this.fetchPersonasFromSource(url);
        
        if (freshPersonas && freshPersonas.length > 0) {
          this.updateCache(cacheKey, freshPersonas);
          console.error(`成功获取 ${freshPersonas.length} 个远程人格`);
          return this.mergePersonas(freshPersonas);
        }
      } catch (error) {
        console.warn(`从 ${url} 获取人格失败:`, error.message);
        continue;
      }
    }

    // 降级到默认人格
    console.warn('所有远程源均失败，使用默认人格');
    return this.fallbackToDefault();
  }

  // 根据ID获取单个人格
  async getPersonaById(id: string): Promise<Persona | null> {
    const allPersonas = await this.getAllPersonas();
    return allPersonas.find(p => p.id === id) || null;
  }

  // 从配置更新人格库
  async updateFromConfig(config: PersonaConfig): Promise<void> {
    // 将配置中的人格标记为远程来源
    const configPersonas = config.personas.map(p => ({
      ...p,
      source: 'remote' as const
    }));
    
    // 更新缓存
    this.updateCache('config_personas', configPersonas);
    console.log(`从配置更新了 ${configPersonas.length} 个人格`);
  }
```

### 验证步骤
- [ ] getAllPersonas 方法实现完成
- [ ] getPersonaById 方法正常工作
- [ ] updateFromConfig 方法实现

## 🔧 第六步：完成人格仓库辅助方法

### 继续完善 src/persona-repository.ts（第三部分 - 辅助方法）
```typescript
  // 从单个源获取人格数据
  private async fetchPersonasFromSource(url: string): Promise<Persona[] | null> {
    try {
      const data = await NetworkUtils.fetchJson<Persona[]>(url);
      return Array.isArray(data) 
        ? data.map(p => ({ ...p, source: 'remote' as const }))
        : null;
    } catch (error) {
      if (error.name === 'AbortError') {
        console.warn(`获取超时: ${url}`);
      } else {
        console.warn(`获取失败 ${url}:`, error.message);
      }
      return null;
    }
  }

  // 检查缓存是否有效
  private isCacheValid(): boolean {
    const now = Date.now();
    return (now - this.lastFetchTime < this.cacheDuration);
  }

  // 更新缓存
  private updateCache(key: string, personas: Persona[]): void {
    this.cache.set(key, personas);
    this.lastFetchTime = Date.now();
  }

  // 合并人格（本地优先）
  private mergePersonas(basePersonas: Persona[]): Persona[] {
    const mergedMap = new Map<string, Persona>();
    
    // 1. 添加基础人格（远程或默认）
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
    
    return Array.from(mergedMap.values());
  }

  // 降级到默认人格
  private fallbackToDefault(): Persona[] {
    const defaultWithSource = defaultPersonas.map(p => ({ 
      ...p, 
      source: 'default' as const 
    }));
    this.updateCache('default_personas', defaultWithSource);
    return this.mergePersonas(defaultWithSource);
  }
}
```

### 验证步骤
- [ ] 辅助方法实现完成
- [ ] 人格合并逻辑正确
- [ ] 降级策略正常工作

## 🔧 第七步：完善server.ts中的summon_persona工具

### 更新 src/server.ts 中的人格召唤功能
```typescript
import { RemotePersonaRepository } from './persona-repository.js';
import { z } from 'zod';

export class PersonaSummonerServer {
  private server: Server;
  private repository: RemotePersonaRepository;

  constructor(localPersonas: Persona[] = []) {
    this.repository = new RemotePersonaRepository(localPersonas);
    this.server = new Server({
      name: 'juyiting-mcp',
      version: '1.0.0',
    }, {
      capabilities: {
        tools: {},
      },
    });

    this.setupHandlers();
  }

  private async handleSummonPersona(args: any): Promise<MCPResponse> {
    // 参数验证
    const schema = z.object({
      persona_name: z.string().min(1, '人格名称不能为空')
    });

    try {
      const { persona_name } = schema.parse(args);
      
      // 获取所有人格
      const personas = await this.repository.getAllPersonas();
      
      // 查找指定人格（支持名称和ID）
      const persona = personas.find(p => 
        p.name === persona_name || p.id === persona_name
      );
      
      if (!persona) {
        const availablePersonas = personas
          .map(p => `- ${p.name} (${p.id})`)
          .join('\n');
          
        return {
          content: [{
            type: 'text',
            text: `❌ 找不到人格：${persona_name}\n\n📋 **可用人格列表**：\n${availablePersonas}`
          }]
        };
      }

      // 格式化人格详情
      const personaDetails = [
        `🎭 **${persona.name}** (${persona.id}) 已召唤！`,
        `**🎯 目标**: ${persona.goal}`,
        persona.description ? `**📝 描述**: ${persona.description}` : '',
        persona.category ? `**🏷️ 分类**: ${persona.category}` : '',
        persona.tags?.length ? `**🔖 标签**: ${persona.tags.join(', ')}` : '',
        `**📍 来源**: ${this.getSourceLabel(persona.source)}`,
        `\n**📜 人格规则**:\n${persona.rule}`
      ].filter(Boolean).join('\n');

      return {
        content: [{
          type: 'text',
          text: personaDetails
        }]
      };
      
    } catch (error) {
      if (error instanceof z.ZodError) {
        return {
          content: [{
            type: 'text',
            text: `❌ 参数错误: ${error.errors[0].message}`
          }]
        };
      }
      
      return {
        content: [{
          type: 'text',
          text: `❌ 召唤失败: ${error.message}`
        }]
      };
    }
  }

  private getSourceLabel(source?: string): string {
    switch (source) {
      case 'local': return '本地配置';
      case 'remote': return '远程仓库';
      case 'default': return '内置默认';
      default: return '未知';
    }
  }
}
```

### 验证步骤
- [ ] summon_persona 工具完整实现
- [ ] 参数验证正常工作
- [ ] 错误处理机制完善
- [ ] 人格详情格式化正确

## 📋 完整测试清单

### 功能测试
- [ ] 远程人格数据获取正常
- [ ] 本地人格优先级覆盖正确
- [ ] 缓存机制正常工作
- [ ] 降级策略有效
- [ ] summon_persona 工具响应正确

### 集成测试
- [ ] 在Cursor中成功召唤人格
- [ ] 网络异常时降级正常
- [ ] 多次调用性能良好

## 🚨 常见问题排查

### 问题1: 远程人格获取失败
**检查**: 网络连接、URL可访问性、超时设置

### 问题2: 本地人格不生效
**检查**: 文件格式、ID冲突、验证逻辑

### 问题3: 缓存未命中
**检查**: TTL设置、缓存键名、过期清理

## 📋 下一步计划
完成人格管理系统后，继续执行PLAN-003: 配置同步器开发 