# 聚义厅MCP客户端 🎭

> 🚀 基于 Model Context Protocol (MCP) 的AI人格协作工具，支持多人格智能召唤、配置同步和协作分析

<!-- 专业徽章区域 - 让项目看起来更权威 -->
<div align="center">

<!-- 第一排：核心指标 -->
[![npm version](https://img.shields.io/npm/v/@juyiting/mcp-client?style=flat-square&logo=npm&logoColor=white)](https://www.npmjs.com/package/@juyiting/mcp-client) [![npm downloads](https://img.shields.io/npm/dw/@juyiting/mcp-client?style=flat-square&logo=npm&logoColor=white)](https://www.npmjs.com/package/@juyiting/mcp-client) [![GitHub Workflow Status](https://img.shields.io/github/actions/workflow/status/juyiting/juyitingmcp/ci.yml?style=flat-square&logo=github&logoColor=white)](https://github.com/juyiting/juyitingmcp/actions) [![Codecov](https://img.shields.io/codecov/c/github/juyiting/juyitingmcp?style=flat-square&logo=codecov&logoColor=white)](https://codecov.io/gh/juyiting/juyitingmcp) [![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)

<!-- 第二排：项目状态 -->
[![GitHub license](https://img.shields.io/github/license/juyiting/juyitingmcp?style=flat-square&logo=github&logoColor=white)](https://github.com/juyiting/juyitingmcp/blob/main/LICENSE) [![GitHub stars](https://img.shields.io/github/stars/juyiting/juyitingmcp?style=flat-square&logo=github&logoColor=white)](https://github.com/juyiting/juyitingmcp/stargazers) [![GitHub forks](https://img.shields.io/github/forks/juyiting/juyitingmcp?style=flat-square&logo=github&logoColor=white)](https://github.com/juyiting/juyitingmcp/network/members) [![GitHub issues](https://img.shields.io/github/issues/juyiting/juyitingmcp?style=flat-square&logo=github&logoColor=white)](https://github.com/juyiting/juyitingmcp/issues) [![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg?style=flat-square&logo=github&logoColor=white)](https://github.com/juyiting/juyitingmcp/pulls)

<!-- 第三排：质量指标 -->
[![Node.js](https://img.shields.io/node/v/@juyiting/mcp-client?style=flat-square&logo=node.js&logoColor=white)](https://nodejs.org/) [![Maintenance](https://img.shields.io/maintenance/yes/2025?style=flat-square&logo=github&logoColor=white)](https://github.com/juyiting/juyitingmcp/commits/main) [![Last Commit](https://img.shields.io/github/last-commit/juyiting/juyitingmcp?style=flat-square&logo=github&logoColor=white)](https://github.com/juyiting/juyitingmcp/commits/main) [![Bundle Size](https://img.shields.io/bundlephobia/minzip/@juyiting/mcp-client?style=flat-square&logo=webpack&logoColor=white)](https://bundlephobia.com/package/@juyiting/mcp-client)

</div>

---

## 📖 简介

聚义厅MCP客户端是基于 Model Context Protocol (MCP) 的AI人格协作系统，采用服务端配置生成 + 客户端MCP执行的架构模式。用户在聚义厅Web平台个性化配置人格组合，通过MCP客户端工具同步配置到本地，实现智能化的多人格协作分析。

### ✨ 主要特性

- 🎭 **多人格协作**: 支持暴躁老哥、自省姐、粉丝妹等多种AI人格
- ⚙️ **配置同步**: 用户在Web平台配置，MCP客户端自动同步
- 🤝 **智能协作**: 支持并行、顺序、智能三种协作模式
- 🔧 **标准化接口**: 严格遵循MCP协议规范，兼容Cursor、Claude Desktop等
- 📊 **遥测分析**: 可选的使用数据收集和分析
- 🌐 **多源人格**: 支持GitHub、Gitee、CDN等多个人格数据源

## 🛠️ 支持的工具

| 工具名称 | 描述 | 参数 |
|---------|------|------|
| `summon_persona` | 召唤指定人格进行单独分析 | `persona_name` |
| `list_persona_configs` | 查看用户的人格配置列表 | 无 |
| `download_persona_config` | 下载指定配置到本地 | `configId` |
| `start_collaboration` | 启动多人格协作分析 | `query`, `personaIds?` |

## 📦 安装

### NPM 全局安装
```bash
npm install -g @juyiting/mcp-client
```

### NPX 临时使用
```bash
npx @juyiting/mcp-client
```

### 从源码安装
```bash
git clone https://github.com/juyiting/juyitingmcp.git
cd juyitingmcp
npm install
npm run build
```

## 🚀 快速开始

### 1. 配置 MCP 客户端

#### Cursor 配置
在 Cursor 设置中添加：

```json
{
  "mcpServers": {
    "juyiting": {
      "command": "npx",
      "args": ["-y", "@juyiting/mcp-client"],
      "env": {
        "JUYITING_CONFIG_PATH": "~/.juyiting/config.json"
      }
    }
  }
}
```

#### Claude Desktop 配置
在 Claude Desktop 配置文件中添加：

```json
{
  "mcpServers": {
    "juyiting": {
      "command": "npx",
      "args": ["@juyiting/mcp-client"],
      "env": {
        "NODE_ENV": "production"
      }
    }
  }
}
```

### 2. 用户配置设置

首次使用需要设置用户认证密钥：

```bash
# 创建配置目录
mkdir -p ~/.juyiting

# 设置用户配置
echo '{
  "userKey": "your-api-key-from-juyiting-web",
  "apiBaseUrl": "https://api.juyiting.com",
  "cache": {
    "duration": 300000,
    "maxSize": 1000
  },
  "sync": {
    "autoSync": true,
    "syncInterval": 3600000,
    "retryAttempts": 3
  }
}' > ~/.juyiting/config.json
```

### 3. 基本使用

启动服务器后，你可以直接在支持的客户端中使用工具：

```
# 召唤单个人格
@juyiting 召唤暴躁老哥，帮我分析这个商业计划

# 查看配置列表
@juyiting 查看我的人格配置列表

# 下载配置
@juyiting 下载配置：config-001

# 启动团队协作
@juyiting 分析这个产品的市场前景：[产品描述]
```

## 📋 API 文档

### 工具：summon_persona

**描述**: 召唤指定AI人格进行专业分析

**参数**:
- `persona_name` (string, 必需): 人格名称或ID

**支持的人格**:
- `暴躁老哥` - 犀利批评，框架外思维
- `自省姐` - 深度思考，查漏补缺  
- `粉丝妹` - 发现亮点，放大优势
- `小布丁` - 商业分析，产品策略

**返回值**:
```
🎭 **人格名称** (人格ID) 已召唤！
**🎯 目标**: 人格目标描述
**📝 描述**: 人格详细描述
**📜 人格规则**: 具体的行为规则
```

### 工具：start_collaboration

**描述**: 启动多人格协作分析，根据配置执行智能协作流程

**参数**:
- `query` (string, 必需): 分析问题
- `personaIds` (string[], 可选): 指定参与协作的人格ID列表

**协作模式**:
- `parallel` - 并行分析模式，多人格同时分析
- `sequential` - 顺序分析模式，人格依次分析
- `intelligent` - 智能协作模式，自动选择最佳流程

**返回值**:
```
🤝 **协作分析报告**
📋 **分析问题**: 用户问题
👥 **参与人格**: 人格列表
⚙️ **协作模式**: 使用的协作模式

## 个人分析
### 🎭 人格1分析
- 核心观点、关键发现、风险提醒、具体建议

## 交叉验证
- 共同观点、分歧点分析、互补建议

## 综合结论
- 最终建议、行动计划、优先级排序
```

## ⚙️ 配置

### 环境变量

| 变量名 | 描述 | 默认值 |
|--------|------|--------|
| `JUYITING_CONFIG_PATH` | 配置文件路径 | `~/.juyiting/config.json` |
| `JUYITING_API_URL` | API服务地址 | `https://api.juyiting.com` |
| `TELEMETRY_ENABLED` | 是否启用遥测 | `true` |
| `DEBUG` | 调试模式 | `false` |

### 配置文件详解

```json
{
  "userKey": "string",                    // 聚义厅Web平台获取的API密钥
  "apiBaseUrl": "string",                 // API服务地址，默认官方服务
  "currentConfig": "PersonaConfig",       // 当前激活的人格配置
  "lastSyncTime": "string",              // 最后同步时间
  
  "cache": {
    "duration": 300000,                   // 缓存时长（毫秒），默认5分钟
    "maxSize": 1000                       // 最大缓存条目，默认1000
  },
  
  "sync": {
    "autoSync": true,                     // 是否自动同步配置，默认true
    "syncInterval": 3600000,              // 同步间隔（毫秒），默认1小时
    "retryAttempts": 3                    // 重试次数，默认3次
  }
}
```

## 🧪 开发

### 开发环境设置

```bash
# 克隆仓库
git clone https://github.com/juyiting/juyitingmcp.git
cd juyitingmcp

# 安装依赖
npm install

# 开发模式运行
npm run dev

# 使用本地人格文件
npm run dev -- --personas ./examples/local-personas.json
```

### 项目结构

```
src/
├── server.ts              # MCP服务器主入口
├── types.ts               # 核心类型定义
├── constants.ts           # 常量配置
├── persona-repository.ts  # 人格仓库管理
├── persona-sources.ts     # 人格数据源配置
├── collaboration-engine.ts # 协作引擎核心
├── config-synchronizer.ts # 配置同步器
├── telemetry.ts          # 遥测数据收集
└── utils/                 # 工具函数
    ├── cache.ts          # 缓存管理
    ├── network.ts        # 网络请求
    └── validation.ts     # 参数验证
```

### 运行测试

```bash
# 运行所有测试
npm test

# 运行测试并生成覆盖率报告
npm run test:coverage

# 监听模式
npm run test:watch

# 类型检查
npm run type-check

# 代码检查
npm run lint
```

### 构建和发布

```bash
# 构建项目
npm run build

# 发布流程（使用发布脚本）
./scripts/publish.sh
```

## 🎯 使用场景

### 1. 代码审查
```
@juyiting 召唤代码侠，帮我审查这段代码：
[代码内容]
```

### 2. 产品策略分析
```
@juyiting 启动产品分析团队，评估这个功能需求：
[需求描述]
```

### 3. 创业想法验证
```
@juyiting 下载创业分析团队配置
@juyiting 分析这个创业想法的可行性：
[创业想法描述]
```

### 4. 技术方案评估
```
@juyiting 召唤架构师，分析这个技术架构：
[架构图或描述]
```

## 🔍 故障排查

### 常见问题

#### MCP连接问题
**症状**: Cursor无法识别聚义厅MCP工具

**解决方案**:
```bash
# 检查Node.js版本（需要18+）
node --version

# 重新安装MCP包
npm install -g @juyiting/mcp-client@latest

# 重启Cursor
```

#### 认证失败
**症状**: 提示"Invalid API key"

**解决方案**:
- 登录聚义厅Web平台获取新的API密钥
- 更新本地配置文件 `~/.juyiting/config.json`

#### 人格加载失败
**症状**: 人格列表为空或加载超时

**解决方案**:
```bash
# 清理缓存
rm -rf ~/.juyiting/cache/*

# 检查网络连接
curl -I https://api.juyiting.com/health
```

## 📚 文档

- [架构设计指南](./docs/architecture.md) - 系统架构和设计思路
- [开发指南](./docs/development.md) - 开发环境搭建和贡献指南
- [MCP工具指南](./docs/mcp-tools.md) - 工具使用详细说明
- [Cursor集成指南](./docs/cursor-integration.md) - Cursor IDE集成配置

## 🤝 贡献

欢迎贡献代码！请查看 [贡献指南](./CONTRIBUTING.md)。

### 贡献流程

1. Fork 项目
2. 创建特性分支 (`git checkout -b feature/amazing-feature`)
3. 提交更改 (`git commit -m 'Add some amazing feature'`)
4. 推送到分支 (`git push origin feature/amazing-feature`)
5. 创建 Pull Request

### 开发规范

- 使用 TypeScript 进行开发
- 遵循 ESLint 代码规范
- 编写单元测试覆盖新功能
- 更新相关文档

## 📄 许可证

本项目采用 MIT 许可证。查看 [LICENSE](./LICENSE) 文件了解详情。

## 🔗 相关资源

- [聚义厅官网](https://juyiting.com) - 产品主页和文档
- [MCP 官方文档](https://modelcontextprotocol.io/docs) - 协议规范
- [Cursor 官方文档](https://docs.cursor.sh) - IDE使用指南
- [TypeScript 文档](https://www.typescriptlang.org/docs/) - 开发语言

## 🌟 核心人格介绍

### 🔥 暴躁老哥 (grumpy_bro)
- **定位**: 犀利批评家，框架外思维专家
- **特长**: 发现潜在问题，提供非常规建议
- **适用场景**: 风险评估、批判性分析、决策审查

### 🤔 自省姐 (reflection_sis)  
- **定位**: 深度思考者，完善主义者
- **特长**: 查漏补缺，深化分析深度
- **适用场景**: 方案优化、逻辑验证、思维完善

### 💕 粉丝妹 (fan_girl)
- **定位**: 积极支持者，亮点发现专家
- **特长**: 发现优势，放大价值点
- **适用场景**: 产品推广、优势分析、信心构建

### 🎯 小布丁 (product_strategist)
- **定位**: 商业分析师，产品策略专家
- **特长**: 市场分析，商业模式设计
- **适用场景**: 商业规划、产品策略、市场评估

---

## 📊 项目统计

- **开发时间**: 2025年1月
- **代码行数**: 3000+ 行
- **测试覆盖**: 85%+
- **文档完整度**: 90%+
- **支持平台**: macOS, Windows, Linux

## 🙏 致谢

- [Model Context Protocol](https://modelcontextprotocol.io/) - 提供了优秀的协议规范
- [TypeScript](https://www.typescriptlang.org/) - 强大的类型系统支持
- [Cursor](https://cursor.sh/) - 优秀的AI代码编辑器
- 所有贡献者和用户的支持与反馈

## 📞 支持

- 🌐 官网: [https://juyiting.com](https://juyiting.com)
- 🐛 问题反馈: [GitHub Issues](https://github.com/juyiting/juyitingmcp/issues)
- 💬 讨论: [GitHub Discussions](https://github.com/juyiting/juyitingmcp/discussions)
- 📧 邮箱: support@juyiting.com

## 🔄 更新日志

查看 [CHANGELOG.md](./CHANGELOG.md) 了解版本更新详情。

---

<div align="center">

**[⭐ 如果这个项目对你有帮助，请给我们一个 Star！](https://github.com/juyiting/juyitingmcp)**

Made with ❤️ by [聚义厅技术团队](https://github.com/juyiting)

*基于 Model Context Protocol 构建，享受AI人格协作的无限可能！* 🚀

</div>