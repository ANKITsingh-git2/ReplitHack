import { Memory } from "./Memory";
import { Tool, formatTools } from "./tools/Tool";
import { LLMService } from "./LLMService";
import { RuleBasedPlanner } from "./RuleBasedPlanner";

export type Plan = { steps: Array<{ id: string; type: string; input: any }> };

export class Planner {
  private tools: Record<string, Tool>;
  private llm: LLMService;
  private ruleBased: RuleBasedPlanner;

  constructor(tools: Record<string, Tool>) {
    this.tools = tools;
    this.llm = new LLMService();
    this.ruleBased = new RuleBasedPlanner(tools);
  }

  async createPlan(goal: { text: string; meta?: any }, memory: Memory): Promise<Plan> {
    // Get relevant memory context
    const recentMemories = memory.query("goal_%").slice(0, 5);
    const memoryContext = recentMemories.length > 0
      ? `Recent goals: ${JSON.stringify(recentMemories.map(m => m.goal?.text || m)).substring(0, 500)}`
      : undefined;

    const toolsDescription = formatTools(this.tools);
    const plan = await this.llm.generatePlan(goal.text, toolsDescription, memoryContext);
    
    // If LLM failed, use rule-based planner
    if (!plan || !plan.steps || plan.steps.length === 0) {
      console.log("Using rule-based planner as fallback");
      return this.ruleBased.createPlan(goal.text);
    }
    
    return plan as Plan;
  }
}
