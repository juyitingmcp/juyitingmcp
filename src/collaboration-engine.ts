import { 
  Hero, 
  HeroRepository, 
  CollaborationConfig, 
  CollaborationResult, 
  HeroAnalysis, 
  CrossValidationResult, 
  SynthesisResult, 
  ActionPlan, 
  ActionStep,
  CollaborationMode,
  SessionInfo 
} from './types.js';
import { CacheManager, CacheKeyGenerator } from './utils/cache.js';
import { DEFAULT_COLLABORATION_CONFIG } from './constants.js';

/**
 * 协作会话管理
 */
class CollaborationSession {
  private id: string;
  private query: string;
  private config: CollaborationConfig;
  private selectedHeroes: Hero[] = [];
  private startTime: number;
  private status: 'pending' | 'running' | 'completed' | 'failed' = 'pending';
  private analyses: HeroAnalysis[] = [];
  private result: CollaborationResult | null = null;

  constructor(query: string, config: CollaborationConfig) {
    this.id = this.generateSessionId();
    this.query = query;
    this.config = { ...DEFAULT_COLLABORATION_CONFIG, ...config };
    this.startTime = Date.now();
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Getter methods
  getId(): string { return this.id; }
  getQuery(): string { return this.query; }
  getConfig(): CollaborationConfig { return this.config; }
  getSelectedHeroes(): Hero[] { return this.selectedHeroes; }
  getStartTime(): number { return this.startTime; }
  getStatus(): string { return this.status; }
  getAnalyses(): HeroAnalysis[] { return this.analyses; }

  // Setter methods
  setSelectedHeroes(heroes: Hero[]): void {
    this.selectedHeroes = heroes;
  }

  setStatus(status: 'pending' | 'running' | 'completed' | 'failed'): void {
    this.status = status;
  }

  addAnalysis(analysis: HeroAnalysis): void {
    this.analyses.push(analysis);
  }

  setResult(result: CollaborationResult): void {
    this.result = result;
  }

  getSessionInfo(): SessionInfo {
    return {
      id: this.id,
      query: this.query,
      status: this.status,
      selectedHeroes: this.selectedHeroes.map((p: any) => p.name),
      startTime: this.startTime,
      duration: Date.now() - this.startTime
    };
  }
}

/**
 * 协作引擎核心类
 */
export class CollaborationEngine {
  private repository: HeroRepository;
  private cache: CacheManager;
  private activeSessions: Map<string, CollaborationSession> = new Map();
  private sessionHistory: CollaborationSession[] = [];
  private maxHistorySize: number = 100;

  constructor(repository: HeroRepository) {
    this.repository = repository;
    this.cache = new CacheManager();
  }

  /**
   * 启动协作分析
   */
  async startCollaboration(query: string, config?: Partial<CollaborationConfig>): Promise<CollaborationResult> {
    const fullConfig: CollaborationConfig = { 
      ...DEFAULT_COLLABORATION_CONFIG, 
      ...config 
    };

    const session = new CollaborationSession(query, fullConfig);
    this.activeSessions.set(session.getId(), session);

    try {
      session.setStatus('running');
      console.log(`🚀 启动协作会话: ${session.getId()}`);

      // 1. 智能英雄选择
      const selectedHeroes = await this.selectHeroes(query, fullConfig);
      session.setSelectedHeroes(selectedHeroes);
      console.log(`🎭 选中英雄: ${selectedHeroes.map((p: any) => p.name).join(', ')}`);

      // 2. 执行协作流程
      let result: CollaborationResult;
      
      switch (fullConfig.mode) {
        case CollaborationMode.PARALLEL:
          result = await this.executeParallelCollaboration(session);
          break;
        case CollaborationMode.SEQUENTIAL:
          result = await this.executeSequentialCollaboration(session);
          break;
        case CollaborationMode.INTELLIGENT:
          result = await this.executeIntelligentCollaboration(session);
          break;
        default:
          throw new Error(`不支持的协作模式: ${fullConfig.mode}`);
      }

      session.setResult(result);
      session.setStatus('completed');
      console.log(`✅ 协作完成: ${session.getId()}`);

      return result;

    } catch (error) {
      session.setStatus('failed');
      console.error(`❌ 协作失败: ${session.getId()}`, error);
      throw error;
    } finally {
      // 移动到历史记录
      this.activeSessions.delete(session.getId());
      this.addToHistory(session);
    }
  }

