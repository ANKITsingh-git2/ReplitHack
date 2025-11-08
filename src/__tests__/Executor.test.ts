import { Executor } from '../agents/Executor';
import { Memory } from '../agents/Memory';
import { Tool } from '../agents/tools/Tool';

describe('Executor', () => {
  let executor: Executor;
  let memory: Memory;
  let mockTools: Record<string, Tool>;

  beforeEach(() => {
    memory = new Memory(':memory:');
    mockTools = {
      test_tool: {
        name: 'test_tool',
        description: 'Test tool',
        inputSchema: { input: 'string' },
        async execute(input: any) {
          return { ok: true, result: input.input };
        },
      },
    };
    executor = new Executor(mockTools);
  });

  test('should execute a tool', async () => {
    const result = await executor.execute(
      { id: '1', type: 'test_tool', input: { input: 'test' } },
      memory
    );

    expect(result.ok).toBe(true);
    expect(result.result).toBe('test');
  });

  test('should handle simulate mode', async () => {
    const result = await executor.execute(
      { id: '1', type: 'test_tool', input: { input: 'test' } },
      memory,
      { simulate: true }
    );

    expect(result.simulated).toBe(true);
  });

  test('should handle unknown tool', async () => {
    const result = await executor.execute(
      { id: '1', type: 'unknown_tool', input: {} },
      memory
    );

    expect(result.error).toBeDefined();
  });
});

