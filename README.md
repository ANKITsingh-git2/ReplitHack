# Agentverse 🤖

**The Era of Autonomous AI - Code agents that think, talk, and act.**

![UI Preview](https://github.com/ANKITsingh-git2/ReplitHack/blob/main/attached_assets/agent.png)


Agentverse is a comprehensive platform for building and managing autonomous AI agents. This MVP focuses on a Travel Planner agent with a full-featured chat UI, REST API, persistent memory, and mock external tools.

## 🚀 Features

### Core Architecture
- **Agent Core**: Planner, Memory, Executor, ToolInterface
- **Simple Planning Algorithm**: Goal decomposition + step queue
- **Mock Tools**: Flight search, Hotel search, Web scraper
- **Travel Planner Agent**: Specialized agent for travel planning

### API & Web UI
- **REST Endpoints**: Create agents, send messages, view memory
- **Modern Single-Page UI**: Chat interface with plan visualization
- **Real-time Updates**: WebSocket support for live progress

### Persistence & Memory
- **SQLite Database**: Persistent memory and context storage
- **Memory APIs**: Query and manage agent memories
- **User Management**: Authentication and user profiles

### Orchestration & Executor
- **Concurrency Control**: Manage multiple agent tasks
- **Timeout & Retry**: Robust error handling
- **Simulate Mode**: Safe demo mode without real API calls

### Advanced Features
- **LLM Integration**: OpenAI and Gemini support for natural language parsing
- **User Profiles**: Preference weighting and personalization
- **Tool Authorization**: Role-based access control for tools
- **Multi-Agent Communication**: Agent delegation and coordination
- **Visual Timeline**: Live progress updates via WebSocket
- **RBAC**: Role-based access control (Admin, User, Agent)
- **Audit Logs**: Complete activity tracking

## 📦 Installation

### Prerequisites
- Node.js 20+
- npm or yarn

### Setup

1. **Clone the repository**
```bash
git clone <repo-url>
cd agentverse/agentverse
```

2. **Install dependencies**
```bash
npm install
```

3. **Configure environment variables**
```bash
cp .env.example .env
# Edit .env and add your API keys
```

4. **Build the project**
```bash
npm run build
```

5. **Start the server**
```bash
npm start
# or for development
npm run dev
```

The application will be available at `http://localhost:3000`

### Docker Setup

```bash
# Build and run with Docker Compose
docker-compose up -d

# Or build manually
docker build -t agentverse .
docker run -p 3000:3000 agentverse
```

## 🔑 Default Credentials

- **Email**: `admin@agentverse.com`
- **Password**: `admin123`
- **Role**: Admin

## 📚 API Documentation

### Authentication

#### Register
```http
POST /api/auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123"
}
```

#### Login
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123"
}
```

### Agents

#### Create Agent
```http
POST /api/agents
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "My Travel Agent",
  "type": "travel_planner",
  "config": {}
}
```

#### List Agents
```http
GET /api/agents
Authorization: Bearer <token>
```

#### Submit Goal
```http
POST /api/agents/:id/goal
Authorization: Bearer <token>
Content-Type: application/json

{
  "text": "Plan a trip to Goa for next month",
  "simulate": false
}
```

#### Get Memory
```http
GET /api/agents/:id/memory
Authorization: Bearer <token>
```

### Multi-Agent

#### Delegate Goal
```http
POST /api/agents/:id/delegate
Authorization: Bearer <token>
Content-Type: application/json

{
  "toAgentId": "agent-2-id",
  "goal": {
    "text": "Find hotels in Goa"
  }
}
```

## 🧪 Testing

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch
```

## 🏗️ Project Structure

```
agentverse/
├── src/
│   ├── agents/
│   │   ├── Agent.ts              # Base agent class
│   │   ├── Planner.ts            # Planning logic
│   │   ├── Memory.ts             # Memory management
│   │   ├── Executor.ts           # Step execution
│   │   ├── TravelPlanner.ts      # Travel planner agent
│   │   ├── LLMService.ts         # LLM integration
│   │   ├── MultiAgentSystem.ts   # Multi-agent coordination
│   │   ├── GoalQueue.ts          # Goal queue management
│   │   └── tools/
│   │       ├── Tool.ts           # Tool interface
│   │       ├── FlightTool.ts     # Flight search tool
│   │       ├── HotelTool.ts      # Hotel search tool
│   │       ├── WebScraperTool.ts # Web scraping tool
│   │       └── ToolAuthorization.ts # Tool permissions
│   ├── api/
│   │   ├── auth.ts               # Authentication routes
│   │   └── routes.ts              # API routes
│   ├── db/
│   │   ├── UserDB.ts             # User database
│   │   └── AgentDB.ts             # Agent database
│   ├── __tests__/                # Test files
│   └── server.ts                 # Main server file
├── public/
│   ├── index.html                # Main HTML
│   └── app.js                    # Frontend JavaScript
├── package.json
├── tsconfig.json
├── Dockerfile
├── docker-compose.yml
└── README.md
```

## 🎯 Usage Examples

### Basic Travel Planning

1. **Login** to the application
2. **Create an agent** or use the default one
3. **Submit a goal**: "Plan a trip to Goa for next month"
4. **View the plan** in the timeline
5. **See results** in the chat interface

### Simulate Mode

Use simulate mode for testing without making real API calls:

```javascript
POST /api/agents/:id/goal
{
  "text": "Plan a trip",
  "simulate": true
}
```

### Multi-Agent Delegation

```javascript
POST /api/agents/agent-1/delegate
{
  "toAgentId": "agent-2",
  "goal": {
    "text": "Find the best hotels"
  }
}
```

## 🔧 Configuration

### Environment Variables

- `OPENAI_API_KEY`: OpenAI API key (optional)
- `GEMINI_API_KEY`: Google Gemini API key (optional, fallback)
- `JWT_SECRET`: Secret for JWT tokens
- `NODE_ENV`: Environment (development/production)

### Tool Configuration

Tools can be configured in `src/server.ts`. Add new tools by implementing the `Tool` interface.

## 🐛 Troubleshooting

### Common Issues

1. **Database errors**: Ensure SQLite is properly installed
2. **API key errors**: Check your `.env` file has valid keys
3. **Port conflicts**: Change port in `server.ts` if 3000 is taken

### Debug Mode

Set `NODE_ENV=development` for detailed logging.

## 🚧 Roadmap

- [ ] Real API integrations (flights/hotels)
- [ ] Advanced planning algorithms
- [ ] Agent marketplace
- [ ] Visual plan builder
- [ ] Performance optimizations
- [ ] More agent types

## 📝 License

MIT License

## 🤝 Contributing

Contributions are welcome! Please open an issue or submit a pull request.

## 📧 Contact

For questions or support, please open an issue on GitHub.

---

**Built for hackathon/mvp** 🚀

