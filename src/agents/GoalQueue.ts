import { Goal } from "./Agent";

export class GoalQueue {
  private queue: Goal[] = [];
  private processing = false;
  private handler?: (goal: Goal) => Promise<any>;

  add(goal: Goal) {
    this.queue.push(goal);
    this.process();
  }

  async process(handler?: (goal: Goal) => Promise<any>) {
    if (handler) this.handler = handler;
    if (this.processing || !this.handler) return;
    this.processing = true;
    while (this.queue.length > 0) {
      const goal = this.queue.shift();
      if (goal) {
        await this.handler(goal);
      }
    }
    this.processing = false;
  }
}
