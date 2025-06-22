import { DEFAULT_CONFIG } from '../constants.js';

/**
 * 网络请求配置接口
 */
export interface RequestConfig {
  timeout?: number;
  retryAttempts?: number;
  retryDelay?: number;
  headers?: Record<string, string>;
  signal?: AbortSignal;
}

/**
 * 重试配置接口
 */
export interface RetryConfig {
  attempts: number;
  delay: number;
  backoff?: 'linear' | 'exponential';
  maxDelay?: number;
}

/**
 * 请求结果接口
 */
export interface RequestResult<T = any> {
  data: T;
  status: number;
  statusText: string;
  headers: Headers;
  url: string;
  executionTime: number;
}

/**
 * 网络错误类
 */
export class NetworkError extends Error {
  constructor(
    message: string,
    public code: string,
    public status?: number,
    public url?: string
  ) {
    super(message);
    this.name = 'NetworkError';
  }
}

/**
 * 高级网络请求管理器
 */
export class NetworkManager {
  private pendingRequests = new Map<string, Promise<any>>();
  private defaultConfig: RequestConfig;

  constructor(defaultConfig: RequestConfig = {}) {
    this.defaultConfig = {
      timeout: DEFAULT_CONFIG.REQUEST_TIMEOUT,
      retryAttempts: DEFAULT_CONFIG.MAX_RETRIES,
      retryDelay: 1000,
      headers: {
        'User-Agent': 'JuYiTing-MCP-Client/1.0',
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      ...defaultConfig
    };
  }

  /**
   * 发送GET请求
   * @param url 请求URL
   * @param config 请求配置
   * @returns 请求结果
   */
  async get<T = any>(url: string, config: RequestConfig = {}): Promise<RequestResult<T>> {
    return this.request<T>(url, { ...config, method: 'GET' });
  }

  /**
   * 发送POST请求
   * @param url 请求URL
   * @param data 请求数据
   * @param config 请求配置
   * @returns 请求结果
   */
  async post<T = any>(url: string, data?: any, config: RequestConfig = {}): Promise<RequestResult<T>> {
    return this.request<T>(url, {
      ...config,
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined
    });
  }

  /**
   * 通用请求方法
   * @param url 请求URL
   * @param config 请求配置
   * @returns 请求结果
   */
  async request<T = any>(url: string, config: RequestConfig & { method?: string; body?: string } = {}): Promise<RequestResult<T>> {
    const mergedConfig = { ...this.defaultConfig, ...config };
    const requestKey = this.generateRequestKey(url, mergedConfig);

    // 请求去重：如果相同请求正在进行，返回同一个Promise
    if (this.pendingRequests.has(requestKey)) {
      return this.pendingRequests.get(requestKey) as Promise<RequestResult<T>>;
    }

    const requestPromise = this.executeRequest<T>(url, mergedConfig);
    this.pendingRequests.set(requestKey, requestPromise);

    try {
      const result = await requestPromise;
      return result;
    } finally {
      this.pendingRequests.delete(requestKey);
    }
  }

  /**
   * 带重试的请求执行
   * @param url 请求URL
   * @param config 请求配置
   * @returns 请求结果
   */
  private async executeRequest<T>(url: string, config: RequestConfig & { method?: string; body?: string }): Promise<RequestResult<T>> {
    const retryConfig: RetryConfig = {
      attempts: config.retryAttempts || 0,
      delay: config.retryDelay || 1000,
      backoff: 'exponential',
      maxDelay: 30000
    };

         let lastError: Error | null = null;
     const startTime = Date.now();

     for (let attempt = 0; attempt <= retryConfig.attempts; attempt++) {
       try {
         const result = await this.singleRequest<T>(url, config);
         result.executionTime = Date.now() - startTime;
         return result;
       } catch (error) {
         lastError = error as Error;

         // 如果是最后一次尝试，直接抛出错误
         if (attempt === retryConfig.attempts) {
           break;
         }

         // 计算延迟时间
         const delay = this.calculateRetryDelay(attempt, retryConfig);
         console.warn(`请求失败，${delay}ms后重试 (${attempt + 1}/${retryConfig.attempts + 1}): ${error instanceof Error ? error.message : String(error)}`);
         
         await this.sleep(delay);
       }
     }

     throw new NetworkError(
       `请求失败，已重试${retryConfig.attempts}次: ${lastError?.message || '未知错误'}`,
       'NETWORK_ERROR',
       undefined,
       url
     );
  }

  /**
   * 单次请求执行
   * @param url 请求URL
   * @param config 请求配置
   * @returns 请求结果
   */
  private async singleRequest<T>(url: string, config: RequestConfig & { method?: string; body?: string }): Promise<RequestResult<T>> {
    const controller = new AbortController();
    const timeoutId = config.timeout ? setTimeout(() => controller.abort(), config.timeout) : null;

    try {
      const response = await fetch(url, {
        method: config.method || 'GET',
        headers: config.headers,
        body: config.body,
        signal: config.signal || controller.signal
      });

      if (timeoutId) {
        clearTimeout(timeoutId);
      }

      if (!response.ok) {
        throw new NetworkError(
          `HTTP ${response.status}: ${response.statusText}`,
          'HTTP_ERROR',
          response.status,
          url
        );
      }

      const data = await response.json();

      return {
        data,
        status: response.status,
        statusText: response.statusText,
        headers: response.headers,
        url,
        executionTime: 0 // 将在上层设置
      };
    } catch (error) {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }

      if (error instanceof Error && error.name === 'AbortError') {
        throw new NetworkError('请求超时', 'TIMEOUT', undefined, url);
      }

      if (error instanceof NetworkError) {
        throw error;
      }

      throw new NetworkError(
        `网络请求失败: ${error instanceof Error ? error.message : String(error)}`,
        'NETWORK_ERROR',
        undefined,
        url
      );
    }
  }