  /**
   * 智能英雄选择算法
   */
  private async selectHeroes(query: string, config: CollaborationConfig): Promise<Hero[]> {
    const allHeroes = await this.repository.getAllHeroes();
    
    if (config.heroIds && config.heroIds.length > 0) {
      // 指定英雄模式
      const selected = allHeroes.filter((p: any) => config.heroIds!.includes(p.id));
      if (selected.length === 0) {
        throw new Error('指定的英雄ID不存在或不可用');
      }
      return selected;
    }

    // 智能选择模式
    return this.intelligentHeroSelection(query, allHeroes);
  }

  /**
   * 智能英雄选择逻辑
   */
  private intelligentHeroSelection(query: string, heroes: Hero[]): Hero[] {
    const queryLower = query.toLowerCase();
    const scores = new Map<string, number>();

    // 分析查询类型和关键词
    const queryAnalysis = this.analyzeQuery(queryLower);
    
    heroes.forEach(hero => {
      let score = 0;

      // 基于查询类型匹配
      score += this.calculateTypeScore(hero, queryAnalysis.type);

      // 基于关键词匹配
      queryAnalysis.keywords.forEach(keyword => {
        if (hero.goal.toLowerCase().includes(keyword)) score += 3;
        if (hero.description?.toLowerCase().includes(keyword)) score += 2;
        if (hero.tags?.some((tag: any) => tag.toLowerCase().includes(keyword))) score += 1;
        if (hero.rule.toLowerCase().includes(keyword)) score += 1;
      });

      // 基于分类匹配
      if (hero.category === queryAnalysis.category) score += 5;

      // 基于英雄特性匹配
      if (queryAnalysis.needsCritical && this.isCriticalPersona(hero)) score += 4;
      if (queryAnalysis.needsCreative && this.isCreativePersona(hero)) score += 4;
      if (queryAnalysis.needsAnalytical && this.isAnalyticalPersona(hero)) score += 4;

      scores.set(hero.id, score);
    });

    // 使用优化的选择算法
    return this.optimizeHeroSelection(heroes, scores, query);
  }

  /**
   * 优化英雄组合选择
   */
  private optimizeHeroSelection(heroes: Hero[], scores: Map<string, number>, query: string): Hero[] {
    const selected: Hero[] = [];
    const maxHeroes = 4;
    const minHeroes = 2;

    // 1. 选择得分最高的英雄作为基础
    const sortedHeroes = heroes.sort((a, b) => (scores.get(b.id) || 0) - (scores.get(a.id) || 0));
    if (sortedHeroes.length > 0 && (scores.get(sortedHeroes[0].id) || 0) > 0) {
      selected.push(sortedHeroes[0]);
    }

    // 2. 基于多样性和互补性选择其他英雄
    for (let i = 1; i < sortedHeroes.length && selected.length < maxHeroes; i++) {
      const candidate = sortedHeroes[i];
      const baseScore = scores.get(candidate.id) || 0;
      
      // 跳过得分过低的人格
      if (baseScore < 1) continue;

      // 计算多样性得分
      const diversityScore = this.calculateDiversityScore(selected, candidate);
      
      // 计算互补性得分
      const complementaryScore = this.calculateComplementaryScore(selected, candidate, query);

      // 综合得分
      const totalScore = baseScore + diversityScore + complementaryScore;

      // 如果综合得分足够高，或者我们还没有达到最小英雄数，则选择该英雄
      if (totalScore >= 3 || selected.length < minHeroes) {
        selected.push(candidate);
      }
    }

    // 确保至少有一个英雄
    return selected.length > 0 ? selected : [heroes[0]];
  }

  /**
   * 计算英雄多样性得分
   */
  private calculateDiversityScore(selectedHeroes: Hero[], candidateHero: Hero): number {
    let diversityScore = 0;
    
    // 检查类别多样性
    const categories = new Set(selectedHeroes.map((p: any) => p.category).filter(Boolean));
    if (candidateHero.category && !categories.has(candidateHero.category)) {
      diversityScore += 3;
    }

    // 检查标签多样性
    const existingTags = new Set(selectedHeroes.flatMap(p => p.tags || []));
    const newTags = candidateHero.tags?.filter((tag: any) => !existingTags.has(tag)) || [];
    diversityScore += newTags.length * 0.5;

    // 检查思维方式多样性
    const hasCritical = selectedHeroes.some(p => this.isCriticalPersona(p));
    const hasCreative = selectedHeroes.some(p => this.isCreativePersona(p));
    const hasAnalytical = selectedHeroes.some(p => this.isAnalyticalPersona(p));
    const hasSupportive = selectedHeroes.some(p => this.isSupportivePersona(p));

    if (!hasCritical && this.isCriticalPersona(candidateHero)) diversityScore += 2;
    if (!hasCreative && this.isCreativePersona(candidateHero)) diversityScore += 2;
    if (!hasAnalytical && this.isAnalyticalPersona(candidateHero)) diversityScore += 2;
    if (!hasSupportive && this.isSupportivePersona(candidateHero)) diversityScore += 2;

    return diversityScore;
  }

