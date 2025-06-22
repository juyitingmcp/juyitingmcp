#!/usr/bin/env node

/**
 * 聚义厅MCP客户端完整工具演示
 * 
 * 本演示展示了所有7个MCP工具的使用方法：
 * 1. list_personas - 查看人格列表
 * 2. search_personas - 搜索人格
 * 3. summon_persona - 召唤人格
 * 4. list_persona_configs - 查看配置列表
 * 5. download_persona_config - 下载配置
 * 6. start_collaboration - 启动协作分析
 * 7. get_tool_stats - 查看工具统计
 */

import { PersonaSummonerServer } from '../dist/server.js';

// 创建演示用的本地人格
const demoPersonas = [
  {
    id: 'demo-analyst',
    name: '演示分析师',
    rule: '你是一个专业的数据分析师，善于从多角度分析问题，提供客观、准确的分析结果。',
    goal: '为用户提供专业的数据分析和洞察',
    version: '1.0',
    description: '专门用于演示的分析师人格',
    category: '分析',
    tags: ['分析', '数据', '洞察'],
    source: 'local'
  },
  {
    id: 'demo-creative',
    name: '演示创意师',
    rule: '你是一个富有创意的思考者，善于跳出传统思维框架，提供新颖独特的解决方案。',
    goal: '激发创新思维，提供创意解决方案',
    version: '1.0',
    description: '专门用于演示的创意师人格',
    category: '创意',
    tags: ['创意', '创新', '头脑风暴'],
    source: 'local'
  }
];

/**
 * 模拟MCP工具调用
 */
async function simulateToolCall(server, toolName, args = {}) {
  console.log(`\n🔧 调用工具: ${toolName}`);
  console.log(`📝 参数:`, JSON.stringify(args, null, 2));
  
  try {
    // 模拟MCP CallTool请求
    const request = {
      jsonrpc: '2.0',
      id: Date.now(),
      method: 'tools/call',
      params: {
        name: toolName,
        arguments: args
      }
    };

    // 直接调用服务器的工具处理方法
    const response = await server.handleCallTool(request);
    
    console.log(`✅ 调用成功:`);
    console.log(response.content[0].text);
    
    return response;
  } catch (error) {
    console.log(`❌ 调用失败:`, error.message);
    return null;
  }
}

/**
 * 演示所有工具功能
 */
