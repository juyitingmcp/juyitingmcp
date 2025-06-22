#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { Command } from 'commander';
import { readFileSync } from 'fs';
import { Persona, MCPResponse, PersonaConfig, CollaborationConfig } from './types.js';
import { RemotePersonaRepository } from './persona-repository.js';
import { ConfigSynchronizer } from './config-synchronizer.js';
import { CollaborationEngine } from './collaboration-engine.js';
// import { telemetry } from './telemetry.js';
import {
  validateArgs,
  createErrorResponse,
  globalToolStats,
  withToolStats,
  sanitizeArgs,
  SummonPersonaArgsSchema,
  DownloadPersonaConfigArgsSchema,
  StartCollaborationArgsSchema,
  PersonaNameSchema,
  QuerySchema
} from './utils/validation.js';

// 临时遥测对象（待实现）
const telemetry = {
  trackEvent: (event: string, data?: any) => {
    console.error(`[TELEMETRY] ${event}:`, data);
  },
  disable: () => {
    console.error('[TELEMETRY] Disabled');
  }
};

export class PersonaSummonerServer {
  private server: Server;
  private repository: RemotePersonaRepository;
  private configSync: ConfigSynchronizer;
  private collaborationEngine: CollaborationEngine;

  constructor(localPersonas: Persona[] = []) {
    this.repository = new RemotePersonaRepository(localPersonas);
    this.configSync = new ConfigSynchronizer();
    this.collaborationEngine = new CollaborationEngine(this.repository);
    this.server = new Server({
      name: 'juyiting-mcp',
      version: '1.0.0',
    }, {
      capabilities: {
        tools: {},
      },
    });

    this.setupHandlers();
    
    // 记录服务器启动
    telemetry.trackEvent('server_started', {
      local_personas_count: localPersonas.length,
    });
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
                  description: '人格名称或ID（如：暴躁老哥、自省姐、粉丝妹）'
                }
              },
              required: ['persona_name']
            }
          },
          {
            name: 'list_personas',
            description: '查看所有可用的人格列表',
            inputSchema: {
              type: 'object',
              properties: {
                category: {
                  type: 'string',
                  description: '可选：按分类筛选人格'
                },
                source: {
                  type: 'string',
                  enum: ['local', 'remote', 'default'],
                  description: '可选：按数据源筛选人格'
                }
              }
            }
          },
          {
            name: 'search_personas',
            description: '搜索匹配的人格',
            inputSchema: {
              type: 'object',
              properties: {
                query: {
                  type: 'string',
                  description: '搜索关键词（匹配人格名称、描述、标签等）'
                }
              },
              required: ['query']
            }
          },
          {
            name: 'list_persona_configs',
            description: '查看可用的人格配置列表',
            inputSchema: {
              type: 'object',
              properties: {}
            }
          },
          {
            name: 'download_persona_config',
            description: '下载指定的人格配置',
            inputSchema: {
              type: 'object',
              properties: {
                configId: {
                  type: 'string',
                  description: '配置ID'
                }
              },
              required: ['configId']
            }
          },
          {
            name: 'sync_status',
            description: '查看配置同步状态',
            inputSchema: {
              type: 'object',
              properties: {}
            }
          },
          {
            name: 'start_collaboration',
            description: '启动人格团队协作分析',
            inputSchema: {
              type: 'object',
              properties: {
                query: {
                  type: 'string',
                  description: '需要分析的问题'
                },
                personaIds: {
                  type: 'array',
                  items: { type: 'string' },
                  description: '可选：指定参与协作的人格ID列表'
                },
                mode: {
                  type: 'string',
                  enum: ['parallel', 'sequential', 'intelligent'],
                  description: '可选：协作模式（默认：intelligent）'
                }
              },
              required: ['query']
            }
          },
          {
            name: 'get_tool_stats',
            description: '查看工具使用统计信息',
            inputSchema: {
              type: 'object',
              properties: {
                toolName: {
                  type: 'string',
                  description: '可选：指定工具名称查看详细统计'
                }
              }
            }
          }
        ]
      };
    });

    // 处理工具调用
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;
      const sanitizedArgs = sanitizeArgs(args);

      try {
        switch (name) {
          case 'summon_persona':
            return await withToolStats('summon_persona', this.handleSummonPersona.bind(this))(sanitizedArgs);
          case 'list_personas':
            return await withToolStats('list_personas', this.handleListPersonas.bind(this))(sanitizedArgs);
          case 'search_personas':
            return await withToolStats('search_personas', this.handleSearchPersonas.bind(this))(sanitizedArgs);
          case 'list_persona_configs':
            return await withToolStats('list_persona_configs', this.handleListPersonaConfigs.bind(this))(sanitizedArgs);
          case 'download_persona_config':
            return await withToolStats('download_persona_config', this.handleDownloadPersonaConfig.bind(this))(sanitizedArgs);
          case 'sync_status':
            return await this.handleSyncStatus(sanitizedArgs);
          case 'start_collaboration':
            return await withToolStats('start_collaboration', this.handleStartCollaboration.bind(this))(sanitizedArgs);
          case 'get_tool_stats':
            return await withToolStats('get_tool_stats', this.handleGetToolStats.bind(this))(sanitizedArgs);
          default:
            throw new Error(`Unknown tool: ${name}`);
        }
      } catch (error) {
        console.error(`Tool ${name} error:`, error);
        return createErrorResponse(`工具执行失败: ${error instanceof Error ? error.message : String(error)}`);
      }
    });
  }

  private async handleSummonPersona(args: any) {
    try {
      const personas = await this.repository.getAllPersonas();
      const persona = personas.find(p => 
        p.name === args.persona_name || p.id === args.persona_name
      );
      
      if (!persona) {
        return {
          content: [{
            type: 'text',
            text: `❌ 找不到人格：${args.persona_name}\n\n📋 **可用人格**：\n${
              personas.map(p => `- **${p.name}** (${p.id}) - ${p.description || p.goal}`).join('\n')
            }\n\n💡 请使用准确的人格名称或ID进行召唤`
          }]
        };
      }

      const personaDetails = [
        `🎭 **${persona.name}** (${persona.id}) 已召唤！`,
        `**🎯 目标**: ${persona.goal}`,
        persona.description ? `**📝 描述**: ${persona.description}` : '',
        persona.category ? `**🏷️ 分类**: ${persona.category}` : '',
        persona.tags ? `**🔖 标签**: ${persona.tags.join(', ')}` : '',
        `**📊 来源**: ${persona.source || 'unknown'}`,
        `\n**📜 人格规则**:\n${persona.rule}`
      ].filter(Boolean).join('\n');

      return {
        content: [{
          type: 'text',
          text: personaDetails
        }]
      };
    } catch (error) {
      return {
        content: [{
          type: 'text',
          text: `❌ 召唤人格失败: ${error instanceof Error ? error.message : String(error)}`
        }]
      };
    }
  }

  private async handleListPersonas(args: any) {
    try {
      const personas = await this.repository.getAllPersonas();
      
      // 应用筛选条件
      let filteredPersonas = personas;
      
      if (args.category) {
        filteredPersonas = filteredPersonas.filter(p => 
          p.category?.toLowerCase().includes(args.category.toLowerCase())
        );
      }
      
      if (args.source) {
        filteredPersonas = filteredPersonas.filter(p => p.source === args.source);
      }

      if (filteredPersonas.length === 0) {
        return {
          content: [{
            type: 'text',
            text: '🔍 **未找到匹配的人格**\n\n' +
                  `筛选条件：${args.category ? `分类="${args.category}" ` : ''}${args.source ? `来源="${args.source}"` : ''}\n\n` +
                  '请尝试调整筛选条件或使用 search_personas 工具进行关键词搜索。'
          }]
        };
      }

      // 按来源分组
      const groupedPersonas = filteredPersonas.reduce((groups, persona) => {
        const source = persona.source || 'unknown';
        if (!groups[source]) groups[source] = [];
        groups[source].push(persona);
        return groups;
      }, {} as Record<string, Persona[]>);

      let output = `🎭 **可用人格列表** (共${filteredPersonas.length}个)\n\n`;

      // 按来源展示
      const sourceNames: Record<string, string> = {
        'local': '📁 本地人格',
        'remote': '🌐 远程人格', 
        'default': '⭐ 默认人格',
        'unknown': '❓ 未知来源'
      };

      for (const [source, personas] of Object.entries(groupedPersonas)) {
        output += `### ${sourceNames[source] || source} (${personas.length}个)\n\n`;
        
        personas.forEach((persona, index) => {
          output += `${index + 1}. **${persona.name}** (${persona.id})\n`;
          output += `   🎯 ${persona.goal}\n`;
          if (persona.description) {
            output += `   📝 ${persona.description}\n`;
          }
          if (persona.category) {
            output += `   🏷️ 分类：${persona.category}\n`;
          }
          if (persona.tags && persona.tags.length > 0) {
            output += `   🔖 标签：${persona.tags.join(', ')}\n`;
          }
          output += '\n';
        });
      }

      output += '\n💡 **使用方法**:\n';
      output += '• 使用 `summon_persona` 召唤特定人格\n';
      output += '• 使用 `start_collaboration` 启动团队协作\n';
      output += '• 使用 `search_personas` 搜索特定人格';

      return {
        content: [{
          type: 'text',
          text: output
        }]
      };
    } catch (error) {
      return createErrorResponse('获取人格列表失败', [error instanceof Error ? error.message : String(error)]);
    }
  }

  private async handleSearchPersonas(args: any) {
    const validation = validateArgs(QuerySchema, args.query);
    if (!validation.success) {
      return createErrorResponse(validation.error!, validation.details);
    }

    try {
      const personas = await this.repository.getAllPersonas();
      const query = validation.data!.toLowerCase();
      
      // 搜索匹配的人格
      const matches = personas.map(persona => {
        let score = 0;
        let matchedFields: string[] = [];

        // 名称匹配（权重最高）
        if (persona.name.toLowerCase().includes(query)) {
          score += 10;
          matchedFields.push('名称');
        }

        // ID匹配
        if (persona.id.toLowerCase().includes(query)) {
          score += 8;
          matchedFields.push('ID');
        }

        // 目标匹配
        if (persona.goal.toLowerCase().includes(query)) {
          score += 6;
          matchedFields.push('目标');
        }

        // 描述匹配
        if (persona.description?.toLowerCase().includes(query)) {
          score += 4;
          matchedFields.push('描述');
        }

        // 分类匹配
        if (persona.category?.toLowerCase().includes(query)) {
          score += 3;
          matchedFields.push('分类');
        }

        // 标签匹配
        if (persona.tags?.some(tag => tag.toLowerCase().includes(query))) {
          score += 2;
          matchedFields.push('标签');
        }

        // 规则匹配（权重较低）
        if (persona.rule.toLowerCase().includes(query)) {
          score += 1;
          matchedFields.push('规则');
        }

        return { persona, score, matchedFields };
      }).filter(match => match.score > 0)
        .sort((a, b) => b.score - a.score);

      if (matches.length === 0) {
        return {
          content: [{
            type: 'text',
            text: `🔍 **搜索结果**\n\n` +
                  `未找到包含"${args.query}"的人格。\n\n` +
                  `**搜索建议**:\n` +
                  `• 尝试使用更通用的关键词\n` +
                  `• 使用 list_personas 查看所有可用人格\n` +
                  `• 检查拼写是否正确`
          }]
        };
      }

      let output = `🔍 **搜索结果** (关键词: "${args.query}")\n\n`;
      output += `找到 ${matches.length} 个匹配的人格：\n\n`;

      matches.slice(0, 10).forEach((match, index) => {
        const { persona, score, matchedFields } = match;
        output += `${index + 1}. **${persona.name}** (${persona.id}) [匹配度: ${score}]\n`;
        output += `   🎯 ${persona.goal}\n`;
        output += `   📍 匹配字段：${matchedFields.join('、')}\n`;
        if (persona.source) {
          output += `   📂 来源：${persona.source}\n`;
        }
        output += '\n';
      });

      if (matches.length > 10) {
        output += `\n... 还有 ${matches.length - 10} 个匹配结果`;
      }

      output += '\n\n💡 **下一步操作**:\n';
      output += '• 使用 `summon_persona` 召唤感兴趣的人格\n';
      output += '• 使用 `start_collaboration` 让多个人格协作分析';

      return {
        content: [{
          type: 'text',
          text: output
        }]
      };
    } catch (error) {
      return createErrorResponse('搜索人格失败', [error instanceof Error ? error.message : String(error)]);
    }
  }

  private async handleListPersonaConfigs(args: any) {
    try {
      const configs = await this.configSync.listRemoteConfigs();
      
      if (configs.length === 0) {
        return {
          content: [{
            type: 'text',
            text: '📋 **暂无可用配置**\n\n' +
                  '请前往聚义厅Web平台创建人格配置，或检查以下设置：\n' +
                  '1. 确保已设置正确的userKey\n' +
                  '2. 检查网络连接是否正常\n' +
                  '3. 确认聚义厅服务可用\n\n' +
                  '💡 使用 sync_status 工具查看当前配置状态'
          }]
        };
      }

      const configList = configs.map((config, index) => 
        `${index + 1}. **${config.name}** (${config.id})\n` +
        `   📝 ${config.description || '无描述'}\n` +
        `   🎭 人格：${config.personas.join(', ')}\n` +
        `   📅 创建时间：${new Date(config.createdAt).toLocaleDateString()}\n` +
        `   🔄 版本：${config.version}`
      ).join('\n\n');

      return {
        content: [{
          type: 'text',
          text: `📋 **可用人格配置 (${configs.length}个)**：\n\n${configList}\n\n` +
                `💡 使用 download_persona_config 工具下载指定配置`
        }]
      };
    } catch (error) {
      return {
        content: [{
          type: 'text',
          text: `❌ 获取配置列表失败：${error instanceof Error ? error.message : String(error)}\n\n` +
                `请检查：\n1. userKey是否正确设置\n2. 网络连接是否正常\n3. 聚义厅服务是否可用`
        }]
      };
    }
  }

  private async handleDownloadPersonaConfig(args: any) {
    try {
      const config = await this.configSync.syncFromRemote(args.configId);
      
      // 更新本地人格仓库
      await this.repository.updateFromConfig(config);
      
      const personaNames = config.personas.map(p => p.name).join(', ');
      
      return {
        content: [{
          type: 'text',
          text: `✅ **配置下载成功**\n\n` +
                `📦 **${config.name}** (${config.id})\n` +
                `🎭 **激活人格**: ${personaNames}\n` +
                `📅 **版本**: ${config.version}\n` +
                `📊 **人格数量**: ${config.personas.length} 个\n\n` +
                `现在可以使用 summon_persona 召唤配置中的人格`
        }]
      };
    } catch (error) {
      return {
        content: [{
          type: 'text',
          text: `❌ 配置下载失败：${error instanceof Error ? error.message : String(error)}\n\n` +
                `可能原因：\n1. 配置ID不存在\n2. 无权限访问该配置\n3. 网络连接问题\n4. userKey未设置或无效`
        }]
      };
    }
  }

  private async handleSyncStatus(args: any) {
    try {
      const status = this.configSync.getSyncStatus();
      const currentConfig = this.configSync.getCurrentConfig();
      
      const statusText = [
        `⚙️ **配置同步状态**\n`,
        `🔑 **认证状态**: ${status.isConfigured ? '✅ 已配置' : '❌ 未配置userKey'}`,
        `📦 **当前配置**: ${status.hasCurrentConfig ? '✅ 已激活' : '❌ 无活跃配置'}`,
        `🔄 **自动同步**: ${status.autoSyncEnabled ? '✅ 已启用' : '❌ 已禁用'}`,
        `🌐 **API地址**: ${status.apiBaseUrl}`,
        status.lastSyncTime ? `📅 **最后同步**: ${new Date(status.lastSyncTime).toLocaleString()}` : '',
        status.syncInProgress ? `⏳ **同步状态**: 正在进行中` : ''
      ].filter(Boolean).join('\n');

      let configDetails = '';
      if (currentConfig) {
        configDetails = `\n\n📋 **当前活跃配置**:\n` +
          `- **名称**: ${currentConfig.name}\n` +
          `- **ID**: ${currentConfig.id}\n` +
          `- **版本**: ${currentConfig.version}\n` +
          `- **人格数量**: ${currentConfig.personas.length} 个\n` +
          `- **人格列表**: ${currentConfig.personas.map(p => p.name).join(', ')}`;
      }

      return {
        content: [{
          type: 'text',
          text: statusText + configDetails + '\n\n💡 使用 list_persona_configs 查看可用配置'
        }]
      };
    } catch (error) {
      return {
        content: [{
          type: 'text',
          text: `❌ 获取同步状态失败：${error instanceof Error ? error.message : String(error)}`
        }]
      };
    }
  }

  private async handleStartCollaboration(args: any) {
    try {
      const { query, personaIds, mode } = args;
      
      if (!query || typeof query !== 'string') {
        return {
          content: [{
            type: 'text',
            text: '❌ 请提供有效的分析问题'
          }]
        };
      }

      console.log(`🚀 启动协作分析: ${query.substring(0, 50)}...`);

      // 构建协作配置
      const config: Partial<CollaborationConfig> = {};
      if (personaIds && Array.isArray(personaIds)) {
        config.personaIds = personaIds;
      }
      if (mode && ['parallel', 'sequential', 'intelligent'].includes(mode)) {
        config.mode = mode as any;
      }

      // 启动协作分析
      const result = await this.collaborationEngine.startCollaboration(query, config);

      // 格式化输出结果
      const output = this.formatCollaborationResult(result);
      
      console.log(`✅ 协作分析完成: ${result.sessionId}`);

      return {
        content: [{
          type: 'text',
          text: output
        }]
      };
    } catch (error) {
      console.error('协作分析失败:', error);
      return {
        content: [{
          type: 'text',
          text: `❌ 协作分析失败：${error instanceof Error ? error.message : String(error)}\n\n` +
                `可能原因：\n1. 人格库加载失败\n2. 指定的人格ID不存在\n3. 网络或系统错误`
        }]
      };
    }
  }

  private formatCollaborationResult(result: any): string {
    const { query, selectedPersonas, mode, analyses, executionTime } = result;
    
    let output = `🤝 **协作分析报告**\n\n`;
    output += `📋 **分析问题**: ${query}\n`;
    output += `👥 **参与人格**: ${selectedPersonas.join(', ')}\n`;
    output += `⚙️ **协作模式**: ${mode}\n`;
    output += `⏱️ **执行时间**: ${Math.round(executionTime / 1000)}秒\n\n`;

    // 个人分析部分
    output += `## 个人分析\n\n`;
    analyses.forEach((analysis: any) => {
      output += `### 🎭 ${analysis.personaName}分析\n`;
      output += `${analysis.analysis}\n\n`;
    });

    // 协作总结
    if (result.synthesis) {
      output += `## 协作总结\n\n`;
      output += `**核心洞察**: ${result.synthesis.summary}\n\n`;
      
      if (result.synthesis.keyInsights && result.synthesis.keyInsights.length > 0) {
        output += `**关键发现**:\n`;
        result.synthesis.keyInsights.forEach((insight: string, index: number) => {
          output += `${index + 1}. ${insight}\n`;
        });
        output += '\n';
      }
    }

    // 行动建议
    if (result.actionPlan) {
      output += `## 行动建议\n\n`;
      output += `**优先级**: ${result.actionPlan.priority}\n`;
      output += `**预计时间**: ${result.actionPlan.timeline}\n\n`;
      
      if (result.actionPlan.steps && result.actionPlan.steps.length > 0) {
        output += `**具体步骤**:\n`;
        result.actionPlan.steps.forEach((step: any, index: number) => {
          output += `${index + 1}. ${step.description} (${step.estimatedTime})\n`;
        });
      }
    }

    return output;
  }

  private async handleGetToolStats(args: any) {
    try {
      const stats = globalToolStats.getStats(args.toolName);
      const summary = globalToolStats.getSummary();

      if (args.toolName && stats.length === 0) {
        return {
          content: [{
            type: 'text',
            text: `📊 **工具统计**\n\n工具 "${args.toolName}" 暂无使用记录。`
          }]
        };
      }

      let output = '📊 **工具使用统计**\n\n';

      // 总体统计
      output += '### 📈 总体统计\n';
      output += `• 总调用次数：${summary.totalCalls}\n`;
      output += `• 成功次数：${summary.totalSuccess}\n`;
      output += `• 失败次数：${summary.totalErrors}\n`;
      output += `• 成功率：${(summary.successRate * 100).toFixed(1)}%\n`;
      if (summary.mostUsedTool) {
        output += `• 最常用工具：${summary.mostUsedTool}\n`;
      }
      output += '\n';

      // 详细统计
      if (stats.length > 0) {
        output += args.toolName ? `### 🔧 ${args.toolName} 详细统计\n` : '### 🔧 各工具详细统计\n';
        
        stats.forEach(stat => {
          output += `**${stat.toolName}**\n`;
          output += `• 调用次数：${stat.callCount}\n`;
          output += `• 成功次数：${stat.successCount}\n`;
          output += `• 失败次数：${stat.errorCount}\n`;
          output += `• 成功率：${((stat.successCount / stat.callCount) * 100).toFixed(1)}%\n`;
          output += `• 平均执行时间：${stat.avgExecutionTime.toFixed(0)}ms\n`;
          output += `• 最后使用：${new Date(stat.lastUsed).toLocaleString()}\n\n`;
        });
      }

      return {
        content: [{
          type: 'text',
          text: output
        }]
      };
    } catch (error) {
      return createErrorResponse('获取统计信息失败', [error instanceof Error ? error.message : String(error)]);
    }
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
    .description('聚义厅MCP客户端 - AI人格协作工具')
    .version('1.0.0')
    .option('-p, --personas <file>', '本地人格配置文件路径')
    .option('--disable-telemetry', '禁用遥测数据收集')
    .action(async (options) => {
      if (options.disableTelemetry) {
        telemetry.disable();
      }

      let localPersonas: Persona[] = [];
      
      if (options.personas) {
        try {
          const fs = await import('fs');
          const content = fs.readFileSync(options.personas, 'utf-8');
          localPersonas = JSON.parse(content);
          console.error(`已加载 ${localPersonas.length} 个本地人格`);
        } catch (error) {
          console.error(`加载本地人格失败: ${error instanceof Error ? error.message : String(error)}`);
          process.exit(1);
        }
      }

      const server = new PersonaSummonerServer(localPersonas);
      await server.run();
    });

  if (import.meta.url === `file://${process.argv[1]}`) {
    program.parse();
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
} 