  /**
   * 计算英雄互补性得分
   */
  private calculateComplementaryScore(selectedHeroes: Hero[], candidateHero: Hero, query: string): number {
    let score = 0;

    // 检查是否需要平衡观点
    const hasCritical = selectedHeroes.some(p => this.isCriticalPersona(p));
    const hasSupportive = selectedHeroes.some(p => this.isSupportivePersona(p));

    if (hasCritical && this.isSupportivePersona(candidateHero)) {
      score += 2; // 批判性思维需要支持性观点平衡
    }

    if (hasSupportive && this.isCriticalPersona(candidateHero)) {
      score += 2; // 支持性观点需要批判性思维平衡
    }

    // 针对复杂问题，确保有深度分析能力
    if (this.isComplexQuery(query) && this.isAnalyticalPersona(candidateHero)) {
      score += 1;
    }

    // 针对创新问题，确保有创意思维
    if (this.isCreativeQuery(query) && this.isCreativePersona(candidateHero)) {
      score += 1;
    }

    return score;
  }

  /**
   * 判断是否为支持性英雄
   */
  private isSupportivePersona(hero: Hero): boolean {
    return hero.category === 'supportive' ||
           hero.tags?.some((tag: any) => 
             ['积极思维', '鼓励支持', '优势发现', '正能量'].includes(tag)
           ) ||
           /鼓励|支持|积极|正面|优点|亮点|粉丝/.test(hero.name.toLowerCase()) ||
           /鼓励|支持|积极|正面|优点|亮点/.test(hero.goal.toLowerCase());
  }

  /**
   * 判断查询是否复杂
   */
  private isComplexQuery(query: string): boolean {
    const complexityIndicators = [
      query.length > 100, // 长查询通常更复杂
      /多个|多种|综合|全面|深入|详细/.test(query), // 复杂性关键词
      query.split(/[，。！？；：]/).length > 2, // 多个句子
      /分析.*和.*|既.*又.*|不仅.*还.*/.test(query) // 复合结构
    ];

    return complexityIndicators.filter(Boolean).length >= 2;
  }

  /**
   * 判断查询是否需要创意思维
   */
  private isCreativeQuery(query: string): boolean {
    return /创新|创意|想法|灵感|设计|突破|新颖|独特/.test(query);
  }

  /**
   * 分析查询内容
   */
  private analyzeQuery(query: string): QueryAnalysis {
    const keywords = this.extractKeywords(query);
    const type = this.detectQueryType(query);
    const category = this.detectQueryCategory(query);
    
    return {
      keywords,
      type,
      category,
      needsCritical: this.needsCriticalThinking(query),
      needsCreative: this.needsCreativeThinking(query),
      needsAnalytical: this.needsAnalyticalThinking(query)
    };
  }

  /**
   * 提取关键词
   */
  private extractKeywords(query: string): string[] {
    // 简化的关键词提取，实际项目中可以使用更复杂的NLP算法
    const stopWords = new Set(['的', '是', '在', '有', '和', '与', '或', '但', '如何', '什么', '为什么', '怎么']);
    
    return query
      .split(/[\s，。！？；：、]+/)
      .filter(word => word.length > 1 && !stopWords.has(word))
      .slice(0, 10); // 限制关键词数量
  }

  /**
   * 检测查询类型
   */
  private detectQueryType(query: string): QueryType {
    if (/分析|评估|研究|调研/.test(query)) return 'analysis';
    if (/创意|想法|创新|设计/.test(query)) return 'creative';
    if (/问题|bug|错误|故障/.test(query)) return 'problem';
    if (/策略|计划|方案|建议/.test(query)) return 'strategy';
    if (/评价|审查|检查|review/.test(query)) return 'review';
    return 'general';
  }

  /**
   * 检测查询分类
   */
  private detectQueryCategory(query: string): string | undefined {
    if (/技术|代码|编程|开发/.test(query)) return 'technical';
    if (/商业|市场|营销|销售/.test(query)) return 'business';
    if (/产品|功能|用户/.test(query)) return 'product';
    if (/设计|UI|UX|界面/.test(query)) return 'design';
    return undefined;
  }

  /**
   * 判断是否需要批判性思维
   */
  private needsCriticalThinking(query: string): boolean {
    return /风险|问题|缺点|不足|挑战|困难/.test(query);
  }

  /**
   * 判断是否需要创意思维
   */
  private needsCreativeThinking(query: string): boolean {
    return /创新|创意|想法|灵感|突破|新颖/.test(query);
  }

