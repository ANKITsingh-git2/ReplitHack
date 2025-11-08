export interface Tool {
  name: string;
  description: string;
  inputSchema: object;
  execute(input: any, memory?: any): Promise<any>;
}

export function formatTools(tools: Record<string, Tool>): string {
  return Object.values(tools).map(tool => `- ${tool.name}: ${tool.description}. Input: ${JSON.stringify(tool.inputSchema)}`).join('\n');
}