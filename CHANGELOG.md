# 更新日志

所有重要的项目变更都会记录在此文件中。

此项目遵循 [Semantic Versioning](https://semver.org/lang/zh-CN/) 规范。

## [未发布]

### 新增
- 完整的README文档
- MIT许可证文件
- 发布脚本

### 修改
- 优化项目文档结构

## [1.0.0] - 2025-01-15

### 新增
- 🎭 多人格协作系统
- ⚙️ 配置同步机制
- 🤝 智能协作引擎
- 🔧 完整的MCP工具集
- 📊 遥测数据收集
- 🌐 多源人格数据支持
- 🧪 完整的测试框架
- 📚 详细的开发文档

### MCP工具
- `summon_persona` - 人格召唤工具
- `list_persona_configs` - 配置列表查询
- `download_persona_config` - 配置下载工具
- `start_collaboration` - 协作分析工具

### 核心功能
- 人格仓库管理 (RemotePersonaRepository)
- 协作引擎 (CollaborationEngine)
- 配置同步器 (ConfigSynchronizer)
- 参数验证系统 (Validation)
- 缓存管理 (CacheManager)
- 网络请求工具 (NetworkUtils)

### 技术栈
- Node.js 18+
- TypeScript 5.8+
- @modelcontextprotocol/sdk 1.12.3+
- Commander.js 12.1+
- Zod 3.25+
- Jest 29.0+ (测试)
- PostHog 5.1+ (遥测)

### 文档
- 完整的API文档
- 开发指南
- 架构设计文档
- Cursor集成指南
- MCP工具使用指南

---

## 版本说明

### 版本格式
我们使用 `主版本号.次版本号.修订号` 的格式：

- **主版本号**: 不兼容的API修改
- **次版本号**: 向下兼容的功能性新增
- **修订号**: 向下兼容的问题修正

### 变更类型
- `新增` - 新功能
- `修改` - 对现有功能的变更
- `弃用` - 即将移除的功能
- `移除` - 已移除的功能
- `修复` - 问题修复
- `安全` - 安全相关修复 