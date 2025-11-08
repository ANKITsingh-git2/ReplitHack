import TelegramBot from "node-telegram-bot-api";
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
import { v4 as uuid } from "uuid";

export class TelegramBotService {
  private bot: TelegramBot | null = null;
  private userDB: UserDB;
  private agentDB: AgentDB;
  private tools: Record<string, Tool>;
  private userAgents: Map<string, string> = new Map(); // telegramUserId -> agentId
  private agentInstances: Map<string, any> = new Map();

  constructor(userDB: UserDB, agentDB: AgentDB, tools: Record<string, Tool>) {
    this.userDB = userDB;
    this.agentDB = agentDB;
    this.tools = tools;
  }

  async start() {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    if (!token || token === 'your bot token' || token.includes('your') || token.length < 40) {
      console.log("⚠️  Telegram bot token not configured. Set TELEGRAM_BOT_TOKEN in .env to enable Telegram bot.");
      return;
    }

    try {
      this.bot = new TelegramBot(token, { polling: { params: { timeout: 10 } } });
      
      // Handle polling errors gracefully
      this.bot.on('polling_error', (error: any) => {
        if (error.code === 'ETELEGRAM' && error.message.includes('401')) {
          console.log("⚠️  Telegram bot authentication failed. Please check your TELEGRAM_BOT_TOKEN in .env");
          if (this.bot) {
            this.bot.stopPolling();
            this.bot = null;
          }
        }
      });

    // Handle /start command
    this.bot.onText(/\/start/, async (msg) => {
      const chatId = msg.chat.id;
      await this.handleStart(chatId);
    });

    // Handle /help command
    this.bot.onText(/\/help/, async (msg) => {
      const chatId = msg.chat.id;
      await this.handleHelp(chatId);
    });

    // Handle /agents command
    this.bot.onText(/\/agents/, async (msg) => {
      const chatId = msg.chat.id;
      await this.handleListAgents(chatId);
    });

    // Handle /create command
    this.bot.onText(/\/create (.+)/, async (msg, match) => {
      const chatId = msg.chat.id;
      const agentType = match?.[1] || "travel_planner";
      await this.handleCreateAgent(chatId, agentType);
    });

    // Handle all other messages as goals
    this.bot.on("message", async (msg) => {
      if (msg.text && !msg.text.startsWith("/")) {
        await this.handleMessage(msg);
      }
    });

    console.log("✅ Telegram bot started successfully!");
    } catch (error: any) {
      console.log("⚠️  Failed to start Telegram bot:", error.message);
      console.log("   Set a valid TELEGRAM_BOT_TOKEN in .env to enable Telegram bot.");
    }
  }

  private async handleStart(chatId: number) {
    const welcomeMessage = `🤖 Welcome to Agentverse!

I'm your AI agent assistant. I can help you with:
✈️ Travel Planning
🎯 Career Guidance
📚 Study & Learning
🤖 Task Automation

Commands:
/help - Show help
/agents - List your agents
/create <type> - Create agent (travel_planner, career_coach, study_buddy, task_automation)

Just send me a message like:
"Plan a trip to Goa"
"I want to become a software engineer"
"Explain JavaScript"
"Automate email sending"

Let's get started! 🚀`;

    await this.bot?.sendMessage(chatId, welcomeMessage);

    // Create default agent for user
    await this.ensureDefaultAgent(chatId);
  }

  private async handleHelp(chatId: number) {
    const helpMessage = `📚 Agentverse Help

**Available Agent Types:**
1. travel_planner - Plan trips, find flights & hotels
2. career_coach - Career guidance and advice
3. study_buddy - Learn topics, quizzes, schedules
4. task_automation - Automate tasks with reasoning

**Commands:**
/start - Start the bot
/help - Show this help
/agents - List your agents
/create <type> - Create a new agent

**Examples:**
"Plan a trip to Goa for next month"
"Career guidance for data scientist"
"Explain Python programming"
"Create a quiz on JavaScript"
"Automate file organization task"

**Web Scraping:**
Include URLs in your messages to scrape content!

Need more help? Just ask! 😊`;

    await this.bot?.sendMessage(chatId, helpMessage, { parse_mode: "Markdown" });
  }

