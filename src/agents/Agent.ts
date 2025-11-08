import { Planner } from "./Planner";
import { Memory } from "./Memory";
import { Executor } from "./Executor";
import { v4 as uuid } from "uuid";
import { GoalQueue } from "./GoalQueue";

export type Goal = { id?: string; text: string; meta?: any };

export abstract class Agent {
  id: string;
  memory: Memory;
  planner: Planner;
  executor: Executor;
  private goalQueue: GoalQueue;

  constructor(id: string, memory: Memory, planner: Planner, executor: Executor) {
    this.id = id;
    this.memory = memory;
    this.planner = planner;
    this.executor = executor;
    this.goalQueue = new GoalQueue();
  }

  addGoal(goal: Goal) {
    this.goalQueue.add(goal);
  }

  start() {
    this.goalQueue.process(this._handleGoal.bind(this));
  }

  async handleGoal(goal: Goal, options?: { simulate?: boolean; timeout?: number; retries?: number }) {
    const goalId = goal.id || uuid();
    const plan = await this.planner.createPlan(goal, this.memory);
    const trace = [];

    this.memory.add(`goal_${goalId}`, { goal, plan, status: 'in_progress' });

    for (const step of plan.steps) {
      const res = await this.executor.execute(step, this.memory, {
        simulate: options?.simulate,
        timeout: options?.timeout,
        retries: options?.retries,
      });
      trace.push({ step, res, timestamp: Date.now() });
      if (res.error) break;
    }

    const result = {
      goalId,
      plan,
      trace,
      status: trace.some(t => t.res.error) ? 'failed' : 'completed',
      completedAt: Date.now(),
    };

    this.memory.add(`goal_${goalId}_result`, result);
    return result;
  }

  private async _handleGoal(goal: Goal) {
    return this.handleGoal(goal);
  }
}