  /**
   * 判断是否需要分析思维
   */
  private needsAnalyticalThinking(query: string): boolean {
    return /分析|数据|统计|逻辑|推理|结论/.test(query);
  }

  /**
   * 判断英雄类型
   */
  private isCriticalPersona(hero: Hero): boolean {
    const criticalKeywords = ['批判', '质疑', '挑战', '审视', '暴躁', '严格'];
    return criticalKeywords.some(keyword => 
      hero.name.includes(keyword) || 
      hero.goal.includes(keyword) || 
      hero.rule.includes(keyword)
    );
  }

  private isCreativePersona(hero: Hero): boolean {
    const creativeKeywords = ['创意', '创新', '想象', '灵感', '艺术', '设计'];
    return creativeKeywords.some(keyword => 
      hero.name.includes(keyword) || 
      hero.goal.includes(keyword) || 
      hero.rule.includes(keyword)
    );
  }

  private isAnalyticalPersona(hero: Hero): boolean {
    const analyticalKeywords = ['分析', '逻辑', '理性', '数据', '研究', '自省'];
    return analyticalKeywords.some(keyword => 
      hero.name.includes(keyword) || 
      hero.goal.includes(keyword) || 
      hero.rule.includes(keyword)
    );
  }

  /**
   * 计算类型匹配分数
   */
  private calculateTypeScore(hero: Hero, queryType: QueryType): number {
    const typeMapping: Record<QueryType, string[]> = {
      'analysis': ['分析', '研究', '评估', '自省'],
      'creative': ['创意', '创新', '想象', '设计'],
      'problem': ['问题', '解决', '调试', '暴躁'],
      'strategy': ['策略', '规划', '建议', '产品'],
      'review': ['审查', '评价', '检查', '暴躁'],
      'general': []
    };

    const relevantKeywords = typeMapping[queryType] || [];
    
    return relevantKeywords.reduce((score, keyword) => {
      if (hero.name.includes(keyword) || 
          hero.goal.includes(keyword) || 
          hero.rule.includes(keyword)) {
        return score + 2;
      }
      return score;
    }, 0);
  }

  /**
   * 并行协作模式
   */
  private async executeParallelCollaboration(session: CollaborationSession): Promise<CollaborationResult> {
    const heroes = session.getSelectedHeroes();
    const query = session.getQuery();

    console.log(`🔄 执行并行协作模式，${heroes.length} 个英雄同时分析`);

    // 1. 并行英雄分析
    const analyses = await Promise.all(
      heroes.map((hero: Hero) => this.executeHeroAnalysis(hero, query, session))
    );

    // 2. 交叉验证
    const crossValidation = await this.executeCrossValidation(analyses);

    // 3. 综合分析
    const synthesis = await this.synthesizeResults(analyses, crossValidation);

    // 4. 生成行动计划
    const actionPlan = await this.generateActionPlan(synthesis, query);

    return {
      sessionId: session.getId(),
      query,
      selectedHeroes: heroes.map((p: any) => p.name),
      mode: 'parallel',
      analyses,
      crossValidation,
      synthesis,
      actionPlan,
      executionTime: Date.now() - session.getStartTime()
    };
  }

  /**
   * 顺序协作模式
   */
  private async executeSequentialCollaboration(session: CollaborationSession): Promise<CollaborationResult> {
    const heroes = session.getSelectedHeroes();
    const query = session.getQuery();

    console.log(`🔄 执行顺序协作模式，${heroes.length} 个英雄依次分析`);

    const analyses: HeroAnalysis[] = [];
    let accumulatedContext = '';

    // 顺序执行分析
    for (let i = 0; i < heroes.length; i++) {
      const hero = heroes[i];
      const contextualQuery = this.buildContextualQuery(query, accumulatedContext, i);
      
      const analysis = await this.executeHeroAnalysis(hero, contextualQuery, session);
      analyses.push(analysis);
      
      // 累积上下文
      accumulatedContext += `\n\n【${hero.name}的分析】:\n${analysis.analysis}`;
      
      console.log(`✅ ${hero.name} 分析完成 (${i + 1}/${heroes.length})`);
    }

    // 交叉验证和综合分析
    const crossValidation = await this.executeCrossValidation(analyses);
    const synthesis = await this.synthesizeResults(analyses, crossValidation);
    const actionPlan = await this.generateActionPlan(synthesis, query);

    return {
      sessionId: session.getId(),
      query,
      selectedHeroes: heroes.map((p: any) => p.name),
      mode: 'sequential',
      analyses,
      crossValidation,
      synthesis,
      actionPlan,
      executionTime: Date.now() - session.getStartTime()
    };
  }

