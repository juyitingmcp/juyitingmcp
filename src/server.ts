#!/usr/bin/env node

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { RemotePersonaRepository } from './persona-repository.js';

// 创建MCP服务器
const server = new McpServer({
  name: 'juyiting-mcp-client',
  version: '1.0.0'
});

// 初始化人格仓库
const personaRepo = new RemotePersonaRepository();

// 注册召唤人格工具
server.registerTool(
  'summon_persona',
  {
    title: '召唤人格',
    description: '从聚义厅召唤指定的人格角色',
    inputSchema: {
      name: z.string().describe('人格名称，如：暴躁老哥、暖心姐姐、拆解大师等')
    }
  },
  async ({ name }) => {
    try {
      // 先尝试通过ID查找，如果找不到则通过名称搜索
      let persona = await personaRepo.getPersonaById(name);
      if (!persona) {
        const searchResults = await personaRepo.searchPersonas(name);
        persona = searchResults.find(p => 
          p.name === name || 
          p.id === name ||
          p.name.toLowerCase() === name.toLowerCase()
        ) || null;
      }
      if (!persona) {
        return {
          content: [{
            type: 'text',
            text: `未找到名为"${name}"的人格。请检查人格名称是否正确。`
          }],
          isError: true
        };
      }

      return {
        content: [{
          type: 'text',
          text: `🎭 **${persona.name}** (${persona.id}) 已召唤！\n**🎯 目标**: ${persona.goal}\n**📝 描述**: ${persona.description || '无描述'}\n\n**📜 人格规则**:\n${persona.rule}`
        }]
      };
    } catch (error) {
      return {
        content: [{
          type: 'text',
          text: `召唤人格时发生错误：${error instanceof Error ? error.message : '未知错误'}`
        }],
        isError: true
      };
    }
  }
);

// 注册列出所有人格工具
server.registerTool(
  'list_personas',
  {
    title: '列出所有人格',
    description: '显示聚义厅中所有可用的人格角色',
    inputSchema: {}
  },
  async () => {
    try {
      const personas = await personaRepo.getAllPersonas();
      
      if (personas.length === 0) {
        return {
          content: [{
            type: 'text',
            text: '当前没有可用的人格。'
          }]
        };
      }

      const personaList = personas.map(persona => 
        `• **${persona.name}**: ${persona.description || '无描述'}`
      ).join('\n');

      return {
        content: [{
          type: 'text',
          text: `聚义厅中共有 ${personas.length} 个人格：\n\n${personaList}\n\n使用 summon_persona 工具来召唤任意人格。`
        }]
      };
    } catch (error) {
      return {
        content: [{
          type: 'text',
          text: `获取人格列表时发生错误：${error instanceof Error ? error.message : '未知错误'}`
        }],
        isError: true
      };
    }
  }
);

// 注册搜索人格工具
server.registerTool(
  'search_personas',
  {
    title: '搜索人格',
    description: '根据关键词搜索匹配的人格角色',
    inputSchema: {
      keyword: z.string().describe('搜索关键词，可以是人格名称或描述中的词语')
    }
  },
  async ({ keyword }) => {
    try {
      const allPersonas = await personaRepo.getAllPersonas();
      const matchedPersonas = allPersonas.filter(persona => 
        persona.name.toLowerCase().includes(keyword.toLowerCase()) ||
        (persona.description || '').toLowerCase().includes(keyword.toLowerCase())
      );

      if (matchedPersonas.length === 0) {
        return {
          content: [{
            type: 'text',
            text: `没有找到包含关键词"${keyword}"的人格。`
          }]
        };
      }

      const personaList = matchedPersonas.map(persona => 
        `• **${persona.name}**: ${persona.description || '无描述'}`
      ).join('\n');

      return {
        content: [{
          type: 'text',
          text: `找到 ${matchedPersonas.length} 个匹配"${keyword}"的人格：\n\n${personaList}`
        }]
      };
    } catch (error) {
      return {
        content: [{
          type: 'text',
          text: `搜索人格时发生错误：${error instanceof Error ? error.message : '未知错误'}`
        }],
        isError: true
      };
    }
  }
);

// 启动服务器
async function main() {
  try {
    console.error('🚀 启动聚义厅MCP客户端...');
    
    // 预热缓存
    console.error('🔥 预热人格缓存...');
    await personaRepo.getAllPersonas();
    console.error('✅ 缓存预热完成');
    
    const transport = new StdioServerTransport();
    await server.connect(transport);
    
    console.error('✅ MCP服务器已启动，等待连接...');
  } catch (error) {
    console.error('❌ 启动失败:', error);
    process.exit(1);
  }
}

// 处理命令行参数
if (process.argv.includes('--help') || process.argv.includes('-h')) {
  console.log(`
聚义厅MCP客户端

用法：
  node server.js                    # 启动MCP服务器
  node server.js --help            # 显示帮助信息

可用工具：
  - summon_persona: 召唤指定的人格角色
  - list_personas: 列出所有可用的人格
  - search_personas: 搜索匹配的人格角色

示例：
  召唤人格: summon_persona("暴躁老哥")
  列出人格: list_personas()
  搜索人格: search_personas("暴躁")
`);
  process.exit(0);
}

// 启动服务器
main().catch(console.error); 