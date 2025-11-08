import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { UserDB } from "../db/UserDB";
import { AgentDB } from "../db/AgentDB";
import { Memory } from "../agents/Memory";
import { Planner } from "../agents/Planner";
import { Executor } from "../agents/Executor";
import { TravelPlanner } from "../agents/TravelPlanner";
import { CareerCoach } from "../agents/CareerCoach";
import { StudyBuddy } from "../agents/StudyBuddy";
import { TaskAutomation } from "../agents/TaskAutomation";
import { Tool } from "../agents/tools/Tool";
import { ToolAuthorization } from "../agents/tools/ToolAuthorization";
import { MultiAgentSystem } from "../agents/MultiAgentSystem";
import { AuthRequest, authenticateToken } from "./auth";
import { v4 as uuid } from "uuid";

export function registerRoutes(
  server: FastifyInstance,
  userDB: UserDB,
  agentDB: AgentDB,
  tools: Record<string, Tool>,
  multiAgentSystem: MultiAgentSystem
) {
  const toolAuth = new ToolAuthorization(userDB);
  const agentMemories: Map<string, Memory> = new Map();
  const agentInstances: Map<string, any> = new Map();

  function getOrCreateAgent(agentId: string, userId: string): any {
    if (agentInstances.has(agentId)) {
      return agentInstances.get(agentId)!;
    }

    const agentRecord = agentDB.getAgent(agentId);
    if (!agentRecord) {
      throw new Error('Agent not found');
    }

    const memory = new Memory(`memory_${agentId}.db`);
    agentMemories.set(agentId, memory);
    const planner = new Planner(tools);
    const executor = new Executor(tools);
    
    let agent: any;
    switch (agentRecord.type) {
      case 'career_coach':
        agent = new CareerCoach(agentId, memory, planner, executor);
        break;
      case 'study_buddy':
        agent = new StudyBuddy(agentId, memory, planner, executor);
        break;
      case 'task_automation':
        agent = new TaskAutomation(agentId, memory, planner, executor);
        break;
      case 'travel_planner':
      default:
        agent = new TravelPlanner(agentId, memory, planner, executor);
        break;
    }
    
    agentInstances.set(agentId, agent);
    multiAgentSystem.registerAgent(agentId, agent);
    return agent;
  }

  // Auth routes
  server.post("/api/auth/register", async (req: FastifyRequest, reply: FastifyReply) => {
    const authRoutes = await import("./auth");
    return authRoutes.createAuthRoutes(userDB).register(req, reply);
  });

  server.post("/api/auth/login", async (req: FastifyRequest, reply: FastifyReply) => {
    const authRoutes = await import("./auth");
    return authRoutes.createAuthRoutes(userDB).login(req, reply);
  });

  // User routes
  server.get("/api/user/profile", { preHandler: authenticateToken }, async (req: AuthRequest, reply: FastifyReply) => {
    const user = userDB.getUser(req.user!.id);
    if (!user) {
      reply.code(404);
      return { error: "User not found" };
    }
    return { id: user.id, email: user.email, role: user.role, preferences: user.preferences };
  });

  server.put("/api/user/preferences", { preHandler: authenticateToken }, async (req: AuthRequest, reply: FastifyReply) => {
    const body = req.body as { preferences: Record<string, any> };
    userDB.updatePreferences(req.user!.id, body.preferences);
    return { success: true };
  });

  // Agent routes
  server.post("/api/agents", { preHandler: authenticateToken }, async (req: AuthRequest, reply: FastifyReply) => {
    const body = req.body as { type: string; name: string; config?: Record<string, any> };
    const agentRecord = agentDB.createAgent(req.user!.id, body.type, body.name, body.config || {});
    return agentRecord;
  });

  server.get("/api/agents", { preHandler: authenticateToken }, async (req: AuthRequest, reply: FastifyReply) => {
    const agents = agentDB.getUserAgents(req.user!.id);
    return { agents };
  });

  server.get("/api/agents/:id", { preHandler: authenticateToken }, async (req: AuthRequest, reply: FastifyReply) => {
    const params = req.params as { id: string };
    const agentRecord = agentDB.getAgent(params.id);
    if (!agentRecord || agentRecord.userId !== req.user!.id) {
      reply.code(404);
      return { error: "Agent not found" };
    }
    return agentRecord;
  });

  server.delete("/api/agents/:id", { preHandler: authenticateToken }, async (req: AuthRequest, reply: FastifyReply) => {
    const params = req.params as { id: string };
    const agentRecord = agentDB.getAgent(params.id);
    if (!agentRecord || agentRecord.userId !== req.user!.id) {
      reply.code(404);
      return { error: "Agent not found" };
    }
    agentDB.deleteAgent(params.id);
    agentInstances.delete(params.id);
    agentMemories.delete(params.id);
    return { success: true };
  });

  // Goal/Message routes
  server.post("/api/agents/:id/goal", { preHandler: authenticateToken }, async (req: AuthRequest, reply: FastifyReply) => {
    const params = req.params as { id: string };
    const body = req.body as { text: string; meta?: any; simulate?: boolean };
    
    const agentRecord = agentDB.getAgent(params.id);
    if (!agentRecord || agentRecord.userId !== req.user!.id) {
      reply.code(404);
      return { error: "Agent not found" };
    }

    const agent = getOrCreateAgent(params.id, req.user!.id);
    agentDB.updateLastActive(params.id);
    
    userDB.auditLog(req.user!.id, "goal_submitted", "agent", params.id, { goal: body.text });

    const result = await agent.handleGoal(
      { id: uuid(), text: body.text, meta: body.meta },
      { simulate: body.simulate }
    );

    return result;
  });

  // Memory routes
  server.get("/api/agents/:id/memory", { preHandler: authenticateToken }, async (req: AuthRequest, reply: FastifyReply) => {
    const params = req.params as { id: string };
    const agentRecord = agentDB.getAgent(params.id);
    if (!agentRecord || agentRecord.userId !== req.user!.id) {
      reply.code(404);
      return { error: "Agent not found" };
    }

    const agent = getOrCreateAgent(params.id, req.user!.id);
    return agent.memory.dump();
  });

  // Multi-agent routes
  server.post("/api/agents/:id/delegate", { preHandler: authenticateToken }, async (req: AuthRequest, reply: FastifyReply) => {
    const params = req.params as { id: string };
    const body = req.body as { toAgentId: string; goal: { text: string; meta?: any } };
    
    const fromAgent = getOrCreateAgent(params.id, req.user!.id);
    const result = await multiAgentSystem.delegateGoal(params.id, body.toAgentId, {
      id: uuid(),
      text: body.goal.text,
      meta: body.goal.meta,
    });

    return result;
  });

  server.get("/api/agents/list", { preHandler: authenticateToken }, async (req: AuthRequest, reply: FastifyReply) => {
    return { agents: multiAgentSystem.listAgents() };
  });

  // Audit logs
  server.get("/api/audit", { preHandler: authenticateToken }, async (req: AuthRequest, reply: FastifyReply) => {
    const user = userDB.getUser(req.user!.id);
    if (user?.role !== "admin") {
      reply.code(403);
      return { error: "Admin access required" };
    }

    const logs = userDB.getAuditLogs(undefined, 100);
    return { logs };
  });

  // Tools routes
  server.get("/api/tools", { preHandler: authenticateToken }, async (req: AuthRequest, reply: FastifyReply) => {
    const authorizedTools = toolAuth.getAuthorizedTools(req.user!.id);
    const toolList = Object.entries(tools)
      .filter(([name]) => authorizedTools.includes(name))
      .map(([name, tool]) => ({
        name: tool.name,
        description: tool.description,
        inputSchema: tool.inputSchema,
      }));

    return { tools: toolList };
  });
}

