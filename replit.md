# Agentverse - Replit Project

## Overview

Agentverse is a comprehensive platform for building and managing autonomous AI agents. This MVP includes multiple specialized agents (Travel Planner, Career Coach, Study Buddy, Task Automation) with a full-featured chat UI, REST API, persistent memory using SQLite, and optional Telegram bot integration.

**Current State**: The project has been successfully configured for Replit and is running on port 5000.

## Recent Changes (November 8, 2025)

### Initial Setup
- Configured server to run on port 5000 (Replit standard)
- Set up development workflow with auto-restart (ts-node-dev)
- Created .env file from template
- Fixed Telegram bot to gracefully handle missing/invalid tokens
- Configured deployment with autoscale target
- All dependencies installed and TypeScript compiled successfully

### Real API Integration (LATEST - November 8, 2025)
- **Amadeus API Integration**: FlightTool and HotelTool now fetch REAL flight prices and hotel rates from Amadeus API
- **Currency Conversion**: All prices from Amadeus (EUR) are automatically converted to INR (×83 exchange rate)
- **OpenWeatherMap Integration**: WeatherTool provides real-time weather data and 5-day forecasts for any city worldwide
- **Geoapify Integration**: PlacesTool fetches actual nearby attractions, landmarks, and places to visit
- **Universal Destination Support**: Agent now works for ANY city on Earth, not just predefined locations
- **City Name Mapping**: Handles common variations (Bangalore→Bengaluru, Bombay→Mumbai, etc.)
- All API keys configured via Replit Secrets: AMADEUS_API_KEY, AMADEUS_API_SECRET, OPENWEATHER_API_KEY, GEOAPIFY_API_KEY
- Frontend (app.js) and Telegram bot properly display all real data with correct INR pricing
- Graceful fallback to mock data if APIs fail or credentials are invalid

## Project Architecture

### Technology Stack
- **Backend**: Node.js + TypeScript + Fastify
- **Frontend**: Vanilla JavaScript (SPA)
- **Database**: SQLite (better-sqlite3)
- **AI Integration**: OpenAI API and Google Gemini (optional)
- **Optional**: Telegram Bot integration

### Key Components

1. **Agents** (`src/agents/`)
   - Base agent architecture with Planner, Memory, and Executor
   - Specialized agents: TravelPlanner, CareerCoach, StudyBuddy, TaskAutomation
   - Multi-agent coordination system

2. **Tools** (`src/agents/tools/`)
   - **Travel Tools** (Real API Integration):
     - FlightTool: Real flight prices via Amadeus API, sorted by price with booking links
     - HotelTool: Real hotel rates via Amadeus API with amenities and booking links
     - WeatherTool: Real-time weather via OpenWeatherMap API with 5-day forecasts
     - PlacesTool: Actual nearby attractions via Geoapify API with ratings and distances
   - **Career Tools**: CareerTool (career guidance and salary info)
   - **Study Tools**: ExplainTool, QuizTool, ScheduleTool
   - **Automation**: AutomationTool with reasoning capabilities
   - **Web Scraper**: WebScraperTool for content extraction

3. **API** (`src/api/`)
   - Authentication (JWT-based)
   - Agent management
   - Analytics and export functionality
   - Marketplace integration

4. **Database** (`src/db/`)
   - UserDB: User management and authentication
   - AgentDB: Agent storage and retrieval
   - Memory: Per-agent memory storage

### Directory Structure
```
agentverse/
├── src/
│   ├── agents/          # Agent logic and tools
│   ├── api/             # REST API routes
│   ├── bot/             # Telegram bot integration
│   ├── db/              # Database management
│   └── server.ts        # Main server entry point
├── public/              # Frontend files
│   ├── index.html       # Login/registration UI
│   ├── enhanced-ui.html # Main agent chat interface
│   └── app.js           # Frontend JavaScript
├── dist/                # Compiled TypeScript (build output)
└── *.db                 # SQLite database files (gitignored)
```

## Running the Project

### Development Mode
The project runs automatically via the workflow configuration:
```bash
npm run dev
```
This starts the server with hot-reload on port 5000.

### Production Build
```bash
npm run build  # Compile TypeScript
npm start      # Run compiled version
```

### Testing
```bash
npm test              # Run all tests
npm run test:watch    # Run tests in watch mode
```

## Environment Variables

The following environment variables are configured in `.env`:

- `JWT_SECRET`: Secret key for JWT authentication (uses default for dev)
- `NODE_ENV`: Set to "development"
- `PORT`: Server port (defaults to 5000)

