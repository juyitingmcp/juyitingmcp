import { PersonaSummonerServer } from '../../src/server';
import { Persona } from '../../src/types';
import * as fs from 'fs';
import * as path from 'path';

// 加载测试数据
const testPersonasPath = path.join(__dirname, '../fixtures/test-personas.json');
const testPersonas: Persona[] = JSON.parse(fs.readFileSync(testPersonasPath, 'utf-8'));

// Mock fetch
global.fetch = jest.fn();

describe('MCP服务器集成测试', () => {
  let server: PersonaSummonerServer;
  let mockFetch: jest.MockedFunction<typeof fetch>;

  beforeEach(() => {
    mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;
    mockFetch.mockClear();
    
    // 使用测试人格初始化服务器
    const localPersonas = testPersonas.filter(p => p.source === 'local');
    server = new PersonaSummonerServer(localPersonas);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('服务器初始化', () => {
    test('应该正确初始化服务器', () => {
      expect(server).toBeInstanceOf(PersonaSummonerServer);
    });

    test('应该接受空的本地人格列表', () => {
      const emptyServer = new PersonaSummonerServer([]);
      expect(emptyServer).toBeInstanceOf(PersonaSummonerServer);
    });
  });

  describe('工具列表', () => {
    test('应该返回所有可用工具', async () => {
      const tools = await server.getAvailableTools();
      
      expect(tools).toContain('summon_persona');
      expect(tools).toContain('list_personas');
      expect(tools).toContain('search_personas');
      expect(tools).toContain('start_collaboration');
      expect(tools).toContain('get_tool_stats');
    });
  });

  describe('人格召唤工具', () => {
    test('应该成功召唤存在的人格', async () => {
      const result = await server.callTool('summon_persona', {
        persona_name: '测试暴躁老哥'
      });
      
      expect(result.content).toHaveLength(1);
      expect(result.content[0].type).toBe('text');
      expect(result.content[0].text).toContain('测试暴躁老哥');
      expect(result.content[0].text).toContain('已召唤');
    });

    test('应该处理不存在的人格', async () => {
      const result = await server.callTool('summon_persona', {
        persona_name: '不存在的人格'
      });
      
      expect(result.content[0].text).toContain('找不到人格');
      expect(result.content[0].text).toContain('可用人格');
    });

    test('应该处理空参数', async () => {
      const result = await server.callTool('summon_persona', {});
      
      expect(result.content[0].text).toContain('❌');
    });
  });

  describe('人格列表工具', () => {
    test('应该返回所有人格列表', async () => {
      const result = await server.callTool('list_personas', {});
      
      expect(result.content[0].text).toContain('可用人格');
      expect(result.content[0].text).toContain('测试暴躁老哥');
      expect(result.content[0].text).toContain('测试自省姐');
    });

    test('应该支持按分类筛选', async () => {
      const result = await server.callTool('list_personas', {
        category: 'analysis'
      });
      
      expect(result.content[0].text).toContain('analysis');
    });

    test('应该支持按来源筛选', async () => {
      const result = await server.callTool('list_personas', {
        source: 'local'
      });
      
      expect(result.content[0].text).toContain('本地人格');
    });
  });

  describe('人格搜索工具', () => {
    test('应该成功搜索人格', async () => {
      const result = await server.callTool('search_personas', {
        query: '暴躁'
      });
      
      expect(result.content[0].text).toContain('搜索结果');
      expect(result.content[0].text).toContain('测试暴躁老哥');
    });

    test('应该处理无结果搜索', async () => {
      const result = await server.callTool('search_personas', {
        query: '不存在的关键词xyz123'
      });
      
      expect(result.content[0].text).toContain('未找到匹配');
    });

    test('应该拒绝过短的查询', async () => {
      const result = await server.callTool('search_personas', {
        query: 'ab'
      });
      
      expect(result.content[0].text).toContain('❌');
    });
  });

  describe('协作分析工具', () => {
    test('应该处理没有配置的情况', async () => {
      const result = await server.callTool('start_collaboration', {
        query: '分析这个商业模式'
      });
      
      expect(result.content[0].text).toContain('未找到活跃配置');
    });

    test('应该验证查询参数', async () => {
      const result = await server.callTool('start_collaboration', {
        query: 'abc' // 过短
      });
      
      expect(result.content[0].text).toContain('❌');
    });
  });

  describe('统计工具', () => {
    test('应该返回工具使用统计', async () => {
      // 先调用几个工具
      await server.callTool('summon_persona', { persona_name: '测试暴躁老哥' });
      await server.callTool('list_personas', {});
      
      const result = await server.callTool('get_tool_stats', {});
      
      expect(result.content[0].text).toContain('工具使用统计');
      expect(result.content[0].text).toContain('总调用次数');
    });

    test('应该支持查询单个工具统计', async () => {
      await server.callTool('summon_persona', { persona_name: '测试暴躁老哥' });
      
      const result = await server.callTool('get_tool_stats', {
        toolName: 'summon_persona'
      });
      
      expect(result.content[0].text).toContain('summon_persona');
      expect(result.content[0].text).toContain('调用次数');
    });
  });

  describe('错误处理', () => {
    test('应该处理未知工具', async () => {
      await expect(server.callTool('unknown_tool', {})).rejects.toThrow();
    });

    test('应该处理网络错误', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'));
      
      // 这应该不会导致服务器崩溃，而是使用本地人格
      const result = await server.callTool('list_personas', {});
      expect(result.content[0].text).toContain('可用人格');
    });

    test('应该处理无效的JSON参数', async () => {
      const result = await server.callTool('summon_persona', 'invalid json' as any);
      
      expect(result.content[0].text).toContain('❌');
    });
  });

  describe('性能测试', () => {
    test('应该在合理时间内响应', async () => {
      const startTime = Date.now();
      
      await server.callTool('list_personas', {});
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      // 应该在1秒内完成
      expect(duration).toBeLessThan(1000);
    });

    test('应该支持并发调用', async () => {
      const promises = [
        server.callTool('list_personas', {}),
        server.callTool('search_personas', { query: '测试' }),
        server.callTool('summon_persona', { persona_name: '测试暴躁老哥' })
      ];
      
      const results = await Promise.all(promises);
      
      // 所有调用都应该成功
      results.forEach(result => {
        expect(result.content).toHaveLength(1);
        expect(result.content[0].type).toBe('text');
      });
    });
  });

  describe('状态管理', () => {
    test('应该正确维护工具调用统计', async () => {
      // 调用多个工具
      await server.callTool('summon_persona', { persona_name: '测试暴躁老哥' });
      await server.callTool('list_personas', {});
      await server.callTool('search_personas', { query: '测试' });
      
      const statsResult = await server.callTool('get_tool_stats', {});
      
      expect(statsResult.content[0].text).toContain('总调用次数: 4'); // 包括get_tool_stats本身
    });

    test('应该正确处理人格仓库更新', async () => {
      // 初始状态
      const initialResult = await server.callTool('list_personas', {});
      const initialCount = (initialResult.content[0].text.match(/\d+/g) || []).map(Number)[0];
      
      // 模拟添加新人格（通过配置更新）
      const newPersona: Persona = {
        id: 'new_test_persona',
        name: '新测试人格',
        rule: '新测试规则',
        goal: '新测试目标',
        version: '1.0.0',
        source: 'local'
      };
      
      await server.updatePersonaRepository([newPersona]);
      
      const updatedResult = await server.callTool('list_personas', {});
      expect(updatedResult.content[0].text).toContain('新测试人格');
    });
  });
}); 