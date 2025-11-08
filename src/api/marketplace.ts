import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { AgentDB } from "../db/AgentDB";
import { AuthRequest, authenticateToken } from "./auth";

export const AGENT_TEMPLATES = [
  {
    id: "travel-planner-basic",
    name: "Basic Travel Planner",
    description: "Simple travel planning agent for flights and hotels",
    type: "travel_planner",
    config: {
      tools: ["search_flights", "search_hotels"],
      preferences: {
        defaultNights: 2,
        preferredClass: "economy",
      },
    },
    icon: "✈️",
    category: "travel",
  },
  {
    id: "travel-planner-advanced",
    name: "Advanced Travel Planner",
    description: "Comprehensive travel planning with web research",
    type: "travel_planner",
    config: {
      tools: ["search_flights", "search_hotels", "web_scraper"],
      preferences: {
        defaultNights: 3,
        preferredClass: "business",
        includeResearch: true,
      },
    },
    icon: "🌍",
    category: "travel",
  },
  {
    id: "business-traveler",
    name: "Business Travel Agent",
    description: "Optimized for quick business trips",
    type: "travel_planner",
    config: {
      tools: ["search_flights", "search_hotels"],
      preferences: {
        defaultNights: 1,
        preferredClass: "business",
        prioritizeSpeed: true,
      },
    },
    icon: "💼",
    category: "business",
  },
  {
    id: "budget-traveler",
    name: "Budget Travel Planner",
    description: "Finds the best deals and cheapest options",
    type: "travel_planner",
    config: {
      tools: ["search_flights", "search_hotels"],
      preferences: {
        defaultNights: 2,
        preferredClass: "economy",
        prioritizePrice: true,
      },
    },
    icon: "💰",
    category: "budget",
  },
  {
    id: "career-coach",
    name: "Career Coach",
    description: "Provides career guidance, skills, and career path advice",
    type: "career_coach",
    config: {
      tools: ["career_guidance", "web_scraper"],
      preferences: {
        focusAreas: ["skills", "career_path", "salary", "companies"],
      },
    },
    icon: "🎯",
    category: "career",
  },
  {
    id: "study-buddy",
    name: "Study Buddy",
    description: "Explains topics, creates quizzes, and schedules study sessions",
    type: "study_buddy",
    config: {
      tools: ["explain_topic", "create_quiz", "schedule_study", "web_scraper"],
      preferences: {
        studyStyle: "comprehensive",
        quizDifficulty: "medium",
      },
    },
    icon: "📚",
    category: "education",
  },
  {
    id: "task-automation",
    name: "Task Automation Bot",
    description: "Automates tasks with memory and reasoning capabilities",
    type: "task_automation",
    config: {
      tools: ["automate_task", "web_scraper"],
      preferences: {
        memoryEnabled: true,
        reasoningLevel: "advanced",
      },
    },
    icon: "🤖",
    category: "automation",
  },
];

export function registerMarketplaceRoutes(
  server: FastifyInstance,
  agentDB: AgentDB
) {
  // Get all templates
  server.get("/api/marketplace/templates", async (req: FastifyRequest, reply: FastifyReply) => {
    return { templates: AGENT_TEMPLATES };
  });

  // Get specific template
  server.get("/api/marketplace/templates/:id", async (req: FastifyRequest, reply: FastifyReply) => {
    const params = req.params as { id: string };
    const template = AGENT_TEMPLATES.find(t => t.id === params.id);
    if (!template) {
      reply.code(404);
      return { error: "Template not found" };
    }
    return template;
  });

  // Create agent from template
  server.post("/api/marketplace/templates/:id/create", { preHandler: authenticateToken }, async (req: AuthRequest, reply: FastifyReply) => {
    const params = req.params as { id: string };
    const body = req.body as { name?: string };
    const template = AGENT_TEMPLATES.find(t => t.id === params.id);
    
    if (!template) {
      reply.code(404);
      return { error: "Template not found" };
    }

    const agentRecord = agentDB.createAgent(
      req.user!.id,
      template.type,
      body.name || template.name,
      template.config
    );

    return {
      success: true,
      agent: agentRecord,
      template: template.id,
    };
  });
}