  private async handleListAgents(chatId: number) {
    const userId = await this.getOrCreateTelegramUser(chatId);
    const agents = this.agentDB.getUserAgents(userId);

    if (agents.length === 0) {
      await this.bot?.sendMessage(chatId, "You don't have any agents yet. Use /create <type> to create one!");
      return;
    }

    let message = `📋 Your Agents:\n\n`;
    agents.forEach((agent, idx) => {
      const icon = this.getAgentIcon(agent.type);
      message += `${idx + 1}. ${icon} ${agent.name}\n`;
      message += `   Type: ${agent.type}\n`;
      message += `   ID: ${agent.id.substring(0, 8)}...\n\n`;
    });

    message += `Use /create <type> to create more agents!`;

    await this.bot?.sendMessage(chatId, message);
  }

  private async handleCreateAgent(chatId: number, agentType: string) {
    const userId = await this.getOrCreateTelegramUser(chatId);
    
    const typeMap: Record<string, string> = {
      "travel": "travel_planner",
      "career": "career_coach",
      "study": "study_buddy",
      "automation": "task_automation",
    };

    const normalizedType = typeMap[agentType.toLowerCase()] || agentType;

    const agentNames: Record<string, string> = {
      travel_planner: "Travel Planner",
      career_coach: "Career Coach",
      study_buddy: "Study Buddy",
      task_automation: "Task Automation Bot",
    };

    const agentRecord = this.agentDB.createAgent(
      userId,
      normalizedType,
      `${agentNames[normalizedType] || "Agent"} (Telegram)`,
      {}
    );

    this.userAgents.set(chatId.toString(), agentRecord.id);

    await this.bot?.sendMessage(
      chatId,
      `✅ Created ${agentNames[normalizedType] || normalizedType} agent!\n\nAgent ID: ${agentRecord.id.substring(0, 8)}...\n\nYou can now send me goals and I'll execute them! 🚀`
    );
  }

