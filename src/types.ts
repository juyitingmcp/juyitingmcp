// 核心英雄接口
export interface Hero {
  id: string;
  name: string;
  rule: string;
  goal: string;
  version: string;
  description?: string;
  category?: string;
  tags?: string[];
  source?: 'local' | 'remote' | 'default';
  capabilities?: string[];
  limitations?: string[];
  examples?: string[];
  relatedHeroes?: string[];
}

// 协作配置
export interface CollaborationConfig {
  heroIds?: string[];
  maxRounds?: number;
  timeoutPerRound?: number;
  mode?: CollaborationMode;
  enableCrossValidation?: boolean;
  synthesisMode?: 'auto' | 'manual';
}

// 协作模式枚举
export enum CollaborationMode {
  PARALLEL = 'parallel',
  SEQUENTIAL = 'sequential',
  INTELLIGENT = 'intelligent'
}

// 英雄分析结果
export interface HeroAnalysis {
  heroId: string;
  heroName: string;
  query: string;
  analysis: string;
  confidence: number;
  executionTime: number;
  timestamp: string;
  error?: string;
}

// 协作结果
export interface CollaborationResult {
  sessionId: string;
  query: string;
  selectedHeroes: string[];
  mode: string;
  analyses: HeroAnalysis[];
  crossValidation?: CrossValidationResult;
  synthesis?: SynthesisResult;
  actionPlan?: ActionPlan;
  executionTime: number;
}

// 交叉验证结果
export interface CrossValidationResult {
  commonPoints: string[];
  disagreements: string[];
  confidenceScore: number;
  recommendations: string[];
}

// 综合分析结果
export interface SynthesisResult {
  summary: string;
  keyInsights: string[];
  risks: string[];
  opportunities: string[];
  confidence: number;
}

// 行动计划
export interface ActionPlan {
  steps: ActionStep[];
  timeline: string;
  priority: 'high' | 'medium' | 'low';
  resources: string[];
}

export interface ActionStep {
  id: string;
  description: string;
  priority: number;
  estimatedTime: string;
  dependencies: string[];
}

// 英雄配置
export interface HeroConfig {
  id: string;
  name: string;
  version: string;
  heroes: Hero[];
  collaboration: CollaborationConfig;
  tools?: ToolConfig[];
  createdAt?: string;
  updatedAt?: string;
}

// 工具配置
export interface ToolConfig {
  name: string;
  enabled: boolean;
  settings?: Record<string, any>;
}

// 配置摘要
export interface ConfigSummary {
  id: string;
  name: string;
  description?: string;
  heroes: string[];
  createdAt: string;
  version: string;
}

// 本地配置
export interface LocalConfig {
  userKey: string;
  apiBaseUrl: string;
  currentConfig?: HeroConfig;
  lastSyncTime?: string;
  cache: CacheConfig;
  sync: SyncConfig;
}

export interface CacheConfig {
  duration: number;
  maxSize: number;
}

export interface SyncConfig {
  autoSync: boolean;
  syncInterval: number;
  retryAttempts: number;
}

// MCP响应格式
export interface MCPResponse {
  content: Array<{
    type: 'text';
    text: string;
  }>;
}

// 错误类型
export class JuYiTingError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: any
  ) {
    super(message);
    this.name = 'JuYiTingError';
  }
}

// 会话信息
export interface SessionInfo {
  id: string;
  query: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  selectedHeroes: string[];
  startTime: number;
  duration: number;
}

// 缓存条目
export interface CacheEntry {
  value: any;
  expiry: number;
}

// 英雄仓库接口
export interface HeroRepository {
  getAllHeroes(): Promise<Hero[]>;
  getHeroById(id: string): Promise<Hero | null>;
  updateFromConfig(config: HeroConfig): Promise<void>;
} 