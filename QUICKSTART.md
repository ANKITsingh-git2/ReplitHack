# Quick Start Guide

## 🚀 Getting Started in 5 Minutes

### 1. Install Dependencies
```bash
cd agentverse
npm install
```

### 2. Set Up Environment (Optional)
```bash
cp .env.example .env
# Edit .env and add your API keys if you have them
# The system works without API keys (uses fallback)
```

### 3. Start the Server
```bash
npm run dev
```

### 4. Open the Application
Navigate to `http://localhost:3000`

### 5. Login
- **Email**: `admin@agentverse.com`
- **Password**: `admin123`

### 6. Try It Out!
1. Create a new agent (or use the default)
2. Submit a goal: "Plan a trip to Goa for next month"
3. Watch the agent create a plan and execute it
4. View the timeline to see progress

## 🐳 Docker Quick Start

```bash
docker-compose up -d
```

## 🧪 Run Tests

```bash
npm test
```

## 📝 Example Goals

- "Plan a trip to Goa for next month"
- "Find flights from Bangalore to Mumbai"
- "Search for hotels in Delhi for 3 nights"
- "Plan a weekend getaway to the mountains"

## 🔧 Troubleshooting

### Port Already in Use
Change the port in `src/server.ts` (line 93)

### Database Errors
Delete `*.db` files and restart

### API Key Issues
The system works without API keys, but planning will be simpler. Add your keys to `.env` for better results.

## 📚 Next Steps

- Read the full [README.md](README.md)
- Check out the API documentation
- Explore multi-agent features
- Customize tools and agents

---

Happy coding! 🎉

