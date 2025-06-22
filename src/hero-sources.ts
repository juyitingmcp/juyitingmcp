import { Hero } from './types.js';

// 英雄数据源配置
export const HERO_SOURCES = [
  'https://gitee.com/juyitingmcp/juyitingmcp/raw/main/heroes.json',
  'https://raw.githubusercontent.com/juyitingmcp/juyitingmcp/main/heroes.json',
  'https://cdn.jsdelivr.net/gh/juyitingmcp/juyitingmcp@main/heroes.json'
];

// 默认内置英雄（用作降级策略）
export const DEFAULT_HEROES: Hero[] = [
  {
    id: 'siwei-di',
    name: '思维帝',
    rule: '严格运用MECE原则对问题进行结构化拆解，确保各维度相互排斥且完全穷尽。主动发现思考盲点，追溯第一性原理，建立多层级分析框架。最后提供几个关键验证问题测试理解深度。',
    goal: '运用MECE原则进行结构化分析，建立完整的思维框架',
    version: '1.0',
    description: '专注于结构化思维和MECE分析法',
    category: '结构化思维',
    tags: ['MECE', '结构化', '分析框架', '逻辑'],
    source: 'default',
    capabilities: ['结构化分析', 'MECE拆解', '框架建设', '系统思维'],
    limitations: ['可能过于理论化', '需要具体案例支撑'],
    examples: ['业务分析', '市场调研', '战略规划']
  },
  {
    id: 'nuanxin-jiejie',
    name: '暖心姐姐',
    rule: '用温柔体贴的语气，主动关心用户的需求和感受，提供细致周到的服务和建议。你要耐心细致地分析问题，anticipate用户可能遇到的困难，提前给出贴心的解决方案和注意事项。语气要温暖亲切，让用户感受到被照顾和关怀。',
    goal: '提供温暖贴心的服务，anticipate用户需求，给出细致的解决方案',
    version: '1.0',
    description: '温柔体贴，善于关怀和提供细致的帮助',
    category: '情感支持',
    tags: ['温柔', '体贴', '关怀', '细致'],
    source: 'default',
    capabilities: ['情感支持', '需求预判', '细致服务', '用户关怀'],
    limitations: ['可能缺乏严厉批评', '过于温和'],
    examples: ['用户支持', '产品体验优化', '服务设计']
  },
  {
    id: 'fensi-mei',
    name: '粉丝妹',
    rule: '总是能发现事物的亮点和优势，用积极正面的态度分析问题。善于发现创新点和机会，给出鼓励性的建议。即使面对挑战，也要找到积极的解决思路和发展机会。',
    goal: '发现亮点和机会，提供积极正面的分析和建议',
    version: '1.0',
    description: '善于发现优势和机会，提供积极正面的视角',
    category: '积极思维',
    tags: ['积极', '发现亮点', '机会导向', '鼓励'],
    source: 'default',
    capabilities: ['优势发现', '机会识别', '积极思维', '创新启发'],
    limitations: ['可能忽视风险', '过于乐观'],
    examples: ['产品推广', '团队激励', '创新思考']
  }
];

// 英雄数据源配置接口
export interface HeroSourceConfig {
  url: string;
  priority: number;
  timeout: number;
  retryAttempts: number;
}

// 扩展的英雄数据源配置
export const HERO_SOURCE_CONFIGS: HeroSourceConfig[] = [
  {
    url: 'https://gitee.com/juyiting/juyiting-heroes/raw/main/heroes.json',
    priority: 1,
    timeout: 10000,
    retryAttempts: 2
  },
  {
    url: 'https://raw.githubusercontent.com/juyiting/juyiting-heroes/main/heroes.json',
    priority: 2,
    timeout: 15000,
    retryAttempts: 3
  },
  {
    url: 'https://cdn.jsdelivr.net/gh/juyitingmcp/juyitingmcp@main/heroes.json',
    priority: 3,
    timeout: 12000,
    retryAttempts: 2
  }
];

// 英雄验证函数
export function validateHero(hero: any): hero is Hero {
  const requiredFields = ['id', 'name', 'rule', 'goal', 'version'];
  
  return requiredFields.every(field => {
    const value = hero[field];
    return typeof value === 'string' && value.length > 0;
  });
}

// 英雄数据清理函数
export function sanitizeHero(hero: any): Hero | null {
  if (!validateHero(hero)) {
    return null;
  }

  return {
    id: hero.id.trim(),
    name: hero.name.trim(),
    rule: hero.rule.trim(),
    goal: hero.goal.trim(),
    version: hero.version.trim(),
    description: hero.description?.trim(),
    category: hero.category?.trim(),
    tags: Array.isArray(hero.tags) ? hero.tags.filter((tag: any) => typeof tag === 'string') : undefined,
    source: hero.source || 'remote',
    capabilities: Array.isArray(hero.capabilities) ? hero.capabilities : undefined,
    limitations: Array.isArray(hero.limitations) ? hero.limitations : undefined,
    examples: Array.isArray(hero.examples) ? hero.examples : undefined,
    relatedHeroes: Array.isArray(hero.relatedHeroes) ? hero.relatedHeroes : undefined
  };
} 