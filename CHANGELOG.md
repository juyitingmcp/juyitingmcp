# 更新日志

所有重要的项目变更都会记录在此文件中。

此项目遵循 [Semantic Versioning](https://semver.org/lang/zh-CN/) 规范。

---

## 🙏 项目起源

本项目灵感来源于 [大铭老师的 persona-summoner 项目](https://github.com/yinwm/persona-summoner)，感谢他在AI人格探索领域的开创性贡献！聚义厅MCP在此基础上进行了重新设计和功能扩展。

---

## [1.1.0] - 2025-01-22

### 🗑️ 移除
- **重大变更**: 删除了"暴躁老哥"(grumpy_bro)和"自省姐"(reflection_sis)两个英雄角色
- 移除了所有相关的测试数据和示例配置

### 🔄 变更
- 更新了所有文档和示例，使用剩余的6个英雄角色
- 更新了协作演示，使用粉丝妹和小布丁作为示例
- 优化了英雄角色的多样性配置

### 📚 文档
- 更新了README.md中的英雄列表和使用示例
- 更新了MCP工具指南和Cursor集成指南
- 添加了英雄角色删除完成报告

### 🎯 保留的英雄角色
- 粉丝妹 (fan_girl) - 发现亮点，放大优势
- 暖心姐姐 (warm_sister) - 温暖贴心，细致关怀
- 思维帝 (thinking_emperor) - 结构化思维，MECE分析
- 拆解大师 (dismantling_master) - 庖丁解牛式拆解
- 小布丁 (product_strategist) - 商业分析，产品策略
- 代码侠 (code_knight) - 代码审查，架构设计

### ⚠️ 迁移指南
- 原使用暴躁老哥的用户建议改用思维帝（结构化分析）
- 原使用自省姐的用户建议改用小布丁（深度商业分析）

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
- `summon_hero` - 英雄召唤工具
- `list_hero_configs` - 配置列表查询
- `download_hero_config` - 配置下载工具
- `start_collaboration` - 协作分析工具

### 核心功能
- 英雄仓库管理 (RemoteHeroRepository)
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