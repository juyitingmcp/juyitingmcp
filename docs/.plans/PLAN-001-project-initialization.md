# PLAN-001: 聚义厅MCP项目初始化

## 📋 任务概述
完成聚义厅MCP客户端项目的基础架构搭建，包括项目结构创建、依赖配置、基础类型定义和开发环境设置。

## 🎯 目标成果
- [ ] 项目目录结构完整
- [ ] package.json和tsconfig.json配置完成
- [ ] 核心依赖安装成功
- [ ] 基础类型定义完成
- [ ] 开发环境可正常运行

## 📅 时间规划
**预计耗时**: 2-3天  
**优先级**: 高  
**依赖**: 无

## 🔧 具体实施步骤

### 步骤1: 创建项目基础结构
```bash
# 进入juyitingmcp目录
cd juyitingmcp

# 创建src目录结构
mkdir -p src/utils
mkdir -p tests/{unit,integration,fixtures}
mkdir -p examples
mkdir -p scripts
mkdir -p dist
```

### 步骤2: 初始化package.json
```json
{
  "name": "@juyiting/mcp-client",
  "version": "1.0.0",
  "description": "聚义厅MCP客户端 - AI人格协作工具",
  "main": "dist/server.js",
  "type": "module",
  "bin": {
    "juyiting-mcp": "./dist/server.js"
  },
  "files": [
    "dist",
    "README.md",
    "LICENSE"
  ],
  "scripts": {
    "dev": "tsx src/server.ts",
    "build": "tsc",
    "start": "node dist/server.js",
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage",
    "lint": "eslint src/**/*.ts",
    "lint:fix": "eslint src/**/*.ts --fix",
    "type-check": "tsc --noEmit",
    "clean": "rm -rf dist",
    "package": "npm run build && pkg dist/server.js --targets node18-macos-x64,node18-win-x64,node18-linux-x64 --out-path ./releases"
  },
  "keywords": [
    "mcp",
    "model-context-protocol",
    "ai",
    "persona",
    "collaboration",
    "juyiting"
  ],
  "author": "聚义厅技术团队",
  "license": "MIT",
  "dependencies": {
    "@modelcontextprotocol/sdk": "^1.12.3",
    "commander": "^12.1.0",
    "zod": "^3.25.67",
    "posthog-node": "^5.1.1"
  },
  "devDependencies": {
    "@types/node": "^24.0.3",
    "typescript": "^5.8.3",
    "tsx": "^4.20.3",
    "jest": "^29.0.0",
    "ts-jest": "^29.0.0",
    "@typescript-eslint/eslint-plugin": "^6.0.0",
    "@typescript-eslint/parser": "^6.0.0",
    "eslint": "^8.0.0",
    "prettier": "^3.0.0",
    "pkg": "^5.8.1"
  }
}
```

### 步骤3: 配置TypeScript (tsconfig.json)
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "outDir": "./dist",
    "rootDir": "./src",
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "resolveJsonModule": true,
    "allowSyntheticDefaultImports": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "tests"]
}
```

### 步骤4: 配置ESLint (.eslintrc.json)
```json
{
  "extends": [
    "@typescript-eslint/recommended",
    "prettier"
  ],
  "parser": "@typescript-eslint/parser",
  "plugins": ["@typescript-eslint"],
  "parserOptions": {
    "ecmaVersion": 2022,
    "sourceType": "module"
  },
  "rules": {
    "@typescript-eslint/no-unused-vars": "error",
    "@typescript-eslint/explicit-function-return-type": "warn",
    "@typescript-eslint/no-explicit-any": "warn",
    "prefer-const": "error",
    "no-var": "error"
  }
}
```

### 步骤5: 配置Prettier (.prettierrc)
```json
{
  "semi": true,
  "trailingComma": "es5",
  "singleQuote": true,
  "printWidth": 100,
  "tabWidth": 2,
  "useTabs": false
}
```

### 步骤6: 配置Jest (jest.config.js)
```javascript
export default {
  preset: 'ts-jest/presets/default-esm',
  extensionsToTreatAsEsm: ['.ts'],
  testEnvironment: 'node',
  roots: ['<rootDir>/src', '<rootDir>/tests'],
  testMatch: ['**/__tests__/**/*.ts', '**/?(*.)+(spec|test).ts'],
  transform: {
    '^.+\\.ts$': ['ts-jest', {
      useESM: true
    }]
  },
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/index.ts'
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html']
};
```

### 步骤7: 创建核心类型定义 (src/types.ts)
```typescript
// 核心人格接口
export interface Persona {
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
  relatedPersonas?: string[];
}

