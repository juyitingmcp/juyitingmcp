#!/usr/bin/env node

/**
 * 协作引擎演示示例
 * 展示多人格协作分析的完整流程
 */

import { CollaborationEngine } from '../dist/collaboration-engine.js';
import { RemotePersonaRepository } from '../dist/persona-repository.js';
import { CollaborationMode } from '../dist/types.js';

// 演示用的本地人格数据
const demoPersonas = [

  {
    id: 'fan_girl',
    name: '粉丝妹',
    rule: '你是粉丝妹，总是能发现别人的亮点和优势，善于鼓励和支持。你会从积极的角度分析问题，发现机会和潜力。',
    goal: '发现亮点，放大优势，提供正能量',
    version: '1.0',
    description: '积极乐观，善于发现优点和机会',
    category: 'supportive',
    tags: ['积极思维', '优势发现', '鼓励支持'],
    source: 'local'
  },
  {
    id: 'product_strategist',
    name: '小布丁',
    rule: '你是产品策略专家小布丁，专注于商业分析和产品策略。你会从市场、用户、竞争等多个维度分析问题，提供实用的商业建议。',
    goal: '提供专业的商业分析和产品策略建议',
    version: '1.0',
    description: '专业的产品策略分析师，具备丰富的商业经验',
    category: 'business',
    tags: ['产品策略', '商业分析', '市场洞察'],
    source: 'local'
  }
];

async function demonstrateCollaboration() {
  console.log('🚀 协作引擎功能演示\n');

  // 1. 创建人格仓库和协作引擎
  console.log('📚 初始化协作环境...');
  const repository = new RemotePersonaRepository(demoPersonas);
  const collaborationEngine = new CollaborationEngine(repository);
  console.log('✅ 协作引擎已创建');

  // 2. 演示查询列表
  const demoQueries = [
    {
      query: '分析这个SaaS产品的商业模式：一个面向中小企业的项目管理工具，月付费模式，主要竞争对手是Notion和Trello',
      mode: CollaborationMode.PARALLEL,
      description: '商业模式分析 - 并行模式'
    },
    {
      query: '我想创建一个AI写作助手产品，目标用户是内容创作者，请帮我分析可行性和潜在风险',
      mode: CollaborationMode.SEQUENTIAL,
      description: '产品可行性分析 - 顺序模式'
    },
    {
      query: '如何提升团队的工作效率？我们是一个20人的技术团队，最近项目进度总是延期',
      mode: CollaborationMode.INTELLIGENT,
      description: '团队效率优化 - 智能模式'
    }
  ];

  // 3. 逐一演示不同的协作模式
  for (let i = 0; i < demoQueries.length; i++) {
    const demo = demoQueries[i];
    console.log(`\n${'='.repeat(60)}`);
    console.log(`🎯 演示 ${i + 1}/${demoQueries.length}: ${demo.description}`);
    console.log(`${'='.repeat(60)}\n`);

    console.log(`📋 **分析问题**: ${demo.query}\n`);
    console.log(`⚙️ **协作模式**: ${demo.mode}\n`);

    try {
      console.log('🔄 启动协作分析...');
      const startTime = Date.now();

      // 启动协作分析
      const result = await collaborationEngine.startCollaboration(demo.query, {
        mode: demo.mode,
        maxRounds: 2 // 演示用，减少轮次
      });

      const duration = Date.now() - startTime;
      console.log(`✅ 协作分析完成 (${Math.round(duration / 1000)}秒)\n`);

      // 展示结果
      console.log('📊 **协作分析结果**:');
      console.log(`- 会话ID: ${result.sessionId}`);
      console.log(`- 参与人格: ${result.selectedPersonas.join(', ')}`);
      console.log(`- 执行时间: ${Math.round(result.executionTime / 1000)}秒`);
      console.log(`- 分析条目: ${result.analyses.length}个\n`);

      // 展示个人分析摘要
      console.log('🎭 **个人分析摘要**:');
      result.analyses.forEach((analysis, index) => {
        const preview = analysis.analysis.substring(0, 100) + '...';
        console.log(`${index + 1}. ${analysis.personaName}: ${preview}`);
      });

      if (result.synthesis) {
        console.log(`\n💡 **核心洞察**: ${result.synthesis.summary}`);
      }

      if (result.actionPlan) {
        console.log(`\n📋 **行动建议**: ${result.actionPlan.steps.length}个步骤，优先级${result.actionPlan.priority}`);
      }

    } catch (error) {
      console.error(`❌ 协作分析失败: ${error.message}`);
    }

    // 演示间隔
    if (i < demoQueries.length - 1) {
      console.log('\n⏳ 等待3秒后进行下一个演示...');
      await new Promise(resolve => setTimeout(resolve, 3000));
    }
  }

  // 4. 演示指定人格协作
  console.log(`\n${'='.repeat(60)}`);
  console.log('🎯 演示 4/4: 指定人格协作');
  console.log(`${'='.repeat(60)}\n`);

  try {
    console.log('🔄 启动指定人格协作分析...');
    const specifiedResult = await collaborationEngine.startCollaboration(
      '评估我们公司是否应该采用远程办公模式',
      {
        personaIds: ['fan_girl', 'product_strategist'], // 只选择这两个人格
        mode: CollaborationMode.PARALLEL
      }
    );

    console.log('✅ 指定人格协作完成\n');
    console.log('📊 **协作结果**:');
    console.log(`- 指定人格: ${specifiedResult.selectedPersonas.join(', ')}`);
    console.log(`- 分析数量: ${specifiedResult.analyses.length}个`);

  } catch (error) {
    console.error(`❌ 指定人格协作失败: ${error.message}`);
  }

  // 5. 展示会话统计
  console.log(`\n${'='.repeat(60)}`);
  console.log('📈 会话统计信息');
  console.log(`${'='.repeat(60)}\n`);

  const activeSessions = collaborationEngine.getActiveSessions();
  const sessionHistory = collaborationEngine.getSessionHistory();

  console.log(`🔄 **活跃会话**: ${activeSessions.length}个`);
  console.log(`📚 **历史会话**: ${sessionHistory.length}个`);

  if (sessionHistory.length > 0) {
    console.log('\n📋 **最近会话历史**:');
    sessionHistory.slice(0, 3).forEach((session, index) => {
      console.log(`${index + 1}. ${session.id} - ${session.status} (${session.selectedPersonas.join(', ')})`);
    });
  }

  console.log('\n🎉 协作引擎演示完成！');
  console.log('\n📖 **功能特性总结**:');
  console.log('✅ 支持多种协作模式：并行、顺序、智能');
  console.log('✅ 智能人格选择算法');
  console.log('✅ 指定人格协作支持');
  console.log('✅ 结构化分析结果');
  console.log('✅ 会话管理和历史记录');
  console.log('✅ 完整的错误处理机制');

  console.log('\n💡 **使用建议**:');
  console.log('1. 复杂问题使用智能模式，让系统自动选择最佳协作方式');
  console.log('2. 需要快速结果时使用并行模式');
  console.log('3. 需要深度讨论时使用顺序模式');
  console.log('4. 针对特定领域问题可指定相关专业人格');
}

// 错误处理包装
async function main() {
  try {
    await demonstrateCollaboration();
  } catch (error) {
    console.error('❌ 演示过程中发生错误:', error.message);
    console.error('详细错误:', error);
    process.exit(1);
  }
}

// 如果直接运行此文件
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
} 