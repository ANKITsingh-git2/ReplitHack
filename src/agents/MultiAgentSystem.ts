import { Agent } from "./Agent";
import { Goal } from "./Agent";
import { Memory } from "./Memory";
import { Planner } from "./Planner";
import { Executor } from "./Executor";
import { Tool } from "./tools/Tool";

export interface AgentRegistry {
  [agentId: string]: Agent;
}

export class MultiAgentSystem {
  private agents: AgentRegistry = {};
  private agentMemories: Map<string, Memory> = new Map();

  registerAgent(agentId: string, agent: Agent) {
    this.agents[agentId] = agent;
  }

  getAgent(agentId: string): Agent | undefined {
    return this.agents[agentId];
  }

  async delegateGoal(fromAgentId: string, toAgentId: string, goal: Goal): Promise<any> {
    const toAgent = this.agents[toAgentId];
    if (!toAgent) {
      throw new Error(`Agent ${toAgentId} not found`);
    }

    // Share relevant context from source agent
    const fromAgent = this.agents[fromAgentId];
    if (fromAgent) {
      const sharedContext = fromAgent.memory.query("goal_").slice(0, 3);
      sharedContext.forEach((ctx) => {
        toAgent.memory.add(`delegated_context_${fromAgentId}`, ctx);
      });
    }

    const result = await toAgent.handleGoal(goal);
    
    // Share result back to source agent
    if (fromAgent) {
      fromAgent.memory.add(`delegated_result_${toAgentId}_${goal.id}`, result);
    }

    return result;
  }

  async broadcastGoal(goal: Goal, agentIds?: string[]): Promise<Map<string, any>> {
    const targets = agentIds || Object.keys(this.agents);
    const results = new Map<string, any>();

    await Promise.all(
      targets.map(async (agentId) => {
        const agent = this.agents[agentId];
        if (agent) {
          try {
            const result = await agent.handleGoal(goal);
            results.set(agentId, result);
          } catch (error: any) {
            results.set(agentId, { error: error.message });
          }
        }
      })
    );

    return results;
  }

  listAgents(): string[] {
    return Object.keys(this.agents);
  }
}

