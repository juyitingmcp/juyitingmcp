import { ConfigSynchronizer } from '../../src/config-synchronizer';
import { PersonaConfig, LocalConfig } from '../../src/types';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

// 加载测试数据
const mockResponsesPath = path.join(__dirname, '../fixtures/mock-responses.json');
const testConfigsPath = path.join(__dirname, '../fixtures/test-configs.json');
const mockResponses = JSON.parse(fs.readFileSync(mockResponsesPath, 'utf-8'));
const testConfigs = JSON.parse(fs.readFileSync(testConfigsPath, 'utf-8'));

// Mock fetch 和 fs
global.fetch = jest.fn();
jest.mock('fs');
jest.mock('os');

const mockFs = fs as jest.Mocked<typeof fs>;
const mockOs = os as jest.Mocked<typeof os>;

describe('ConfigSynchronizer', () => {
  let configSync: ConfigSynchronizer;
  let mockFetch: jest.MockedFunction<typeof fetch>;
  let testConfigPath: string;

  beforeEach(() => {
    mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;
    mockFetch.mockClear();
    
    // 设置mock路径
    testConfigPath = '/test/config/path/config.json';
    mockOs.homedir.mockReturnValue('/test/home');
    mockFs.existsSync.mockReturnValue(false);
    mockFs.mkdirSync.mockImplementation();
    mockFs.readFileSync.mockReturnValue('{}');
    mockFs.writeFileSync.mockImplementation();
    
    configSync = new ConfigSynchronizer(testConfigPath);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('构造函数和初始化', () => {
    test('应该使用提供的配置路径', () => {
      const customPath = '/custom/path/config.json';
      const sync = new ConfigSynchronizer(customPath);
      
      expect(sync).toBeInstanceOf(ConfigSynchronizer);
    });

    test('应该使用默认配置路径', () => {
      mockOs.homedir.mockReturnValue('/home/user');
      
      const sync = new ConfigSynchronizer();
      
      expect(mockOs.homedir).toHaveBeenCalled();
      expect(mockFs.mkdirSync).toHaveBeenCalledWith(
        '/home/user/.juyiting',
        { recursive: true }
      );
    });

    test('应该加载现有配置文件', () => {
      const existingConfig = {
        userKey: 'test-key',
        apiBaseUrl: 'https://test.api.com',
        cache: { duration: 300000, maxSize: 1000 },
        sync: { autoSync: true, syncInterval: 3600000, retryAttempts: 3 }
      };
      
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue(JSON.stringify(existingConfig));
      
      const sync = new ConfigSynchronizer(testConfigPath);
      
      expect(mockFs.readFileSync).toHaveBeenCalledWith(testConfigPath, 'utf-8');
    });

    test('应该处理损坏的配置文件', () => {
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockImplementation(() => {
        throw new Error('File read error');
      });
      
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      
      const sync = new ConfigSynchronizer(testConfigPath);
      
      expect(consoleSpy).toHaveBeenCalledWith(
        '加载本地配置失败:',
        'File read error'
      );
      
      consoleSpy.mockRestore();
    });
  });

  describe('listRemoteConfigs', () => {
    test('应该成功获取配置列表', async () => {
      mockFetch.mockResolvedValueOnce({
        json: async () => mockResponses.listConfigs.success
      } as unknown as Response);
      
      // 设置userKey
      (configSync as any).localConfig.userKey = 'test-key';
      
      const configs = await (configSync as any).listRemoteConfigs();
      
      expect(configs).toHaveLength(2);
      expect(configs[0].id).toBe('test-config-001');
      expect(configs[0].name).toBe('测试创业分析团队');
    });

    test('应该处理认证失败', async () => {
      mockFetch.mockResolvedValueOnce({
        json: async () => mockResponses.listConfigs.unauthorized
      } as unknown as Response);
      
      (configSync as any).localConfig.userKey = 'invalid-key';
      
      await expect((configSync as any).listRemoteConfigs()).rejects.toThrow('Invalid API key');
    });

    test('应该处理空配置列表', async () => {
      mockFetch.mockResolvedValueOnce({
        json: async () => mockResponses.listConfigs.empty
      } as unknown as Response);
      
      (configSync as any).localConfig.userKey = 'test-key';
      
      const configs = await (configSync as any).listRemoteConfigs();
      
      expect(configs).toHaveLength(0);
    });

    test('应该处理服务器错误', async () => {
      mockFetch.mockResolvedValueOnce({
        json: async () => mockResponses.listConfigs.serverError
      } as unknown as Response);
      
      (configSync as any).localConfig.userKey = 'test-key';
      
      await expect((configSync as any).listRemoteConfigs()).rejects.toThrow('Internal server error');
    });
  });

  describe('downloadConfig', () => {
    test('应该成功下载配置', async () => {
      mockFetch.mockResolvedValueOnce({
        json: async () => mockResponses.downloadConfig.success
      } as unknown as Response);
      
      (configSync as any).localConfig.userKey = 'test-key';
      
      const config = await (configSync as any).downloadConfig('test-config-001');
      
      expect(config.id).toBe('test-config-001');
      expect(config.name).toBe('测试创业分析团队');
      expect(config.personas).toHaveLength(1);
    });

    test('应该处理配置不存在', async () => {
      mockFetch.mockResolvedValueOnce({
        json: async () => mockResponses.downloadConfig.notFound
      } as unknown as Response);
      
      (configSync as any).localConfig.userKey = 'test-key';
      
      await expect((configSync as any).downloadConfig('non-existent')).rejects.toThrow('Configuration not found');
    });

    test('应该处理权限不足', async () => {
      mockFetch.mockResolvedValueOnce({
        json: async () => mockResponses.downloadConfig.forbidden
      } as unknown as Response);
      
      (configSync as any).localConfig.userKey = 'test-key';
      
      await expect((configSync as any).downloadConfig('forbidden-config')).rejects.toThrow('Access denied to configuration');
    });
  });

  describe('syncFromRemote', () => {
    test('应该成功同步远程配置', async () => {
      // Mock listRemoteConfigs
      mockFetch
        .mockResolvedValueOnce({
          json: async () => mockResponses.listConfigs.success
        } as unknown as Response)
        .mockResolvedValueOnce({
          json: async () => mockResponses.downloadConfig.success
        } as unknown as Response);
      
      (configSync as any).localConfig.userKey = 'test-key';
      
      const config = await configSync.syncFromRemote('test-config-001');
      
      expect(config.id).toBe('test-config-001');
      expect(config.name).toBe('测试创业分析团队');
      
      // 验证本地配置已更新
      expect(mockFs.writeFileSync).toHaveBeenCalled();
    });

    test('应该在userKey未设置时抛出错误', async () => {
      (configSync as any).localConfig.userKey = '';
      
      await expect(configSync.syncFromRemote('test-config-001')).rejects.toThrow('用户KEY未配置，请先设置userKey');
    });

    test('应该在配置不存在时抛出错误', async () => {
      mockFetch.mockResolvedValueOnce({
        json: async () => mockResponses.listConfigs.success
      } as unknown as Response);
      
      (configSync as any).localConfig.userKey = 'test-key';
      
      await expect(configSync.syncFromRemote('non-existent')).rejects.toThrow('配置 non-existent 不存在或无权限访问');
    });

    test('应该防止并发同步', async () => {
      mockFetch
        .mockResolvedValue({
          json: async () => new Promise(resolve => 
            setTimeout(() => resolve(mockResponses.listConfigs.success), 100)
          )
        } as unknown as Response);
      
      (configSync as any).localConfig.userKey = 'test-key';
      
      const promise1 = configSync.syncFromRemote('test-config-001');
      const promise2 = configSync.syncFromRemote('test-config-002');
      
      await expect(promise2).rejects.toThrow('同步正在进行中，请稍后再试');
      
      // 等待第一个完成
      await expect(promise1).rejects.toThrow(); // 会因为配置不存在而失败
    });
  });

  describe('配置验证', () => {
    test('应该验证配置完整性', () => {
      const validConfig = testConfigs[0];
      
      expect(() => (configSync as any).validatePersonaConfig(validConfig)).not.toThrow();
    });

    test('应该拒绝缺少必需字段的配置', () => {
      const invalidConfig = { ...testConfigs[0] };
      delete invalidConfig.id;
      
      expect(() => (configSync as any).validatePersonaConfig(invalidConfig)).toThrow('配置缺少必需字段: id');
    });

    test('应该验证人格数组', () => {
      const invalidConfig = { ...testConfigs[0], personas: [] };
      
      expect(() => (configSync as any).validatePersonaConfig(invalidConfig)).toThrow('配置必须包含至少一个人格');
    });

    test('应该验证人格字段完整性', () => {
      const invalidConfig = {
        ...testConfigs[0],
        personas: [{ id: 'test', name: 'test' }] // 缺少rule和goal
      };
      
      expect(() => (configSync as any).validatePersonaConfig(invalidConfig)).toThrow('人格 1 缺少必需字段: rule');
    });
  });

  describe('本地配置管理', () => {
    test('应该保存当前配置', async () => {
      const config = testConfigs[0];
      
      await (configSync as any).saveCurrentConfig(config);
      
      expect(mockFs.writeFileSync).toHaveBeenCalled();
      
      const savedConfig = (configSync as any).localConfig;
      expect(savedConfig.currentConfig).toEqual(config);
      expect(savedConfig.lastSyncTime).toBeDefined();
    });

    test('应该获取当前配置', async () => {
      const config = testConfigs[0];
      (configSync as any).localConfig.currentConfig = config;
      
      const currentConfig = await configSync.getCurrentConfig();
      
      expect(currentConfig).toEqual(config);
    });

    test('应该在没有配置时返回null', async () => {
      const currentConfig = await configSync.getCurrentConfig();
      
      expect(currentConfig).toBeNull();
    });
  });

  describe('自动同步', () => {
    test('应该启动自动同步', () => {
      const setIntervalSpy = jest.spyOn(global, 'setInterval').mockImplementation();
      
      (configSync as any).localConfig.sync.autoSync = true;
      (configSync as any).startAutoSync();
      
      expect(setIntervalSpy).toHaveBeenCalled();
      
      setIntervalSpy.mockRestore();
    });

    test('应该检查配置更新', async () => {
      const currentConfig = { ...testConfigs[0], version: '1.0.0' };
      const updatedConfig = { ...testConfigs[0], version: '2.0.0' };
      
      (configSync as any).localConfig.currentConfig = currentConfig;
      
      mockFetch.mockResolvedValueOnce({
        json: async () => ({
          success: true,
          data: [updatedConfig]
        })
      } as unknown as Response);
      
      (configSync as any).localConfig.userKey = 'test-key';
      
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      await (configSync as any).checkForUpdates();
      
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('发现配置更新')
      );
      
      consoleSpy.mockRestore();
    });
  });

  describe('错误处理', () => {
    test('应该处理网络错误', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'));
      
      (configSync as any).localConfig.userKey = 'test-key';
      
      await expect(configSync.syncFromRemote('test-config-001')).rejects.toThrow();
    });

    test('应该处理JSON解析错误', async () => {
      mockFetch.mockResolvedValueOnce({
        json: async () => { throw new Error('Invalid JSON'); }
      } as unknown as Response);
      
      (configSync as any).localConfig.userKey = 'test-key';
      
      await expect(configSync.syncFromRemote('test-config-001')).rejects.toThrow();
    });

    test('应该处理文件系统错误', async () => {
      mockFs.writeFileSync.mockImplementation(() => {
        throw new Error('File write error');
      });
      
      const config = testConfigs[0];
      
      await expect((configSync as any).saveCurrentConfig(config)).rejects.toThrow('File write error');
    });
  });

  describe('性能测试', () => {
    test('应该正确处理并发请求', async () => {
      const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
      
      mockFetch.mockImplementation(() => 
        delay(100).then(() => ({
          json: async () => mockResponses.listConfigs.success
        })) as Promise<Response>
      );
      
      (configSync as any).localConfig.userKey = 'test-key';
      
      const startTime = Date.now();
      
      // 并发调用
      const promises = [
        (configSync as any).listRemoteConfigs(),
        (configSync as any).listRemoteConfigs(),
        (configSync as any).listRemoteConfigs()
      ];
      
      const results = await Promise.all(promises);
      const endTime = Date.now();
      
      // 验证结果一致性
      expect(results[0]).toEqual(results[1]);
      expect(results[1]).toEqual(results[2]);
      
      // 验证并发执行（总时间应该接近单次执行时间）
      expect(endTime - startTime).toBeLessThan(300);
    });
  });
}); 