// 协作配置
export interface CollaborationConfig {
  personaIds?: string[];
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

// 人格分析结果
export interface PersonaAnalysis {
  personaId: string;
  personaName: string;
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
  selectedPersonas: string[];
  mode: string;
  analyses: PersonaAnalysis[];
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

// 人格配置
export interface PersonaConfig {
  id: string;
  name: string;
  version: string;
  personas: Persona[];
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
  personas: string[];
  createdAt: string;
  version: string;
}

// 本地配置
export interface LocalConfig {
  userKey: string;
  apiBaseUrl: string;
  currentConfig?: PersonaConfig;
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
  selectedPersonas: string[];
  startTime: number;
  duration: number;
}

// 缓存条目
export interface CacheEntry {
  value: any;
  expiry: number;
}

// 人格仓库接口
export interface PersonaRepository {
  getAllPersonas(): Promise<Persona[]>;
  getPersonaById(id: string): Promise<Persona | null>;
  updateFromConfig(config: PersonaConfig): Promise<void>;
}
```

### 步骤8: 创建基础常量 (src/constants.ts)
```typescript
// 人格数据源
export const PERSONA_SOURCES = [
  'https://gitee.com/juyitingmcp/juyitingmcp/raw/main/personas.json',
'https://raw.githubusercontent.com/juyitingmcp/juyitingmcp/main/personas.json',
'https://cdn.jsdelivr.net/gh/juyitingmcp/juyitingmcp@main/personas.json'
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
  mode: 'intelligent' as const,
  enableCrossValidation: true,
  synthesisMode: 'auto' as const
};

// 错误代码
export const ERROR_CODES = {
  INVALID_PERSONA: 'INVALID_PERSONA',
  CONFIG_NOT_FOUND: 'CONFIG_NOT_FOUND',
  NETWORK_ERROR: 'NETWORK_ERROR',
  AUTH_FAILED: 'AUTH_FAILED',
  TIMEOUT: 'TIMEOUT',
  VALIDATION_ERROR: 'VALIDATION_ERROR'
} as const;

// MCP工具名称
export const MCP_TOOLS = {
  SUMMON_PERSONA: 'summon_persona',
  LIST_PERSONA_CONFIGS: 'list_persona_configs',
  DOWNLOAD_PERSONA_CONFIG: 'download_persona_config',
  START_COLLABORATION: 'start_collaboration'
} as const;
```

### 步骤9: 安装依赖
```bash
# 安装生产依赖
npm install @modelcontextprotocol/sdk commander zod posthog-node

# 安装开发依赖
npm install -D @types/node typescript tsx jest ts-jest @typescript-eslint/eslint-plugin @typescript-eslint/parser eslint prettier pkg
```

### 步骤10: 创建基础的server.ts框架
```typescript
#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { Command } from 'commander';
import { readFileSync } from 'fs';
import { Persona, MCPResponse } from './types.js';

export class PersonaSummonerServer {
  private server: Server;

  constructor(localPersonas: Persona[] = []) {
    this.server = new Server({
      name: 'juyiting-mcp',
      version: '1.0.0',
    }, {
      capabilities: {
        tools: {},
      },
    });

    this.setupHandlers();
  }

  private setupHandlers(): void {
    // 列出可用工具
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          {
            name: 'summon_persona',
            description: '召唤指定人格来处理任务',
            inputSchema: {
              type: 'object',
              properties: {
                persona_name: {
                  type: 'string',
                  description: '人格名称（如：暴躁老哥、自省姐、粉丝妹）'
                }
              },
              required: ['persona_name']
            }
          }
        ]
      };
    });

    // 处理工具调用
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      switch (name) {
        case 'summon_persona':
          return await this.handleSummonPersona(args);
        default:
          throw new Error(`Unknown tool: ${name}`);
      }
    });
  }

  private async handleSummonPersona(args: any): Promise<MCPResponse> {
    // 临时实现，后续会完善
    return {
      content: [{
        type: 'text',
        text: `🎭 正在召唤人格: ${args.persona_name}\n\n（功能开发中...）`
      }]
    };
  }

  async run(): Promise<void> {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('聚义厅MCP服务器已启动');
  }
}

