import { Agent } from '../agents/Agent';
import { Memory } from '../agents/Memory';
import { Planner } from '../agents/Planner';
import { Executor } from '../agents/Executor';
import { TravelPlanner } from '../agents/TravelPlanner';
import { Tool } from '../agents/tools/Tool';

describe('Agent', () => {
  let memory: Memory;
  let planner: Planner;
  let executor: Executor;
  let agent: TravelPlanner;
  let mockTools: Record<string, Tool>;

  beforeEach(() => {
    memory = new Memory(':memory:');
    mockTools = {
      respond: {
        name: 'respond',
        description: 'Respond to user',
        inputSchema: { text: 'string' },
        async execute(input: any) {
          return { ok: true, text: input.text };
        },
      },
    };
    planner = new Planner(mockTools);
    executor = new Executor(mockTools);
    agent = new TravelPlanner('test-agent', memory, planner, executor);
  });

  test('should handle a simple goal', async () => {
    const result = await agent.handleGoal({
      text: 'Test goal',
      meta: {},
    }, { simulate: true });

    expect(result).toBeDefined();
    expect(result.goalId).toBeDefined();
    expect(result.plan).toBeDefined();
    expect(result.status).toBeDefined();
  });

  test('should store goal in memory', async () => {
    await agent.handleGoal({
      text: 'Test goal',
    }, { simulate: true });

    const memories = memory.query('goal_');
    expect(memories.length).toBeGreaterThan(0);
  });
});

