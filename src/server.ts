#!/usr/bin/env node

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { Command } from 'commander';
import { readFileSync, existsSync } from 'fs';
import { RemotePersonaRepository } from './persona-repository.js';
import { Persona } from './types.js';

// 解析命令行参数
const program = new Command();
program
  .name('juyiting-mcp-client')
  .description('聚义厅MCP客户端 - AI人格协作工具')
  .version('1.0.1')
  .option('-p, --personas <file>', '本地人格配置文件路径')
  .option('-c, --config <file>', '配置文件路径')
  .option('--debug', '启用调试模式')
  .option('--no-telemetry', '禁用遥测')
  .parse();

const options = program.opts();

// 加载本地人格
function loadLocalPersonas(filePath?: string): Persona[] {
  if (!filePath) return [];
  
  try {
    if (!existsSync(filePath)) {
      console.error(`⚠️ 本地人格文件不存在: ${filePath}`);
      return [];
    }
    
    const content = readFileSync(filePath, 'utf-8');
    const personas = JSON.parse(content);
    
    if (!Array.isArray(personas)) {
      console.error('⚠️ 本地人格文件格式错误：应为数组');
      return [];
    }
    
    console.error(`✅ 已加载 ${personas.length} 个本地人格`);
    return personas;
  } catch (error) {
    console.error(`❌ 加载本地人格失败: ${error instanceof Error ? error.message : '未知错误'}`);
    return [];
  }
}

// 创建MCP服务器
const server = new McpServer({
  name: 'juyiting-mcp-client',
  version: '1.0.1'
});

// 初始化人格仓库（传入本地人格）
const localPersonas = loadLocalPersonas(options.personas);
const personaRepo = new RemotePersonaRepository(localPersonas);

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
            text: `❌ 未找到名为"${name}"的人格。\n\n💡 提示：\n1. 检查人格名称是否正确\n2. 使用 list_personas 查看所有可用人格\n3. 使用 search_personas 搜索相关人格`
          }]
        };
      }

      return {
        content: [{
          type: 'text',
          text: `🎭 **${persona.name}** (${persona.id}) 已召唤！\n**🎯 目标**: ${persona.goal}\n**📝 描述**: ${persona.description || '无描述'}\n**📍 来源**: ${persona.source || 'unknown'}\n\n**📜 人格规则**:\n${persona.rule}`
        }]
      };
    } catch (error) {
      return {
        content: [{
          type: 'text',
          text: `❌ 召唤人格时发生错误：${error instanceof Error ? error.message : '未知错误'}`
        }]
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
    inputSchema: {
      category: z.string().optional().describe('可选：按分类筛选人格'),
      source: z.enum(['local', 'remote', 'default']).optional().describe('可选：按数据源筛选人格')
    }
  },
  async ({ category, source }) => {
    try {
      let personas = await personaRepo.getAllPersonas();
      
      // 按来源筛选
      if (source) {
        personas = personas.filter(p => p.source === source);
      }
      
      // 按分类筛选
      if (category) {
        personas = personas.filter(p => 
          p.category?.toLowerCase().includes(category.toLowerCase()) ||
          p.tags?.some(tag => tag.toLowerCase().includes(category.toLowerCase()))
        );
      }
      
      if (personas.length === 0) {
        return {
          content: [{
            type: 'text',
            text: source || category 
              ? `没有找到符合条件的人格。`
              : '当前没有可用的人格。'
          }]
        };
      }

      // 按来源分组
      const groupedPersonas = personas.reduce((acc, persona) => {
        const src = persona.source || 'unknown';
        if (!acc[src]) acc[src] = [];
        acc[src].push(persona);
        return acc;
      }, {} as Record<string, Persona[]>);

      let result = `📋 **聚义厅人格列表** (共 ${personas.length} 个)：\n\n`;
      
      for (const [src, personaList] of Object.entries(groupedPersonas)) {
        const sourceIcon = src === 'local' ? '🏠' : src === 'remote' ? '🌐' : '⭐';
        result += `${sourceIcon} **${src.toUpperCase()}** (${personaList.length}个):\n`;
        
        personaList.forEach(persona => {
          result += `  • **${persona.name}**: ${persona.description || '无描述'}\n`;
        });
        result += '\n';
      }
      
      result += '💡 使用 `summon_persona` 工具来召唤任意人格。';

      return {
        content: [{
          type: 'text',
          text: result
        }]
      };
    } catch (error) {
      return {
        content: [{
          type: 'text',
          text: `❌ 获取人格列表时发生错误：${error instanceof Error ? error.message : '未知错误'}`
        }]
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
        (persona.description || '').toLowerCase().includes(keyword.toLowerCase()) ||
        persona.id.toLowerCase().includes(keyword.toLowerCase()) ||
        persona.tags?.some(tag => tag.toLowerCase().includes(keyword.toLowerCase()))
      );

      if (matchedPersonas.length === 0) {
        return {
          content: [{
            type: 'text',
            text: `🔍 没有找到包含关键词"${keyword}"的人格。\n\n💡 建议：\n1. 尝试其他关键词\n2. 使用 list_personas 查看所有可用人格`
          }]
        };
      }

      const personaList = matchedPersonas.map(persona => 
        `• **${persona.name}** (${persona.source || 'unknown'}): ${persona.description || '无描述'}`
      ).join('\n');

      return {
        content: [{
          type: 'text',
          text: `🔍 找到 ${matchedPersonas.length} 个匹配"${keyword}"的人格：\n\n${personaList}\n\n💡 使用 \`summon_persona\` 召唤任意人格。`
        }]
      };
    } catch (error) {
      return {
        content: [{
          type: 'text',
          text: `❌ 搜索人格时发生错误：${error instanceof Error ? error.message : '未知错误'}`
        }]
      };
    }
  }
);

// 启动服务器
async function main() {
  try {
    console.error('🚀 启动聚义厅MCP客户端...');
    
    if (options.debug) {
      console.error('🐛 调试模式已启用');
      console.error('📋 配置信息:', {
        personas: options.personas,
        config: options.config,
        localPersonasCount: localPersonas.length
      });
    }
    
    // 预热缓存
    console.error('🔥 预热人格缓存...');
    const allPersonas = await personaRepo.getAllPersonas();
    console.error(`✅ 缓存预热完成，共加载 ${allPersonas.length} 个人格`);
    
    const transport = new StdioServerTransport();
    await server.connect(transport);
    
    console.error('✅ MCP服务器已启动，等待连接...');
  } catch (error) {
    console.error('❌ 启动失败:', error);
    process.exit(1);
  }
}

// 处理帮助信息
if (process.argv.includes('--help') || process.argv.includes('-h')) {
  console.log(`
🎭 聚义厅MCP客户端

用法：
  juyiting-mcp [选项]

选项：
  -p, --personas <file>    指定本地人格配置文件
  -c, --config <file>      指定配置文件路径
  --debug                  启用调试模式
  --no-telemetry          禁用遥测
  -h, --help              显示帮助信息
  -V, --version           显示版本号

可用工具：
  - summon_persona: 召唤指定的人格角色
  - list_personas: 列出所有可用的人格
  - search_personas: 搜索匹配的人格角色

示例：
  juyiting-mcp --personas ./local-personas.json
  juyiting-mcp --debug
  
MCP工具使用：
  召唤人格: summon_persona({"name": "暴躁老哥"})
  列出人格: list_personas({})
  搜索人格: search_personas({"keyword": "暴躁"})
`);
  process.exit(0);
}

// 启动服务器
main().catch(console.error); 