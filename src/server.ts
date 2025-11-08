import 'dotenv/config';
import Fastify from "fastify";
import cors from "@fastify/cors";
import path from "path";
import fastifyStatic from "@fastify/static";
import websocket from "@fastify/websocket";
import { Tool } from './agents/tools/Tool';
import { WebScraperTool } from './agents/tools/WebScraperTool';
import { FlightTool } from './agents/tools/FlightTool';
import { HotelTool } from './agents/tools/HotelTool';
import { WeatherTool } from './agents/tools/WeatherTool';
import { PlacesTool } from './agents/tools/PlacesTool';
import { CareerTool } from './agents/tools/CareerTool';
import { ExplainTool, QuizTool, ScheduleTool } from './agents/tools/StudyTool';
import { AutomationTool } from './agents/tools/AutomationTool';
import { UserDB } from "./db/UserDB";
import { AgentDB } from "./db/AgentDB";
import { MultiAgentSystem } from "./agents/MultiAgentSystem";
import { registerRoutes } from "./api/routes";
import { registerAnalyticsRoutes } from "./api/analytics";
import { registerDemoRoutes } from "./api/demo";
import { registerExportRoutes } from "./api/export";
import { registerMarketplaceRoutes } from "./api/marketplace";
import { authenticateToken, AuthRequest } from "./api/auth";
import { TelegramBotService } from "./bot/TelegramBot";

const server = Fastify({ logger: true });
server.register(cors, { origin: "*" });
server.register(websocket);

server.register(fastifyStatic, {
  root: path.join(__dirname, '..', 'public'),
});

server.get('/', (req, reply) => {
  reply.sendFile('index.html');
});

// Initialize databases
const userDB = new UserDB();
const agentDB = new AgentDB();

// Register all available tools
const tools: Record<string, Tool> = {
  [FlightTool.name]: FlightTool,
  [HotelTool.name]: HotelTool,
  [WeatherTool.name]: WeatherTool,
  [PlacesTool.name]: PlacesTool,
  [WebScraperTool.name]: WebScraperTool,
  [CareerTool.name]: CareerTool,
  [ExplainTool.name]: ExplainTool,
  [QuizTool.name]: QuizTool,
  [ScheduleTool.name]: ScheduleTool,
  [AutomationTool.name]: AutomationTool,
};

// Initialize multi-agent system
const multiAgentSystem = new MultiAgentSystem();

// Register API routes
registerRoutes(server, userDB, agentDB, tools, multiAgentSystem);
registerAnalyticsRoutes(server, userDB, agentDB);
registerDemoRoutes(server);
registerExportRoutes(server, agentDB);
registerMarketplaceRoutes(server, agentDB);

// WebSocket endpoint for live updates
server.register(async function (fastify) {
  fastify.get('/ws/:agentId', { websocket: true }, (connection: any, req: AuthRequest) => {
    const params = req.params as { agentId: string };
    const agentId = params.agentId;

    connection.socket.on('message', async (message: Buffer) => {
      try {
        const data = JSON.parse(message.toString());
        
        if (data.type === 'subscribe') {
          // Handle subscription to agent updates
          connection.socket.send(JSON.stringify({
            type: 'subscribed',
            agentId,
          }));
        }
      } catch (error: any) {
        connection.socket.send(JSON.stringify({
          type: 'error',
          message: error.message,
        }));
      }
    });

    connection.socket.on('close', () => {
      console.log(`WebSocket connection closed for agent ${agentId}`);
    });
  });
});

// Create default admin user if it doesn't exist
async function initializeDefaultUser() {
  try {
    const admin = await userDB.authenticate("admin@agentverse.com", "admin123");
    if (!admin) {
      await userDB.createUser("admin@agentverse.com", "admin123", "admin", {
        theme: "dark",
        notifications: true,
      });
      console.log("✅ Created default admin user: admin@agentverse.com / admin123");
    }
  } catch (error) {
    // User might already exist, ignore
  }
}

const PORT = process.env.PORT ? parseInt(process.env.PORT) : 5000;

server.listen({ port: PORT, host: "0.0.0.0" }).then(async () => {
  await initializeDefaultUser();
  console.log(`🚀 Agentverse running on http://localhost:${PORT}`);
  console.log(`📚 API docs available at http://localhost:${PORT}/api`);

  // Start Telegram bot
  const telegramBot = new TelegramBotService(userDB, agentDB, tools);
  await telegramBot.start();
});