  /**
   * 智能协作模式
   */
  private async executeIntelligentCollaboration(session: CollaborationSession): Promise<CollaborationResult> {
    const heroes = session.getSelectedHeroes();
    const query = session.getQuery();

    console.log(`🧠 执行智能协作模式，动态调整协作流程`);

    // 智能决策：根据查询复杂度和英雄特性选择最佳协作方式
    const complexity = this.assessQueryComplexity(query);
    const heroTypes = this.analyzeHeroTypes(heroes);

    if (complexity > 0.7 && heroTypes.hasComplementary) {
      // 复杂查询且英雄互补 -> 混合模式
      return await this.executeHybridCollaboration(session);
    } else if (heroTypes.hasCritical && heroTypes.hasCreative) {
      // 有批判和创意英雄 -> 对话模式
      return await this.executeDialogueCollaboration(session);
    } else {
      // 默认并行模式
      return await this.executeParallelCollaboration(session);
    }
  }

  /**
   * 混合协作模式
   */
  private async executeHybridCollaboration(session: CollaborationSession): Promise<CollaborationResult> {
    const heroes = session.getSelectedHeroes();
    const query = session.getQuery();

    console.log(`🔀 执行混合协作模式`);

    // 第一轮：并行初始分析
    const initialAnalyses = await Promise.all(
      heroes.map((hero: Hero) => this.executeHeroAnalysis(hero, query, session))
    );

    // 第二轮：基于初始分析的深度对话
    const dialogueAnalyses = await this.executeRoundTableDiscussion(heroes, query, initialAnalyses, session);

    // 合并分析结果
    const allAnalyses = [...initialAnalyses, ...dialogueAnalyses];

    const crossValidation = await this.executeCrossValidation(allAnalyses);
    const synthesis = await this.synthesizeResults(allAnalyses, crossValidation);
    const actionPlan = await this.generateActionPlan(synthesis, query);

    return {
      sessionId: session.getId(),
      query,
      selectedHeroes: heroes.map((p: any) => p.name),
      mode: 'intelligent-hybrid',
      analyses: allAnalyses,
      crossValidation,
      synthesis,
      actionPlan,
      executionTime: Date.now() - session.getStartTime()
    };
  }

  /**
   * 对话协作模式
   */
  private async executeDialogueCollaboration(session: CollaborationSession): Promise<CollaborationResult> {
    const heroes = session.getSelectedHeroes();
    const query = session.getQuery();

    console.log(`💬 执行对话协作模式`);

    const analyses: HeroAnalysis[] = [];
    const maxRounds = session.getConfig().maxRounds || 3;

    for (let round = 1; round <= maxRounds; round++) {
      console.log(`🔄 对话轮次 ${round}/${maxRounds}`);
      
      for (const hero of heroes) {
        const contextualQuery = this.buildDialogueContext(query, analyses, round);
        const analysis = await this.executeHeroAnalysis(hero, contextualQuery, session);
        analyses.push(analysis);
      }
    }

    const crossValidation = await this.executeCrossValidation(analyses);
    const synthesis = await this.synthesizeResults(analyses, crossValidation);
    const actionPlan = await this.generateActionPlan(synthesis, query);

    return {
      sessionId: session.getId(),
      query,
      selectedHeroes: heroes.map((p: any) => p.name),
      mode: 'intelligent-dialogue',
      analyses,
      crossValidation,
      synthesis,
      actionPlan,
      executionTime: Date.now() - session.getStartTime()
    };
  }

  /**
   * 执行单个人格分析
   */
  private async executeHeroAnalysis(
    hero: Hero, 
    query: string, 
    session: CollaborationSession
  ): Promise<HeroAnalysis> {
    const startTime = Date.now();
    
    try {
      // 构建英雄提示
      const prompt = this.buildHeroPrompt(hero, query);
      
      // 模拟英雄分析（实际项目中这里会调用AI模型）
      const analysis = await this.simulateHeroAnalysis(hero, query, prompt);
      
      const result: HeroAnalysis = {
        heroId: hero.id,
        heroName: hero.name,
        query,
        analysis,
        confidence: this.calculateConfidence(analysis),
        executionTime: Date.now() - startTime,
        timestamp: new Date().toISOString()
      };

      session.addAnalysis(result);
      return result;
      
    } catch (error) {
      const errorResult: HeroAnalysis = {
        heroId: hero.id,
        heroName: hero.name,
        query,
        analysis: `分析失败: ${error instanceof Error ? error.message : String(error)}`,
        confidence: 0,
        executionTime: Date.now() - startTime,
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : String(error)
      };

      session.addAnalysis(errorResult);
      return errorResult;
    }
  }