  private async handleMessage(msg: TelegramBot.Message) {
    const chatId = msg.chat.id;
    const text = msg.text;

    if (!text) return;

    // Show typing indicator
    await this.bot?.sendChatAction(chatId, "typing");

    let processingMsg: TelegramBot.Message | undefined;

    try {
      const agent = await this.getOrCreateAgent(chatId);
      if (!agent) {
        await this.bot?.sendMessage(chatId, "Please create an agent first using /create <type>");
        return;
      }

      // Send processing message
      processingMsg = await this.bot?.sendMessage(chatId, "🤔 Processing your request...");

      console.log(`[Telegram Bot] Processing message from ${chatId}: "${text}"`);

      // Execute goal with timeout
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error("Request timeout (60s)")), 60000);
      });

      const goalPromise = agent.handleGoal({
        id: uuid(),
        text: text,
        meta: { source: "telegram", chatId },
      }, { timeout: 50000 });

      const result = await Promise.race([goalPromise, timeoutPromise]);

      console.log(`[Telegram Bot] Goal completed. Status: ${result.status}`);

      // Format and send response
      const response = this.formatResponse(result);
      
      // Delete processing message
      if (processingMsg) {
        await this.bot?.deleteMessage(chatId, processingMsg.message_id).catch(() => {});
      }

      // Send response (split if too long)
      await this.sendLongMessage(chatId, response);

    } catch (error: any) {
      console.error("[Telegram Bot] Error:", error.message, error.stack);
      
      // Delete processing message on error
      if (processingMsg) {
        await this.bot?.deleteMessage(chatId, processingMsg.message_id).catch(() => {});
      }
      
      await this.bot?.sendMessage(chatId, `❌ Error: ${error.message || "Something went wrong. Please try again."}`);
    }
  }

  private async getOrCreateTelegramUser(chatId: number): Promise<string> {
    // Create or get user based on Telegram chat ID
    const email = `telegram_${chatId}@agentverse.com`;
    
    // Try to find existing user by email
    let user = this.userDB.getUserByEmail(email);

    if (!user) {
      user = await this.userDB.createUser(
        email,
        uuid(), // Random password
        "user",
        { telegramChatId: chatId }
      );
    }

    return user.id;
  }

  private async ensureDefaultAgent(chatId: number) {
    const userId = await this.getOrCreateTelegramUser(chatId);
    const agents = this.agentDB.getUserAgents(userId);

    if (agents.length === 0) {
      // Create default travel planner
      const agentRecord = this.agentDB.createAgent(
        userId,
        "travel_planner",
        "My Travel Agent",
        {}
      );
      this.userAgents.set(chatId.toString(), agentRecord.id);
    } else {
      this.userAgents.set(chatId.toString(), agents[0].id);
    }
  }

  private async getOrCreateAgent(chatId: number): Promise<any> {
    const userId = await this.getOrCreateTelegramUser(chatId);
    let agentId = this.userAgents.get(chatId.toString());

    if (!agentId) {
      const agents = this.agentDB.getUserAgents(userId);
      if (agents.length === 0) {
        await this.ensureDefaultAgent(chatId);
        agentId = this.userAgents.get(chatId.toString());
      } else {
        agentId = agents[0].id;
        this.userAgents.set(chatId.toString(), agentId);
      }
    }

    if (!agentId) return null;

    if (this.agentInstances.has(agentId)) {
      return this.agentInstances.get(agentId);
    }

    const agentRecord = this.agentDB.getAgent(agentId);
    if (!agentRecord) return null;

    const memory = new Memory(`memory_${agentId}.db`);
    const planner = new Planner(this.tools);
    const executor = new Executor(this.tools);

    let agent: any;
    switch (agentRecord.type) {
      case "career_coach":
        agent = new CareerCoach(agentId, memory, planner, executor);
        break;
      case "study_buddy":
        agent = new StudyBuddy(agentId, memory, planner, executor);
        break;
      case "task_automation":
        agent = new TaskAutomation(agentId, memory, planner, executor);
        break;
      case "travel_planner":
      default:
        agent = new TravelPlanner(agentId, memory, planner, executor);
        break;
    }

    this.agentInstances.set(agentId, agent);
    return agent;
  }

  private formatResponse(result: any): string {
    if (result.error) {
      return `❌ Error: ${result.error}`;
    }

    let message = "";
    let flights: any = null;
    let hotels: any = null;
    let weather: any = null;
    let places: any = null;
    let careerGuidance: any = null;
    let explanation: any = null;
    let quiz: any = null;
    let schedule: any = null;
    let automation: any = null;
    let webContent: any = null;

    // Extract data from trace
    if (result.trace) {
      result.trace.forEach((t: any, i: number) => {
        const step = result.plan?.steps?.[i];
        if (!step) return;

        if (step.type === "search_flights" && t.res?.flights) {
          flights = t.res.flights;
        } else if (step.type === "search_hotels" && t.res?.hotels) {
          hotels = t.res.hotels;
        } else if (step.type === "check_weather" && t.res?.forecast) {
          weather = t.res;
        } else if (step.type === "find_attractions" && t.res?.places) {
          places = t.res;
        } else if (step.type === "career_guidance" && t.res?.guidance) {
          careerGuidance = t.res;
        } else if (step.type === "explain_topic" && t.res?.explanation) {
          explanation = t.res;
        } else if (step.type === "create_quiz" && t.res?.quiz) {
          quiz = t.res;
        } else if (step.type === "schedule_study" && t.res?.schedule) {
          schedule = t.res;
        } else if (step.type === "automate_task" && t.res?.automation) {
          automation = t.res;
        } else if ((step.type === "web_scraper" || step.type === "web_scraping") && t.res?.content) {
          webContent = t.res;
        }
      });
    }

    // Format based on data type
    if (flights || hotels || weather || places) {
      message += "✈️ *Travel Plan Ready!*\n\n";
      if (flights) {
        message += "*Flight Options:*\n";
        flights.forEach((f: any, idx: number) => {
          const priceINR = f.priceINR || f.price;
          message += `${idx + 1}. ${f.airline || "Flight"} - ${f.id}\n`;
          message += `   ${f.from} → ${f.to}\n`;
          message += `   Date: ${f.depart}\n`;
          if (f.departTime) message += `   Time: ${f.departTime}\n`;
          message += `   Price: ₹${priceINR.toLocaleString()}\n`;
          if (f.bookingUrl) message += `   🔗 Book: ${f.bookingUrl}\n`;
          message += `\n`;
        });
      }
      if (hotels) {
        message += "*Hotel Options:*\n";
        hotels.forEach((h: any, idx: number) => {
          const pricePerNightINR = h.pricePerNightINR || h.pricePerNight;
          const totalINR = h.totalPriceINR || h.totalPrice || (pricePerNightINR * h.nights);
          message += `${idx + 1}. ${h.name} ⭐ ${h.rating || "N/A"}\n`;
          message += `   Location: ${h.location}\n`;
          message += `   ${h.nights} nights\n`;
          if (h.amenities && h.amenities.length > 0) {
            message += `   ✨ ${h.amenities.slice(0, 3).join(', ')}\n`;
          }
          message += `   ₹${pricePerNightINR.toLocaleString()}/night\n`;
          message += `   Total: ₹${totalINR.toLocaleString()}\n`;
          if (h.bookingUrl) message += `   🔗 Book: ${h.bookingUrl}\n`;
          message += `\n`;
        });
      }
      if (weather && weather.forecast && weather.forecast.length > 0) {
        message += `*🌤️ Weather Forecast for ${weather.location || weather.destination}:*\n`;
        if (weather.current) {
          message += `📍 Current: ${weather.current.temp}°C, ${weather.current.condition}\n`;
          message += `   Feels like ${weather.current.feelsLike}°C\n\n`;
        }
        message += `*5-Day Forecast:*\n`;
        weather.forecast.forEach((day: any) => {
          const emoji = day.condition.toLowerCase().includes('rain') ? '🌧️' : 
                       day.condition.toLowerCase().includes('cloud') ? '☁️' : 
                       day.condition.toLowerCase().includes('sun') ? '☀️' : '🌤️';
          message += `${emoji} ${day.date} - ${day.condition}\n`;
          message += `   🌡️ High: ${day.tempMax || day.high}°C | Low: ${day.tempMin || day.low}°C\n`;
        });
        message += `\n`;
      }
      if (places && places.places && places.places.length > 0) {
        message += `*📍 Places to Visit in ${places.destination}:*\n`;
        places.places.slice(0, 8).forEach((place: any, idx: number) => {
          const emoji = place.category === 'beach' ? '🏖️' : 
                       place.category === 'historical' ? '🏛️' : 
                       place.category === 'nature' ? '🌳' : 
                       place.category === 'religious' ? '🛕' : '📍';
          message += `${idx + 1}. ${emoji} ${place.name}`;
          if (place.rating) message += ` ⭐ ${place.rating}`;
          message += `\n`;
          if (place.description) message += `   ${place.description}\n`;
        });
        message += `\n`;
      }
      // Add summary
      const counts = [];
      if (flights) counts.push(`${flights.length} flights`);
      if (hotels) counts.push(`${hotels.length} hotels`);
      if (weather) counts.push('weather forecast');
      if (places) counts.push(`${places.places?.length || 0} attractions`);
      if (counts.length > 0) {
        message += `✅ Found: ${counts.join(', ')}\n`;
      }
    } else if (careerGuidance && careerGuidance.guidance) {
      const g = careerGuidance.guidance;
      message += `🎯 *Career Guidance*\n\n`;
      message += `*Career Path:*\n${g.careerPath}\n\n`;
      message += `*Salary:* ${g.salaryRange}\n\n`;
      message += `*Skills:*\n${g.skills.map((s: string, i: number) => `${i + 1}. ${s}`).join("\n")}\n\n`;
      message += `*Companies:* ${g.topCompanies.join(", ")}\n\n`;
      message += `*Certifications:*\n${g.certifications.map((c: string, i: number) => `${i + 1}. ${c}`).join("\n")}`;
    } else if (explanation && explanation.explanation) {
      message += `📚 *${explanation.topic || "Explanation"}*\n\n`;
      message += `${explanation.explanation}\n\n`;
      if (explanation.keyConcepts) {
        message += `*Key Concepts:*\n${explanation.keyConcepts.map((c: string, i: number) => `${i + 1}. ${c}`).join("\n")}`;
      }
    } else if (quiz && quiz.quiz) {
      message += `📝 *Quiz: ${quiz.topic || "Quiz"}*\n\n`;
      quiz.quiz.questions.forEach((q: any, idx: number) => {
        message += `*Q${idx + 1}:* ${q.question}\n`;
        q.options.forEach((opt: string, optIdx: number) => {
          const marker = optIdx === q.correctAnswer ? "✅" : "  ";
          message += `${marker} ${String.fromCharCode(65 + optIdx)}. ${opt}\n`;
        });
        message += `\n`;
      });
    } else if (schedule && schedule.schedule) {
      message += `📅 *Study Schedule*\n\n`;
      message += `Topic: ${schedule.topic || "Study"}\n`;
      message += `Duration: ${schedule.schedule.duration}\n\n`;
      schedule.schedule.sessions.forEach((s: any) => {
        message += `${s.day} - ${s.time}\n${s.activity}\n\n`;
      });
    } else if (automation && automation.automation) {
      message += `🤖 *Automation Plan*\n\n`;
      message += `Task: ${automation.task || "Task"}\n`;
      message += `Type: ${automation.automation.type}\n\n`;
      if (automation.automation.steps) {
        message += `*Steps:*\n${automation.automation.steps.map((s: string, i: number) => `${i + 1}. ${s}`).join("\n")}`;
      }
    } else if (webContent && webContent.content) {
      message += `🌐 *Web Content*\n\n`;
      message += `URL: ${webContent.url || "N/A"}\n\n`;
      message += webContent.content.substring(0, 1000) || "No content";
    } else {
      message = `✅ *Request Completed*\n\nStatus: ${result.status}\n\n`;
      if (result.plan?.steps) {
        message += `*Steps Executed:*\n`;
        result.plan.steps.forEach((step: any, i: number) => {
          const trace = result.trace?.[i];
          const status = trace?.res?.error ? "❌" : "✅";
          message += `${status} ${step.type}\n`;
        });
      }
    }

    return message;
  }

  private async sendLongMessage(chatId: number, text: string) {
    // Telegram has a 4096 character limit per message
    const maxLength = 4000;
    if (text.length <= maxLength) {
      await this.bot?.sendMessage(chatId, text, { parse_mode: "Markdown" });
    } else {
      // Split into chunks
      const chunks = [];
      for (let i = 0; i < text.length; i += maxLength) {
        chunks.push(text.substring(i, i + maxLength));
      }
      for (const chunk of chunks) {
        await this.bot?.sendMessage(chatId, chunk, { parse_mode: "Markdown" });
      }
    }
  }

  private getAgentIcon(type: string): string {
    const icons: Record<string, string> = {
      travel_planner: "✈️",
      career_coach: "🎯",
      study_buddy: "📚",
      task_automation: "🤖",
    };
    return icons[type] || "🤖";
  }
}

