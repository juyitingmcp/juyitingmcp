import {
  PersonaNameSchema,
  ConfigIdSchema,
  QuerySchema,
  PersonaIdsSchema,
  CollaborationModeSchema,
  validateArgs,
  createErrorResponse,
  sanitizeArgs,
  ToolStatsManager,
  globalToolStats,
  withToolStats
} from '../../src/utils/validation';

describe('参数验证系统', () => {
  describe('Schema验证', () => {
    describe('PersonaNameSchema', () => {
      test('应该接受有效的人格名称', () => {
        const validNames = ['粉丝妹', 'fan_girl', '测试人格123', 'Test Persona'];
        
        validNames.forEach(name => {
          expect(() => PersonaNameSchema.parse(name)).not.toThrow();
        });
      });

      test('应该拒绝无效的人格名称', () => {
        const invalidNames = ['', 'a'.repeat(51), '   ', '\n\t'];
        
        invalidNames.forEach(name => {
          expect(() => PersonaNameSchema.parse(name)).toThrow();
        });
      });
    });

    describe('QuerySchema', () => {
      test('应该接受有效的查询内容', () => {
        const validQueries = [
          '分析这个项目',
          'What is the business model?',
          '请帮我评估一下这个技术方案的可行性和风险'
        ];
        
        validQueries.forEach(query => {
          expect(() => QuerySchema.parse(query)).not.toThrow();
        });
      });

      test('应该拒绝无效的查询内容', () => {
        const invalidQueries = ['', '   ', 'abc'];
        
        invalidQueries.forEach(query => {
          expect(() => QuerySchema.parse(query)).toThrow();
        });
      });
    });
  });

  describe('validateArgs函数', () => {
    test('应该在验证成功时返回成功结果', () => {
      const result = validateArgs(PersonaNameSchema, '暴躁老哥');
      
      expect(result.success).toBe(true);
      expect(result.data).toBe('暴躁老哥');
      expect(result.error).toBeUndefined();
    });

    test('应该在验证失败时返回错误结果', () => {
      const result = validateArgs(PersonaNameSchema, '');
      
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.details).toBeDefined();
      expect(result.data).toBeUndefined();
    });
  });

  describe('createErrorResponse函数', () => {
    test('应该创建标准错误响应', () => {
      const response = createErrorResponse('测试错误');
      
      expect(response.content).toHaveLength(1);
      expect(response.content[0].type).toBe('text');
      expect(response.content[0].text).toContain('❌ 测试错误');
      expect(response.content[0].text).toContain('**解决建议**');
    });
  });

  describe('sanitizeArgs函数', () => {
    test('应该清理字符串参数', () => {
      const input = '  测试内容  \n\t';
      const result = sanitizeArgs(input);
      
      expect(result).toBe('测试内容');
    });
  });
});

describe('工具统计系统', () => {
  describe('ToolStatsManager', () => {
    let statsManager: ToolStatsManager;

    beforeEach(() => {
      statsManager = new ToolStatsManager();
    });

    test('应该正确记录工具调用', () => {
      statsManager.recordCall('test_tool', true, 100);
      
      const stats = statsManager.getStats('test_tool');
      expect(stats).toHaveLength(1);
      expect(stats[0].callCount).toBe(1);
      expect(stats[0].successCount).toBe(1);
      expect(stats[0].errorCount).toBe(0);
      expect(stats[0].avgExecutionTime).toBe(100);
    });

    test('应该正确处理失败调用', () => {
      statsManager.recordCall('test_tool', false, 50);
      
      const stats = statsManager.getStats('test_tool');
      expect(stats).toHaveLength(1);
      expect(stats[0].callCount).toBe(1);
      expect(stats[0].successCount).toBe(0);
      expect(stats[0].errorCount).toBe(1);
    });
  });

  describe('withToolStats装饰器', () => {
    test('应该正确记录成功调用', async () => {
      const mockFn = jest.fn().mockResolvedValue('success');
      const decoratedFn = withToolStats('test_decorator', mockFn);
      
      const result = await decoratedFn('arg1', 'arg2');
      
      expect(result).toBe('success');
      expect(mockFn).toHaveBeenCalledWith('arg1', 'arg2');
      
      const stats = globalToolStats.getStats('test_decorator');
      expect(stats.callCount).toBe(1);
      expect(stats.successCount).toBe(1);
    });
  });
}); 