  /**
   * 构建英雄提示
   */
  private buildHeroPrompt(hero: Hero, query: string): string {
    return `你现在是"${hero.name}"，你的角色设定如下：

**目标**: ${hero.goal}
**行为规则**: ${hero.rule}
${hero.description ? `**描述**: ${hero.description}` : ''}

请基于你的角色设定，对以下问题进行分析：

${query}

请提供结构化的分析结果，包括：
1. 核心观点
2. 关键发现
3. 风险提醒
4. 具体建议

请保持你的人格特色，用符合你角色的语调和思维方式进行分析。`;
  }

  /**
   * 模拟英雄分析
   */
  private async simulateHeroAnalysis(hero: Hero, query: string, prompt: string): Promise<string> {
    // 模拟分析延迟
    await new Promise(resolve => setTimeout(resolve, 500 + Math.random() * 1000));

    // 基于英雄特性生成模拟分析
    const analysis = this.generateSimulatedAnalysis(hero, query);
    
    return analysis;
  }

  /**
   * 生成模拟分析内容
   */
  private generateSimulatedAnalysis(hero: Hero, query: string): string {
    const templates = this.getHeroTemplates(hero);
    const template = templates[Math.floor(Math.random() * templates.length)];
    
    return template.replace('{query}', query).replace('{hero}', hero.name);
  }

  /**
   * 获取英雄分析模板
   */
  private getHeroTemplates(hero: Hero): string[] {
    // 根据英雄特性返回不同的分析模板
    if (this.isCriticalPersona(hero)) {
      return [
        '**核心观点**: 这个{query}存在明显的问题和风险，需要谨慎对待。\n**关键发现**: 我发现了几个关键的漏洞和不足之处。\n**风险提醒**: 如果不解决这些问题，后果可能很严重。\n**具体建议**: 建议立即停下来重新思考，不要盲目推进。',
        '**核心观点**: 看起来很美好，但现实往往更复杂。\n**关键发现**: 大家都太乐观了，没有考虑到潜在的困难。\n**风险提醒**: 这种想法可能过于理想化。\n**具体建议**: 先做小规模测试，验证可行性再说。'
      ];
    } else if (this.isCreativePersona(hero)) {
      return [
        '**核心观点**: 这个{query}很有创意潜力，可以从多个角度探索。\n**关键发现**: 我看到了很多有趣的可能性和机会。\n**风险提醒**: 要注意保持创新性，避免落入俗套。\n**具体建议**: 可以尝试一些大胆的想法，突破传统思维。',
        '**核心观点**: 这里有很大的创新空间！\n**关键发现**: 可以结合最新的趋势和技术。\n**风险提醒**: 不要被现有框架限制住想象力。\n**具体建议**: 建议头脑风暴，收集更多创意灵感。'
      ];
    } else {
      return [
        '**核心观点**: 对于{query}，我认为需要深入分析各个方面。\n**关键发现**: 通过仔细研究，我发现了一些重要的要点。\n**风险提醒**: 需要注意可能的挑战和限制。\n**具体建议**: 建议制定详细的计划，分步骤实施。',
        '**核心观点**: 这个问题值得认真对待和深入思考。\n**关键发现**: 从多个维度分析，我总结了以下要点。\n**风险提醒**: 要考虑到实施过程中的各种变数。\n**具体建议**: 建议先调研现状，再制定针对性方案。'
      ];
    }
  }

  /**
   * 计算分析可信度
   */
  private calculateConfidence(analysis: string): number {
    // 简化的可信度计算
    let confidence = 0.5;
    
    if (analysis.length > 100) confidence += 0.2;
    if (analysis.includes('具体建议')) confidence += 0.1;
    if (analysis.includes('风险')) confidence += 0.1;
    if (analysis.includes('数据') || analysis.includes('事实')) confidence += 0.1;
    
    return Math.min(1.0, confidence);
  }

  /**
   * 交叉验证分析结果
   */
  private async executeCrossValidation(analyses: HeroAnalysis[]): Promise<CrossValidationResult> {
    if (analyses.length < 2) {
      return {
        commonPoints: ['单一人格分析，无法进行交叉验证'],
        disagreements: [],
        confidenceScore: 0.7,
        recommendations: ['建议增加更多人格参与分析以提高可信度']
      };
    }

    // 1. 提取共同观点
    const commonPoints = this.extractCommonPoints(analyses);
    
    // 2. 识别分歧点
    const disagreements = this.identifyDisagreements(analyses);
    
    // 3. 综合建议
    const recommendations = this.synthesizeRecommendations(analyses);
    
    // 4. 计算置信度
    const confidenceScore = this.calculateValidationConfidence(commonPoints, disagreements, analyses);

    return {
      commonPoints,
      disagreements,
      confidenceScore,
      recommendations
    };
  }

