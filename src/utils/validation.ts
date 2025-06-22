import { z } from 'zod';

/**
 * MCP工具参数验证模块
 */

// 基础验证schemas
export const PersonaNameSchema = z.string().min(1, '人格名称不能为空').max(50, '人格名称过长');

export const ConfigIdSchema = z.string().min(1, '配置ID不能为空').regex(/^[a-zA-Z0-9_-]+$/, '配置ID格式无效');

export const QuerySchema = z.string().min(5, '查询内容至少需要5个字符').max(2000, '查询内容过长（最多2000字符）');

export const PersonaIdsSchema = z.array(z.string()).optional().refine(
  (arr) => !arr || arr.length <= 10,
  '最多只能指定10个人格'
);

export const CollaborationModeSchema = z.enum(['parallel', 'sequential', 'intelligent']).optional();

// MCP工具参数schemas
export const SummonPersonaArgsSchema = z.object({
  persona_name: PersonaNameSchema
});

export const DownloadPersonaConfigArgsSchema = z.object({
  configId: ConfigIdSchema
});

export const StartCollaborationArgsSchema = z.object({
  query: QuerySchema,
  personaIds: PersonaIdsSchema,
  mode: CollaborationModeSchema
});

// 验证结果类型
export interface ValidationResult<T> {
  success: boolean;
  data?: T;
  error?: string;
  details?: string[];
}

/**
 * 通用参数验证函数
 */
export function validateArgs<T>(schema: z.ZodSchema<T>, args: unknown): ValidationResult<T> {
  try {
    const validatedData = schema.parse(args);
    return {
      success: true,
      data: validatedData
    };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const details = error.errors.map(err => `${err.path.join('.')}: ${err.message}`);
      return {
        success: false,
        error: '参数验证失败',
        details
      };
    }
    
    return {
      success: false,
      error: '未知验证错误',
      details: [String(error)]
    };
  }
}

/**
 * 创建标准化错误响应
 */
export function createErrorResponse(error: string, details?: string[]): { content: Array<{ type: 'text'; text: string }> } {
  let errorText = `❌ ${error}`;
  
  if (details && details.length > 0) {
    errorText += '\n\n**详细信息**:\n' + details.map(detail => `• ${detail}`).join('\n');
  }
  
  errorText += '\n\n**解决建议**:\n• 检查参数格式是否正确\n• 参考工具使用说明\n• 确保输入内容符合要求';
  
  return {
    content: [{
      type: 'text',
      text: errorText
    }]
  };
}

/**
 * 工具使用统计接口
 */
export interface ToolUsageStats {
  toolName: string;
  callCount: number;
  successCount: number;
  errorCount: number;
  lastUsed: string;
  avgExecutionTime: number;
}

/**
 * 工具使用统计管理器
 */
export class ToolStatsManager {
  private stats: Map<string, ToolUsageStats> = new Map();

  /**
   * 记录工具调用
   */
  recordCall(toolName: string, success: boolean, executionTime: number): void {
    const existing = this.stats.get(toolName) || {
      toolName,
      callCount: 0,
      successCount: 0,
      errorCount: 0,
      lastUsed: new Date().toISOString(),
      avgExecutionTime: 0
    };

    existing.callCount++;
    existing.lastUsed = new Date().toISOString();
    
    if (success) {
      existing.successCount++;
    } else {
      existing.errorCount++;
    }

    // 更新平均执行时间
    existing.avgExecutionTime = (existing.avgExecutionTime * (existing.callCount - 1) + executionTime) / existing.callCount;

    this.stats.set(toolName, existing);
  }

  /**
   * 获取工具统计信息
   */
  getStats(toolName?: string): ToolUsageStats[] {
    if (toolName) {
      const stat = this.stats.get(toolName);
      return stat ? [stat] : [];
    }
    
    return Array.from(this.stats.values());
  }

  /**
   * 获取统计摘要
   */
  getSummary(): {
    totalCalls: number;
    totalSuccess: number;
    totalErrors: number;
    successRate: number;
    mostUsedTool: string | null;
  } {
    const allStats = Array.from(this.stats.values());
    
    const totalCalls = allStats.reduce((sum, stat) => sum + stat.callCount, 0);
    const totalSuccess = allStats.reduce((sum, stat) => sum + stat.successCount, 0);
    const totalErrors = allStats.reduce((sum, stat) => sum + stat.errorCount, 0);
    
    const successRate = totalCalls > 0 ? totalSuccess / totalCalls : 0;
    
    const mostUsedTool = allStats.length > 0 
      ? allStats.reduce((max, stat) => stat.callCount > max.callCount ? stat : max).toolName
      : null;

    return {
      totalCalls,
      totalSuccess,
      totalErrors,
      successRate,
      mostUsedTool
    };
  }

  /**
   * 重置统计信息
   */
  reset(): void {
    this.stats.clear();
  }
}

// 全局统计管理器实例
export const globalToolStats = new ToolStatsManager();

/**
 * 工具执行装饰器
 */
export function withToolStats<T extends any[], R>(
  toolName: string,
  fn: (...args: T) => Promise<R>
): (...args: T) => Promise<R> {
  return async (...args: T): Promise<R> => {
    const startTime = Date.now();
    let success = false;
    
    try {
      const result = await fn(...args);
      success = true;
      return result;
    } catch (error) {
      success = false;
      throw error;
    } finally {
      const executionTime = Date.now() - startTime;
      globalToolStats.recordCall(toolName, success, executionTime);
    }
  };
}

/**
 * 参数清理工具
 */
export function sanitizeArgs(args: any): any {
  if (typeof args !== 'object' || args === null) {
    return args;
  }

  const sanitized: any = {};
  
  for (const [key, value] of Object.entries(args)) {
    if (typeof value === 'string') {
      // 清理字符串：去除多余空格，限制长度
      sanitized[key] = value.trim().substring(0, 5000);
    } else if (Array.isArray(value)) {
      // 清理数组：限制长度，递归清理元素
      sanitized[key] = value.slice(0, 20).map(item => sanitizeArgs(item));
    } else if (typeof value === 'object') {
      // 递归清理对象
      sanitized[key] = sanitizeArgs(value);
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized;
} 