import { HeroSummonerServer } from '../../src/server';
import { RemoteHeroRepository } from '../../src/hero-repository';
import { ConfigSynchronizer } from '../../src/config-synchronizer';
import { CollaborationEngine } from '../../src/collaboration-engine';
import { Persona } from '../../src/types';

describe('基础集成测试', () => {
  describe('模块导入', () => {
    test('应该能正确导入所有核心模块', () => {
      expect(HeroSummonerServer).toBeDefined();
      expect(RemoteHeroRepository).toBeDefined();
      expect(ConfigSynchronizer).toBeDefined();
      expect(CollaborationEngine).toBeDefined();
    });
  });

  describe('类实例化', () => {
    test('应该能创建HeroSummonerServer实例', () => {
      const server = new HeroSummonerServer();
      expect(server).toBeInstanceOf(HeroSummonerServer);
    });

    test('应该能创建RemoteHeroRepository实例', () => {
      const repository = new RemoteHeroRepository();
      expect(repository).toBeInstanceOf(RemoteHeroRepository);
    });

    test('应该能创建ConfigSynchronizer实例', () => {
      // Mock fs operations
      const mockFs = require('fs');
      jest.spyOn(mockFs, 'existsSync').mockReturnValue(false);
      jest.spyOn(mockFs, 'mkdirSync').mockImplementation();
      jest.spyOn(mockFs, 'readFileSync').mockReturnValue('{}');
      
      const configSync = new ConfigSynchronizer('/tmp/test-config.json');
      expect(configSync).toBeInstanceOf(ConfigSynchronizer);
      
      jest.restoreAllMocks();
    });

    test('应该能创建CollaborationEngine实例', () => {
      const repository = new RemoteHeroRepository();
      const engine = new CollaborationEngine(repository);
      expect(engine).toBeInstanceOf(CollaborationEngine);
    });
  });

  describe('基础功能验证', () => {
    test('应该能处理空人格列表', async () => {
      const repository = new RemoteHeroRepository([]);
      const personas = await repository.getAllPersonas();
      
      // 应该返回默认人格或空数组
      expect(Array.isArray(personas)).toBe(true);
    });

    test('应该能处理本地人格', async () => {
      const testPersona: Persona = {
        id: 'test_persona',
        name: '测试人格',
        rule: '测试规则',
        goal: '测试目标',
        version: '1.0.0'
      };

      const repository = new RemoteHeroRepository([testPersona]);
      const personas = await repository.getAllPersonas();
      
      expect(personas.length).toBeGreaterThan(0);
      const found = personas.find(p => p.id === 'test_persona');
      expect(found).toBeDefined();
      expect(found?.name).toBe('测试人格');
    });

    test('应该能处理人格查询', async () => {
      const testPersona: Persona = {
        id: 'test_persona',
        name: '测试人格',
        rule: '测试规则',
        goal: '测试目标',
        version: '1.0.0'
      };

      const repository = new RemoteHeroRepository([testPersona]);
      const persona = await repository.getPersonaById('test_persona');
      
      expect(persona).toBeDefined();
      expect(persona?.name).toBe('测试人格');
    });

    test('应该能处理不存在的人格查询', async () => {
      const repository = new RemoteHeroRepository([]);
      const persona = await repository.getPersonaById('non_existent');
      
      expect(persona).toBeNull();
    });
  });

  describe('错误处理', () => {
    test('应该能处理网络错误', async () => {
      // Mock fetch to simulate network error
      global.fetch = jest.fn().mockRejectedValue(new Error('Network error'));
      
      const repository = new RemoteHeroRepository([]);
      
      // 这不应该抛出错误，而是降级到默认行为
      await expect(repository.getAllPersonas()).resolves.toBeDefined();
      
      jest.restoreAllMocks();
    });

    test('应该能处理无效的人格数据', () => {
      const invalidPersonas = [
        { id: 'invalid', name: 'Invalid' }, // 缺少必需字段
        { id: '', name: '', rule: '', goal: '', version: '' } // 空字段
      ];

      // 应该过滤掉无效人格
      expect(() => new RemoteHeroRepository(invalidPersonas as Persona[])).not.toThrow();
    });
  });

  describe('性能基准', () => {
    test('人格仓库初始化应该快速完成', () => {
      const startTime = Date.now();
      
      const testPersonas: Persona[] = Array.from({ length: 100 }, (_, i) => ({
        id: `persona_${i}`,
        name: `人格${i}`,
        rule: `规则${i}`,
        goal: `目标${i}`,
        version: '1.0.0'
      }));

      const repository = new RemoteHeroRepository(testPersonas);
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      // 应该在100ms内完成
      expect(duration).toBeLessThan(100);
      expect(repository).toBeInstanceOf(RemoteHeroRepository);
    });

    test('人格查询应该快速完成', async () => {
      const testPersonas: Persona[] = Array.from({ length: 1000 }, (_, i) => ({
        id: `persona_${i}`,
        name: `人格${i}`,
        rule: `规则${i}`,
        goal: `目标${i}`,
        version: '1.0.0'
      }));

      const repository = new RemoteHeroRepository(testPersonas);
      
      const startTime = Date.now();
      const personas = await repository.getAllPersonas();
      const endTime = Date.now();
      
      const duration = endTime - startTime;
      
      // 应该在500ms内完成
      expect(duration).toBeLessThan(500);
      expect(personas.length).toBeGreaterThanOrEqual(1000);
    });
  });
}); 