async function demonstrateAllTools() {
  console.log('🎭 聚义厅MCP客户端工具演示');
  console.log('='.repeat(50));
  
  // 创建服务器实例
  const server = new PersonaSummonerServer(demoPersonas);
  
  // 为演示添加handleCallTool方法
  server.handleCallTool = async function(request) {
    const { name, arguments: args } = request.params;
    
    switch (name) {
      case 'list_personas':
        return await this.handleListPersonas(args);
      case 'search_personas':
        return await this.handleSearchPersonas(args);
      case 'summon_persona':
        return await this.handleSummonPersona(args);
      case 'list_persona_configs':
        return await this.handleListPersonaConfigs(args);
      case 'download_persona_config':
        return await this.handleDownloadPersonaConfig(args);
      case 'start_collaboration':
        return await this.handleStartCollaboration(args);
      case 'get_tool_stats':
        return await this.handleGetToolStats(args);
      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  }.bind(server);

  console.log('\n📋 演示场景1: 人格管理工具');
  console.log('-'.repeat(30));

  // 1. 查看所有人格
  await simulateToolCall(server, 'list_personas');
  
  // 2. 按来源筛选人格
  await simulateToolCall(server, 'list_personas', { source: 'local' });
  
  // 3. 搜索人格
  await simulateToolCall(server, 'search_personas', { query: '分析' });
  
  // 4. 召唤特定人格
  await simulateToolCall(server, 'summon_persona', { persona_name: '演示分析师' });

  console.log('\n⚙️ 演示场景2: 配置管理工具');
  console.log('-'.repeat(30));

  // 5. 查看配置列表（会失败，因为没有配置userKey）
  await simulateToolCall(server, 'list_persona_configs');
  
  // 6. 尝试下载配置（会失败）
  await simulateToolCall(server, 'download_persona_config', { configId: 'demo-config' });

  console.log('\n🤝 演示场景3: 协作分析工具');
  console.log('-'.repeat(30));

  // 7. 启动协作分析
  await simulateToolCall(server, 'start_collaboration', {
    query: '如何提高团队的创新能力？',
    personaIds: ['demo-analyst', 'demo-creative'],
    mode: 'parallel'
  });

  console.log('\n📊 演示场景4: 统计监控工具');
  console.log('-'.repeat(30));

  // 8. 查看工具使用统计
  await simulateToolCall(server, 'get_tool_stats');
  
  // 9. 查看特定工具统计
  await simulateToolCall(server, 'get_tool_stats', { toolName: 'start_collaboration' });

  console.log('\n🎯 演示场景5: 参数验证测试');
  console.log('-'.repeat(30));

  // 10. 测试参数验证（无效参数）
  await simulateToolCall(server, 'search_personas', { query: '' }); // 太短
  await simulateToolCall(server, 'search_personas', { query: 'a'.repeat(3000) }); // 太长
  await simulateToolCall(server, 'summon_persona', {}); // 缺少必需参数

  console.log('\n🏁 演示完成');
  console.log('='.repeat(50));
  console.log('✨ 所有工具演示已完成！');
  console.log('\n📖 工具使用说明:');
  console.log('• list_personas: 查看所有可用人格，支持按分类和来源筛选');
  console.log('• search_personas: 智能搜索人格，支持多字段匹配和评分排序');
  console.log('• summon_persona: 召唤指定人格，查看详细信息');
  console.log('• list_persona_configs: 查看远程配置列表（需要userKey）');
  console.log('• download_persona_config: 下载并激活远程配置');
  console.log('• start_collaboration: 启动多人格协作分析');
  console.log('• get_tool_stats: 查看工具使用统计和性能监控');
  
  console.log('\n🔗 集成方式:');
  console.log('1. 在Cursor中配置MCP服务器');
  console.log('2. 使用自然语言调用这些工具');
  console.log('3. 享受AI人格协作的强大功能！');
}

/**
 * 错误处理演示
 */
async function demonstrateErrorHandling() {
  console.log('\n🚨 错误处理演示');
  console.log('-'.repeat(30));
  
  const server = new PersonaSummonerServer();
  
  // 添加handleCallTool方法
  server.handleCallTool = async function(request) {
    const { name, arguments: args } = request.params;
    
    switch (name) {
      case 'search_personas':
        return await this.handleSearchPersonas(args);
      case 'summon_persona':
        return await this.handleSummonPersona(args);
      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  }.bind(server);

  // 测试各种错误情况
  const errorCases = [
    {
      name: '空查询字符串',
      tool: 'search_personas',
      args: { query: '' }
    },
    {
      name: '查询字符串过长',
      tool: 'search_personas', 
      args: { query: 'x'.repeat(3000) }
    },
    {
      name: '缺少必需参数',
      tool: 'summon_persona',
      args: {}
    },
    {
      name: '不存在的人格',
      tool: 'summon_persona',
      args: { persona_name: '不存在的人格' }
    }
  ];

  for (const testCase of errorCases) {
    console.log(`\n🧪 测试: ${testCase.name}`);
    await simulateToolCall(server, testCase.tool, testCase.args);
  }
}

/**
 * 性能测试演示
 */
async function demonstratePerformance() {
  console.log('\n⚡ 性能测试演示');
  console.log('-'.repeat(30));
  
  const server = new PersonaSummonerServer(demoPersonas);
  
  server.handleCallTool = async function(request) {
    const { name, arguments: args } = request.params;
    
    switch (name) {
      case 'list_personas':
        return await this.handleListPersonas(args);
      case 'search_personas':
        return await this.handleSearchPersonas(args);
      case 'get_tool_stats':
        return await this.handleGetToolStats(args);
      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  }.bind(server);

  // 连续调用多次，测试性能
  console.log('📊 进行10次连续调用测试...');
  
  const startTime = Date.now();
  
  for (let i = 0; i < 10; i++) {
    await simulateToolCall(server, 'list_personas');
    await simulateToolCall(server, 'search_personas', { query: '分析' });
  }
  
  const endTime = Date.now();
  const totalTime = endTime - startTime;
  
  console.log(`\n⏱️ 性能测试结果:`);
  console.log(`• 总耗时: ${totalTime}ms`);
  console.log(`• 平均每次调用: ${(totalTime / 20).toFixed(2)}ms`);
  console.log(`• 每秒处理能力: ${(20000 / totalTime).toFixed(2)} 次/秒`);
  
  // 显示统计信息
  await simulateToolCall(server, 'get_tool_stats');
}

// 主函数
async function main() {
  try {
    await demonstrateAllTools();
    await demonstrateErrorHandling();
    await demonstratePerformance();
  } catch (error) {
    console.error('演示过程中发生错误:', error);
    process.exit(1);
  }
}

// 检查是否直接运行
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export { demonstrateAllTools, demonstrateErrorHandling, demonstratePerformance }; 