  /**
   * 提取共同观点
   */
  private extractCommonPoints(analyses: HeroAnalysis[]): string[] {
    const allKeywords = analyses.map(analysis => 
      this.extractKeywords(analysis.analysis.toLowerCase())
    );

    // 找出在多个分析中都出现的关键词
    const keywordCounts = new Map<string, number>();
    allKeywords.flat().forEach(keyword => {
      keywordCounts.set(keyword, (keywordCounts.get(keyword) || 0) + 1);
    });

    const commonKeywords = Array.from(keywordCounts.entries())
      .filter(([_, count]) => count >= Math.ceil(analyses.length / 2))
      .map(([keyword, _]) => keyword);

    // 基于共同关键词生成观点
    const commonPoints: string[] = [];
    
    if (commonKeywords.includes('风险') || commonKeywords.includes('问题')) {
      commonPoints.push('多位分析师都识别出了潜在的风险和挑战');
    }
    
    if (commonKeywords.includes('机会') || commonKeywords.includes('优势')) {
      commonPoints.push('普遍认为存在积极的机会和优势');
    }
    
    if (commonKeywords.includes('建议') || commonKeywords.includes('推荐')) {
      commonPoints.push('各方都提出了具体的行动建议');
    }

    // 如果没有明显的共同点，返回通用观点
    if (commonPoints.length === 0) {
      commonPoints.push('各位分析师从不同角度提供了有价值的见解');
    }

    return commonPoints;
  }

  /**
   * 识别分歧点
   */
  private identifyDisagreements(analyses: HeroAnalysis[]): string[] {
    const disagreements: string[] = [];
    
    // 检查情感倾向的分歧
    const sentiments = analyses.map(analysis => this.analyzeSentiment(analysis.analysis));
    const positiveCount = sentiments.filter(s => s > 0.1).length;
    const negativeCount = sentiments.filter(s => s < -0.1).length;
    
    if (positiveCount > 0 && negativeCount > 0) {
      disagreements.push('对于整体前景存在乐观和悲观的不同观点');
    }

    // 检查建议的分歧
    const recommendations = analyses.map(analysis => this.extractRecommendations(analysis.analysis));
    const allRecommendations = recommendations.flat();
    const uniqueRecommendations = new Set(allRecommendations);
    
    if (uniqueRecommendations.size > allRecommendations.length * 0.7) {
      disagreements.push('在具体的行动建议上存在不同的方向和重点');
    }

    // 检查关键词的分歧
    const heroTypes = analyses.map(analysis => {
      const hero = analysis.heroName;
      if (hero.includes('暴躁') || hero.includes('批判')) return 'critical';
      if (hero.includes('粉丝') || hero.includes('支持')) return 'supportive';
      return 'neutral';
    });

    const hasCritical = heroTypes.includes('critical');
    const hasSupportive = heroTypes.includes('supportive');
    
    if (hasCritical && hasSupportive) {
      disagreements.push('批判性观点与支持性观点之间存在明显对比');
    }

    return disagreements;
  }

  /**
   * 综合建议
   */
  private synthesizeRecommendations(analyses: HeroAnalysis[]): string[] {
    const allRecommendations = analyses.flatMap(analysis => 
      this.extractRecommendations(analysis.analysis)
    );

    // 去重并优先选择出现频率高的建议
    const recommendationCounts = new Map<string, number>();
    allRecommendations.forEach(rec => {
      const key = rec.substring(0, 20); // 使用前20个字符作为去重键
      recommendationCounts.set(key, (recommendationCounts.get(key) || 0) + 1);
    });

    const synthesized = Array.from(recommendationCounts.entries())
      .sort(([_, a], [__, b]) => b - a)
      .slice(0, 3)
      .map(([key, count]) => {
        const fullRec = allRecommendations.find(rec => rec.startsWith(key)) || key;
        return count > 1 ? `${fullRec} (多位分析师建议)` : fullRec;
      });

    return synthesized.length > 0 ? synthesized : ['建议综合考虑各方观点，制定平衡的行动方案'];
  }

