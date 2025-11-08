# 🤖 Telegram Bot Setup Guide

## Quick Start

### 1. Create a Telegram Bot

1. Open Telegram and search for **@BotFather**
2. Send `/newbot` command
3. Follow the instructions to name your bot
4. You'll receive a **bot token** (looks like: `123456789:ABCdefGHIjklMNOpqrsTUVwxyz`)

### 2. Configure the Bot

1. Copy the `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```

2. Add your Telegram bot token to `.env`:
   ```env
   TELEGRAM_BOT_TOKEN=your-bot-token-here
   ```

3. Restart the server:
   ```bash
   npm run dev
   ```

### 3. Start Using the Bot

1. Search for your bot on Telegram (use the name you gave it)
2. Send `/start` to begin
3. Start chatting! Try:
   - "Plan a trip to Goa for next month"
   - "I want to become a software engineer"
   - "Explain JavaScript"
   - "Create a quiz on Python"

## Commands

- `/start` - Start the bot and create default agent
- `/help` - Show help and examples
- `/agents` - List your agents
- `/create <type>` - Create a new agent
  - Types: `travel`, `career`, `study`, `automation`

## Features

### ✈️ Travel Planning
```
You: Plan a trip to Goa for next month
Bot: [Searches flights and hotels, shows options with prices]
```

### 🎯 Career Guidance
```
You: I want to become a data scientist
Bot: [Shows career path, skills, salary, companies, certifications]
```

### 📚 Study Buddy
```
You: Explain JavaScript
Bot: [Provides detailed explanation with concepts and examples]

You: Create a quiz on Python with 5 questions
Bot: [Generates quiz with multiple choice questions]
```

### 🤖 Task Automation
```
You: Automate email sending task
Bot: [Analyzes task, creates automation plan with steps]
```

## Example Conversations

### Travel Planning
```
You: Plan a trip to Mumbai for 2 nights
Bot: 
✈️ Travel Plan Ready!

Flight Options:
1. IndiGo - FL001
   Bangalore (BLR) → Mumbai Airport
   Date: 2025-12-20
   Price: ₹3,500

Hotel Options:
1. Grand Mumbai Hotel ⭐ 4.3
   Location: Marine Drive
   2 nights
   Total: ₹2,400
```

### Career Guidance
```
You: Career guidance for software engineer
Bot:
🎯 Career Guidance

Career Path:
Computer Science Degree → Internships → Junior Developer → Senior Developer

Salary: ₹8-25 LPA

Skills:
1. Programming
2. Problem Solving
3. System Design
...
```

## Troubleshooting

### Bot not responding?
1. Check if `TELEGRAM_BOT_TOKEN` is set in `.env`
2. Verify the token is correct (from @BotFather)
3. Restart the server after adding token
4. Check server logs for errors

### Getting errors?
- Make sure the bot token is valid
- Check that the server is running
- Verify internet connection (Telegram API needs internet)

## Security Notes

- Never share your bot token publicly
- Keep `.env` file in `.gitignore`
- Each Telegram user gets their own agent instance
- Agents are isolated per user

## Advanced Usage

### Multiple Agents
Create different agents for different purposes:
```
/create travel
/create career
/create study
```

### Web Scraping
Include URLs in your messages:
```
You: Scrape content from https://example.com
Bot: [Scrapes and returns content]
```

---

**Enjoy your AI agent assistant on Telegram! 🚀**

