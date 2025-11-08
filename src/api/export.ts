import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { AgentDB } from "../db/AgentDB";
import { Memory } from "../agents/Memory";
import { AuthRequest, authenticateToken } from "./auth";

export function registerExportRoutes(
  server: FastifyInstance,
  agentDB: AgentDB
) {
  // Export agent data
  server.get("/api/export/agent/:id", { preHandler: authenticateToken }, async (req: AuthRequest, reply: FastifyReply) => {
    const params = req.params as { id: string };
    const agentRecord = agentDB.getAgent(params.id);
    
    if (!agentRecord || agentRecord.userId !== req.user!.id) {
      reply.code(404);
      return { error: "Agent not found" };
    }

    try {
      const memory = new Memory(`memory_${params.id}.db`);
      const memories = memory.dump();
      
      const exportData = {
        agent: {
          id: agentRecord.id,
          name: agentRecord.name,
          type: agentRecord.type,
          config: agentRecord.config,
          createdAt: agentRecord.createdAt,
        },
        memories: memories.map((m: any) => ({
          key: m.key,
          value: typeof m.value === 'string' ? JSON.parse(m.value) : m.value,
          timestamp: m.ts,
        })),
        exportedAt: Date.now(),
        version: "1.0",
      };

      reply.header('Content-Type', 'application/json');
      reply.header('Content-Disposition', `attachment; filename="agent_${params.id}_${Date.now()}.json"`);
      return exportData;
    } catch (error: any) {
      reply.code(500);
      return { error: error.message };
    }
  });

  // Import agent data
  server.post("/api/import/agent", { preHandler: authenticateToken }, async (req: AuthRequest, reply: FastifyReply) => {
    const body = req.body as any;
    
    if (!body.agent || !body.memories) {
      reply.code(400);
      return { error: "Invalid import data" };
    }

    try {
      // Create new agent from import
      const agentRecord = agentDB.createAgent(
        req.user!.id,
        body.agent.type || "travel_planner",
        body.agent.name || "Imported Agent",
        body.agent.config || {}
      );

      // Import memories
      const memory = new Memory(`memory_${agentRecord.id}.db`);
      for (const mem of body.memories) {
        memory.add(mem.key, mem.value);
      }

      return {
        success: true,
        agentId: agentRecord.id,
        importedMemories: body.memories.length,
      };
    } catch (error: any) {
      reply.code(500);
      return { error: error.message };
    }
  });
}