  /**
   * 计算验证置信度
   */
  private calculateValidationConfidence(
    commonPoints: string[], 
    disagreements: string[], 
    analyses: HeroAnalysis[]
  ): number {
    let confidence = 0.5;

    // 基于共同点数量调整
    confidence += Math.min(0.3, commonPoints.length * 0.1);

    // 基于分歧数量调整
    confidence -= Math.min(0.2, disagreements.length * 0.05);

    // 基于分析数量调整
    confidence += Math.min(0.2, (analyses.length - 1) * 0.05);

    // 基于个人分析置信度调整
    const avgHeroConfidence = analyses.reduce((sum, analysis) => sum + analysis.confidence, 0) / analyses.length;
    confidence = (confidence + avgHeroConfidence) / 2;

    return Math.max(0.1, Math.min(0.95, confidence));
  }

  /**
   * 简单的情感分析
   */
  private analyzeSentiment(text: string): number {
    const positiveWords = ['好', '优秀', '成功', '机会', '优势', '推荐', '可行', '有效', '积极', '正面'];
    const negativeWords = ['问题', '困难', '风险', '挑战', '不足', '缺点', '失败', '危险', '消极', '负面'];
    
    let score = 0;
    const words = text.split(/\s+/);
    
    words.forEach(word => {
      if (positiveWords.some(pw => word.includes(pw))) score += 1;
      if (negativeWords.some(nw => word.includes(nw))) score -= 1;
    });

    return words.length > 0 ? score / words.length : 0;
  }

  /**
   * 提取建议内容
   */
  private extractRecommendations(text: string): string[] {
    const recommendationPatterns = [
      /建议[：:](.+?)(?=[。！？\n]|$)/g,
      /推荐[：:](.+?)(?=[。！？\n]|$)/g,
      /应该(.+?)(?=[。！？\n]|$)/g,
      /可以(.+?)(?=[。！？\n]|$)/g,
      /需要(.+?)(?=[。！？\n]|$)/g
    ];

    const recommendations: string[] = [];
    
    recommendationPatterns.forEach(pattern => {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        const recommendation = match[1].trim();
        if (recommendation.length > 5) { // 过滤掉太短的建议
          recommendations.push(recommendation);
        }
      }
    });

    return recommendations;
  }

  private async synthesizeResults(analyses: HeroAnalysis[], crossValidation: CrossValidationResult): Promise<SynthesisResult> {
    // 简化的综合分析实现
    return {
      summary: '综合分析结果摘要',
      keyInsights: ['洞察1', '洞察2'],
      risks: ['风险1', '风险2'],
      opportunities: ['机会1', '机会2'],
      confidence: 0.85
    };
  }

  private async generateActionPlan(synthesis: SynthesisResult, query: string): Promise<ActionPlan> {
    // 简化的行动计划生成
    return {
      steps: [
        {
          id: 'step1',
          description: '第一步行动',
          priority: 1,
          estimatedTime: '1-2天',
          dependencies: []
        }
      ],
      timeline: '1-2周',
      priority: 'high',
      resources: ['资源1', '资源2']
    };
  }

  // 其他辅助方法的空实现（在实际项目中需要完整实现）
  private buildContextualQuery(query: string, context: string, round: number): string {
    return `${query}\n\n前面的分析：${context}`;
  }

  private assessQueryComplexity(query: string): number {
    return query.length > 100 ? 0.8 : 0.5;
  }

  private analyzeHeroTypes(heroes: Hero[]): { hasComplementary: boolean; hasCritical: boolean; hasCreative: boolean } {
    return {
      hasComplementary: heroes.length > 2,
      hasCritical: heroes.some(p => this.isCriticalPersona(p)),
      hasCreative: heroes.some(p => this.isCreativePersona(p))
    };
  }

  private async executeRoundTableDiscussion(heroes: Hero[], query: string, initialAnalyses: HeroAnalysis[], session: CollaborationSession): Promise<HeroAnalysis[]> {
    return []; // 简化实现
  }

  private buildDialogueContext(query: string, analyses: HeroAnalysis[], round: number): string {
    return query;
  }

  private addToHistory(session: CollaborationSession): void {
    this.sessionHistory.unshift(session);
    if (this.sessionHistory.length > this.maxHistorySize) {
      this.sessionHistory = this.sessionHistory.slice(0, this.maxHistorySize);
    }
  }

  /**
   * 获取活跃会话
   */
  getActiveSessions(): SessionInfo[] {
    return Array.from(this.activeSessions.values()).map(session => session.getSessionInfo());
  }

  /**
   * 获取会话历史
   */
  getSessionHistory(): SessionInfo[] {
    return this.sessionHistory.map(session => session.getSessionInfo());
  }
}

// 查询分析接口
interface QueryAnalysis {
  keywords: string[];
  type: QueryType;
  category?: string;
  needsCritical: boolean;
  needsCreative: boolean;
  needsAnalytical: boolean;
}

type QueryType = 'analysis' | 'creative' | 'problem' | 'strategy' | 'review' | 'general'; 