import { PersonaConfig, LocalConfig, ConfigSummary } from './types.js';
import { networkManager } from './utils/network.js';
import { CacheManager, CacheKeyGenerator } from './utils/cache.js';
import { DEFAULT_CONFIG } from './constants.js';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { dirname, join } from 'path';
import { homedir } from 'os';

/**
 * 配置同步器
 * 处理远程配置下载、本地存储和自动同步
 */
export class ConfigSynchronizer {
  private configPath: string;
  private localConfig: LocalConfig;
  private cache: CacheManager;
  private syncInProgress: boolean = false;
  private autoSyncTimer: NodeJS.Timeout | null = null;

  constructor(configPath?: string) {
    this.configPath = configPath || this.getDefaultConfigPath();
    this.cache = new CacheManager();
    this.localConfig = this.loadLocalConfig();
    
    // 启动自动同步
    if (this.localConfig.sync.autoSync) {
      this.startAutoSync();
    }
  }

  /**
   * 获取默认配置路径
   */
  private getDefaultConfigPath(): string {
    const configDir = join(homedir(), '.juyiting');
    
    // 确保配置目录存在
    if (!existsSync(configDir)) {
      mkdirSync(configDir, { recursive: true });
    }
    
    return join(configDir, 'config.json');
  }

  /**
   * 加载本地配置
   */
  private loadLocalConfig(): LocalConfig {
    try {
      if (existsSync(this.configPath)) {
        const content = readFileSync(this.configPath, 'utf-8');
        const config = JSON.parse(content);
        return this.validateConfig(config);
      }
    } catch (error) {
      console.warn('加载本地配置失败:', error instanceof Error ? error.message : String(error));
    }
    
    // 返回默认配置
    return this.getDefaultConfig();
  }

  /**
   * 获取默认配置
   */
  private getDefaultConfig(): LocalConfig {
    return {
      userKey: '',
      apiBaseUrl: DEFAULT_CONFIG.API_BASE_URL,
      currentConfig: undefined,
      lastSyncTime: undefined,
      cache: {
        duration: DEFAULT_CONFIG.CACHE_DURATION,
        maxSize: DEFAULT_CONFIG.MAX_CACHE_SIZE
      },
      sync: {
        autoSync: true,
        syncInterval: DEFAULT_CONFIG.SYNC_INTERVAL,
        retryAttempts: DEFAULT_CONFIG.MAX_RETRIES
      }
    };
  }

  /**
   * 验证配置格式
   */
  private validateConfig(config: any): LocalConfig {
    const defaultConfig = this.getDefaultConfig();
    
    return {
      userKey: config.userKey || '',
      apiBaseUrl: config.apiBaseUrl || defaultConfig.apiBaseUrl,
      currentConfig: config.currentConfig,
      lastSyncTime: config.lastSyncTime,
      cache: { ...defaultConfig.cache, ...config.cache },
      sync: { ...defaultConfig.sync, ...config.sync }
    };
  }

