import { CollaborationMode } from './types.js';

// 英雄数据源
export const HERO_SOURCES = [
  'https://gitee.com/juyitingmcp/juyitingmcp/raw/main/heroes.json',
  'https://raw.githubusercontent.com/juyitingmcp/juyitingmcp/main/heroes.json',
  'https://cdn.jsdelivr.net/gh/juyitingmcp/juyitingmcp@main/heroes.json'
];

// 默认配置
export const DEFAULT_CONFIG = {
  CACHE_DURATION: 5 * 60 * 1000, // 5分钟
  MAX_CACHE_SIZE: 1000,
  REQUEST_TIMEOUT: 15000, // 15秒
  MAX_RETRIES: 3,
  SYNC_INTERVAL: 60 * 60 * 1000, // 1小时
  API_BASE_URL: 'https://api.juyiting.com'
  } as const;

// 协作配置默认值
export const DEFAULT_COLLABORATION_CONFIG = {
  maxRounds: 3,
  timeoutPerRound: 30000, // 30秒
  mode: CollaborationMode.INTELLIGENT,
  enableCrossValidation: true,
  synthesisMode: 'auto' as const
};

// 错误代码
export const ERROR_CODES = {
  INVALID_HERO: 'INVALID_HERO',
  CONFIG_NOT_FOUND: 'CONFIG_NOT_FOUND',
  NETWORK_ERROR: 'NETWORK_ERROR',
  AUTH_FAILED: 'AUTH_FAILED',
  TIMEOUT: 'TIMEOUT',
  VALIDATION_ERROR: 'VALIDATION_ERROR'
} as const;

// MCP工具名称
export const MCP_TOOLS = {
  SUMMON_HERO: 'summon_hero',
  LIST_HERO_CONFIGS: 'list_hero_configs',
  DOWNLOAD_HERO_CONFIG: 'download_hero_config',
  START_COLLABORATION: 'start_collaboration'
} as const; 