import { RemoteHeroRepository } from '../../src/hero-repository';
import { Persona, CollaborationMode } from '../../src/types';
import * as fs from 'fs';
import * as path from 'path';

// 加载测试数据
const testPersonasPath = path.join(__dirname, '../fixtures/test-personas.json');
const mockResponsesPath = path.join(__dirname, '../fixtures/mock-responses.json');
const testPersonas: Persona[] = JSON.parse(fs.readFileSync(testPersonasPath, 'utf-8'));
const mockResponses = JSON.parse(fs.readFileSync(mockResponsesPath, 'utf-8'));

// Mock fetch 全局函数
global.fetch = jest.fn();

describe('RemoteHeroRepository', () => {
  let repository: RemoteHeroRepository;
  let mockFetch: jest.MockedFunction<typeof fetch>;

  beforeEach(() => {
    mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;
    mockFetch.mockClear();
    
    // 使用测试人格数据初始化仓库
    const localPersonas = testPersonas.filter(p => p.source === 'local');
    repository = new RemoteHeroRepository(localPersonas);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('构造函数和初始化', () => {
    test('应该正确初始化本地人格', () => {
      const localPersonas = testPersonas.filter(p => p.source === 'local');
      const repo = new RemoteHeroRepository(localPersonas);
      
      expect(repo).toBeInstanceOf(RemoteHeroRepository);
    });

    test('应该过滤无效的本地人格', () => {
      const invalidPersonas = [
        {
          id: 'valid',
          name: '有效人格',
          rule: '有效规则',
          goal: '有效目标',
          version: '1.0.0'
        },
        {
          id: 'invalid',
          name: '无效人格',
          rule: '', // 缺少规则
          goal: '', // 缺少目标
          version: '1.0.0'
        }
      ];
      
      // 监听console.warn
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      
      const repo = new RemoteHeroRepository(invalidPersonas);
      
      expect(consoleSpy).toHaveBeenCalledWith(
        '无效的本地人格被跳过:',
        expect.objectContaining({ id: 'invalid' })
      );
      
      consoleSpy.mockRestore();
    });
  });

  describe('getAllPersonas', () => {
    test('应该返回本地人格当缓存有效时', async () => {
      // 模拟有效缓存
      (repository as any).lastFetchTime = Date.now();
      (repository as any).personas.set('test_grumpy_bro', testPersonas[0]);
      
      const personas = await repository.getAllPersonas();
      
      expect(personas).toHaveLength(1);
      expect(personas[0].name).toBe('测试暴躁老哥');
      expect(personas[0].source).toBe('local');
      expect(mockFetch).not.toHaveBeenCalled();
    });

    test('应该从远程获取人格当缓存无效时', async () => {
             // 模拟远程成功响应
       mockFetch.mockResolvedValueOnce({
         ok: true,
         json: async () => mockResponses.remotePersonas.github
       } as unknown as Response);

      const personas = await repository.getAllPersonas();
      
      expect(mockFetch).toHaveBeenCalled();
      expect(personas.length).toBeGreaterThan(0);
      
      // 检查是否包含远程人格
      const remotePersona = personas.find(p => p.source === 'remote');
      expect(remotePersona).toBeDefined();
    });

    test('应该在远程失败时降级到默认人格', async () => {
      // 模拟网络错误
      mockFetch.mockRejectedValue(new Error('Network error'));
      
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      
      const personas = await repository.getAllPersonas();
      
      expect(personas.length).toBeGreaterThan(0);
      expect(consoleSpy).toHaveBeenCalledWith(
        '所有远程源均失败，使用默认人格'
      );
      
      consoleSpy.mockRestore();
    });

    test('应该正确合并本地和远程人格', async () => {
      // 模拟远程响应
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => [
          {
            id: 'remote_persona',
            name: '远程人格',
            rule: '远程规则',
            goal: '远程目标',
            version: '1.0.0'
          },
          {
            id: 'test_grumpy_bro', // 与本地人格ID相同
            name: '远程暴躁老哥',
            rule: '远程规则',
            goal: '远程目标',
            version: '2.0.0'
          }
        ]
      } as Response);

      const personas = await repository.getAllPersonas();
      
      // 本地人格应该覆盖同ID的远程人格
      const grumpyBro = personas.find(p => p.id === 'test_grumpy_bro');
      expect(grumpyBro?.name).toBe('测试暴躁老哥'); // 本地版本
      expect(grumpyBro?.source).toBe('local');
      
      // 应该包含远程独有的人格
      const remotePersona = personas.find(p => p.id === 'remote_persona');
      expect(remotePersona).toBeDefined();
      expect(remotePersona?.source).toBe('remote');
    });
  });

  describe('getPersonaById', () => {
    test('应该正确返回指定ID的人格', async () => {
      const persona = await repository.getPersonaById('test_grumpy_bro');
      
      expect(persona).toBeDefined();
      expect(persona?.id).toBe('test_grumpy_bro');
      expect(persona?.name).toBe('测试暴躁老哥');
    });

    test('应该在人格不存在时返回null', async () => {
      const persona = await repository.getPersonaById('non_existent');
      
      expect(persona).toBeNull();
    });
  });

  describe('网络请求处理', () => {
    test('应该处理超时错误', async () => {
      // 模拟超时
      mockFetch.mockImplementation(() => 
        new Promise((_, reject) => {
          const error = new Error('Request timeout');
          error.name = 'AbortError';
          setTimeout(() => reject(error), 100);
        })
      );

      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      
      const personas = await repository.getAllPersonas();
      
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('获取超时:')
      );
      
      consoleSpy.mockRestore();
    });

    test('应该处理HTTP错误响应', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404
      } as Response);

      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      
      const personas = await repository.getAllPersonas();
      
      // 应该降级到默认人格
      expect(personas.length).toBeGreaterThan(0);
      
      consoleSpy.mockRestore();
    });

    test('应该处理无效JSON响应', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => { throw new Error('Invalid JSON'); }
      } as Response);

      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      
      const personas = await repository.getAllPersonas();
      
      expect(consoleSpy).toHaveBeenCalled();
      
      consoleSpy.mockRestore();
    });
  });

  describe('缓存机制', () => {
    test('应该正确判断缓存有效性', () => {
      // 设置最近的获取时间
      (repository as any).lastFetchTime = Date.now();
      (repository as any).personas.set('test', testPersonas[0]);
      
      const isValid = (repository as any).isCacheValid();
      expect(isValid).toBe(true);
    });

    test('应该正确判断缓存过期', () => {
      // 设置过期的获取时间
      (repository as any).lastFetchTime = Date.now() - 10 * 60 * 1000; // 10分钟前
      
      const isValid = (repository as any).isCacheValid();
      expect(isValid).toBe(false);
    });

    test('应该在缓存为空时判断为无效', () => {
      (repository as any).lastFetchTime = Date.now();
      (repository as any).personas.clear();
      
      const isValid = (repository as any).isCacheValid();
      expect(isValid).toBe(false);
    });
  });

  describe('updateFromConfig', () => {
    test('应该正确更新本地人格仓库', async () => {
      const config = {
        id: 'test-config',
        name: '测试配置',
        version: '1.0.0',
        personas: [
          {
            id: 'config_persona',
            name: '配置人格',
            rule: '配置规则',
            goal: '配置目标',
            version: '1.0.0'
          }
        ],
                 collaboration: {
           mode: CollaborationMode.INTELLIGENT,
           maxRounds: 3,
           timeoutPerRound: 30000
         },
        tools: []
      };

      await repository.updateFromConfig(config);
      
      const personas = await repository.getAllPersonas();
      const configPersona = personas.find(p => p.id === 'config_persona');
      
      expect(configPersona).toBeDefined();
      expect(configPersona?.name).toBe('配置人格');
      expect(configPersona?.source).toBe('local');
    });
  });

  describe('性能测试', () => {
    test('多次调用应该使用缓存', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => mockResponses.remotePersonas.github
      } as Response);

      // 第一次调用
      await repository.getAllPersonas();
      expect(mockFetch).toHaveBeenCalledTimes(1);

      // 第二次调用应该使用缓存
      await repository.getAllPersonas();
      expect(mockFetch).toHaveBeenCalledTimes(1); // 仍然是1次
    });

    test('并发调用应该正确处理', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => mockResponses.remotePersonas.github
      } as Response);

      // 并发调用
      const promises = [
        repository.getAllPersonas(),
        repository.getAllPersonas(),
        repository.getAllPersonas()
      ];

      const results = await Promise.all(promises);
      
      // 所有结果应该相同
      expect(results[0]).toEqual(results[1]);
      expect(results[1]).toEqual(results[2]);
    });
  });
}); 