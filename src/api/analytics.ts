import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { UserDB } from "../db/UserDB";
import { AgentDB } from "../db/AgentDB";
import { Memory } from "../agents/Memory";
import { AuthRequest, authenticateToken } from "./auth";

export function registerAnalyticsRoutes(
  server: FastifyInstance,
  userDB: UserDB,
  agentDB: AgentDB
) {
  // Get analytics for user
  server.get("/api/analytics", { preHandler: authenticateToken }, async (req: AuthRequest, reply: FastifyReply) => {
    const userId = req.user!.id;
    const userAgents = agentDB.getUserAgents(userId);
    
    // Calculate stats
    let totalGoals = 0;
    let completedGoals = 0;
    let failedGoals = 0;
    const agentStats: any[] = [];

    for (const agent of userAgents) {
      try {
        const memory = new Memory(`memory_${agent.id}.db`);
        const memories = memory.dump();
        const goals = memories.filter((m: any) => m.key?.startsWith('goal_') && m.key?.endsWith('_result'));
        
        const completed = goals.filter((g: any) => {
          try {
            const value = JSON.parse(g.value);
            return value.status === 'completed';
          } catch {
            return false;
          }
        }).length;
        
        const failed = goals.filter((g: any) => {
          try {
            const value = JSON.parse(g.value);
            return value.status === 'failed';
          } catch {
            return false;
          }
        }).length;

        totalGoals += goals.length;
        completedGoals += completed;
        failedGoals += failed;

        agentStats.push({
          agentId: agent.id,
          agentName: agent.name,
          totalGoals: goals.length,
          completed,
          failed,
          successRate: goals.length > 0 ? (completed / goals.length * 100).toFixed(1) : 0,
        });
      } catch (error) {
        // Agent memory might not exist yet
      }
    }

    return {
      totalAgents: userAgents.length,
      totalGoals,
      completedGoals,
      failedGoals,
      successRate: totalGoals > 0 ? ((completedGoals / totalGoals) * 100).toFixed(1) : 0,
      agentStats,
    };
  });

  // Get agent performance metrics
  server.get("/api/analytics/agent/:id", { preHandler: authenticateToken }, async (req: AuthRequest, reply: FastifyReply) => {
    const params = req.params as { id: string };
    const agentRecord = agentDB.getAgent(params.id);
    
    if (!agentRecord || agentRecord.userId !== req.user!.id) {
      reply.code(404);
      return { error: "Agent not found" };
    }

    try {
      const memory = new Memory(`memory_${params.id}.db`);
      const memories = memory.dump();
      const goals = memories.filter((m: any) => m.key?.startsWith('goal_') && m.key?.endsWith('_result'));
      
      const goalDetails = goals.map((g: any) => {
        try {
          return JSON.parse(g.value);
        } catch {
          return null;
        }
      }).filter(Boolean);

      const avgSteps = goalDetails.length > 0
        ? (goalDetails.reduce((sum: number, g: any) => sum + (g.plan?.steps?.length || 0), 0) / goalDetails.length).toFixed(1)
        : 0;

      const avgExecutionTime = goalDetails.length > 0
        ? goalDetails
            .filter((g: any) => g.completedAt && g.trace?.[0]?.timestamp)
            .map((g: any) => (g.completedAt - g.trace[0].timestamp) / 1000)
            .reduce((sum: number, t: number) => sum + t, 0) / goalDetails.length
        : 0;

      return {
        agentId: params.id,
        totalGoals: goals.length,
        avgStepsPerPlan: avgSteps,
        avgExecutionTimeSeconds: avgExecutionTime.toFixed(2),
        goalDetails: goalDetails.slice(0, 10), // Last 10 goals
      };
    } catch (error: any) {
      return {
        agentId: params.id,
        totalGoals: 0,
        avgStepsPerPlan: 0,
        avgExecutionTimeSeconds: 0,
        goalDetails: [],
      };
    }
  });
}