// 命令行入口
async function main() {
  const program = new Command();
  
  program
    .name('juyiting-mcp')
    .description('聚义厅MCP客户端')
    .version('1.0.0')
    .option('--personas <file>', '本地人格文件路径')
    .parse();

  const options = program.opts();
  let localPersonas: Persona[] = [];

  if (options.personas) {
    try {
      const content = readFileSync(options.personas, 'utf-8');
      localPersonas = JSON.parse(content);
      console.error(`已加载 ${localPersonas.length} 个本地人格`);
    } catch (error) {
      console.error(`加载本地人格失败: ${error}`);
    }
  }

  const server = new PersonaSummonerServer(localPersonas);
  await server.run();
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}
```

### 步骤11: 创建示例人格文件 (examples/local-personas.json)
```json
[
  {
    "id": "grumpy_bro",
    "name": "暴躁老哥",
    "rule": "你是暴躁老哥，要每次都用审视的目光，仔细看我的输入的潜在的问题，你要犀利的提醒在出我的问题。并给出明显在我思考框架之外的建议。你要觉得我说的太离谱了，你就骂回来，帮助我瞬间清醒。",
    "goal": "用审视的目光发现问题，提供框架外的思维角度",
    "version": "1.0",
    "description": "专门挑战传统思维，发现潜在风险和问题",
    "category": "批判思维",
    "tags": ["批判", "风险", "挑战"]
  },
  {
    "id": "reflection_sis",
    "name": "自省姐",
    "rule": "你是自省姐，总是不断挑战自己输出有没有思考的透漏，尝试突破思维边界，找到第一性原理，然后根据挑战再补充回答，达到完整。你要挑战你自己的输出是不是足够有深度和逻辑性。",
    "goal": "深度思考，查漏补缺，追求完整性",
    "version": "1.0",
    "description": "不断自我挑战，追求思考的深度和完整性",
    "category": "深度思考",
    "tags": ["自省", "深度", "完整"]
  },
  {
    "id": "fan_girl",
    "name": "粉丝妹",
    "rule": "你是粉丝妹，总是能发现别人的亮点和优势，用积极的态度去分析问题，找到事物的价值和潜力。你会用鼓励的语气，但同时保持客观和专业。",
    "goal": "发现亮点，放大优势，积极分析",
    "version": "1.0",
    "description": "善于发现亮点和优势，提供积极的分析视角",
    "category": "积极思维",
    "tags": ["积极", "优势", "鼓励"]
  }
]
```

### 步骤12: 创建README.md
```markdown
# 聚义厅MCP客户端

基于Model Context Protocol的AI人格协作工具，支持多人格智能召唤、配置同步和协作分析。

## 快速开始

### 安装依赖
\`\`\`bash
npm install
\`\`\`

### 开发模式
\`\`\`bash
npm run dev
\`\`\`

### 构建项目
\`\`\`bash
npm run build
\`\`\`

### 运行测试
\`\`\`bash
npm test
\`\`\`

## 使用方法

### Cursor配置
在Cursor的MCP设置中添加：
\`\`\`json
{
  "mcpServers": {
    "juyiting": {
      "command": "npx",
      "args": ["-y", "@juyiting/mcp-client"]
    }
  }
}
\`\`\`

### 本地开发配置
\`\`\`json
{
  "mcpServers": {
    "juyiting-dev": {
      "command": "node",
      "args": ["./dist/server.js", "--personas", "./examples/local-personas.json"]
    }
  }
}
\`\`\`

## 开发文档

- [开发计划](./docs/DEVELOPMENT_PLAN.md)
- [技术文档](../docs/client_tech.md)

## 许可证

MIT
```

## ✅ 验证检查项

### 代码质量检查
- [ ] TypeScript编译无错误: `npm run type-check`
- [ ] ESLint检查通过: `npm run lint`
- [ ] 代码格式化正确: `npx prettier --check src/**/*.ts`

### 功能验证
- [ ] 开发服务器启动: `npm run dev`
- [ ] 构建成功: `npm run build`
- [ ] 基础测试通过: `npm test`

### 集成测试
- [ ] MCP服务器可以启动
- [ ] Cursor可以识别工具
- [ ] 基础工具调用正常

## 🚨 常见问题

### 问题1: TypeScript编译错误
**解决方案**: 检查tsconfig.json配置，确保所有路径正确

### 问题2: 依赖安装失败
**解决方案**: 清理node_modules后重新安装
```bash
rm -rf node_modules package-lock.json
npm install
```

### 问题3: MCP连接失败
**解决方案**: 检查Node.js版本是否为18+，检查MCP SDK版本

## 📋 下一步计划
完成基础架构后，继续执行PLAN-002: 人格管理系统开发 