  /**
   * 批量请求（并发控制）
   * @param requests 请求配置数组
   * @param concurrency 并发数量
   * @returns 请求结果数组
   */
  async batchRequest<T = any>(
    requests: Array<{ url: string; config?: RequestConfig }>,
    concurrency = 3
  ): Promise<Array<RequestResult<T> | Error>> {
    const results: Array<RequestResult<T> | Error> = [];
    
    for (let i = 0; i < requests.length; i += concurrency) {
      const batch = requests.slice(i, i + concurrency);
      const batchPromises = batch.map(async ({ url, config }) => {
        try {
          return await this.get<T>(url, config);
        } catch (error) {
          return error as Error;
        }
      });

      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);
    }

    return results;
  }

  /**
   * 生成请求键（用于去重）
   * @param url 请求URL
   * @param config 请求配置
   * @returns 请求键
   */
  private generateRequestKey(url: string, config: any): string {
    const keyData = {
      url,
      method: config.method || 'GET',
      body: config.body
    };
    return JSON.stringify(keyData);
  }

  /**
   * 计算重试延迟
   * @param attempt 当前尝试次数
   * @param config 重试配置
   * @returns 延迟时间（毫秒）
   */
  private calculateRetryDelay(attempt: number, config: RetryConfig): number {
    let delay: number;

    switch (config.backoff) {
      case 'exponential':
        delay = config.delay * Math.pow(2, attempt);
        break;
      case 'linear':
      default:
        delay = config.delay * (attempt + 1);
        break;
    }

    return Math.min(delay, config.maxDelay || 30000);
  }

  /**
   * 睡眠函数
   * @param ms 睡眠时间（毫秒）
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 取消所有待处理的请求
   */
  cancelAllPendingRequests(): void {
    this.pendingRequests.clear();
  }

  /**
   * 获取待处理请求统计
   * @returns 统计信息
   */
  getPendingRequestsCount(): number {
    return this.pendingRequests.size;
  }
}

// 全局网络管理器实例
export const networkManager = new NetworkManager();

/**
 * 便捷的请求函数
 */
export async function fetchWithRetry<T = any>(
  url: string,
  config: RequestConfig = {}
): Promise<T> {
  const result = await networkManager.get<T>(url, config);
  return result.data;
}

/**
 * 英雄数据专用请求函数
 * @param url 英雄数据URL
 * @returns 英雄数据数组
 */
export async function fetchHeroData(url: string): Promise<any[]> {
  const config: RequestConfig = {
    timeout: 15000,
    retryAttempts: 3,
    retryDelay: 1000,
    headers: {
      'Accept': 'application/json',
      'User-Agent': 'JuYiTing-MCP/1.0'
    }
  };

  try {
    const result = await networkManager.get(url, config);
    
    if (!Array.isArray(result.data)) {
      throw new NetworkError(
        '英雄数据格式错误：应为数组',
        'INVALID_FORMAT',
        result.status,
        url
      );
    }

    console.log(`成功获取 ${result.data.length} 个英雄数据 (耗时: ${result.executionTime}ms)`);
    return result.data;
    
  } catch (error) {
    if (error instanceof NetworkError) {
      throw error;
    }
    
    throw new NetworkError(
      `获取英雄数据失败: ${error instanceof Error ? error.message : String(error)}`,
      'FETCH_ERROR',
      undefined,
      url
    );
  }
}

/**
 * 健康检查函数
 * @param url 检查的URL
 * @returns 是否健康
 */
export async function healthCheck(url: string): Promise<boolean> {
  try {
    const result = await networkManager.get(url, {
      timeout: 5000,
      retryAttempts: 1
    });
    return result.status >= 200 && result.status < 300;
  } catch {
    return false;
  }
} 