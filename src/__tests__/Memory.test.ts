import { Memory } from '../agents/Memory';

describe('Memory', () => {
  let memory: Memory;

  beforeEach(() => {
    memory = new Memory(':memory:');
  });

  test('should store and retrieve values', () => {
    memory.add('test_key', { value: 'test_value' });
    const result = memory.query('test_key');
    expect(result.length).toBe(1);
    expect(result[0].value).toBe('test_value');
  });

  test('should handle multiple values for same key', () => {
    memory.add('test_key', { value: 'value1' });
    memory.add('test_key', { value: 'value2' });
    const result = memory.query('test_key');
    expect(result.length).toBe(2);
  });

  test('should dump all memories', () => {
    memory.add('key1', { value: 1 });
    memory.add('key2', { value: 2 });
    const dump = memory.dump();
    expect(dump.length).toBe(2);
  });
});

