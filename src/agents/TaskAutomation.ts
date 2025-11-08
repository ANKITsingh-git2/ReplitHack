import { Agent } from "./Agent";

export class TaskAutomation extends Agent {
  // Task automation bot with memory and reasoning
  async automateTask(task: string, context?: any) {
    return this.handleGoal({
      text: `Automate this task: ${task}`,
      meta: { type: 'automation', context }
    });
  }

  async rememberTask(task: string, details: any) {
    this.memory.add(`task_${Date.now()}`, {
      task,
      details,
      timestamp: Date.now()
    });
  }

  async recallTasks(pattern?: string) {
    const tasks = this.memory.query(pattern ? `task_%${pattern}%` : 'task_%');
    return tasks;
  }
}

