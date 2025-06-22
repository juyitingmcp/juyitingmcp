#!/usr/bin/env node

/**
 * 聚义厅MCP客户端 - AI英雄协作工具
 * 
 * 本项目灵感来源于大铭老师 (@yinwm) 的 persona-summoner 项目
 * 原项目地址: https://github.com/yinwm/persona-summoner
 * 
 * 感谢大铭老师在AI人格探索领域的开创性贡献！
 * 
 * @author 聚义厅技术团队
 * @license MIT
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { Command } from 'commander';
import { readFileSync, existsSync } from 'fs';
import { RemoteHeroRepository } from './hero-repository.js';
import { Hero } from './types.js';

// 解析命令行参数
const program = new Command();
program
  .name('juyiting-mcp-client')
  .description('聚义厅MCP客户端 - AI英雄协作工具')
  .version('1.0.5')
  .option('-p, --heroes <file>', '本地英雄配置文件路径')
  .option('-c, --config <file>', '配置文件路径')
  .option('--debug', '启用调试模式')
  .option('--no-telemetry', '禁用遥测')
  .parse();

const options = program.opts();

// 加载本地英雄
function loadLocalHeroes(filePath?: string): Hero[] {
  if (!filePath) return [];
  
  try {
    if (!existsSync(filePath)) {
      console.error(`⚠️ 本地英雄文件不存在: ${filePath}`);
      return [];
    }
    
    const content = readFileSync(filePath, 'utf-8');
    const heroes = JSON.parse(content);
    
    if (!Array.isArray(heroes)) {
      console.error('⚠️ 本地英雄文件格式错误：应为数组');
      return [];
    }
    
    console.error(`✅ 已加载 ${heroes.length} 个本地英雄`);
    return heroes;
  } catch (error) {
    console.error(`❌ 加载本地英雄失败: ${error instanceof Error ? error.message : '未知错误'}`);
    return [];
  }
}

// 创建MCP服务器
const server = new McpServer({
  name: 'juyiting-mcp-client',
  version: '1.0.5'
});

// 初始化英雄仓库（传入本地英雄）
  const localHeroes = loadLocalHeroes(options.heroes);
  const heroRepo = new RemoteHeroRepository(localHeroes);

// 注册召唤英雄工具
server.registerTool(
  'summon_hero',
  {
    title: '召唤英雄',
    description: '从聚义厅召唤指定的英雄角色',
    inputSchema: {
      name: z.string().describe('英雄名称，如：粉丝妹、小布丁、暖心姐姐、拆解大师等')
    }
  },
  async ({ name }) => {
    try {
      // 先尝试通过ID查找，如果找不到则通过名称搜索
      let hero = await heroRepo.getHeroById(name);
      if (!hero) {
        const searchResults = await heroRepo.searchHeroes(name);
        hero = searchResults.find(p => 
          p.name === name || 
          p.id === name ||
          p.name.toLowerCase() === name.toLowerCase()
        ) || null;
      }
      
      if (!hero) {
        return {
          content: [{
            type: 'text',
            text: `❌ 未找到名为"${name}"的英雄。\n\n💡 提示：\n1. 检查英雄名称是否正确\n2. 使用 list_heroes 查看所有可用英雄\n3. 使用 search_heroes 搜索相关英雄`
          }]
        };
      }

      return {
        content: [{
          type: 'text',
          text: `🎭 **${hero.name}** (${hero.id}) 已召唤！\n**🎯 目标**: ${hero.goal}\n**📝 描述**: ${hero.description || '无描述'}\n**📍 来源**: ${hero.source || 'unknown'}\n\n**📜 英雄规则**:\n${hero.rule}`
        }]
      };
    } catch (error) {
      return {
        content: [{
          type: 'text',
          text: `❌ 召唤英雄时发生错误：${error instanceof Error ? error.message : '未知错误'}`
        }]
      };
    }
  }
);

// 注册列出所有英雄工具
server.registerTool(
  'list_heroes',
  {
    title: '列出所有英雄',
    description: '显示聚义厅中所有可用的英雄角色',
    inputSchema: {
      category: z.string().optional().describe('可选：按分类筛选英雄'),
      source: z.enum(['local', 'remote', 'default']).optional().describe('可选：按数据源筛选英雄')
    }
  },
  async ({ category, source }) => {
    try {
      let heroes = await heroRepo.getAllHeroes();
      
      // 按来源筛选
      if (source) {
        heroes = heroes.filter(p => p.source === source);
      }
      
      // 按分类筛选
      if (category) {
        heroes = heroes.filter(p => 
          p.category?.toLowerCase().includes(category.toLowerCase()) ||
          p.tags?.some((tag: any) => tag.toLowerCase().includes(category.toLowerCase()))
        );
      }
      
      if (heroes.length === 0) {
        return {
          content: [{
            type: 'text',
            text: source || category 
              ? `没有找到符合条件的英雄。`
              : '当前没有可用的英雄。'
          }]
        };
      }

      // 按来源分组
      const groupedHeroes = heroes.reduce((acc: any, hero: any) => {
        const src = hero.source || 'unknown';
        if (!acc[src]) acc[src] = [];
        acc[src].push(hero);
        return acc;
      }, {} as Record<string, Hero[]>);

      let result = `📋 **聚义厅英雄列表** (共 ${heroes.length} 个)：\n\n`;
      
      for (const [src, heroList] of Object.entries(groupedHeroes)) {
        const sourceIcon = src === 'local' ? '🏠' : src === 'remote' ? '🌐' : '⭐';
        result += `${sourceIcon} **${src.toUpperCase()}** (${(heroList as any[]).length}个):\n`;
        
        (heroList as any[]).forEach((hero: any) => {
          result += `  • **${hero.name}**: ${hero.description || '无描述'}\n`;
        });
        result += '\n';
      }
      
      result += '💡 使用 `summon_hero` 工具来召唤任意英雄。';

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
          text: `❌ 获取英雄列表时发生错误：${error instanceof Error ? error.message : '未知错误'}`
        }]
      };
    }
  }
);

// 注册搜索英雄工具
server.registerTool(
  'search_heroes',
  {
    title: '搜索英雄',
    description: '根据关键词搜索匹配的英雄角色',
    inputSchema: {
      keyword: z.string().describe('搜索关键词，可以是英雄名称或描述中的词语')
    }
  },
  async ({ keyword }) => {
    try {
      const allHeroes = await heroRepo.getAllHeroes();
      const matchedHeroes = allHeroes.filter((hero: any) => 
        hero.name.toLowerCase().includes(keyword.toLowerCase()) ||
        (hero.description || '').toLowerCase().includes(keyword.toLowerCase()) ||
        hero.id.toLowerCase().includes(keyword.toLowerCase()) ||
        hero.tags?.some((tag: any) => tag.toLowerCase().includes(keyword.toLowerCase()))
      );

      if (matchedHeroes.length === 0) {
        return {
          content: [{
            type: 'text',
            text: `🔍 没有找到包含关键词"${keyword}"的英雄。\n\n💡 建议：\n1. 尝试其他关键词\n2. 使用 list_heroes 查看所有可用英雄`
          }]
        };
      }

      const heroList = matchedHeroes.map((hero: any) => 
        `• **${hero.name}** (${hero.source || 'unknown'}): ${hero.description || '无描述'}`
      ).join('\n');

      return {
        content: [{
          type: 'text',
          text: `🔍 找到 ${matchedHeroes.length} 个匹配"${keyword}"的英雄：\n\n${heroList}\n\n💡 使用 \`summon_hero\` 召唤任意英雄。`
        }]
      };
    } catch (error) {
      return {
        content: [{
          type: 'text',
          text: `❌ 搜索英雄时发生错误：${error instanceof Error ? error.message : '未知错误'}`
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
        heroes: options.heroes,
        config: options.config,
        localHeroesCount: localHeroes.length
      });
    }
    
    // 预热缓存
    console.error('🔥 预热英雄缓存...');
    const allHeroes = await heroRepo.getAllHeroes();
    console.error(`✅ 缓存预热完成，共加载 ${allHeroes.length} 个英雄`);
    
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
  -p, --heroes <file>    指定本地英雄配置文件
  -c, --config <file>      指定配置文件路径
  --debug                  启用调试模式
  --no-telemetry          禁用遥测
  -h, --help              显示帮助信息
  -V, --version           显示版本号

可用工具：
  - summon_hero: 召唤指定的英雄角色
  - list_heroes: 列出所有可用的英雄
  - search_heroes: 搜索匹配的英雄角色

示例：
  juyiting-mcp --heroes ./local-heroes.json
  juyiting-mcp --debug
  
MCP工具使用：
  召唤英雄: summon_hero({"name": "小布丁"})
  列出英雄: list_heroes({})
  搜索英雄: search_heroes({"keyword": "暴躁"})
`);
  process.exit(0);
}

// 启动服务器
main().catch(console.error); 