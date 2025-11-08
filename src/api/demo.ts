import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { AuthRequest, authenticateToken } from "./auth";

export const DEMO_SCENARIOS = [
  {
    id: "goa-trip",
    name: "Plan a Trip to Goa",
    description: "Complete travel planning for a beach vacation",
    goal: "Plan a trip to Goa for next month with flights and hotels",
    expectedSteps: 3,
    agentType: "travel_planner",
  },
  {
    id: "business-travel",
    name: "Business Travel Planning",
    description: "Quick business trip with hotel booking",
    goal: "Find hotels in Mumbai for 2 nights for a business trip",
    expectedSteps: 2,
    agentType: "travel_planner",
  },
  {
    id: "career-guidance",
    name: "Career Guidance",
    description: "Get career advice for software engineering",
    goal: "I want to become a software engineer, provide career guidance",
    expectedSteps: 2,
    agentType: "career_coach",
  },
  {
    id: "explain-javascript",
    name: "Explain JavaScript",
    description: "Learn JavaScript concepts",
    goal: "Explain JavaScript programming language",
    expectedSteps: 2,
    agentType: "study_buddy",
  },
  {
    id: "create-quiz",
    name: "Create Quiz",
    description: "Generate a quiz on Python",
    goal: "Create a quiz on Python with 5 questions",
    expectedSteps: 2,
    agentType: "study_buddy",
  },
  {
    id: "study-schedule",
    name: "Study Schedule",
    description: "Create a study schedule for machine learning",
    goal: "Schedule a 2 hour study session for machine learning",
    expectedSteps: 2,
    agentType: "study_buddy",
  },
  {
    id: "automate-email",
    name: "Automate Email Task",
    description: "Automate email sending task",
    goal: "Automate the task of sending daily email reports",
    expectedSteps: 2,
    agentType: "task_automation",
  },
  {
    id: "web-scrape",
    name: "Web Scraping",
    description: "Scrape content from a website",
    goal: "Scrape content from https://example.com",
    expectedSteps: 2,
    agentType: "task_automation",
  },
];

export function registerDemoRoutes(server: FastifyInstance) {
  // Get all demo scenarios
  server.get("/api/demo/scenarios", async (req: FastifyRequest, reply: FastifyReply) => {
    return { scenarios: DEMO_SCENARIOS };
  });

  // Get specific scenario
  server.get("/api/demo/scenarios/:id", async (req: FastifyRequest, reply: FastifyReply) => {
    const params = req.params as { id: string };
    const scenario = DEMO_SCENARIOS.find(s => s.id === params.id);
    if (!scenario) {
      reply.code(404);
      return { error: "Scenario not found" };
    }
    return scenario;
  });
}