  /**
   * 保存本地配置
   */
  private async saveLocalConfig(): Promise<void> {
    try {
      const configDir = dirname(this.configPath);
      if (!existsSync(configDir)) {
        mkdirSync(configDir, { recursive: true });
      }
      
      const content = JSON.stringify(this.localConfig, null, 2);
      writeFileSync(this.configPath, content, 'utf-8');
      
      console.log(`配置已保存到: ${this.configPath}`);
    } catch (error) {
      throw new Error(`保存配置失败: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * 获取当前配置
   */
  getCurrentConfig(): PersonaConfig | null {
    return this.localConfig.currentConfig || null;
  }

  /**
   * 获取用户密钥
   */
  getUserKey(): string {
    return this.localConfig.userKey;
  }

  /**
   * 设置用户密钥
   */
  async setUserKey(userKey: string): Promise<void> {
    this.localConfig.userKey = userKey;
    await this.saveLocalConfig();
    console.log('用户密钥已更新');
  }

  /**
   * 列出远程配置
   */
  async listRemoteConfigs(): Promise<ConfigSummary[]> {
    if (!this.localConfig.userKey) {
      throw new Error('用户KEY未配置，请先使用 setUserKey() 设置认证密钥');
    }

    // 检查缓存
    const cacheKey = CacheKeyGenerator.userConfigs(this.localConfig.userKey);
    const cached = this.cache.get(cacheKey);
    if (cached) {
      console.log('使用缓存的配置列表');
      return cached;
    }

    try {
      const url = `${this.localConfig.apiBaseUrl}/api/configs`;
      const result = await networkManager.get(url, {
        headers: {
          'Authorization': `Bearer ${this.localConfig.userKey}`,
          'Accept': 'application/json'
        },
        timeout: 10000,
        retryAttempts: 2
      });

      if (!result.data.success) {
        throw new Error(result.data.error || '获取配置列表失败');
      }

      const configs = result.data.data;
      
      // 缓存结果
      this.cache.set(cacheKey, configs, 2 * 60 * 1000); // 2分钟缓存
      
      console.log(`获取到 ${configs.length} 个远程配置`);
      return configs;
    } catch (error) {
      if (error instanceof Error && error.message.includes('401')) {
        throw new Error('认证失败，请检查userKey是否正确');
      }
      throw new Error(`获取远程配置失败: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * 下载指定配置
   */
  async downloadConfig(configId: string): Promise<PersonaConfig> {
    if (!this.localConfig.userKey) {
      throw new Error('用户KEY未配置，请先设置认证密钥');
    }

    // 检查缓存
    const cacheKey = CacheKeyGenerator.config(configId);
    const cached = this.cache.get(cacheKey);
    if (cached) {
      console.log(`使用缓存的配置: ${configId}`);
      return cached;
    }

    try {
      const url = `${this.localConfig.apiBaseUrl}/api/download`;
      const result = await networkManager.get(url, {
        headers: {
          'Authorization': `Bearer ${this.localConfig.userKey}`,
          'Accept': 'application/json'
        },
        timeout: 15000,
        retryAttempts: 3
      });

      if (!result.data.success) {
        throw new Error(result.data.error || '下载配置失败');
      }

      const config = result.data.data;
      
      // 验证配置完整性
      this.validatePersonaConfig(config);
      
      // 缓存配置
      this.cache.set(cacheKey, config, 10 * 60 * 1000); // 10分钟缓存
      
      console.log(`成功下载配置: ${config.name} (${config.id})`);
      return config;
    } catch (error) {
      throw new Error(`下载配置失败: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * 同步远程配置到本地
   */
  async syncFromRemote(configId: string): Promise<PersonaConfig> {
    if (this.syncInProgress) {
      throw new Error('同步正在进行中，请稍后再试');
    }

    this.syncInProgress = true;
    
    try {
      console.log(`开始同步配置: ${configId}`);
      
      // 1. 验证配置权限
      const configs = await this.listRemoteConfigs();
      const targetConfig = configs.find(c => c.id === configId);
      
      if (!targetConfig) {
        throw new Error(`配置 ${configId} 不存在或无权限访问`);
      }

      // 2. 下载完整配置
      const fullConfig = await this.downloadConfig(configId);
      
      // 3. 保存为当前配置
      await this.saveCurrentConfig(fullConfig);
      
      console.log(`配置同步成功: ${fullConfig.name}`);
      return fullConfig;
      
    } finally {
      this.syncInProgress = false;
    }
  }

  /**
   * 验证人格配置完整性
   */
  private validatePersonaConfig(config: PersonaConfig): void {
    const required: (keyof PersonaConfig)[] = ['id', 'name', 'version', 'personas'];
    
    for (const field of required) {
      if (!config[field]) {
        throw new Error(`配置缺少必需字段: ${field}`);
      }
    }

    // 验证人格数组
    if (!Array.isArray(config.personas) || config.personas.length === 0) {
      throw new Error('配置必须包含至少一个人格');
    }

    // 验证每个人格
    config.personas.forEach((persona, index) => {
      const personaRequired: (keyof typeof persona)[] = ['id', 'name', 'rule', 'goal'];
      for (const field of personaRequired) {
        if (!persona[field]) {
          throw new Error(`人格 ${index + 1} 缺少必需字段: ${field}`);
        }
      }
    });

    console.log(`配置验证通过: ${config.name} (${config.personas.length} 个人格)`);
  }

  /**
   * 保存当前配置
   */
  private async saveCurrentConfig(config: PersonaConfig): Promise<void> {
    this.localConfig.currentConfig = config;
    this.localConfig.lastSyncTime = new Date().toISOString();
    
    await this.saveLocalConfig();
    console.log(`当前配置已更新: ${config.name}`);
  }

  /**
   * 启动自动同步
   */
  private startAutoSync(): void {
    if (!this.localConfig.sync.autoSync || this.autoSyncTimer) {
      return;
    }
    
    console.log(`启动自动同步，间隔: ${this.localConfig.sync.syncInterval / 1000 / 60} 分钟`);
    
    this.autoSyncTimer = setInterval(async () => {
      try {
        if (this.localConfig.currentConfig) {
          await this.checkForUpdates();
        }
      } catch (error) {
        console.warn('自动同步检查失败:', error instanceof Error ? error.message : String(error));
      }
    }, this.localConfig.sync.syncInterval);
  }

  /**
   * 停止自动同步
   */
  stopAutoSync(): void {
    if (this.autoSyncTimer) {
      clearInterval(this.autoSyncTimer);
      this.autoSyncTimer = null;
      console.log('自动同步已停止');
    }
  }

  /**
   * 检查配置更新
   */
  private async checkForUpdates(): Promise<void> {
    if (!this.localConfig.currentConfig || this.syncInProgress) {
      return;
    }
    
    try {
      const configs = await this.listRemoteConfigs();
      const currentId = this.localConfig.currentConfig.id;
      const remoteConfig = configs.find(c => c.id === currentId);
      
      if (remoteConfig && remoteConfig.version !== this.localConfig.currentConfig.version) {
        console.log(`发现配置更新: ${remoteConfig.name} (${remoteConfig.version})`);
        
        // 可以选择自动更新或通知用户
        // 这里选择通知而不是自动更新，避免意外覆盖
        console.log('配置有更新可用，请手动同步以获取最新版本');
      }
    } catch (error) {
      console.warn('检查更新失败:', error instanceof Error ? error.message : String(error));
    }
  }

  /**
   * 获取同步状态
   */
  getSyncStatus(): SyncStatus {
    return {
      isConfigured: !!this.localConfig.userKey,
      hasCurrentConfig: !!this.localConfig.currentConfig,
      lastSyncTime: this.localConfig.lastSyncTime,
      autoSyncEnabled: this.localConfig.sync.autoSync,
      syncInProgress: this.syncInProgress,
      apiBaseUrl: this.localConfig.apiBaseUrl
    };
  }

  /**
   * 清除缓存
   */
  clearCache(): void {
    this.cache.clear();
    console.log('配置缓存已清除');
  }

  /**
   * 销毁同步器
   */
  destroy(): void {
    this.stopAutoSync();
    this.clearCache();
  }
}

/**
 * 同步状态接口
 */
export interface SyncStatus {
  isConfigured: boolean;
  hasCurrentConfig: boolean;
  lastSyncTime?: string;
  autoSyncEnabled: boolean;
  syncInProgress: boolean;
  apiBaseUrl: string;
} 