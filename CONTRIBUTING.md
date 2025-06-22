# 贡献指南

感谢你对聚义厅MCP客户端项目的关注！我们欢迎各种形式的贡献，包括但不限于代码、文档、问题报告、功能建议等。

## 🤝 如何贡献

### 报告问题

如果你发现了bug或有改进建议，请：

1. 查看 [现有Issues](https://github.com/juyiting/juyitingmcp/issues) 确认问题未被报告
2. 使用合适的 Issue 模板创建新的问题报告
3. 提供详细的重现步骤和环境信息
4. 如果可能，请提供错误日志或截图

### 提交代码

1. **Fork 项目**
   ```bash
   # 在GitHub上Fork项目，然后克隆到本地
   git clone https://github.com/YOUR_USERNAME/juyitingmcp.git
   cd juyitingmcp
   ```

2. **设置开发环境**
   ```bash
   # 安装依赖
   npm install
   
   # 运行测试确保环境正常
   npm test
   ```

3. **创建功能分支**
   ```bash
   # 从main分支创建新分支
   git checkout -b feature/your-feature-name
   # 或者修复bug
   git checkout -b fix/your-bug-fix
   ```

4. **开发和测试**
   ```bash
   # 开发模式运行
   npm run dev
   
   # 运行测试
   npm test
   
   # 类型检查
   npm run type-check
   
   # 代码检查
   npm run lint
   ```

5. **提交更改**
   ```bash
   # 添加更改
   git add .
   
   # 提交（使用规范的提交信息）
   git commit -m "feat: add new persona collaboration feature"
   ```

6. **推送和创建PR**
   ```bash
   # 推送到你的Fork
   git push origin feature/your-feature-name
   
   # 在GitHub上创建Pull Request
   ```

## 📝 代码规范

### 提交信息规范

我们使用 [Conventional Commits](https://www.conventionalcommits.org/) 规范：

- `feat`: 新功能
- `fix`: 修复bug
- `docs`: 文档更新
- `style`: 代码格式修改
- `refactor`: 代码重构
- `test`: 测试相关
- `chore`: 构建过程或辅助工具的变动

示例：
```
feat(collaboration): add intelligent collaboration mode
fix(config): resolve config sync timeout issue
docs: update API documentation
test: add unit tests for persona repository
```

### 代码风格

- 使用 TypeScript 进行开发
- 遵循项目的 ESLint 配置
- 使用 Prettier 进行代码格式化
- 编写清晰的注释和文档字符串

```typescript
// 好的示例
/**
 * 启动多人格协作分析
 * @param query 分析问题
 * @param personaIds 可选的人格ID列表
 * @returns 协作分析结果
 */
async function startCollaboration(
  query: string,
  personaIds?: string[]
): Promise<CollaborationResult> {
  // 实现逻辑
}
```

### 测试要求

- 新功能必须包含单元测试
- 保持测试覆盖率在80%以上
- 测试文件命名规范：`*.test.ts`
- 使用描述性的测试用例名称

```typescript
describe('PersonaRepository', () => {
  test('should load personas from multiple sources', async () => {
    // 测试逻辑
  });
  
  test('should handle network errors gracefully', async () => {
    // 测试逻辑
  });
});
```

## 🏗️ 项目结构

```
src/
├── server.ts               # MCP服务器主入口
├── types.ts                # 核心类型定义
├── constants.ts            # 常量配置
├── persona-repository.ts   # 人格仓库管理
├── persona-sources.ts      # 人格数据源配置
├── collaboration-engine.ts # 协作引擎核心
├── config-synchronizer.ts  # 配置同步器
├── telemetry.ts           # 遥测数据收集
└── utils/                 # 工具函数
    ├── cache.ts           # 缓存管理
    ├── network.ts         # 网络请求
    └── validation.ts      # 参数验证

tests/
├── fixtures/              # 测试数据
├── unit/                  # 单元测试
└── integration/           # 集成测试

docs/                      # 项目文档
scripts/                   # 构建和部署脚本
examples/                  # 示例配置文件
```

## 🚀 开发流程

### 开发新功能

1. **需求分析**: 在Issue中讨论功能需求
2. **设计方案**: 如果是大型功能，先创建设计文档
3. **编写代码**: 按照代码规范实现功能
4. **编写测试**: 确保功能正常工作
5. **文档更新**: 更新相关文档
6. **代码审查**: 提交PR等待审查

### 修复Bug

1. **重现问题**: 确保能够稳定重现bug
2. **编写测试**: 先编写失败的测试用例
3. **修复代码**: 让测试通过
4. **回归测试**: 确保没有引入新问题

### 更新文档

- API文档更新需要同步更新代码注释
- 用户指南需要包含实际的使用示例
- 开发文档需要保持与代码同步

## 🔍 代码审查

### 审查清单

- [ ] 代码符合项目风格指南
- [ ] 包含适当的测试用例
- [ ] 文档已更新
- [ ] 提交信息格式正确
- [ ] 没有引入不必要的依赖
- [ ] 性能影响已考虑
- [ ] 安全性已考虑

### 反馈处理

- 积极响应审查反馈
- 讨论技术方案的合理性
- 及时修复审查中发现的问题

## 🎯 贡献机会

### 适合新手的任务

- 文档改进和翻译
- 添加测试用例
- 修复小型bug
- 改进错误信息

### 高级任务

- 新功能开发
- 性能优化
- 架构改进
- 安全性增强

### 特殊贡献

- 人格定义和规则优化
- 协作算法改进
- 用户体验提升
- 多语言支持

## 📞 联系方式

- GitHub Issues: [项目Issues](https://github.com/juyiting/juyitingmcp/issues)
- GitHub Discussions: [项目讨论](https://github.com/juyiting/juyitingmcp/discussions)
- 邮箱: support@juyiting.com

## 🏆 贡献者

感谢所有为项目做出贡献的开发者！

<!-- 这里会自动显示贡献者列表 -->

## 📄 许可证

通过贡献代码，你同意你的贡献将在 [MIT许可证](./LICENSE) 下发布。

---

再次感谢你的贡献！每一个贡献都让聚义厅MCP客户端变得更好。 🎉 