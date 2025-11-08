import { Memory } from "./Memory";
import { Tool } from "./tools/Tool";

export interface ExecutionOptions {
  retries?: number;
  timeout?: number;
  simulate?: boolean;
  concurrency?: number;
}

export class Executor {
  tools: Record<string, Tool>;
  private activeExecutions: Map<string, Promise<any>> = new Map();
  private maxConcurrency: number;

  constructor(tools: Record<string, Tool>, maxConcurrency: number = 3) {
    this.tools = tools;
    this.maxConcurrency = maxConcurrency;
  }

  async execute(
    step: { id: string; type: string; input: any },
    memory: Memory,
    options: ExecutionOptions = {}
  ) {
    const { retries = 3, timeout = 30000, simulate = false } = options;

    if (simulate) {
      return this.simulateExecution(step);
    }

    const executionKey = `${step.id}_${step.type}`;
    
    // Check if already executing
    if (this.activeExecutions.has(executionKey)) {
      return await this.activeExecutions.get(executionKey);
    }

    const executionPromise = this.executeWithRetry(step, memory, retries, timeout);
    this.activeExecutions.set(executionKey, executionPromise);

    try {
      const result = await executionPromise;
      return result;
    } finally {
      this.activeExecutions.delete(executionKey);
    }
  }

  private async executeWithRetry(
    step: { id: string; type: string; input: any },
    memory: Memory,
    retries: number,
    timeout: number
  ) {
    for (let i = 0; i < retries; i++) {
      try {
        const tool = this.tools[step.type];

        if (tool) {
          const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error("Tool execution timed out")), timeout)
          );
          const result = await Promise.race([
            tool.execute(step.input, memory),
            timeoutPromise,
          ]);
          // Optionally add result to memory
          memory.add(`last_result_${step.type}`, result);
          return result;
        } else if (step.type === "respond") {
          return { ok: true, text: "Response: " + (step.input.text || "") };
        }
        return { error: `Unknown step type ${step.type}` };
      } catch (err: any) {
        if (i < retries - 1) {
          await new Promise((r) => setTimeout(r, 1000 * (i + 1))); // Exponential backoff
        } else {
          return { error: err.message || String(err) };
        }
      }
    }
  }

  private async simulateExecution(step: { id: string; type: string; input: any }) {
    await new Promise((r) => setTimeout(r, 500)); // Simulate delay
    return {
      ok: true,
      simulated: true,
      step: step.type,
      message: `Simulated execution of ${step.type}`,
    };
  }

  async executeConcurrent(steps: Array<{ id: string; type: string; input: any }>, memory: Memory, options: ExecutionOptions = {}) {
    const results: any[] = [];
    const concurrency = options.concurrency || this.maxConcurrency;
    const chunks: Array<Array<{ id: string; type: string; input: any }>> = [];

    // Split into chunks
    for (let i = 0; i < steps.length; i += concurrency) {
      chunks.push(steps.slice(i, i + concurrency));
    }

    // Execute chunks sequentially, steps within chunk concurrently
    for (const chunk of chunks) {
      const chunkResults = await Promise.all(
        chunk.map(step => this.execute(step, memory, options))
      );
      results.push(...chunkResults);
    }

    return results;
  }
}