**Real Travel Data API Keys (CONFIGURED ✅):**
- `AMADEUS_API_KEY` & `AMADEUS_API_SECRET`: **ACTIVE** - Provides real flight and hotel prices worldwide
- `OPENWEATHER_API_KEY`: **ACTIVE** - Provides real-time weather forecasts for any city
- `GEOAPIFY_API_KEY`: **ACTIVE** - Provides actual nearby attractions and places

**Optional API Keys:**
- `OPENAI_API_KEY`: For LLM-based natural language parsing
- `GEMINI_API_KEY`: Fallback LLM provider
- `TELEGRAM_BOT_TOKEN`: Enable Telegram bot integration

**Note**: All tools gracefully fallback to mock data if API credentials are invalid or APIs fail.

## Default Credentials

Login to the web interface with:
- **Email**: `admin@agentverse.com`
- **Password**: `admin123`

## Features

### Core Features
- User authentication and role-based access control
- Multiple specialized AI agents
- Persistent memory with SQLite
- RESTful API with WebSocket support for real-time updates
- Modern chat interface with plan visualization
- Simulate mode for testing without real API calls

### Agent Types
1. **Travel Planner** (Real-time Data Enabled ✅): Comprehensive trip planning with:
   - **REAL flight prices** from Amadeus API sorted by price with direct booking links
   - **REAL hotel rates** from Amadeus API with amenities and booking links
   - **REAL weather forecasts** from OpenWeatherMap API (current + 5-day forecast)
   - **REAL nearby attractions** from Geoapify API with ratings and distances
   - Works for **ANY city worldwide**, not just predefined locations
2. **Career Coach**: Career guidance and advice
3. **Study Buddy**: Learning assistance, quizzes, schedules
4. **Task Automation**: Automate tasks with reasoning

### API Endpoints
- `/api/auth/login` - User authentication
- `/api/auth/register` - User registration
- `/api/agents` - List/create agents
- `/api/agents/:id/goal` - Submit goals to agents
- `/api/agents/:id/memory` - View agent memory
- `/ws/:agentId` - WebSocket for live updates

## Database

The application uses SQLite for persistence:
- `agentverse.db`: Main database for users and agents
- `memory_*.db`: Per-agent memory databases

All database files are automatically created on first run and are excluded from git.

## Deployment

The project is configured for Replit autoscale deployment:
- **Build**: `npm run build` (compiles TypeScript)
- **Run**: `npm start` (runs production server)
- **Target**: autoscale (stateless web application)

## Troubleshooting

### Common Issues

1. **Telegram bot errors**: If you see polling errors, this is normal when no valid bot token is configured. The bot is optional and won't affect the main application.

2. **Port conflicts**: The server runs on port 5000. This is configured for Replit's webview.

3. **Database locked**: If you see database locked errors, ensure no duplicate processes are running.

4. **Missing dependencies**: Run `npm install` if you encounter import errors.

## User Preferences

- The application uses TypeScript for type safety
- Hot-reload is enabled for development
- SQLite is used for simplicity and portability
- Frontend is served as static files from the `public` directory

## Current Status

✅ **LIVE with Real Data**: The Travel Planner now fetches real-time flight prices, hotel rates, weather forecasts, and attractions for ANY destination worldwide using Amadeus, OpenWeatherMap, and Geoapify APIs.

## Next Steps

To enhance the application further:
1. ✅ ~~Real travel data~~ **COMPLETED** - Amadeus, OpenWeatherMap, and Geoapify APIs active
2. **Advanced LLM**: Configure OpenAI or Gemini API key for better natural language understanding
3. **Telegram bot**: Set up valid TELEGRAM_BOT_TOKEN for chat-based interaction
4. **More agents**: Implement additional specialized agent types
5. **Direct bookings**: Add booking confirmation flow for flights and hotels

## Example Usage

Try asking the Travel Planner (works for ANY city worldwide):
- "Plan a trip to **Paris** for next month"
- "Find me cheap flights to **Tokyo**"
- "I need hotels in **New York** for 3 nights"
- "Travel to **Dubai** next week"
- "Plan a trip to **Bali**"

The agent will provide **REAL DATA**:
- **Flights**: Real prices from Amadeus API, sorted by price (cheapest first) with booking links
- **Hotels**: Real rates from Amadeus API with star ratings, amenities, and booking links
- **Weather**: Real 5-day forecast from OpenWeatherMap API with temperature, conditions, and humidity
- **Attractions**: Actual nearby places from Geoapify API with ratings and distances

**Note**: Prices shown are actual market rates that reflect current availability and demand.
