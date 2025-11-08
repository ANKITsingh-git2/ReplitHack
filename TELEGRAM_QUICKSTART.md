# 🚀 Telegram Bot Quick Start

## Setup in 3 Steps

### 1. Get Telegram Bot Token

1. Open Telegram
2. Search for **@BotFather**
3. Send `/newbot`
4. Follow instructions to name your bot
5. Copy the token you receive

### 2. Add Token to .env

```bash
# Edit .env file
TELEGRAM_BOT_TOKEN=your-token-here
```

### 3. Start Server

```bash
npm run dev
```

You should see:
```
✅ Telegram bot started successfully!
```

## Usage

1. **Find your bot** on Telegram (search for the name you gave it)
2. **Send `/start`** to begin
3. **Start chatting!**

### Example Messages

**Travel Planning:**
```
You: Plan a trip to Goa for next month
Bot: [Shows flights and hotels with prices]
```

**Career Guidance:**
```
You: I want to become a software engineer
Bot: [Shows career path, skills, salary, companies]
```

**Study:**
```
You: Explain JavaScript
Bot: [Detailed explanation with concepts]

You: Create a quiz on Python
Bot: [Generates quiz with questions]
```

**Automation:**
```
You: Automate email sending task
Bot: [Creates automation plan]
```

## Commands

- `/start` - Start bot and create default agent
- `/help` - Show help
- `/agents` - List your agents
- `/create <type>` - Create agent (travel/career/study/automation)

## That's It!

Your Telegram bot is now connected to all your agents! 🎉

